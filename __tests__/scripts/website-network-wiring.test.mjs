import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
const root = path.resolve(__dirname, '../..')
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
// Isolate only these functions: importing operational scripts would load credentials
// and execute their scheduled DB-writing main functions.
function isolated(file, name, nextMarker, dependencies) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  const start = source.indexOf(`async function ${name}(`)
  const end = source.indexOf(nextMarker, start)
  if (start < 0 || end < 0) throw new Error('Function boundary missing')
  return new AsyncFunction(
    ...Object.keys(dependencies),
    `${source.slice(start, end)}\n return ${name};`
  )(...Object.values(dependencies))
}
describe('operational website network wiring', () => {
  it('routes enrichment HTTP through the public guard and handles blocked destinations', async () => {
    const guarded = vi
      .fn()
      .mockResolvedValue({ ok: true, text: async () => '<p>Public content</p>' })
    const load = await isolated('scripts/batch-enrich.mjs', 'fetchPageSimple', '/** Tier 2:', {
      fetchPublicUrl: guarded,
      htmlToText: (text) => text,
    })
    expect((await load('https://example.org')).text).toContain('Public content')
    expect(guarded).toHaveBeenCalledWith(
      'https://example.org',
      expect.objectContaining({ redirect: 'follow' })
    )
    guarded.mockRejectedValue(new Error('Private destination'))
    expect(await load('http://127.0.0.1')).toBe(null)
  })
  it.each([
    ['scripts/batch-enrich.mjs', 'fetchPageWithBrowser', '/**\n * Fetch a page'],
    [
      'scripts/periodic-verification.mjs',
      'checkUrlWithRedundancy',
      '/**\n * Verify a single resource',
    ],
  ])(
    '%s opens a fresh guarded browser and closes it on navigation failure',
    async (file, name, marker) => {
      const goto = vi.fn().mockRejectedValue(new Error('blocked redirect'))
      const close = vi.fn()
      const guard = vi
        .fn()
        .mockImplementation(async () => ({ context: { newPage: async () => ({ goto }) }, close }))
      const load = await isolated(file, name, marker, { openPublicBrowser: guard })
      await load('https://example.org/one')
      await load('https://example.org/two')
      expect(guard).toHaveBeenCalledTimes(2)
      expect(goto).toHaveBeenCalledTimes(2)
      expect(close).toHaveBeenCalledTimes(2)
    }
  )
  it.each([
    ['scripts/batch-enrich.mjs', 'fetchPageWithBrowser', '/**\n * Fetch a page'],
    [
      'scripts/periodic-verification.mjs',
      'checkUrlWithRedundancy',
      '/**\n * Verify a single resource',
    ],
  ])(
    '%s releases browser capacity when context page creation fails',
    async (file, name, marker) => {
      const close = vi.fn()
      const load = await isolated(file, name, marker, {
        openPublicBrowser: async () => ({
          context: {
            newPage: async () => {
              throw new Error('page failed')
            },
          },
          close,
        }),
      })
      await load('https://example.org')
      expect(close).toHaveBeenCalledTimes(1)
    }
  )
})
