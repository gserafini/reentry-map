/**
 * Resource Submission Schema
 *
 * ARCHITECTURE:
 * - Resource (database) = PARENT/CANONICAL schema
 * - ResourceSubmission = CHILD derived from Resource
 *
 * This file derives submission types FROM the database Resource schema,
 * ensuring they stay in sync automatically.
 *
 * When you add a field to the resources table:
 * 1. Update database migration
 * 2. Regenerate database types (npm run supabase:types)
 * 3. ResourceSubmission automatically includes the new field
 *
 * Used by:
 * - /api/resources/suggest-batch (AI agent submissions)
 * - Command Center agent prompts
 * - Research API /api/research/next
 * - Manual admin submissions
 *
 * Schema version: 3.0 (2025-01-12) - Derived from Resource
 */

import type { ResourceInsert } from './database'

// ============================================================================
// CORE TYPES - DERIVED FROM DATABASE SCHEMA
// ============================================================================

/**
 * Complete resource submission data
 *
 * Based on ResourceInsert from database, with modifications:
 * - Most fields made optional (agents may not have all data)
 * - Required fields: name, address, city, state (minimum for a valid resource)
 * - Auto-generated fields excluded: id, timestamps, stats (rating_*, review_count, view_count)
 * - Submission-specific fields added: source, source_url, discovery metadata
 */
export type ResourceSubmission = Partial<
  Omit<
    ResourceInsert,
    | 'id' // Auto-generated
    | 'created_at' // Auto-timestamp
    | 'updated_at' // Auto-timestamp
    | 'rating_average' // Auto-calculated from reviews
    | 'rating_count' // Auto-calculated from reviews
    | 'review_count' // Auto-calculated from reviews
    | 'view_count' // Auto-calculated from page views
    | 'verified' // Set during admin approval
    | 'verified_by' // Set during admin approval
    | 'verified_date' // Set during admin approval
    | 'phone_verified' // Set by verification agent
    | 'phone_last_verified' // Set by verification agent
    | 'ai_discovered' // Set by system
    | 'ai_enriched' // Set by system
    | 'ai_last_verified' // Set by verification agent
    | 'ai_verification_score' // Set by verification agent
    | 'data_completeness_score' // Calculated by system
    | 'status' // Set during approval (default: pending)
    | 'status_reason' // Set by admin/system
    | 'slug' // Auto-generated from name
    | 'change_log' // System-managed
  >
> & {
  // ===== REQUIRED FIELDS (strictly enforced) =====
  name: string // Organization name (required)
  address: string // Street address (required for physical locations)
  city: string // City (required)
  state: string // State code (required)

  // ===== SUBMISSION-SPECIFIC FIELDS =====
  // These fields are unique to submissions and don't exist in resources table
  source?: string // How discovered: 'google_search', '211', 'manual', 'import'
  source_url?: string // URL where information was found
  discovered_via?: string // Discovery method: 'websearch', 'webfetch', 'manual'
  discovery_notes?: string // Search query, notes about discovery
  reason?: string // Why submitted (for resource_suggestions.reason)
  personal_experience?: string // User's experience (for resource_suggestions)
  submitter?: string // Who submitted: 'ai_agent', user_id, 'api'
  notes?: string // Additional submission notes
}

/**
 * Minimal required fields for validation
 */
export interface MinimalResourceSubmission {
  name: string
  address: string
  city: string
  state: string
}

/**
 * Validation result
 */
export interface ResourceSubmissionValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
  missing_required: string[]
  missing_recommended: string[]
}

// ============================================================================
// BATCH SUBMISSION
// ============================================================================

/**
 * Batch submission request
 */
export interface BatchResourceSubmissionRequest {
  resources: ResourceSubmission[]
  submitter?: string
  notes?: string
}

/**
 * Single resource result
 */
export interface ResourceSubmissionResult {
  name: string
  status: 'submitted' | 'auto_approved' | 'flagged' | 'rejected' | 'duplicate' | 'error'
  resource_id?: string
  suggestion_id?: string
  verification_score?: number
  decision_reason?: string
  error?: string
}

/**
 * Batch submission response
 */
