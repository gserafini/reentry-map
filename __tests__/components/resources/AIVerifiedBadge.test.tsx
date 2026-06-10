import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AIVerifiedBadge } from '@/components/resources/AIVerifiedBadge'

describe('AIVerifiedBadge', () => {
  it('renders the "AI Verified" label (not just "Verified")', () => {
    render(<AIVerifiedBadge />)
    expect(screen.getByText('AI Verified')).toBeInTheDocument()
  })

  it('hides the explanation until the badge is activated', () => {
    render(<AIVerifiedBadge />)
    expect(screen.queryByText(/automated verification/i)).not.toBeInTheDocument()
  })

  it('reveals an explanation of what "AI Verified" means when clicked', () => {
    render(<AIVerifiedBadge />)
    fireEvent.click(screen.getByText('AI Verified'))
    expect(screen.getByText(/automated verification/i)).toBeInTheDocument()
  })

  it('exposes an accessible affordance describing the badge', () => {
    render(<AIVerifiedBadge />)
    expect(screen.getByLabelText(/what .*AI Verified.* means/i)).toBeInTheDocument()
  })
})
