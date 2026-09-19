import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AIVerifiedBadge } from '@/components/resources/AIVerifiedBadge'

describe('AIVerifiedBadge', () => {
  it('renders the "Automated check" label (not just "Verified")', () => {
    render(<AIVerifiedBadge />)
    expect(screen.getByText('Automated check')).toBeInTheDocument()
  })

  it('hides the explanation until the badge is activated', () => {
    render(<AIVerifiedBadge />)
    expect(screen.queryByText(/confirmation from the provider/i)).not.toBeInTheDocument()
  })

  it('reveals an explanation of what "Automated check" means when clicked', () => {
    render(<AIVerifiedBadge />)
    fireEvent.click(screen.getByText('Automated check'))
    expect(screen.getByText(/confirmation from the provider/i)).toBeInTheDocument()
  })

  it('exposes an accessible affordance describing the badge', () => {
    render(<AIVerifiedBadge />)
    expect(screen.getByLabelText(/About automated checks/i)).toBeInTheDocument()
  })
})
