import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const supabase = await createClient()

    // Build query based on available parameters
    let query = supabase
      .from('resources')
      .select('id, name, address, city, state, primary_category')

    // Exact name match (case-insensitive)
    if (name) {
      query = query.ilike('name', name)
    }

    // Exact address match (case-insensitive)
    if (address) {
      query = query.ilike('address', address)
    }

    // Filter by city and state if provided
    if (city) {
      query = query.eq('city', city)
    }
    if (state) {
      query = query.eq('state', state)
    }

    const { data: matches, error } = await query.limit(5)

    if (error) {
      console.error('Error checking duplicate:', error)
      return NextResponse.json({ error: 'Failed to check for duplicates' }, { status: 500 })
    }

    const isDuplicate = matches && matches.length > 0

    return NextResponse.json({
      isDuplicate,
      matchCount: matches?.length || 0,
      matches: matches || [],
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
