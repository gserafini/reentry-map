/**
 * Shared Playwright/Patchright launch options for browsers that load resource websites.
 *
 * Those pages are third-party content, so (server_ops B1924):
 * - use the RPM-managed Google Chrome on dc3-1, which dnf keeps patched, instead of a
 *   bundled engine that only updates with the library;
 * - keep Chrome's sandbox on. Playwright adds --no-sandbox unless chromiumSandbox is true.
 *   Chrome cannot run sandboxed as root, so only root launches without it.
 */

import { existsSync } from 'node:fs'

export const SYSTEM_CHROME = '/opt/google/chrome/chrome'

const SANDBOX_OFF_FLAGS = new Set(['--no-sandbox', '--disable-setuid-sandbox'])

/**
 * @param {{ args?: string[], headless?: boolean, exists?: (filepath: string) => boolean, uid?: number }} [options]
 * @returns {{ headless: boolean, args: string[], chromiumSandbox: boolean, executablePath?: string }}
 */
export function browserLaunchOptions({
  args = [],
  headless = true,
  exists = existsSync,
  uid = process.getuid?.(),
} = {}) {
  const asRoot = uid === 0
  const options = {
    headless,
    args: args.filter((arg) => !SANDBOX_OFF_FLAGS.has(arg)),
    chromiumSandbox: !asRoot,
  }

  if (asRoot) options.args.push('--no-sandbox')
  if (exists(SYSTEM_CHROME)) options.executablePath = SYSTEM_CHROME

  return options
}
