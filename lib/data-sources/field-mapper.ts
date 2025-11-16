/**
 * Field Mapper - Normalizes data from different sources to our standard format
 */

import mappings from './field-mappings.json'
import type {
  FieldMappingConfig,
  FieldMappingRegistry,
  NormalizedResource,
} from './types'

export class FieldMapper {
  private mapping: FieldMappingConfig

  constructor(sourceName: string) {
    const registry = mappings as FieldMappingRegistry
    const sourceMapping = registry[sourceName]

    if (!sourceMapping) {
      throw new Error(
        `No mapping found for source: ${sourceName}. Available sources: ${Object.keys(registry).join(', ')}`
      )
    }

    this.mapping = sourceMapping
  }

  /**
   * Normalize raw source data to our standard resource format
   */
  normalize(raw: Record<string, unknown>, sourceName: string): NormalizedResource {
    const normalized: Partial<NormalizedResource> = {}

    // Map all fields from source to target format
    for (const [sourceField, targetField] of Object.entries(this.mapping.fieldMapping)) {
      const value = raw[sourceField]

      // Skip null, undefined, empty strings
      if (value === undefined || value === null || value === '') {
        continue
      }

      // Handle nested fields (if targetField contains dots)
      this.setNestedValue(normalized, targetField, value)
    }

    // Ensure required fields are present
    if (!normalized.name || !normalized.address || !normalized.city || !normalized.state) {
      const missing = []
      if (!normalized.name) missing.push('name')
      if (!normalized.address) missing.push('address')
      if (!normalized.city) missing.push('city')
      if (!normalized.state) missing.push('state')

      throw new Error(
        `Missing required fields for ${sourceName}: ${missing.join(', ')}. Raw data: ${JSON.stringify(raw).substring(0, 200)}`
      )
    }

    // Map category
    const rawCategory = this.extractCategory(raw)
    normalized.primary_category =
      this.mapping.categoryMapping[rawCategory] || this.mapping.categoryMapping['*']

    if (!normalized.primary_category) {
      throw new Error(`No category mapping found for category: ${rawCategory} in source: ${sourceName}`)
    }

    // Map services if available
    if (normalized.services_raw && typeof normalized.services_raw === 'string') {
      normalized.services_offered = this.mapServices(normalized.services_raw as string)
    } else if (Array.isArray(normalized.services_raw)) {
      normalized.services_offered = (normalized.services_raw as string[]).flatMap((s) =>
        this.mapServices(s)
      )
    }

    // Add tags from mapping config
    if (this.mapping.tags) {
      normalized.tags = [...(normalized.tags || []), ...this.mapping.tags]
    }

    // Build source metadata
    normalized.source = {
      id: this.extractSourceId(raw, normalized),
      name: sourceName,
      display_name: this.mapping.displayName,
      fetched_at: new Date().toISOString(),
    }

    // Add verification level
    normalized.verification_level = this.mapping.verificationLevel

    // Clean up temp fields
    delete (normalized as Record<string, unknown>).services_raw
    delete (normalized as Record<string, unknown>).hours_raw
    delete (normalized as Record<string, unknown>).program_type_raw
    delete (normalized as Record<string, unknown>).category_raw
    delete (normalized as Record<string, unknown>).facility_type_raw
    delete (normalized as Record<string, unknown>).target_population_raw
    delete (normalized as Record<string, unknown>).geocode_raw

    return normalized as NormalizedResource
  }

  /**
   * Extract category from raw data (looks for various category fields)
   */
  private extractCategory(raw: Record<string, unknown>): string {
    // Try common category field names
    const categoryFields = [
      'type',
      'category',
      'ProgramType',
      'program_type',
      'facility_type',
      'type_facility',
      'category_raw',
      'program_type_raw',
    ]

    for (const field of categoryFields) {
      if (raw[field]) {
        return String(raw[field])
      }
    }

    // Default to wildcard
    return '*'
  }

  /**
   * Extract source ID from raw data (tries multiple common ID fields)
   */
  private extractSourceId(raw: Record<string, unknown>, normalized: Partial<NormalizedResource>): string {
    // Try common ID field names
    const idFields = ['id', 'ID', 'OrganizationID', 'source_id', 'facility_id', 'program_id']

    for (const field of idFields) {
      if (raw[field]) {
        return String(raw[field])
      }
    }

    // If no ID found, generate one from name + address
    const name = normalized.name || ''
    const address = normalized.address || ''
    const city = normalized.city || ''

    // Simple hash function for generating consistent IDs
    const hashString = `${name}-${address}-${city}`.toLowerCase().replace(/[^a-z0-9]/g, '')
    return hashString.substring(0, 50)
  }

  /**
   * Map services to our standardized service descriptions
   */
  private mapServices(service: string): string[] {
    if (!this.mapping.servicesMapping) {
      return [service]
    }

    // Check for exact match first
    if (this.mapping.servicesMapping[service]) {
      return [this.mapping.servicesMapping[service]]
    }

    // Check for partial matches (case-insensitive)
    const serviceLower = service.toLowerCase()
    for (const [key, value] of Object.entries(this.mapping.servicesMapping)) {
      if (serviceLower.includes(key.toLowerCase())) {
        return [value]
      }
    }

    // No mapping found, return original
    return [service]
  }

  /**
   * Set nested value in object (handles dot notation like "source.id")
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.')
    let current: Record<string, unknown> = obj

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!current[part]) {
        current[part] = {}
      }
      current = current[part] as Record<string, unknown>
    }

    current[parts[parts.length - 1]] = value
  }

  /**
   * Get verification level for this source
   */
  getVerificationLevel(): 'L1' | 'L2' | 'L3' {
    return this.mapping.verificationLevel
  }

  /**
   * Check if this source requires geocoding
   */
  requiresGeocoding(): boolean {
    return this.mapping.requiresGeocoding || false
  }

  /**
   * Get display name for this source
   */
  getDisplayName(): string {
    return this.mapping.displayName
  }

  /**
   * Get hours format for this source
   */
  getHoursFormat(): 'structured' | 'raw' | undefined {
    return this.mapping.hoursFormat
  }
}

/**
 * Get list of all available data sources
 */
export function listDataSources(): Array<{ name: string; displayName: string }> {
  const registry = mappings as FieldMappingRegistry

  return Object.entries(registry).map(([name, config]) => ({
    name,
    displayName: config.displayName,
  }))
}

/**
 * Check if a data source mapping exists
 */
export function hasDataSource(sourceName: string): boolean {
  const registry = mappings as FieldMappingRegistry
  return sourceName in registry
}

/**
 * Get field mapping config for a source
 */
export function getFieldMappingConfig(sourceName: string): FieldMappingConfig {
  const registry = mappings as FieldMappingRegistry
  const config = registry[sourceName]

  if (!config) {
    throw new Error(`No mapping found for source: ${sourceName}`)
  }

  return config
}
