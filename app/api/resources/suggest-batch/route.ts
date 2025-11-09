import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

/**
 * POST /api/resources/suggest-batch
 *
 * Public API for AI agents to submit multiple resource suggestions efficiently.
 * Resources go into approval queue (resource_suggestions table) rather than direct import.
 *
 * Optimized for:
 * - Claude Code, Claude Web, and other AI agents
 * - Batch submissions (1-100 resources at once)
 * - Full provenance tracking
 * - Automatic duplicate detection
 */
export async function POST(request: NextRequest) {
  try {
    // Use service role client to bypass RLS for public API
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    )

    const body = (await request.json()) as {
      resources: unknown[]
      submitter?: string
      notes?: string
    }

    const { resources, submitter = 'ai_agent', notes } = body

    if (!Array.isArray(resources) || resources.length === 0) {
      return NextResponse.json({ error: 'Resources must be a non-empty array' }, { status: 400 })
    }

    if (resources.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 resources per batch' }, { status: 400 })
    }

    const results = {
      submitted: 0,
      skipped_duplicates: 0,
      errors: 0,
      error_details: [] as string[],
      suggestions: [] as unknown[],
    }

    // Process each resource
    for (const resource of resources) {
      try {
        // Extract resource data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = resource as any

        // Validate required fields
        if (!r.name || !r.address || !r.city || !r.state) {
          console.error('Missing required fields:', { name: r.name, address: r.address })
          results.errors++
          continue
        }

        // Check for existing resource (avoid suggesting duplicates)
        const { data: existingResource } = await supabase
          .from('resources')
          .select('id, name, address')
          .ilike('name', r.name)
          .ilike('address', r.address)
          .eq('city', r.city)
          .eq('state', r.state)
          .limit(1)
          .single()

        if (existingResource) {
          results.skipped_duplicates++
          continue
        }

        // Check for existing pending suggestion
        const { data: existingSuggestion } = await supabase
          .from('resource_suggestions')
          .select('id, name, address')
          .ilike('name', r.name)
          .ilike('address', r.address)
          .eq('status', 'pending')
          .limit(1)
          .single()

        if (existingSuggestion) {
          results.skipped_duplicates++
          continue
        }

        // Build comprehensive notes with all data
        const fullData = {
          // Basic info
          city: r.city,
          state: r.state,
          zip: r.zip || r.zip_code,

          // Extended info
          primary_category: r.primary_category,
          categories: r.categories,
          tags: r.tags,
          email: r.email,
          hours: r.hours,
          services_offered: r.services || r.services_offered,
          eligibility_requirements: r.eligibility_criteria || r.eligibility_requirements,
          required_documents: r.required_documents,
          fees: r.fees,
          languages: r.languages,
          accessibility_features: r.accessibility || r.accessibility_features,

          // Provenance
          source: r.source || {
            discovered_by: submitter,
            notes: notes,
          },
        }

        const notesText = `FULL RESOURCE DATA (JSON):
${JSON.stringify(fullData, null, 2)}

Provenance: ${r.source?.discovered_by || submitter}
Submitted: ${new Date().toISOString()}`

        // Create suggestion with simplified schema
        // Set suggested_by to NULL for public API submissions (bypasses RLS auth requirement)
        const { data: suggestion, error } = await supabase
          .from('resource_suggestions')
          .insert({
            suggested_by: null,
            name: r.name,
            address: r.address,
            phone: r.phone || null,
            website: r.website || null,
            description: r.description || null,
            category: r.primary_category || 'general_support',
            reason: notesText,
            status: 'pending',
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating suggestion:', error)
          results.errors++
          results.error_details.push(`${r.name}: ${error.message || JSON.stringify(error)}`)
        } else {
          results.submitted++
          results.suggestions.push(suggestion)
        }
      } catch (error) {
        console.error('Error processing resource:', error)
        results.errors++
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resourceName = (resource as any)?.name || 'Unknown resource'
        results.error_details.push(
          `${resourceName}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: `Submitted ${results.submitted} resource suggestions for admin review`,
      stats: {
        total_received: resources.length,
        submitted: results.submitted,
        skipped_duplicates: results.skipped_duplicates,
        errors: results.errors,
      },
      error_details: results.errors > 0 ? results.error_details : undefined,
      suggestions: results.suggestions,
      next_steps: 'Resources will appear in the admin suggestions queue for review and approval',
    })
  } catch (error) {
    console.error('Error in batch suggest:', error)
    return NextResponse.json(
      {
        error: 'Failed to submit suggestions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
