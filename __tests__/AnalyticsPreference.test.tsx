import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/__tests__/test-utils'
import { AnalyticsPreference } from '@/components/layout/AnalyticsPreference'
const enable = vi.hoisted(() => vi.fn())
const disable = vi.hoisted(() => vi.fn())
vi.mock('@/lib/analytics/queue', () => ({
  analytics: { isTrackingEnabled: () => false },
  enableAnalytics: enable,
  disableAnalytics: disable,
}))
describe('usage privacy choice', () => {
  it('begins off and applies an explicit choice', () => {
    render(<AnalyticsPreference />)
    const control = screen.getByRole('switch', { name: 'Share usage statistics' })
    expect(control).not.toBeChecked()
    fireEvent.click(control)
    expect(enable).toHaveBeenCalledTimes(1)
    fireEvent.click(control)
    expect(disable).toHaveBeenCalledTimes(1)
  })
})
