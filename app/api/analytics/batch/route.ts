/**
 * Analytics Batch API - Accepts events and processes asynchronously
 *
 * Performance: Returns 202 Accepted immediately (<50ms)
 * Processing happens AFTER response is sent
 *
 * Rate limiting: 1000 events per batch max
 * Authentication: None required (public endpoint)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AnalyticsEvent } from '@/lib/analytics/queue'
import type { SupabaseClient } from '@supabase/supabase-js'
import { analyticsEventBatchSchema } from '@/lib/analytics/schemas'
import { ZodError } from 'zod'

export const runtime = 'edge' // Fast cold starts
export const maxDuration = 1 // Max 1 second (forces fast return)

// Enriched event with server-side data
interface EnrichedAnalyticsEvent extends AnalyticsEvent {
  server_timestamp: string
  country: string | null
  city: string | null
  region: string | null
  ip_address: null // Privacy: we don't store IPs
}

export async function POST(request: NextRequest) {
  try {
    const rawEvents = await request.json()

    // Validate events with Zod schema
    const validationResult = analyticsEventBatchSchema.safeParse(rawEvents)

    if (!validationResult.success) {
      // Log validation errors and return 400 to help debug client issues
      console.error('Analytics validation error:', validationResult.error.format())
      return NextResponse.json(
        { status: 'validation_error', errors: validationResult.error.issues },
        { status: 400 }
      )
    }

    const events: AnalyticsEvent[] = validationResult.data

    // IMMEDIATELY return 202 Accepted (don't wait for processing)
    const response = NextResponse.json(
      { status: 'accepted', count: events.length },
      { status: 202 }
    )

    // Process events asynchronously (doesn't block response)
    // Note: This continues after response is sent
    processEventsAsync(events, request).catch((error) => {
      console.error('Analytics processing error:', error)
      // Optional: Send to error tracking (Sentry, etc.)
    })

    return response
  } catch (error) {
    // Even if parsing fails, return success (don't break user experience)
    return NextResponse.json({ status: 'error' }, { status: 202 })
  }
}

/**
 * Process events in background
 * This runs AFTER the HTTP response is sent
 */
async function processEventsAsync(
  events: AnalyticsEvent[],
  request: NextRequest
): Promise<void> {
  const supabase = createClient()

  // Get IP-based geolocation from Vercel headers (privacy-safe)
  const country = request.geo?.country || null
  const city = request.geo?.city || null
  const region = request.geo?.region || null

  // Enrich events with server-side data
  const enrichedEvents: EnrichedAnalyticsEvent[] = events.map((event) => ({
    ...event,
    server_timestamp: new Date().toISOString(),
    country,
    city,
    region,
    is_admin: event.is_admin || false, // Default to false if not provided
    // Don't store full IP address for privacy
    ip_address: null,
  }))

  // Route events to appropriate tables based on event type
  await Promise.all([
    processPageViewEvents(enrichedEvents, supabase),
    processSearchEvents(enrichedEvents, supabase),
    processResourceEvents(enrichedEvents, supabase),
    processMapEvents(enrichedEvents, supabase),
    processFeatureEvents(enrichedEvents, supabase),
    processPerformanceEvents(enrichedEvents, supabase),
  ])

  // Update session metadata
  await updateSessionMetadata(enrichedEvents, supabase)
}

async function processPageViewEvents(
  events: EnrichedAnalyticsEvent[],
  supabase: SupabaseClient
) {
  const pageViews = events.filter((e) => e.event === 'page_view')
  if (pageViews.length === 0) return

  await supabase.from('analytics_page_views').insert(
    pageViews.map((e) => ({
      session_id: e.session_id,
      user_id: e.user_id,
      anonymous_id: e.anonymous_id,
      is_admin: e.is_admin,
      page_path: e.page_path,
      page_title: e.properties?.page_title,
      referrer: e.referrer,
      viewport_width: e.viewport?.width,
      viewport_height: e.viewport?.height,
      load_time_ms: e.properties?.load_time_ms,
      timestamp: e.timestamp,
    }))
  )
}

async function processSearchEvents(
  events: EnrichedAnalyticsEvent[],
  supabase: SupabaseClient
) {
  const searches = events.filter((e) => e.event === 'search')
  if (searches.length === 0) return

  await supabase.from('analytics_search_events').insert(
    searches.map((e) => ({
      session_id: e.session_id,
      user_id: e.user_id,
      anonymous_id: e.anonymous_id,
      is_admin: e.is_admin,
      search_query: e.properties?.query,
      filters: e.properties?.filters,
      results_count: e.properties?.results_count,
      first_click_position: e.properties?.first_click_position,
      time_to_first_click_seconds: e.properties?.time_to_first_click_seconds,
      refinement_count: e.properties?.refinement_count || 0,
      timestamp: e.timestamp,
    }))
  )
}

