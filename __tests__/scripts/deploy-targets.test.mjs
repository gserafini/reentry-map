import { describe, expect, it } from 'vitest'

describe('reentry map deploy targets', () => {
  it('resolves staging aliases to the dedicated staging environment', async () => {
    const { getTargetConfig } = await import('../../scripts/cli/targets.mjs')

    expect(getTargetConfig('stage')).toMatchObject({
      name: 'staging',
      appName: 'reentry-map-staging',
      port: 3009,
      dbName: 'reentry_map_staging',
      cwd: '/home/reentrymap/reentry-map-staging',
      publicUrl: 'https://staging.reentrymap.org',
    })
  })
})
