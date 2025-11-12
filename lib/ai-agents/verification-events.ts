/**
 * Verification Event Emitter
 *
 * Emits real-time events during verification for Command Center display
 * and tracks AI API costs to ai_usage_logs table
 */

import { createClient } from '@/lib/supabase/client'

export type VerificationEventType = 'started' | 'progress' | 'cost' | 'completed' | 'failed'

export interface VerificationEvent {
  suggestion_id: string
  event_type: VerificationEventType
  event_data: Record<string, unknown>
}

export interface CostTrackingData {
  operation_type: 'verification' | 'enrichment' | 'url_autofix'
  provider: 'anthropic' | 'openai'
  model: string
  input_tokens: number
  output_tokens: number
  input_cost_usd: number
  output_cost_usd: number
  duration_ms?: number
  suggestion_id?: string
  resource_id?: string
  operation_context?: Record<string, unknown>
}

/**
 * Emit a verification event for real-time display in Command Center
 */
export async function emitVerificationEvent(event: VerificationEvent): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.from('verification_events').insert({
    suggestion_id: event.suggestion_id,
    event_type: event.event_type,
    event_data: event.event_data,
  })

  if (error) {
    console.error('Failed to emit verification event:', error)
  }
}

/**
 * Track AI API cost to ai_usage_logs table
 */
export async function trackAICost(data: CostTrackingData): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.from('ai_usage_logs').insert({
    operation_type: data.operation_type,
    provider: data.provider,
    model: data.model,
    input_tokens: data.input_tokens,
    output_tokens: data.output_tokens,
    input_cost_usd: data.input_cost_usd,
    output_cost_usd: data.output_cost_usd,
    duration_ms: data.duration_ms,
    suggestion_id: data.suggestion_id,
    resource_id: data.resource_id,
    operation_context: data.operation_context || {},
  })

  if (error) {
    console.error('Failed to track AI cost:', error)
  }

  // Also emit cost event for real-time display
  if (data.suggestion_id) {
    await emitVerificationEvent({
      suggestion_id: data.suggestion_id,
      event_type: 'cost',
      event_data: {
        operation: data.operation_type,
        model: data.model,
        total_cost_usd: data.input_cost_usd + data.output_cost_usd,
        tokens: data.input_tokens + data.output_tokens,
      },
    })
  }
}

/**
 * Calculate cost for Anthropic API usage
 * Pricing as of Jan 2025:
 * - Haiku 4.5: $0.80/1M input, $4.00/1M output
 * - Sonnet 4.5: $3.00/1M input, $15.00/1M output
 * - Opus 4: $15.00/1M input, $75.00/1M output
 */
export function calculateAnthropicCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): { input_cost_usd: number; output_cost_usd: number } {
  const pricing: Record<string, { input: number; output: number }> = {
    // Haiku 4.5 (January 2025 - fastest/cheapest)
    'claude-haiku-4-5-20250514': { input: 0.8, output: 4.0 },
    // Sonnet 4.5 (December 2024 - balanced)
    'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
    'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
    // Opus 4 (most capable)
    'claude-opus-4-20250514': { input: 15.0, output: 75.0 },
  }

  const rates = pricing[model] || pricing['claude-sonnet-4-20250514'] // Default to Sonnet

  const input_cost_usd = (inputTokens / 1_000_000) * rates.input
  const output_cost_usd = (outputTokens / 1_000_000) * rates.output

  return { input_cost_usd, output_cost_usd }
}

/**
 * Helper to emit progress update during verification
 */
export async function emitProgress(
  suggestion_id: string,
  step: string,
  status: 'running' | 'completed' | 'failed',
  details?: Record<string, unknown>
): Promise<void> {
  await emitVerificationEvent({
    suggestion_id,
    event_type: 'progress',
    event_data: {
      step,
      status,
      ...(details || {}),
    },
  })
}
