// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  buildDeployCommand,
  buildLogCommand,
  shellQuote,
} from '../../scripts/cli/commands/deploy.mjs'
import { getTargetConfig } from '../../scripts/cli/targets.mjs'
import {
  assertStagingConnection,
  publicResourceColumns,
} from '../../scripts/cli/staging-resources.mjs'
describe('reviewable local deployments', () => {
  const target = getTargetConfig('production')
  it('deploys a specific committed revision locally without a GitHub pull', () => {
    const cmd = buildDeployCommand(target, { local: true, revision: 'a'.repeat(40) })
    expect(cmd).not.toContain('git pull')
    expect(cmd).toContain('git status --porcelain')
    expect(cmd).toContain('git rev-parse HEAD')
    expect(cmd).toContain('npm ci')
    expect(cmd).toContain('pm2 restart')
  })
  it('requires a full commit id for local deployment', () => {
    expect(() => buildDeployCommand(target, { local: true })).toThrow(/revision/)
    expect(() =>
      buildDeployCommand(target, { local: true, revision: '$(touch /tmp/unsafe)' })
    ).toThrow()
  })
  it('pulls only a fast-forward by default and follows runtime log paths', () => {
    expect(buildDeployCommand(target)).toContain('git pull --ff-only')
    expect(buildLogCommand(target, 25)).toContain('pm2 logs')
    expect(() => buildLogCommand(target, '5;whoami')).toThrow()
    expect(shellQuote("a'b")).toBe("'a'\\''b'")
  })
})
describe('public staging dataset refresh', () => {
  it('cannot write to production or a remote database', () => {
    expect(() =>
      assertStagingConnection('postgres://user:password@localhost/reentry_map')
    ).toThrow()
    expect(() =>
      assertStagingConnection('postgres://user:password@example.com/reentry_map_staging')
    ).toThrow()
    expect(() =>
      assertStagingConnection('postgres://user:password@127.0.0.1/reentry_map_staging')
    ).not.toThrow()
  })
  it('copies public listing data, never user identities or provenance', () => {
    expect(publicResourceColumns).toContain('service_area')
    expect(publicResourceColumns).not.toContain('verified_by')
    expect(publicResourceColumns).not.toContain('provenance')
    expect(publicResourceColumns).not.toContain('verification_history')
  })
})
