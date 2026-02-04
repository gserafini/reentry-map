/**
 * Drizzle ORM Schema Definitions
 *
 * This file defines the database schema for the self-hosted PostgreSQL database.
 * Schema is generated from the canonical database documentation.
 *
 * Tables currently in self-hosted DB:
 * - users (with NextAuth integration)
 * - phone_otps (for phone verification)
 *
 * @see docs/DATABASE_SCHEMA_CANONICAL.md
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  doublePrecision,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { CategoryPriority, DataSource } from '@/lib/types/expansion'

// ============================================================================
// USERS TABLE
// ============================================================================

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').unique(),
    phone: text('phone').unique(),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    isAdmin: boolean('is_admin').default(false).notNull(),
    passwordHash: text('password_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_users_email').on(table.email), index('idx_users_phone').on(table.phone)]
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// ============================================================================
// PHONE OTPS TABLE (for phone verification)
// ============================================================================

export const phoneOtps = pgTable(
  'phone_otps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phone: text('phone').notNull(),
    code: text('code').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    verified: boolean('verified').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_phone_otps_phone').on(table.phone)]
)

export type PhoneOtp = typeof phoneOtps.$inferSelect
export type NewPhoneOtp = typeof phoneOtps.$inferInsert

// ============================================================================
// RESOURCES TABLE
// ============================================================================

export const resources = pgTable(
  'resources',
  {
    // Basic Information
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    servicesOffered: text('services_offered').array(),

    // Contact Information
    phone: text('phone'),
    phoneVerified: boolean('phone_verified').default(false),
    phoneLastVerified: timestamp('phone_last_verified', { withTimezone: true }),
    email: text('email'),
    website: text('website'),

    // Location
    address: text('address').notNull(),
    city: text('city'),
    state: text('state'),
    zip: text('zip'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    county: text('county'),
    countyFips: text('county_fips'),
    neighborhood: text('neighborhood'),
    formattedAddress: text('formatted_address'),
    googlePlaceId: text('google_place_id'),
    locationType: text('location_type'),
    addressType: text('address_type').default('physical'),
    serviceArea: jsonb('service_area'),

    // Schedule & Hours
    hours: jsonb('hours'),
    timezone: text('timezone').default('America/Los_Angeles'),

    // Categorization
    primaryCategory: text('primary_category').notNull(),
    categories: text('categories').array(),
    tags: text('tags').array(),

    // Eligibility & Requirements
    eligibilityRequirements: text('eligibility_requirements'),
    acceptsRecords: boolean('accepts_records').default(true),
    appointmentRequired: boolean('appointment_required').default(false),
    requiredDocuments: text('required_documents').array(),
    fees: text('fees'),

    // Accessibility & Languages
    languages: text('languages').array(),
    accessibilityFeatures: text('accessibility_features').array(),

    // Media
    photos: jsonb('photos'),
    logoUrl: text('logo_url'),
    screenshotUrl: text('screenshot_url'),
    screenshotCapturedAt: timestamp('screenshot_captured_at', { withTimezone: true }),

    // AI Metadata
    aiDiscovered: boolean('ai_discovered').default(false),
    aiEnriched: boolean('ai_enriched').default(false),
    aiLastVerified: timestamp('ai_last_verified', { withTimezone: true }),
    aiVerificationScore: doublePrecision('ai_verification_score'),
    dataCompletenessScore: doublePrecision('data_completeness_score'),

    // Verification (Autonomous AI System)
    verificationStatus: text('verification_status').default('pending'),
    verificationConfidence: doublePrecision('verification_confidence'),
    verificationHistory: jsonb('verification_history').default([]),
    lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
    nextVerificationAt: timestamp('next_verification_at', { withTimezone: true }),
    verificationSource: text('verification_source'),
    humanReviewRequired: boolean('human_review_required').default(false),
    provenance: jsonb('provenance'),

    // Manual Verification (Legacy)
    verified: boolean('verified').default(false),
    verifiedBy: uuid('verified_by').references(() => users.id, { onDelete: 'set null' }),
    verifiedDate: timestamp('verified_date', { withTimezone: true }),

    // Community Stats (Auto-Updated by Triggers)
    ratingAverage: doublePrecision('rating_average').default(0),
    ratingCount: integer('rating_count').default(0),
    reviewCount: integer('review_count').default(0),
    viewCount: integer('view_count').default(0),

    // Status & Moderation
    status: text('status').default('active'),
    statusReason: text('status_reason'),
    closureStatus: text('closure_status'),
    correctionNotes: text('correction_notes'),

    // Parent-Child Relationships
    parentResourceId: uuid('parent_resource_id'),
    orgName: text('org_name'),
    locationName: text('location_name'),
    isParent: boolean('is_parent').default(false),
    changeLog: jsonb('change_log').default([]),

    // Data Provenance & External IDs
    source: text('source'),
    isUnique: boolean('is_unique').default(false),
    alsoIn211: boolean('also_in_211').default(false),
    alsoInGovtDb: boolean('also_in_govt_db').default(false),
    external211Id: text('external_211_id'),
    externalGovtId: text('external_govt_id'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),

    // SEO
    slug: text('slug'),
  },
  (table) => [
    index('idx_resources_primary_category').on(table.primaryCategory),
    index('idx_resources_status').on(table.status),
    index('idx_resources_verification_status').on(table.verificationStatus),
    index('idx_resources_slug').on(table.slug),
  ]
)

export type Resource = typeof resources.$inferSelect
export type NewResource = typeof resources.$inferInsert

// ============================================================================
// USER FAVORITES TABLE
// ============================================================================

export const userFavorites = pgTable(
  'user_favorites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_user_favorites_user').on(table.userId),
    index('idx_user_favorites_resource').on(table.resourceId),
  ]
)

export type UserFavorite = typeof userFavorites.$inferSelect
export type NewUserFavorite = typeof userFavorites.$inferInsert

// ============================================================================
// RESOURCE RATINGS TABLE
// ============================================================================

export const resourceRatings = pgTable(
  'resource_ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(), // 1-5
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_resource_ratings_resource').on(table.resourceId),
    index('idx_resource_ratings_user').on(table.userId),
  ]
)

export type ResourceRating = typeof resourceRatings.$inferSelect
export type NewResourceRating = typeof resourceRatings.$inferInsert

// ============================================================================
// RESOURCE REVIEWS TABLE
// ============================================================================

export const resourceReviews = pgTable(
  'resource_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(), // 1-5
    text: text('text'),
    pros: text('pros').array(),
    cons: text('cons').array(),
    tips: text('tips'),
    status: text('status').default('pending'), // pending, approved, rejected
    helpfulCount: integer('helpful_count').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_resource_reviews_resource').on(table.resourceId),
    index('idx_resource_reviews_user').on(table.userId),
    index('idx_resource_reviews_status').on(table.status),
  ]
)

export type ResourceReview = typeof resourceReviews.$inferSelect
export type NewResourceReview = typeof resourceReviews.$inferInsert

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  favorites: many(userFavorites),
  ratings: many(resourceRatings),
  reviews: many(resourceReviews),
}))

export const resourcesRelations = relations(resources, ({ one, many }) => ({
  verifiedByUser: one(users, {
    fields: [resources.verifiedBy],
    references: [users.id],
  }),
  favorites: many(userFavorites),
  ratings: many(resourceRatings),
  reviews: many(resourceReviews),
}))

export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userFavorites.userId],
    references: [users.id],
  }),
  resource: one(resources, {
    fields: [userFavorites.resourceId],
    references: [resources.id],
  }),
}))

export const resourceRatingsRelations = relations(resourceRatings, ({ one }) => ({
  user: one(users, {
    fields: [resourceRatings.userId],
    references: [users.id],
  }),
  resource: one(resources, {
    fields: [resourceRatings.resourceId],
    references: [resources.id],
  }),
}))

export const resourceReviewsRelations = relations(resourceReviews, ({ one }) => ({
  user: one(users, {
    fields: [resourceReviews.userId],
    references: [users.id],
  }),
  resource: one(resources, {
    fields: [resourceReviews.resourceId],
    references: [resources.id],
  }),
}))

// ============================================================================
// REVIEW HELPFULNESS TABLE
// ============================================================================

export const reviewHelpfulness = pgTable(
  'review_helpfulness',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reviewId: uuid('review_id')
      .notNull()
      .references(() => resourceReviews.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    helpful: boolean('helpful').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_helpfulness_review').on(table.reviewId)]
)

export type ReviewHelpfulness = typeof reviewHelpfulness.$inferSelect
export type NewReviewHelpfulness = typeof reviewHelpfulness.$inferInsert

// ============================================================================
// RESOURCE SUGGESTIONS TABLE
// ============================================================================

export const resourceSuggestions = pgTable(
  'resource_suggestions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    suggestedBy: uuid('suggested_by').references(() => users.id, { onDelete: 'set null' }),

    // Suggested resource details
    name: text('name').notNull(),
    address: text('address'),
    city: text('city'),
    state: text('state'),
    zip: text('zip'),
    phone: text('phone'),
    email: text('email'),
    website: text('website'),
    description: text('description'),
    category: text('category'),
    primaryCategory: text('primary_category'),
    categories: text('categories').array(),
    tags: text('tags').array(),

    // Hours, services, eligibility
    hours: jsonb('hours'),
    servicesOffered: text('services_offered').array(),
    eligibilityRequirements: text('eligibility_requirements'),
    languages: text('languages').array(),
    accessibilityFeatures: text('accessibility_features').array(),

    // Location coordinates
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),

    // Context
    reason: text('reason'),
    personalExperience: text('personal_experience'),

    // Review workflow
    status: text('status').default('pending'),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNotes: text('review_notes'),
    adminNotes: text('admin_notes'),

    // Rejection handling
    rejectionReason: text('rejection_reason'),
    correctionNotes: text('correction_notes'),
    closureStatus: text('closure_status'),

    // Research pipeline integration
    researchTaskId: uuid('research_task_id'),
    discoveredVia: text('discovered_via'),
    discoveryNotes: text('discovery_notes'),

    // If approved, link to created resource
    createdResourceId: uuid('created_resource_id').references(() => resources.id),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_suggestions_status').on(table.status),
    index('idx_suggestions_user').on(table.suggestedBy),
  ]
)

export type ResourceSuggestion = typeof resourceSuggestions.$inferSelect
export type NewResourceSuggestion = typeof resourceSuggestions.$inferInsert

// ============================================================================
// RESOURCE UPDATES TABLE
// ============================================================================

export const resourceUpdates = pgTable(
  'resource_updates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    reportedBy: uuid('reported_by').references(() => users.id, { onDelete: 'set null' }),

    updateType: text('update_type').notNull(),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    description: text('description'),

    status: text('status').default('pending'),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_updates_resource').on(table.resourceId),
    index('idx_updates_status').on(table.status),
  ]
)

export type ResourceUpdate = typeof resourceUpdates.$inferSelect
export type NewResourceUpdate = typeof resourceUpdates.$inferInsert

// ============================================================================
// AI AGENT LOGS TABLE
// ============================================================================

export const aiAgentLogs = pgTable(
  'ai_agent_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentType: text('agent_type').notNull(),
    resourceId: uuid('resource_id').references(() => resources.id, { onDelete: 'set null' }),

    action: text('action').notNull(),
    input: jsonb('input'),
    output: jsonb('output'),

    success: boolean('success'),
    errorMessage: text('error_message'),
    confidenceScore: doublePrecision('confidence_score'),

    cost: doublePrecision('cost'),
    durationMs: integer('duration_ms'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_agent_logs_type').on(table.agentType),
    index('idx_agent_logs_resource').on(table.resourceId),
    index('idx_agent_logs_created').on(table.createdAt),
  ]
)

export type AiAgentLog = typeof aiAgentLogs.$inferSelect
export type NewAiAgentLog = typeof aiAgentLogs.$inferInsert

// ============================================================================
// VERIFICATION LOGS TABLE
// ============================================================================

export const verificationLogs = pgTable(
  'verification_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resourceId: uuid('resource_id').references(() => resources.id, { onDelete: 'cascade' }),
    suggestionId: uuid('suggestion_id').references(() => resourceSuggestions.id, {
      onDelete: 'set null',
    }),

    // Verification metadata
    verificationType: text('verification_type').notNull(),
    agentVersion: text('agent_version').notNull(),

    // Results
    overallScore: doublePrecision('overall_score'),
    checksPerformed: jsonb('checks_performed').default({}),
    conflictsFound: jsonb('conflicts_found').default([]),
    changesDetected: jsonb('changes_detected').default([]),

    // Decision
    decision: text('decision').notNull(),
    decisionReason: text('decision_reason'),
    autoApproved: boolean('auto_approved').default(false),
    humanReviewed: boolean('human_reviewed').default(false),
    humanReviewerId: uuid('human_reviewer_id').references(() => users.id),
    humanDecision: text('human_decision'),
    humanNotes: text('human_notes'),

    // Performance tracking
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    durationMs: integer('duration_ms'),
    apiCallsMade: integer('api_calls_made').default(0),
    estimatedCostUsd: doublePrecision('estimated_cost_usd'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_verification_logs_resource').on(table.resourceId),
    index('idx_verification_logs_suggestion').on(table.suggestionId),
    index('idx_verification_logs_decision').on(table.decision),
  ]
)

export type VerificationLog = typeof verificationLogs.$inferSelect
export type NewVerificationLog = typeof verificationLogs.$inferInsert

// ============================================================================
// VERIFICATION EVENTS TABLE (for realtime updates)
// ============================================================================

export const verificationEvents = pgTable(
  'verification_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    suggestionId: uuid('suggestion_id').references(() => resourceSuggestions.id, {
      onDelete: 'cascade',
    }),
    eventType: text('event_type').notNull(),
    eventData: jsonb('event_data').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_verification_events_suggestion').on(table.suggestionId),
    index('idx_verification_events_created_at').on(table.createdAt),
    index('idx_verification_events_type').on(table.eventType),
  ]
)

export type VerificationEvent = typeof verificationEvents.$inferSelect
export type NewVerificationEvent = typeof verificationEvents.$inferInsert

// ============================================================================
// EXPANSION PRIORITIES TABLE
// ============================================================================

export const expansionPriorities = pgTable(
  'expansion_priorities',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Geographic Info
    city: text('city').notNull(),
    state: text('state').notNull(),
    county: text('county'),
    metroArea: text('metro_area'),
    region: text('region'),

    // Priority Scoring
    priorityScore: integer('priority_score').default(0),
    priorityTier: text('priority_tier').default('tier_3'),

    // Ranking Factors
    population: integer('population'),
    stateReleaseVolume: integer('state_release_volume'),
    incarcerationRate: integer('incarceration_rate'),
    existingResourcesCount: integer('existing_resources_count').default(0),
    geographicClusterBonus: integer('geographic_cluster_bonus').default(0),
    dataAvailabilityScore: integer('data_availability_score').default(0),
    communityPartnerCount: integer('community_partner_count').default(0),

    // Status & Timeline
    status: text('status').default('identified').notNull(),
    phase: text('phase'),
    targetLaunchDate: timestamp('target_launch_date', { withTimezone: true }),
    actualLaunchDate: timestamp('actual_launch_date', { withTimezone: true }),

    // Research Pipeline Integration
    researchStatus: text('research_status').default('not_started'),
    researchAgentAssignedAt: timestamp('research_agent_assigned_at', { withTimezone: true }),
    researchAgentCompletedAt: timestamp('research_agent_completed_at', { withTimezone: true }),
    researchNotes: text('research_notes'),

    // Resource Goals
    targetResourceCount: integer('target_resource_count').default(50),
    currentResourceCount: integer('current_resource_count').default(0),

    // JSON fields
    priorityCategories: jsonb('priority_categories').$type<CategoryPriority[]>().default([]),
    dataSources: jsonb('data_sources').$type<DataSource[]>().default([]),

    // Strategic Notes
    strategicRationale: text('strategic_rationale'),
    blockers: text('blockers'),
    specialConsiderations: text('special_considerations'),

    // Metadata
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    launchedBy: uuid('launched_by').references(() => users.id),
  },
  (table) => [
    index('idx_expansion_priorities_status').on(table.status),
    index('idx_expansion_priorities_priority_score').on(table.priorityScore),
    index('idx_expansion_priorities_phase').on(table.phase),
    index('idx_expansion_priorities_state').on(table.state),
  ]
)

export type ExpansionPriority = typeof expansionPriorities.$inferSelect
export type NewExpansionPriority = typeof expansionPriorities.$inferInsert

// ============================================================================
// EXPANSION MILESTONES TABLE
// ============================================================================

export const expansionMilestones = pgTable(
  'expansion_milestones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    expansionId: uuid('expansion_id')
      .notNull()
      .references(() => expansionPriorities.id, { onDelete: 'cascade' }),
    milestoneType: text('milestone_type').notNull(),
    milestoneDate: timestamp('milestone_date', { withTimezone: true }).defaultNow().notNull(),
    notes: text('notes'),
    achievedBy: uuid('achieved_by').references(() => users.id),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_expansion_milestones_expansion_id').on(table.expansionId),
    index('idx_expansion_milestones_type').on(table.milestoneType),
    index('idx_expansion_milestones_date').on(table.milestoneDate),
  ]
)

export type ExpansionMilestone = typeof expansionMilestones.$inferSelect
export type NewExpansionMilestone = typeof expansionMilestones.$inferInsert

// ============================================================================
// COUNTY DATA TABLE
// ============================================================================

export const countyData = pgTable(
  'county_data',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Geographic identifiers
    fipsCode: text('fips_code').notNull().unique(),
    stateFips: text('state_fips').notNull(),
    countyFips: text('county_fips').notNull(),
    stateCode: text('state_code').notNull(),
    stateName: text('state_name').notNull(),
    countyName: text('county_name').notNull(),

    // Population data
    totalPopulation: integer('total_population'),
    populationYear: integer('population_year'),

    // Reentry population estimates
    estimatedAnnualReleases: integer('estimated_annual_releases'),
    reentryDataSource: text('reentry_data_source'),
    reentryDataYear: integer('reentry_data_year'),

    // Priority classification
    priorityTier: integer('priority_tier'),
    priorityWeight: doublePrecision('priority_weight'),
    priorityReason: text('priority_reason'),

    // Geographic data
    geometry: jsonb('geometry'),
    centerLat: doublePrecision('center_lat'),
    centerLng: doublePrecision('center_lng'),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_county_data_fips').on(table.fipsCode),
    index('idx_county_data_state').on(table.stateCode),
    index('idx_county_data_priority').on(table.priorityTier),
  ]
)

export type CountyData = typeof countyData.$inferSelect
export type NewCountyData = typeof countyData.$inferInsert

// ============================================================================
// COVERAGE METRICS TABLE
// ============================================================================

export const coverageMetrics = pgTable(
  'coverage_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Geographic scope
    geographyType: text('geography_type').notNull(),
    geographyId: text('geography_id').notNull(),
    geographyName: text('geography_name').notNull(),

    // Composite coverage score (0-100)
    coverageScore: doublePrecision('coverage_score').default(0).notNull(),

    // Component scores (0-100 each)
    resourceCountScore: doublePrecision('resource_count_score').default(0),
    categoryCoverageScore: doublePrecision('category_coverage_score').default(0),
    populationCoverageScore: doublePrecision('population_coverage_score').default(0),
    verificationScore: doublePrecision('verification_score').default(0),

    // Resource metrics
    totalResources: integer('total_resources').default(0),
    verifiedResources: integer('verified_resources').default(0),
    categoriesCovered: integer('categories_covered').default(0),
    uniqueResources: integer('unique_resources').default(0),

    // Population coverage
    totalPopulation: integer('total_population'),
    reentryPopulation: integer('reentry_population'),

    // Comparison metrics
    resourcesIn211: integer('resources_in_211').default(0),
    comprehensivenessRatio: doublePrecision('comprehensiveness_ratio').default(0),

    // Quality metrics
    avgCompletenessScore: doublePrecision('avg_completeness_score'),
    avgVerificationScore: doublePrecision('avg_verification_score'),
    resourcesWithReviews: integer('resources_with_reviews').default(0),
    reviewCoveragePct: doublePrecision('review_coverage_pct').default(0),

    // Timestamps
    calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
    lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_coverage_metrics_type').on(table.geographyType),
    index('idx_coverage_metrics_geography').on(table.geographyType, table.geographyId),
    index('idx_coverage_metrics_score').on(table.coverageScore),
  ]
)

export type CoverageMetric = typeof coverageMetrics.$inferSelect
export type NewCoverageMetric = typeof coverageMetrics.$inferInsert

// ============================================================================
// RESEARCH TASKS TABLE
// ============================================================================

export const researchTasks = pgTable(
  'research_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Task definition
    county: text('county').notNull(),
    state: text('state').notNull(),
    category: text('category'), // NULL = all categories
    targetCount: integer('target_count').default(20),

    // Status
    status: text('status').default('pending'),

    // Assignment
    assignedTo: text('assigned_to'),
    assignedAt: timestamp('assigned_at', { withTimezone: true }),

    // Progress
    resourcesFound: integer('resources_found').default(0),
    resourcesPublished: integer('resources_published').default(0),

    // Instructions for agent
    searchInstructions: text('search_instructions'),
    searchQueries: text('search_queries').array(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

    // Priority
    priority: integer('priority').default(50),
  },
  (table) => [
    index('idx_research_tasks_status').on(table.status),
    index('idx_research_tasks_assigned').on(table.assignedTo),
    index('idx_research_tasks_county').on(table.county, table.state),
  ]
)

export type ResearchTask = typeof researchTasks.$inferSelect
export type NewResearchTask = typeof researchTasks.$inferInsert
