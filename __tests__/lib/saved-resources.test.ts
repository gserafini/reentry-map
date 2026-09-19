import { describe, expect, it } from 'vitest'
import { parseSavedResources, snapshotResource, supportListText } from '@/lib/utils/saved-resources'

describe('portable device saved resources', () => {
  it('keeps useful contacts and coverage, without inventing walk-in availability', () => {
    const saved = snapshotResource(
      'texas-resource',
      {
        name: '7More',
        address_type: 'regional',
        state: 'TX',
        city: 'Houston',
        service_area: { type: 'statewide', values: ['Texas'] },
        phone: '555-123-4567',
        website: 'https://example.org',
        appointment_required: false,
        verified_date: '2026-09-01',
        description: 'Case management',
      },
      '2026-09-19T03:00:00.000Z'
    )
    expect(saved.location).toBe('Serves all of Texas')
    expect(saved.intake).not.toMatch(/walk.in/i)
    expect(supportListText([saved])).toContain('555-123-4567')
    expect(supportListText([saved])).toContain('2026-09-01')
    expect(supportListText([saved])).toContain('Contact the organization')
  })
  it('treats a corrupt or wrong-version device cache as empty', () => {
    expect(parseSavedResources('not json')).toEqual([])
    expect(parseSavedResources('{"version":2,"resources":[]}')).toEqual([])
    expect(parseSavedResources('{"version":1,"resources":[{"id":"x"}]}')).toEqual([])
  })
  it('restores valid snapshots without exposing extra input fields', () => {
    const saved = snapshotResource('res-1', { name: 'Job Center', phone: '555-1234' })
    expect(parseSavedResources(JSON.stringify({ version: 1, resources: [saved] }))).toEqual([saved])
    expect(Object.keys(saved)).not.toContain('user_id')
  })
  it('rejects unsafe websites in contact snapshots', () => {
    expect(
      snapshotResource('res-1', { name: 'Help', website: 'javascript:alert(1)' }).website
    ).toBe('')
  })
})
