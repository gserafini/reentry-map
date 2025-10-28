/**
 * Database type definitions for Supabase
 * Auto-generated from Supabase schema with custom helper types
 * Last updated: 2025-10-24
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      ai_agent_logs: {
        Row: {
          action: string
          agent_type: string
          confidence_score: number | null
          cost: number | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          input: Json | null
          output: Json | null
          resource_id: string | null
          success: boolean | null
        }
        Insert: {
          action: string
          agent_type: string
          confidence_score?: number | null
          cost?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          resource_id?: string | null
          success?: boolean | null
        }
        Update: {
          action?: string
          agent_type?: string
          confidence_score?: number | null
          cost?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          resource_id?: string | null
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: 'ai_agent_logs_resource_id_fkey'
            columns: ['resource_id']
            isOneToOne: false
            referencedRelation: 'resources'
            referencedColumns: ['id']
          },
        ]
      }
      resource_ratings: {
        Row: {
          created_at: string | null
          id: string
          rating: number
          resource_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          rating: number
          resource_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          rating?: number
          resource_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'resource_ratings_resource_id_fkey'
            columns: ['resource_id']
            isOneToOne: false
            referencedRelation: 'resources'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'resource_ratings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      resource_reviews: {
        Row: {
          approved: boolean | null
          cons: string | null
          created_at: string | null
          flag_reason: string | null
          flagged: boolean | null
          helpful_count: number | null
          id: string
          moderated_at: string | null
          moderated_by: string | null
          not_helpful_count: number | null
          pros: string | null
          rating: number
          resource_id: string
          review_text: string | null
          tips: string | null
          updated_at: string | null
          user_id: string
          verified_visit: boolean | null
          visited_date: string | null
          was_helpful: boolean | null
          would_recommend: boolean | null
        }
        Insert: {
          approved?: boolean | null
          cons?: string | null
          created_at?: string | null
          flag_reason?: string | null
          flagged?: boolean | null
          helpful_count?: number | null
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          not_helpful_count?: number | null
          pros?: string | null
          rating: number
          resource_id: string
          review_text?: string | null
          tips?: string | null
          updated_at?: string | null
          user_id: string
          verified_visit?: boolean | null
          visited_date?: string | null
          was_helpful?: boolean | null
          would_recommend?: boolean | null
        }
        Update: {
          approved?: boolean | null
          cons?: string | null
          created_at?: string | null
          flag_reason?: string | null
          flagged?: boolean | null
          helpful_count?: number | null
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          not_helpful_count?: number | null
          pros?: string | null
          rating?: number
          resource_id?: string
          review_text?: string | null
          tips?: string | null
          updated_at?: string | null
          user_id?: string
          verified_visit?: boolean | null
          visited_date?: string | null
          was_helpful?: boolean | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: 'resource_reviews_moderated_by_fkey'
            columns: ['moderated_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'resource_reviews_resource_id_fkey'
            columns: ['resource_id']
            isOneToOne: false
            referencedRelation: 'resources'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'resource_reviews_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      resource_suggestions: {
        Row: {
          address: string | null
          category: string | null
          created_at: string | null
          created_resource_id: string | null
          description: string | null
          id: string
          name: string
          personal_experience: string | null
          phone: string | null
          reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          suggested_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          created_at?: string | null
          created_resource_id?: string | null
          description?: string | null
          id?: string
          name: string
          personal_experience?: string | null
          phone?: string | null
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          suggested_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          created_at?: string | null
          created_resource_id?: string | null
          description?: string | null
          id?: string
          name?: string
          personal_experience?: string | null
          phone?: string | null
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          suggested_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'resource_suggestions_created_resource_id_fkey'
            columns: ['created_resource_id']
            isOneToOne: false
            referencedRelation: 'resources'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'resource_suggestions_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'resource_suggestions_suggested_by_fkey'
            columns: ['suggested_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      resource_updates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          new_value: string | null
          old_value: string | null
          reported_by: string | null
          resource_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          update_type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          reported_by?: string | null
          resource_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          update_type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          reported_by?: string | null
          resource_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'resource_updates_reported_by_fkey'
            columns: ['reported_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'resource_updates_resource_id_fkey'
            columns: ['resource_id']
            isOneToOne: false
            referencedRelation: 'resources'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'resource_updates_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      resources: {
        Row: {
          accepts_records: boolean | null
          address: string
          ai_discovered: boolean | null
          ai_enriched: boolean | null
          ai_last_verified: string | null
          ai_verification_score: number | null
          appointment_required: boolean | null
          categories: string[] | null
          city: string | null
          county: string | null
          created_at: string | null
          data_completeness_score: number | null
          description: string | null
          eligibility_requirements: string | null
          email: string | null
          hours: Json | null
          id: string
          latitude: number
          logo_url: string | null
          longitude: number
          name: string
          phone: string | null
          phone_last_verified: string | null
          phone_verified: boolean | null
          photos: Json[] | null
          primary_category: string
          rating_average: number | null
          rating_count: number | null
          review_count: number | null
          services_offered: string[] | null
          slug: string | null
          state: string | null
          status: string | null
          status_reason: string | null
          tags: string[] | null
          timezone: string | null
          updated_at: string | null
          verified: boolean | null
          verified_by: string | null
          verified_date: string | null
          view_count: number | null
          website: string | null
          zip: string | null
        }
        Insert: {
          accepts_records?: boolean | null
          address: string
          ai_discovered?: boolean | null
          ai_enriched?: boolean | null
          ai_last_verified?: string | null
          ai_verification_score?: number | null
          appointment_required?: boolean | null
          categories?: string[] | null
          city?: string | null
          county?: string | null
          created_at?: string | null
          data_completeness_score?: number | null
          description?: string | null
          eligibility_requirements?: string | null
          email?: string | null
          hours?: Json | null
          id?: string
          latitude: number
          logo_url?: string | null
          longitude: number
          name: string
          phone?: string | null
          phone_last_verified?: string | null
          phone_verified?: boolean | null
          photos?: Json[] | null
          primary_category: string
          rating_average?: number | null
          rating_count?: number | null
          review_count?: number | null
          services_offered?: string[] | null
          slug?: string | null
          state?: string | null
          status?: string | null
          status_reason?: string | null
          tags?: string[] | null
          timezone?: string | null
          updated_at?: string | null
          verified?: boolean | null
          verified_by?: string | null
          verified_date?: string | null
          view_count?: number | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          accepts_records?: boolean | null
          address?: string
          ai_discovered?: boolean | null
          ai_enriched?: boolean | null
          ai_last_verified?: string | null
          ai_verification_score?: number | null
          appointment_required?: boolean | null
          categories?: string[] | null
          city?: string | null
          county?: string | null
          created_at?: string | null
          data_completeness_score?: number | null
          description?: string | null
          eligibility_requirements?: string | null
          email?: string | null
          hours?: Json | null
          id?: string
          latitude?: number
          logo_url?: string | null
          longitude?: number
          name?: string
          phone?: string | null
          phone_last_verified?: string | null
          phone_verified?: boolean | null
          photos?: Json[] | null
          primary_category?: string
          rating_average?: number | null
          rating_count?: number | null
          review_count?: number | null
          services_offered?: string[] | null
          slug?: string | null
          state?: string | null
          status?: string | null
          status_reason?: string | null
          tags?: string[] | null
          timezone?: string | null
          updated_at?: string | null
          verified?: boolean | null
          verified_by?: string | null
          verified_date?: string | null
          view_count?: number | null
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'resources_verified_by_fkey'
            columns: ['verified_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      review_helpfulness: {
        Row: {
          created_at: string | null
          helpful: boolean
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          helpful: boolean
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          helpful?: boolean
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'review_helpfulness_review_id_fkey'
            columns: ['review_id']
            isOneToOne: false
            referencedRelation: 'resource_reviews'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'review_helpfulness_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          resource_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          resource_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_favorites_resource_id_fkey'
            columns: ['resource_id']
            isOneToOne: false
            referencedRelation: 'resources'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_favorites_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          is_admin: boolean | null
          name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id: string
          is_admin?: boolean | null
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      get_resources_near: {
        Args: { radius_miles?: number; user_lat: number; user_lng: number }
        Returns: {
          address: string
          distance: number
          id: string
          name: string
        }[]
      }
    }
  }
}

// ============================================================================
// HELPER TYPES FOR COMMON USE CASES
// ============================================================================

/**
 * Extract Row type for a table
 * @example type MyResource = Tables<'resources'>
 */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/**
 * Extract Insert type for a table
 * @example type NewResource = TablesInsert<'resources'>
 */
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

