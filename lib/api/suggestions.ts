import { sql } from '@/lib/db/client'

interface ResourceSuggestionInsert {
  suggested_by?: string | null
  name: string
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  description?: string | null
  category?: string | null
  primary_category?: string | null
  categories?: string[] | null
  tags?: string[] | null
  hours?: Record<string, unknown> | null
  services_offered?: string[] | null
  eligibility_requirements?: string | null
  languages?: string[] | null
  accessibility_features?: string[] | null
  latitude?: number | null
  longitude?: number | null
  reason?: string | null
  personal_experience?: string | null
  status?: string | null
  discovered_via?: string | null
  discovery_notes?: string | null
  research_task_id?: string | null
}

interface ResourceSuggestionRow {
  id: string
  suggested_by: string | null
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  email: string | null
  website: string | null
  description: string | null
  category: string | null
  primary_category: string | null
  categories: string[] | null
  tags: string[] | null
  hours: Record<string, unknown> | null
  services_offered: string[] | null
  eligibility_requirements: string | null
  languages: string[] | null
  accessibility_features: string[] | null
  latitude: number | null
  longitude: number | null
  reason: string | null
  personal_experience: string | null
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  admin_notes: string | null
  rejection_reason: string | null
  correction_notes: string | null
  closure_status: string | null
  research_task_id: string | null
  discovered_via: string | null
  discovery_notes: string | null
  created_resource_id: string | null
  created_at: string
}

/**
 * Suggestions API
 *
 * Functions for managing resource suggestions
 */

/**
 * Submit a new resource suggestion
 */
export async function submitSuggestion(suggestion: ResourceSuggestionInsert) {
  try {
    const insertData: Record<string, unknown> = { ...suggestion }
    if (insertData.hours) {
      insertData.hours = JSON.stringify(insertData.hours)
    }
    const rows = await sql<ResourceSuggestionRow[]>`
      INSERT INTO resource_suggestions ${sql(insertData)}
      RETURNING *
    `
    return { data: rows[0] ?? null, error: null }
  } catch (error) {
    console.error('Error submitting suggestion:', error)
    return { data: null, error }
  }
}

/**
 * Get all suggestions for the current user
 */
export async function getUserSuggestions(userId: string) {
  try {
    const data = await sql<ResourceSuggestionRow[]>`
      SELECT * FROM resource_suggestions
      WHERE suggested_by = ${userId}
      ORDER BY created_at DESC
    `
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching user suggestions:', error)
    return { data: null, error }
  }
}

/**
 * Get all pending suggestions (admin only)
 */
export async function getPendingSuggestions() {
  try {
    const data = await sql<ResourceSuggestionRow[]>`
      SELECT * FROM resource_suggestions
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching pending suggestions:', error)
    return { data: null, error }
  }
}

/**
 * Update suggestion status (admin only)
 */
export async function updateSuggestionStatus(
  suggestionId: string,
  status: 'pending' | 'approved' | 'rejected' | 'duplicate',
  adminNotes?: string
) {
  try {
    const rows = await sql<ResourceSuggestionRow[]>`
      UPDATE resource_suggestions SET
        status = ${status},
        admin_notes = ${adminNotes || null},
        reviewed_at = NOW()
      WHERE id = ${suggestionId}
      RETURNING *
    `
    return { data: rows[0] ?? null, error: null }
  } catch (error) {
    console.error('Error updating suggestion status:', error)
    return { data: null, error }
  }
}

/**
 * Get suggestion by ID
 */
export async function getSuggestion(suggestionId: string) {
  try {
    const rows = await sql<ResourceSuggestionRow[]>`
      SELECT * FROM resource_suggestions
      WHERE id = ${suggestionId}
      LIMIT 1
    `
    return { data: rows[0] ?? null, error: null }
  } catch (error) {
    console.error('Error fetching suggestion:', error)
    return { data: null, error }
  }
}
