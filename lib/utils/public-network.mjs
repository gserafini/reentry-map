import { lookup } from 'node:dns/promises'
import { isIP, connect } from 'node:net'
import { createServer, request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { createUnzip, createBrotliDecompress } from 'node:zlib'
import ipaddr from 'ipaddr.js'
import { browserLaunchOptions } from './browser-launch.mjs'

const MAX_BYTES = 2 * 1024 * 1024
let activeBrowsers = 0
let activeFetches = 0

function publicAddress(address) {
  try {
    return ipaddr.process(address).range() === 'unicast'
  } catch {
    return false
  }
}

/** Resolve once; the returned address MUST be used for the actual connection. */
export async function resolvePublicUrl(input, timeoutMs = 5000) {
  if (typeof input !== 'string' || input.length > 4096) throw new Error('Invalid website URL')
  const url = new URL(input)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Only public HTTP(S) websites are allowed')
  }
  if (url.port && url.port !== (url.protocol === 'https:' ? '443' : '80')) {
    throw new Error('Website port is not allowed')
  }
  const host = url.hostname.replace(/^\[|\]$/g, '')
  let timer
  const answers = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await Promise.race([
        lookup(host, { all: true, verbatim: true }),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Website DNS timed out')), timeoutMs)
        }),
      ]).finally(() => clearTimeout(timer))
  // Mixed public/private answers are rejected rather than picking a convenient one.
  if (!answers.length || answers.some(({ address }) => !publicAddress(address))) {
    throw new Error('Website destination is not public')
  }
  return { url, ...answers[0] }
}

function requestPublic(target, { headers, maxBytes, timeoutMs, method }) {
  return new Promise((resolve, reject) => {
    let rejectResponse = reject
    const safeHeaders = {
      'user-agent': 'ReentryMap-Verification/1.0',
      'accept-encoding': 'identity',
    }
    for (const [key, value] of Object.entries(headers)) {
      if (['user-agent', 'accept', 'accept-language'].includes(key.toLowerCase())) {
        safeHeaders[key.toLowerCase()] = value
      }
    }
    const request = target.url.protocol === 'https:' ? httpsRequest : httpRequest
    const req = request(
      target.url,
      {
        method,
        headers: safeHeaders,
        agent: false,
        rejectUnauthorized: true,
        signal: AbortSignal.timeout(Math.max(1, timeoutMs)),
        // No second DNS resolution is permitted, including Node's all-address mode.
        lookup: (_host, options, callback) =>
          options.all
            ? callback(null, [{ address: target.address, family: target.family }])
            : callback(null, target.address, target.family),
      },
      (response) => {
        let body = response
        let failed = false
        const fail = (error) => {
          if (failed) return
          failed = true
          if (body !== response) body.destroy()
          response.destroy()
          req.destroy()
          reject(error)
        }
        rejectResponse = fail
        let wireBytes = 0
        response.on('data', (chunk) => {
          wireBytes += chunk.length
          if (wireBytes > maxBytes) fail(new Error('Website response exceeds byte limit'))
        })
        response.on('error', fail)
        response.on('aborted', () => fail(new Error('Website response interrupted')))
        const encoding = response.headers['content-encoding']
        body =
          encoding === 'br'
            ? response.pipe(createBrotliDecompress())
            : ['gzip', 'deflate'].includes(encoding)
              ? response.pipe(createUnzip())
              : response
        const chunks = []
        let bytes = 0
        body.on('error', fail)
        body.on('data', (chunk) => {
          bytes += chunk.length
          if (bytes > maxBytes) {
            fail(new Error('Website response exceeds byte limit'))
            return
          }
          chunks.push(chunk)
        })
        body.on('end', () => {
          if (failed) return
          try {
            const resultHeaders = new Headers()
            for (const [key, value] of Object.entries(response.headers)) {
              if (
                value &&
                ![
                  'content-length',
                  'content-encoding',
                  'transfer-encoding',
                  'connection',
                  'set-cookie',
                ].includes(key)
              ) {
                resultHeaders.set(key, Array.isArray(value) ? value.join(', ') : value)
              }
            }
            const status = response.statusCode || 502
            const result = new Response(
              method === 'HEAD' || [204, 205, 304].includes(status) ? null : Buffer.concat(chunks),
              { status, headers: resultHeaders }
            )
            Object.defineProperty(result, 'url', { value: target.url.href })
            resolve(result)
          } catch (error) {
            fail(error)
          }
        })
      }
    )
    req.on('error', (error) => rejectResponse(error))
    req.end()
  })
}

