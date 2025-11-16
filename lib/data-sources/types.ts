/**
 * Types for bulk data import system
 */

// =============================================================================
// Field Mapping Configuration
// =============================================================================

export interface FieldMappingConfig {
  displayName: string
  fieldMapping: Record<string, string>
  categoryMapping: Record<string, string>
  servicesMapping?: Record<string, string>
  tags?: string[]
  verificationLevel: 'L1' | 'L2' | 'L3'
  hoursFormat?: 'structured' | 'raw'
  requiresGeocoding?: boolean
}

export interface FieldMappingRegistry {
  [sourceName: string]: FieldMappingConfig
}

// =============================================================================
// Normalized Resource Format
// =============================================================================

export interface NormalizedResource {
  // Required fields
  name: string
  address: string
  city: string
  state: string

  // Optional contact fields
  zip?: string
  phone?: string
  fax?: string
  email?: string
  website?: string

  // Optional description fields
  description?: string
  services_offered?: string[]
  eligibility_requirements?: string
  required_documents?: string[]
  fees?: string
  accessibility_features?: string[]
  languages?: string[]

  // Categorization
  primary_category: string
  categories?: string[]
  tags?: string[]

  // Location fields
  latitude?: number
  longitude?: number
  formatted_address?: string
  place_id?: string
  county?: string
  county_fips?: string
  neighborhood?: string

  // Hours
  hours?: Record<string, string> | string

  // Program-specific fields
  program_type?: string
  target_population?: string
  bed_count?: number
  unit_count?: number

  // Provenance tracking
  source: {
    id: string // External ID from source
    name: string // Source name (e.g., 'careeronestop')
    display_name?: string // Human-readable source name
    url?: string // Link to original record
    fetched_at: string // ISO timestamp
  }

  // Verification metadata
  verification_level?: 'L1' | 'L2' | 'L3'
  ai_enriched?: boolean
  completeness_score?: number
}

// =============================================================================
// Geocoding Types
// =============================================================================

export interface GeocodedAddress {
  latitude: number
  longitude: number
  formatted_address: string
  place_id: string
  location_type: string
  county?: string
  county_fips?: string
  neighborhood?: string
  confidence?: 'high' | 'medium' | 'low'
}

export interface GeocodeResult {
  success: boolean
  data?: GeocodedAddress
  error?: string
}

export interface AddressToGeocode {
  address: string
  city: string
  state: string
  zip?: string
}

// =============================================================================
// Import Job Types
// =============================================================================

export interface ImportJobConfig {
  sourceName: string
  sourceUrl?: string
  sourceDescription?: string
  filters?: {
    state?: string
    state_list?: string[] // For nationwide imports with specific states
    city?: string
    category?: string
    nationwide?: boolean // Import all states
  }
  verificationLevel?: 'L1' | 'L2' | 'L3'
  batchSize?: number
  skipGeocoding?: boolean // Skip geocoding even if source requires it
}

export interface ImportProgress {
  total: number
  processed: number
  successful: number
  failed: number
  flagged: number
  rejected: number
  skipped: number
}

export interface ImportJobStatus {
  id: string
  source_name: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  total_records?: number
  processed_records: number
  successful_records: number
  failed_records: number
  flagged_records: number
  rejected_records: number
  skipped_records: number
  progress_percentage: number
  success_rate: number
  started_at?: string
  completed_at?: string
  estimated_completion_at?: string
  elapsed_time?: string
  created_by?: string
  metadata?: Record<string, unknown>
}

export interface ImportRecordStatus {
  id: string
  job_id: string
  source_id: string
  status:
    | 'pending'
    | 'processing'
    | 'geocoding'
    | 'verifying'
    | 'approved'
    | 'flagged'
    | 'rejected'
    | 'error'
    | 'skipped'
  raw_data: Record<string, unknown>
  normalized_data?: NormalizedResource
  resource_id?: string
  suggestion_id?: string
  error_message?: string
  verification_score?: number
  verification_level?: 'L1' | 'L2' | 'L3' | 'none'
  processing_time_ms?: number
  created_at: string
  processed_at?: string
}

// =============================================================================
// Data Source Adapter Interface
// =============================================================================

export interface DataSourceAdapter {
  /** Unique identifier for this adapter */
  name: string

  /** Human-readable display name */
  displayName: string

  /** Rate limit (requests per minute) for API-based sources */
  rateLimit?: number

  /**
   * Fetch resources from this data source
   * Yields resources one at a time (generator for memory efficiency)
   * @param params - Filtering params (state, city, category, etc.)
   */
  fetch(params: FetchParams): AsyncGenerator<Record<string, unknown>>

  /**
   * Normalize raw API response to our standard format
   * @param raw - Raw API response object
   * @returns Normalized resource ready for import
   */
  normalize(raw: Record<string, unknown>): NormalizedResource

  /**
   * Get verification level for this source
   * Government data = L1, scraped data = L3
   */
  getVerificationLevel(): 'L1' | 'L2' | 'L3'

  /**
   * Check if this source requires geocoding
   */
  requiresGeocoding(): boolean
}

export interface FetchParams {
  state?: string
  state_list?: string[] // For nationwide imports with specific states
  city?: string
  zipCode?: string
  category?: string
  limit?: number
  offset?: number
  nationwide?: boolean // Fetch all states
}

// =============================================================================
// Batch Suggestion API Types
// =============================================================================

export interface BatchSuggestionRequest {
  resources: NormalizedResource[]
  submitter?: string
  verification_level?: 'L1' | 'L2' | 'L3'
  notes?: string
}

export interface BatchSuggestionResponse {
  success: boolean
  stats: {
    total: number
    submitted: number
    auto_approved: number
    flagged: number
    rejected: number
    skipped_duplicates: number
    errors: number
  }
  results?: Array<{
    source_id: string
    status: 'approved' | 'flagged' | 'rejected' | 'error'
    resource_id?: string
    suggestion_id?: string
    verification_score?: number
    decision_reason?: string
    error?: string
  }>
}

// =============================================================================
// Database Types
// =============================================================================

export interface DataImportJob {
  id: string
  source_name: string
  source_url?: string
  source_description?: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  total_records?: number
  processed_records: number
  successful_records: number
  failed_records: number
  flagged_records: number
  rejected_records: number
  skipped_records: number
  checkpoint_data?: Record<string, unknown>
  error_log?: Array<Record<string, unknown>>
  started_at?: string
  completed_at?: string
  estimated_completion_at?: string
  created_by?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface DataImportRecord {
  id: string
  job_id: string
  source_id: string
  source_url?: string
  raw_data: Record<string, unknown>
  normalized_data?: NormalizedResource
  status:
    | 'pending'
    | 'processing'
    | 'geocoding'
    | 'verifying'
    | 'approved'
    | 'flagged'
    | 'rejected'
    | 'error'
    | 'skipped'
  resource_id?: string
  suggestion_id?: string
  error_message?: string
  error_details?: Record<string, unknown>
  retry_count: number
  verification_score?: number
  verification_level?: 'L1' | 'L2' | 'L3' | 'none'
  verification_decision?: 'approve' | 'flag' | 'reject'
  verification_reason?: string
  processing_time_ms?: number
  geocoding_time_ms?: number
  verification_time_ms?: number
  geocoding_attempted: boolean
  geocoding_success?: boolean
  original_address?: string
  geocoded_address?: string
  geocoding_confidence?: string
  created_at: string
  processed_at?: string
  updated_at: string
}
