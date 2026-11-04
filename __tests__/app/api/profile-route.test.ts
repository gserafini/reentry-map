// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getTableColumns } from 'drizzle-orm'
import { users } from '@/lib/db/schema'

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  sql: vi.fn(),
  results: [] as unknown[][],
}))
vi.mock('next-auth', () => ({ getServerSession: mocks.session }))
vi.mock('@/lib/auth/config', () => ({ authOptions: {} }))
vi.mock('@/lib/db/client', () => ({ sql: mocks.sql }))

import { GET, PATCH } from '@/app/api/profile/route'

const canonicalColumns = new Set(Object.values(getTableColumns(users)).map((column) => column.name))

function validateRealUsersSchema(strings: TemplateStringsArray): unknown[] {
  const query = strings.join(' ')
  const projection = query.match(
    /\b(?:SELECT|RETURNING)\s+([\s\S]+?)(?:\s+FROM\s+users|\s+WHERE|$)/i
  )?.[1]
  if (projection) {
    for (const rawColumn of projection.split(',')) {
      const column = rawColumn.trim()
      if (column === '*' || !canonicalColumns.has(column)) {
        throw new Error(`column "${column}" does not exist in users`)
      }
    }
  }
  const assignments = query.match(/\bUPDATE\s+users\s+SET\s+([\s\S]+?)\s+WHERE/i)?.[1]
  if (assignments) {
    for (const assignment of assignments.split(',')) {
      const column = assignment.split('=')[0].trim()
      if (!canonicalColumns.has(column))
        throw new Error(`column "${column}" does not exist in users`)
    }
  }
  return mocks.results.shift() || []
}

const profile = {
  id: '2fae590f-832b-48a3-b126-b8dca41e1b65',
  email: 'member@example.test',
  name: 'Jordan Lee',
  phone: null,
  avatar_url: null,
  is_admin: false,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-02T00:00:00.000Z',
}

function patchRequest(body: unknown) {
  return new NextRequest('https://reentrymap.org/api/profile', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('profile route against the canonical users schema', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.results = []
    mocks.session.mockResolvedValue({ user: { id: profile.id, phone: null } })
    mocks.sql.mockImplementation(validateRealUsersSchema)
  })

  it('reads a safe projection using only real users columns', async () => {
    mocks.results.push([profile])
    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data).toEqual(profile)
    expect(body.data).not.toHaveProperty('password_hash')
    expect(body.data).not.toHaveProperty('passwordHash')
  })

  it('returns 404 for a deleted account and never recreates it', async () => {
    const response = await GET()
    expect(response.status).toBe(404)
    expect(mocks.sql).toHaveBeenCalledTimes(1)
    expect(mocks.sql.mock.calls[0][0].join(' ')).not.toMatch(/INSERT\s+INTO\s+users/i)
  })

  it('updates the canonical full name without splitting it', async () => {
    const updated = { ...profile, name: 'Jordan Amara Lee' }
    mocks.results.push([updated])
    const response = await PATCH(patchRequest({ name: updated.name }))
    expect(response.status).toBe(200)
    expect((await response.json()).data.name).toBe(updated.name)
    expect(mocks.sql.mock.calls[0][0].join(' ')).toMatch(/SET\s+name\s*=/i)
  })

  it('combines both explicitly supplied legacy name fields for old clients', async () => {
    mocks.results.push([{ ...profile, name: 'Jordan Amara Lee' }])
    const response = await PATCH(patchRequest({ first_name: 'Jordan Amara', last_name: 'Lee' }))
    expect(response.status).toBe(200)
    expect((await response.json()).data.name).toBe('Jordan Amara Lee')
  })

  it('rejects names longer than the documented bound before querying', async () => {
    const response = await PATCH(patchRequest({ name: 'x'.repeat(121) }))
    expect(response.status).toBe(400)
    expect(mocks.sql).not.toHaveBeenCalled()
  })
})
