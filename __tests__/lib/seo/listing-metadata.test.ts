import { describe, expect, it } from 'vitest'
import { buildListingCanonicalPath, buildListingMetadata } from '@/lib/seo/listing-metadata'

describe('buildListingMetadata', () => {
  it('keeps a curated landing page indexable and canonicalizes to its clean path', () => {
    expect(buildListingMetadata('/ca', {}, { curated: true })).toEqual({
      alternates: { canonical: 'https://reentrymap.org/ca' },
    })
  })

  it('keeps page two distinct and self-canonical while dropping page one and unknown keys', () => {
    expect(
      buildListingMetadata(
        '/ca/san-francisco',
        { page: '2', search: '  housing  ', utm_source: 'newsletter', admin: 'true' },
        { curated: true, appliedKeys: ['search'] }
      )
    ).toEqual({
      alternates: { canonical: 'https://reentrymap.org/ca/san-francisco?page=2&search=housing' },
      robots: { index: false, follow: true },
    })
  })

  it('keeps an unfiltered curated page indexable when only ignored query keys are present', () => {
    expect(
      buildListingMetadata('/category/housing', { utm_source: 'newsletter' }, { curated: true })
    ).toEqual({
      alternates: { canonical: 'https://reentrymap.org/category/housing' },
    })
  })

  it('ignores distance sorting when the server has no coordinate location to sort by', () => {
    expect(
      buildListingMetadata(
        '/ca/san-francisco',
        { sort: 'distance-asc' },
        { curated: true, appliedKeys: ['sort'] }
      )
    ).toEqual({
      alternates: { canonical: 'https://reentrymap.org/ca/san-francisco' },
    })
  })

  it('canonicalizes categories using the exact parser behavior used by resource queries', () => {
    expect(
      buildListingMetadata(
        '/resources',
        { categories: 'housing, employment' },
        { curated: false, appliedKeys: ['categories'] }
      )
    ).toEqual({
      alternates: { canonical: 'https://reentrymap.org/resources?categories=housing' },
      robots: { index: false, follow: true },
    })
  })

  it('canonicalizes only the first twenty tags accepted by the resource query parser', () => {
    const tags = Array.from({ length: 21 }, (_, index) => `tag-${String(index).padStart(2, '0')}`)
    const canonicalTags = tags.slice(0, 20).sort().join(',')

    expect(
      buildListingMetadata(
        '/resources',
        { tags: tags.join(',') },
        {
          curated: false,
          appliedKeys: ['tags'],
        }
      )
    ).toEqual({
      alternates: {
        canonical: `https://reentrymap.org/resources?tags=${encodeURIComponent(canonicalTags)}`,
      },
      robots: { index: false, follow: true },
    })
  })

  it('preserves the exact coordinate and viewport precision used by result queries', () => {
    expect(
      buildListingMetadata(
        '/resources',
        { lat: '38.5000001', lng: '-121.4000009', distance: '12.5' },
        { curated: false, appliedKeys: ['lat', 'lng', 'distance'] }
      ).alternates?.canonical
    ).toBe('https://reentrymap.org/resources?distance=12.5&lat=38.5000001&lng=-121.4000009')

    expect(
      buildListingMetadata(
        '/resources',
        { north: '38.1234567', south: '37.1234567', east: '-121.1234567', west: '-122.1234567' },
        { curated: false, appliedKeys: ['north', 'south', 'east', 'west'] }
      ).alternates?.canonical
    ).toBe(
      'https://reentrymap.org/resources?east=-121.1234567&north=38.1234567&south=37.1234567&west=-122.1234567'
    )
  })

  it('returns the applied canonical pathname and query for page structured data', () => {
    expect(
      buildListingCanonicalPath(
        '/ca/san-francisco',
        { page: '2', categories: 'housing', utm_source: 'newsletter' },
        { curated: true, appliedKeys: ['categories'] }
      )
    ).toBe('/ca/san-francisco?categories=housing&page=2')
  })

  it('keeps the generic resources directory noindex while self-canonicalizing its clean URL', () => {
    expect(buildListingMetadata('/resources', {}, { curated: false })).toEqual({
      alternates: { canonical: 'https://reentrymap.org/resources' },
      robots: { index: false, follow: true },
    })
  })

  it('marks applied filters noindex, follow and self-canonical with normalized allowed values', () => {
    expect(
      buildListingMetadata(
        '/resources',
        {
          categories: 'housing,employment,housing,invalid',
          tags: ' reentry, housing, reentry ',
          sort: 'rating-desc',
          page: '1',
          lat: '38.5000000',
          lng: '-121.4000000',
          distance: '25',
          bogus: 'leak',
        },
        {
          curated: false,
          appliedKeys: ['categories', 'tags', 'sort', 'lat', 'lng', 'distance'],
        }
      )
    ).toEqual({
      alternates: {
        canonical:
          'https://reentrymap.org/resources?categories=employment%2Chousing&distance=25&lat=38.5&lng=-121.4&sort=rating-desc&tags=housing%2Creentry',
      },
      robots: { index: false, follow: true },
    })
  })
})
