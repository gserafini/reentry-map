// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
const events = vi.hoisted(() => [])
vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal()),
  readFileSync: (path) =>
    Buffer.from(
      'DATABASE_URL=postgres://user:fake@localhost/' +
        (String(path).includes('-staging/') ? 'reentry_map_staging' : 'reentry_map')
    ),
}))
vi.mock('postgres', () => ({
  default: (url) => {
    const stage = String(url).includes('reentry_map_staging')
    const query = (strings) => {
      if (!strings.raw) return 'identifiers'
      const text = strings.join(' ')
      if (text.includes('COUNT')) return Promise.resolve([{ count: 0 }])
      return Promise.resolve(stage ? [] : [{ id: 'resource-one', name: 'Help', status: 'active' }])
    }
    query.end = async () => {}
    query.begin = async (callback) => {
      const tx = (strings) => {
        if (!strings.raw) return 'row values'
        if (strings.join(' ').includes('COUNT')) {
          events.push('count inside transaction')
          return Promise.resolve([{ count: 0 }])
        }
        return Promise.resolve([])
      }
      tx.json = (value) => value
      tx.unsafe = (value) => value
      try {
        await callback(tx)
        events.push('COMMIT')
      } catch (error) {
        events.push('ROLLBACK')
        throw error
      }
    }
    return query
  },
}))
import { refreshStagingResources } from '../../scripts/cli/staging-resources.mjs'
describe('staging refresh rollback', () => {
  it('rolls back rather than committing when the refreshed count differs', async () => {
    await expect(refreshStagingResources({ dryRun: false })).rejects.toThrow(
      'Staging count differs'
    )
    expect(events).toContain('ROLLBACK')
    expect(events).not.toContain('COMMIT')
  })
})
