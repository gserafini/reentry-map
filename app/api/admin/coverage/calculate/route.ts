import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/coverage/calculate
 *
 * Triggers recalculation of coverage metrics for specified geography
 * or all geographies if no parameters provided
 *
 * Body:
 * - geography_type?: 'national' | 'state' | 'county' | 'city' | 'all'
 * - geography_id?: string (e.g., 'CA', '06001', 'Oakland')
 *
 * Returns:
 * - success: boolean
 * - calculated: number (count of geographies recalculated)
 * - results: updated metrics
 *
 * Requires admin authentication
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = (await request.json()) as { geography_type?: string; geography_id?: string }
    const { geography_type, geography_id } = body

    let calculated = 0
    const results: any[] = []

    if (geography_type === 'all' || (!geography_type && !geography_id)) {
      // Recalculate everything
      const { data, error } = await supabase.rpc('recalculate_all_coverage')

      if (error) throw error

      calculated = data?.length || 0
      results.push(...(data || []))
    } else if (geography_type && geography_id) {
      // Recalculate specific geography
      const { error } = await supabase.rpc('calculate_coverage_metrics', {
        p_geography_type: geography_type,
        p_geography_id: geography_id,
      })

      if (error) throw error

      // Fetch the updated metric
      const { data: metric, error: metricError } = await supabase
        .from('coverage_metrics')
        .select('*')
        .eq('geography_type', geography_type)
        .eq('geography_id', geography_id)
        .single()

      if (metricError) throw metricError

      calculated = 1
      results.push(metric)
    } else if (geography_type) {
      // Recalculate all of one type
      let geographies: string[] = []

      if (geography_type === 'national') {
        geographies = ['US']
      } else if (geography_type === 'state') {
        const { data: states } = await supabase.from('resources').select('state').eq('status', 'active')

        geographies = [...new Set(states?.map((s) => s.state) || [])]
      } else if (geography_type === 'county') {
        const { data: counties } = await supabase
          .from('resources')
          .select('county_fips')
          .eq('status', 'active')
          .not('county_fips', 'is', null)

        geographies = [...new Set(counties?.map((c) => c.county_fips!) || [])]
      } else if (geography_type === 'city') {
        const { data: cities } = await supabase.from('resources').select('city').eq('status', 'active')

        geographies = [...new Set(cities?.map((c) => c.city) || [])]
      }

      // Calculate each geography
      for (const geoId of geographies) {
        const { error } = await supabase.rpc('calculate_coverage_metrics', {
          p_geography_type: geography_type,
          p_geography_id: geoId,
        })

        if (error) {
          console.error(`Error calculating ${geography_type}/${geoId}:`, error)
          continue
        }

        calculated++
      }

      // Fetch updated metrics
      const { data: metrics } = await supabase
        .from('coverage_metrics')
        .select('*')
        .eq('geography_type', geography_type)
        .order('coverage_score', { ascending: false })

      results.push(...(metrics || []))
    } else {
      return NextResponse.json({ error: 'Must provide geography_type or set to "all"' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      calculated,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error calculating coverage metrics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
