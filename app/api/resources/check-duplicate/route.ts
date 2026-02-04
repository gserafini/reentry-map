import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { resources } from '@/lib/db/schema'
import { ilike, eq, and } from 'drizzle-orm'

/**
 * GET /api/resources/check-duplicate?name=...&address=...&city=...&state=...
 *
 * Fast duplicate check endpoint for Claude Web and other agents
 * Returns whether a resource already exists in the database
 *
 * Public endpoint (no auth required) - designed for efficient batch lookups
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const name = searchParams.get('name')
  const address = searchParams.get('address')
  const city = searchParams.get('city')
  const state = searchParams.get('state')

  // At minimum, need name or address
  if (!name && !address) {
    return NextResponse.json(
      { error: 'Must provide at least name or address parameter' },
      { status: 400 }
    )
  }

  try {
    // Build conditions
    const conditions = []

    // Exact name match (case-insensitive)
    if (name) {
      conditions.push(ilike(resources.name, name))
    }

    // Exact address match (case-insensitive)
    if (address) {
      conditions.push(ilike(resources.address, address))
    }

    // Filter by city and state if provided
    if (city) {
      conditions.push(eq(resources.city, city))
    }
    if (state) {
      conditions.push(eq(resources.state, state))
    }

    const matches = await db
      .select({
        id: resources.id,
        name: resources.name,
        address: resources.address,
        city: resources.city,
        state: resources.state,
        primaryCategory: resources.primaryCategory,
      })
      .from(resources)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .limit(5)

    const isDuplicate = matches && matches.length > 0

    return NextResponse.json({
      isDuplicate,
      matchCount: matches?.length || 0,
      matches:
        matches?.map((m) => ({
          ...m,
          primary_category: m.primaryCategory,
        })) || [],
      message: isDuplicate
        ? `Found ${matches.length} potential duplicate(s)`
        : 'No duplicates found - safe to add',
    })
  } catch (error) {
    console.error('Error in duplicate check:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
