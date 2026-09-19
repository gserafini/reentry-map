/**
 * Ollama Client — lightweight wrapper for Ollama's OpenAI-compatible API
 *
 * Used for background enrichment/verification tasks that can run on local
 * models (Qwen3 Coder 30B, Gemma 4 26B) instead of paid cloud APIs.
 *
 * Ollama exposes an OpenAI-compatible endpoint at /v1/chat/completions,
 * so this wraps it with our cost-tracking and error-handling conventions.
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_ENRICHMENT_MODEL = process.env.OLLAMA_ENRICHMENT_MODEL || 'qwen3-coder:30b'

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OllamaCompletionResult {
  content: string
  model: string
  totalDurationMs: number
  evalTokens: number
  tokensPerSec: number
}

/** Shape of Ollama's OpenAI-compatible chat response */
interface OllamaChatResponse {
  model?: string
  choices?: Array<{ message?: { content?: string } }>
  usage?: { completion_tokens?: number }
}

/** Shape of Ollama's native /api/generate response */
interface OllamaGenerateResponse {
  response?: string
  model?: string
  total_duration?: number
  eval_duration?: number
  eval_count?: number
}

/** Shape of Ollama's /api/tags response */
interface OllamaTagsResponse {
  models?: Array<{ name: string }>
}

/**
 * Call the local Ollama model via its OpenAI-compatible chat endpoint.
 * Returns structured result with timing info.
 */
export async function ollamaChat(
  messages: OllamaMessage[],
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
    timeoutMs?: number
  }
): Promise<OllamaCompletionResult> {
  const model = options?.model || OLLAMA_ENRICHMENT_MODEL
  const timeoutMs = options?.timeoutMs || 120_000 // 2 min default for local models

  const response = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.1,
      max_tokens: options?.maxTokens || 1024,
      stream: false,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown error')
    throw new Error(`Ollama API error ${response.status}: ${errorText}`)
  }

  const data = (await response.json()) as OllamaChatResponse
  const content = data.choices?.[0]?.message?.content || ''
  const usage = data.usage || {}

  return {
    content,
    model: data.model || model,
    totalDurationMs: 0, // OpenAI-compat endpoint doesn't expose this directly
    evalTokens: usage.completion_tokens || 0,
    tokensPerSec: 0, // Not available via OpenAI-compat endpoint
  }
}

/**
 * Call Ollama's native /api/generate endpoint for more control and timing info.
 * Better for batch processing where we want detailed perf metrics.
 */
export async function ollamaGenerate(
  prompt: string,
  options?: {
    model?: string
    system?: string
    temperature?: number
    timeoutMs?: number
  }
): Promise<OllamaCompletionResult> {
  const model = options?.model || OLLAMA_ENRICHMENT_MODEL
  const timeoutMs = options?.timeoutMs || 120_000

  const body: Record<string, unknown> = {
    model,
    prompt,
    temperature: options?.temperature ?? 0.1,
    stream: false,
  }

  if (options?.system) {
    body.system = options.system
  }

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown error')
    throw new Error(`Ollama generate error ${response.status}: ${errorText}`)
  }

  const data = (await response.json()) as OllamaGenerateResponse

  const evalDurationNs = data.eval_duration || 1
  const evalCount = data.eval_count || 0

  return {
    content: data.response || '',
    model: data.model || model,
    totalDurationMs: Math.round((data.total_duration || 0) / 1e6),
    evalTokens: evalCount,
    tokensPerSec: evalCount / (evalDurationNs / 1e9),
  }
}

// ── Tool-calling support ───────────────────────────────────────────────────

/** Tool definition compatible with Ollama's native /api/chat tool format */
export interface OllamaTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, { type: string; description: string }>
      required?: string[]
    }
  }
}

/** A tool call returned by the model */
export interface OllamaToolCall {
  function: {
    name: string
    arguments: Record<string, unknown>
  }
}

/** Handler that executes a tool and returns the result as a string */
export type ToolHandler = (args: Record<string, unknown>) => Promise<string>

/** Native /api/chat response shape (supports tool_calls) */
interface OllamaNativeChatResponse {
  message?: {
    role: string
    content: string
    tool_calls?: Array<{
      function: { name: string; arguments: Record<string, unknown> }
    }>
  }
  total_duration?: number
  eval_count?: number
  eval_duration?: number
}

/**
 * Run an agentic tool-use loop: send messages to the model, execute any tool
 * calls it makes, feed results back, and repeat until the model produces a
 * final text response (up to maxRounds to prevent infinite loops).
 *
 * Uses Ollama's native /api/chat endpoint which supports tool definitions.
 */
