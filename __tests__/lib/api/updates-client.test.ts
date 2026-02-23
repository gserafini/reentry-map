import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  submitUpdate,
  getPendingUpdates,
  getUserUpdates,
  getResourceUpdates,
  updateUpdateStatus,
} from '@/lib/api/updates-client'

describe('updates-client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('submitUpdate', () => {
    it('sends POST request with update data', async () => {
      const mockResponse = { data: { id: 'update-1' }, error: null }
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      })

      const update = {
        resource_id: 'res-1',
        reported_by: 'user-1',
        update_type: 'incorrect_info',
        description: 'Wrong phone number',
      }

      const result = await submitUpdate(update as never)

      expect(global.fetch).toHaveBeenCalledWith('/api/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })
      expect(result).toEqual(mockResponse)
    })

    it('returns error on fetch exception', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await submitUpdate({ resource_id: 'res-1' } as never)

      expect(result).toEqual({ data: null, error: 'Failed to submit update' })
    })
  })

  describe('getPendingUpdates', () => {
    it('fetches pending updates', async () => {
      const mockData = { data: [{ id: 'update-1' }], error: null }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      })

      const result = await getPendingUpdates()

      expect(global.fetch).toHaveBeenCalledWith('/api/updates?type=pending')
      expect(result).toEqual(mockData)
    })

    it('returns error when API response is not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false })

      const result = await getPendingUpdates()

      expect(result).toEqual({ data: null, error: 'Failed to fetch pending updates' })
    })

    it('returns error on fetch exception', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await getPendingUpdates()

      expect(result).toEqual({ data: null, error: 'Failed to fetch pending updates' })
    })
  })

  describe('getUserUpdates', () => {
    it('fetches user updates', async () => {
      const mockData = { data: [{ id: 'update-1' }], error: null }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      })

      const result = await getUserUpdates()

      expect(global.fetch).toHaveBeenCalledWith('/api/updates?type=user')
      expect(result).toEqual(mockData)
    })

    it('returns error when API response is not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false })

      const result = await getUserUpdates()

      expect(result).toEqual({ data: null, error: 'Failed to fetch user updates' })
    })

    it('returns error on fetch exception', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await getUserUpdates()

      expect(result).toEqual({ data: null, error: 'Failed to fetch user updates' })
    })
  })

  describe('getResourceUpdates', () => {
    it('fetches updates for a specific resource', async () => {
      const mockData = { data: [{ id: 'update-1' }], error: null }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      })

      const result = await getResourceUpdates('res-1')

      expect(global.fetch).toHaveBeenCalledWith('/api/updates?resourceId=res-1')
      expect(result).toEqual(mockData)
    })

    it('URL-encodes the resource ID', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [], error: null }),
      })

      await getResourceUpdates('res with spaces')

      expect(global.fetch).toHaveBeenCalledWith('/api/updates?resourceId=res%20with%20spaces')
    })

    it('returns error when API response is not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false })

      const result = await getResourceUpdates('res-1')

      expect(result).toEqual({ data: null, error: 'Failed to fetch resource updates' })
    })

    it('returns error on fetch exception', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await getResourceUpdates('res-1')

      expect(result).toEqual({ data: null, error: 'Failed to fetch resource updates' })
    })
  })

  describe('updateUpdateStatus', () => {
    it('sends PUT request with status and notes', async () => {
      const mockResponse = { data: { id: 'update-1', status: 'applied' }, error: null }
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      })

      const result = await updateUpdateStatus('update-1', 'applied', 'Verified correct')

      expect(global.fetch).toHaveBeenCalledWith('/api/updates/update-1/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'applied', adminNotes: 'Verified correct' }),
      })
      expect(result).toEqual(mockResponse)
    })

    it('sends PUT without admin notes when not provided', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ data: null, error: null }),
      })

      await updateUpdateStatus('update-1', 'rejected')

      expect(global.fetch).toHaveBeenCalledWith('/api/updates/update-1/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', adminNotes: undefined }),
      })
    })

    it('returns error on fetch exception', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await updateUpdateStatus('update-1', 'applied')

      expect(result).toEqual({ data: null, error: 'Failed to update status' })
    })
  })
})
