import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock useAuth hook
const mockUseAuth = vi.fn()
vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}))

// Mock submitUpdate
const mockSubmitUpdate = vi.fn()
vi.mock('@/lib/api/updates-client', () => ({
  submitUpdate: (...args: unknown[]) => mockSubmitUpdate(...args),
}))

import { ReportProblemModal } from '@/components/user/ReportProblemModal'

describe('ReportProblemModal', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    resourceId: 'res-1',
    resourceName: 'Oakland Job Center',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })
    mockSubmitUpdate.mockResolvedValue({ error: null })
  })

  it('renders dialog when open', () => {
    render(<ReportProblemModal {...defaultProps} />)
    expect(screen.getByText('Report a Problem')).toBeInTheDocument()
  })

  it('does not render content when closed', () => {
    render(<ReportProblemModal {...defaultProps} open={false} />)
    expect(screen.queryByText('Report a Problem')).not.toBeInTheDocument()
  })

  it('shows sign-in prompt for unauthenticated users', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })

    render(<ReportProblemModal {...defaultProps} />)
    expect(screen.getByText(/sign in to report/i)).toBeInTheDocument()
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('redirects to login when sign in clicked (unauthenticated)', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })

    render(<ReportProblemModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Sign In'))
    expect(mockPush).toHaveBeenCalledWith('/auth/login')
  })

  it('shows cancel button for unauthenticated users', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })

    render(<ReportProblemModal {...defaultProps} />)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('shows resource name in info alert for authenticated users', () => {
    render(<ReportProblemModal {...defaultProps} />)
    expect(screen.getByText('Oakland Job Center')).toBeInTheDocument()
  })

  it('renders description and suggested correction fields', () => {
    render(<ReportProblemModal {...defaultProps} />)
    // MUI TextFields render with label text (may appear multiple times due to label + legend)
    expect(screen.getAllByText('Description').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Suggested Correction (Optional)').length).toBeGreaterThan(0)
  })

  it('renders submit and cancel buttons', () => {
    render(<ReportProblemModal {...defaultProps} />)
    expect(screen.getByText('Submit Report')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('renders close icon button', () => {
    render(<ReportProblemModal {...defaultProps} />)
    expect(screen.getByLabelText('close')).toBeInTheDocument()
  })

  it('calls onClose when cancel button clicked', () => {
    render(<ReportProblemModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('calls onClose when close icon clicked', () => {
    render(<ReportProblemModal {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('close'))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('shows issue type select', () => {
    render(<ReportProblemModal {...defaultProps} />)
    expect(screen.getByText('Issue Type')).toBeInTheDocument()
  })

  it('shows helper text for description field', () => {
    render(<ReportProblemModal {...defaultProps} />)
    expect(screen.getByText('Please describe the issue in detail')).toBeInTheDocument()
  })

  it('shows helper text for suggested correction field', () => {
    render(<ReportProblemModal {...defaultProps} />)
    expect(
      screen.getByText('If you know the correct information, please share it here')
    ).toBeInTheDocument()
  })
})
