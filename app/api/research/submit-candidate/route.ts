import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { db, sql } from '@/lib/db/client'
import { expansionPriorities, resources } from '@/lib/db/schema'
import { checkForDuplicate } from '@/lib/utils/deduplication'
import {
  normalizeAddressType,
  normalizeServiceArea,
  requiresServiceArea,
  requiresStreetAddress,
} from '@/lib/utils/resource-location'

type SubmitCandidateBody = {
  task_id: string
  name: string
  address?: string
  address_type?: string
  service_area?: unknown
  city?: string
  state?: string
  zip?: string
  phone?: string
  email?: string
  website?: string
  description?: string
  category?: string
  primary_category?: string
  services_offered?: string[]
  hours?: Record<string, unknown>
  eligibility_requirements?: string
  discovered_via?: string
  discovery_notes?: string
  source_url?: string
}

type CountRow = {
  count: number | string
}

type ExistingDuplicateRow = {
  id: string
  name: string
  primary_category: string | null
}

function trimToNull(value: string | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeCategory(value: string | undefined): string | null {
  const trimmed = trimToNull(value)
  return trimmed ? trimmed.replace(/_/g, '-') : null
}

function parseCount(value: number | string | undefined, fallback: number): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    if (!Number.isNaN(parsed)) return parsed
  }
  return fallback
}

