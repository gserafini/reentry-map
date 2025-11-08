/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseAgent } from './base-agent'
import { createClient } from '@/lib/supabase/client'
import { geocodeAddress } from '@/lib/utils/geocoding'

interface _EnrichmentResult {
  resourceId: string
  fieldsEnriched: string[]
  success: boolean
  error?: string
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
  private async getResourcesNeedingEnrichment(): Promise<any[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('status', 'active')
      .or('latitude.is.null,longitude.is.null,description.is.null,hours.is.null')
      .limit(20) // Process in batches

    if (error) {
      console.error('Error fetching resources:', error)
      return []
    }

    return data || []
  }

  /**
   * Enrich a single resource with missing data
   */
  private async enrichResource(resource: any): Promise<{
    success: boolean
    costCents?: number
    error?: string
  }> {
    let totalCost = 0
    const fieldsEnriched: string[] = []

    try {
      const supabase = createClient()

      // 1. Geocode address if missing coordinates
      if (resource.address && (!resource.latitude || !resource.longitude)) {
        try {
          const coords = await geocodeAddress(resource.address)
          if (coords) {
            await supabase
              .from('resources')
              .update({
                latitude: coords.latitude,
                longitude: coords.longitude,
              })
              .eq('id', resource.id)

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

          const updates: Record<string, unknown> = {}
          if (enriched.hours && !resource.hours) {
            updates.hours = enriched.hours
            fieldsEnriched.push('hours')
          }
          if (enriched.description && !resource.description) {
            updates.description = enriched.description
            fieldsEnriched.push('description')
          }
          if (enriched.services && !resource.services) {
            updates.services = enriched.services
            fieldsEnriched.push('services')
          }

          if (Object.keys(updates).length > 0) {
            await supabase.from('resources').update(updates).eq('id', resource.id)
          }
        } catch (error) {
          console.error('Website enrichment error:', error)
        }
      }

      // Mark as AI enriched
      if (fieldsEnriched.length > 0) {
        await supabase
          .from('resources')
          .update({
            ai_enriched: true,
            last_verified: new Date().toISOString(),
          })
          .eq('id', resource.id)
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
  ): Promise<{
    hours?: string
    description?: string
    services?: string[]
    costCents: number
  }> {
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

      const parsed = JSON.parse(responseContent) as Record<string, unknown>
      return { ...(parsed as object), costCents }
    } catch (error) {
      console.error('Error extracting website data:', error)
      return { costCents: 0 }
    }
  }
}
