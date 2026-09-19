// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

function worker() {
  const handlers = {}
  const cached = new Response('<h1>Saved contacts</h1>', {
    headers: { 'content-type': 'text/html' },
  })
  const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
  const addAll = vi.fn().mockResolvedValue(undefined)
  const match = vi.fn().mockResolvedValue(cached)
  const open = vi.fn().mockResolvedValue({ addAll })
  const removeCache = vi.fn().mockResolvedValue(true)
  vm.runInNewContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), {
    self: {
      addEventListener: (type, handler) => {
        handlers[type] = handler
      },
      location: { origin: 'https://reentrymap.org' },
      clients: { claim: vi.fn() },
      skipWaiting: vi.fn(),
    },
    caches: {
      open,
      match,
      keys: vi
        .fn()
        .mockResolvedValue(['reentry-map-offline-v1', 'reentry-map-offline-v2', 'other-cache']),
      delete: removeCache,
    },
    fetch,
    URL,
    Response,
    Promise,
  })
  return { handlers, fetch, addAll, match, open, removeCache }
}
describe('offline contact navigation', () => {
  it('precaches only public offline shell files, never account pages or APIs', async () => {
    const { handlers, addAll } = worker()
    let install
    handlers.install({
      waitUntil: (promise) => {
        install = promise
      },
    })
    await install
    expect(addAll).toHaveBeenCalledWith(['/offline.html', '/offline-contacts.js'])
  })
  it('updates the contact shell cache and removes only its older version', async () => {
    const { handlers, open, removeCache } = worker()
    let installed
    handlers.install({
      waitUntil: (promise) => {
        installed = promise
      },
    })
    await installed
    expect(open).toHaveBeenCalledWith('reentry-map-offline-v2')
    let activated
    handlers.activate({
      waitUntil: (promise) => {
        activated = promise
      },
    })
    await activated
    expect(removeCache.mock.calls).toEqual([['reentry-map-offline-v1']])
  })
  it('serves saved-contact shell when a document navigation loses the connection', async () => {
    const { handlers } = worker()
    let response
    handlers.fetch({
      request: { url: 'https://reentrymap.org/favorites', method: 'GET', mode: 'navigate' },
      respondWith: (promise) => {
        response = promise
      },
    })
    expect(await (await response).text()).toContain('Saved contacts')
  })
  it('does not intercept or cache API/session requests', () => {
    const { handlers } = worker()
    const respondWith = vi.fn()
    handlers.fetch({
      request: { url: 'https://reentrymap.org/api/favorites', method: 'GET', mode: 'cors' },
      respondWith,
    })
    expect(respondWith).not.toHaveBeenCalled()
  })
  it('uses the online response when available', async () => {
    const { handlers, fetch } = worker()
    fetch.mockResolvedValue(new Response('Live listing'))
    let response
    handlers.fetch({
      request: { url: 'https://reentrymap.org/search', method: 'GET', mode: 'navigate' },
      respondWith: (promise) => {
        response = promise
      },
    })
    expect(await (await response).text()).toBe('Live listing')
  })
})
