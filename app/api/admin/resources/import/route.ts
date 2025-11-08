import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/resources/import
 * Bulk import resources from JSON (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const resources = body.resources

    if (!Array.isArray(resources)) {
      return NextResponse.json(
        { error: 'Resources must be an array' },
        { status: 400 }
      )
    }

    // Validate and prepare resources for insert
    const validResources = resources.map((resource) => ({
      name: resource.name,
      description: resource.description || null,
      primary_category: resource.primary_category,
      categories: resource.categories || null,
      tags: resource.tags || null,
      address: resource.address,
      city: resource.city || null,
      state: resource.state || 'CA',
      zip: resource.zip || null,
      latitude: resource.latitude || null,
      longitude: resource.longitude || null,
      phone: resource.phone || null,
      email: resource.email || null,
      website: resource.website || null,
      hours: resource.hours || null,
      services: resource.services || null,
      eligibility_requirements: resource.eligibility_requirements || null,
      required_documents: resource.required_documents || null,
      fees: resource.fees || null,
      languages: resource.languages || null,
      accessibility_features: resource.accessibility_features || null,
      status: resource.status || 'active',
      verified: resource.verified || false,
      source: 'admin_import',
    }))

    // Insert all resources
    const { data, error } = await supabase
      .from('resources')
      .insert(validResources)
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
      data,
    })
  } catch (error) {
    console.error('Error importing resources:', error)
    return NextResponse.json(
      {
        error: 'Failed to import resources',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
