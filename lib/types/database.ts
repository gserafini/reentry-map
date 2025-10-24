/**
 * Database type definitions for Supabase tables
 * Generated based on schema in supabase/migrations/
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string | null
          phone: string | null
          avatar_url: string | null
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          phone?: string | null
          avatar_url?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          phone?: string | null
          avatar_url?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      resources: {
        Row: {
          id: string
          name: string
          description: string | null
          services_offered: string[] | null
          phone: string | null
          phone_verified: boolean
          phone_last_verified: string | null
          email: string | null
          website: string | null
          address: string
          latitude: number | null
          longitude: number | null
          primary_category: string
          categories: string[]
          tags: string[]
          hours: Json | null
          eligibility_requirements: string | null
          documents_required: string[] | null
          languages_spoken: string[] | null
          accessibility_features: string[] | null
          rating_average: number
          rating_count: number
          review_count: number
          ai_enriched: boolean
          verification_score: number
          completeness_score: number
          last_verified: string | null
          status: 'draft' | 'active' | 'inactive' | 'flagged'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          services_offered?: string[] | null
          phone?: string | null
          phone_verified?: boolean
          phone_last_verified?: string | null
          email?: string | null
          website?: string | null
          address: string
          latitude?: number | null
          longitude?: number | null
          primary_category: string
          categories?: string[]
          tags?: string[]
          hours?: Json | null
          eligibility_requirements?: string | null
          documents_required?: string[] | null
          languages_spoken?: string[] | null
          accessibility_features?: string[] | null
          rating_average?: number
          rating_count?: number
          review_count?: number
          ai_enriched?: boolean
          verification_score?: number
          completeness_score?: number
          last_verified?: string | null
          status?: 'draft' | 'active' | 'inactive' | 'flagged'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          services_offered?: string[] | null
          phone?: string | null
          phone_verified?: boolean
          phone_last_verified?: string | null
          email?: string | null
          website?: string | null
          address?: string
          latitude?: number | null
          longitude?: number | null
          primary_category?: string
          categories?: string[]
          tags?: string[]
          hours?: Json | null
          eligibility_requirements?: string | null
          documents_required?: string[] | null
          languages_spoken?: string[] | null
          accessibility_features?: string[] | null
          rating_average?: number
          rating_count?: number
          review_count?: number
          ai_enriched?: boolean
          verification_score?: number
          completeness_score?: number
          last_verified?: string | null
          status?: 'draft' | 'active' | 'inactive' | 'flagged'
          created_at?: string
          updated_at?: string
        }
      }
      user_favorites: {
        Row: {
          id: string
          user_id: string
          resource_id: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          resource_id: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          resource_id?: string
          notes?: string | null
          created_at?: string
        }
      }
      resource_ratings: {
        Row: {
          id: string
          user_id: string
          resource_id: string
          rating: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          resource_id: string
          rating: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          resource_id?: string
          rating?: number
          created_at?: string
          updated_at?: string
        }
      }
      resource_reviews: {
        Row: {
          id: string
          user_id: string
          resource_id: string
          rating: number
          review_text: string | null
          pros: string | null
          cons: string | null
          tips: string | null
          visited_date: string | null
          was_helpful: boolean
          would_recommend: boolean
          is_approved: boolean
          helpful_count: number
          not_helpful_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          resource_id: string
          rating: number
          review_text?: string | null
          pros?: string | null
          cons?: string | null
          tips?: string | null
          visited_date?: string | null
          was_helpful?: boolean
          would_recommend?: boolean
          is_approved?: boolean
          helpful_count?: number
          not_helpful_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          resource_id?: string
          rating?: number
          review_text?: string | null
          pros?: string | null
          cons?: string | null
          tips?: string | null
          visited_date?: string | null
          was_helpful?: boolean
          would_recommend?: boolean
          is_approved?: boolean
          helpful_count?: number
          not_helpful_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      review_helpfulness: {
        Row: {
          id: string
          review_id: string
          user_id: string
          is_helpful: boolean
          created_at: string
        }
        Insert: {
          id?: string
          review_id: string
          user_id: string
          is_helpful: boolean
          created_at?: string
        }
        Update: {
          id?: string
          review_id?: string
          user_id?: string
          is_helpful?: boolean
          created_at?: string
        }
      }
      resource_suggestions: {
        Row: {
          id: string
          name: string
          description: string | null
          address: string
          phone: string | null
          website: string | null
          category: string
          submitted_by: string
          status: 'pending' | 'approved' | 'rejected' | 'duplicate'
          admin_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          address: string
          phone?: string | null
          website?: string | null
          category: string
          submitted_by: string
          status?: 'pending' | 'approved' | 'rejected' | 'duplicate'
          admin_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          address?: string
          phone?: string | null
          website?: string | null
          category?: string
          submitted_by?: string
          status?: 'pending' | 'approved' | 'rejected' | 'duplicate'
          admin_notes?: string | null
          created_at?: string
        }
      }
      resource_updates: {
        Row: {
          id: string
          resource_id: string
          reported_by: string
          issue_type: string
          description: string
          suggested_fix: string | null
          status: 'pending' | 'resolved' | 'dismissed'
          admin_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          resource_id: string
          reported_by: string
          issue_type: string
          description: string
          suggested_fix?: string | null
          status?: 'pending' | 'resolved' | 'dismissed'
          admin_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          resource_id?: string
          reported_by?: string
          issue_type?: string
          description?: string
          suggested_fix?: string | null
          status?: 'pending' | 'resolved' | 'dismissed'
          admin_notes?: string | null
          created_at?: string
        }
      }
      ai_agent_logs: {
        Row: {
          id: string
          agent_type: string
          resource_id: string | null
          operation: string
          input_data: Json | null
          output_data: Json | null
          success: boolean
          error_message: string | null
          cost_usd: number | null
          execution_time_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_type: string
          resource_id?: string | null
          operation: string
          input_data?: Json | null
          output_data?: Json | null
          success?: boolean
          error_message?: string | null
          cost_usd?: number | null
          execution_time_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_type?: string
          resource_id?: string | null
          operation?: string
          input_data?: Json | null
          output_data?: Json | null
          success?: boolean
          error_message?: string | null
          cost_usd?: number | null
          execution_time_ms?: number | null
          created_at?: string
        }
      }
    }
    Functions: {
      calculate_distance: {
        Args: {
          lat1: number
          lon1: number
          lat2: number
          lon2: number
        }
        Returns: number
      }
      get_resources_near: {
        Args: {
          user_lat: number
          user_lng: number
          radius_miles?: number
        }
        Returns: {
          id: string
          name: string
          address: string
          distance: number
        }[]
      }
    }
  }
}

// Helper types for common use cases
export type Resource = Database['public']['Tables']['resources']['Row']
export type ResourceInsert = Database['public']['Tables']['resources']['Insert']
export type ResourceUpdate = Database['public']['Tables']['resources']['Update']

export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type ResourceReview = Database['public']['Tables']['resource_reviews']['Row']
export type ResourceRating = Database['public']['Tables']['resource_ratings']['Row']
export type UserFavorite = Database['public']['Tables']['user_favorites']['Row']

// Category types
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

export type ResourceStatus = 'draft' | 'active' | 'inactive' | 'flagged'

export type SuggestionStatus = 'pending' | 'approved' | 'rejected' | 'duplicate'

export type UpdateStatus = 'pending' | 'resolved' | 'dismissed'
