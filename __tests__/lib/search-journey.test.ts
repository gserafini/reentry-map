import { describe, expect, it } from 'vitest'
import { interpretSearch, searchMatchRank } from '@/lib/utils/search-intent'
import { matchesServiceCoverage } from '@/lib/utils/service-coverage'

describe('everyday need search', () => {
  it.each(['jobs', 'job', 'employment', 'work', 'I need a job', 'employement'])(
    'maps %s to employment',
    (query) => {
      expect(interpretSearch(query).categories).toEqual(['employment'])
    }
  )
  it('maps housing phrases but preserves the housing service requested', () => {
    expect(interpretSearch('I need a place to sleep')).toMatchObject({ categories: ['housing'] })
    expect(interpretSearch('rental assistance')).toMatchObject({
      categories: ['housing'],
      terms: ['rental', 'assistance'],
    })
  })
  it('keeps organization names precise, including names containing need words', () => {
    expect(interpretSearch('Miles of Freedom').categories).toEqual([])
    expect(interpretSearch('Housing Works').categories).toEqual([])
    expect(searchMatchRank({ name: 'Miles of Freedom' }, 'Miles of Freedom')).toBeLessThan(
      searchMatchRank(
        { name: 'Another organization', description: 'Partner of Miles of Freedom' },
        'Miles of Freedom'
      )
    )
  })
  it('does not treat SQL wildcard text as a request for every service', () => {
    expect(interpretSearch('%_').query).toBe('%_')
  })
})
describe('coverage eligibility separate from an approximate anchor', () => {
  const dallas = {
    city: 'Dallas',
    state: 'TX',
    stateName: 'Texas',
    county: 'Dallas',
    countyFips: '48113',
  }
  it('matches 7More Texas anywhere in Texas, excluding Hawaii', () => {
    expect(
      matchesServiceCoverage(
        { state: 'TX', service_area: { type: 'statewide', values: ['Texas'] } },
        dallas
      )
    ).toBe(true)
    expect(
      matchesServiceCoverage(
        { state: 'HI', service_area: { type: 'statewide', values: ['Hawaii'] } },
        dallas
      )
    ).toBe(false)
  })
  it('honors explicit coverage rather than inferring from an organization office', () => {
    expect(
      matchesServiceCoverage(
        { state: 'HI', service_area: { type: 'statewide', values: ['Texas'] } },
        dallas
      )
    ).toBe(true)
    expect(
      matchesServiceCoverage(
        { state: 'TX', service_area: { type: 'statewide', values: ['Oklahoma'] } },
        dallas
      )
    ).toBe(false)
  })
  it('requires exact city/county eligibility, not a coincidental city in another state', () => {
    expect(
      matchesServiceCoverage(
        { state: 'TX', service_area: { type: 'city', values: ['Dallas'] } },
        dallas
      )
    ).toBe(true)
    expect(
      matchesServiceCoverage(
        { state: 'GA', service_area: { type: 'city', values: ['Dallas'] } },
        dallas
      )
    ).toBe(false)
    expect(
      matchesServiceCoverage(
        { state: 'TX', service_area: { type: 'county', values: ['Dallas County'] } },
        dallas
      )
    ).toBe(true)
    expect(
      matchesServiceCoverage(
        { state: 'TX', service_area: { type: 'county', values: ['Tarrant County'] } },
        dallas
      )
    ).toBe(false)
  })
  it('includes nationwide remote services and rejects unknown coverage', () => {
    expect(
      matchesServiceCoverage({ service_area: { type: 'nationwide', values: ['USA'] } }, dallas)
    ).toBe(true)
    expect(matchesServiceCoverage({ state: 'TX', service_area: null }, dallas)).toBe(false)
  })
})
