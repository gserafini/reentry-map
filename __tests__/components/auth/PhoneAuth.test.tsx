import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PhoneAuth } from '@/components/auth/PhoneAuth'

// Mock Next.js router
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock Supabase client
const mockSignInWithOtp = vi.fn()
const mockVerifyOtp = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
      verifyOtp: mockVerifyOtp,
    },
  }),
}))

describe('PhoneAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Phone Entry Step', () => {
    it('renders phone input form', () => {
      render(<PhoneAuth />)

      expect(screen.getByText('Sign In')).toBeInTheDocument()
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send verification code/i })).toBeInTheDocument()
    })

    it('formats phone number as user types', () => {
      render(<PhoneAuth />)

      const input = screen.getByLabelText(/phone number/i) as HTMLInputElement

      fireEvent.change(input, { target: { value: '5551234567' } })

      expect(input.value).toBe('(555) 123-4567')
    })

    it('limits phone number to 14 characters', () => {
      render(<PhoneAuth />)

      const input = screen.getByLabelText(/phone number/i) as HTMLInputElement

      fireEvent.change(input, { target: { value: '55512345678901234567' } })

      expect(input.value.length).toBeLessThanOrEqual(14)
    })

    it('sends OTP when form is submitted', async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null })

      render(<PhoneAuth />)

      const input = screen.getByLabelText(/phone number/i)
      const button = screen.getByRole('button', { name: /send verification code/i })

      fireEvent.change(input, { target: { value: '5551234567' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalledWith({
          phone: '+15551234567',
          options: {},
        })
      })
    })

    it('shows error for invalid phone number', async () => {
      render(<PhoneAuth />)

      const input = screen.getByLabelText(/phone number/i)
      const button = screen.getByRole('button', { name: /send verification code/i })

      // Enter invalid phone (too short)
      fireEvent.change(input, { target: { value: '555' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid 10-digit phone number/i)).toBeInTheDocument()
      })
    })

    it('shows error when OTP send fails', async () => {
      mockSignInWithOtp.mockResolvedValue({
        error: new Error('Unsupported phone provider'),
      })

      render(<PhoneAuth />)

      const input = screen.getByLabelText(/phone number/i)
      const button = screen.getByRole('button', { name: /send verification code/i })

      fireEvent.change(input, { target: { value: '5551234567' } })
      fireEvent.click(button)

      await waitFor(
        () => {
          expect(screen.getByText(/unsupported phone provider/i)).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })
  })

  describe('OTP Verification Step', () => {
    beforeEach(async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null })

      render(<PhoneAuth />)

      const input = screen.getByLabelText(/phone number/i)
      const button = screen.getByRole('button', { name: /send verification code/i })

      fireEvent.change(input, { target: { value: '5551234567' } })
      fireEvent.click(button)

      await waitFor(
        () => {
          expect(screen.getByText(/enter verification code/i)).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('renders OTP input form', () => {
      expect(screen.getByText(/enter verification code/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /verify and sign in/i })).toBeInTheDocument()
    })

    it('shows formatted phone number', () => {
      expect(screen.getByText(/\(555\) 123-4567/)).toBeInTheDocument()
    })

    it('limits OTP input to 6 digits', () => {
      const input = screen.getByLabelText(/verification code/i) as HTMLInputElement

      fireEvent.change(input, { target: { value: '12345678901234' } })

      expect(input.value).toBe('123456')
    })

    it('only allows numeric input', () => {
      const input = screen.getByLabelText(/verification code/i) as HTMLInputElement

      fireEvent.change(input, { target: { value: 'abc123def' } })

      expect(input.value).toBe('123')
    })

    it('verifies OTP when form is submitted', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null })

      const input = screen.getByLabelText(/verification code/i)
      const button = screen.getByRole('button', { name: /verify and sign in/i })

      fireEvent.change(input, { target: { value: '123456' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockVerifyOtp).toHaveBeenCalledWith({
          phone: '+15551234567',
          token: '123456',
          type: 'sms',
        })
      })
    })

    it('redirects after successful verification', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null })

      const input = screen.getByLabelText(/verification code/i)
      const button = screen.getByRole('button', { name: /verify and sign in/i })

      fireEvent.change(input, { target: { value: '123456' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })

    it('shows error for invalid OTP', async () => {
      const input = screen.getByLabelText(/verification code/i)
      const button = screen.getByRole('button', { name: /verify and sign in/i })

      // Enter invalid OTP (too short)
      fireEvent.change(input, { target: { value: '123' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/please enter the 6-digit verification code/i)).toBeInTheDocument()
      })
    })

    it('shows error when verification fails', async () => {
      mockVerifyOtp.mockResolvedValue({
        error: new Error('Invalid verification code'),
      })

      const input = screen.getByLabelText(/verification code/i)
      const button = screen.getByRole('button', { name: /verify and sign in/i })

      fireEvent.change(input, { target: { value: '123456' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/invalid verification code/i)).toBeInTheDocument()
      })
    })

    it('has resend button with cooldown', () => {
      const resendButton = screen.getByRole('button', { name: /resend in 60s/i })

      expect(resendButton).toBeDisabled()
    })

    it('enables resend button after cooldown', async () => {
      // Fast-forward 60 seconds
      vi.advanceTimersByTime(60000)

      await waitFor(() => {
        const resendButton = screen.getByRole('button', { name: /resend code/i })
        expect(resendButton).not.toBeDisabled()
      })
    })

    it('resends OTP when resend button is clicked', async () => {
      mockSignInWithOtp.mockClear()
      mockSignInWithOtp.mockResolvedValue({ error: null })

      // Fast-forward 60 seconds
      vi.advanceTimersByTime(60000)

      await waitFor(() => {
        const resendButton = screen.getByRole('button', { name: /resend code/i })
        expect(resendButton).not.toBeDisabled()
      })

      const resendButton = screen.getByRole('button', { name: /resend code/i })
      fireEvent.click(resendButton)

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalledWith({
          phone: '+15551234567',
        })
      })
    })

    it('goes back to phone entry when change number is clicked', async () => {
      const changeButton = screen.getByRole('button', { name: /change phone number/i })

      fireEvent.click(changeButton)

      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
      })
    })

    it('clears OTP input when going back', async () => {
      const input = screen.getByLabelText(/verification code/i) as HTMLInputElement
      fireEvent.change(input, { target: { value: '123456' } })

      const changeButton = screen.getByRole('button', { name: /change phone number/i })
      fireEvent.click(changeButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
      })

      // Go back to OTP step
      mockSignInWithOtp.mockResolvedValue({ error: null })
      const phoneInput = screen.getByLabelText(/phone number/i)
      const sendButton = screen.getByRole('button', { name: /send verification code/i })
      fireEvent.change(phoneInput, { target: { value: '5551234567' } })
      fireEvent.click(sendButton)

      await waitFor(() => {
        const otpInput = screen.getByLabelText(/verification code/i) as HTMLInputElement
        expect(otpInput.value).toBe('')
      })
    })
  })
})