/**
 * Extract Update type for a table
 * @example type ResourceUpdate = TablesUpdate<'resources'>
 */
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// ============================================================================
// SPECIFIC TABLE TYPES (Convenience aliases)
// ============================================================================

/** Resource table types */
export type Resource = Tables<'resources'>
export type ResourceInsert = TablesInsert<'resources'>
export type ResourceUpdate = TablesUpdate<'resources'>

/** User table types */
export type User = Tables<'users'>
export type UserInsert = TablesInsert<'users'>
export type UserUpdate = TablesUpdate<'users'>

/** Resource review types */
export type ResourceReview = Tables<'resource_reviews'>
export type ResourceReviewInsert = TablesInsert<'resource_reviews'>
export type ResourceReviewUpdate = TablesUpdate<'resource_reviews'>

/** Resource rating types */
export type ResourceRating = Tables<'resource_ratings'>
export type ResourceRatingInsert = TablesInsert<'resource_ratings'>
export type ResourceRatingUpdate = TablesUpdate<'resource_ratings'>

/** User favorite types */
export type UserFavorite = Tables<'user_favorites'>
export type UserFavoriteInsert = TablesInsert<'user_favorites'>
export type UserFavoriteUpdate = TablesUpdate<'user_favorites'>

/** Resource suggestion types */
export type ResourceSuggestion = Tables<'resource_suggestions'>
export type ResourceSuggestionInsert = TablesInsert<'resource_suggestions'>
export type ResourceSuggestionUpdate = TablesUpdate<'resource_suggestions'>