export interface BatchResourceSubmissionResponse {
  success: boolean
  message: string
  stats: {
    total_received: number
    submitted: number
    auto_approved: number
    flagged_for_human: number
    auto_rejected: number
    skipped_duplicates: number
    errors: number
  }
  error_details?: string[]
  verification_results: ResourceSubmissionResult[]
  next_steps: string
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate minimal required fields
 */
export function validateMinimalResource(
  submission: Partial<ResourceSubmission>
): ResourceSubmissionValidation {
  const errors: string[] = []
  const warnings: string[] = []
  const missing_required: string[] = []
  const missing_recommended: string[] = []

  // Required fields
  if (!submission.name) missing_required.push('name')
  if (!submission.address) missing_required.push('address')
  if (!submission.city) missing_required.push('city')
  if (!submission.state) missing_required.push('state')

  // Recommended fields
  if (!submission.phone && !submission.email && !submission.website) {
    warnings.push('No contact information provided (phone, email, or website recommended)')
    missing_recommended.push('phone OR email OR website')
  }
  if (!submission.description) {
    warnings.push('No description provided (recommended for user clarity)')
    missing_recommended.push('description')
  }
  if (!submission.primary_category) {
    warnings.push('No category provided (recommended for better search results)')
    missing_recommended.push('primary_category')
  }

  if (missing_required.length > 0) {
    errors.push(`Missing required fields: ${missing_required.join(', ')}`)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    missing_required,
    missing_recommended,
  }
}

/**
 * Type guard: has minimal required fields
 */
export function isMinimalResourceSubmission(
  submission: Partial<ResourceSubmission>
): submission is MinimalResourceSubmission {
  return !!(submission.name && submission.address && submission.city && submission.state)
}

/**
 * Type guard: has recommended fields for quality
 */
export function hasRecommendedFields(submission: ResourceSubmission): boolean {
  const hasContact = !!(submission.phone || submission.email || submission.website)
  const hasDescription = !!submission.description
  const hasCategory = !!submission.primary_category

  return hasContact && hasDescription && hasCategory
}

// ============================================================================
// EXAMPLES
// ============================================================================

/**
 * Example: Minimal valid submission
 */
export const EXAMPLE_MINIMAL_SUBMISSION: ResourceSubmission = {
  name: 'Oakland Job Center',
  address: '1212 Broadway',
  city: 'Oakland',
  state: 'CA',
}

/**
 * Example: Complete submission (best practice)
 *
 * This demonstrates all commonly-used fields that agents should try to populate.
 * Note: This is derived from the actual Resource schema, so it will stay in sync
 * as we add new fields to the database.
 */
export const EXAMPLE_COMPLETE_SUBMISSION: ResourceSubmission = {
  // ===== REQUIRED =====
  name: 'Oakland Reentry Resource Center',
  address: '1212 Broadway, Suite 500',
  city: 'Oakland',
  state: 'CA',

  // ===== LOCATION =====
  zip: '94612',
  county: 'Alameda',
  latitude: 37.8044,
  longitude: -122.2712,

  // ===== CONTACT =====
  phone: '(510) 555-0100',
  email: 'info@orrc.org',
  website: 'https://oaklandreentry.org',

  // ===== DESCRIPTION =====
  description:
    'Comprehensive reentry services including job training, housing assistance, and case management. Serving Alameda County since 2010.',

  // ===== CATEGORIZATION =====
  primary_category: 'general_support',
  categories: ['employment', 'housing', 'legal_aid', 'general_support'],
  tags: ['job-training', 'resume-help', 'housing-search', 'case-management'],

  // ===== SERVICES =====
  services_offered: [
    'Job training and placement',
    'Resume and interview preparation',
    'Housing assistance',
    'Legal aid referrals',
    'Case management',
  ],
  eligibility_requirements: 'Formerly incarcerated individuals, 18+',
  accepts_records: true,
  appointment_required: false,

  // ===== SCHEDULE =====
  hours: {
    monday: { open: '09:00', close: '17:00' },
    tuesday: { open: '09:00', close: '17:00' },
    wednesday: { open: '09:00', close: '17:00' },
    thursday: { open: '09:00', close: '17:00' },
    friday: { open: '09:00', close: '15:00' },
  },
  timezone: 'America/Los_Angeles',

  // ===== PROVENANCE (AI submissions) =====
  source: 'google_search',
  source_url: 'https://oaklandreentry.org',
  discovered_via: 'websearch',
  discovery_notes: 'Found via search: "Oakland reentry services"',

  // ===== ORGANIZATION =====
  org_name: 'Oakland Reentry Resource Center',
  location_name: 'Downtown Oakland Office',
  is_parent: false,
}

// ============================================================================
// FIELD MAPPING REFERENCE
// ============================================================================

/**
 * Maps ResourceSubmission fields to their database destinations
 *
 * This documents which submission fields go where in the database:
 * - Most fields → resources table (upon approval)
 * - Submission metadata → resource_suggestions table
 * - Auto-generated fields → calculated by system
 */
export const FIELD_MAPPING = {
  // Core fields → resources table
  to_resources: [
    'name',
    'description',
    'address',
    'city',
    'state',
    'zip',
    'county',
    'latitude',
    'longitude',
    'phone',
    'email',
    'website',
    'primary_category',
    'categories',
    'tags',
    'services_offered',
    'eligibility_requirements',
    'accepts_records',
    'appointment_required',
    'hours',
    'timezone',
    'photos',
    'logo_url',
    'org_name',
    'location_name',
    'is_parent',
    'parent_resource_id',
  ] as const,

  // Submission metadata → resource_suggestions table only
  to_suggestions_only: [
    'source',
    'source_url',
    'discovered_via',
    'discovery_notes',
    'reason',
    'personal_experience',
  ] as const,

  // Auto-generated on approval → not submitted
  auto_generated: [
    'id',
    'created_at',
    'updated_at',
    'slug',
    'verified',
    'verified_by',
    'verified_date',
    'status',
    'rating_average',
    'rating_count',
    'review_count',
    'view_count',
  ] as const,

  // Set by AI agents/system → not submitted by users
  system_managed: [
    'ai_discovered',
    'ai_enriched',
    'ai_last_verified',
    'ai_verification_score',
    'data_completeness_score',
    'phone_verified',
    'phone_last_verified',
    'change_log',
  ] as const,
} as const

/**
 * Get all submittable field names
 */
export function getSubmittableFields(): readonly string[] {
  return [...FIELD_MAPPING.to_resources, ...FIELD_MAPPING.to_suggestions_only]
}

/**
 * Check if a field is submittable
 */
export function isSubmittableField(field: string): boolean {
  return getSubmittableFields().includes(field)
}
