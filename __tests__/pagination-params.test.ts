import { describe, expect, it } from 'vitest'
import { parsePageNumber } from '@/lib/utils/pagination'
describe('page number parsing', () => {
  it.each([undefined, '', 'Infinity', '-Infinity', 'NaN', '-1', '0', '1e999'])(
    'uses page one for invalid input %s',
    (value) => {
      expect(parsePageNumber(value)).toBe(1)
    }
  )
  it('accepts positive pages and bounds excessive offsets', () => {
    expect(parsePageNumber('12')).toBe(12)
    expect(parsePageNumber('2.9')).toBe(2)
    expect(parsePageNumber('99999999999')).toBe(10000)
  })
})
