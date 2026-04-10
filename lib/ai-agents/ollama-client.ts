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
