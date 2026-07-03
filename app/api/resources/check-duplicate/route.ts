import { NextRequest, NextResponse } from 'next/server'
import { checkForDuplicate } from '@/lib/utils/deduplication'
import { normalizeAddressType, normalizeServiceArea } from '@/lib/utils/resource-location'

function parseServiceAreaParam(value: string | null): unknown {
  if (!value) return null

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

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
  const addressType = normalizeAddressType(searchParams.get('address_type'))
  const serviceArea = normalizeServiceArea(parseServiceAreaParam(searchParams.get('service_area')))

  // At minimum, need name or address
  if (!name && !address) {
    return NextResponse.json(
      { error: 'Must provide at least name or address parameter' },
      { status: 400 }
    )
  }

  try {
    const duplicateResult = await checkForDuplicate({
      name: name || address || 'Unnamed resource',
      address: address || '',
      city,
      state,
      addressType,
      serviceArea,
    })

    const isDuplicate = duplicateResult.isDuplicate
    const matches =
      duplicateResult.existingResource && duplicateResult.existingResource.id
        ? [
            {
              id: duplicateResult.existingResource.id,
              name: duplicateResult.existingResource.name,
              address: duplicateResult.existingResource.address,
              city: duplicateResult.existingResource.city,
              state: duplicateResult.existingResource.state,
              primaryCategory: duplicateResult.existingResource.primary_category,
            },
          ]
        : []

    return NextResponse.json({
      isDuplicate,
      matchCount: matches?.length || 0,
      matches:
        matches?.map((m) => ({
          ...m,
          primary_category: m.primaryCategory || null,
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
