import { describe, expect, it } from 'vitest'
import {
  getDuplicateCanonicalResourceId,
  getDuplicateCanonicalResourceUrl,
} from '@/lib/utils/duplicate-resource'

const duplicateId = '11111111-1111-4111-8111-111111111111'
const canonicalId = '22222222-2222-4222-8222-222222222222'

const duplicate = {
  id: duplicateId,
  status: 'inactive',
  provenance: { duplicate_merge: { canonical_resource_id: canonicalId } },
}
const canonical = {
  id: canonicalId,
  name: 'RTD LiVE Program',
  city: 'Denver',
  state: 'CO',
  status: 'active',
}

describe('duplicate resource canonical redirects', () => {
  it('reads only the explicit provenance duplicate-merge pointer from inactive rows', () => {
    expect(getDuplicateCanonicalResourceId(duplicate)).toBe(canonicalId)
    expect(
      getDuplicateCanonicalResourceId({
        ...duplicate,
        provenance: null,
        parentResourceId: canonicalId,
      })
    ).toBeNull()
    expect(getDuplicateCanonicalResourceId({ ...duplicate, provenance: null })).toBeNull()
    expect(getDuplicateCanonicalResourceId({ ...duplicate, status: 'active' })).toBeNull()
    expect(getDuplicateCanonicalResourceId({ ...duplicate, status: 'draft' })).toBeNull()
    expect(getDuplicateCanonicalResourceId({ ...duplicate, status: 'flagged' })).toBeNull()
  })

  it.each([
    ['malformed UUID', 'not-a-uuid'],
    ['self pointer', duplicateId],
  ])('rejects a %s', (_label, targetId) => {
    expect(
      getDuplicateCanonicalResourceId({
        ...duplicate,
        provenance: { duplicate_merge: { canonical_resource_id: targetId } },
      })
    ).toBeNull()
  })

  it('generates a local canonical URL only for the matching active target', () => {
    expect(getDuplicateCanonicalResourceUrl(duplicate, canonical, [canonical])).toBe(
      '/co/denver/rtd-live-program'
    )
    expect(
      getDuplicateCanonicalResourceUrl(duplicate, { ...canonical, status: 'inactive' }, [canonical])
    ).toBeNull()
    expect(
      getDuplicateCanonicalResourceUrl(duplicate, { ...canonical, id: duplicateId }, [canonical])
    ).toBeNull()
    expect(
      getDuplicateCanonicalResourceUrl(
        { ...duplicate, provenance: { duplicate_merge: { canonical_resource_id: duplicateId } } },
        canonical,
        [canonical]
      )
    ).toBeNull()
  })

  it('rejects a generated path that is shared by another active resource in the canonical city', () => {
    const collision = {
      ...canonical,
      id: '33333333-3333-4333-8333-333333333333',
      name: 'RTD LiVE Program!',
    }

    expect(
      getDuplicateCanonicalResourceUrl(duplicate, canonical, [canonical, collision])
    ).toBeNull()
  })

  it('requires the target in its same-city active peer set and permits another-city homonyms', () => {
    const auroraCanonical = { ...canonical, city: 'Aurora' }
    const denverHomonym = { ...canonical, id: '33333333-3333-4333-8333-333333333333' }

    expect(
      getDuplicateCanonicalResourceUrl(duplicate, auroraCanonical, [auroraCanonical, denverHomonym])
    ).toBe('/co/aurora/rtd-live-program')
    expect(getDuplicateCanonicalResourceUrl(duplicate, auroraCanonical, [])).toBeNull()
  })

  it.each([
    ['missing city', { city: null }],
    ['missing state', { state: null }],
    ['invalid state slug', { state: 'C/..' }],
    ['state not resolved by the current route', { state: 'co' }],
    ['empty city', { city: '   ' }],
    ['city with non-round-tripping separators', { city: 'Winston-Salem' }],
    ['city with collapsed whitespace', { city: 'San  Francisco' }],
    ['path separator in city', { city: '../other' }],
    ['encoded path component in city', { city: '%2e%2e' }],
    ['query character in city', { city: 'Denver?other=1' }],
    ['fragment character in city', { city: 'Denver#other' }],
    ['control character in city', { city: 'Den\u0000ver' }],
    ['dot path component', { city: '.' }],
    ['parent path component', { city: '..' }],
    ['empty generated resource slug', { name: '!!!' }],
  ])('rejects canonical targets with %s', (_label, overrides) => {
    const target = { ...canonical, ...overrides }
    expect(getDuplicateCanonicalResourceUrl(duplicate, target, [target])).toBeNull()
  })

  it('rejects an inactive-to-inactive cycle instead of following the chain', () => {
    const first = {
      ...duplicate,
      provenance: { duplicate_merge: { canonical_resource_id: canonicalId } },
    }
    const second = {
      ...canonical,
      status: 'inactive',
      provenance: { duplicate_merge: { canonical_resource_id: duplicateId } },
    }

    expect(getDuplicateCanonicalResourceUrl(first, second, [second])).toBeNull()
  })

  it('rejects a reverse pointer from the active target back to the inactive source', () => {
    const cyclicCanonical = {
      ...canonical,
      provenance: { duplicate_merge: { canonical_resource_id: duplicateId } },
    }

    expect(
      getDuplicateCanonicalResourceUrl(duplicate, cyclicCanonical, [cyclicCanonical])
    ).toBeNull()
  })
})
