import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { db } from '@/lib/db/client'
import { resources } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { checkForDuplicate, detectParentChildRelationships } from '@/lib/utils/deduplication'
import type { NewResource, Resource } from '@/lib/db/schema'

/**
 * POST /api/admin/resources/import
 * Bulk import resources from JSON with intelligent deduplication
 * - Skips exact duplicates
 * - Updates similar resources
 * - Auto-detects parent-child relationships
 * - Tracks provenance for all changes
 *
 * Authentication:
 * - Session-based (browser/Claude Web): Automatic via NextAuth
 * - API key (Claude Code/scripts): Include header `x-admin-api-key: your-key`
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.authMethod === 'none' ? 401 : 403 }
      )
    }

    const body = (await request.json()) as { resources: unknown[] }
    const resourceList = body.resources

    if (!Array.isArray(resourceList)) {
      return NextResponse.json({ error: 'Resources must be an array' }, { status: 400 })
    }

    // Validate and prepare resources for import with provenance tracking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validResources = resourceList.map((resource: any) => {
      // Extract source provenance if available
      const sourceData = resource.source || {}
      const sourceName =
        sourceData.discovered_by || sourceData.name || sourceData.research_method || 'admin_import'

      // Build initial change_log entry with full provenance
      const initialChangeLog = [
        {
          timestamp: new Date().toISOString(),
          action: 'created',
          source: sourceName,
          user_id: null, // Set by trigger if authenticated
          user_email: null, // Set by trigger if authenticated
          initial_data: {
            name: resource.name,
            address: resource.address,
            city: resource.city,
            state: resource.state,
            primary_category: resource.primary_category,
          },
          // Add detailed provenance if available
          ...(resource.source && {
            provenance: {
              source_name: sourceData.name,
              source_url: sourceData.url,
              accessed_date: sourceData.accessed_date,
              research_method: sourceData.research_method,
              discovered_by: sourceData.discovered_by,
              notes: sourceData.notes,
            },
          }),
        },
      ]

      return {
        name: resource.name,
        description: resource.description || null,
        primaryCategory: resource.primary_category,
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
        servicesOffered: resource.services || resource.services_offered || null,
        eligibilityRequirements:
          resource.eligibility_criteria || resource.eligibility_requirements || null,
        requiredDocuments: resource.required_documents || null,
        fees: resource.fees || null,
        languages: resource.languages || null,
        accessibilityFeatures: resource.accessibility || resource.accessibility_features || null,
        status: resource.status || 'active',
        verified: resource.verified || false,
        aiEnriched: resource.ai_enriched || false,
        dataCompletenessScore: resource.completeness_score || null,
        aiVerificationScore: resource.verification_score || null,
        source: sourceName,
        changeLog: initialChangeLog,
      } satisfies NewResource
    })

    // Stats tracking
    let skipped = 0
    let updated = 0
    let created = 0
    let errors = 0
    const createdResources: Resource[] = []
    const skippedResources: string[] = []
    const updatedResources: string[] = []
    const errorDetails: string[] = []

    // Auto-detect parent-child relationships
    const multiLocationOrgs = await detectParentChildRelationships(validResources)
    const parentChildMap = new Map<string, string>() // resource name -> parent org name

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
          try {
            await db
              .update(resources)
              .set({
                ...resource,
                updatedAt: new Date(),
              })
              .where(eq(resources.id, dupeCheck.existingResource!.id))

            updated++
            updatedResources.push(resource.name)
          } catch (updateError) {
            const updErrMsg =
              updateError instanceof Error ? updateError.message : String(updateError)
            console.error(`Error updating ${resource.name}:`, updateError)
            errors++
            errorDetails.push(`${resource.name} (update): ${updErrMsg}`)
          }
          continue
        }

        // Check if this should be a child location
        const parentOrgName = parentChildMap.get(resource.name)
        if (parentOrgName && multiLocationOrgs.has(parentOrgName)) {
          const siblings = multiLocationOrgs.get(parentOrgName)!

          // Check if parent already exists
          const [existingParent] = await db
            .select({ id: resources.id })
            .from(resources)
            .where(and(eq(resources.orgName, parentOrgName), eq(resources.isParent, true)))
            .limit(1)

          let parentId: string | null = null

          if (!existingParent) {
            // Create parent resource (virtual aggregation)
            // Use first location's data as template
            // firstLocation is ImportResource with camelCase keys from our validResources mapping
            const firstLocation = siblings[0] as unknown as NewResource
            try {
              const [newParent] = await db
                .insert(resources)
                .values({
                  name: parentOrgName,
                  orgName: parentOrgName,
                  isParent: true,
                  description: `${parentOrgName} serves the community through multiple locations.`,
                  primaryCategory: firstLocation.primaryCategory,
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
                } satisfies NewResource)
                .returning({ id: resources.id })

              parentId = newParent?.id || null
            } catch (parentError) {
              const parErrMsg =
                parentError instanceof Error ? parentError.message : String(parentError)
              console.error(`Error creating parent for ${parentOrgName}:`, parentError)
              errorDetails.push(`${resource.name} (parent create): ${parErrMsg}`)
            }
          } else {
            parentId = existingParent.id
          }

          // Create child with parent reference
          try {
            const [childData] = await db
              .insert(resources)
              .values({
                ...resource,
                parentResourceId: parentId,
                orgName: parentOrgName,
                locationName: resource.name.replace(parentOrgName, '').trim(),
              })
              .returning()

            created++
            if (childData) {
              createdResources.push(childData)
            }
          } catch (childError) {
            console.error(`Error creating child ${resource.name}:`, childError)
            errors++
          }
        } else {
          // Create new standalone resource
          try {
            const [newData] = await db.insert(resources).values(resource).returning()

            created++
            if (newData) {
              createdResources.push(newData)
            }
          } catch (insertError) {
            const insErrMsg =
              insertError instanceof Error ? insertError.message : String(insertError)
            console.error(`Error inserting ${resource.name}:`, insertError)
            errors++
            errorDetails.push(`${resource.name} (insert): ${insErrMsg}`)
          }
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error)
        console.error(`Error processing ${resource.name}:`, error)
        errors++
        errorDetails.push(`${resource.name}: ${errMsg}`)
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
      ...(errorDetails.length > 0 && { error_details: errorDetails }),
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
