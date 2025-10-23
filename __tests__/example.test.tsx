import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Home from '@/app/page'

describe('Home Page', () => {
  it('renders the main element', () => {
    render(<Home />)
    const main = screen.getAllByRole('main')[0]
    expect(main).toBeInTheDocument()
  })

  it('displays the Next.js Supabase Starter heading', () => {
    render(<Home />)
    const heading = screen.getByText('Next.js Supabase Starter')
    expect(heading).toBeInTheDocument()
  })

  it('shows the footer with Supabase link', () => {
    render(<Home />)
    const supabaseLinks = screen.getAllByText('Supabase')
    expect(supabaseLinks.length).toBeGreaterThan(0)
    expect(supabaseLinks[0]).toBeInTheDocument()
    expect(supabaseLinks[0]).toHaveAttribute('href')
  })

  it('displays the Next steps heading', () => {
    render(<Home />)
    const nextSteps = screen.getByText('Next steps')
    expect(nextSteps).toBeInTheDocument()
  })
})
