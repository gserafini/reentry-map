// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('@/lib/db/client')
const mocks = vi.hoisted(() => ({ postgres: vi.fn() }))
vi.mock('postgres', () => ({ default: (...args: unknown[]) => mocks.postgres(...args) }))

describe('Drizzle postgres.js TLS options', () => {
  const client = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    mocks.postgres.mockReset().mockReturnValue(client)
    client.mockReset()
    delete (globalThis as typeof globalThis & { sql?: unknown }).sql
    delete (globalThis as typeof globalThis & { db?: unknown }).db
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    delete (globalThis as typeof globalThis & { sql?: unknown }).sql
    delete (globalThis as typeof globalThis & { db?: unknown }).db
  })

  it.each([
    ['postgres://user:pass@localhost:5432/app', false],
    ['postgres://user:pass@127.0.0.1:5432/app', false],
    ['postgres://user:pass@[::1]:5432/app', false],
    ['postgres://user:localhost@db.example.test:5432/app', { rejectUnauthorized: true }],
    ['postgres://user:pass@db.example.test:5432/app?ssl=require', { rejectUnauthorized: true }],
  ])('passes secure TLS options for the parsed host in %s', async (connectionString, ssl) => {
    vi.stubEnv('DATABASE_URL', connectionString)
    const { sql } = await import('@/lib/db/client')
    sql('SELECT 1')
    expect(mocks.postgres).toHaveBeenCalledWith(connectionString, expect.objectContaining({ ssl }))
    expect(client).toHaveBeenCalledOnce()
  })
})
