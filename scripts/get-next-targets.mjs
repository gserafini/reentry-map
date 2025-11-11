#!/usr/bin/env node

/**
 * Get Next Research Targets
 *
 * Queries the expansion priorities database to get the highest-priority
 * locations ready for research by AI agents.
 *
 * Uses Supabase service role key for admin access (bypasses RLS).
 *
 * Usage:
 *   node scripts/get-next-targets.mjs [limit] [status] [research_status]
 *
 * Examples:
 *   node scripts/get-next-targets.mjs 10
 *   node scripts/get-next-targets.mjs 5 identified not_started
 *   node scripts/get-next-targets.mjs 20 identified,researching not_started,blocked
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Parse command line args
const limit = parseInt(process.argv[2] || '10')
const statusFilter = process.argv[3] ? process.argv[3].split(',') : ['identified', 'researching']
const researchStatusFilter = process.argv[4]
  ? process.argv[4].split(',')
  : ['not_started', 'blocked']

async function getNextTargets() {
  try {
    // Create Supabase admin client (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Build query matching API logic
    let query = supabase
      .from('expansion_priorities')
      .select('*')
      .order('priority_score', { ascending: false })

    // Apply filters (matching next-target API defaults)
    query = query.in('status', statusFilter)
    query = query.in('research_status', researchStatusFilter)
    query = query.limit(limit)

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      process.exit(1)
    }

    // Display results
    if (!data || data.length === 0) {
      console.log('\n⚠️  No targets found matching criteria')
      console.log(`   Status: ${statusFilter.join(', ')}`)
      console.log(`   Research Status: ${researchStatusFilter.join(', ')}`)
      return
    }

    console.log(`\n📍 Top ${data.length} Next Research Targets:\n`)
    console.log(
      `Filters: status=[${statusFilter.join(', ')}], research_status=[${researchStatusFilter.join(', ')}]\n`
    )

    data.forEach((target, index) => {
      console.log(`${index + 1}. ${target.city}, ${target.state}`)
      console.log(`   Priority Score: ${target.priority_score}`)
      console.log(`   Tier: ${target.priority_tier}`)
      console.log(`   Phase: ${target.phase || 'N/A'}`)
      console.log(`   Status: ${target.status}`)
      console.log(`   Research Status: ${target.research_status}`)
      if (target.metro_area) {
        console.log(`   Metro Area: ${target.metro_area}`)
      }
      if (target.population) {
        console.log(`   Metro Population: ${target.population.toLocaleString()}`)
      }
      if (target.strategic_rationale) {
        console.log(`   Rationale: ${target.strategic_rationale}`)
      }
      console.log()
    })

    console.log(`Total targets found: ${data.length}`)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

getNextTargets()
