/**
 * CareerOneStop Data Source Adapter
 * Fetches workforce centers and reentry programs from DOL CareerOneStop
 */

import { env } from '@/lib/env'
import type { DataSourceAdapter, FetchParams, NormalizedResource } from '../types'
import { FieldMapper } from '../field-mapper'

export class CareerOneStopAdapter implements DataSourceAdapter {
  name = 'careeronestop'
  displayName = 'DOL CareerOneStop - American Job Centers'
  rateLimit = 60 // Requests per minute

  private apiBaseUrl = 'https://api.careeronestop.org/v1'
  private userId = process.env.CAREERONESTOP_USER_ID || env.CAREERONESTOP_USER_ID
  private apiKey = process.env.CAREERONESTOP_API_KEY || env.CAREERONESTOP_API_KEY
  private mapper = new FieldMapper('careeronestop')

  /**
   * Fetch American Job Centers from CareerOneStop API
   * Note: For bulk imports, CSV download is simpler than API
   */
  async *fetch(params: FetchParams): AsyncGenerator<Record<string, unknown>> {
    // For now, this adapter expects CSV data to be pre-downloaded
    // The API method is available but requires pagination
    // See scripts/import-careeronestop.ts for CSV-based import
    throw new Error(
      'CareerOneStop adapter requires CSV data. Use downloadCareerOneStopCSV() or scripts/import-careeronestop.ts'
    )
  }

  /**
   * Normalize raw CareerOneStop data to our standard format
   */
  normalize(raw: Record<string, unknown>): NormalizedResource {
    return this.mapper.normalize(raw, this.name)
  }

  /**
   * Get verification level for this source
   */
  getVerificationLevel(): 'L1' | 'L2' | 'L3' {
    return 'L1' // Government data = minimal verification needed
  }

  /**
   * Check if this source requires geocoding
   */
  requiresGeocoding(): boolean {
    return false // CareerOneStop data includes lat/lng
  }

  /**
   * Fetch all American Job Centers via API (alternative to CSV)
   */
  async fetchAllAJCsAPI(): Promise<Record<string, unknown>[]> {
    if (!this.userId || !this.apiKey) {
      throw new Error('CareerOneStop API credentials not configured')
    }

    const url = `${this.apiBaseUrl}/ajcfinder/${this.userId}/GetAll`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`CareerOneStop API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.AJCList || []
  }

  /**
   * Fetch AJCs by state
   */
  async fetchAJCsByState(state: string): Promise<Record<string, unknown>[]> {
    if (!this.userId || !this.apiKey) {
      throw new Error('CareerOneStop API credentials not configured')
    }

    const url = `${this.apiBaseUrl}/ajcfinder/${this.userId}/GetByLocation/${state}/0/0/25/0`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`CareerOneStop API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.AJCList || []
  }
}

/**
 * CareerOneStop ReEntry Programs Adapter
 */
export class CareerOneStopReEntryAdapter implements DataSourceAdapter {
  name = 'careeronestop_reentry'
  displayName = 'DOL CareerOneStop - ReEntry Programs'
  rateLimit = 60

  private apiBaseUrl = 'https://api.careeronestop.org/v1'
  private userId = process.env.CAREERONESTOP_USER_ID || env.CAREERONESTOP_USER_ID
  private apiKey = process.env.CAREERONESTOP_API_KEY || env.CAREERONESTOP_API_KEY
  private mapper = new FieldMapper('careeronestop_reentry')

  /**
   * Fetch ReEntry Programs from CareerOneStop API
   */
  async *fetch(params: FetchParams): AsyncGenerator<Record<string, unknown>> {
    const programs = await this.fetchAllReEntryPrograms()

    // Filter by state if specified
    let filtered = programs
    if (params.state) {
      filtered = programs.filter((p: Record<string, unknown>) => p.State === params.state)
    } else if (params.state_list) {
      filtered = programs.filter((p: Record<string, unknown>) =>
        params.state_list?.includes(p.State as string)
      )
    }

    // Yield each program
    for (const program of filtered) {
      yield program
    }
  }

  /**
   * Normalize raw ReEntry program data to our standard format
   */
  normalize(raw: Record<string, unknown>): NormalizedResource {
    return this.mapper.normalize(raw, this.name)
  }

  /**
   * Get verification level for this source
   */
  getVerificationLevel(): 'L1' | 'L2' | 'L3' {
    return 'L1' // Government data
  }

  /**
   * Check if this source requires geocoding
   */
  requiresGeocoding(): boolean {
    return false // CareerOneStop includes lat/lng
  }

  /**
   * Fetch all ReEntry programs via API
   */
  async fetchAllReEntryPrograms(): Promise<Record<string, unknown>[]> {
    if (!this.userId || !this.apiKey) {
      throw new Error('CareerOneStop API credentials not configured')
    }

    const url = `${this.apiBaseUrl}/reentryprogramfinder/${this.userId}/GetAll`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(
        `CareerOneStop ReEntry API error: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()
    return data.ProgramList || []
  }

  /**
   * Fetch ReEntry programs by state
   */
  async fetchReEntryByState(state: string): Promise<Record<string, unknown>[]> {
    const allPrograms = await this.fetchAllReEntryPrograms()
    return allPrograms.filter((p) => p.State === state)
  }
}

/**
 * Helper: Download CareerOneStop CSV data
 * For use in scripts/import-careeronestop.ts
 */
export async function downloadCareerOneStopCSV(outputPath: string): Promise<void> {
  const csvUrl =
    'https://www.careeronestop.org/Developers/Data/comprehensive-and-affiliate-american-job-centers.aspx'

  console.log(`Downloading CareerOneStop CSV from ${csvUrl}...`)

  const response = await fetch(csvUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ReentryMap/1.0)',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to download CSV: ${response.status} ${response.statusText}`)
  }

  const csvContent = await response.text()

  // Save to file (Node.js only)
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    const fs = await import('fs')
    await fs.promises.writeFile(outputPath, csvContent, 'utf-8')
    console.log(`CSV saved to ${outputPath}`)
  } else {
    throw new Error('downloadCareerOneStopCSV can only be used in Node.js environment')
  }
}
