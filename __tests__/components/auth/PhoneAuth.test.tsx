import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

// Mock NextAuth signIn (used for OTP verification)
const mockSignIn = vi.fn()
vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}))

// Mock global fetch (used for /api/auth/otp/send)
const mockFetch = vi.fn()

describe('PhoneAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = mockFetch
  })

  describe('Phone Entry Step', () => {
    it('renders phone input form', () => {
      render(<PhoneAuth />)

      expect(screen.getByText('Log In')).toBeInTheDocument()
      expect(screen.getByLabelText(/log in with my mobile phone/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send verification code/i })).toBeInTheDocument()
    })

    it('formats phone number as user types', async () => {
      const user = userEvent.setup()
      render(<PhoneAuth />)

      const input = screen.getByLabelText(/log in with my mobile phone/i) as HTMLInputElement

      await user.type(input, '5551234567')

      expect(input.value).toBe('(555) 123-4567')
    })

    it('limits phone number to 14 characters', async () => {
      const user = userEvent.setup()
      render(<PhoneAuth />)

      const input = screen.getByLabelText(/log in with my mobile phone/i) as HTMLInputElement

      await user.type(input, '55512345678901234567')

      expect(input.value.length).toBeLessThanOrEqual(14)
    })

    it('sends OTP when form is submitted', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })

      render(<PhoneAuth />)

      const input = screen.getByLabelText(/log in with my mobile phone/i)
      const button = screen.getByRole('button', { name: /send verification code/i })

      await user.type(input, '5551234567')
      await user.click(button)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: '+15551234567' }),
        })
      })
    })

    it('shows error for invalid phone number', async () => {
      const user = userEvent.setup()
      render(<PhoneAuth />)

      const input = screen.getByLabelText(/log in with my mobile phone/i)
      const button = screen.getByRole('button', { name: /send verification code/i })

      // Enter invalid phone (too short)
      await user.type(input, '555')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid 10-digit phone number/i)).toBeInTheDocument()
      })
    })

    it('shows error when OTP send fails', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Unsupported phone provider' }),
      })

      render(<PhoneAuth />)

      const input = screen.getByLabelText(/log in with my mobile phone/i)
      const button = screen.getByRole('button', { name: /send verification code/i })

      await user.type(input, '5551234567')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText(/unsupported phone provider/i)).toBeInTheDocument()
      })
    })
  })

  describe('OTP Verification Step', () => {
    // Helper function to get to OTP step
    async function navigateToOtpStep() {
      const user = userEvent.setup()
      // Mock successful OTP send via fetch
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )

      render(<PhoneAuth />)

      const input = screen.getByLabelText(/log in with my mobile phone/i)
      const button = screen.getByRole('button', { name: /send verification code/i })

      // Use paste for faster input than type (but proper event triggering unlike fireEvent)
      await user.click(input)
      await user.paste('5551234567')
      await user.click(button)

      await waitFor(
        () => {
          expect(screen.getByText(/enter verification code/i)).toBeInTheDocument()
        },
        { timeout: 15000 }
      )

      return user
    }

    it('renders OTP input form', async () => {
      await navigateToOtpStep()

      expect(screen.getByText(/enter verification code/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /verify and log in/i })).toBeInTheDocument()
    }, 15000)

    it('shows formatted phone number', async () => {
      await navigateToOtpStep()

      expect(screen.getByText(/\(555\) 123-4567/)).toBeInTheDocument()
    }, 15000)

    it('limits OTP input to 6 digits', async () => {
      const user = await navigateToOtpStep()

      const input = screen.getByLabelText(/verification code/i) as HTMLInputElement

      await user.type(input, '12345678901234')

      expect(input.value).toBe('123456')
    }, 15000)

    it('only allows numeric input', async () => {
      const user = await navigateToOtpStep()

      const input = screen.getByLabelText(/verification code/i) as HTMLInputElement

      await user.type(input, 'abc123def')

      expect(input.value).toBe('123')
    }, 15000)

    it('verifies OTP when form is submitted', async () => {
      const user = await navigateToOtpStep()
      mockSignIn.mockResolvedValue({ error: null })

      const input = screen.getByLabelText(/verification code/i)
      const button = screen.getByRole('button', { name: /verify and log in/i })

      await user.click(input)
      await user.paste('123456')
      await user.click(button)

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('phone-otp', {
          phone: '+15551234567',
          code: '123456',
          redirect: false,
        })
      })
    }, 15000)

    it('redirects after successful verification', async () => {
      const user = await navigateToOtpStep()
      mockSignIn.mockResolvedValue({ error: null })

      const input = screen.getByLabelText(/verification code/i)
      const button = screen.getByRole('button', { name: /verify and log in/i })

      await user.click(input)
      await user.paste('123456')
      await user.click(button)

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    }, 15000)

    it('shows error for invalid OTP', async () => {
      const user = await navigateToOtpStep()

      const input = screen.getByLabelText(/verification code/i)
      const button = screen.getByRole('button', { name: /verify and log in/i })

      // Enter invalid OTP (too short)
      await user.type(input, '123')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText(/please enter the 6-digit verification code/i)).toBeInTheDocument()
      })
    }, 15000)

    it('shows error when verification fails', async () => {
      const user = await navigateToOtpStep()
      mockSignIn.mockResolvedValue({
        error: 'CredentialsSignin',
      })

      const input = screen.getByLabelText(/verification code/i)
      const button = screen.getByRole('button', { name: /verify and log in/i })

      await user.click(input)
      await user.paste('123456')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText(/invalid verification code/i)).toBeInTheDocument()
      })
    }, 15000)

    it('has resend button with cooldown', async () => {
      await navigateToOtpStep()

      const resendButton = screen.getByRole('button', { name: /resend in 60s/i })

      expect(resendButton).toBeDisabled()
    }, 15000)

    it.skip('enables resend button after cooldown', async () => {
      await navigateToOtpStep()

      // Enable fake timers AFTER navigation completes
      vi.useFakeTimers()

      // Fast-forward 60 seconds
      vi.advanceTimersByTime(60000)

      await waitFor(() => {
        const resendButton = screen.getByRole('button', { name: /resend code/i })
        expect(resendButton).not.toBeDisabled()
      })

      vi.useRealTimers()
    }, 30000)

    it.skip('resends OTP when resend button is clicked', async () => {
      const user = await navigateToOtpStep()

      mockFetch.mockClear()
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })

      // Enable fake timers AFTER navigation completes
      vi.useFakeTimers()

      // Fast-forward 60 seconds
      vi.advanceTimersByTime(60000)

      await waitFor(() => {
        const resendButton = screen.getByRole('button', { name: /resend code/i })
        expect(resendButton).not.toBeDisabled()
      })

      const resendButton = screen.getByRole('button', { name: /resend code/i })
      await user.click(resendButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: '+15551234567' }),
        })
      })

      vi.useRealTimers()
    }, 30000)

    it.skip('goes back to phone entry when change number is clicked', async () => {
      await navigateToOtpStep()

      const changeButton = screen.getByRole('button', { name: /change phone number/i })

      // Use fireEvent for faster interaction (not testing click behavior)
      fireEvent.click(changeButton)

      await waitFor(
        () => {
          expect(screen.getByText('Log In')).toBeInTheDocument()
          expect(screen.getByLabelText(/log in with my mobile phone/i)).toBeInTheDocument()
        },
        { timeout: 10000 }
      )
    }, 30000)

    it.skip('clears OTP input when going back', async () => {
      await navigateToOtpStep()

      const input = screen.getByLabelText(/verification code/i) as HTMLInputElement
      // Use fireEvent for faster setup
      fireEvent.change(input, { target: { value: '123456' } })

      const changeButton = screen.getByRole('button', { name: /change phone number/i })
      fireEvent.click(changeButton)

      await waitFor(
        () => {
          expect(screen.getByLabelText(/log in with my mobile phone/i)).toBeInTheDocument()
        },
        { timeout: 10000 }
      )

      // Go back to OTP step
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })
      const phoneInput = screen.getByLabelText(/log in with my mobile phone/i)
      const sendButton = screen.getByRole('button', { name: /send verification code/i })
      fireEvent.change(phoneInput, { target: { value: '5551234567' } })
      fireEvent.click(sendButton)

      await waitFor(
        () => {
          const otpInput = screen.getByLabelText(/verification code/i) as HTMLInputElement
          expect(otpInput.value).toBe('')
        },
        { timeout: 10000 }
      )
    }, 30000)
  })
})
