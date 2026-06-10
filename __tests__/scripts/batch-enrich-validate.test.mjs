import { describe, it, expect } from 'vitest'
import {
  emailInSource,
  sourceTimeTokens,
  hourTokensFromValue,
  groundHours,
  groundExtraction,
} from '../../scripts/lib/batch-enrich-validate.mjs'

describe('emailInSource', () => {
  it('accepts an email that literally appears in the page text', () => {
    const text = 'Contact us at info@clarkcountyfoodbank.org or call us.'
    expect(emailInSource('info@clarkcountyfoodbank.org', text)).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(emailInSource('Info@Example.ORG', 'reach info@example.org today')).toBe(true)
  })

  it('rejects a guessed email not present on the page (Sea Mar case)', () => {
    // Real Sea Mar pages use seamar.org; the model guessed info@seamarchc.org
    const text = 'Sea Mar Community Health Centers. Call 206-763-5277. www.seamar.org'
    expect(emailInSource('info@seamarchc.org', text)).toBe(false)
  })

  it('rejects empty/invalid input', () => {
    expect(emailInSource('', 'anything')).toBe(false)
    expect(emailInSource(null, 'anything')).toBe(false)
  })
})

describe('sourceTimeTokens / hourTokensFromValue', () => {
  it('extracts and canonicalizes times from page text', () => {
    const tokens = sourceTimeTokens('Open 9:00 AM - 5:00 PM and Fri 11 a.m. - 1 p.m.')
    expect(tokens.has('9am')).toBe(true)
    expect(tokens.has('5pm')).toBe(true)
    expect(tokens.has('11am')).toBe(true)
    expect(tokens.has('1pm')).toBe(true)
  })

  it('canonicalizes a single hours value', () => {
    expect(hourTokensFromValue('5:30 PM - 7:30 PM')).toEqual(['5:30pm', '7:30pm'])
    expect(hourTokensFromValue('9:00 AM - 5:00 PM')).toEqual(['9am', '5pm'])
  })
})

describe('groundHours', () => {
  it('keeps a day whose open and close times both appear on the page', () => {
    const page = 'Hours: Monday-Friday 9:00 AM - 5:00 PM'
    expect(groundHours({ Monday: '9:00 AM - 5:00 PM' }, page)).toEqual({
      Monday: '9:00 AM - 5:00 PM',
    })
  })

  it('drops the entire Olympia-style fabrication (wrong closes + invented Tuesday)', () => {
    // Real page: walk-in 5-7 p.m. Mon/Wed, 11 a.m.-1 p.m. Fri
    const page =
      'Walk-in visits 5-7 p.m. on Mondays and Wednesdays, or 11 a.m. - 1 p.m. on Fridays.'
    const fabricated = {
      Monday: '5:00 PM - 8:00 PM',
      Tuesday: '5:30 PM - 7:30 PM',
      Friday: '11:00 AM - 2:00 PM',
    }
    expect(groundHours(fabricated, page)).toBeNull()
  })

  it('returns null when the page contains no time tokens at all', () => {
    expect(groundHours({ Monday: '9:00 AM - 5:00 PM' }, 'We help the community.')).toBeNull()
  })

  it('keeps only the grounded days in a mixed object', () => {
    const page = 'Monday 9:00 AM - 5:00 PM. Tuesday 9:00 AM - 5:00 PM.'
    const mixed = {
      Monday: '9:00 AM - 5:00 PM', // grounded
      Friday: '8:00 AM - 8:00 PM', // not grounded
    }
    expect(groundHours(mixed, page)).toEqual({ Monday: '9:00 AM - 5:00 PM' })
  })
})

describe('groundExtraction', () => {
  it('strips an ungrounded email and ungrounded hours, noting rejections', () => {
    const page = 'Sea Mar. Call 206-763-5277.'
    const { extracted, rejected } = groundExtraction(
      {
        email: 'info@seamarchc.org',
        hours: { Monday: '8:00 AM - 5:00 PM' },
        description: 'A clinic',
      },
      page
    )
    expect(extracted.email).toBeUndefined()
    expect(extracted.hours).toBeUndefined()
    expect(extracted.description).toBe('A clinic') // descriptions pass through
    expect(rejected).toContain('email')
    expect(rejected).toContain('hours')
  })

  it('keeps grounded values', () => {
    const page = 'Email info@clarkcountyfoodbank.org. Hours Monday 9:00 AM - 4:00 PM'
    const { extracted, rejected } = groundExtraction(
      { email: 'info@clarkcountyfoodbank.org', hours: { Monday: '9:00 AM - 4:00 PM' } },
      page
    )
    expect(extracted.email).toBe('info@clarkcountyfoodbank.org')
    expect(extracted.hours).toEqual({ Monday: '9:00 AM - 4:00 PM' })
    expect(rejected).toHaveLength(0)
  })
})
