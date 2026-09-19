// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
const refresh = vi.hoisted(() => vi.fn())
vi.mock('../../scripts/cli/staging-resources.mjs', async (importOriginal) => ({
  ...(await importOriginal()),
  refreshStagingResources: refresh,
}))
import { run, buildDeployCommand, shellQuote } from '../../scripts/cli/commands/deploy.mjs'
import { assertStagingConnection } from '../../scripts/cli/staging-resources.mjs'
import { getTargetConfig } from '../../scripts/cli/targets.mjs'
import { execFileSync } from 'node:child_process'

describe('deployment operational safeguards', () => {
  it('never applies a refresh with an explicit dry-run flag', async () => {
    await run(['refresh-staging-resources', '--apply', '--dry-run'])
    expect(refresh).toHaveBeenLastCalledWith({ dryRun: true })
  })
  it('rejects PostgreSQL connection query overrides that change the destination', () => {
    expect(() =>
      assertStagingConnection(
        'postgres://user:fake@localhost/reentry_map_staging?database=reentry_map'
      )
    ).toThrow()
    expect(() =>
      assertStagingConnection(
        'postgres://user:fake@localhost/reentry_map_staging?options=-c%20search_path%3Dother'
      )
    ).toThrow()
    expect(() => assertStagingConnection('http://localhost/reentry_map_staging')).toThrow()
  })
  it('quotes shell metacharacters as literal arguments', () => {
    const argument = "hello ' $(printf bad) `printf bad` ; & \n $HOME"
    expect(
      execFileSync('bash', ['-c', 'printf %s ' + shellQuote(argument)], { encoding: 'utf8' })
    ).toBe(argument)
  })
  it('refuses the wrong local revision before install or restart', () => {
    const command = buildDeployCommand(
      { ...getTargetConfig('staging'), cwd: '/tmp' },
      { local: true, revision: 'b'.repeat(40) }
    )
    const prelude =
      'git() { if [ "$1" = status ]; then return 0; fi; printf \'%s\' aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa; }; npm() { printf UNSAFE; }; pm2() { printf UNSAFE; }; '
    try {
      execFileSync('bash', ['-c', prelude + command], { encoding: 'utf8', stdio: 'pipe' })
      throw new Error('Unsafe deployment proceeded')
    } catch (error) {
      expect(error.status).toBe(1)
      expect(String(error.stdout)).not.toContain('UNSAFE')
      expect(String(error.stderr)).toContain('local HEAD differs')
    }
  })
})
