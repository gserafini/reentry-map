import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const PROJECT_ROOT = '/home/reentrymap/reentry-map-prod'
const RESOURCE_PAYLOAD = [
  {
    name: 'CLI Import Test Resource',
    address: '123 Main St',
    city: 'Lubbock',
    state: 'TX',
    primary_category: 'general-support',
  },
]

describe('resource CLI import', () => {
  let tempRelativePath
  let tempAbsolutePath
  let fetchMock
  const originalAdminApiKey = process.env.ADMIN_API_KEY
  const originalAdminCliBaseUrl = process.env.ADMIN_CLI_BASE_URL

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()

    process.env.ADMIN_API_KEY = 'test-admin-key'
    process.env.ADMIN_CLI_BASE_URL = 'http://localhost:3003'

    tempRelativePath = `__tests__/tmp-resource-import-${Date.now()}.json`
    tempAbsolutePath = join(PROJECT_ROOT, tempRelativePath)
    writeFileSync(tempAbsolutePath, JSON.stringify(RESOURCE_PAYLOAD))

    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ stats: { total: 1, created: 1 } }),
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()

    try {
      unlinkSync(tempAbsolutePath)
    } catch {
      // Temp file already removed.
    }

    if (originalAdminApiKey === undefined) {
      delete process.env.ADMIN_API_KEY
    } else {
      process.env.ADMIN_API_KEY = originalAdminApiKey
    }

    if (originalAdminCliBaseUrl === undefined) {
      delete process.env.ADMIN_CLI_BASE_URL
    } else {
      process.env.ADMIN_CLI_BASE_URL = originalAdminCliBaseUrl
    }
  })

  it('wraps imported arrays in a resources object before posting', async () => {
    const { run } = await import('../../scripts/cli/commands/resources.mjs')

    await run(['import', tempRelativePath])

    expect(fetchMock).toHaveBeenCalledOnce()

    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toContain('/api/admin/resources/import')
    expect(JSON.parse(String(options.body))).toEqual({ resources: RESOURCE_PAYLOAD })
  })
})
