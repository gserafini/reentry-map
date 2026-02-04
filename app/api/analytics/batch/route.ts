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
import type { AnalyticsEvent } from '@/lib/analytics/queue'
import { analyticsEventBatchSchema } from '@/lib/analytics/schemas'
import { sql } from '@/lib/db/client'

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

    const events = validationResult.data as AnalyticsEvent[]

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
  } catch (_error) {
    // Even if parsing fails, return success (don't break user experience)
    return NextResponse.json({ status: 'error' }, { status: 202 })
  }
}

/**
 * Process events in background
 * This runs AFTER the HTTP response is sent
 */
async function processEventsAsync(events: AnalyticsEvent[], request: NextRequest): Promise<void> {
  // Get IP-based geolocation from headers (privacy-safe)
  const country = (request as NextRequest & { geo?: { country?: string } }).geo?.country || null
  const city = (request as NextRequest & { geo?: { city?: string } }).geo?.city || null
  const region = (request as NextRequest & { geo?: { region?: string } }).geo?.region || null

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
    processPageViewEvents(enrichedEvents),
    processSearchEvents(enrichedEvents),
    processResourceEvents(enrichedEvents),
    processMapEvents(enrichedEvents),
    processFeatureEvents(enrichedEvents),
    processPerformanceEvents(enrichedEvents),
  ])

  // Update session metadata
  await updateSessionMetadata(enrichedEvents)
}

async function processPageViewEvents(events: EnrichedAnalyticsEvent[]) {
  const pageViews = events.filter((e) => e.event === 'page_view')
  if (pageViews.length === 0) return

  for (const e of pageViews) {
    const pageTitle = (e.properties?.page_title as string) ?? null
    const loadTimeMs = (e.properties?.load_time_ms as number) ?? null
    await sql`
      INSERT INTO analytics_page_views (session_id, user_id, anonymous_id, is_admin, page_path, page_title, referrer, viewport_width, viewport_height, load_time_ms, timestamp)
      VALUES (${e.session_id ?? null}, ${e.user_id ?? null}, ${e.anonymous_id ?? null}, ${e.is_admin ?? false}, ${e.page_path ?? null}, ${pageTitle}, ${e.referrer ?? null}, ${e.viewport?.width ?? null}, ${e.viewport?.height ?? null}, ${loadTimeMs}, ${e.timestamp ?? null})
    `
  }
}

async function processSearchEvents(events: EnrichedAnalyticsEvent[]) {
  const searches = events.filter((e) => e.event === 'search')
  if (searches.length === 0) return

  for (const e of searches) {
    const props = e.properties
    const filtersJson: string | null = props?.filters ? JSON.stringify(props.filters) : null
    const query = (props?.query as string) ?? null
    const resultsCount = (props?.results_count as number) ?? null
    const firstClickPos = (props?.first_click_position as number) ?? null
    const timeToFirstClick = (props?.time_to_first_click_seconds as number) ?? null
    const refinementCount = (props?.refinement_count as number) ?? 0
    await sql`
      INSERT INTO analytics_search_events (session_id, user_id, anonymous_id, is_admin, search_query, filters, results_count, first_click_position, time_to_first_click_seconds, refinement_count, timestamp)
      VALUES (${e.session_id ?? null}, ${e.user_id ?? null}, ${e.anonymous_id ?? null}, ${e.is_admin ?? false}, ${query}, ${filtersJson}, ${resultsCount}, ${firstClickPos}, ${timeToFirstClick}, ${refinementCount}, ${e.timestamp ?? null})
    `
  }
}

async function processResourceEvents(events: EnrichedAnalyticsEvent[]) {
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

  for (const e of resourceEvents) {
    const props = e.properties
    const metadataJson: string | null = props?.metadata ? JSON.stringify(props.metadata) : null
    const resourceId = (props?.resource_id as string) ?? null
    const timeSpent = (props?.time_spent_seconds as number) ?? null
    const scrollDepth = (props?.scroll_depth_percent as number) ?? null
    const source = (props?.source as string) ?? null
    await sql`
      INSERT INTO analytics_resource_events (session_id, user_id, anonymous_id, is_admin, resource_id, event_type, time_spent_seconds, scroll_depth_percent, source, metadata, timestamp)
      VALUES (${e.session_id ?? null}, ${e.user_id ?? null}, ${e.anonymous_id ?? null}, ${e.is_admin ?? false}, ${resourceId}, ${e.event.replace('resource_', '')}, ${timeSpent}, ${scrollDepth}, ${source}, ${metadataJson}, ${e.timestamp ?? null})
    `
  }
}

