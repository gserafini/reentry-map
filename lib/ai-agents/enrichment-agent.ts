import { BaseAgent } from './base-agent'
import { sql } from '@/lib/db/client'
import { geocodeAddress } from '@/lib/utils/geocoding'
import { extractWebsiteContent } from '@/lib/utils/verification'
import { ollamaChat, parseJsonFromOutput, ollamaHealthCheck } from './ollama-client'

/** Resource row shape returned by enrichment queries */
interface EnrichmentResourceRow {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  description: string | null
  hours: Record<string, string> | null
  website: string | null
  services_offered: string[] | null
  status: string
  ai_enriched: boolean
}

/**
 * Enrichment Agent
 *
 * Enriches existing resources with missing data:
 * - Geocoding (latitude/longitude from address)
 * - Website scraping (hours, services, contact info)
 * - Google Maps data (photos, reviews, rating)
 * - Phone number validation
 *
 * Uses GPT-4o-mini to extract structured data from unstructured sources
 */
export class EnrichmentAgent extends BaseAgent {
  constructor() {
    super('enrichment')
  }

  async run(): Promise<void> {
    const _logId = await this.startLog()
    let totalCost = 0
    let resourcesProcessed = 0
    let resourcesUpdated = 0

    try {
      // Get resources that need enrichment
      const resources = await this.getResourcesNeedingEnrichment()

      for (const resource of resources) {
        try {
          const result = await this.enrichResource(resource)
          resourcesProcessed++

          if (result.success) {
            resourcesUpdated++
            totalCost += result.costCents || 0
          }
        } catch (error) {
          console.error(`Error enriching resource ${resource.id}:`, error)
        }
      }

      // Update log with success
      await this.updateLog({
        status: resourcesUpdated > 0 ? 'success' : 'partial',
        resources_processed: resourcesProcessed,
        resources_updated: resourcesUpdated,
        cost_cents: totalCost,
      })
    } catch (error) {
      console.error('Enrichment agent error:', error)
      await this.updateLog({
        status: 'failure',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        cost_cents: totalCost,
      })
      throw error
    }
  }

  /**
   * Get resources that need enrichment (missing key fields)
   */
  private async getResourcesNeedingEnrichment(): Promise<EnrichmentResourceRow[]> {
    try {
      const rows = await sql<EnrichmentResourceRow[]>`
        SELECT id, name, address, latitude, longitude, description, hours,
               website, services_offered, status, ai_enriched
        FROM resources
        WHERE status = 'active'
        AND (latitude IS NULL OR longitude IS NULL OR description IS NULL OR hours IS NULL)
        LIMIT 20
      `
      return rows
    } catch (error) {
      console.error('Error fetching resources:', error)
      return []
    }
  }

