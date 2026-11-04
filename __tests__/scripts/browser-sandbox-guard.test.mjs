import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import * as batchEnrichFetch from '../../scripts/lib/batch-enrich-fetch.mjs'
import { browserLaunchOptions } from '../../lib/utils/browser-launch.mjs'

// server_ops B1924: every browser that loads resource websites goes through
// lib/utils/browser-launch.mjs (system Chrome, with an unprivileged root wrapper).
const root = path.resolve(__dirname, '../..')
const POLICY = 'lib/utils/browser-launch.mjs'
const SANDBOX_OFF = /['"`]--(no-sandbox|disable-setuid-sandbox)['"`]/

function sourceFiles(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sourceFiles(rel)
    return /\.(m?js|tsx?)$/.test(entry.name) ? [rel] : []
  })
}

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')

describe('browser sandbox guard', () => {
  it('keeps the sandbox enabled for root through the unprivileged wrapper', () => {
    const options = browserLaunchOptions({ uid: 0, exists: () => true })
    expect(options.chromiumSandbox).toBe(true)
    expect(options.executablePath).toBe('/usr/local/bin/chrome-agentbrowser')
    expect(options.args).not.toContain('--no-sandbox')
  })

  it('keeps service-user launches sandboxed on the maintained system Chrome', () => {
    const options = browserLaunchOptions({ uid: 1000, exists: () => true })
    expect(options.chromiumSandbox).toBe(true)
    expect(options.executablePath).toBe('/opt/google/chrome/chrome')
  })

  it('turns the sandbox off nowhere except the shared launch policy', () => {
    const offenders = ['lib', 'app', 'scripts']
      .flatMap(sourceFiles)
      .filter((rel) => rel !== POLICY && SANDBOX_OFF.test(read(rel)))

    expect(offenders).toEqual([])
  })

  it.each([
    'lib/utils/verification.ts',
    'lib/utils/screenshot.ts',
    'scripts/batch-enrich.mjs',
    'scripts/periodic-verification.mjs',
    'scripts/test-playwright-url.mjs',
  ])('%s launches through browserLaunchOptions', (rel) => {
    expect(read(rel)).toMatch(/\.launch\(\s*browserLaunchOptions\(/)
  })

  it('runs the root Mac recheck on sandboxed system Chrome from the known Patchright install', () => {
    const recheck = read('scripts/recheck-unreachable-via-mac.mjs')

    expect(batchEnrichFetch.MAC_CHROME_LAUNCH_OPTIONS).toContain(
      "channel: 'chrome', chromiumSandbox: true"
    )
    expect(recheck).toContain('MAC_CHROME_LAUNCH_OPTIONS')
    expect(recheck).toContain('MAC_PATCHRIGHT_MODULE')
    expect(recheck).not.toContain("require('patchright')")
  })

  // The cron runs as reentrymap, which cannot reach the Mac, and the dropped tier
  // interpolated resource URLs into a double-quoted shell command.
  it('keeps batch enrichment on dc3-1, with no Mac shell tier', () => {
    expect(batchEnrichFetch).not.toHaveProperty('buildMacPatchrightFetchCommand')
    expect(read('scripts/batch-enrich.mjs')).not.toMatch(
      /fetchPageViaMac|buildMacPatchrightFetchCommand|execSync/
    )
  })
})