async function processMapEvents(events: EnrichedAnalyticsEvent[]) {
  const mapEvents = events.filter((e) =>
    ['map_move', 'map_zoom', 'map_marker_click'].includes(e.event)
  )
  if (mapEvents.length === 0) return

  for (const e of mapEvents) {
    const centerLat = (e.properties?.center_lat as number) ?? null
    const centerLng = (e.properties?.center_lng as number) ?? null
    const zoomLevel = (e.properties?.zoom_level as number) ?? null
    const visibleMarkers = (e.properties?.visible_markers as number) ?? null
    await sql`
      INSERT INTO analytics_map_events (session_id, user_id, anonymous_id, is_admin, event_type, center_lat, center_lng, zoom_level, visible_markers, timestamp)
      VALUES (${e.session_id ?? null}, ${e.user_id ?? null}, ${e.anonymous_id ?? null}, ${e.is_admin ?? false}, ${e.event.replace('map_', '')}, ${centerLat}, ${centerLng}, ${zoomLevel}, ${visibleMarkers}, ${e.timestamp ?? null})
    `
  }
}

async function processFeatureEvents(events: EnrichedAnalyticsEvent[]) {
  const featureEvents = events.filter((e) => e.event.startsWith('feature_'))
  if (featureEvents.length === 0) return

  for (const e of featureEvents) {
    const eventType = (e.properties?.event_type as string) ?? 'use'
    const propsJson: string | null = e.properties ? JSON.stringify(e.properties) : null
    await sql`
      INSERT INTO analytics_feature_events (session_id, user_id, anonymous_id, is_admin, feature_name, event_type, metadata, timestamp)
      VALUES (${e.session_id ?? null}, ${e.user_id ?? null}, ${e.anonymous_id ?? null}, ${e.is_admin ?? false}, ${e.event.replace('feature_', '')}, ${eventType}, ${propsJson}, ${e.timestamp ?? null})
    `
  }
}

async function processPerformanceEvents(events: EnrichedAnalyticsEvent[]) {
  const perfEvents = events.filter((e) => ['performance', 'error'].includes(e.event))
  if (perfEvents.length === 0) return

  for (const e of perfEvents) {
    const metricName = (e.properties?.metric_name as string) ?? null
    const metricValue = (e.properties?.metric_value as number) ?? null
    const errorMessage = (e.properties?.error_message as string) ?? null
    const errorStack = (e.properties?.error_stack as string) ?? null
    await sql`
      INSERT INTO analytics_performance_events (session_id, user_id, anonymous_id, is_admin, event_type, page_path, metric_name, metric_value, error_message, error_stack, timestamp)
      VALUES (${e.session_id ?? null}, ${e.user_id ?? null}, ${e.anonymous_id ?? null}, ${e.is_admin ?? false}, ${e.event ?? null}, ${e.page_path ?? null}, ${metricName}, ${metricValue}, ${errorMessage}, ${errorStack}, ${e.timestamp ?? null})
    `
  }
}

async function updateSessionMetadata(events: EnrichedAnalyticsEvent[]) {
  // Get unique sessions from this batch
  const sessions = new Map<
    string,
    {
      session_id: string
      user_id: string | null | undefined
      anonymous_id: string | undefined
      is_admin: boolean | undefined
      device_type: string | undefined
      browser: string | undefined
      os: string | undefined
      city: string | null
      region: string | null
      country: string | null
      started_at: string | undefined
      referrer: string | undefined
    }
  >()

  events.forEach((event) => {
    const sessionId = event.session_id || ''
    if (sessionId && !sessions.has(sessionId)) {
      sessions.set(sessionId, {
        session_id: sessionId,
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
  for (const s of sessions.values()) {
    await sql`
      INSERT INTO analytics_sessions (session_id, user_id, anonymous_id, is_admin, device_type, browser, os, city, state, country, started_at, referrer)
      VALUES (${s.session_id ?? null}, ${s.user_id ?? null}, ${s.anonymous_id ?? null}, ${s.is_admin ?? false}, ${s.device_type ?? null}, ${s.browser ?? null}, ${s.os ?? null}, ${s.city ?? null}, ${s.region ?? null}, ${s.country ?? null}, ${s.started_at ?? null}, ${s.referrer ?? null})
      ON CONFLICT (session_id) DO UPDATE SET
        user_id = COALESCE(EXCLUDED.user_id, analytics_sessions.user_id),
        anonymous_id = COALESCE(EXCLUDED.anonymous_id, analytics_sessions.anonymous_id)
    `
  }
}
