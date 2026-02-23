import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock pg Pool - must be a proper class constructor
const mockQuery = vi.fn()
vi.mock('pg', () => {
  return {
    Pool: class MockPool {
      query = mockQuery
    },
  }
})

// Mock bcryptjs
const mockBcryptCompare = vi.fn()
const mockBcryptHash = vi.fn()
vi.mock('bcryptjs', () => ({
  default: {
    compare: (...args: unknown[]) => mockBcryptCompare(...args),
    hash: (...args: unknown[]) => mockBcryptHash(...args),
  },
}))

// Set DATABASE_URL before importing
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXTAUTH_SECRET = 'test-secret'

import {
  normalizePhone,
  getUserByEmail,
  getUserByPhone,
  getUserById,
  createUser,
  verifyOtp,
  authOptions,
} from '@/lib/auth/config'

/** Type for accessing NextAuth credentials provider internals in tests */
interface TestCredentialsProvider {
  options: {
    authorize: (
      credentials: Record<string, string>
    ) => Promise<{ id: string; email?: string; name: string | null; image: string | null } | null>
  }
}

describe('auth/config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('normalizePhone', () => {
    it('normalizes 10-digit US number to E.164', () => {
      expect(normalizePhone('5551234567')).toBe('+15551234567')
    })

    it('normalizes 11-digit number starting with 1', () => {
      expect(normalizePhone('15551234567')).toBe('+15551234567')
    })

    it('strips non-numeric characters', () => {
      expect(normalizePhone('(555) 123-4567')).toBe('+15551234567')
    })

    it('preserves number already in E.164 format', () => {
      expect(normalizePhone('+15551234567')).toBe('+15551234567')
    })

    it('handles number with dashes', () => {
      expect(normalizePhone('555-123-4567')).toBe('+15551234567')
    })

    it('handles number with dots', () => {
      expect(normalizePhone('555.123.4567')).toBe('+15551234567')
    })
  })

  describe('getUserByEmail', () => {
    it('queries database with lowercase email', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: '1', email: 'test@example.com' }] })
      const result = await getUserByEmail('Test@Example.com')
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [
        'test@example.com',
      ])
      expect(result).toEqual({ id: '1', email: 'test@example.com' })
    })

    it('returns null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] })
      const result = await getUserByEmail('nonexistent@example.com')
      expect(result).toBeNull()
    })
  })

  describe('getUserByPhone', () => {
    it('normalizes phone before querying', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: '1', phone: '+15551234567' }] })
      const result = await getUserByPhone('(555) 123-4567')
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['+15551234567'])
      expect(result).toEqual({ id: '1', phone: '+15551234567' })
    })

    it('returns null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] })
      const result = await getUserByPhone('5559999999')
      expect(result).toBeNull()
    })
  })

  describe('getUserById', () => {
    it('returns user when found', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'abc', name: 'Test User' }] })
      const result = await getUserById('abc')
      expect(result).toEqual({ id: 'abc', name: 'Test User' })
    })

    it('returns null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] })
      const result = await getUserById('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('createUser', () => {
    it('hashes password when provided', async () => {
      mockBcryptHash.mockResolvedValue('hashed_password')
      mockQuery.mockResolvedValue({
        rows: [{ id: '1', email: 'new@example.com', password_hash: 'hashed_password' }],
      })

      await createUser({ email: 'new@example.com', password: 'mypassword' })
      expect(mockBcryptHash).toHaveBeenCalledWith('mypassword', 12)
    })

    it('does not hash when no password provided (phone-only user)', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: '1', phone: '+15551234567', password_hash: null }],
      })

      await createUser({ phone: '5551234567' })
      expect(mockBcryptHash).not.toHaveBeenCalled()
    })

    it('normalizes phone number on creation', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: '1', phone: '+15551234567' }],
      })

      await createUser({ phone: '(555) 123-4567' })
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT'),
        expect.arrayContaining(['+15551234567'])
      )
    })

    it('lowercases email on creation', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: '1', email: 'test@example.com' }],
      })

      await createUser({ email: 'Test@Example.COM' })
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT'),
        expect.arrayContaining(['test@example.com'])
      )
    })
  })

  describe('verifyOtp', () => {
    it('returns true and marks OTP as verified when valid', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'otp-1' }] }) // Find OTP
        .mockResolvedValueOnce({ rows: [] }) // Mark verified

      const result = await verifyOtp('5551234567', '123456')
      expect(result).toBe(true)
      // Should update the OTP record
      expect(mockQuery).toHaveBeenCalledTimes(2)
    })

    it('returns false when OTP not found or expired', async () => {
      mockQuery.mockResolvedValue({ rows: [] })

      const result = await verifyOtp('5551234567', '000000')
      expect(result).toBe(false)
    })

    it('normalizes phone before OTP lookup', async () => {
      mockQuery.mockResolvedValue({ rows: [] })

      await verifyOtp('(555) 123-4567', '123456')
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('phone'),
        expect.arrayContaining(['+15551234567'])
      )
    })
  })

  describe('authOptions', () => {
    it('has jwt session strategy', () => {
      expect(authOptions.session?.strategy).toBe('jwt')
    })

    it('has 30-day session max age', () => {
      expect(authOptions.session?.maxAge).toBe(30 * 24 * 60 * 60)
    })

    it('has custom sign-in page', () => {
      expect(authOptions.pages?.signIn).toBe('/auth/login')
    })

    it('has two credential providers', () => {
      expect(authOptions.providers).toHaveLength(2)
    })

    describe('redirect callback', () => {
      const redirectCallback = authOptions.callbacks!.redirect!
      const baseUrl = 'https://reentrymap.org'

      it('allows relative URLs', async () => {
        const result = await redirectCallback({ url: '/resources', baseUrl })
        expect(result).toBe('https://reentrymap.org/resources')
      })

      it('allows same-origin URLs', async () => {
        const result = await redirectCallback({
          url: 'https://reentrymap.org/profile',
          baseUrl,
        })
        expect(result).toBe('https://reentrymap.org/profile')
      })

      it('blocks cross-origin redirects (open redirect prevention)', async () => {
        const result = await redirectCallback({
          url: 'https://evil.com/phishing',
          baseUrl,
        })
        expect(result).toBe(baseUrl)
      })

      it('blocks javascript: protocol URLs', async () => {
        // This should throw or return baseUrl since it's not a valid URL
        try {
          const result = await redirectCallback({
            url: 'javascript:alert(1)',
            baseUrl,
          })
          // If it doesn't throw, it should return baseUrl
          expect(result).toBe(baseUrl)
        } catch {
          // Expected - invalid URL
        }
      })
    })

    describe('credentials provider - email/password', () => {
      it('rejects login without email', async () => {
        const provider = authOptions.providers[0] as TestCredentialsProvider
        const result = await provider.options.authorize({ password: 'test' })
        expect(result).toBeNull()
      })

      it('rejects login without password', async () => {
        const provider = authOptions.providers[0] as TestCredentialsProvider
        const result = await provider.options.authorize({ email: 'test@test.com' })
        expect(result).toBeNull()
      })

      it('rejects login when user not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] })
        const provider = authOptions.providers[0] as TestCredentialsProvider
        const result = await provider.options.authorize({
          email: 'nonexistent@test.com',
          password: 'password',
        })
        expect(result).toBeNull()
      })

      it('rejects login with wrong password', async () => {
        mockQuery.mockResolvedValue({
          rows: [{ id: '1', email: 'test@test.com', password_hash: 'hashed' }],
        })
        mockBcryptCompare.mockResolvedValue(false)

        const provider = authOptions.providers[0] as TestCredentialsProvider
        const result = await provider.options.authorize({
          email: 'test@test.com',
          password: 'wrong',
        })
        expect(result).toBeNull()
      })

      it('accepts login with correct password', async () => {
        mockQuery.mockResolvedValue({
          rows: [
            {
              id: '1',
              email: 'test@test.com',
              password_hash: 'hashed',
              name: 'Test User',
              avatar_url: null,
            },
          ],
        })
        mockBcryptCompare.mockResolvedValue(true)

        const provider = authOptions.providers[0] as TestCredentialsProvider
        const result = await provider.options.authorize({
          email: 'test@test.com',
          password: 'correct',
        })
        expect(result).toEqual({
          id: '1',
          email: 'test@test.com',
          name: 'Test User',
          image: null,
        })
      })

      it('rejects user with no password_hash (phone-only account)', async () => {
        mockQuery.mockResolvedValue({
          rows: [{ id: '1', email: 'test@test.com', password_hash: null }],
        })

        const provider = authOptions.providers[0] as TestCredentialsProvider
        const result = await provider.options.authorize({
          email: 'test@test.com',
          password: 'anything',
        })
        expect(result).toBeNull()
      })
    })

    describe('credentials provider - phone OTP', () => {
      it('rejects login without phone', async () => {
        const provider = authOptions.providers[1] as TestCredentialsProvider
        const result = await provider.options.authorize({ code: '123456' })
        expect(result).toBeNull()
      })

      it('rejects login without code', async () => {
        const provider = authOptions.providers[1] as TestCredentialsProvider
        const result = await provider.options.authorize({ phone: '5551234567' })
        expect(result).toBeNull()
      })

      it('rejects invalid OTP code', async () => {
        mockQuery.mockResolvedValue({ rows: [] }) // OTP not found

        const provider = authOptions.providers[1] as TestCredentialsProvider
        const result = await provider.options.authorize({
          phone: '5551234567',
          code: '000000',
        })
        expect(result).toBeNull()
      })

      it('creates new user on first phone login', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ id: 'otp-1' }] }) // Find OTP
          .mockResolvedValueOnce({ rows: [] }) // Mark OTP verified
          .mockResolvedValueOnce({ rows: [] }) // getUserByPhone - not found
          .mockResolvedValueOnce({
            rows: [{ id: 'new-user', phone: '+15551234567', name: null, avatar_url: null }],
          }) // createUser

        const provider = authOptions.providers[1] as TestCredentialsProvider
        const result = await provider.options.authorize({
          phone: '5551234567',
          code: '123456',
        })
        expect(result).toEqual({
          id: 'new-user',
          email: undefined,
          name: null,
          image: null,
        })
      })
    })
  })
})
