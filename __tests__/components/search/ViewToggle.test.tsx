import {
  render,
  screen,
  waitFor,
  resetRouterMocks,
  setMockPathname,
  setMockSearchParams,
  getMockRouter,
} from '@/__tests__/test-utils'
import { userEvent } from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ViewToggle } from '@/components/search/ViewToggle'

describe('ViewToggle', () => {
  beforeEach(() => {
    resetRouterMocks()
    setMockPathname('/resources')
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Rendering', () => {
    it('renders both list and map buttons', () => {
      render(<ViewToggle />)

      expect(screen.getByLabelText('list view')).toBeInTheDocument()
      expect(screen.getByLabelText('map view')).toBeInTheDocument()
      expect(screen.getByText('List')).toBeInTheDocument()
      expect(screen.getByText('Map')).toBeInTheDocument()
    })

    it('renders with list selected by default', () => {
      render(<ViewToggle />)

      const listButton = screen.getByLabelText('list view')
      expect(listButton).toHaveClass('Mui-selected')
    })

    it('renders with custom default view', () => {
      render(<ViewToggle defaultView="map" />)

      const mapButton = screen.getByLabelText('map view')
      expect(mapButton).toHaveClass('Mui-selected')
    })
  })

  describe('User Interaction', () => {
    it('toggles to map view when map button clicked', async () => {
      const user = userEvent.setup()
      render(<ViewToggle />)

      const mapButton = screen.getByLabelText('map view')
      await user.click(mapButton)

      await waitFor(() => {
        expect(mapButton).toHaveClass('Mui-selected')
      })
    })

    it('toggles to list view when list button clicked', async () => {
      const user = userEvent.setup()
      setMockSearchParams({ view: 'map' })
      render(<ViewToggle />)

      const listButton = screen.getByLabelText('list view')
      await user.click(listButton)

      await waitFor(() => {
        expect(listButton).toHaveClass('Mui-selected')
      })
    })

    it('maintains exclusive selection (only one active)', async () => {
      const user = userEvent.setup()
      render(<ViewToggle />)

      const listButton = screen.getByLabelText('list view')
      const mapButton = screen.getByLabelText('map view')

      // List is selected by default
      expect(listButton).toHaveClass('Mui-selected')
      expect(mapButton).not.toHaveClass('Mui-selected')

      // Click map
      await user.click(mapButton)

      await waitFor(() => {
        expect(mapButton).toHaveClass('Mui-selected')
        expect(listButton).not.toHaveClass('Mui-selected')
      })

      // Click list
      await user.click(listButton)

      await waitFor(() => {
        expect(listButton).toHaveClass('Mui-selected')
        expect(mapButton).not.toHaveClass('Mui-selected')
      })
    })

    it('does not change when clicking the same button', async () => {
      const user = userEvent.setup()
      const onViewChange = vi.fn()
      render(<ViewToggle onViewChange={onViewChange} />)

      const listButton = screen.getByLabelText('list view')

      // Click list button (already selected)
      await user.click(listButton)

      // Should not trigger any changes
      expect(getMockRouter().push).not.toHaveBeenCalled()
      expect(onViewChange).not.toHaveBeenCalled()
    })
  })

  describe('URL Params', () => {
    it('updates URL when toggled to map', async () => {
      const user = userEvent.setup()
      render(<ViewToggle />)

      const mapButton = screen.getByLabelText('map view')
      await user.click(mapButton)

      await waitFor(() => {
        expect(getMockRouter().push).toHaveBeenCalledWith('/resources?view=map')
      })
    })

    it('updates URL when toggled to list', async () => {
      const user = userEvent.setup()
      setMockSearchParams({ view: 'map' })
      render(<ViewToggle defaultView="list" />)

      const listButton = screen.getByLabelText('list view')
      await user.click(listButton)

      await waitFor(() => {
        expect(getMockRouter().push).toHaveBeenCalledWith('/resources')
      })
    })

    it('removes view param when toggling to default view', async () => {
      const user = userEvent.setup()
      setMockSearchParams({ view: 'map' })
      render(<ViewToggle defaultView="list" />)

      const listButton = screen.getByLabelText('list view')
      await user.click(listButton)

      await waitFor(() => {
        const calledUrl = getMockRouter().push.mock.calls[0][0]
        expect(calledUrl).not.toContain('view')
      })
    })

    it('preserves other search params when toggling', async () => {
      const user = userEvent.setup()
      setMockSearchParams({ q: 'housing', category: 'housing', sort: 'name-asc' })

      render(<ViewToggle />)

      const mapButton = screen.getByLabelText('map view')
      await user.click(mapButton)

      await waitFor(() => {
        const calledUrl = getMockRouter().push.mock.calls[0][0]
        expect(calledUrl).toContain('q=housing')
        expect(calledUrl).toContain('category=housing')
        expect(calledUrl).toContain('sort=name-asc')
        expect(calledUrl).toContain('view=map')
      })
    })

    it('loads view from URL params', () => {
      setMockSearchParams({ view: 'map' })
      render(<ViewToggle defaultView="list" />)

      const mapButton = screen.getByLabelText('map view')
      expect(mapButton).toHaveClass('Mui-selected')
    })

    it('ignores invalid URL param values', () => {
      setMockSearchParams({ view: 'invalid' })
      render(<ViewToggle defaultView="list" />)

      const listButton = screen.getByLabelText('list view')
      expect(listButton).toHaveClass('Mui-selected')
    })
  })

  describe('localStorage', () => {
    it('saves to localStorage when toggled', async () => {
      const user = userEvent.setup()
      render(<ViewToggle />)

      const mapButton = screen.getByLabelText('map view')
      await user.click(mapButton)

      await waitFor(() => {
        expect(localStorage.getItem('preferredView')).toBe('map')
      })
    })

    it('loads from localStorage when no URL param', () => {
      localStorage.setItem('preferredView', 'map')
      render(<ViewToggle defaultView="list" />)

      const mapButton = screen.getByLabelText('map view')
      expect(mapButton).toHaveClass('Mui-selected')
    })

    it('prioritizes URL param over localStorage', () => {
      localStorage.setItem('preferredView', 'map')
      setMockSearchParams({ view: 'list' })

      render(<ViewToggle defaultView="list" />)

      const listButton = screen.getByLabelText('list view')
      expect(listButton).toHaveClass('Mui-selected')
    })

    it('updates localStorage when toggling views', async () => {
      const user = userEvent.setup()
      localStorage.setItem('preferredView', 'list')

      render(<ViewToggle />)

      const mapButton = screen.getByLabelText('map view')
      await user.click(mapButton)

      await waitFor(() => {
        expect(localStorage.getItem('preferredView')).toBe('map')
      })

      const listButton = screen.getByLabelText('list view')
      await user.click(listButton)

      await waitFor(() => {
        expect(localStorage.getItem('preferredView')).toBe('list')
      })
    })

    it('ignores invalid localStorage values', () => {
      localStorage.setItem('preferredView', 'invalid')
      render(<ViewToggle defaultView="list" />)

      const listButton = screen.getByLabelText('list view')
      expect(listButton).toHaveClass('Mui-selected')
    })
  })

  describe('Callback', () => {
    it('calls onViewChange callback when toggled', async () => {
      const user = userEvent.setup()
      const onViewChange = vi.fn()
      render(<ViewToggle onViewChange={onViewChange} />)

      const mapButton = screen.getByLabelText('map view')
      await user.click(mapButton)

      await waitFor(() => {
        expect(onViewChange).toHaveBeenCalledWith('map')
      })
    })

    it('calls callback with correct view when toggling multiple times', async () => {
      const user = userEvent.setup()
      const onViewChange = vi.fn()
      render(<ViewToggle onViewChange={onViewChange} />)

      const mapButton = screen.getByLabelText('map view')
      const listButton = screen.getByLabelText('list view')

      await user.click(mapButton)
      await waitFor(() => {
        expect(onViewChange).toHaveBeenCalledWith('map')
      })

      await user.click(listButton)
      await waitFor(() => {
        expect(onViewChange).toHaveBeenCalledWith('list')
      })

      expect(onViewChange).toHaveBeenCalledTimes(2)
    })

    it('does not call callback when clicking same button', async () => {
      const user = userEvent.setup()
      const onViewChange = vi.fn()
      render(<ViewToggle onViewChange={onViewChange} />)

      const listButton = screen.getByLabelText('list view')
      await user.click(listButton)

      expect(onViewChange).not.toHaveBeenCalled()
    })
  })

  describe('Priority Order', () => {
    it('follows priority: URL > localStorage > default', () => {
      // Test 1: URL param takes precedence over localStorage and default
      localStorage.setItem('preferredView', 'list')
      setMockSearchParams({ view: 'map' })
      const { unmount } = render(<ViewToggle defaultView="list" />)

      let mapButton = screen.getByLabelText('map view')
      expect(mapButton).toHaveClass('Mui-selected')

      // Test 2: localStorage takes precedence over default when no URL param
      unmount()
      resetRouterMocks()
      setMockPathname('/resources')
      localStorage.setItem('preferredView', 'map')
      render(<ViewToggle defaultView="list" />)

      mapButton = screen.getByLabelText('map view')
      expect(mapButton).toHaveClass('Mui-selected')
    })

    it('uses default when no URL param or localStorage', () => {
      render(<ViewToggle defaultView="map" />)

      const mapButton = screen.getByLabelText('map view')
      expect(mapButton).toHaveClass('Mui-selected')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<ViewToggle />)

      expect(screen.getByLabelText('view toggle')).toBeInTheDocument()
      expect(screen.getByLabelText('list view')).toBeInTheDocument()
      expect(screen.getByLabelText('map view')).toBeInTheDocument()
    })

    it('is keyboard navigable', async () => {
      const user = userEvent.setup()
      render(<ViewToggle />)

      const listButton = screen.getByLabelText('list view')
      const mapButton = screen.getByLabelText('map view')

      // Tab to list button
      await user.tab()
      expect(listButton).toHaveFocus()

      // Tab to map button
      await user.tab()
      expect(mapButton).toHaveFocus()

      // Press Enter to activate
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mapButton).toHaveClass('Mui-selected')
      })
    })
  })

  describe('Responsive Design', () => {
    it('renders with appropriate sizing', () => {
      render(<ViewToggle />)

      const toggleGroup = screen.getByLabelText('view toggle')
      expect(toggleGroup).toBeInTheDocument()

      // Verify buttons exist (actual size classes depend on viewport mock)
      expect(screen.getByLabelText('list view')).toBeInTheDocument()
      expect(screen.getByLabelText('map view')).toBeInTheDocument()
    })
  })

  describe('External URL Changes', () => {
    it('syncs state when URL params change externally', () => {
      setMockSearchParams({ view: 'list' })
      const { unmount } = render(<ViewToggle />)

      const listButton = screen.getByLabelText('list view')
      expect(listButton).toHaveClass('Mui-selected')

      // Simulate external URL change
      unmount()
      resetRouterMocks()
      setMockPathname('/resources')
      setMockSearchParams({ view: 'map' })
      render(<ViewToggle />)

      const mapButton = screen.getByLabelText('map view')
      expect(mapButton).toHaveClass('Mui-selected')
    })

    it('falls back to localStorage when URL param is removed externally', () => {
      localStorage.setItem('preferredView', 'map')
      setMockSearchParams({ view: 'list' })
      const { rerender } = render(<ViewToggle />)

      const listButton = screen.getByLabelText('list view')
      expect(listButton).toHaveClass('Mui-selected')

      // Simulate URL param removal
      resetRouterMocks()
      setMockPathname('/resources')
      rerender(<ViewToggle />)

      const mapButton = screen.getByLabelText('map view')
      expect(mapButton).toHaveClass('Mui-selected')
    })
  })
})
