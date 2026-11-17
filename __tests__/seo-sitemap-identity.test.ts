// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { generateResourceUrl } from '@/lib/utils/urls'
import { getDuplicateCanonicalResourceUrl } from '@/lib/utils/duplicate-resource'
import { buildSitemapEntries } from '@/lib/seo/sitemap-entries'
const id = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const row = {
  id,
  name: 'Community Service',
  city: 'Oakland',
  state: 'CA',
  slug: null,
  primary_category: 'housing',
  categories: ['housing'],
  updated_at: '2026-11-01T00:00:00Z',
  created_at: '2026-10-01T00:00:00Z',
}
describe('canonical sitemap identities', () => {
  it('resolves merged records to the explicit identity-qualified destination even when names collide', () => {
    const canonical = { ...row, status: 'active', slug: `community-service--${id}` }
    const source = {
      id: other,
      status: 'inactive',
      provenance: { duplicate_merge: { canonical_resource_id: id } },
    }
    expect(
      getDuplicateCanonicalResourceUrl(source, canonical, [
        canonical,
        { ...canonical, id: other, slug: `community-service--${other}` },
      ])
    ).toBe(`/${'ca/oakland/community-service--'}${id}`)
  })
  it('uses an explicitly assigned identity-qualified slug without changing ordinary or old stored slugs', () => {
    expect(generateResourceUrl({ ...row, slug: `community-service--${id}` })).toBe(
      `/ca/oakland/community-service--${id}`
    )
    expect(generateResourceUrl({ ...row, slug: 'old-unused-name-1' })).toBe(
      '/ca/oakland/community-service'
    )
    expect(generateResourceUrl({ ...row, slug: `community-service--${other}` })).toBe(
      '/ca/oakland/community-service'
    )
  })
  it('omits ambiguous old URLs and redirected tag URLs rather than selecting an arbitrary resource', () => {
    const entries = buildSitemapEntries([row, { ...row, id: other }])
    expect(
      entries.some((e) => e.url === 'https://reentrymap.org/ca/oakland/community-service')
    ).toBe(false)
    expect(entries.some((e) => e.url.includes('/tag/'))).toBe(false)
    expect(new Set(entries.map((e) => e.url)).size).toBe(entries.length)
  })
  it('includes each independently identified service and actual stable modification dates', () => {
    const entries = buildSitemapEntries([
      { ...row, slug: `community-service--${id}` },
      { ...row, id: other, slug: `community-service--${other}` },
    ])
    expect(entries.filter((e) => e.url.includes('/ca/oakland/community-service--'))).toHaveLength(2)
    expect(entries.find((e) => e.url.endsWith(id))?.lastModified).toEqual(new Date(row.updated_at))
    expect(entries.find((e) => e.url === 'https://reentrymap.org')?.lastModified).toEqual(
      new Date(row.updated_at)
    )
    expect(entries.find((e) => e.url.endsWith('/methodology'))?.lastModified).toBeUndefined()
  })
  it('does not invent modification timestamps for unknown or invalid dates', () => {
    const entries = buildSitemapEntries([{ ...row, updated_at: 'not a date', created_at: null }])
    expect(entries.find((e) => e.url.endsWith('/community-service'))?.lastModified).toBeUndefined()
  })
})
