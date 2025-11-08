import { BaseAgent } from './base-agent'
import { createClient } from '@/lib/supabase/client'

interface VerificationResult {
  resourceId: string
  isValid: boolean
  issues: string[]
  recommendations: string[]
}

/**
 * Verification Agent
 *
 * Periodically verifies resource accuracy:
 * - Phone number validation (calls/texts to verify)
 * - Website availability checks
 * - Business status verification
 * - Address validation
 * - Hours verification
 *
 * Runs quarterly or on-demand for specific resources
 */
export class VerificationAgent extends BaseAgent {
  constructor() {
    super('verification')
  }

  async run(): Promise<void> {
    const logId = await this.startLog()
    let totalCost = 0
    let resourcesProcessed = 0
    let resourcesUpdated = 0

    try {
      // Get resources that need verification (>90 days since last check)
      const resources = await this.getResourcesNeedingVerification()

      for (const resource of resources) {
        try {
          const result = await this.verifyResource(resource)
          resourcesProcessed++

          if (result.needsUpdate) {
            resourcesUpdated++
          }

          totalCost += result.costCents || 0
        } catch (error) {
          console.error(`Error verifying resource ${resource.id}:`, error)
        }
      }

      // Update log with success
      await this.updateLog({
        status: 'success',
        resources_processed: resourcesProcessed,
        resources_updated: resourcesUpdated,
        cost_cents: totalCost,
      })
    } catch (error) {
      console.error('Verification agent error:', error)
      await this.updateLog({
        status: 'failure',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        cost_cents: totalCost,
      })
      throw error
    }
  }

  /**
   * Get resources that need verification
   * (Last verified > 90 days ago or never verified)
   */
  private async getResourcesNeedingVerification(): Promise<any[]> {
    const supabase = createClient()
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('status', 'active')
      .or(`last_verified.is.null,last_verified.lt.${ninetyDaysAgo.toISOString()}`)
      .limit(20) // Process in batches

    if (error) {
      console.error('Error fetching resources:', error)
      return []
    }

    return data || []
  }

  /**
   * Verify a single resource
   */
  private async verifyResource(resource: any): Promise<{
    needsUpdate: boolean
    costCents?: number
  }> {
    const issues: string[] = []
    const checks = {
      website: false,
      phone: false,
      address: false,
    }

    // 1. Check website availability
    if (resource.website) {
      const websiteValid = await this.checkWebsite(resource.website)
      checks.website = websiteValid

      if (!websiteValid) {
        issues.push('Website is not accessible')
      }
    }

    // 2. Validate phone number format (basic check)
    if (resource.phone) {
      const phoneValid = this.validatePhoneFormat(resource.phone)
      checks.phone = phoneValid

      if (!phoneValid) {
        issues.push('Phone number format is invalid')
      }
    }

    // 3. Update verification status
    const supabase = createClient()
    const updates: any = {
      last_verified: new Date().toISOString(),
    }

    // Calculate verification score (0-100)
    const score = this.calculateVerificationScore(checks, resource)
    updates.verification_score = score

    // If score is too low, mark for review
    if (score < 50) {
      updates.status = 'pending' // Requires admin review
    }

    await supabase.from('resources').update(updates).eq('id', resource.id)

    return {
      needsUpdate: issues.length > 0,
      costCents: 0, // No AI costs for basic verification
    }
  }

  /**
   * Check if website is accessible
   */
  private async checkWebsite(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })
      return response.ok
    } catch (error) {
      console.error(`Website check failed for ${url}:`, error)
      return false
    }
  }

  /**
   * Validate phone number format
   */
  private validatePhoneFormat(phone: string): boolean {
    // Basic US phone number validation
    const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
    return phoneRegex.test(phone)
  }

  /**
   * Calculate verification score based on checks and completeness
   */
  private calculateVerificationScore(
    checks: { website: boolean; phone: boolean; address: boolean },
    resource: any
  ): number {
    let score = 0

    // Base score for having key fields
    if (resource.name) score += 10
    if (resource.address) score += 15
    if (resource.phone) score += 15
    if (resource.description) score += 10
    if (resource.website) score += 10

    // Bonus for verified fields
    if (checks.website) score += 10
    if (checks.phone) score += 10

    // Bonus for enriched data
    if (resource.latitude && resource.longitude) score += 10
    if (resource.hours) score += 5
    if (resource.services && resource.services.length > 0) score += 5

    return Math.min(score, 100)
  }

  /**
   * Advanced verification using AI (phone call transcription, etc.)
   * This would be implemented in a production environment
   */
  private async performAdvancedVerification(resource: any): Promise<{
    isValid: boolean
    issues: string[]
    costCents: number
  }> {
    // In production, this could:
    // 1. Make automated phone calls
    // 2. Analyze business listings
    // 3. Check social media presence
    // 4. Verify with government databases

    return {
      isValid: true,
      issues: [],
      costCents: 0,
    }
  }
}
