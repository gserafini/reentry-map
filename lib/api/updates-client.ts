/**
 * Client-safe updates functions
 * These call API routes instead of querying the database directly.
 * Import this in 'use client' components instead of lib/api/updates.
 */

import type { ResourceUpdateReport, ResourceUpdateReportInsert } from '@/lib/types/database'

interface UpdateResult {
  data: ResourceUpdateReport | null
  error: string | null
}

interface UpdatesListResult {
  data: ResourceUpdateReport[] | null
  error: string | null
}

/**
 * Submit a resource update/correction via API route
 */
export async function submitUpdate(update: ResourceUpdateReportInsert): Promise<UpdateResult> {
  try {
    const res = await fetch('/api/updates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })
    return (await res.json()) as UpdateResult
  } catch {
    return { data: null, error: 'Failed to submit update' }
  }
}

/**
 * Get all pending updates (admin only)
 */
export async function getPendingUpdates(): Promise<UpdatesListResult> {
  try {
    const res = await fetch('/api/updates?type=pending')
    if (!res.ok) return { data: null, error: 'Failed to fetch pending updates' }
    return (await res.json()) as UpdatesListResult
  } catch {
    return { data: null, error: 'Failed to fetch pending updates' }
  }
}

/**
 * Get updates for the current authenticated user.
 * The API route resolves the user from the session, so no userId parameter is needed.
 */
export async function getUserUpdates(): Promise<UpdatesListResult> {
  try {
    const res = await fetch('/api/updates?type=user')
    if (!res.ok) return { data: null, error: 'Failed to fetch user updates' }
    return (await res.json()) as UpdatesListResult
  } catch {
    return { data: null, error: 'Failed to fetch user updates' }
  }
}

/**
 * Get all updates for a specific resource
 */
export async function getResourceUpdates(resourceId: string): Promise<UpdatesListResult> {
  try {
    const res = await fetch(`/api/updates?resourceId=${encodeURIComponent(resourceId)}`)
    if (!res.ok) return { data: null, error: 'Failed to fetch resource updates' }
    return (await res.json()) as UpdatesListResult
  } catch {
    return { data: null, error: 'Failed to fetch resource updates' }
  }
}

/**
 * Update status of a resource update (admin only)
 */
export async function updateUpdateStatus(
  updateId: string,
  status: 'pending' | 'applied' | 'rejected',
  adminNotes?: string
): Promise<UpdateResult> {
  try {
    const res = await fetch(`/api/updates/${updateId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNotes }),
    })
    return (await res.json()) as UpdateResult
  } catch {
    return { data: null, error: 'Failed to update status' }
  }
}