export async function ollamaChatWithTools(
  messages: Array<{ role: string; content: string }>,
  tools: OllamaTool[],
  toolHandlers: Record<string, ToolHandler>,
  options?: {
    model?: string
    temperature?: number
    maxRounds?: number
    timeoutMs?: number
  }
): Promise<OllamaCompletionResult> {
  const model = options?.model || OLLAMA_ENRICHMENT_MODEL
  const maxRounds = options?.maxRounds || 5
  const timeoutMs = options?.timeoutMs || 180_000 // 3 min for multi-turn
  const conversationMessages = [...messages]
  let totalEvalTokens = 0

  for (let round = 0; round < maxRounds; round++) {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: conversationMessages,
        tools,
        stream: false,
        options: { temperature: options?.temperature ?? 0.1 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown error')
      throw new Error(`Ollama tool-chat error ${response.status}: ${errorText}`)
    }

    const data = (await response.json()) as OllamaNativeChatResponse
    const msg = data.message
    totalEvalTokens += data.eval_count || 0

    if (!msg) throw new Error('Ollama returned no message')

    // If model produced tool calls, execute them and continue the loop
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      conversationMessages.push({ role: 'assistant', content: msg.content || '' })

      for (const tc of msg.tool_calls) {
        const handler = toolHandlers[tc.function.name]
        if (!handler) {
          conversationMessages.push({
            role: 'tool',
            content: JSON.stringify({ error: `Unknown tool: ${tc.function.name}` }),
          })
          continue
        }

        try {
          const result = await handler(tc.function.arguments)
          conversationMessages.push({ role: 'tool', content: result })
        } catch (err) {
          conversationMessages.push({
            role: 'tool',
            content: JSON.stringify({
              error: err instanceof Error ? err.message : 'Tool execution failed',
            }),
          })
        }
      }
      continue // Next round
    }

    // No tool calls — model produced a final text response
    return {
      content: msg.content || '',
      model: data.message?.role === 'assistant' ? model : model,
      totalDurationMs: Math.round((data.total_duration || 0) / 1e6),
      evalTokens: totalEvalTokens,
      tokensPerSec: 0,
    }
  }

  // Hit maxRounds — return whatever we have
  return {
    content: 'Tool loop exceeded maximum rounds',
    model,
    totalDurationMs: 0,
    evalTokens: totalEvalTokens,
    tokensPerSec: 0,
  }
}

/**
 * Built-in tool: fetch a URL and return its text content.
 * Used by the URL auto-fix agent to verify websites.
 */
export async function toolFetchUrl(args: Record<string, unknown>): Promise<string> {
  const url = args.url as string
  if (!url || typeof url !== 'string') {
    return JSON.stringify({ error: 'url parameter is required' })
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ReentryMap-Verification/1.0' },
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
    })

    if (!response.ok) {
      return JSON.stringify({ status: response.status, error: `HTTP ${response.status}` })
    }

    const html = await response.text()
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return JSON.stringify({ status: 200, url: response.url, content: text.slice(0, 3000) })
  } catch (err) {
    return JSON.stringify({
      status: 'error',
      error: err instanceof Error ? err.message : 'Fetch failed',
    })
  }
}

/** Standard fetch_url tool definition for Ollama tool-calling models */
export const FETCH_URL_TOOL: OllamaTool = {
  type: 'function',
  function: {
    name: 'fetch_url',
    description:
      'Fetch a URL to check if it exists and is reachable. Returns HTTP status and text content.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to fetch (must start with http:// or https://)',
        },
      },
      required: ['url'],
    },
  },
}

/**
 * Parse JSON from model output, handling markdown code blocks.
 */
export function parseJsonFromOutput<T>(output: string): T {
  // Try stripping markdown code blocks first
  const jsonMatch = output.match(/```json\n([\s\S]*?)\n```/) || output.match(/```\n([\s\S]*?)\n```/)
  const jsonStr = jsonMatch ? jsonMatch[1] : output.trim()

  return JSON.parse(jsonStr) as T
}

/**
 * Check if Ollama is running and the model is available.
 */
export async function ollamaHealthCheck(model?: string): Promise<{
  available: boolean
  model: string
  error?: string
}> {
  const targetModel = model || OLLAMA_ENRICHMENT_MODEL
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) {
      return { available: false, model: targetModel, error: `HTTP ${response.status}` }
    }
    const data = (await response.json()) as OllamaTagsResponse
    const models = (data.models || []).map((m) => m.name)
    const found = models.some((m) => m === targetModel || m.startsWith(targetModel.split(':')[0]))
    return {
      available: found,
      model: targetModel,
      error: found ? undefined : `Model ${targetModel} not found. Available: ${models.join(', ')}`,
    }
  } catch (err) {
    return {
      available: false,
      model: targetModel,
      error: err instanceof Error ? err.message : 'Connection failed',
    }
  }
}
