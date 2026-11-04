import { describe, expect, it } from 'vitest'
import { safeRelativeRedirect } from '@/lib/utils/safe-redirect'

describe('safeRelativeRedirect', () => {
  it.each(['/profile', '/resources?category=food', '/path#section'])('accepts %s', (value) => {
    expect(safeRelativeRedirect(value)).toBe(value)
  })

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    'relative',
    '/\r\nLocation: https://evil.example',
  ])('rejects unsafe redirect %s', (value) => {
    expect(safeRelativeRedirect(value)).toBe('/')
  })
})
