import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkForDuplicate, detectParentChildRelationships } from '@/lib/utils/deduplication'

/**
 * POST /api/admin/resources/import
 * Bulk import resources from JSON with intelligent deduplication
 * - Skips exact duplicates
 * - Updates similar resources
 * - Auto-detects parent-child relationships
 * - Tracks provenance for all changes
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Allow testing bypass with special header in development
    const testingBypass = request.headers.get('x-testing-bypass') === 'true'
    const isDevelopment = process.env.NODE_ENV === 'development'

    if (!testingBypass || !isDevelopment) {
      // Normal authentication flow
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
    }

    const body = (await request.json()) as { resources: unknown[] }
    const resources = body.resources

    if (!Array.isArray(resources)) {
      return NextResponse.json({ error: 'Resources must be an array' }, { status: 400 })
    }

    // Validate and prepare resources for import
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validResources = resources.map((resource: any) => ({
      name: resource.name,
      description: resource.description || null,
      primary_category: resource.primary_category,
      categories: resource.categories || null,
      tags: resource.tags || null,
      address: resource.address,
      city: resource.city || null,
      state: resource.state || 'CA',
      zip: resource.zip || resource.zip_code || null,
      latitude: resource.latitude || null,
      longitude: resource.longitude || null,
      phone: resource.phone || null,
      email: resource.email || null,
      website: resource.website || null,
      hours: resource.hours || null,
      services_offered: resource.services || resource.services_offered || null,
      eligibility_requirements:
        resource.eligibility_criteria || resource.eligibility_requirements || null,
      required_documents: resource.required_documents || null,
      fees: resource.fees || null,
      languages: resource.languages || null,
      accessibility_features: resource.accessibility || resource.accessibility_features || null,
      status: resource.status || 'active',
      verified: resource.verified || false,
      ai_enriched: resource.ai_enriched || false,
      completeness_score: resource.completeness_score || null,
      verification_score: resource.verification_score || null,
      source: 'admin_import',
    }))

    // Stats tracking
    let skipped = 0
    let updated = 0
    let created = 0
    let errors = 0
    const createdResources: unknown[] = []
    const skippedResources: string[] = []
    const updatedResources: string[] = []

    // Auto-detect parent-child relationships
    const multiLocationOrgs = await detectParentChildRelationships(validResources)
    const parentChildMap = new Map<string, string>() // resource name → parent org name

    // Mark resources that should be children
    multiLocationOrgs.forEach((locations, orgName) => {
      locations.forEach((location) => {
        parentChildMap.set(location.name, orgName)
      })
    })

    // Process each resource with deduplication
    for (const resource of validResources) {
      try {
        const dupeCheck = await checkForDuplicate(resource)

        if (dupeCheck.isDuplicate && dupeCheck.suggestedAction === 'skip') {
          // Exact duplicate - skip
          skipped++
          skippedResources.push(resource.name)
          continue
        }

        if (dupeCheck.isDuplicate && dupeCheck.suggestedAction === 'update') {
          // Similar resource exists - update it
          const { error } = await supabase
            .from('resources')
            .update({
              ...resource,
              updated_at: new Date().toISOString(),
            })
            .eq('id', dupeCheck.existingResource!.id)

          if (error) {
            console.error(`Error updating ${resource.name}:`, error)
            errors++
          } else {
            updated++
            updatedResources.push(resource.name)
          }
          continue
        }

        // Check if this should be a child location
        const parentOrgName = parentChildMap.get(resource.name)
        if (parentOrgName && multiLocationOrgs.has(parentOrgName)) {
          const siblings = multiLocationOrgs.get(parentOrgName)!

          // Check if parent already exists
          const { data: existingParent } = await supabase
            .from('resources')
            .select('id')
            .eq('org_name', parentOrgName)
            .eq('is_parent', true)
            .limit(1)
            .single()

          let parentId: string | null = null

          if (!existingParent) {
            // Create parent resource (virtual aggregation)
            // Use first location's data as template
            const firstLocation = siblings[0]
            const { data: newParent, error: parentError } = await supabase
              .from('resources')
              .insert({
                name: parentOrgName,
                org_name: parentOrgName,
                is_parent: true,
                description: `${parentOrgName} serves the community through multiple locations.`,
                primary_category: firstLocation.primary_category,
                categories: firstLocation.categories,
                address: firstLocation.address, // Use first location's address as primary
                city: firstLocation.city,
                state: firstLocation.state,
                zip: firstLocation.zip,
                latitude: firstLocation.latitude,
                longitude: firstLocation.longitude,
                phone: firstLocation.phone,
                website: firstLocation.website,
                status: 'active',
                source: 'auto_created_parent',
              })
              .select('id')
              .single()

            if (parentError) {
              console.error(`Error creating parent for ${parentOrgName}:`, parentError)
            } else {
              parentId = newParent?.id || null
            }
          } else {
            parentId = existingParent.id
          }

          // Create child with parent reference
          const { data: childData, error: childError } = await supabase
            .from('resources')
            .insert({
              ...resource,
              parent_resource_id: parentId,
              org_name: parentOrgName,
              location_name: resource.name.replace(parentOrgName, '').trim(),
            })
            .select()

          if (childError) {
            console.error(`Error creating child ${resource.name}:`, childError)
            errors++
          } else {
            created++
            createdResources.push(childData?.[0])
          }
        } else {
          // Create new standalone resource
          const { data: newData, error: insertError } = await supabase
            .from('resources')
            .insert(resource)
            .select()

          if (insertError) {
            console.error(`Error inserting ${resource.name}:`, insertError)
            errors++
          } else {
            created++
            createdResources.push(newData?.[0])
          }
        }
      } catch (error) {
        console.error(`Error processing ${resource.name}:`, error)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        total: validResources.length,
        created,
        updated,
        skipped,
        errors,
      },
      details: {
        created: createdResources.length,
        skipped: skippedResources,
        updated: updatedResources,
      },
      multiLocationOrgs: Array.from(multiLocationOrgs.keys()),
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