  /**
   * Enrich a single resource with missing data
   */
  private async enrichResource(resource: EnrichmentResourceRow): Promise<{
    success: boolean
    costCents?: number
    error?: string
  }> {
    let totalCost = 0
    const fieldsEnriched: string[] = []

    try {
      // 1. Geocode address if missing coordinates
      if (resource.address && (!resource.latitude || !resource.longitude)) {
        try {
          const coords = await geocodeAddress(resource.address)
          if (coords) {
            await sql`
              UPDATE resources SET
                latitude = ${coords.latitude},
                longitude = ${coords.longitude}
              WHERE id = ${resource.id}
            `
            fieldsEnriched.push('coordinates')
          }
        } catch (error) {
          console.error('Geocoding error:', error)
        }
      }

      // 2. Enrich from website if available
      if (resource.website && !resource.hours) {
        try {
          const enriched = await this.enrichFromWebsite(resource.website)
          totalCost += enriched.costCents || 0

          if (enriched.hours && !resource.hours) {
            await sql`
              UPDATE resources SET hours = ${JSON.stringify(enriched.hours)}::jsonb
              WHERE id = ${resource.id}
            `
            fieldsEnriched.push('hours')
          }
          if (enriched.description && !resource.description) {
            await sql`
              UPDATE resources SET description = ${enriched.description}
              WHERE id = ${resource.id}
            `
            fieldsEnriched.push('description')
          }
          if (enriched.services && !resource.services_offered) {
            await sql`
              UPDATE resources SET services_offered = ${enriched.services}
              WHERE id = ${resource.id}
            `
            fieldsEnriched.push('services')
          }
        } catch (error) {
          console.error('Website enrichment error:', error)
        }
      }

      // Mark as AI enriched
      if (fieldsEnriched.length > 0) {
        await sql`
          UPDATE resources SET
            ai_enriched = true,
            last_verified_at = NOW()
          WHERE id = ${resource.id}
        `
      }

      return {
        success: fieldsEnriched.length > 0,
        costCents: totalCost,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Enrich resource data from its website using local Ollama model.
   * Fetches the website, strips HTML, and uses Qwen3 Coder (local) to extract
   * structured data. Falls back to OpenAI if Ollama is unavailable.
   */
  private async enrichFromWebsite(websiteUrl: string): Promise<{
    hours?: string
    description?: string
    services?: string[]
    costCents?: number
  }> {
    // 1. Fetch and extract website text
    const websiteText = await extractWebsiteContent(websiteUrl)
    if (!websiteText || websiteText.length < 50) {
      return {} // Too little content to analyze
    }

    // 2. Call local Ollama model for extraction
    const prompt = `You are analyzing a reentry services organization's website to extract structured data for a resource directory.

Website URL: ${websiteUrl}
Website content (text extracted from HTML):
${websiteText.substring(0, 4000)}

Extract the following information ONLY if clearly stated on the website. Do not guess or infer.

Respond with ONLY valid JSON, no other text:
{
  "hours": "Operating hours as a string, e.g. 'Monday-Friday 9am-5pm' or null if not found",
  "description": "2-3 sentence description of what this organization does for people reentering society after incarceration, or null if unclear",
  "services": ["list", "of", "specific", "services", "offered"]
}`

    try {
      // Try local Ollama first (free, runs on dc3-1)
      const health = await ollamaHealthCheck()
      if (health.available) {
        const result = await ollamaChat(
          [
            {
              role: 'system',
              content:
                'You extract structured data from website content. Respond with ONLY valid JSON.',
            },
            { role: 'user', content: prompt },
          ],
          { temperature: 0.1, maxTokens: 512, timeoutMs: 60_000 }
        )

        const parsed = parseJsonFromOutput<{
          hours?: string | null
          description?: string | null
          services?: string[] | null
        }>(result.content)

        return {
          hours: parsed.hours || undefined,
          description: parsed.description || undefined,
          services: parsed.services?.length ? parsed.services : undefined,
          costCents: 0, // Local model = free
        }
      }

      // Fallback to OpenAI if Ollama unavailable
      return await this.extractWebsiteDataViaOpenAI(websiteText, websiteUrl)
    } catch (error) {
      console.error(`enrichFromWebsite error for ${websiteUrl}:`, error)
      // Try OpenAI fallback on Ollama failure
      try {
        return await this.extractWebsiteDataViaOpenAI(websiteText, websiteUrl)
      } catch {
        return {}
      }
    }
  }

  /**
   * Fallback: extract structured data from website content using OpenAI
   */
  private async extractWebsiteDataViaOpenAI(
    content: string,
    websiteUrl: string
  ): Promise<{
    hours?: string
    description?: string
    services?: string[]
    costCents?: number
  }> {
    const prompt = `You are analyzing the website content from ${websiteUrl} for a reentry resource directory.

Extract the following information if available:
- hours: Operating hours (e.g., "Monday-Friday 9am-5pm")
- description: Brief description of the organization (2-3 sentences)
- services: Array of specific services offered

Website content:
${content.substring(0, 4000)}

Respond ONLY with valid JSON in this format:
{
  "hours": "string or null",
  "description": "string or null",
  "services": ["array of strings or empty array"]
}`

    try {
      const { content: responseContent, costCents } = await this.callOpenAI([
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts structured data from websites.',
        },
        { role: 'user', content: prompt },
      ])

      const parsed = JSON.parse(responseContent) as {
        hours?: string | null
        description?: string | null
        services?: string[] | null
      }
      return {
        hours: parsed.hours || undefined,
        description: parsed.description || undefined,
        services: parsed.services?.length ? parsed.services : undefined,
        costCents,
      }
    } catch (error) {
      console.error('Error extracting website data via OpenAI:', error)
      return { costCents: 0 }
    }
  }
}
