import { BaseAgent } from './base-agent'
import { sql } from '@/lib/db/client'

interface DiscoveredResource {
  name: string
  description: string
  category: string
  address: string
  phone?: string
  email?: string
  website?: string
  hours?: string
  services?: string[]
  eligibility?: string
  source?: { name: string; url: string }
  confidence: number
}

/**
 * Discovery Agent
 *
 * Finds new reentry resources from various sources:
 * - 211 directories
 * - Government websites
 * - Google searches
 * - Community organizations
 *
 * Uses GPT-4o-mini to extract and structure resource information
 */
export class DiscoveryAgent extends BaseAgent {
  constructor() {
    super('discovery')
  }

  async run(): Promise<void> {
    const _logId = await this.startLog()
    let totalCost = 0
    let resourcesAdded = 0
    let resourcesProcessed = 0

    try {
      // Example: Discover resources from a sample source
      // In production, this would fetch from actual sources
      const sources = await this.getDiscoverySources()

      for (const source of sources) {
        try {
          const discovered = await this.discoverFromSource(source)
          resourcesProcessed += discovered.length

          for (const resource of discovered) {
            // Check if resource already exists
            const exists = await this.resourceExists(resource)

            if (!exists && resource.confidence > 0.7) {
              await this.addResource(resource)
              resourcesAdded++
            }
          }

          totalCost += source.costCents || 0
        } catch (error) {
          console.error(`Error processing source ${source.name}:`, error)
        }
      }

      // Update log with success
      await this.updateLog({
        status: 'success',
        resources_processed: resourcesProcessed,
        resources_added: resourcesAdded,
        cost_cents: totalCost,
        metadata: {
          sources_checked: sources.length,
        },
      })
    } catch (error) {
      console.error('Discovery agent error:', error)
      await this.updateLog({
        status: 'failure',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        cost_cents: totalCost,
      })
      throw error
    }
  }

  /**
   * Get list of sources to check for new resources
   */
  private async getDiscoverySources(): Promise<
    Array<{ name: string; url: string; costCents?: number }>
  > {
    // In production, this would return actual sources to check
    // For now, return empty array as we don't have real sources configured
    return []
  }

  /**
   * Discover resources from a specific source
   */
  private async discoverFromSource(_source: {
    name: string
    url: string
  }): Promise<DiscoveredResource[]> {
    // This would fetch and parse the source
    // For now, return empty array
    return []
  }

  /**
   * Check if a resource already exists in the database
   */
  private async resourceExists(resource: DiscoveredResource): Promise<boolean> {
    try {
      const rows = await sql`
        SELECT id FROM resources
        WHERE name ILIKE ${'%' + resource.name + '%'}
        LIMIT 1
      `
      return rows.length > 0
    } catch (error) {
      console.error('Error checking resource existence:', error)
      return false
    }
  }

  /**
   * Add a discovered resource to the database
   */
  private async addResource(resource: DiscoveredResource): Promise<void> {
    try {
      await sql`
        INSERT INTO resources (
          name, description, primary_category, address, phone, email, website,
          hours, services_offered, eligibility_requirements, status, ai_enriched, source
        ) VALUES (
          ${resource.name},
          ${resource.description},
          ${resource.category},
          ${resource.address},
          ${resource.phone || null},
          ${resource.email || null},
          ${resource.website || null},
          ${resource.hours || null},
          ${resource.services || null},
          ${resource.eligibility || null},
          'pending',
          true,
          ${null}
        )
      `
    } catch (error) {
      console.error('Error adding resource:', error)
      throw error
    }
  }

  /**
   * Extract resource information from text using GPT-4o-mini
   */
  private async extractResourceInfo(
    text: string,
    sourceUrl: string
  ): Promise<DiscoveredResource[]> {
    const prompt = `You are helping to build a directory of reentry resources for individuals who have been formerly incarcerated.

Analyze the following text from ${sourceUrl} and extract any reentry resources mentioned. For each resource, provide:
- name: Official organization name
- description: Brief description of services
- category: One of (employment, housing, food, clothing, healthcare, mental_health, substance_abuse, legal_aid, transportation, id_documents, education, faith_based, general_support)
- address: Full physical address
- phone: Phone number (if mentioned)
- email: Email address (if mentioned)
- website: Website URL (if mentioned)
- hours: Operating hours (if mentioned)
- services: Array of specific services offered
- eligibility: Eligibility requirements (if mentioned)
- confidence: Your confidence score 0-1 that this is a legitimate reentry resource

Return the results as a JSON array. If no resources are found, return an empty array.

Text to analyze:
${text}

Respond ONLY with valid JSON, no other text.`

    try {
      const { content, costCents: _costCents } = await this.callOpenAI([
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts resource information.',
        },
        { role: 'user', content: prompt },
      ])

      const resources = JSON.parse(content) as DiscoveredResource[]
      return resources.map((r) => ({
        ...r,
        source: { name: 'web_discovery', url: sourceUrl },
      }))
    } catch (error) {
      console.error('Error extracting resource info:', error)
      return []
    }
  }
}
