import { createClient } from '@/lib/supabase/client'
import OpenAI from 'openai'
import { env } from '@/lib/env'

export type AgentType = 'discovery' | 'enrichment' | 'verification'
export type AgentStatus = 'success' | 'failure' | 'partial'

interface AgentLogData {
  agent_type: AgentType
  status: AgentStatus
  resources_processed?: number
  resources_added?: number
  resources_updated?: number
  error_message?: string | null
  metadata?: Record<string, any> | null
  cost_cents?: number | null
}

/**
 * Base AI Agent class
 *
 * Provides common functionality for all AI agents:
 * - OpenAI client initialization
 * - Logging to ai_agent_logs table
 * - Cost tracking
 * - Error handling
 */
export abstract class BaseAgent {
  protected openai: OpenAI
  protected agentType: AgentType
  protected logId: string | null = null

  constructor(agentType: AgentType) {
    this.agentType = agentType

    // Initialize OpenAI client if API key is available
    if (env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      })
    } else {
      throw new Error('OPENAI_API_KEY is not configured')
    }
  }

  /**
   * Start agent execution and create log entry
   */
  protected async startLog(): Promise<string> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('ai_agent_logs')
      .insert({
        agent_type: this.agentType,
        status: 'success', // Will be updated on completion
        resources_processed: 0,
        resources_added: 0,
        resources_updated: 0,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to create agent log:', error)
      throw error
    }

    this.logId = data.id
    return data.id
  }

  /**
   * Update log entry with results
   */
  protected async updateLog(logData: Partial<AgentLogData>): Promise<void> {
    if (!this.logId) return

    const supabase = createClient()

    const { error } = await supabase
      .from('ai_agent_logs')
      .update({
        ...logData,
        completed_at: new Date().toISOString(),
      })
      .eq('id', this.logId)

    if (error) {
      console.error('Failed to update agent log:', error)
    }
  }

  /**
   * Calculate cost based on token usage
   * GPT-4o-mini pricing: $0.150 per 1M input tokens, $0.600 per 1M output tokens
   */
  protected calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * 0.15
    const outputCost = (outputTokens / 1_000_000) * 0.6
    return Math.round((inputCost + outputCost) * 100) // Return cost in cents
  }

  /**
   * Call OpenAI API with error handling and cost tracking
   */
  protected async callOpenAI(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
    }
  ): Promise<{
    content: string
    costCents: number
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: options?.model || 'gpt-4o-mini',
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens,
      })

      const content = response.choices[0]?.message?.content || ''
      const usage = response.usage

      const costCents = usage
        ? this.calculateCost(usage.prompt_tokens, usage.completion_tokens)
        : 0

      return { content, costCents }
    } catch (error) {
      console.error('OpenAI API error:', error)
      throw error
    }
  }

  /**
   * Abstract method that each agent must implement
   */
  abstract run(): Promise<void>
}
