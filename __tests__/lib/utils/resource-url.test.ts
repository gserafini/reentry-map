import { describe, it, expect } from 'vitest'
import { getResourceUrl } from '@/lib/utils/resource-url'

describe('getResourceUrl', () => {
  it('generates SEO-friendly URL when city, state, and name present', () => {
    const url = getResourceUrl({
      id: '123',
      name: 'Oakland Job Center',
      city: 'Oakland',
      state: 'CA',
    })
    expect(url).toBe('/ca/oakland/oakland-job-center')
  })

  it('falls back to short URL when city is missing', () => {
    const url = getResourceUrl({
      id: '123',
      name: 'Test Resource',
      city: null,
      state: 'CA',
    })
    expect(url).toBe('/r/123')
  })

  it('falls back to short URL when state is missing', () => {
    const url = getResourceUrl({
      id: '123',
      name: 'Test Resource',
      city: 'Oakland',
      state: null,
    })
    expect(url).toBe('/r/123')
  })

  it('falls back to short URL when name is missing', () => {
    const url = getResourceUrl({
      id: '123',
      city: 'Oakland',
      state: 'CA',
    })
    expect(url).toBe('/r/123')
  })

  it('falls back to /resources when no id and no location', () => {
    const url = getResourceUrl({})
    expect(url).toBe('/resources')
  })

  it('handles resource with slug field', () => {
    const url = getResourceUrl({
      id: '123',
      name: 'Oakland Job Center',
      slug: 'oakland-job-center',
      city: 'Oakland',
      state: 'CA',
    })
    expect(url).toBe('/ca/oakland/oakland-job-center')
  })
})
