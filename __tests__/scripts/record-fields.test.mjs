// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  findRecordMentions,
  groundQuote,
  buildRestrictionText,
  decideRecordUpdates,
} from '../../scripts/lib/record-fields.mjs'

const page = `Welcome to Hope House. We serve men leaving prison and jail.
Eligibility: Applicants must be 18 or older. We are unable to accept registered sex offenders
or anyone with an arson conviction. All staff and volunteers must pass a background check.
Donations are accepted Monday through Friday.`

describe('record fields backfill rules (B085)', () => {
  it('finds record-related passages and ignores pages that never mention records', () => {
    const windows = findRecordMentions(page)
    expect(windows.length).toBeGreaterThan(0)
    expect(windows.join(' ')).toContain('registered sex offenders')
    expect(findRecordMentions('Food pantry open Tuesdays. Bring a bag.')).toEqual([])
    // Common non-criminal uses of "records" and "registered" are not record-related passages.
    expect(
      findRecordMentions(
        'Request your medical records. Our registered nurses offer event registration.'
      )
    ).toEqual([])
  })

  it('accepts only verbatim quotes that appear in the fetched page', () => {
    expect(
      groundQuote(
        'We are unable to accept registered sex offenders or anyone with an arson conviction.',
        page
      )
    ).toBe(true)
    // Whitespace and line breaks in the page do not matter; wording does.
    expect(groundQuote('unable to accept   registered sex offenders', page)).toBe(true)
    expect(groundQuote('We do not accept anyone with a felony.', page)).toBe(false)
    expect(groundQuote('sex', page)).toBe(false) // too short to be evidence
  })

  it('shows restrictions as the provider’s own words', () => {
    expect(
      buildRestrictionText(['No registered sex offenders.', 'No registered sex offenders.'])
    ).toBe('The provider’s website says: “No registered sex offenders.”')
    expect(buildRestrictionText([])).toBeNull()
  })

  it('fills only empty fields, never sets the label false, and never writes held listings', () => {
    const verified = { restrictions: ['No registered sex offenders.'], reentryFocused: true }
    expect(
      decideRecordUpdates(
        { record_restrictions: null, reentry_focused: false, provenance: {} },
        verified
      )
    ).toEqual({
      recordRestrictions: 'The provider’s website says: “No registered sex offenders.”',
      reentryFocused: true,
    })
    expect(
      decideRecordUpdates(
        { record_restrictions: 'Reviewed text', reentry_focused: true, provenance: {} },
        verified
      )
    ).toEqual({})
    expect(
      decideRecordUpdates(
        { record_restrictions: null, reentry_focused: false, provenance: {} },
        { restrictions: [], reentryFocused: false }
      )
    ).toEqual({})
    expect(
      decideRecordUpdates(
        {
          record_restrictions: null,
          reentry_focused: false,
          provenance: { coverage_review: { automation_hold: true } },
        },
        verified
      )
    ).toBeNull()
  })
})
