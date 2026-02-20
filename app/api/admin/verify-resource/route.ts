import { NextRequest, NextResponse } from 'next/server'
import { VerificationAgent } from '@/lib/ai-agents/verification-agent'
import type { ResourceSuggestion } from '@/lib/ai-agents/verification-agent'

/**
 * POST /api/admin/verify-resource
 *
 * Run verification agent on a specific resource
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { resource_id, suggestion } = body as {
      resource_id: string
      suggestion: ResourceSuggestion
    }

    if (!resource_id || !suggestion) {
      return NextResponse.json({ error: 'Missing resource_id or suggestion' }, { status: 400 })
    }

    // Initialize verification agent
    const agent = new VerificationAgent()

    // Run verification
    const result = await agent.verify(suggestion, 'triggered')

    // Log the verification
    // Note: For existing resources, suggestion_id is null since it's not from resource_suggestions table
    await agent.logVerification(null, resource_id, 'triggered', result)

    // Update the resource with verification results
    await agent.updateResourceWithVerificationResults(resource_id, suggestion, result)

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
