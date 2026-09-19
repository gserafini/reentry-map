import { act, fireEvent, screen } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { DistanceFilter } from '@/components/search/DistanceFilter'
import {
  render,
  getMockRouter,
  resetRouterMocks,
  setMockSearchParams,
  setMockPathname,
} from '@/__tests__/test-utils'
describe('distance reset', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetRouterMocks()
    setMockPathname('/search')
    setMockSearchParams({ distance: '20', search: 'housing' })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })
  it('cancels an outstanding slider update when reset is clicked', () => {
    render(<DistanceFilter hasLocation />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '60' } })
    fireEvent.click(screen.getByRole('button', { name: /reset distance/i }))
    act(() => vi.advanceTimersByTime(600))
    expect(getMockRouter().push).toHaveBeenCalledTimes(1)
    expect(getMockRouter().push).toHaveBeenCalledWith('/search?search=housing')
  })
  it('still resets the URL when browser storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    render(<DistanceFilter hasLocation />)
    fireEvent.click(screen.getByRole('button', { name: /reset distance/i }))
    expect(getMockRouter().push).toHaveBeenCalledWith('/search?search=housing')
  })
})
