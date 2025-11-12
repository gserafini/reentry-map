// Expansion Priorities Types
// Used by admin for managing geographic expansion and research pipeline

export type ExpansionStatus =
  | 'identified'
  | 'researching'
  | 'ready_for_launch'
  | 'launched'
  | 'deferred'
  | 'rejected'

export type ExpansionResearchStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked'

export type ExpansionPriorityTier = 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4'

export type ExpansionRegion = 'northeast' | 'southeast' | 'midwest' | 'southwest' | 'west'

export type ExpansionPhase =
  | 'phase_1'
  | 'phase_2a'
  | 'phase_2b'
  | 'phase_2c'
  | 'phase_2d'
  | 'phase_3a'
  | 'phase_3b'
  | 'phase_3c'
  | 'phase_4'
  | 'phase_5'

export interface CategoryPriority {
  category: string
  priority: 'high' | 'medium' | 'low'
  target_count: number
  current_count?: number
}

export interface DataSource {
  name: string
  url?: string
  quality: 'high' | 'medium' | 'low'
  last_checked?: string
  notes?: string
}

export interface ExpansionPriority {
  id: string

  // Geographic Info
  city: string
  state: string
  county?: string
  metro_area?: string
  region?: ExpansionRegion

  // Priority Scoring
  priority_score: number
  priority_tier: ExpansionPriorityTier

  // Ranking Factors
  population?: number
  state_release_volume?: number
  incarceration_rate?: number
  existing_resources_count: number
  geographic_cluster_bonus: number
  data_availability_score: number
  community_partner_count: number

  // Status & Timeline
  status: ExpansionStatus
  phase?: ExpansionPhase
  target_launch_date?: string
  actual_launch_date?: string

  // Research Pipeline Integration
  research_status: ExpansionResearchStatus
  research_agent_assigned_at?: string
  research_agent_completed_at?: string
  research_notes?: string

  // Resource Goals
  target_resource_count: number
  current_resource_count: number

  // Category Priorities & Data Sources
  priority_categories: CategoryPriority[]
  data_sources: DataSource[]

  // Strategic Notes
  strategic_rationale?: string
  blockers?: string
  special_considerations?: string

  // Metadata
  created_by?: string
  created_at: string
  updated_at: string
  launched_by?: string
}

export interface ExpansionPriorityWithProgress extends ExpansionPriority {
  progress_percentage: number
  milestone_count: number
  last_milestone_date?: string
}

export type MilestoneType =
  | 'research_started'
  | 'research_completed'
  | 'resources_50_reached'
  | 'resources_100_reached'
  | 'ready_for_review'
  | 'approved_for_launch'
  | 'launched'
  | 'resources_verified'

export interface ExpansionMilestone {
  id: string
  expansion_id: string
  milestone_type: MilestoneType
  milestone_date: string
  notes?: string
  achieved_by?: string
  metadata?: Record<string, unknown>
  created_at: string
}

// Request/Response types for API
export interface CreateExpansionPriorityRequest {
  city: string
  state: string
  county?: string
  metro_area?: string
  region?: ExpansionRegion
  phase?: ExpansionPhase
  population?: number
  state_release_volume?: number
  incarceration_rate?: number
  data_availability_score?: number
  geographic_cluster_bonus?: number
  community_partner_count?: number
  target_resource_count?: number
  target_launch_date?: string
  priority_categories?: CategoryPriority[]
  data_sources?: DataSource[]
  strategic_rationale?: string
  special_considerations?: string
}

export interface UpdateExpansionPriorityRequest extends Partial<CreateExpansionPriorityRequest> {
  status?: ExpansionStatus
  research_status?: ExpansionResearchStatus
  research_notes?: string
  blockers?: string
  current_resource_count?: number
}

export interface ExpansionPriorityFilters {
  status?: ExpansionStatus[]
  research_status?: ExpansionResearchStatus[]
  phase?: ExpansionPhase[]
  state?: string[]
  region?: ExpansionRegion[]
  min_priority_score?: number
  search?: string
}

export interface ExpansionPrioritySortOptions {
  field:
    | 'priority_score'
    | 'created_at'
    | 'target_launch_date'
    | 'city'
    | 'state'
    | 'progress_percentage'
  direction: 'asc' | 'desc'
}

// For the research agent to query next priority
export interface NextResearchTargetRequest {
  status?: ExpansionStatus[]
  research_status?: ExpansionResearchStatus[]
  phase?: ExpansionPhase[]
  limit?: number
}

export interface CreateMilestoneRequest {
  expansion_id: string
  milestone_type: MilestoneType
  notes?: string
  metadata?: Record<string, unknown>
}
