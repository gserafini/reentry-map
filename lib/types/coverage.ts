/**
 * TypeScript type definitions for coverage tracking system
 * Based on supabase/migrations/20250129000000_coverage_tracking_tables.sql
 */

/**
 * County reference data with geographic boundaries and reentry statistics
 * Table: county_data
 */
export interface CountyData {
  id: string

  // Geographic identifiers
  fips_code: string // 5-digit FIPS code (state + county)
  state_fips: string // 2-digit state FIPS
  county_fips: string // 3-digit county FIPS
  state_code: string // 2-letter state code (e.g., 'CA')
  state_name: string // Full state name
  county_name: string // County name

  // Population data
  total_population: number | null
  population_year: number | null

  // Reentry population estimates
  estimated_annual_releases: number | null
  reentry_data_source: string | null
  reentry_data_year: number | null

  // Priority classification
  priority_tier: number | null // 1-5 (1=highest priority)
  priority_weight: number | null // Multiplier for coverage calculations
  priority_reason: string | null // Why this county is prioritized

  // Geographic data
  geometry: unknown | null // GeoJSON boundary for mapping (JSONB)
  center_lat: number | null // County center latitude
  center_lng: number | null // County center longitude

  // Metadata
  created_at: string
  updated_at: string
}

/**
 * Calculated coverage score for a geographic region
 * Table: coverage_metrics
 */
export interface CoverageMetric {
  id: string

  // Geographic scope
  geography_type: 'national' | 'state' | 'county' | 'city'
  geography_id: string // FIPS code, state code, or 'US' for national
  geography_name: string // Display name

  // Composite coverage score (0-100)
  coverage_score: number

  // Component scores (0-100 each)
  resource_count_score: number
  category_coverage_score: number
  population_coverage_score: number
  verification_score: number

  // Resource metrics
  total_resources: number
  verified_resources: number
  categories_covered: number
  unique_resources: number

  // Population coverage
  total_population: number | null
  reentry_population: number | null

  // Comparison metrics
  resources_in_211: number
  comprehensiveness_ratio: number // our resources / 211 resources

  // Quality metrics
  avg_completeness_score: number | null
  avg_verification_score: number | null
  resources_with_reviews: number
  review_coverage_pct: number

  // Timestamp
  calculated_at: string
  last_updated: string
}

/**
 * County data with coverage metrics merged in
 * Used by coverage API endpoints
 */
export interface CountyWithCoverage extends CountyData {
  coverage_score: number
  total_resources: number
}