async function processResourceEvents(
  events: EnrichedAnalyticsEvent[],
  supabase: SupabaseClient
) {
  const resourceEvents = events.filter((e) =>
    [
      'resource_view',
      'resource_click_call',
      'resource_click_directions',
      'resource_click_website',
      'resource_favorite_add',
      'resource_favorite_remove',
    ].includes(e.event)
  )
  if (resourceEvents.length === 0) return

  await supabase.from('analytics_resource_events').insert(
    resourceEvents.map((e) => ({
      session_id: e.session_id,
      user_id: e.user_id,
      anonymous_id: e.anonymous_id,
      is_admin: e.is_admin,
      resource_id: e.properties?.resource_id,
      event_type: e.event.replace('resource_', ''),
      time_spent_seconds: e.properties?.time_spent_seconds,
      scroll_depth_percent: e.properties?.scroll_depth_percent,
      source: e.properties?.source,
      metadata: e.properties?.metadata,
      timestamp: e.timestamp,
    }))
  )
}

async function processMapEvents(
  events: EnrichedAnalyticsEvent[],
  supabase: SupabaseClient
) {
  const mapEvents = events.filter((e) =>
    ['map_move', 'map_zoom', 'map_marker_click'].includes(e.event)
  )
  if (mapEvents.length === 0) return

  await supabase.from('analytics_map_events').insert(
    mapEvents.map((e) => ({
      session_id: e.session_id,
      user_id: e.user_id,
      anonymous_id: e.anonymous_id,
      is_admin: e.is_admin,
      event_type: e.event.replace('map_', ''),
      center_lat: e.properties?.center_lat,
      center_lng: e.properties?.center_lng,
      zoom_level: e.properties?.zoom_level,
      visible_markers: e.properties?.visible_markers,
      timestamp: e.timestamp,
    }))
  )
}

async function processFeatureEvents(
  events: EnrichedAnalyticsEvent[],
  supabase: SupabaseClient
) {
  const featureEvents = events.filter((e) => e.event.startsWith('feature_'))
  if (featureEvents.length === 0) return

  await supabase.from('analytics_feature_events').insert(
    featureEvents.map((e) => ({
      session_id: e.session_id,
      user_id: e.user_id,
      anonymous_id: e.anonymous_id,
      is_admin: e.is_admin,
      feature_name: e.event.replace('feature_', ''),
      event_type: e.properties?.event_type || 'use',
      metadata: e.properties,
      timestamp: e.timestamp,
    }))
  )
}

async function processPerformanceEvents(
  events: EnrichedAnalyticsEvent[],
  supabase: SupabaseClient
) {
  const perfEvents = events.filter((e) =>
    ['performance', 'error'].includes(e.event)
  )
  if (perfEvents.length === 0) return

  await supabase.from('analytics_performance_events').insert(
    perfEvents.map((e) => ({
      session_id: e.session_id,
      user_id: e.user_id,
      anonymous_id: e.anonymous_id,
      is_admin: e.is_admin,
      event_type: e.event,
      page_path: e.page_path,
      metric_name: e.properties?.metric_name,
      metric_value: e.properties?.metric_value,
      error_message: e.properties?.error_message,
      error_stack: e.properties?.error_stack,
      timestamp: e.timestamp,
    }))
  )
}

async function updateSessionMetadata(
  events: EnrichedAnalyticsEvent[],
  supabase: SupabaseClient
) {
  // Get unique sessions from this batch
  const sessions = new Map<
    string,
    {
      session_id: string
      user_id: string | null | undefined
      anonymous_id: string
      is_admin: boolean | undefined
      device_type: string | undefined
      browser: string | undefined
      os: string | undefined
      city: string | null
      region: string | null
      country: string | null
      started_at: string
      referrer: string | undefined
    }
  >()

  events.forEach((event) => {
    if (!sessions.has(event.session_id)) {
      sessions.set(event.session_id, {
        session_id: event.session_id,
        user_id: event.user_id,
        anonymous_id: event.anonymous_id,
        is_admin: event.is_admin,
        device_type: event.device?.type,
        browser: event.device?.browser,
        os: event.device?.os,
        city: event.city,
        region: event.region,
        country: event.country,
        started_at: event.timestamp,
        referrer: event.referrer,
      })
    }
  })

  // Upsert sessions (create if not exists, update if exists)
  await supabase.from('analytics_sessions').upsert(
    Array.from(sessions.values()).map((s) => ({
      session_id: s.session_id,
      user_id: s.user_id,
      anonymous_id: s.anonymous_id,
      is_admin: s.is_admin,
      device_type: s.device_type,
      browser: s.browser,
      os: s.os,
      city: s.city,
      state: s.region,
      country: s.country,
      started_at: s.started_at,
      referrer: s.referrer,
    })),
    { onConflict: 'session_id' }
  )
}