/** Resource update types */
export type ResourceUpdateReport = Tables<'resource_updates'>
export type ResourceUpdateReportInsert = TablesInsert<'resource_updates'>
export type ResourceUpdateReportUpdate = TablesUpdate<'resource_updates'>

/** AI agent log types */
export type AIAgentLog = Tables<'ai_agent_logs'>
export type AIAgentLogInsert = TablesInsert<'ai_agent_logs'>
export type AIAgentLogUpdate = TablesUpdate<'ai_agent_logs'>

/** Review helpfulness types */
export type ReviewHelpfulness = Tables<'review_helpfulness'>
export type ReviewHelpfulnessInsert = TablesInsert<'review_helpfulness'>
export type ReviewHelpfulnessUpdate = TablesUpdate<'review_helpfulness'>

// ============================================================================
// CATEGORY & STATUS ENUMS
// ============================================================================

/**
 * Valid resource categories
 * Based on CLAUDE.md category system
 */
export type ResourceCategory =
  | 'employment'
  | 'housing'
  | 'food'
  | 'clothing'
  | 'healthcare'
  | 'mental-health'
  | 'substance-abuse'
  | 'legal-aid'
  | 'transportation'
  | 'id-documents'
  | 'education'
  | 'faith-based'
  | 'general-support'

/**
 * Resource status values
 */
export type ResourceStatus = 'draft' | 'active' | 'inactive' | 'flagged'

/**
 * Resource suggestion status values
 */
export type SuggestionStatus = 'pending' | 'approved' | 'rejected' | 'duplicate'

/**
 * Resource update report status values
 */
export type UpdateStatus = 'pending' | 'resolved' | 'dismissed'

// ============================================================================
// QUERY RESULT TYPES (Common query patterns)
// ============================================================================

/**
 * Resource with distance (from get_resources_near function)
 */
export type ResourceWithDistance = {
  id: string
  name: string
  address: string
  distance: number
}

/**
 * Resource with full details and user interaction data
 * Useful for detail pages
 */
export type ResourceWithInteractions = Resource & {
  is_favorited?: boolean
  user_rating?: number
  has_reviewed?: boolean
}

/**
 * Resource list item (optimized for list views)
 */
export type ResourceListItem = Pick<
  Resource,
  | 'id'
  | 'name'
  | 'description'
  | 'address'
  | 'primary_category'
  | 'categories'
  | 'phone'
  | 'website'
  | 'rating_average'
  | 'rating_count'
  | 'review_count'
> & {
  distance?: number
  is_favorited?: boolean
}

/**
 * Review with user information
 * Useful for displaying reviews with author details
 */
export type ReviewWithUser = ResourceReview & {
  user: Pick<User, 'id' | 'name' | 'avatar_url'>
}

/**
 * Resource suggestion with reviewer info
 */
export type SuggestionWithReviewer = ResourceSuggestion & {
  reviewer?: Pick<User, 'id' | 'name'> | null
  suggester?: Pick<User, 'id' | 'name'> | null
}

// ============================================================================
// FORM TYPES (For react-hook-form + zod validation)
// ============================================================================

/**
 * Form data for creating a new resource
 * Omits auto-generated fields
 */
export type ResourceFormData = Omit<
  ResourceInsert,
  'id' | 'created_at' | 'updated_at' | 'rating_average' | 'rating_count' | 'review_count'
>

/**
 * Form data for creating a review
 */
export type ReviewFormData = Omit<
  ResourceReviewInsert,
  'id' | 'created_at' | 'updated_at' | 'user_id'
>

/**
 * Form data for suggesting a resource
 */
export type SuggestionFormData = Omit<
  ResourceSuggestionInsert,
  'id' | 'created_at' | 'suggested_by' | 'status' | 'reviewed_at' | 'reviewed_by' | 'review_notes'
>

/**
 * Form data for reporting a resource issue
 */
export type UpdateReportFormData = Omit<
  ResourceUpdateReportInsert,
  'id' | 'created_at' | 'reported_by' | 'status' | 'reviewed_at' | 'reviewed_by'
>

// ============================================================================
// FILTER & SEARCH TYPES
// ============================================================================

/**
 * Resource search/filter parameters
 */
export type ResourceFilters = {
  search?: string
  categories?: ResourceCategory[]
  tags?: string[]
  latitude?: number
  longitude?: number
  radius_miles?: number
  min_rating?: number
  verified_only?: boolean
  accepts_records?: boolean
  appointment_required?: boolean | null
}

/**
 * Pagination parameters
 */
export type PaginationParams = {
  page?: number
  limit?: number
  offset?: number
}

/**
 * Sort parameters for resource queries
 */
export type ResourceSort = {
  field: 'name' | 'rating_average' | 'distance' | 'created_at' | 'updated_at'
  direction: 'asc' | 'desc'
}
