import { describe, it, expect } from 'vitest'
import { setMockSearchParams, getMockRouter } from './test-utils'

describe('test-utils', () => {
  it('setMockSearchParams accepts URLSearchParams instance', () => {
    const params = new URLSearchParams('foo=bar&baz=qux')
    setMockSearchParams(params)
    const router = getMockRouter()
    expect(router.searchParams).toBe(params)
  })

  it('setMockSearchParams accepts Record<string, string>', () => {
    setMockSearchParams({ foo: 'bar' })
    const router = getMockRouter()
    expect(router.searchParams.get('foo')).toBe('bar')
  })
})
