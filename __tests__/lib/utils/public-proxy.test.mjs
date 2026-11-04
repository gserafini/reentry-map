// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { request } from 'node:http'
import { PassThrough } from 'node:stream'

const { lookup, connect } = vi.hoisted(() => ({ lookup: vi.fn(), connect: vi.fn() }))
vi.mock('node:dns/promises', () => ({ lookup }))
vi.mock('node:net', async (original) => ({ ...(await original()), connect }))
import { openPublicProxy } from '../../../lib/utils/public-network.mjs'

let proxy
beforeEach(() => {
  vi.clearAllMocks()
  lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
})
afterEach(async () => {
  if (proxy) await proxy.close()
  proxy = null
})

function tunnel(authority) {
  return new Promise((resolve, reject) => {
    const url = new URL(proxy.server)
    const req = request({
      hostname: url.hostname,
      port: url.port,
      method: 'CONNECT',
      path: authority,
    })
    req.on('connect', (response, socket) => {
      socket.destroy()
      resolve(response.statusCode)
    })
    req.on('error', reject)
    req.end()
  })
}

it('blocks a loopback HTTP destination at the proxy without contacting it', async () => {
  proxy = await openPublicProxy()
  const status = await new Promise((resolve, reject) => {
    const url = new URL(proxy.server)
    const req = request(
      { hostname: url.hostname, port: url.port, path: 'http://127.0.0.1/fixture' },
      (response) => {
        response.resume()
        response.on('end', () => resolve(response.statusCode))
      }
    )
    req.on('error', reject)
    req.end()
  })
  expect(status).toBe(403)
  expect(connect).not.toHaveBeenCalled()
})

it.each(['127.0.0.1:443', '[::ffff:127.0.0.1]:443', 'example.org:3007'])(
  'blocks unsafe HTTPS tunnel %s',
  async (authority) => {
    proxy = await openPublicProxy()
    expect(await tunnel(authority)).toBe(403)
    expect(connect).not.toHaveBeenCalled()
  }
)

it('blocks a public hostname resolving to a private address before connecting', async () => {
  lookup.mockResolvedValue([{ address: '10.0.0.1', family: 4 }])
  proxy = await openPublicProxy()
  expect(await tunnel('example.org:443')).toBe(403)
  expect(connect).not.toHaveBeenCalled()
})

it('connects HTTPS to exactly the validated numeric address', async () => {
  connect.mockImplementation(() => {
    const stream = new PassThrough()
    stream.setTimeout = () => stream
    queueMicrotask(() => stream.emit('connect'))
    return stream
  })
  proxy = await openPublicProxy()
  expect(await tunnel('example.org:443')).toBe(200)
  expect(connect).toHaveBeenCalledWith({ host: '93.184.216.34', port: 443 })
  expect(lookup).toHaveBeenCalledTimes(1)
})

it('closes listening sockets and can be closed more than once', async () => {
  proxy = await openPublicProxy()
  const url = proxy.server
  await proxy.close()
  await proxy.close()
  await expect(
    new Promise((resolve, reject) => request(url, resolve).on('error', reject).end())
  ).rejects.toThrow()
})
