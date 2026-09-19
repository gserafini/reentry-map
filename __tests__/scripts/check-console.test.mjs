// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
const fallback =
  'Attempted to load a Vector Map, but failed. Falling back to Raster. Please see https://developers.google.com/maps/documentation/javascript/webgl/support for more info .'

async function runCheck({
  events = [],
  status = 200,
  navigationError,
  contextError,
  launchError,
} = {}) {
  const handlers = {}
  const page = {
    on: vi.fn((event, callback) => {
      handlers[event] = callback
    }),
    goto: vi.fn(async () => {
      for (const [event, payload] of events) handlers[event]?.(payload)
      if (navigationError) throw new Error(navigationError)
      return { status: () => status, url: () => 'http://localhost:3003/' }
    }),
    locator: vi.fn(() => ({ waitFor: vi.fn(async () => {}) })),
    waitForTimeout: vi.fn(async () => {}),
  }
  const browser = {
    newContext: vi.fn(async () => {
      if (contextError) throw new Error(contextError)
      return { newPage: vi.fn(async () => page) }
    }),
    close: vi.fn(async () => {}),
  }
  const chromium = {
    launch: vi.fn(async () => {
      if (launchError) throw new Error(launchError)
      return browser
    }),
  }
  const process = { argv: ['node', 'check-console.mjs', '/'], env: {}, exitCode: 0 }
  const console = { log: vi.fn(), error: vi.fn(), warn: vi.fn() }
  const source = readFileSync(
    new URL('../../scripts/check-console.mjs', import.meta.url),
    'utf8'
  ).replace("import { chromium } from 'playwright'", 'const { chromium } = harness')
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
  let escapedError
  try {
    await new AsyncFunction('harness', 'process', 'console', source)({ chromium }, process, console)
  } catch (error) {
    escapedError = error
  }
  return { process, browser, page, console, escapedError }
}
describe('browser console release gate', () => {
  it('passes a clean page after DOM readiness without waiting for network idle', async () => {
    const result = await runCheck()
    expect(result.process.exitCode).toBe(0)
    expect(result.page.goto).toHaveBeenCalledWith(
      'http://localhost:3003/',
      expect.objectContaining({ waitUntil: 'domcontentloaded' })
    )
    expect(result.page.locator).toHaveBeenCalledWith('body')
    expect(result.page.waitForTimeout.mock.calls[0][0]).toBeLessThanOrEqual(2000)
    expect(result.browser.close).toHaveBeenCalledOnce()
  })
  it('fails on an application page exception instead of only logging it', async () => {
    const result = await runCheck({ events: [['pageerror', new Error('RSC render failed')]] })
    expect(result.process.exitCode).toBe(1)
    expect(result.browser.close).toHaveBeenCalledOnce()
  })
  it('fails on an HTTP error returned by navigation', async () => {
    const result = await runCheck({ status: 500 })
    expect(result.process.exitCode).toBe(1)
  })
  it('fails on background HTTP errors even when the document returns 200', async () => {
    const result = await runCheck({
      events: [
        ['response', { status: () => 503, url: () => 'http://localhost:3003/api/resources' }],
      ],
    })
    expect(result.process.exitCode).toBe(1)
  })
  it('fails unexpected console errors while allowing normal warnings', async () => {
    const failed = await runCheck({
      events: [['console', { type: () => 'error', text: () => 'Hydration failed' }]],
    })
    const warning = await runCheck({
      events: [['console', { type: () => 'warning', text: () => 'Development notice' }]],
    })
    expect(failed.process.exitCode).toBe(1)
    expect(warning.process.exitCode).toBe(0)
  })
  it.each([fallback, fallback.slice(0, -2)])(
    'allows the verified headless Maps fallback variant: %s',
    async (message) => {
      const result = await runCheck({
        events: [['console', { type: () => 'error', text: () => message }]],
      })
      expect(result.process.exitCode).toBe(0)
    }
  )
  it.each([
    fallback + ' Unexpected application failure',
    'Google Maps JavaScript API error: InvalidKeyMapError',
    fallback.replace('Raster', 'Unavailable'),
  ])('rejects other Maps-related errors: %s', async (message) => {
    const result = await runCheck({
      events: [['console', { type: () => 'error', text: () => message }]],
    })
    expect(result.process.exitCode).toBe(1)
  })
  it('fails navigation timeouts and still closes the browser', async () => {
    const result = await runCheck({ navigationError: 'Navigation timeout' })
    expect(result.process.exitCode).toBe(1)
    expect(result.browser.close).toHaveBeenCalledOnce()
  })
  it('closes the launched browser when context creation fails', async () => {
    const result = await runCheck({ contextError: 'Context failed' })
    expect(result.escapedError).toBeUndefined()
    expect(result.process.exitCode).toBe(1)
    expect(result.browser.close).toHaveBeenCalledOnce()
  })
  it('returns a failing result if Chromium cannot launch', async () => {
    const result = await runCheck({ launchError: 'Chromium unavailable' })
    expect(result.escapedError).toBeUndefined()
    expect(result.process.exitCode).toBe(1)
  })
})
