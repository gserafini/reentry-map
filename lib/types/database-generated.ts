/**
 * Auto-generated types from Supabase database schema
 * Generated: 2025-10-24
 * Do not edit manually - regenerate using: mcp__supabase__generate_typescript_types
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
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
      }
    }
  }
}

// Helper type for selecting from tables
export type Resource = Database['public']['Tables']['resources']['Row']
export type ResourceInsert = Database['public']['Tables']['resources']['Insert']
export type ResourceUpdate = Database['public']['Tables']['resources']['Update']