/**
 * POST /api/research/submit-candidate
 * Trusted intake for internal research agents.
 *
 * This route publishes resources live immediately, then leaves them in
 * pending verification for later sweeps.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    const body = (await request.json()) as SubmitCandidateBody
    const taskId = trimToNull(body.task_id)
    const name = trimToNull(body.name)
    const category = normalizeCategory(body.category || body.primary_category)
    const discoveryNotes = trimToNull(body.discovery_notes)
    const discoveredVia = trimToNull(body.discovered_via) || 'websearch'
    const addressType = normalizeAddressType(body.address_type)
    const serviceArea = normalizeServiceArea(body.service_area)
    const website = trimToNull(body.website)
    const phone = trimToNull(body.phone)
    const email = trimToNull(body.email)
    const description = trimToNull(body.description)
    const zip = trimToNull(body.zip)

    if (!taskId) {
      return NextResponse.json(
        {
          error: 'task_id is required',
          details: 'Must include task_id from GET /api/research/next',
        },
        { status: 400 }
      )
    }

    if (!name) {
      return NextResponse.json(
        { error: 'name is required', details: 'Resource must have a name' },
        { status: 400 }
      )
    }

    if (!category) {
      return NextResponse.json(
        { error: 'category is required', details: 'Resource must have a primary category' },
        { status: 400 }
      )
    }

    if (!discoveryNotes) {
      return NextResponse.json(
        {
          error: 'discovery_notes is required',
          details: 'Document how this resource was found and which source confirmed it.',
        },
        { status: 400 }
      )
    }

    const [task] = await db
      .select()
      .from(expansionPriorities)
      .where(eq(expansionPriorities.id, taskId))
      .limit(1)

    if (!task) {
      return NextResponse.json(
        { error: 'Expansion priority not found', details: 'Invalid task_id or task was deleted' },
        { status: 404 }
      )
    }

    const city = trimToNull(body.city) || task.city
    const state = trimToNull(body.state) || task.state
    const candidateAddress = trimToNull(body.address)
    const address = requiresStreetAddress(addressType) ? candidateAddress || '' : ''

    if (requiresStreetAddress(addressType) && !address) {
      return NextResponse.json(
        {
          error: 'Address is required',
          details: 'Physical resources must include a street address.',
        },
        { status: 400 }
      )
    }

    if (requiresServiceArea(addressType) && !serviceArea) {
      return NextResponse.json(
        {
          error: 'service_area is required',
          details: `${addressType} resources must include a valid service_area payload.`,
        },
        { status: 400 }
      )
    }

    if (!address && !website && !phone) {
      return NextResponse.json(
        {
          error: 'Insufficient contact information',
          details: 'Must include at least one of: address, website, or phone',
        },
        { status: 400 }
      )
    }

    if (addressType === 'physical' && address) {
      const dupeCheck = await checkForDuplicate({
        name,
        address,
        city,
        state,
        zip,
      })

      if (dupeCheck.isDuplicate && dupeCheck.existingResource) {
        return NextResponse.json(
          {
            error: 'Possible duplicate resource',
            details: 'A matching physical resource already exists.',
            duplicate: {
              id: dupeCheck.existingResource.id,
              name: dupeCheck.existingResource.name,
              match_type: dupeCheck.matchType,
              suggested_action: dupeCheck.suggestedAction,
            },
          },
          { status: 409 }
        )
      }
    } else {
      const existingRows = await sql<ExistingDuplicateRow[]>`
        SELECT id, name, primary_category
        FROM resources
        WHERE LOWER(name) = LOWER(${name})
          AND LOWER(COALESCE(city, '')) = LOWER(${city})
          AND LOWER(COALESCE(state, '')) = LOWER(${state})
          AND LOWER(COALESCE(address_type, 'physical')) = LOWER(${addressType})
          AND status = 'active'
        LIMIT 1
      `

      if (existingRows[0]) {
        return NextResponse.json(
          {
            error: 'Possible duplicate resource',
            details: 'A matching non-physical resource already exists.',
            duplicate: existingRows[0],
          },
          { status: 409 }
        )
      }
    }

    const resourceName = name
    const primaryCategory = category
    const requiredDiscoveryNotes = discoveryNotes

    const provenance = {
      intake_method: 'trusted_agent_intake',
      submitted_via: auth.authMethod === 'session' ? 'browser_form' : 'api',
      expansion_priority_id: task.id,
      expansion_city: task.city,
      expansion_state: task.state,
      discovered_via: discoveredVia,
      discovery_notes: requiredDiscoveryNotes,
      source_url: trimToNull(body.source_url) || website,
      submitted_at: new Date().toISOString(),
      submitted_by: auth.userId || auth.authMethod,
    }

    const [created] = await db
      .insert(resources)
      .values({
        name: resourceName,
        description,
        primaryCategory,
        categories: [primaryCategory],
        address,
        addressType,
        serviceArea,
        city,
        state,
        zip,
        county: task.county || null,
        phone,
        email,
        website,
        hours: body.hours || null,
        servicesOffered: body.services_offered || null,
        eligibilityRequirements: trimToNull(body.eligibility_requirements),
        status: 'active',
        source: 'trusted_research_intake',
        aiDiscovered: true,
        verified: false,
        verificationStatus: 'pending',
        humanReviewRequired: false,
        provenance,
      })
      .returning({ id: resources.id })

    const countRows = await sql<CountRow[]>`
      SELECT COUNT(*)::int AS count
      FROM resources
      WHERE LOWER(COALESCE(city, '')) = LOWER(${city})
        AND LOWER(COALESCE(state, '')) = LOWER(${state})
        AND status = 'active'
    `

    const found = parseCount(countRows[0]?.count, (task.currentResourceCount || 0) + 1)
    const target = task.targetResourceCount || 50
    const remaining = Math.max(0, target - found)
    const taskComplete = remaining <= 0

    await db
      .update(expansionPriorities)
      .set({
        currentResourceCount: found,
        researchStatus: taskComplete ? 'completed' : task.researchStatus || 'researching',
        researchAgentCompletedAt: taskComplete ? new Date() : task.researchAgentCompletedAt || null,
      })
      .where(eq(expansionPriorities.id, taskId))

    return NextResponse.json({
      success: true,
      resource_id: created.id,
      task_progress: {
        found,
        target,
        remaining,
        task_complete: taskComplete,
      },
      next_action: taskComplete
        ? 'Task complete. Call GET /api/research/next for the next city.'
        : `Continue researching ${city}, ${state}. ${remaining} more resource(s) needed for this target.`,
    })
  } catch (error) {
    console.error('Error in research/submit-candidate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
