// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'
import { gzipSync, brotliCompressSync } from 'node:zlib'

const { lookup, request, decoders } = vi.hoisted(() => ({
  lookup: vi.fn(),
  request: vi.fn(),
  decoders: [] as Readable[],
}))
vi.mock('node:dns/promises', () => ({ lookup }))
vi.mock('node:http', async (original) => ({ ...(await original()), request }))
vi.mock('node:https', () => ({ request }))
vi.mock('node:zlib', async (original) => {
  const real = await original<typeof import('node:zlib')>()
  return {
    ...real,
    createUnzip: () => {
      const decoder = real.createUnzip()
      decoders.push(decoder)
      return decoder
    },
    createBrotliDecompress: () => {
      const decoder = real.createBrotliDecompress()
      decoders.push(decoder)
      return decoder
    },
  }
})

import { resolvePublicUrl, fetchPublicUrl } from '@/lib/utils/public-network.mjs'

function respond(
  status = 200,
  headers = {},
  chunks = [Buffer.from('public content')],
  aborted = false
) {
  request.mockImplementationOnce((_url, _options, callback) => {
    const req = new EventEmitter() as EventEmitter & {
      end: () => void
      destroy: (e: Error) => void
    }
    req.end = () =>
      queueMicrotask(() => {
        const response = Object.assign(Readable.from(chunks), { statusCode: status, headers })
        callback(response)
        if (aborted) response.emit('aborted')
      })
    req.destroy = (error) => req.emit('error', error)
    return req
  })
}

describe('public outbound network boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    decoders.length = 0
    lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
  })

  it.each([
    'file:///etc/hosts',
    'ftp://example.org/file',
    'http://user:pass@example.org/',
    'http://127.0.0.1/',
    'http://2130706433/',
    'http://0x7f000001/',
    'http://10.0.0.1/',
    'http://169.254.169.254/',
    'http://100.64.0.1/',
    'http://192.168.1.1/',
    'http://[::1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://[fc00::1]/',
    'http://[fe80::1]/',
    'http://example.org:3007/',
  ])('rejects nonpublic or unsupported destination %s without a connection', async (url) => {
    await expect(fetchPublicUrl(url)).rejects.toThrow()
    expect(request).not.toHaveBeenCalled()
  })

  it('rejects private and mixed public/private DNS answers', async () => {
    lookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ])
    await expect(fetchPublicUrl('https://example.org/')).rejects.toThrow()
    expect(request).not.toHaveBeenCalled()
  })

  it('allows public IPv4 and IPv6 addresses', async () => {
    await expect(resolvePublicUrl('https://example.org/')).resolves.toMatchObject({
      address: '93.184.216.34',
      family: 4,
    })
    lookup.mockResolvedValue([{ address: '2606:4700:4700::1111', family: 6 }])
    await expect(resolvePublicUrl('https://example.org/')).resolves.toMatchObject({ family: 6 })
  })

  it('pins the actual connection lookup to the validated answer, preventing DNS rebinding', async () => {
    respond()
    const response = await fetchPublicUrl('https://example.org/')
    expect(await response.text()).toBe('public content')
    expect(lookup).toHaveBeenCalledTimes(1)
    const options = request.mock.calls[0][1]
    const callback = vi.fn()
    options.lookup('example.org', {}, callback)
    expect(callback).toHaveBeenCalledWith(null, '93.184.216.34', 4)
    expect(options.agent).toBe(false)
    expect(options.rejectUnauthorized).toBe(true)
  })

  it('checks redirected targets before opening a second connection', async () => {
    respond(302, { location: 'http://127.0.0.1/private' }, [])
    await expect(fetchPublicUrl('https://example.org/')).rejects.toThrow()
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('bounds redirected public hops', async () => {
    for (let i = 0; i < 7; i++) respond(302, { location: '/again' }, [])
    await expect(fetchPublicUrl('https://example.org/')).rejects.toThrow(/redirect/i)
    expect(request.mock.calls.length).toBeLessThanOrEqual(6)
  })

  it('aborts oversized streamed responses before buffering the entire body', async () => {
    respond(200, {}, [Buffer.alloc(8), Buffer.alloc(8)])
    await expect(fetchPublicUrl('https://example.org/', { maxBytes: 10 })).rejects.toThrow(/limit/i)
  })

  it('rejects unsupported upstream status codes without an unhandled exception', async () => {
    respond(600)
    await expect(fetchPublicUrl('https://example.org/')).rejects.toThrow()
  })

  it.each([
    ['gzip', gzipSync],
    ['br', brotliCompressSync],
  ] as const)(
    'stops the %s decoder when expanded output exceeds the cap',
    async (encoding, compress) => {
      respond(200, { 'content-encoding': encoding }, [compress(Buffer.alloc(100000))])
      await expect(fetchPublicUrl('https://example.org/', { maxBytes: 1000 })).rejects.toThrow(
        /limit/i
      )
      expect(decoders[0].destroyed).toBe(true)
    }
  )

  it('destroys decompression state when the upstream response is aborted', async () => {
    respond(200, { 'content-encoding': 'gzip' }, [gzipSync(Buffer.alloc(100))], true)
    await expect(fetchPublicUrl('https://example.org/')).rejects.toThrow(/interrupted/i)
    expect(decoders[0].destroyed).toBe(true)
  })

  it('rejects corrupt compressed streams without an unhandled error', async () => {
    respond(200, { 'content-encoding': 'gzip' }, [Buffer.from('corrupt compressed bytes')])
    await expect(fetchPublicUrl('https://example.org/')).rejects.toThrow()
    expect(decoders[0].destroyed).toBe(true)
  })

  it('does not forward credentials or cookies to an untrusted website', async () => {
    respond()
    await fetchPublicUrl('https://example.org/', {
      headers: { Authorization: 'test-secret', Cookie: 'test-cookie', 'User-Agent': 'audit-test' },
    })
    const headers = request.mock.calls[0][1].headers
    expect(headers.authorization).toBeUndefined()
    expect(headers.cookie).toBeUndefined()
    expect(headers['user-agent']).toBe('audit-test')
  })
})
