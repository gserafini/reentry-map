/**
 * Client-safe suggestions functions
 * These call API routes instead of querying the database directly.
 * Import this in 'use client' components instead of lib/api/suggestions.
 */

import type { ResourceSuggestion, ResourceSuggestionInsert } from '@/lib/types/database'

interface SuggestionResult {
  data: ResourceSuggestion | null
  error: string | null
}

interface SuggestionsListResult {
  data: ResourceSuggestion[] | null
  error: string | null
}

/**
 * Submit a new resource suggestion via API route
 */
export async function submitSuggestion(
  suggestion: ResourceSuggestionInsert
): Promise<SuggestionResult> {
  try {
    const res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suggestion),
    })
    return (await res.json()) as SuggestionResult
  } catch {
    return { data: null, error: 'Failed to submit suggestion' }
  }
}

/**
 * Get suggestions for the current authenticated user.
 * The API route resolves the user from the session, so no userId parameter is needed.
 */
export async function getUserSuggestions(): Promise<SuggestionsListResult> {
  try {
    const res = await fetch('/api/suggestions?type=user')
    if (!res.ok) return { data: null, error: 'Failed to fetch suggestions' }
    return (await res.json()) as SuggestionsListResult
  } catch {
    return { data: null, error: 'Failed to fetch suggestions' }
  }
}

/**
 * Get all pending suggestions (admin only)
 */
export async function getPendingSuggestions(): Promise<SuggestionsListResult> {
  try {
    const res = await fetch('/api/suggestions?type=pending')
    if (!res.ok) return { data: null, error: 'Failed to fetch pending suggestions' }
    return (await res.json()) as SuggestionsListResult
  } catch {
    return { data: null, error: 'Failed to fetch pending suggestions' }
  }
}

/**
 * Update suggestion status (admin only)
 */
export async function updateSuggestionStatus(
  suggestionId: string,
  status: 'pending' | 'approved' | 'rejected' | 'duplicate',
  adminNotes?: string
): Promise<SuggestionResult> {
  try {
    const res = await fetch(`/api/suggestions/${suggestionId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNotes }),
    })
    return (await res.json()) as SuggestionResult
  } catch {
    return { data: null, error: 'Failed to update suggestion status' }
  }
}
