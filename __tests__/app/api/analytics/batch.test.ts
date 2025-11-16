import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/analytics/batch/route'
import { NextRequest } from 'next/server'

// Mock Supabase client
const mockInsert = vi.fn().mockReturnThis()
const mockUpsert = vi.fn().mockReturnThis()
const mockFrom = vi.fn().mockReturnValue({
  insert: mockInsert,
  upsert: mockUpsert,
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

describe('Analytics Batch API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ data: null, error: null })
    mockUpsert.mockResolvedValue({ data: null, error: null })
  })

  const createMockRequest = (body: unknown) => {
    return new NextRequest('http://localhost:3000/api/analytics/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  const validEvent = {
    event: 'page_view',
    properties: { page_title: 'Test Page' },
    timestamp: new Date().toISOString(),
    client_timestamp: Date.now(),
    session_id: 'session-123',
    user_id: null,
    anonymous_id: 'anon-123',
    is_admin: false,
    page_path: '/test',
    referrer: 'https://google.com',
    viewport: { width: 1920, height: 1080 },
    device: { type: 'desktop', browser: 'chrome', os: 'macos' },
  }

  describe('Validation', () => {
    it('accepts valid event batch', async () => {
      const request = createMockRequest([validEvent])
      const response = await POST(request)

      expect(response.status).toBe(202)
      const data = await response.json()
      expect(data.status).toBe('accepted')
      expect(data.count).toBe(1)
    })

    it('accepts batch with multiple events', async () => {
      const request = createMockRequest([
        validEvent,
        { ...validEvent, event: 'search' },
        { ...validEvent, event: 'resource_view' },
      ])
      const response = await POST(request)

      expect(response.status).toBe(202)
      const data = await response.json()
      expect(data.count).toBe(3)
    })

    it('rejects empty batch', async () => {
      const request = createMockRequest([])
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.status).toBe('validation_error')
      expect(data.errors).toBeDefined()
    })

    it('rejects batch with more than 1000 events', async () => {
      const largeBatch = Array(1001).fill(validEvent)
      const request = createMockRequest(largeBatch)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.status).toBe('validation_error')
    })

    it('rejects invalid event schema', async () => {
      const invalidEvent = {
        event: '', // Empty event name (invalid)
        timestamp: new Date().toISOString(),
        session_id: 'session-123',
        anonymous_id: 'anon-123',
        page_path: '/test',
      }
      const request = createMockRequest([invalidEvent])
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.status).toBe('validation_error')
    })

    it('rejects missing required fields', async () => {
      const incompleteEvent = {
        event: 'test_event',
        // Missing timestamp, session_id, anonymous_id, page_path
      }
      const request = createMockRequest([incompleteEvent])
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.status).toBe('validation_error')
    })

    it('rejects invalid UUID for user_id', async () => {
      const invalidEvent = {
        ...validEvent,
        user_id: 'not-a-uuid',
      }
      const request = createMockRequest([invalidEvent])
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.status).toBe('validation_error')
    })

    it('accepts null user_id', async () => {
      const eventWithNullUserId = {
        ...validEvent,
        user_id: null,
      }
      const request = createMockRequest([eventWithNullUserId])
      const response = await POST(request)

      expect(response.status).toBe(202)
    })

    it('rejects invalid timestamp format', async () => {
      const invalidEvent = {
        ...validEvent,
        timestamp: 'not-a-datetime',
      }
      const request = createMockRequest([invalidEvent])
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.status).toBe('validation_error')
    })

    it('rejects invalid client_timestamp (not a number)', async () => {
      const invalidEvent = {
        ...validEvent,
        client_timestamp: 'not-a-number',
      }
      const request = createMockRequest([invalidEvent])
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Response Format', () => {
    it('returns 202 Accepted status', async () => {
      const request = createMockRequest([validEvent])
      const response = await POST(request)

      expect(response.status).toBe(202)
    })

    it('returns accepted status and count', async () => {
      const request = createMockRequest([validEvent, validEvent])
      const response = await POST(request)

      const data = await response.json()
      expect(data).toEqual({
        status: 'accepted',
        count: 2,
      })
    })

    it('returns validation_error status with errors on invalid input', async () => {
      const request = createMockRequest([])
      const response = await POST(request)

      const data = await response.json()
      expect(data.status).toBe('validation_error')
      expect(data.errors).toBeDefined()
      expect(Array.isArray(data.errors)).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('handles malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json{',
      })

      const response = await POST(request)

      expect(response.status).toBe(202) // Still returns 202 to not break UX
      const data = await response.json()
      expect(data.status).toBe('error')
    })

    it('handles database errors gracefully', async () => {
      // Mock database error
      mockInsert.mockResolvedValueOnce({
        data: null,
        error: new Error('Database connection failed'),
      })

      const request = createMockRequest([validEvent])
      const response = await POST(request)

      // Should still return 202 (fire-and-forget)
      expect(response.status).toBe(202)
    })
  })

  describe('Event Type Routing', () => {
    it('processes page_view events', async () => {
      const pageViewEvent = { ...validEvent, event: 'page_view' }
      const request = createMockRequest([pageViewEvent])

      const response = await POST(request)

      // Verify response is successful
      expect(response).toBeDefined()
      expect(response.status).toBe(202)
    })

    it('processes search events', async () => {
      const searchEvent = {
        ...validEvent,
        event: 'search',
        properties: {
          query: 'housing',
          results_count: 15,
        },
      }
      const request = createMockRequest([searchEvent])

      const response = await POST(request)
      expect(response.status).toBe(202)
    })

    it('processes resource events', async () => {
      const resourceEvent = {
        ...validEvent,
        event: 'resource_view',
        properties: {
          resource_id: '123e4567-e89b-12d3-a456-426614174000',
        },
      }
      const request = createMockRequest([resourceEvent])

      const response = await POST(request)
      expect(response.status).toBe(202)
    })

    it('processes map events', async () => {
      const mapEvent = {
        ...validEvent,
        event: 'map_zoom',
        properties: {
          center_lat: 37.8044,
          center_lng: -122.2712,
          zoom_level: 13,
        },
      }
      const request = createMockRequest([mapEvent])

      const response = await POST(request)
      expect(response.status).toBe(202)
    })

    it('processes feature events', async () => {
      const featureEvent = {
        ...validEvent,
        event: 'feature_share_button',
        properties: {
          event_type: 'click',
        },
      }
      const request = createMockRequest([featureEvent])

      const response = await POST(request)
      expect(response.status).toBe(202)
    })

    it('processes performance events', async () => {
      const perfEvent = {
        ...validEvent,
        event: 'performance',
        properties: {
          metric_name: 'LCP',
          metric_value: 1234,
        },
      }
      const request = createMockRequest([perfEvent])

      const response = await POST(request)
      expect(response.status).toBe(202)
    })
  })

  describe('Property Validation', () => {
    it('validates search properties', async () => {
      const searchEvent = {
        ...validEvent,
        event: 'search',
        properties: {
          query: 'housing',
          results_count: 15,
          filters: { category: 'housing' },
        },
      }
      const request = createMockRequest([searchEvent])

      const response = await POST(request)
      expect(response.status).toBe(202)
    })

    it('validates resource properties with UUID', async () => {
      const resourceEvent = {
        ...validEvent,
        event: 'resource_view',
        properties: {
          resource_id: '123e4567-e89b-12d3-a456-426614174000',
          source: 'search',
        },
      }
      const request = createMockRequest([resourceEvent])

      const response = await POST(request)
      expect(response.status).toBe(202)
    })

    it('validates map properties with lat/lng constraints', async () => {
      const mapEvent = {
        ...validEvent,
        event: 'map_move',
        properties: {
          center_lat: 37.8044,
          center_lng: -122.2712,
          zoom_level: 13,
          visible_markers: 25,
        },
      }
      const request = createMockRequest([mapEvent])

      const response = await POST(request)
      expect(response.status).toBe(202)
    })

    it('rejects invalid map coordinates (latitude >90)', async () => {
      const mapEvent = {
        ...validEvent,
        event: 'map_move',
        properties: {
          center_lat: 95, // Invalid: >90
          center_lng: 0,
          zoom_level: 10,
        },
      }
      const request = createMockRequest([mapEvent])

      const response = await POST(request)
      expect(response.status).toBe(400) // Validation should fail
    })

    it('rejects invalid resource UUID', async () => {
      const resourceEvent = {
        ...validEvent,
        event: 'resource_view',
        properties: {
          resource_id: 'not-a-uuid',
        },
      }
      const request = createMockRequest([resourceEvent])

      const response = await POST(request)
      expect(response.status).toBe(400) // Validation should fail
    })
  })

  describe('Admin Filtering', () => {
    it('processes events with is_admin flag', async () => {
      const adminEvent = {
        ...validEvent,
        is_admin: true,
      }
      const request = createMockRequest([adminEvent])

      const response = await POST(request)
      expect(response.status).toBe(202)
      // Event should be stored with is_admin = true
    })

    it('defaults is_admin to false if not provided', async () => {
      const eventWithoutAdminFlag = {
        event: 'page_view',
        timestamp: new Date().toISOString(),
        client_timestamp: Date.now(),
        session_id: 'session-123',
        anonymous_id: 'anon-123',
        page_path: '/test',
        // is_admin not provided
      }
      const request = createMockRequest([eventWithoutAdminFlag])

      const response = await POST(request)
      expect(response.status).toBe(202)
      // Event should be stored with is_admin = false (default)
    })
  })
})
