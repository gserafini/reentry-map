import { sql } from '@/lib/db/client'

interface ResourceUpdateInsert {
  resource_id: string
  reported_by?: string | null
  update_type: string
  old_value?: string | null
  new_value?: string | null
  description?: string | null
  status?: string | null
}

interface ResourceUpdateRow {
  id: string
  resource_id: string
  reported_by: string | null
  update_type: string
  old_value: string | null
  new_value: string | null
  description: string | null
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

interface ResourceUpdateWithResource extends ResourceUpdateRow {
  resource_name: string | null
}

interface ResourceUpdateWithResourceAndUser extends ResourceUpdateRow {
  resource_name: string | null
  user_email: string | null
  user_phone: string | null
}

/**
 * Resource Updates API
 *
 * Functions for reporting issues and corrections with resources
 */

/**
 * Submit a resource update/correction
 */
export async function submitUpdate(update: ResourceUpdateInsert) {
  try {
    const rows = await sql<ResourceUpdateRow[]>`
      INSERT INTO resource_updates (resource_id, reported_by, update_type, old_value, new_value, description, status)
      VALUES (
        ${update.resource_id},
        ${update.reported_by || null},
        ${update.update_type},
        ${update.old_value || null},
        ${update.new_value || null},
        ${update.description || null},
        ${update.status || 'pending'}
      )
      RETURNING *
    `
    return { data: rows[0] ?? null, error: null }
  } catch (error) {
    console.error('Error submitting update:', error)
    return { data: null, error }
  }
}

/**
 * Get all updates for a resource
 */
export async function getResourceUpdates(resourceId: string) {
  try {
    const data = await sql<ResourceUpdateRow[]>`
      SELECT * FROM resource_updates
      WHERE resource_id = ${resourceId}
      ORDER BY created_at DESC
    `
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching resource updates:', error)
    return { data: null, error }
  }
}

/**
 * Get all updates submitted by a user
 */
export async function getUserUpdates(userId: string) {
  try {
    const data = await sql<ResourceUpdateWithResource[]>`
      SELECT ru.*, r.name AS resource_name
      FROM resource_updates ru
      LEFT JOIN resources r ON r.id = ru.resource_id
      WHERE ru.reported_by = ${userId}
      ORDER BY ru.created_at DESC
    `
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching user updates:', error)
    return { data: null, error }
  }
}

/**
 * Get all pending updates (admin only)
 */
export async function getPendingUpdates() {
  try {
    const data = await sql<ResourceUpdateWithResourceAndUser[]>`
      SELECT ru.*, r.name AS resource_name, u.email AS user_email, u.phone AS user_phone
      FROM resource_updates ru
      LEFT JOIN resources r ON r.id = ru.resource_id
      LEFT JOIN users u ON u.id = ru.reported_by
      WHERE ru.status = 'pending'
      ORDER BY ru.created_at DESC
    `
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching pending updates:', error)
    return { data: null, error }
  }
}

/**
 * Update status of a resource update (admin only)
 */
export async function updateUpdateStatus(
  updateId: string,
  status: 'pending' | 'applied' | 'rejected',
  adminNotes?: string
) {
  try {
    const rows = await sql<ResourceUpdateRow[]>`
      UPDATE resource_updates SET
        status = ${status},
        reviewed_at = NOW(),
        admin_notes = ${adminNotes || null}
      WHERE id = ${updateId}
      RETURNING *
    `
    return { data: rows[0] ?? null, error: null }
  } catch (error) {
    console.error('Error updating update status:', error)
    return { data: null, error }
  }
}
