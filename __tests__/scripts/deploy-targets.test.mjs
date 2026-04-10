// @vitest-environment node
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

  it('uses a local su transport when already running on the target host', async () => {
    const { getTargetConfig } = await import('../../scripts/cli/targets.mjs')
    const { buildUserCommandTransport } = await import('../../scripts/cli/commands/deploy.mjs')

    expect(
      buildUserCommandTransport(
        getTargetConfig('staging'),
        'pm2 show reentry-map-staging --no-color',
        'dc3-1.serafinihosting.com'
      )
    ).toEqual({
      cmd: 'su',
      args: ['-', 'reentrymap', '-c', 'pm2 show reentry-map-staging --no-color'],
    })
  })

  it('uses ssh transport when running off-host', async () => {
    const { getTargetConfig } = await import('../../scripts/cli/targets.mjs')
    const { buildUserCommandTransport } = await import('../../scripts/cli/commands/deploy.mjs')

    expect(
      buildUserCommandTransport(
        getTargetConfig('staging'),
        'pm2 show reentry-map-staging --no-color',
        'gabriels-macbook-pro'
      )
    ).toEqual({
      cmd: 'ssh',
      args: [
        '-p',
        '22022',
        'root@dc3-1.serafinihosting.com',
        'su - reentrymap -c "pm2 show reentry-map-staging --no-color"',
      ],
    })
  })

  it('runs directly when already on the target host as the target user', async () => {
    const { getTargetConfig } = await import('../../scripts/cli/targets.mjs')
    const { buildUserCommandTransport } = await import('../../scripts/cli/commands/deploy.mjs')

    expect(
      buildUserCommandTransport(
        getTargetConfig('staging'),
        'pm2 show reentry-map-staging --no-color',
        'dc3-1.serafinihosting.com',
        'reentrymap'
      )
    ).toEqual({
      cmd: 'bash',
      args: ['-lc', 'pm2 show reentry-map-staging --no-color'],
    })
  })
})