/** Bounded HTTP(S), verified TLS, pinned DNS, and a new policy check on every redirect. */
export async function fetchPublicUrl(
  input,
  {
    headers = {},
    maxBytes = MAX_BYTES,
    timeoutMs = 10000,
    redirect = 'follow',
    method = 'GET',
  } = {}
) {
  if (!['GET', 'HEAD'].includes(method)) throw new Error('Website request method is not allowed')
  if (activeFetches >= 20) throw new Error('Website fetch capacity reached')
  activeFetches++
  const deadline = Date.now() + timeoutMs
  try {
    let url = input
    for (let hop = 0; hop <= 5; hop++) {
      const remaining = deadline - Date.now()
      if (remaining <= 0) throw new Error('Website request timed out')
      const target = await resolvePublicUrl(url, Math.min(5000, remaining))
      const response = await requestPublic(target, {
        headers,
        maxBytes,
        timeoutMs: Math.max(1, deadline - Date.now()),
        method,
      })
      const location = response.headers.get('location')
      if (
        redirect === 'manual' ||
        ![301, 302, 303, 307, 308].includes(response.status) ||
        !location
      )
        return response
      if (hop === 5) throw new Error('Website redirect limit exceeded')
      url = new URL(location, target.url).href
    }
    throw new Error('Website redirect limit exceeded')
  } finally {
    activeFetches--
  }
}

/**
 * Short-lived egress proxy: HTTPS tunnels connect to a validated numeric address.
 * Chrome never resolves/connects to the target independently; redirects, frames,
 * subresources and secure WebSockets all pass through this same boundary.
 */
export async function openPublicProxy() {
  const sockets = new Set()
  let closed = false
  let requests = 0
  let bytes = 0
  let lifetime
  const close = () => {
    closed = true
    clearTimeout(lifetime)
    for (const socket of sockets) socket.destroy()
    return new Promise((resolve) => server.close(resolve))
  }
  const budget = (amount) => {
    bytes += amount
    if (bytes > 20 * 1024 * 1024) void close()
  }
  const server = createServer(async (req, res) => {
    try {
      if (closed || ++requests > 100) throw new Error('Website request budget reached')
      const response = await fetchPublicUrl(req.url || '', {
        method: req.method,
        redirect: 'manual',
      })
      const body = Buffer.from(await response.arrayBuffer())
      budget(body.length)
      if (closed) return
      res.writeHead(response.status, Object.fromEntries(response.headers))
      res.end(body)
    } catch {
      res.writeHead(403)
      res.end('Website destination blocked')
    }
  })
  server.on('connection', (socket) => {
    if (closed || sockets.size >= 32) {
      socket.destroy()
      return
    }
    sockets.add(socket)
    socket.on('data', (chunk) => budget(chunk.length))
    socket.on('close', () => sockets.delete(socket))
    socket.on('error', () => socket.destroy())
    socket.setTimeout(15000, () => socket.destroy())
  })
  server.on('connect', async (req, socket, head) => {
    try {
      if (closed || ++requests > 100) throw new Error('Website request budget reached')
      const target = await resolvePublicUrl('https://' + req.url)
      if (closed || sockets.size >= 32) throw new Error('Website connection budget reached')
      const upstream = connect({ host: target.address, port: 443 })
      sockets.add(upstream)
      upstream.on('close', () => sockets.delete(upstream))
      upstream.on('error', () => socket.destroy())
      socket.on('close', () => upstream.destroy())
      upstream.setTimeout(15000, () => upstream.destroy())
      upstream.on('data', (chunk) => budget(chunk.length))
      upstream.once('connect', () => {
        socket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
        if (head.length) upstream.write(head)
        socket.pipe(upstream).pipe(socket)
      })
    } catch {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
    }
  })
  // Plain HTTP WebSocket upgrades are unnecessary for verification screenshots.
  server.on('upgrade', (_req, socket) => socket.destroy())
  server.headersTimeout = 5000
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  lifetime = setTimeout(() => {
    void close()
  }, 30000)
  lifetime.unref()
  return { server: 'http://127.0.0.1:' + server.address().port, close }
}

/** Isolated fresh browser context with bounded public-only network access. */
export async function openPublicBrowser(options = {}) {
  if (activeBrowsers >= 2) throw new Error('Website browser capacity reached')
  activeBrowsers++
  let proxy
  let browser
  try {
    proxy = await openPublicProxy()
    const { chromium } = await import('playwright')
    browser = await chromium.launch({
      ...browserLaunchOptions({
        args: [
          '--disable-dev-shm-usage',
          '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
        ],
      }),
      proxy: { server: proxy.server, bypass: '<-loopback>' },
    })
    const context = await browser.newContext({
      ...options,
      serviceWorkers: 'block',
      acceptDownloads: false,
    })
    let released = false
    return {
      context,
      close: async () => {
        if (released) return
        released = true
        try {
          await browser.close()
        } finally {
          await proxy.close()
          activeBrowsers--
        }
      },
    }
  } catch (error) {
    try {
      await browser?.close()
    } finally {
      await proxy?.close()
      activeBrowsers--
    }
    throw error
  }
}
