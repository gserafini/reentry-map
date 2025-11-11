import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { VerificationAgent } from '@/lib/ai-agents/verification-agent'
import type { ResourceSuggestion } from '@/lib/ai-agents/verification-agent'

/**
 * POST /api/admin/verify-resource
 *
 * Run verification agent on a specific resource
 */
export async function POST(request: NextRequest) {
  try {
    // Use service role client to bypass RLS for admin operations
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    )

    const body = await request.json()
    const { resource_id, suggestion } = body as {
      resource_id: string
      suggestion: ResourceSuggestion
    }

    if (!resource_id || !suggestion) {
      return NextResponse.json({ error: 'Missing resource_id or suggestion' }, { status: 400 })
    }

    console.log(`\n🔍 Verifying resource: ${suggestion.name}`)
    console.log(`   Resource ID: ${resource_id}`)
    console.log(`   Address: ${suggestion.address}`)
    console.log(`   Phone: ${suggestion.phone}`)
    console.log(`   Website: ${suggestion.website}`)

    // Initialize verification agent
    const agent = new VerificationAgent()

    // Run verification
    console.log(`\n🤖 Running verification agent...`)
    const result = await agent.verify(suggestion, 'triggered')

    // Log the verification
    // Note: For existing resources, suggestion_id is null since it's not from resource_suggestions table
    console.log(`\n📝 Logging verification to database...`)
    await agent.logVerification(null, resource_id, 'triggered', result)

    // Update the resource with verification results (using service role client)
    console.log(`\n📝 Updating resource with verification results...`)
    await agent.updateResourceWithVerificationResults(resource_id, suggestion, result, supabase)

    console.log(`\n✅ Verification complete`)

    return NextResponse.json({
      success: true,
      resource_id,
      resource_name: suggestion.name,
      result,
    })
  } catch (error) {
    console.error('\n❌ Error running verification:')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))

    // Extract meaningful error message
    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error, Object.getOwnPropertyNames(error))
    } else if (typeof error === 'string') {
      errorMessage = error
    }

    return NextResponse.json(
      {
        error: 'Failed to run verification',
        message: errorMessage,
        type: error?.constructor?.name || typeof error,
        details: typeof error === 'object' ? error : undefined,
      },
      { status: 500 }
    )
  }
}
