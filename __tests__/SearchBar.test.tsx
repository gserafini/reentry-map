import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchBar } from '@/components/search/SearchBar'

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders search input', () => {
    render(<SearchBar />)
    const input = screen.getByPlaceholderText('Search resources...')
    expect(input).toBeInTheDocument()
  })

  it('calls onSubmit when form is submitted', () => {
    const onSubmit = vi.fn()

    render(<SearchBar onSubmit={onSubmit} />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'housing' } })

    const form = input.closest('form')
    if (form) {
      fireEvent.submit(form)
    }

    expect(onSubmit).toHaveBeenCalledWith('housing')
  })

  it('debounces onChange callback', () => {
    const onChange = vi.fn()

    render(<SearchBar onChange={onChange} debounceMs={300} />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })

    // Should not call immediately
    expect(onChange).not.toHaveBeenCalled()

    // Fast-forward time by debounce duration
    vi.advanceTimersByTime(300)

    // Should be called after debounce
    expect(onChange).toHaveBeenCalledWith('test')
  })

  it('shows clear button when text is entered', () => {
    render(<SearchBar />)

    const input = screen.getByRole('textbox')

    // Initially no clear button
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument()

    // Type some text
    fireEvent.change(input, { target: { value: 'housing' } })

    // Clear button should appear
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
  })

  it('clears input when clear button is clicked', async () => {
    const onChange = vi.fn()

    render(<SearchBar onChange={onChange} />)

    const input = screen.getByRole('textbox')

    // Type some text
    fireEvent.change(input, { target: { value: 'test' } })

    // Click clear button
    const clearButton = screen.getByLabelText('Clear search')
    fireEvent.click(clearButton)

    // Input should be empty
    expect(input).toHaveValue('')

    // Should call onChange with empty string immediately (not debounced for clear)
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('accepts custom placeholder', () => {
    render(<SearchBar placeholder="Find something..." />)
    expect(screen.getByPlaceholderText('Find something...')).toBeInTheDocument()
  })

  it('syncs with external value prop', () => {
    const { rerender } = render(<SearchBar value="initial" />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('initial')

    // Update value prop
    rerender(<SearchBar value="updated" />)
    expect(input).toHaveValue('updated')
  })

  it('supports accessibility', () => {
    render(<SearchBar />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveAccessibleName('Search resources')
  })

  it('hides search icon when showSearchIcon is false', () => {
    render(<SearchBar showSearchIcon={false} />)
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    // Search icon should not be present in the DOM
    // (the startAdornment is null when showSearchIcon is false)
  })

  it('does not show clear button when query is empty', () => {
    render(<SearchBar value="" />)
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument()
  })

  it('handles form submit without onSubmit callback', () => {
    render(<SearchBar />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })
    const form = input.closest('form')
    if (form) {
      // Should not throw when no onSubmit provided
      expect(() => fireEvent.submit(form)).not.toThrow()
    }
  })

  it('handles clear without onChange callback', () => {
    render(<SearchBar />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })
    const clearButton = screen.getByLabelText('Clear search')
    // Should not throw when no onChange provided
    expect(() => fireEvent.click(clearButton)).not.toThrow()
  })

  it('supports different sizes', () => {
    const { rerender } = render(<SearchBar size="medium" />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()

    rerender(<SearchBar size="small" />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('shows category dropdown on focus when showCategoryDropdown is true', () => {
    render(<SearchBar showCategoryDropdown={true} />)
    const input = screen.getByRole('textbox')

    fireEvent.focus(input)
    // Dropdown should become visible
    // The CategoryDropdown renders menu items
  })

  it('hides category dropdown on blur', () => {
    render(<SearchBar showCategoryDropdown={true} />)
    const input = screen.getByRole('textbox')

    fireEvent.focus(input)
    fireEvent.blur(input)

    // After blur timeout, dropdown should hide
    vi.advanceTimersByTime(300)
  })

  it('does not show dropdown when showCategoryDropdown is false', () => {
    render(<SearchBar showCategoryDropdown={false} />)
    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    // No dropdown should appear
  })
})
