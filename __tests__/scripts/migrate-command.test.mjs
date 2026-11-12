// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildMigrationCommand } from '../../scripts/cli/commands/migrate.mjs'
import { getTargetConfig } from '../../scripts/cli/targets.mjs'

// A migration must stop at the first failing statement and roll back as one unit;
// otherwise psql exits 0 and the CLI reports success for a half-applied migration.
describe('migration apply command', () => {
  const staging = getTargetConfig('staging')
  const file = '/home/reentrymap/reentry-map-staging/lib/db/migrations/036_x.sql'

  it('stops on the first error and uses one transaction when applying over SSH', () => {
    const { command, args, input } = buildMigrationCommand(staging, file, {
      local: false,
      uid: 501,
    })
    expect(command).toBe('ssh')
    expect(args.join(' ')).toContain('-p 22022 root@dc3-1.serafinihosting.com')
    expect(args.join(' ')).toContain('ON_ERROR_STOP=1')
    expect(args.join(' ')).toContain('--single-transaction')
    expect(args.join(' ')).toContain('reentry_map_staging')
    expect(input).toBe(file)
  })

  it('runs psql on this host as the project user with --local from root', () => {
    const { command, args } = buildMigrationCommand(staging, file, { local: true, uid: 0 })
    expect(command).toBe('su')
    expect(args.slice(0, 2)).toEqual(['-', 'reentrymap'])
    expect(args.join(' ')).not.toContain('ssh')
    expect(args.join(' ')).toContain('ON_ERROR_STOP=1')
    expect(args.join(' ')).toContain('--single-transaction')
  })

  it('runs psql directly with --local when already the project user', () => {
    const { command, args } = buildMigrationCommand(staging, file, { local: true, uid: 1000 })
    expect(command).toBe('psql')
    expect(args).toEqual(
      expect.arrayContaining([
        '-U',
        'reentrymap',
        'reentry_map_staging',
        '-v',
        'ON_ERROR_STOP=1',
        '--single-transaction',
      ])
    )
  })
})
