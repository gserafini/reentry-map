import { sql } from '@/lib/db/client'
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
  metadata?: Record<string, unknown> | null
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
  protected startedAtMs: number | null = null

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
    this.startedAtMs = Date.now()

    const rows = await sql<{ id: string }[]>`
      INSERT INTO ai_agent_logs (agent_type, action, input, success)
      VALUES (
        ${this.agentType},
        ${'run'},
        ${JSON.stringify({ status: 'started' })}::jsonb,
        ${null}
      )
      RETURNING id
    `

    if (!rows[0]) {
      throw new Error('Failed to create agent log')
    }

    this.logId = rows[0].id
    return rows[0].id
  }

  /**
   * Update log entry with results
   */
  protected async updateLog(logData: Partial<AgentLogData>): Promise<void> {
    if (!this.logId) return

    try {
      const successValue =
        logData.status === 'success' ? true : logData.status === 'failure' ? false : null

      const outputPayload = {
        ...(logData.status ? { status: logData.status } : {}),
        ...(typeof logData.resources_processed === 'number'
          ? { resources_processed: logData.resources_processed }
          : {}),
        ...(typeof logData.resources_added === 'number'
          ? { resources_added: logData.resources_added }
          : {}),
        ...(typeof logData.resources_updated === 'number'
          ? { resources_updated: logData.resources_updated }
          : {}),
        ...(logData.metadata ? { metadata: logData.metadata } : {}),
      }

      const durationMs =
        typeof this.startedAtMs === 'number' ? Math.max(Date.now() - this.startedAtMs, 0) : null
      const costUsd =
        typeof logData.cost_cents === 'number'
          ? Number((logData.cost_cents / 100).toFixed(4))
          : null

      await sql`
        UPDATE ai_agent_logs SET
          success = COALESCE(${successValue}, success),
          error_message = COALESCE(${logData.error_message ?? null}, error_message),
          output = COALESCE(
            ${Object.keys(outputPayload).length > 0 ? JSON.stringify(outputPayload) : null}::jsonb,
            output
          ),
          cost = COALESCE(${costUsd}, cost),
          duration_ms = COALESCE(${durationMs}, duration_ms)
        WHERE id = ${this.logId}
      `
    } catch (error) {
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

      const costCents = usage ? this.calculateCost(usage.prompt_tokens, usage.completion_tokens) : 0

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
