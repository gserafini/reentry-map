import { describe, expect, it } from 'vitest'

import { SYSTEM_CHROME, browserLaunchOptions } from '@/lib/utils/browser-launch.mjs'

// server_ops B1924: resource checks render third-party sites, so they must run the
// dnf-patched Google Chrome with its sandbox on, not a bundled engine with --no-sandbox.
const chromeInstalled = (filepath: string) => filepath === SYSTEM_CHROME

describe('browserLaunchOptions', () => {
  it('uses the RPM-managed Google Chrome when it is installed', () => {
    expect(SYSTEM_CHROME).toBe('/opt/google/chrome/chrome')
    expect(browserLaunchOptions({ exists: chromeInstalled, uid: 1000 }).executablePath).toBe(
      SYSTEM_CHROME
    )
  })

  it('falls back to the bundled engine where system Chrome is absent (dev Macs)', () => {
    expect(browserLaunchOptions({ exists: () => false, uid: 501 }).executablePath).toBeUndefined()
  })

  it('keeps the Chrome sandbox on for the reentrymap service user', () => {
    const options = browserLaunchOptions({
      exists: chromeInstalled,
      uid: 1000,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })

    expect(options.headless).toBe(true)
    expect(options.chromiumSandbox).toBe(true)
    expect(options.args).toEqual(['--disable-dev-shm-usage'])
  })

  it('disables the sandbox only for root, which Chrome cannot sandbox', () => {
    const options = browserLaunchOptions({ exists: chromeInstalled, uid: 0 })

    expect(options.chromiumSandbox).toBe(false)
    expect(options.args).toContain('--no-sandbox')
  })
})
