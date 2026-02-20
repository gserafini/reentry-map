import { BaseAgent } from './base-agent'
import { sql } from '@/lib/db/client'
import { geocodeAddress } from '@/lib/utils/geocoding'

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

/** Result of extracting data from a website via AI */
interface WebsiteExtractionResult {
  hours?: string
  description?: string
  services?: string[]
  costCents: number
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
   * Enrich resource data from its website
   */
  private async enrichFromWebsite(_websiteUrl: string): Promise<{
    hours?: string
    description?: string
    services?: string[]
    costCents?: number
  }> {
    // In a production environment, we would:
    // 1. Fetch the website HTML
    // 2. Extract relevant text
    // 3. Use GPT-4o-mini to parse and structure the data

    // For now, return empty object as we don't have web scraping set up
    return {}
  }

  /**
   * Extract structured data from website content using AI
   */
  private async extractWebsiteData(
    content: string,
    websiteUrl: string
  ): Promise<WebsiteExtractionResult> {
    const prompt = `You are analyzing the website content from ${websiteUrl} for a reentry resource directory.

Extract the following information if available:
- hours: Operating hours (e.g., "Monday-Friday 9am-5pm")
- description: Brief description of the organization (2-3 sentences)
- services: Array of specific services offered

Website content:
${content.substring(0, 4000)} // Limit content length

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

      const parsed = JSON.parse(responseContent) as WebsiteExtractionResult
      return { ...parsed, costCents }
    } catch (error) {
      console.error('Error extracting website data:', error)
      return { costCents: 0 }
    }
  }
}
