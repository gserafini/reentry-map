import { describe, it, expect } from 'vitest'
import { publicSuggestionSchema } from '@/lib/validation/suggestion'
describe('public suggestion content schema', () => {
  it('accepts the current suggest-resource form payload including empty optional content', () => {
    // app/suggest-resource/page.tsx handleSubmit sends these exact fields; it has no hours input.
    const payload = {
      suggested_by: 'client-user',
      name: 'Community Help',
      description: null,
      category: 'housing',
      address: null,
      phone: null,
      website: null,
      reason: null,
    }
    const parsed = publicSuggestionSchema.parse(payload)
    expect(parsed).toEqual({
      name: 'Community Help',
      description: null,
      category: 'housing',
      address: null,
      phone: null,
      website: null,
      reason: null,
    })
  })
  it('retains supported location and content fields but strips server fields', () => {
    const parsed = publicSuggestionSchema.parse({
      name: ' Community help ',
      address_type: 'regional',
      service_area: { type: 'statewide', values: ['California'] },
      services_offered: ['housing'],
      hours: { Monday: '9-5' },
      status: 'approved',
      suggested_by: 'other',
      reviewed_at: 'now',
      research_task_id: 'fake',
    })
    expect(parsed).toEqual({
      name: 'Community help',
      address_type: 'regional',
      service_area: { type: 'statewide', values: ['California'] },
      services_offered: ['housing'],
      hours: { Monday: '9-5' },
    })
  })
  it('rejects invalid types, excessive text, coordinates and executable website schemes', () => {
    for (const extra of [
      { name: 123 },
      { description: 'x'.repeat(10001) },
      { latitude: 91 },
      { website: 'javascript:alert(1)' },
      { service_area: { type: 'invalid', values: [] } },
    ]) {
      expect(publicSuggestionSchema.safeParse({ name: 'Help', ...extra }).success).toBe(false)
    }
  })
})
