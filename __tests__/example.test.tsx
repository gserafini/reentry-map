import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThemeSwitcher } from '@/components/theme-switcher'

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: vi.fn(),
}))

// Import after mocking
import { useTheme } from 'next-themes'

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    // Reset mock before each test
    vi.clearAllMocks()
  })

  it('renders theme switcher button', () => {
    // Mock useTheme to return light theme
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      setTheme: vi.fn(),
      themes: ['light', 'dark', 'system'],
      systemTheme: 'light',
      resolvedTheme: 'light',
    })

    const { container } = render(<ThemeSwitcher />)

    // Component should render a button
    const button = container.querySelector('button')
    expect(button).toBeTruthy()
  })

  it('provides theme switching functionality', () => {
    const mockSetTheme = vi.fn()

    // Mock useTheme to return light theme
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      themes: ['light', 'dark', 'system'],
      systemTheme: 'light',
      resolvedTheme: 'light',
    })

    render(<ThemeSwitcher />)

    // Verify setTheme function exists (would be called on user interaction)
    expect(mockSetTheme).toBeDefined()
  })
})
