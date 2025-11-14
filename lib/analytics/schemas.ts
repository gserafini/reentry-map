/**
 * Analytics Event Validation Schemas
 *
 * Zod schemas for validating analytics events
 * Ensures data quality and catches errors early
 */

import { z } from 'zod'

// Event property schemas by event type
export const pageViewPropertiesSchema = z.object({
  page_title: z.string().optional(),
  load_time_ms: z.number().int().positive().optional(),
})

export const searchPropertiesSchema = z.object({
  query: z.string().min(1),
  filters: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  results_count: z.number().int().min(0),
  first_click_position: z.number().int().positive().optional(),
  time_to_first_click_seconds: z.number().int().positive().optional(),
  refinement_count: z.number().int().min(0).optional(),
})

export const resourcePropertiesSchema = z.object({
  resource_id: z.string().uuid(),
  source: z.enum(['search', 'map', 'category', 'favorite', 'direct']).optional(),
  action: z
    .enum(['call', 'directions', 'website', 'favorite_add', 'favorite_remove'])
    .optional(),
  time_spent_seconds: z.number().int().positive().optional(),
  scroll_depth_percent: z.number().int().min(0).max(100).optional(),
})

export const mapPropertiesSchema = z.object({
  center_lat: z.number().min(-90).max(90),
  center_lng: z.number().min(-180).max(180),
  zoom_level: z.number().int().min(0).max(22),
  visible_markers: z.number().int().min(0).optional(),
})

export const featurePropertiesSchema = z.object({
  event_type: z.string().optional(),
}).passthrough() // Allow additional properties for flexibility

export const performancePropertiesSchema = z.object({
  metric_name: z.string().optional(),
  metric_value: z.number().positive().optional(),
  error_message: z.string().optional(),
  error_stack: z.string().optional(),
}).passthrough()

// Generic analytics properties (union of all types + catchall)
export const analyticsPropertiesSchema = z
  .union([
    pageViewPropertiesSchema,
    searchPropertiesSchema,
    resourcePropertiesSchema,
    mapPropertiesSchema,
    featurePropertiesSchema,
    performancePropertiesSchema,
  ])
  .or(z.record(z.union([z.string(), z.number(), z.boolean(), z.record(z.unknown())])))
  .optional()

// Base analytics event schema
export const analyticsEventSchema = z.object({
  event: z.string().min(1).max(100),
  properties: analyticsPropertiesSchema,
  timestamp: z.string().datetime(),
  client_timestamp: z.number().int().positive(),
  session_id: z.string().min(1).max(100),
  user_id: z.string().uuid().nullable().optional(),
  anonymous_id: z.string().min(1).max(100),
  is_admin: z.boolean().optional(),
  page_path: z.string().min(1).max(500),
  referrer: z.string().max(500).optional(),
  viewport: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .optional(),
  device: z
    .object({
      type: z.string().max(50),
      browser: z.string().max(50),
      os: z.string().max(50),
    })
    .optional(),
})

// Batch of analytics events
export const analyticsEventBatchSchema = z
  .array(analyticsEventSchema)
  .min(1)
  .max(1000) // Max 1000 events per batch

// Type exports
export type AnalyticsEventSchema = z.infer<typeof analyticsEventSchema>
export type AnalyticsEventBatchSchema = z.infer<typeof analyticsEventBatchSchema>
