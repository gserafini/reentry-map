import { describe, it, expect } from 'vitest'
import {
  analyticsEventSchema,
  analyticsEventBatchSchema,
  pageViewPropertiesSchema,
  searchPropertiesSchema,
  resourcePropertiesSchema,
  mapPropertiesSchema,
  featurePropertiesSchema,
  performancePropertiesSchema,
} from '@/lib/analytics/schemas'

describe('Analytics Schemas', () => {
  describe('pageViewPropertiesSchema', () => {
    it('validates valid page view properties', () => {
      const result = pageViewPropertiesSchema.safeParse({
        page_title: 'Home Page',
        load_time_ms: 1234,
      })
      expect(result.success).toBe(true)
    })

    it('accepts optional properties', () => {
      const result = pageViewPropertiesSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('rejects negative load times', () => {
      const result = pageViewPropertiesSchema.safeParse({
        load_time_ms: -100,
      })
      expect(result.success).toBe(false)
    })

    it('rejects non-integer load times', () => {
      const result = pageViewPropertiesSchema.safeParse({
        load_time_ms: 123.45,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('searchPropertiesSchema', () => {
    it('validates valid search properties', () => {
      const result = searchPropertiesSchema.safeParse({
        query: 'housing',
        results_count: 15,
        filters: { category: 'housing', city: 'Oakland' },
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty query strings', () => {
      const result = searchPropertiesSchema.safeParse({
        query: '',
        results_count: 0,
      })
      expect(result.success).toBe(false)
    })

    it('rejects negative results count', () => {
      const result = searchPropertiesSchema.safeParse({
        query: 'test',
        results_count: -5,
      })
      expect(result.success).toBe(false)
    })

    it('accepts optional refinement count', () => {
      const result = searchPropertiesSchema.safeParse({
        query: 'test',
        results_count: 10,
        refinement_count: 3,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('resourcePropertiesSchema', () => {
    it('validates valid resource properties', () => {
      const result = resourcePropertiesSchema.safeParse({
        resource_id: '123e4567-e89b-12d3-a456-426614174000',
        source: 'search',
        action: 'call',
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid UUID format', () => {
      const result = resourcePropertiesSchema.safeParse({
        resource_id: 'not-a-uuid',
      })
      expect(result.success).toBe(false)
    })

    it('validates scroll depth percentage constraints', () => {
      // Valid: 0-100
      expect(
        resourcePropertiesSchema.safeParse({
          resource_id: '123e4567-e89b-12d3-a456-426614174000',
          scroll_depth_percent: 75,
        }).success
      ).toBe(true)

      // Invalid: >100
      expect(
        resourcePropertiesSchema.safeParse({
          resource_id: '123e4567-e89b-12d3-a456-426614174000',
          scroll_depth_percent: 150,
        }).success
      ).toBe(false)

      // Invalid: negative
      expect(
        resourcePropertiesSchema.safeParse({
          resource_id: '123e4567-e89b-12d3-a456-426614174000',
          scroll_depth_percent: -10,
        }).success
      ).toBe(false)
    })
  })

  describe('mapPropertiesSchema', () => {
    it('validates valid map properties', () => {
      const result = mapPropertiesSchema.safeParse({
        center_lat: 37.8044,
        center_lng: -122.2712,
        zoom_level: 13,
        visible_markers: 25,
      })
      expect(result.success).toBe(true)
    })

    it('validates latitude constraints (-90 to 90)', () => {
      // Valid
      expect(
        mapPropertiesSchema.safeParse({
          center_lat: 0,
          center_lng: 0,
          zoom_level: 10,
        }).success
      ).toBe(true)

      // Invalid: >90
      expect(
        mapPropertiesSchema.safeParse({
          center_lat: 95,
          center_lng: 0,
          zoom_level: 10,
        }).success
      ).toBe(false)

      // Invalid: <-90
      expect(
        mapPropertiesSchema.safeParse({
          center_lat: -95,
          center_lng: 0,
          zoom_level: 10,
        }).success
      ).toBe(false)
    })

    it('validates longitude constraints (-180 to 180)', () => {
      // Valid
      expect(
        mapPropertiesSchema.safeParse({
          center_lat: 0,
          center_lng: 180,
          zoom_level: 10,
        }).success
      ).toBe(true)

      // Invalid: >180
      expect(
        mapPropertiesSchema.safeParse({
          center_lat: 0,
          center_lng: 185,
          zoom_level: 10,
        }).success
      ).toBe(false)

      // Invalid: <-180
      expect(
        mapPropertiesSchema.safeParse({
          center_lat: 0,
          center_lng: -185,
          zoom_level: 10,
        }).success
      ).toBe(false)
    })

    it('validates zoom level constraints (0 to 22)', () => {
      // Valid
      expect(
        mapPropertiesSchema.safeParse({
          center_lat: 0,
          center_lng: 0,
          zoom_level: 15,
        }).success
      ).toBe(true)

      // Invalid: >22
      expect(
        mapPropertiesSchema.safeParse({
          center_lat: 0,
          center_lng: 0,
          zoom_level: 25,
        }).success
      ).toBe(false)

      // Invalid: negative
      expect(
        mapPropertiesSchema.safeParse({
          center_lat: 0,
          center_lng: 0,
          zoom_level: -1,
        }).success
      ).toBe(false)
    })
  })

  describe('featurePropertiesSchema', () => {
    it('validates valid feature properties', () => {
      const result = featurePropertiesSchema.safeParse({
        event_type: 'click',
      })
      expect(result.success).toBe(true)
    })

    it('allows additional properties (passthrough)', () => {
      const result = featurePropertiesSchema.safeParse({
        event_type: 'click',
        custom_field: 'custom value',
        numeric_field: 123,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('performancePropertiesSchema', () => {
    it('validates valid performance properties', () => {
      const result = performancePropertiesSchema.safeParse({
        metric_name: 'LCP',
        metric_value: 1234.5,
      })
      expect(result.success).toBe(true)
    })

    it('validates error properties', () => {
      const result = performancePropertiesSchema.safeParse({
        error_message: 'Network error',
        error_stack: 'Error: Network error\n  at fetch...',
      })
      expect(result.success).toBe(true)
    })

    it('rejects negative metric values', () => {
      const result = performancePropertiesSchema.safeParse({
        metric_name: 'FCP',
        metric_value: -100,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('analyticsEventSchema', () => {
    const validEvent = {
      event: 'page_view',
      properties: { page_title: 'Test' },
      timestamp: new Date().toISOString(),
      client_timestamp: Date.now(),
      session_id: 'session-123',
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      anonymous_id: 'anon-123',
      is_admin: false,
      page_path: '/test',
      referrer: 'https://google.com',
      viewport: { width: 1920, height: 1080 },
      device: { type: 'desktop', browser: 'chrome', os: 'macos' },
    }

    it('validates a complete valid event', () => {
      const result = analyticsEventSchema.safeParse(validEvent)
      expect(result.success).toBe(true)
    })

    it('accepts null user_id', () => {
      const result = analyticsEventSchema.safeParse({
        ...validEvent,
        user_id: null,
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid user_id UUID', () => {
      const result = analyticsEventSchema.safeParse({
        ...validEvent,
        user_id: 'not-a-uuid',
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid timestamp format', () => {
      const result = analyticsEventSchema.safeParse({
        ...validEvent,
        timestamp: 'not-a-datetime',
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty event name', () => {
      const result = analyticsEventSchema.safeParse({
        ...validEvent,
        event: '',
      })
      expect(result.success).toBe(false)
    })

    it('rejects event name longer than 100 characters', () => {
      const result = analyticsEventSchema.safeParse({
        ...validEvent,
        event: 'a'.repeat(101),
      })
      expect(result.success).toBe(false)
    })

    it('rejects page_path longer than 500 characters', () => {
      const result = analyticsEventSchema.safeParse({
        ...validEvent,
        page_path: '/'.repeat(501),
      })
      expect(result.success).toBe(false)
    })

    it('accepts optional properties', () => {
      const minimalEvent = {
        event: 'test_event',
        timestamp: new Date().toISOString(),
        client_timestamp: Date.now(),
        session_id: 'session-123',
        anonymous_id: 'anon-123',
        page_path: '/test',
      }
      const result = analyticsEventSchema.safeParse(minimalEvent)
      expect(result.success).toBe(true)
    })
  })

  describe('analyticsEventBatchSchema', () => {
    const validEvent = {
      event: 'page_view',
      timestamp: new Date().toISOString(),
      client_timestamp: Date.now(),
      session_id: 'session-123',
      anonymous_id: 'anon-123',
      page_path: '/test',
    }

    it('validates a batch with one event', () => {
      const result = analyticsEventBatchSchema.safeParse([validEvent])
      expect(result.success).toBe(true)
    })

    it('validates a batch with multiple events', () => {
      const result = analyticsEventBatchSchema.safeParse([
        validEvent,
        { ...validEvent, event: 'search' },
        { ...validEvent, event: 'resource_view' },
      ])
      expect(result.success).toBe(true)
    })

    it('rejects empty batch', () => {
      const result = analyticsEventBatchSchema.safeParse([])
      expect(result.success).toBe(false)
    })

    it('rejects batch with more than 1000 events', () => {
      const largeBatch = Array(1001).fill(validEvent)
      const result = analyticsEventBatchSchema.safeParse(largeBatch)
      expect(result.success).toBe(false)
    })

    it('accepts batch with exactly 1000 events', () => {
      const largeBatch = Array(1000).fill(validEvent)
      const result = analyticsEventBatchSchema.safeParse(largeBatch)
      expect(result.success).toBe(true)
    })
  })
})
