import { sql } from '@/lib/db/client'
import { ollamaChat, ollamaHealthCheck } from './ollama-client'
import type { OllamaMessage } from './ollama-client'

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
 * - Local Ollama model integration (primary, free)
 * - Logging to ai_agent_logs table
 * - Cost tracking
 * - Error handling
 */
export abstract class BaseAgent {
  protected agentType: AgentType
  protected logId: string | null = null
  protected startedAtMs: number | null = null

  constructor(agentType: AgentType) {
    this.agentType = agentType
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
   * Calculate cost — local models are free, return 0
   */
  protected calculateCost(_inputTokens: number, _outputTokens: number): number {
    return 0 // Local Ollama models = free
  }

  /**
   * Call local Ollama model with error handling and cost tracking.
   * This replaces the old callOpenAI method.
   */
  protected async callOllama(
    messages: OllamaMessage[],
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
    }
  ): Promise<{
    content: string
    costCents: number
  }> {
    const health = await ollamaHealthCheck(options?.model)
    if (!health.available) {
      throw new Error(`Ollama model not available: ${health.error}`)
    }

    const result = await ollamaChat(messages, {
      model: options?.model,
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens,
    })

    return { content: result.content, costCents: 0 }
  }

  /**
   * @deprecated Use callOllama instead. Kept for backward compatibility during migration.
   */
  protected async callOpenAI(
    messages: Array<{ role: string; content: string }>,
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
    }
  ): Promise<{
    content: string
    costCents: number
  }> {
    // Route through Ollama instead of OpenAI
    return this.callOllama(messages as OllamaMessage[], options)
  }

  /**
   * Abstract method that each agent must implement
   */
  abstract run(): Promise<void>
}
