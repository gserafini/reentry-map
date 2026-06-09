import { describe, it, expect } from 'vitest'
import { coerceUpdateValue } from '../../scripts/cli/field-coerce.mjs'

describe('coerceUpdateValue', () => {
  it('splits comma-separated array fields into arrays', () => {
    expect(coerceUpdateValue('categories', 'food,clothing,general-support')).toEqual([
      'food',
      'clothing',
      'general-support',
    ])
  })

  it('trims whitespace around comma-separated values', () => {
    expect(coerceUpdateValue('categories', 'food, clothing ,  general-support')).toEqual([
      'food',
      'clothing',
      'general-support',
    ])
  })

  it('parses a JSON array for array fields', () => {
    expect(coerceUpdateValue('services_offered', '["Job training","Resume help"]')).toEqual([
      'Job training',
      'Resume help',
    ])
  })

  it('returns an empty array for an empty string array field', () => {
    expect(coerceUpdateValue('languages', '')).toEqual([])
  })

  it('drops empty segments in comma-separated arrays', () => {
    expect(coerceUpdateValue('categories', 'food,,clothing,')).toEqual(['food', 'clothing'])
  })

  it('parses JSON object fields', () => {
    expect(coerceUpdateValue('hours', '{"monday":"9:00 AM - 5:00 PM"}')).toEqual({
      monday: '9:00 AM - 5:00 PM',
    })
  })

  it('coerces numeric fields to numbers', () => {
    expect(coerceUpdateValue('latitude', '38.2527')).toBe(38.2527)
    expect(coerceUpdateValue('longitude', '-85.7585')).toBe(-85.7585)
  })

  it('coerces boolean fields', () => {
    expect(coerceUpdateValue('verified', 'true')).toBe(true)
    expect(coerceUpdateValue('verified', 'false')).toBe(false)
  })

  it('passes through plain string fields unchanged', () => {
    expect(coerceUpdateValue('phone', '555-1234')).toBe('555-1234')
    expect(coerceUpdateValue('primary_category', 'housing')).toBe('housing')
  })

  it('throws a clear error on invalid numeric input', () => {
    expect(() => coerceUpdateValue('latitude', 'not-a-number')).toThrow()
  })
})
