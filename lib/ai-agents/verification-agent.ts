/**
 * Verification Agent - Autonomous Adversarial Resource Verification
 *
 * This agent performs multi-level verification of resource submissions:
 * - Level 1: Automated checks (URL, phone, geocoding) - 10s
 * - Level 2: AI content verification - 30s
 * - Level 3: Cross-referencing external sources - 60s
 *
 * Implements adversarial checking to detect conflicts and ensure quality.
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import {
  checkUrlReachable,
  validatePhoneNumber,
  validateAddressGeocoding,
  extractWebsiteContent,
  search211Database,
  searchGoogleMaps,
  detectConflicts,
  calculateVerificationScore,
  autoFixUrl,
  enrichAddress,
  type VerificationChecks,
  type FieldConflict,
} from '@/lib/utils/verification'
import { emitVerificationEvent, emitProgress } from '@/lib/ai-agents/verification-events'
import type { ResourceSuggestion as BaseResourceSuggestion } from '@/lib/types/database'

// Extended type with fields added by verification_system migration
export interface ResourceSuggestion extends BaseResourceSuggestion {
  city?: string | null
  state?: string | null
  zip?: string | null
  latitude?: number | null
  longitude?: number | null
  email?: string | null
  hours?: Record<string, unknown> | null
  services_offered?: string[] | null
  eligibility_requirements?: string | null
  required_documents?: string[] | null
  fees?: string | null
  languages?: string[] | null
  accessibility_features?: string[] | null
  primary_category?: string | null
  categories?: string[] | null
  tags?: string[] | null
  admin_notes?: string | null
}

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
})

export interface VerificationResult {
  overall_score: number
  checks: VerificationChecks
  conflicts: FieldConflict[]
  changes_detected: Array<{
    field: string
    old_value: unknown
    new_value: unknown
  }>
  decision: 'auto_approve' | 'flag_for_human' | 'auto_reject'
  decision_reason: string
  estimated_cost_usd: number
  duration_ms: number
  api_calls_made: number
}

export class VerificationAgent {
  private agentVersion = 'verification-agent-v1.0.0'
  private startTime: number = 0
  private apiCallCount: number = 0
  private totalCost: number = 0

  /**
   * Verify a resource suggestion with full autonomous checks
   */
  async verify(
    suggestion: ResourceSuggestion,
    verificationType: 'initial' | 'periodic' | 'triggered' = 'initial'
  ): Promise<VerificationResult> {
    this.startTime = Date.now()
    this.apiCallCount = 0
    this.totalCost = 0

    console.log(`\n🔍 Starting ${verificationType} verification for: ${suggestion.name}`)

    // Emit started event for real-time monitoring
    await emitVerificationEvent({
      suggestion_id: suggestion.id,
      event_type: 'started',
      event_data: {
        name: suggestion.name,
        city: suggestion.city,
        state: suggestion.state,
        verification_type: verificationType,
      },
    }).catch((err) => console.error('Failed to emit started event:', err))

    // Initialize checks object
    const checks: Partial<VerificationChecks> = {}
    const conflicts: FieldConflict[] = []

    // ========================================================================
    // LEVEL 1: AUTOMATED CHECKS (10 seconds target)
    // ========================================================================

    console.log('  📋 Level 1: Automated checks...')

    // Check URL reachability (with auto-fix)
    if (suggestion.website) {
      await emitProgress(suggestion.id, '🌐 Checking website URL', 'running').catch((err) =>
        console.error('Failed to emit progress:', err)
      )

      checks.url_reachable = await checkUrlReachable(suggestion.website)
      console.log(
        `    ${checks.url_reachable.pass ? '✅' : '❌'} URL reachable: ${suggestion.website}`
      )

      // Auto-fix broken URLs
      if (!checks.url_reachable.pass) {
        console.log(`    🔧 Attempting to auto-fix URL with AI...`)

        await emitProgress(suggestion.id, '🔧 Auto-fixing broken URL with AI', 'running').catch(
          (err) => console.error('Failed to emit progress:', err)
        )

        const fixedUrl = await autoFixUrl(
          suggestion.name,
          suggestion.website,
          suggestion.city || undefined,
          suggestion.state || undefined
        )

        // Log AI usage for URL auto-fix if cost data is available
        if (fixedUrl.cost_usd && fixedUrl.input_tokens && fixedUrl.output_tokens) {
          await this.logAIUsage(
            'url_auto_fix',
            suggestion.id,
            null,
            fixedUrl.input_tokens,
            fixedUrl.output_tokens,
            fixedUrl.cost_usd
          )
        }

        if (fixedUrl.fixed && fixedUrl.new_url) {
          console.log(`    ✅ Fixed URL: ${fixedUrl.new_url}`)
          suggestion.website = fixedUrl.new_url
          checks.url_reachable = await checkUrlReachable(fixedUrl.new_url)

          await emitProgress(suggestion.id, 'URL auto-fix successful', 'completed', {
            old_url: suggestion.website,
            new_url: fixedUrl.new_url,
          }).catch((err) => console.error('Failed to emit progress:', err))
        } else {
          console.log(`    ❌ Could not auto-fix URL`)

          await emitProgress(suggestion.id, 'URL auto-fix failed', 'failed', {
            url: suggestion.website,
          }).catch((err) => console.error('Failed to emit progress:', err))
        }
      } else {
        await emitProgress(suggestion.id, 'Website URL reachable', 'completed', {
          url: suggestion.website,
        }).catch((err) => console.error('Failed to emit progress:', err))
      }
    }

    // Validate phone number
    if (suggestion.phone) {
      await emitProgress(suggestion.id, '📞 Validating phone number', 'running').catch((err) =>
        console.error('Failed to emit progress:', err)
      )

      checks.phone_valid = validatePhoneNumber(suggestion.phone)
      console.log(`    ${checks.phone_valid.pass ? '✅' : '❌'} Phone valid: ${suggestion.phone}`)

      await emitProgress(
        suggestion.id,
        `Phone validation ${checks.phone_valid.pass ? 'passed' : 'failed'}`,
        checks.phone_valid.pass ? 'completed' : 'failed',
        { phone: suggestion.phone, format: checks.phone_valid.format }
      ).catch((err) => console.error('Failed to emit progress:', err))
    }

    // Validate address geocoding (with auto-fix)
    if (suggestion.address) {
      await emitProgress(suggestion.id, '📍 Geocoding address', 'running').catch((err) =>
        console.error('Failed to emit progress:', err)
      )

      // First try: Enrich address with city/state/zip context
      const enrichedAddress = enrichAddress(
        suggestion.address,
        suggestion.city || undefined,
        suggestion.state || undefined,
        suggestion.zip || undefined
      )

      if (enrichedAddress.enriched) {
        console.log(`    🔧 Enriched address with: ${enrichedAddress.added_fields.join(', ')}`)
      }

      checks.address_geocodable = await validateAddressGeocoding(
        enrichedAddress.full_address,
        suggestion.city || undefined,
        suggestion.state || undefined,
        suggestion.zip || undefined
      )
      console.log(
        `    ${checks.address_geocodable.pass ? '✅' : '❌'} Address geocodable: ${enrichedAddress.full_address}`
      )

      await emitProgress(
        suggestion.id,
        `Address geocoding ${checks.address_geocodable.pass ? 'passed' : 'failed'}`,
        checks.address_geocodable.pass ? 'completed' : 'failed',
        {
          address: enrichedAddress.full_address,
          latitude: checks.address_geocodable.coords?.lat,
          longitude: checks.address_geocodable.coords?.lng,
        }
      ).catch((err) => console.error('Failed to emit progress:', err))
    }

    // ========================================================================
    // LEVEL 2: AI VERIFICATION (30 seconds target)
    // ========================================================================

    console.log('  🤖 Level 2: AI content verification...')

    if (suggestion.website) {
      await emitProgress(suggestion.id, '🤖 Running AI content verification', 'running').catch(
        (err) => console.error('Failed to emit progress:', err)
      )

      const websiteContent = await extractWebsiteContent(suggestion.website)

      if (websiteContent) {
        try {
          const verification = await this.verifyWebsiteContentWithAI(suggestion, websiteContent)
          checks.website_content_matches = {
            pass: verification.pass,
            confidence: verification.confidence,
            evidence: verification.evidence,
          }

          // Log AI usage for cost tracking
          await this.logAIUsage(
            'verification',
            suggestion.id,
            null,
            verification.input_tokens,
            verification.output_tokens,
            verification.cost_usd
          )

          console.log(
            `    ${verification.pass ? '✅' : '❌'} Website content matches (confidence: ${(verification.confidence * 100).toFixed(0)}%)`
          )
          console.log(
            `    💰 Claude API: ${verification.input_tokens} in + ${verification.output_tokens} out = $${verification.cost_usd.toFixed(4)}`
          )

          await emitProgress(
            suggestion.id,
            `AI content verification ${verification.pass ? 'passed' : 'failed'}`,
            verification.pass ? 'completed' : 'failed',
            {
              confidence: (verification.confidence * 100).toFixed(0) + '%',
              evidence: verification.evidence,
            }
          ).catch((err) => console.error('Failed to emit progress:', err))
        } catch (error) {
          console.error('    ❌ AI verification failed:', error)
          await emitProgress(suggestion.id, 'AI content verification failed', 'failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
          }).catch((err) => console.error('Failed to emit progress:', err))
        }
      }
    }

    // ========================================================================
    // LEVEL 3: CROSS-REFERENCING (60 seconds target)
    // ========================================================================

    console.log('  🔗 Level 3: Cross-referencing external sources...')

    await emitProgress(
      suggestion.id,
      '🔗 Cross-referencing with external sources',
      'running'
    ).catch((err) => console.error('Failed to emit progress:', err))

    const crossRefSources: Array<{ name: string; url?: string; match_score: number }> = []

    // Check 211 database
    const check211 = await search211Database(suggestion.name, suggestion.address || '')
    if (check211.found) {
      crossRefSources.push({
        name: '211',
        url: check211.url,
        match_score: check211.match_score || 0.8,
      })

      // Detect conflicts with 211 data
      if (check211.data) {
        const conflicts211 = detectConflicts(
          suggestion as unknown as Record<string, unknown>,
          check211.data as Record<string, unknown>,
          '211 Database'
        )
        conflicts.push(...conflicts211)
      }
    }

    // Check Google Maps
    const checkGoogleMaps = await searchGoogleMaps(suggestion.name, suggestion.address || '')
    if (checkGoogleMaps.found) {
      crossRefSources.push({
        name: 'Google Maps',
        url: checkGoogleMaps.place_id
          ? `https://maps.google.com/?cid=${checkGoogleMaps.place_id}`
          : undefined,
        match_score: checkGoogleMaps.match_score || 0.8,
      })

      // Detect conflicts with Google Maps data
      if (checkGoogleMaps.data) {
        const conflictsGM = detectConflicts(
          suggestion as unknown as Record<string, unknown>,
          checkGoogleMaps.data as Record<string, unknown>,
          'Google Maps'
        )
        conflicts.push(...conflictsGM)
      }
    }

    checks.cross_referenced = {
      pass: crossRefSources.length >= 1, // At least one external source
      sources: crossRefSources,
    }

    checks.conflict_detection = {
      pass: conflicts.length === 0,
      conflicts,
    }

    console.log(
      `    ${crossRefSources.length > 0 ? '✅' : '⚠️'} Cross-referenced: ${crossRefSources.length} sources`
    )
    console.log(`    ${conflicts.length === 0 ? '✅' : '⚠️'} Conflicts: ${conflicts.length}`)

    await emitProgress(suggestion.id, 'Cross-referencing completed', 'completed', {
      sources_found: crossRefSources.length,
      conflicts_found: conflicts.length,
      sources: crossRefSources.map((s) => s.name),
    }).catch((err) => console.error('Failed to emit progress:', err))

    // ========================================================================
    // SCORING AND DECISION
    // ========================================================================

    const overall_score = calculateVerificationScore(checks as VerificationChecks)
    const decision = this.makeDecision(overall_score, conflicts, checks as VerificationChecks)

    const duration_ms = Date.now() - this.startTime

    console.log(`\n  📊 Overall Score: ${(overall_score * 100).toFixed(0)}%`)
    console.log(`  🎯 Decision: ${decision.decision}`)
    console.log(`  ⏱️  Duration: ${duration_ms}ms`)
    console.log(`  💰 Estimated Cost: $${this.totalCost.toFixed(4)}`)

    // Emit completed event for real-time monitoring
    await emitVerificationEvent({
      suggestion_id: suggestion.id,
      event_type: 'completed',
      event_data: {
        decision: decision.decision,
        score: overall_score,
        duration_ms,
        total_cost_usd: this.totalCost,
        conflicts_found: conflicts.length,
        sources_verified: checks.cross_referenced?.sources.length || 0,
      },
    }).catch((err) => console.error('Failed to emit completed event:', err))

    return {
      overall_score,
      checks: checks as VerificationChecks,
      conflicts,
      changes_detected: [], // TODO: Implement for periodic verification
      decision: decision.decision,
      decision_reason: decision.reason,
      estimated_cost_usd: this.totalCost,
      duration_ms,
      api_calls_made: this.apiCallCount,
    }
  }

  /**
   * Use AI to verify website content matches submitted resource data
   */
  private async verifyWebsiteContentWithAI(
    suggestion: ResourceSuggestion,
    websiteContent: string
  ): Promise<{
    pass: boolean
    confidence: number
    evidence: string
    input_tokens: number
    output_tokens: number
    cost_usd: number
  }> {
    const prompt = `You are verifying a resource submission against its website content.

**Submitted Resource Data:**
- Name: ${suggestion.name}
- Category: ${suggestion.category}
- Description: ${suggestion.description || 'Not specified'}

**Website Content (first 5000 chars):**
${websiteContent}

**Task:**
Verify if the website content matches the submitted resource data. Check:
1. Does the organization name match or is very similar?
2. Do the services mentioned align with the submitted category and services?
3. Is the description consistent with what's on the website?

Respond in JSON format:
{
  "pass": true/false,
  "confidence": 0.0-1.0,
  "evidence": "Brief explanation of why it matches or doesn't match"
}

Be lenient but accurate. Minor differences in wording are okay. Focus on substantial mismatches.`

    const response = await anthropic.messages.create({
      model: env.ANTHROPIC_ENRICHMENT_MODEL,
      max_tokens: 1024,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // Extract JSON from response
    const textContent = response.content[0].type === 'text' ? response.content[0].text : '{}'

    // Handle markdown code blocks (use [\s\S] instead of /s flag for ES5 compatibility)
    const jsonMatch =
      textContent.match(/```json\n([\s\S]*?)\n```/) || textContent.match(/```\n([\s\S]*?)\n```/)
    const jsonStr = jsonMatch ? jsonMatch[1] : textContent

    const result = JSON.parse(jsonStr) as {
      pass: boolean
      confidence?: number
      evidence?: string
    }

    // Calculate cost: Claude Haiku 4.5 pricing
    // Input: $0.80 per 1M tokens, Output: $4.00 per 1M tokens
    const inputCost = (response.usage.input_tokens / 1_000_000) * 0.8
    const outputCost = (response.usage.output_tokens / 1_000_000) * 4.0
    const totalCost = inputCost + outputCost

    this.apiCallCount++
    this.totalCost += totalCost

    return {
      pass: result.pass === true,
      confidence: Math.min(Math.max(result.confidence || 0, 0), 1),
      evidence: result.evidence || 'No evidence provided',
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cost_usd: totalCost,
    }
  }

  /**
   * Make final verification decision based on score and checks
   */
  private makeDecision(
    score: number,
    conflicts: FieldConflict[],
    checks: VerificationChecks
  ): {
    decision: 'auto_approve' | 'flag_for_human' | 'auto_reject'
    reason: string
  } {
    // Auto-reject criteria (5% of cases)
    if (checks.url_reachable && !checks.url_reachable.pass) {
      return {
        decision: 'auto_reject',
        reason: 'Website URL is not reachable',
      }
    }

    if (score < 0.5) {
      return {
        decision: 'auto_reject',
        reason: `Overall verification score too low: ${(score * 100).toFixed(0)}%`,
      }
    }

    // Critical fields missing
    const criticalFieldsMissing = !checks.phone_valid || !checks.address_geocodable

    // High-confidence conflicts (score difference > 0.7)
    const highConfidenceConflicts = conflicts.filter((c) => c.confidence > 0.7)

    // Flag for human criteria (8% of cases)
    if (highConfidenceConflicts.length > 0) {
      return {
        decision: 'flag_for_human',
        reason: `${highConfidenceConflicts.length} high-confidence conflict(s) detected: ${highConfidenceConflicts.map((c) => c.field).join(', ')}`,
      }
    }

    if (criticalFieldsMissing) {
      return {
        decision: 'flag_for_human',
        reason: 'Critical fields missing or invalid (phone or address)',
      }
    }

    if (score < 0.7) {
      return {
        decision: 'flag_for_human',
        reason: `Verification score below auto-approve threshold: ${(score * 100).toFixed(0)}%`,
      }
    }

    // Needs at least 2 cross-references for auto-approval
    const crossRefCount = checks.cross_referenced?.sources.length || 0
    if (score >= 0.85 && crossRefCount < 2) {
      return {
        decision: 'flag_for_human',
        reason: 'Insufficient cross-reference sources (need at least 2)',
      }
    }

    // Auto-approve criteria (87% of cases)
    if (score >= 0.85 && crossRefCount >= 2 && conflicts.length === 0) {
      return {
        decision: 'auto_approve',
        reason: `High confidence (${(score * 100).toFixed(0)}%) with ${crossRefCount} cross-references and no conflicts`,
      }
    }

    // Default: flag for human if we're not confident enough
    return {
      decision: 'flag_for_human',
      reason: 'Does not meet auto-approve criteria',
    }
  }

  /**
   * Update resource with verification results and auto-fixed fields
   */
  async updateResourceWithVerificationResults(
    resourceId: string,
    suggestion: ResourceSuggestion,
    result: VerificationResult,
    supabaseClient?: Awaited<ReturnType<typeof createClient>>
  ): Promise<void> {
    const supabase = supabaseClient || (await createClient())

    // Build change log entry
    const changes: string[] = []
    if (suggestion.website) {
      changes.push(`website verified: ${suggestion.website}`)
    }
    if (result.checks.address_geocodable?.pass) {
      changes.push('address geocoded successfully')
    }
    if (result.checks.phone_valid?.pass) {
      changes.push('phone number validated')
    }

    const changeLogEntry = {
      timestamp: new Date().toISOString(),
      action: 'ai_verification',
      changes: changes,
      verification_score: result.overall_score,
      decision: result.decision,
    }

    // Fetch current change_log
    const { data: currentResource } = await supabase
      .from('resources')
      .select('change_log')
      .eq('id', resourceId)
      .single()

    const currentChangeLog = (currentResource?.change_log as unknown[]) || []
    const updatedChangeLog = [...currentChangeLog, changeLogEntry]

    // Update resource
    const { error } = await supabase
      .from('resources')
      .update({
        // Update verification metadata
        ai_last_verified: new Date().toISOString(),
        ai_verification_score: result.overall_score,

        // Update auto-fixed fields (only if they were actually fixed)
        ...(suggestion.website && { website: suggestion.website }),

        // Append to change log
        change_log: updatedChangeLog,
      })
      .eq('id', resourceId)

    if (error) {
      console.error('Failed to update resource:', error)
      // Don't throw - updating resource shouldn't break verification
    } else {
      console.log(`✅ Updated resource ${resourceId} with verification results`)
    }
  }

  /**
   * Log verification result to database
   */
  async logVerification(
    suggestionId: string | null,
    resourceId: string | null,
    verificationType: 'initial' | 'periodic' | 'triggered',
    result: VerificationResult
  ): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase.from('verification_logs').insert({
      resource_id: resourceId,
      suggestion_id: suggestionId,
      verification_type: verificationType,
      agent_version: this.agentVersion,
      overall_score: result.overall_score,
      checks_performed: result.checks,
      conflicts_found: result.conflicts,
      changes_detected: result.changes_detected,
      decision: result.decision,
      decision_reason: result.decision_reason,
      auto_approved: result.decision === 'auto_approve',
      started_at: new Date(this.startTime).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: result.duration_ms,
      api_calls_made: result.api_calls_made,
      estimated_cost_usd: result.estimated_cost_usd,
    })

    if (error) {
      console.error('Failed to log verification:', error)
      throw error
    }
  }

  /**
   * Auto-approve a suggestion and convert to resource
   */
  async autoApprove(suggestion: ResourceSuggestion): Promise<string> {
    const supabase = await createClient()

    // Create resource from suggestion
    const { data: resource, error: createError } = await supabase
      .from('resources')
      .insert({
        name: suggestion.name,
        description: suggestion.description,
        primary_category: suggestion.primary_category,
        categories: suggestion.categories,
        tags: suggestion.tags,
        address: suggestion.address,
        city: suggestion.city,
        state: suggestion.state,
        zip: suggestion.zip,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        phone: suggestion.phone,
        email: suggestion.email,
        website: suggestion.website,
        hours: suggestion.hours,
        services_offered: suggestion.services_offered,
        eligibility_requirements: suggestion.eligibility_requirements,
        required_documents: suggestion.required_documents,
        fees: suggestion.fees,
        languages: suggestion.languages,
        accessibility_features: suggestion.accessibility_features,
        status: 'active',
        verified: true,
        source: 'ai_verified',
        verification_status: 'verified',
      })
      .select('id')
      .single()

    if (createError) {
      console.error('Failed to create resource:', createError)
      throw createError
    }

    // Mark suggestion as approved
    await supabase
      .from('resource_suggestions')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', suggestion.id)

    console.log(`✅ Auto-approved and created resource: ${resource.id}`)
    return resource.id
  }

  /**
   * Flag a suggestion for human review
   */
  async flagForHuman(suggestion: ResourceSuggestion, reason: string): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('resource_suggestions')
      .update({
        status: 'pending',
        admin_notes: reason,
      })
      .eq('id', suggestion.id)

    console.log(`⚠️ Flagged for human review: ${reason}`)
  }

  /**
   * Auto-reject a suggestion
   */
  async autoReject(suggestion: ResourceSuggestion, reason: string): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('resource_suggestions')
      .update({
        status: 'rejected',
        admin_notes: `Auto-rejected: ${reason}`,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', suggestion.id)

    console.log(`❌ Auto-rejected: ${reason}`)
  }

  /**
   * Log AI API usage to database for cost tracking
   */
  private async logAIUsage(
    operationType: string,
    suggestionId: string,
    resourceId: string | null,
    inputTokens: number,
    outputTokens: number,
    _costUsd: number
  ): Promise<void> {
    try {
      const supabase = await createClient()

      // Calculate input/output costs separately for accurate tracking
      // Claude Haiku 4.5: Input $0.80/1M, Output $4.00/1M
      const inputCostUsd = (inputTokens / 1_000_000) * 0.8
      const outputCostUsd = (outputTokens / 1_000_000) * 4.0

      await supabase.from('ai_usage_logs').insert({
        operation_type: operationType,
        resource_id: resourceId,
        suggestion_id: suggestionId,
        provider: 'anthropic',
        model: env.ANTHROPIC_ENRICHMENT_MODEL,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        input_cost_usd: inputCostUsd,
        output_cost_usd: outputCostUsd,
        duration_ms: null, // We track this at verification level
        operation_context: {
          agent_version: this.agentVersion,
        },
      })
    } catch (error) {
      console.error('Failed to log AI usage:', error)
      // Don't throw - logging failure shouldn't break verification
    }
  }
}
