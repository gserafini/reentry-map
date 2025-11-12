#!/usr/bin/env node
/**
 * Populate Expansion Priorities
 *
 * Seeds the expansion_priorities table with nationwide expansion priorities
 * from GEOGRAPHIC_EXPANSION_STRATEGY.md
 *
 * Includes:
 * - Phase 1: California (7 cities)
 * - Phase 2: Texas, Florida, New York, Illinois (13 cities)
 * - Phase 3A: High-impact markets (7 cities)
 * - Phase 3B: Growing markets (5 cities)
 * - Phase 3C: Regional hubs (8 cities)
 * - Phase 4: Comprehensive state coverage (25+ cities)
 * - Total: 60+ cities across all 50 states
 *
 * Prioritization based on:
 * - Metro population
 * - State release volume
 * - Data availability
 * - Geographic clustering
 * - Community partner count
 *
 * Run: node scripts/populate-expansion-priorities.mjs
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const expansionPriorities = [
  // ========================================================================
  // PHASE 1: CALIFORNIA EXPANSION
  // ========================================================================

  // Tier 1 Cities (Immediate: Q1-Q2 2026)
  {
    city: 'Los Angeles',
    state: 'CA',
    county: 'Los Angeles',
    metro_area: 'Greater Los Angeles',
    region: 'west',
    phase: 'phase_1',
    priority_tier: 'tier_1',

    // Ranking factors
    population: 13200000,
    state_release_volume: 987000, // CA total
    incarceration_rate: 402,
    data_availability_score: 90, // High - 211 LA, county resources
    geographic_cluster_bonus: 100, // Adjacent to existing Bay Area coverage
    community_partner_count: 15, // Estimated major reentry orgs

    // Goals
    target_resource_count: 100,
    target_launch_date: '2026-03-31',

    // Strategic info
    strategic_rationale:
      'Largest CA metro, highest absolute release volume in the nation. ~40,000 currently incarcerated. Strong reentry infrastructure with 211 LA, Root & Rebound, Anti-Recidivism Coalition.',
    special_considerations:
      'Bilingual resources critical (Spanish). Focus neighborhoods: Downtown LA, South LA, East LA (high concentration areas).',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 20 },
      { category: 'housing', priority: 'high', target_count: 20 },
      { category: 'legal_aid', priority: 'high', target_count: 15 },
      { category: 'substance_abuse', priority: 'high', target_count: 15 },
      { category: 'food', priority: 'medium', target_count: 10 },
    ],
    data_sources: [
      { name: '211 LA', url: 'https://211la.org', quality: 'high' },
      { name: 'LA County Probation', url: 'https://probation.lacounty.gov', quality: 'high' },
      { name: 'Root & Rebound', url: 'https://rootandrebound.org', quality: 'high' },
      { name: 'Anti-Recidivism Coalition', url: 'https://antirecidivism.org', quality: 'high' },
    ],
  },

  {
    city: 'San Diego',
    state: 'CA',
    county: 'San Diego',
    metro_area: 'San Diego-Chula Vista-Carlsbad',
    region: 'west',
    phase: 'phase_1',
    priority_tier: 'tier_1',

    population: 3300000,
    state_release_volume: 987000,
    incarceration_rate: 267,
    data_availability_score: 85,
    geographic_cluster_bonus: 80, // Southern CA cluster
    community_partner_count: 8,

    target_resource_count: 75,
    target_launch_date: '2026-03-31',

    strategic_rationale:
      '2nd largest CA metro. 8,799 currently in prison. Strong reentry programs and parolee concentration. Veterans Village and county reentry services well-established.',
    special_considerations:
      'High veteran population - prioritize veterans services. Focus neighborhoods: City Heights, Southeast San Diego, National City.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 15 },
      { category: 'housing', priority: 'high', target_count: 15 },
      { category: 'veterans_services', priority: 'high', target_count: 12 },
      { category: 'healthcare', priority: 'medium', target_count: 10 },
    ],
    data_sources: [
      { name: '211 San Diego', url: 'https://211sandiego.org', quality: 'high' },
      { name: 'SD County Reentry Services', url: 'https://www.sdsheriff.gov', quality: 'high' },
      { name: 'Veterans Village', url: 'https://vvsd.net', quality: 'high' },
    ],
  },

  {
    city: 'Sacramento',
    state: 'CA',
    county: 'Sacramento',
    metro_area: 'Sacramento-Roseville-Folsom',
    region: 'west',
    phase: 'phase_1',
    priority_tier: 'tier_1',

    population: 2400000,
    state_release_volume: 987000,
    incarceration_rate: 558, // Highest in CA
    data_availability_score: 95, // State capital - excellent data
    geographic_cluster_bonus: 90, // Central CA, connects Bay Area to Central Valley
    community_partner_count: 10,

    target_resource_count: 60,
    target_launch_date: '2026-06-30',

    strategic_rationale:
      'State capital with highest imprisonment rate in CA (558/100k). Government resources concentrated here. Major parolee hub with state reentry programs.',
    special_considerations:
      'Focus neighborhoods: South Sacramento, Oak Park, Del Paso Heights. Leverage state government resources.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 12 },
      { category: 'housing', priority: 'high', target_count: 12 },
      { category: 'legal_aid', priority: 'high', target_count: 10 },
      { category: 'general_support', priority: 'medium', target_count: 10 },
    ],
    data_sources: [
      { name: '211 Sacramento', url: 'https://211sacramento.org', quality: 'high' },
      { name: 'Sacramento County Probation', quality: 'high' },
      { name: 'CA State Reentry Programs', quality: 'high' },
    ],
  },

  // Tier 2 Cities (Q3-Q4 2026)
  {
    city: 'San Jose',
    state: 'CA',
    county: 'Santa Clara',
    metro_area: 'San Jose-Sunnyvale-Santa Clara',
    region: 'west',
    phase: 'phase_1',
    priority_tier: 'tier_2',

    population: 2000000,
    state_release_volume: 987000,
    incarceration_rate: 250, // Moderate (estimated)
    data_availability_score: 90,
    geographic_cluster_bonus: 100, // Adjacent to existing Bay Area coverage
    community_partner_count: 7,

    target_resource_count: 60,
    target_launch_date: '2026-09-30',

    strategic_rationale:
      'Tech hub adjacent to existing Bay Area coverage. Strong 211 infrastructure. Santa Clara County has established reentry services.',
    special_considerations:
      'High cost of living - housing crisis particularly acute. Bilingual resources needed.',
    priority_categories: [
      { category: 'housing', priority: 'high', target_count: 15 },
      { category: 'employment', priority: 'high', target_count: 12 },
      { category: 'transportation', priority: 'medium', target_count: 8 },
    ],
    data_sources: [
      { name: '211 Silicon Valley', quality: 'high' },
      { name: 'Santa Clara County Probation', quality: 'high' },
    ],
  },

  {
    city: 'Fresno',
    state: 'CA',
    county: 'Fresno',
    metro_area: 'Fresno',
    region: 'west',
    phase: 'phase_1',
    priority_tier: 'tier_2',

    population: 1000000,
    state_release_volume: 987000,
    incarceration_rate: 450, // High (estimated)
    data_availability_score: 75,
    geographic_cluster_bonus: 70, // Central Valley concentration
    community_partner_count: 5,

    target_resource_count: 50,
    target_launch_date: '2026-09-30',

    strategic_rationale:
      'Central Valley concentration. Prison Policy Initiative identifies as high-incarceration city. Regional hub for agricultural areas.',
    special_considerations:
      'Agricultural employment opportunities. Spanish language critical. Transportation challenges (sprawl).',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 12 },
      { category: 'housing', priority: 'high', target_count: 10 },
      { category: 'substance_abuse', priority: 'high', target_count: 8 },
    ],
    data_sources: [
      { name: '211 Fresno County', quality: 'medium' },
      { name: 'Fresno County Probation', quality: 'medium' },
    ],
  },

  {
    city: 'Riverside',
    state: 'CA',
    county: 'Riverside',
    metro_area: 'Riverside-San Bernardino-Ontario (Inland Empire)',
    region: 'west',
    phase: 'phase_1',
    priority_tier: 'tier_2',

    population: 4600000, // Combined Inland Empire
    state_release_volume: 987000,
    incarceration_rate: 350, // Moderate-high (estimated)
    data_availability_score: 80,
    geographic_cluster_bonus: 90, // Adjacent to LA
    community_partner_count: 8,

    target_resource_count: 75,
    target_launch_date: '2026-12-31',

    strategic_rationale:
      'Large metro area (4.6M combined Inland Empire). Growing population, proximity to LA. Serves both Riverside and San Bernardino counties.',
    special_considerations:
      'Sprawling area - may need separate San Bernardino city page later. Transportation critical.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 15 },
      { category: 'housing', priority: 'high', target_count: 15 },
      { category: 'transportation', priority: 'high', target_count: 10 },
    ],
    data_sources: [
      { name: '211 Riverside County', quality: 'high' },
      { name: '211 San Bernardino', quality: 'high' },
      { name: 'Inland Empire Reentry Coalition', quality: 'medium' },
    ],
  },

  {
    city: 'Bakersfield',
    state: 'CA',
    county: 'Kern',
    metro_area: 'Bakersfield',
    region: 'west',
    phase: 'phase_1',
    priority_tier: 'tier_2',

    population: 900000,
    state_release_volume: 987000,
    incarceration_rate: 500, // Very high (estimated)
    data_availability_score: 70,
    geographic_cluster_bonus: 60,
    community_partner_count: 4,

    target_resource_count: 40,
    target_launch_date: '2026-12-31',

    strategic_rationale:
      'Major parolee destination. Kern County known for high parolee concentration. Reentry facilities present. Central Valley hub.',
    special_considerations:
      'Oil industry employment. Agricultural work. High concentration of parolees relative to population.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 10 },
      { category: 'housing', priority: 'high', target_count: 8 },
      { category: 'substance_abuse', priority: 'high', target_count: 8 },
    ],
    data_sources: [
      { name: '211 Kern County', quality: 'medium' },
      { name: 'Kern County Probation', quality: 'medium' },
    ],
  },

  // ========================================================================
  // PHASE 2A: TEXAS EXPANSION (Q2-Q4 2026)
  // ========================================================================

  {
    city: 'Houston',
    state: 'TX',
    county: 'Harris',
    metro_area: 'Houston-The Woodlands-Sugar Land',
    region: 'southwest',
    phase: 'phase_2a',
    priority_tier: 'tier_1',

    population: 7100000,
    state_release_volume: 200000, // TX total (estimated)
    incarceration_rate: 380,
    data_availability_score: 85,
    geographic_cluster_bonus: 50, // New market entry
    community_partner_count: 12,

    target_resource_count: 100,
    target_launch_date: '2026-09-30',

    strategic_rationale:
      'Largest TX metro. Harris County has large jail population. Houston Reentry Initiative is established program. 2nd highest priority after CA.',
    special_considerations:
      'Hurricane/disaster preparedness. Diverse population - bilingual resources.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 20 },
      { category: 'housing', priority: 'high', target_count: 18 },
      { category: 'faith_based', priority: 'high', target_count: 15 },
      { category: 'veterans_services', priority: 'medium', target_count: 12 },
    ],
    data_sources: [
      { name: 'Texas 211', url: 'https://www.211texas.org', quality: 'high' },
      { name: 'Houston Reentry Initiative', quality: 'high' },
      { name: 'Harris County Probation', quality: 'high' },
    ],
  },

  {
    city: 'Dallas',
    state: 'TX',
    county: 'Dallas',
    metro_area: 'Dallas-Fort Worth-Arlington',
    region: 'southwest',
    phase: 'phase_2a',
    priority_tier: 'tier_1',

    population: 7600000, // DFW combined
    state_release_volume: 200000,
    incarceration_rate: 350,
    data_availability_score: 85,
    geographic_cluster_bonus: 80, // Adjacent to Fort Worth
    community_partner_count: 10,

    target_resource_count: 100,
    target_launch_date: '2026-09-30',

    strategic_rationale:
      'Largest metro in TX (DFW combined). Dallas County has extensive reentry services. Major economic hub.',
    special_considerations: 'May need separate Fort Worth page later. Strong nonprofit sector.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 20 },
      { category: 'housing', priority: 'high', target_count: 18 },
      { category: 'faith_based', priority: 'high', target_count: 15 },
    ],
    data_sources: [
      { name: 'Texas 211', quality: 'high' },
      { name: 'Dallas County Probation', quality: 'high' },
      { name: 'TDCJ Reentry Resources', quality: 'high' },
    ],
  },

  {
    city: 'San Antonio',
    state: 'TX',
    county: 'Bexar',
    metro_area: 'San Antonio-New Braunfels',
    region: 'southwest',
    phase: 'phase_2a',
    priority_tier: 'tier_2',

    population: 2600000,
    state_release_volume: 200000,
    incarceration_rate: 340,
    data_availability_score: 80,
    geographic_cluster_bonus: 70,
    community_partner_count: 7,

    target_resource_count: 60,
    target_launch_date: '2026-12-31',

    strategic_rationale:
      '7th largest US city. Bexar County reentry programs. Strong Hispanic population.',
    special_considerations:
      'Bilingual critical (Spanish). Military/veteran population (multiple bases).',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 12 },
      { category: 'housing', priority: 'high', target_count: 12 },
      { category: 'veterans_services', priority: 'high', target_count: 10 },
    ],
    data_sources: [
      { name: 'Texas 211', quality: 'high' },
      { name: 'Bexar County Probation', quality: 'medium' },
    ],
  },

  {
    city: 'Austin',
    state: 'TX',
    county: 'Travis',
    metro_area: 'Austin-Round Rock-Georgetown',
    region: 'southwest',
    phase: 'phase_2a',
    priority_tier: 'tier_2',

    population: 2300000,
    state_release_volume: 200000,
    incarceration_rate: 280,
    data_availability_score: 90, // State capital
    geographic_cluster_bonus: 70,
    community_partner_count: 8,

    target_resource_count: 50,
    target_launch_date: '2026-12-31',

    strategic_rationale:
      'State capital with government resources. Progressive policies. Strong nonprofit sector. Fast-growing tech hub.',
    special_considerations:
      'High cost of living. Travis County has well-established reentry services.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 12 },
      { category: 'housing', priority: 'high', target_count: 10 },
      { category: 'legal_aid', priority: 'medium', target_count: 8 },
    ],
    data_sources: [
      { name: 'Texas 211', quality: 'high' },
      { name: 'Travis County Reentry Services', quality: 'high' },
    ],
  },

  // ========================================================================
  // PHASE 2B: FLORIDA EXPANSION (Q3 2026 - Q1 2027)
  // ========================================================================

  {
    city: 'Miami',
    state: 'FL',
    county: 'Miami-Dade',
    metro_area: 'Miami-Fort Lauderdale-West Palm Beach',
    region: 'southeast',
    phase: 'phase_2b',
    priority_tier: 'tier_1',

    population: 6100000, // Tri-county
    state_release_volume: 150000, // FL total
    incarceration_rate: 360,
    data_availability_score: 85,
    geographic_cluster_bonus: 50,
    community_partner_count: 10,

    target_resource_count: 100,
    target_launch_date: '2027-03-31',

    strategic_rationale:
      'Largest FL metro. Tri-county area (Miami-Dade, Broward, Palm Beach). High incarceration rates.',
    special_considerations:
      'Bilingual critical (Spanish, Haitian Creole). Cuban, Haitian, Caribbean populations.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 20 },
      { category: 'housing', priority: 'high', target_count: 18 },
      { category: 'healthcare', priority: 'high', target_count: 15 },
      { category: 'substance_abuse', priority: 'medium', target_count: 12 },
    ],
    data_sources: [
      { name: 'Florida 211', quality: 'high' },
      { name: 'Miami-Dade Corrections', quality: 'medium' },
    ],
  },

  {
    city: 'Tampa',
    state: 'FL',
    county: 'Hillsborough',
    metro_area: 'Tampa-St. Petersburg-Clearwater',
    region: 'southeast',
    phase: 'phase_2b',
    priority_tier: 'tier_2',

    population: 3200000,
    state_release_volume: 150000,
    incarceration_rate: 340,
    data_availability_score: 80,
    geographic_cluster_bonus: 75,
    community_partner_count: 7,

    target_resource_count: 75,
    target_launch_date: '2027-03-31',

    strategic_rationale: '2nd largest FL metro. Hillsborough County reentry programs established.',
    special_considerations:
      'Aging population - healthcare needs. Tri-city metro (Tampa, St. Pete, Clearwater).',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 15 },
      { category: 'housing', priority: 'high', target_count: 15 },
      { category: 'healthcare', priority: 'high', target_count: 12 },
    ],
    data_sources: [
      { name: 'Florida 211', quality: 'high' },
      { name: 'Hillsborough County Reentry', quality: 'medium' },
    ],
  },

  {
    city: 'Orlando',
    state: 'FL',
    county: 'Orange',
    metro_area: 'Orlando-Kissimmee-Sanford',
    region: 'southeast',
    phase: 'phase_2b',
    priority_tier: 'tier_2',

    population: 2700000,
    state_release_volume: 150000,
    incarceration_rate: 320,
    data_availability_score: 75,
    geographic_cluster_bonus: 70,
    community_partner_count: 6,

    target_resource_count: 60,
    target_launch_date: '2027-06-30',

    strategic_rationale:
      'Rapidly growing metro. Orange County services. Tourism/hospitality employment.',
    special_considerations: 'Service industry employment dominant. Puerto Rican population.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 12 },
      { category: 'housing', priority: 'high', target_count: 12 },
      { category: 'substance_abuse', priority: 'medium', target_count: 10 },
    ],
    data_sources: [
      { name: 'Florida 211', quality: 'high' },
      { name: 'Orange County Corrections', quality: 'medium' },
    ],
  },

  {
    city: 'Jacksonville',
    state: 'FL',
    county: 'Duval',
    metro_area: 'Jacksonville',
    region: 'southeast',
    phase: 'phase_2b',
    priority_tier: 'tier_2',

    population: 1600000,
    state_release_volume: 150000,
    incarceration_rate: 350,
    data_availability_score: 75,
    geographic_cluster_bonus: 60,
    community_partner_count: 5,

    target_resource_count: 50,
    target_launch_date: '2027-06-30',

    strategic_rationale:
      'Largest city by area in continental US. Duval County reentry initiatives. DOJ federal reentry programs noted.',
    special_considerations: 'Sprawling geography. Military presence (Naval bases).',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 12 },
      { category: 'housing', priority: 'high', target_count: 10 },
      { category: 'veterans_services', priority: 'medium', target_count: 8 },
    ],
    data_sources: [
      { name: 'Florida 211', quality: 'high' },
      { name: 'Duval County Reentry', quality: 'medium' },
    ],
  },

  // ========================================================================
  // PHASE 2C: NEW YORK EXPANSION (Q1-Q2 2027)
  // ========================================================================

  {
    city: 'New York City',
    state: 'NY',
    county: 'Multiple',
    metro_area: 'New York-Newark-Jersey City',
    region: 'northeast',
    phase: 'phase_2c',
    priority_tier: 'tier_1',

    population: 19500000,
    state_release_volume: 100000, // NY state
    incarceration_rate: 280,
    data_availability_score: 95, // Extensive research, documented programs
    geographic_cluster_bonus: 50,
    community_partner_count: 25, // Highest nationally

    target_resource_count: 150,
    target_launch_date: '2027-06-30',

    strategic_rationale:
      'Largest US metro by far (19.5M). 72% of NYS prisoners from just 7 community districts. Extensive reentry ecosystem with Fortune Society, Osborne Association, etc. Most documented urban concentration patterns.',
    special_considerations:
      'Focus neighborhoods: Brooklyn (East NY, Brownsville), Bronx (Mott Haven, Hunts Point), Manhattan (Harlem). Five boroughs need coverage. Complex transit system.',
    priority_categories: [
      { category: 'housing', priority: 'high', target_count: 30 },
      { category: 'employment', priority: 'high', target_count: 25 },
      { category: 'legal_aid', priority: 'high', target_count: 20 },
      { category: 'mental_health', priority: 'high', target_count: 20 },
    ],
    data_sources: [
      { name: 'NYC 311/211', quality: 'high' },
      { name: 'NYC Mayor Office Criminal Justice', quality: 'high' },
      { name: 'NYS DOCCS Reentry', quality: 'high' },
      { name: 'Fortune Society', quality: 'high' },
      { name: 'Osborne Association', quality: 'high' },
    ],
  },

  {
    city: 'Buffalo',
    state: 'NY',
    county: 'Erie',
    metro_area: 'Buffalo-Cheektowaga',
    region: 'northeast',
    phase: 'phase_2c',
    priority_tier: 'tier_3',

    population: 1100000,
    state_release_volume: 100000,
    incarceration_rate: 320,
    data_availability_score: 70,
    geographic_cluster_bonus: 60,
    community_partner_count: 4,

    target_resource_count: 40,
    target_launch_date: '2027-09-30',

    strategic_rationale:
      '2nd largest NY city. Erie County reentry services. Industrial midwest/rust belt patterns.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 10 },
      { category: 'housing', priority: 'high', target_count: 8 },
      { category: 'substance_abuse', priority: 'medium', target_count: 8 },
    ],
    data_sources: [
      { name: 'NYS 211', quality: 'medium' },
      { name: 'Erie County Probation', quality: 'medium' },
    ],
  },

  // ========================================================================
  // PHASE 2D: ILLINOIS EXPANSION (Q2-Q3 2027)
  // ========================================================================

  {
    city: 'Chicago',
    state: 'IL',
    county: 'Cook',
    metro_area: 'Chicago-Naperville-Elgin',
    region: 'midwest',
    phase: 'phase_2d',
    priority_tier: 'tier_1',

    population: 9400000,
    state_release_volume: 90000, // IL total
    incarceration_rate: 350,
    data_availability_score: 90, // Strong Urban Institute research
    geographic_cluster_bonus: 50,
    community_partner_count: 15,

    target_resource_count: 120,
    target_launch_date: '2027-09-30',

    strategic_rationale:
      '3rd largest US city. 54% of male prisoners return to just 7 of 77 neighborhoods. Well-documented concentration patterns. City of Chicago Returning Residents page exists.',
    special_considerations:
      'Focus neighborhoods: West Side (Austin, North Lawndale, West Garfield Park), South Side (Englewood, Auburn Gresham). Gun violence prevention programs critical.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 25 },
      { category: 'housing', priority: 'high', target_count: 20 },
      { category: 'violence_prevention', priority: 'high', target_count: 15 },
      { category: 'food', priority: 'medium', target_count: 15 },
    ],
    data_sources: [
      { name: 'IL 211', quality: 'high' },
      { name: 'Chicago DFSS', quality: 'high' },
      { name: 'IL DOC Reentry', quality: 'high' },
      { name: 'Safer Foundation', quality: 'high' },
      { name: 'Urban Institute Chicago Studies', quality: 'high' },
    ],
  },

  // ========================================================================
  // PHASE 3A: HIGH-IMPACT MARKETS (2027-2028)
  // ========================================================================

  {
    city: 'Philadelphia',
    state: 'PA',
    county: 'Philadelphia',
    metro_area: 'Philadelphia-Camden-Wilmington',
    region: 'northeast',
    phase: 'phase_3a',
    priority_tier: 'tier_1',

    population: 6200000,
    state_release_volume: 75000, // PA estimated
    incarceration_rate: 380,
    data_availability_score: 85, // Urban Institute studies
    geographic_cluster_bonus: 40,
    community_partner_count: 10,

    target_resource_count: 75,
    target_launch_date: '2028-03-31',

    strategic_rationale:
      'Major metro with Urban Institute research available. Established reentry programs. High incarceration rates.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 15 },
      { category: 'housing', priority: 'high', target_count: 15 },
      { category: 'substance_abuse', priority: 'high', target_count: 12 },
    ],
    data_sources: [
      { name: 'PA 211', quality: 'high' },
      { name: 'Philadelphia Reentry Coalition', quality: 'medium' },
    ],
  },

  {
    city: 'Atlanta',
    state: 'GA',
    county: 'Fulton',
    metro_area: 'Atlanta-Sandy Springs-Alpharetta',
    region: 'southeast',
    phase: 'phase_3a',
    priority_tier: 'tier_1',

    population: 6000000,
    state_release_volume: 80000, // GA estimated
    incarceration_rate: 420,
    data_availability_score: 80,
    geographic_cluster_bonus: 40,
    community_partner_count: 9,

    target_resource_count: 75,
    target_launch_date: '2028-03-31',

    strategic_rationale:
      'Southern hub. GA Dept of Community Supervision has reentry services. Fast-growing metro.',
    special_considerations: 'Sprawling metro area. Strong faith-based network.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 15 },
      { category: 'housing', priority: 'high', target_count: 15 },
      { category: 'faith_based', priority: 'high', target_count: 12 },
    ],
    data_sources: [
      { name: 'Georgia 211', quality: 'high' },
      { name: 'GA Dept Community Supervision', quality: 'medium' },
    ],
  },

  {
    city: 'Phoenix',
    state: 'AZ',
    county: 'Maricopa',
    metro_area: 'Phoenix-Mesa-Chandler',
    region: 'southwest',
    phase: 'phase_3a',
    priority_tier: 'tier_1',

    population: 4900000,
    state_release_volume: 60000, // AZ estimated
    incarceration_rate: 390,
    data_availability_score: 80, // Arizona Reentry 2030 initiative
    geographic_cluster_bonus: 40,
    community_partner_count: 8,

    target_resource_count: 75,
    target_launch_date: '2028-06-30',

    strategic_rationale:
      'Fast-growing metro. Arizona Reentry 2030 initiative launched. Strong reentry infrastructure development.',
    special_considerations:
      'Desert climate - transportation challenges. Large Hispanic population.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 15 },
      { category: 'substance_abuse', priority: 'high', target_count: 12 },
      { category: 'healthcare', priority: 'medium', target_count: 10 },
    ],
    data_sources: [
      { name: 'Arizona 211', quality: 'high' },
      { name: 'AZ Dept of Corrections Reentry', quality: 'high' },
    ],
  },

  {
    city: 'Detroit',
    state: 'MI',
    county: 'Wayne',
    metro_area: 'Detroit-Warren-Dearborn',
    region: 'midwest',
    phase: 'phase_3a',
    priority_tier: 'tier_1',

    population: 4300000,
    state_release_volume: 65000, // MI estimated
    incarceration_rate: 420,
    data_availability_score: 75,
    geographic_cluster_bonus: 40,
    community_partner_count: 7,

    target_resource_count: 70,
    target_launch_date: '2028-06-30',

    strategic_rationale:
      'Industrial Midwest. High need. Federal reentry programs documented. Economic revitalization creating opportunities.',
    special_considerations: 'Rust belt economic challenges. Auto industry employment.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 15 },
      { category: 'housing', priority: 'high', target_count: 12 },
      { category: 'substance_abuse', priority: 'high', target_count: 12 },
    ],
    data_sources: [
      { name: 'Michigan 211', quality: 'high' },
      { name: 'Wayne County Reentry', quality: 'medium' },
    ],
  },

  {
    city: 'New Orleans',
    state: 'LA',
    county: 'Orleans',
    metro_area: 'New Orleans-Metairie',
    region: 'southeast',
    phase: 'phase_3a',
    priority_tier: 'tier_1',

    population: 1300000,
    state_release_volume: 45000, // LA total
    incarceration_rate: 683, // HIGHEST IN NATION (Louisiana rate)
    data_availability_score: 70,
    geographic_cluster_bonus: 30,
    community_partner_count: 6,

    target_resource_count: 60,
    target_launch_date: '2028-09-30',

    strategic_rationale:
      'Louisiana has HIGHEST incarceration rate nationally (683/100k). Critical need. Post-Katrina rebuilding created unique landscape.',
    special_considerations:
      'Hurricane/disaster resilience. Unique cultural context. High poverty rates.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 12 },
      { category: 'housing', priority: 'high', target_count: 12 },
      { category: 'substance_abuse', priority: 'high', target_count: 10 },
      { category: 'legal_aid', priority: 'high', target_count: 10 },
    ],
    data_sources: [
      { name: 'Louisiana 211', quality: 'medium' },
      { name: 'Orleans Parish Reentry Court', quality: 'medium' },
    ],
  },

  {
    city: 'Memphis',
    state: 'TN',
    county: 'Shelby',
    metro_area: 'Memphis',
    region: 'southeast',
    phase: 'phase_3a',
    priority_tier: 'tier_2',

    population: 1300000,
    state_release_volume: 55000, // TN estimated
    incarceration_rate: 450,
    data_availability_score: 75,
    geographic_cluster_bonus: 35,
    community_partner_count: 6,

    target_resource_count: 60,
    target_launch_date: '2028-09-30',

    strategic_rationale:
      'Major Tennessee metro. High incarceration rates. Shelby County reentry programs.',
    special_considerations: 'Mid-South regional hub. Strong faith-based network.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 12 },
      { category: 'housing', priority: 'high', target_count: 12 },
      { category: 'faith_based', priority: 'high', target_count: 10 },
    ],
    data_sources: [
      { name: 'Tennessee 211', quality: 'medium' },
      { name: 'Shelby County Reentry', quality: 'medium' },
    ],
  },

  {
    city: 'Baltimore',
    state: 'MD',
    county: 'Baltimore',
    metro_area: 'Baltimore-Columbia-Towson',
    region: 'northeast',
    phase: 'phase_3a',
    priority_tier: 'tier_2',

    population: 2800000,
    state_release_volume: 40000, // MD estimated
    incarceration_rate: 460,
    data_availability_score: 80,
    geographic_cluster_bonus: 50, // Near DC
    community_partner_count: 8,

    target_resource_count: 70,
    target_launch_date: '2028-09-30',

    strategic_rationale:
      'High incarceration rates. Baltimore City reentry programs established. Urban Institute research.',
    special_considerations: 'Urban challenges. Opioid crisis focus needed.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 15 },
      { category: 'substance_abuse', priority: 'high', target_count: 12 },
      { category: 'housing', priority: 'high', target_count: 12 },
    ],
    data_sources: [
      { name: 'Maryland 211', quality: 'high' },
      { name: 'Baltimore City Reentry', quality: 'medium' },
    ],
  },

  // ========================================================================
  // PHASE 3B: GROWING MARKETS (2028-2029)
  // ========================================================================

  {
    city: 'Seattle',
    state: 'WA',
    county: 'King',
    metro_area: 'Seattle-Tacoma-Bellevue',
    region: 'west',
    phase: 'phase_3b',
    priority_tier: 'tier_1',

    population: 4000000,
    state_release_volume: 50000, // WA estimated
    incarceration_rate: 280,
    data_availability_score: 85,
    geographic_cluster_bonus: 40,
    community_partner_count: 9,

    target_resource_count: 75,
    target_launch_date: '2029-03-31',

    strategic_rationale:
      'Pacific Northwest hub. Progressive policies. Strong reentry infrastructure. Tech economy.',
    special_considerations: 'High cost of living. Homelessness issues. Strong nonprofit sector.',
    priority_categories: [
      { category: 'housing', priority: 'high', target_count: 15 },
      { category: 'employment', priority: 'high', target_count: 15 },
      { category: 'mental_health', priority: 'high', target_count: 12 },
    ],
    data_sources: [
      { name: 'Washington 211', quality: 'high' },
      { name: 'King County Reentry', quality: 'high' },
    ],
  },

  {
    city: 'Boston',
    state: 'MA',
    county: 'Suffolk',
    metro_area: 'Boston-Cambridge-Newton',
    region: 'northeast',
    phase: 'phase_3b',
    priority_tier: 'tier_1',

    population: 4900000,
    state_release_volume: 45000, // MA estimated
    incarceration_rate: 250,
    data_availability_score: 90, // Strong research institutions
    geographic_cluster_bonus: 40,
    community_partner_count: 10,

    target_resource_count: 75,
    target_launch_date: '2029-03-31',

    strategic_rationale:
      'Major northeast hub. Strong research and nonprofit infrastructure. Lower incarceration rate but large metro.',
    special_considerations:
      'High cost of living. Strong healthcare sector. University partnerships possible.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 15 },
      { category: 'housing', priority: 'high', target_count: 15 },
      { category: 'healthcare', priority: 'high', target_count: 12 },
    ],
    data_sources: [
      { name: 'Massachusetts 211', quality: 'high' },
      { name: 'MA Reentry Commission', quality: 'high' },
    ],
  },

  {
    city: 'Minneapolis',
    state: 'MN',
    county: 'Hennepin',
    metro_area: 'Minneapolis-St. Paul-Bloomington',
    region: 'midwest',
    phase: 'phase_3b',
    priority_tier: 'tier_2',

    population: 3700000,
    state_release_volume: 40000, // MN estimated
    incarceration_rate: 300,
    data_availability_score: 85,
    geographic_cluster_bonus: 35,
    community_partner_count: 8,

    target_resource_count: 70,
    target_launch_date: '2029-06-30',

    strategic_rationale:
      'Twin Cities metro. Progressive policies. Strong social services infrastructure.',
    special_considerations:
      'Harsh winters - seasonal services needed. Diverse immigrant populations.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 15 },
      { category: 'housing', priority: 'high', target_count: 12 },
      { category: 'mental_health', priority: 'medium', target_count: 10 },
    ],
    data_sources: [
      { name: 'Minnesota 211', quality: 'high' },
      { name: 'Hennepin County Reentry', quality: 'high' },
    ],
  },

  {
    city: 'Denver',
    state: 'CO',
    county: 'Denver',
    metro_area: 'Denver-Aurora-Lakewood',
    region: 'west',
    phase: 'phase_3b',
    priority_tier: 'tier_2',

    population: 3000000,
    state_release_volume: 35000, // CO estimated
    incarceration_rate: 320,
    data_availability_score: 85,
    geographic_cluster_bonus: 35,
    community_partner_count: 7,

    target_resource_count: 60,
    target_launch_date: '2029-06-30',

    strategic_rationale:
      'Fast-growing metro. Mountain region hub. Criminal justice reforms ongoing.',
    special_considerations:
      'High altitude. Outdoor recreation employment opportunities. Growing tech sector.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 12 },
      { category: 'substance_abuse', priority: 'high', target_count: 12 },
      { category: 'housing', priority: 'high', target_count: 10 },
    ],
    data_sources: [
      { name: 'Colorado 211', quality: 'high' },
      { name: 'Denver Reentry Initiative', quality: 'medium' },
    ],
  },

  {
    city: 'Portland',
    state: 'OR',
    county: 'Multnomah',
    metro_area: 'Portland-Vancouver-Hillsboro',
    region: 'west',
    phase: 'phase_3b',
    priority_tier: 'tier_2',

    population: 2500000,
    state_release_volume: 30000, // OR estimated
    incarceration_rate: 290,
    data_availability_score: 80,
    geographic_cluster_bonus: 40, // Near Seattle
    community_partner_count: 7,

    target_resource_count: 60,
    target_launch_date: '2029-09-30',

    strategic_rationale:
      'Pacific Northwest hub. Progressive policies. Strong reentry services. Metro spans OR/WA border.',
    special_considerations: 'Homelessness crisis. Strong nonprofit network.',
    priority_categories: [
      { category: 'housing', priority: 'high', target_count: 15 },
      { category: 'employment', priority: 'high', target_count: 12 },
      { category: 'mental_health', priority: 'high', target_count: 10 },
    ],
    data_sources: [
      { name: 'Oregon 211', quality: 'high' },
      { name: 'Multnomah County Reentry', quality: 'medium' },
    ],
  },

  // ========================================================================
  // PHASE 3C: REGIONAL HUBS (2029-2030)
  // ========================================================================

  {
    city: 'St. Louis',
    state: 'MO',
    county: 'St. Louis',
    metro_area: 'St. Louis',
    region: 'midwest',
    phase: 'phase_3c',
    priority_tier: 'tier_2',

    population: 2800000,
    state_release_volume: 45000, // MO estimated
    incarceration_rate: 420,
    data_availability_score: 75,
    geographic_cluster_bonus: 30,
    community_partner_count: 6,

    target_resource_count: 60,
    target_launch_date: '2029-12-31',

    strategic_rationale:
      'Midwest hub. High incarceration rates. St. Louis reentry programs established.',
    special_considerations: 'Urban challenges. Strong community organizations.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 12 },
      { category: 'housing', priority: 'high', target_count: 12 },
      { category: 'substance_abuse', priority: 'high', target_count: 10 },
    ],
    data_sources: [
      { name: 'Missouri 211', quality: 'medium' },
      { name: 'St. Louis Reentry Coalition', quality: 'medium' },
    ],
  },

  {
    city: 'Charlotte',
    state: 'NC',
    county: 'Mecklenburg',
    metro_area: 'Charlotte-Concord-Gastonia',
    region: 'southeast',
    phase: 'phase_3c',
    priority_tier: 'tier_2',

    population: 2700000,
    state_release_volume: 50000, // NC estimated
    incarceration_rate: 360,
    data_availability_score: 75,
    geographic_cluster_bonus: 30,
    community_partner_count: 6,

    target_resource_count: 60,
    target_launch_date: '2029-12-31',

    strategic_rationale:
      'Fast-growing southern metro. Banking hub. Mecklenburg County reentry services.',
    special_considerations: 'Growing immigrant population. Strong economy.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 12 },
      { category: 'housing', priority: 'high', target_count: 12 },
      { category: 'transportation', priority: 'medium', target_count: 8 },
    ],
    data_sources: [
      { name: 'North Carolina 211', quality: 'high' },
      { name: 'Mecklenburg County Reentry', quality: 'medium' },
    ],
  },

  {
    city: 'Las Vegas',
    state: 'NV',
    county: 'Clark',
    metro_area: 'Las Vegas-Henderson-Paradise',
    region: 'west',
    phase: 'phase_3c',
    priority_tier: 'tier_2',

    population: 2300000,
    state_release_volume: 25000, // NV estimated
    incarceration_rate: 380,
    data_availability_score: 70,
    geographic_cluster_bonus: 30,
    community_partner_count: 5,

    target_resource_count: 50,
    target_launch_date: '2030-03-31',

    strategic_rationale:
      'Fast-growing desert metro. Hospitality employment dominates. Clark County reentry services.',
    special_considerations: 'Service industry jobs. 24-hour city - unique scheduling needs.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 12 },
      { category: 'substance_abuse', priority: 'high', target_count: 10 },
      { category: 'housing', priority: 'high', target_count: 10 },
    ],
    data_sources: [
      { name: 'Nevada 211', quality: 'medium' },
      { name: 'Clark County Reentry', quality: 'medium' },
    ],
  },

  {
    city: 'Columbus',
    state: 'OH',
    county: 'Franklin',
    metro_area: 'Columbus',
    region: 'midwest',
    phase: 'phase_3c',
    priority_tier: 'tier_2',

    population: 2100000,
    state_release_volume: 60000, // OH estimated
    incarceration_rate: 370,
    data_availability_score: 80, // State capital
    geographic_cluster_bonus: 35,
    community_partner_count: 6,

    target_resource_count: 60,
    target_launch_date: '2030-03-31',

    strategic_rationale:
      'State capital. Large metro. Ohio has high release volume. Government resources.',
    special_considerations: 'State government presence. University partnerships possible.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 12 },
      { category: 'housing', priority: 'high', target_count: 12 },
      { category: 'education', priority: 'medium', target_count: 10 },
    ],
    data_sources: [
      { name: 'Ohio 211', quality: 'high' },
      { name: 'Franklin County Reentry', quality: 'medium' },
    ],
  },

  {
    city: 'Indianapolis',
    state: 'IN',
    county: 'Marion',
    metro_area: 'Indianapolis-Carmel-Anderson',
    region: 'midwest',
    phase: 'phase_3c',
    priority_tier: 'tier_2',

    population: 2100000,
    state_release_volume: 40000, // IN estimated
    incarceration_rate: 380,
    data_availability_score: 75,
    geographic_cluster_bonus: 30,
    community_partner_count: 6,

    target_resource_count: 55,
    target_launch_date: '2030-03-31',

    strategic_rationale:
      'State capital. Midwest hub. Marion County reentry programs. Manufacturing employment.',
    special_considerations: 'Auto industry. Logistics hub.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 12 },
      { category: 'housing', priority: 'high', target_count: 10 },
      { category: 'substance_abuse', priority: 'medium', target_count: 10 },
    ],
    data_sources: [
      { name: 'Indiana 211', quality: 'medium' },
      { name: 'Marion County Reentry', quality: 'medium' },
    ],
  },

  {
    city: 'Cleveland',
    state: 'OH',
    county: 'Cuyahoga',
    metro_area: 'Cleveland-Elyria',
    region: 'midwest',
    phase: 'phase_3c',
    priority_tier: 'tier_2',

    population: 2000000,
    state_release_volume: 60000,
    incarceration_rate: 390,
    data_availability_score: 75,
    geographic_cluster_bonus: 35, // Near other OH cities
    community_partner_count: 6,

    target_resource_count: 55,
    target_launch_date: '2030-06-30',

    strategic_rationale:
      'Rust belt city. High need. Cuyahoga County reentry programs. Industrial history.',
    special_considerations: 'Economic challenges. Strong nonprofit sector.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 12 },
      { category: 'housing', priority: 'high', target_count: 10 },
      { category: 'substance_abuse', priority: 'high', target_count: 10 },
    ],
    data_sources: [
      { name: 'Ohio 211', quality: 'high' },
      { name: 'Cuyahoga County Reentry', quality: 'medium' },
    ],
  },

  {
    city: 'Nashville',
    state: 'TN',
    county: 'Davidson',
    metro_area: 'Nashville-Davidson-Murfreesboro-Franklin',
    region: 'southeast',
    phase: 'phase_3c',
    priority_tier: 'tier_2',

    population: 2000000,
    state_release_volume: 55000,
    incarceration_rate: 410,
    data_availability_score: 75,
    geographic_cluster_bonus: 35, // Near Memphis
    community_partner_count: 6,

    target_resource_count: 55,
    target_launch_date: '2030-06-30',

    strategic_rationale:
      'State capital. Fast-growing metro. Davidson County reentry services. Music industry employment.',
    special_considerations: 'Rapid growth. Strong faith-based network. Tourism industry.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 12 },
      { category: 'housing', priority: 'high', target_count: 12 },
      { category: 'faith_based', priority: 'high', target_count: 8 },
    ],
    data_sources: [
      { name: 'Tennessee 211', quality: 'medium' },
      { name: 'Davidson County Reentry', quality: 'medium' },
    ],
  },

  {
    city: 'Milwaukee',
    state: 'WI',
    county: 'Milwaukee',
    metro_area: 'Milwaukee-Waukesha',
    region: 'midwest',
    phase: 'phase_3c',
    priority_tier: 'tier_2',

    population: 1600000,
    state_release_volume: 35000, // WI estimated
    incarceration_rate: 400,
    data_availability_score: 75,
    geographic_cluster_bonus: 30,
    community_partner_count: 5,

    target_resource_count: 50,
    target_launch_date: '2030-06-30',

    strategic_rationale:
      'Largest WI city. High incarceration rates. Milwaukee County reentry programs.',
    special_considerations: 'Industrial city. Racial disparities in incarceration.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 10 },
      { category: 'housing', priority: 'high', target_count: 10 },
      { category: 'substance_abuse', priority: 'high', target_count: 8 },
    ],
    data_sources: [
      { name: 'Wisconsin 211', quality: 'medium' },
      { name: 'Milwaukee County Reentry', quality: 'medium' },
    ],
  },

  // ========================================================================
  // PHASE 4: COMPREHENSIVE STATE COVERAGE (2030-2032)
  // State capitals and major cities for remaining states
  // ========================================================================

  {
    city: 'Albuquerque',
    state: 'NM',
    county: 'Bernalillo',
    metro_area: 'Albuquerque',
    region: 'southwest',
    phase: 'phase_4',
    priority_tier: 'tier_3',

    population: 900000,
    state_release_volume: 20000, // NM estimated
    incarceration_rate: 350,
    data_availability_score: 70,
    geographic_cluster_bonus: 25,
    community_partner_count: 4,

    target_resource_count: 40,
    target_launch_date: '2030-12-31',

    strategic_rationale: 'Largest NM city. Hispanic majority. Unique cultural context.',
    special_considerations: 'Bilingual critical (Spanish). Native American populations.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 8 },
      { category: 'housing', priority: 'high', target_count: 8 },
      { category: 'substance_abuse', priority: 'high', target_count: 8 },
    ],
    data_sources: [{ name: 'New Mexico 211', quality: 'medium' }],
  },

  {
    city: 'Oklahoma City',
    state: 'OK',
    county: 'Oklahoma',
    metro_area: 'Oklahoma City',
    region: 'southwest',
    phase: 'phase_4',
    priority_tier: 'tier_3',

    population: 1400000,
    state_release_volume: 35000, // OK estimated
    incarceration_rate: 450, // OK has high rates
    data_availability_score: 70,
    geographic_cluster_bonus: 25,
    community_partner_count: 5,

    target_resource_count: 45,
    target_launch_date: '2030-12-31',

    strategic_rationale:
      'State capital. Oklahoma has high incarceration rates. Oil industry employment.',
    special_considerations: 'Native American populations. Oil and gas industry.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 10 },
      { category: 'housing', priority: 'high', target_count: 8 },
      { category: 'substance_abuse', priority: 'high', target_count: 8 },
    ],
    data_sources: [{ name: 'Oklahoma 211', quality: 'medium' }],
  },

  {
    city: 'Louisville',
    state: 'KY',
    county: 'Jefferson',
    metro_area: 'Louisville-Jefferson County',
    region: 'southeast',
    phase: 'phase_4',
    priority_tier: 'tier_3',

    population: 1300000,
    state_release_volume: 30000, // KY estimated
    incarceration_rate: 420,
    data_availability_score: 70,
    geographic_cluster_bonus: 25,
    community_partner_count: 5,

    target_resource_count: 45,
    target_launch_date: '2031-03-31',

    strategic_rationale: 'Largest KY city. Jefferson County reentry services. Derby city.',
    special_considerations: 'Bourbon industry. Horse racing tourism.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 10 },
      { category: 'housing', priority: 'high', target_count: 8 },
      { category: 'substance_abuse', priority: 'high', target_count: 8 },
    ],
    data_sources: [{ name: 'Kentucky 211', quality: 'medium' }],
  },

  {
    city: 'Richmond',
    state: 'VA',
    county: 'Richmond',
    metro_area: 'Richmond',
    region: 'southeast',
    phase: 'phase_4',
    priority_tier: 'tier_3',

    population: 1300000,
    state_release_volume: 35000, // VA estimated
    incarceration_rate: 360,
    data_availability_score: 75, // State capital
    geographic_cluster_bonus: 30,
    community_partner_count: 5,

    target_resource_count: 45,
    target_launch_date: '2031-03-31',

    strategic_rationale: 'State capital. Virginia DOC has reentry programs. Government resources.',
    special_considerations: 'Historic city. State government presence.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 10 },
      { category: 'housing', priority: 'high', target_count: 8 },
      { category: 'legal_aid', priority: 'medium', target_count: 8 },
    ],
    data_sources: [{ name: 'Virginia 211', quality: 'high' }],
  },

  {
    city: 'Birmingham',
    state: 'AL',
    county: 'Jefferson',
    metro_area: 'Birmingham-Hoover',
    region: 'southeast',
    phase: 'phase_4',
    priority_tier: 'tier_3',

    population: 1100000,
    state_release_volume: 30000, // AL estimated
    incarceration_rate: 460, // AL has high rates
    data_availability_score: 65,
    geographic_cluster_bonus: 25,
    community_partner_count: 4,

    target_resource_count: 40,
    target_launch_date: '2031-06-30',

    strategic_rationale:
      'Largest AL city. Alabama has high incarceration rates. Industrial history.',
    special_considerations: 'Economic challenges. Strong faith-based network.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 10 },
      { category: 'housing', priority: 'high', target_count: 8 },
      { category: 'faith_based', priority: 'high', target_count: 8 },
    ],
    data_sources: [{ name: 'Alabama 211', quality: 'medium' }],
  },

  {
    city: 'Salt Lake City',
    state: 'UT',
    county: 'Salt Lake',
    metro_area: 'Salt Lake City',
    region: 'west',
    phase: 'phase_4',
    priority_tier: 'tier_3',

    population: 1200000,
    state_release_volume: 20000, // UT estimated
    incarceration_rate: 320,
    data_availability_score: 75,
    geographic_cluster_bonus: 25,
    community_partner_count: 5,

    target_resource_count: 40,
    target_launch_date: '2031-06-30',

    strategic_rationale:
      'State capital. Mountain region. Utah DOC has progressive programs. Growing tech sector.',
    special_considerations: 'LDS church presence. Unique cultural context.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 10 },
      { category: 'housing', priority: 'high', target_count: 8 },
      { category: 'substance_abuse', priority: 'medium', target_count: 6 },
    ],
    data_sources: [{ name: 'Utah 211', quality: 'high' }],
  },

  {
    city: 'Providence',
    state: 'RI',
    county: 'Providence',
    metro_area: 'Providence-Warwick',
    region: 'northeast',
    phase: 'phase_4',
    priority_tier: 'tier_3',

    population: 1600000,
    state_release_volume: 15000, // RI estimated
    incarceration_rate: 310,
    data_availability_score: 75,
    geographic_cluster_bonus: 35, // Near Boston
    community_partner_count: 4,

    target_resource_count: 40,
    target_launch_date: '2031-09-30',

    strategic_rationale: 'State capital. Small state but significant reentry population.',
    special_considerations: 'Small state - statewide resources. Portuguese population.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 10 },
      { category: 'housing', priority: 'high', target_count: 8 },
      { category: 'healthcare', priority: 'medium', target_count: 6 },
    ],
    data_sources: [{ name: 'Rhode Island 211', quality: 'high' }],
  },

  {
    city: 'Hartford',
    state: 'CT',
    county: 'Hartford',
    metro_area: 'Hartford-East Hartford-Middletown',
    region: 'northeast',
    phase: 'phase_4',
    priority_tier: 'tier_3',

    population: 1200000,
    state_release_volume: 18000, // CT estimated
    incarceration_rate: 300,
    data_availability_score: 75,
    geographic_cluster_bonus: 30,
    community_partner_count: 4,

    target_resource_count: 35,
    target_launch_date: '2031-09-30',

    strategic_rationale: 'State capital. Connecticut has established reentry services.',
    special_considerations: 'Insurance industry hub. Hispanic populations.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 8 },
      { category: 'housing', priority: 'high', target_count: 8 },
      { category: 'substance_abuse', priority: 'high', target_count: 6 },
    ],
    data_sources: [{ name: 'Connecticut 211', quality: 'high' }],
  },

  {
    city: 'Charleston',
    state: 'SC',
    county: 'Charleston',
    metro_area: 'Charleston-North Charleston',
    region: 'southeast',
    phase: 'phase_4',
    priority_tier: 'tier_3',

    population: 800000,
    state_release_volume: 35000, // SC estimated
    incarceration_rate: 410,
    data_availability_score: 65,
    geographic_cluster_bonus: 25,
    community_partner_count: 4,

    target_resource_count: 35,
    target_launch_date: '2031-12-31',

    strategic_rationale: 'Largest SC city. South Carolina has high incarceration rates. Port city.',
    special_considerations: 'Tourism and military presence. Coastal economy.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 8 },
      { category: 'housing', priority: 'high', target_count: 8 },
      { category: 'veterans_services', priority: 'medium', target_count: 6 },
    ],
    data_sources: [{ name: 'South Carolina 211', quality: 'medium' }],
  },

  {
    city: 'Omaha',
    state: 'NE',
    county: 'Douglas',
    metro_area: 'Omaha-Council Bluffs',
    region: 'midwest',
    phase: 'phase_4',
    priority_tier: 'tier_3',

    population: 950000,
    state_release_volume: 20000, // NE estimated
    incarceration_rate: 340,
    data_availability_score: 70,
    geographic_cluster_bonus: 20,
    community_partner_count: 4,

    target_resource_count: 35,
    target_launch_date: '2031-12-31',

    strategic_rationale: 'Largest NE city. Douglas County reentry services. Regional hub.',
    special_considerations: 'Agriculture and logistics industries.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 8 },
      { category: 'housing', priority: 'high', target_count: 8 },
      { category: 'substance_abuse', priority: 'medium', target_count: 6 },
    ],
    data_sources: [{ name: 'Nebraska 211', quality: 'medium' }],
  },

  {
    city: 'Wichita',
    state: 'KS',
    county: 'Sedgwick',
    metro_area: 'Wichita',
    region: 'midwest',
    phase: 'phase_4',
    priority_tier: 'tier_3',

    population: 650000,
    state_release_volume: 25000, // KS estimated
    incarceration_rate: 350,
    data_availability_score: 65,
    geographic_cluster_bonus: 20,
    community_partner_count: 3,

    target_resource_count: 30,
    target_launch_date: '2032-03-31',

    strategic_rationale: 'Largest KS city. Aviation industry hub. Sedgwick County reentry.',
    special_considerations: 'Aviation and agriculture employment.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 8 },
      { category: 'housing', priority: 'high', target_count: 6 },
      { category: 'substance_abuse', priority: 'medium', target_count: 6 },
    ],
    data_sources: [{ name: 'Kansas 211', quality: 'medium' }],
  },

  {
    city: 'Des Moines',
    state: 'IA',
    county: 'Polk',
    metro_area: 'Des Moines-West Des Moines',
    region: 'midwest',
    phase: 'phase_4',
    priority_tier: 'tier_3',

    population: 700000,
    state_release_volume: 18000, // IA estimated
    incarceration_rate: 310,
    data_availability_score: 70,
    geographic_cluster_bonus: 20,
    community_partner_count: 3,

    target_resource_count: 30,
    target_launch_date: '2032-03-31',

    strategic_rationale: 'State capital. Iowa DOC reentry services. Insurance industry hub.',
    special_considerations: 'Agriculture economy. Lower incarceration rates.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 8 },
      { category: 'housing', priority: 'high', target_count: 6 },
      { category: 'general_support', priority: 'medium', target_count: 6 },
    ],
    data_sources: [{ name: 'Iowa 211', quality: 'medium' }],
  },

  {
    city: 'Little Rock',
    state: 'AR',
    county: 'Pulaski',
    metro_area: 'Little Rock-North Little Rock-Conway',
    region: 'southeast',
    phase: 'phase_4',
    priority_tier: 'tier_3',

    population: 750000,
    state_release_volume: 25000, // AR estimated
    incarceration_rate: 450, // AR has high rates
    data_availability_score: 65,
    geographic_cluster_bonus: 20,
    community_partner_count: 3,

    target_resource_count: 35,
    target_launch_date: '2032-06-30',

    strategic_rationale:
      'State capital. Arkansas has high incarceration rates. Pulaski County reentry.',
    special_considerations: 'Rural state - statewide resources needed.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 8 },
      { category: 'housing', priority: 'high', target_count: 8 },
      { category: 'substance_abuse', priority: 'high', target_count: 6 },
    ],
    data_sources: [{ name: 'Arkansas 211', quality: 'medium' }],
  },

  {
    city: 'Jackson',
    state: 'MS',
    county: 'Hinds',
    metro_area: 'Jackson',
    region: 'southeast',
    phase: 'phase_4',
    priority_tier: 'tier_3',

    population: 580000,
    state_release_volume: 20000, // MS estimated
    incarceration_rate: 560, // MS has very high rates
    data_availability_score: 60,
    geographic_cluster_bonus: 20,
    community_partner_count: 3,

    target_resource_count: 35,
    target_launch_date: '2032-06-30',

    strategic_rationale:
      'State capital. Mississippi has 2nd highest incarceration rate nationally. Critical need.',
    special_considerations: 'High poverty rates. Limited resources.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 8 },
      { category: 'housing', priority: 'high', target_count: 8 },
      { category: 'legal_aid', priority: 'high', target_count: 6 },
    ],
    data_sources: [{ name: 'Mississippi 211', quality: 'low' }],
  },

  {
    city: 'Boise',
    state: 'ID',
    county: 'Ada',
    metro_area: 'Boise City',
    region: 'west',
    phase: 'phase_4',
    priority_tier: 'tier_4',

    population: 750000,
    state_release_volume: 12000, // ID estimated
    incarceration_rate: 380,
    data_availability_score: 65,
    geographic_cluster_bonus: 20,
    community_partner_count: 3,

    target_resource_count: 30,
    target_launch_date: '2032-09-30',

    strategic_rationale: 'State capital. Fast-growing metro. Idaho DOC reentry services.',
    special_considerations: 'Rural state. Agricultural and tech industries.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 8 },
      { category: 'housing', priority: 'high', target_count: 6 },
      { category: 'substance_abuse', priority: 'medium', target_count: 6 },
    ],
    data_sources: [{ name: 'Idaho 211', quality: 'medium' }],
  },

  {
    city: 'Honolulu',
    state: 'HI',
    county: 'Honolulu',
    metro_area: 'Urban Honolulu',
    region: 'west',
    phase: 'phase_4',
    priority_tier: 'tier_4',

    population: 1000000,
    state_release_volume: 8000, // HI estimated (small)
    incarceration_rate: 250,
    data_availability_score: 70,
    geographic_cluster_bonus: 0, // Isolated
    community_partner_count: 4,

    target_resource_count: 30,
    target_launch_date: '2032-09-30',

    strategic_rationale:
      'Island state. Unique challenges. Lower incarceration but limited services due to geography.',
    special_considerations: 'Island isolation. High cost of living. Limited reentry options.',
    priority_categories: [
      { category: 'housing', priority: 'high', target_count: 8 },
      { category: 'employment', priority: 'high', target_count: 8 },
      { category: 'substance_abuse', priority: 'medium', target_count: 6 },
    ],
    data_sources: [{ name: 'Aloha United Way 211', quality: 'medium' }],
  },

  {
    city: 'Anchorage',
    state: 'AK',
    county: 'Anchorage',
    metro_area: 'Anchorage',
    region: 'west',
    phase: 'phase_4',
    priority_tier: 'tier_4',

    population: 400000,
    state_release_volume: 6000, // AK estimated (small)
    incarceration_rate: 410,
    data_availability_score: 60,
    geographic_cluster_bonus: 0, // Isolated
    community_partner_count: 2,

    target_resource_count: 25,
    target_launch_date: '2032-12-31',

    strategic_rationale:
      'Largest AK city. Extreme isolation. Alaska has high rates. Native populations.',
    special_considerations:
      'Harsh climate. Geographic isolation. Native American populations. Limited services.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 6 },
      { category: 'housing', priority: 'high', target_count: 6 },
      { category: 'substance_abuse', priority: 'high', target_count: 6 },
    ],
    data_sources: [{ name: 'Alaska 211', quality: 'low' }],
  },

  {
    city: 'Manchester',
    state: 'NH',
    county: 'Hillsborough',
    metro_area: 'Manchester-Nashua',
    region: 'northeast',
    phase: 'phase_4',
    priority_tier: 'tier_4',

    population: 420000,
    state_release_volume: 10000, // NH estimated
    incarceration_rate: 220, // NH has low rates
    data_availability_score: 70,
    geographic_cluster_bonus: 30, // Near Boston
    community_partner_count: 3,

    target_resource_count: 25,
    target_launch_date: '2032-12-31',

    strategic_rationale: 'Largest NH city. Low incarceration rates. Opioid crisis focus.',
    special_considerations: 'Small state. Opioid epidemic. Near Boston resources.',
    priority_categories: [
      { category: 'substance_abuse', priority: 'high', target_count: 8 },
      { category: 'employment', priority: 'medium', target_count: 6 },
      { category: 'housing', priority: 'medium', target_count: 6 },
    ],
    data_sources: [{ name: 'New Hampshire 211', quality: 'high' }],
  },

  {
    city: 'Burlington',
    state: 'VT',
    county: 'Chittenden',
    metro_area: 'Burlington-South Burlington',
    region: 'northeast',
    phase: 'phase_4',
    priority_tier: 'tier_4',

    population: 220000,
    state_release_volume: 5000, // VT estimated (lowest)
    incarceration_rate: 190, // VT has lowest rates
    data_availability_score: 70,
    geographic_cluster_bonus: 25,
    community_partner_count: 2,

    target_resource_count: 20,
    target_launch_date: '2032-12-31',

    strategic_rationale:
      'Largest VT city. Vermont has lowest incarceration rates nationally. Small scale.',
    special_considerations: 'Very small state. Rural. Progressive policies.',
    priority_categories: [
      { category: 'employment', priority: 'medium', target_count: 6 },
      { category: 'housing', priority: 'medium', target_count: 6 },
      { category: 'substance_abuse', priority: 'medium', target_count: 4 },
    ],
    data_sources: [{ name: 'Vermont 211', quality: 'high' }],
  },

  {
    city: 'Portland',
    state: 'ME',
    county: 'Cumberland',
    metro_area: 'Portland-South Portland',
    region: 'northeast',
    phase: 'phase_4',
    priority_tier: 'tier_4',

    population: 540000,
    state_release_volume: 8000, // ME estimated
    incarceration_rate: 240,
    data_availability_score: 70,
    geographic_cluster_bonus: 20,
    community_partner_count: 3,

    target_resource_count: 25,
    target_launch_date: '2032-12-31',

    strategic_rationale: 'Largest ME city. Maine has low incarceration rates. Opioid crisis.',
    special_considerations: 'Rural state. Aging population. Opioid epidemic.',
    priority_categories: [
      { category: 'substance_abuse', priority: 'high', target_count: 8 },
      { category: 'employment', priority: 'medium', target_count: 6 },
      { category: 'housing', priority: 'medium', target_count: 6 },
    ],
    data_sources: [{ name: 'Maine 211', quality: 'high' }],
  },

  {
    city: 'Charleston',
    state: 'WV',
    county: 'Kanawha',
    metro_area: 'Charleston',
    region: 'southeast',
    phase: 'phase_4',
    priority_tier: 'tier_4',

    population: 210000,
    state_release_volume: 15000, // WV estimated
    incarceration_rate: 420,
    data_availability_score: 60,
    geographic_cluster_bonus: 20,
    community_partner_count: 2,

    target_resource_count: 25,
    target_launch_date: '2032-12-31',

    strategic_rationale:
      'State capital. West Virginia has high rates. Economic challenges. Opioid crisis.',
    special_considerations: 'Coal country. High poverty. Opioid epidemic severe.',
    priority_categories: [
      { category: 'substance_abuse', priority: 'high', target_count: 8 },
      { category: 'employment', priority: 'high', target_count: 6 },
      { category: 'housing', priority: 'medium', target_count: 6 },
    ],
    data_sources: [{ name: 'West Virginia 211', quality: 'medium' }],
  },

  {
    city: 'Billings',
    state: 'MT',
    county: 'Yellowstone',
    metro_area: 'Billings',
    region: 'west',
    phase: 'phase_4',
    priority_tier: 'tier_4',

    population: 180000,
    state_release_volume: 8000, // MT estimated
    incarceration_rate: 390,
    data_availability_score: 55,
    geographic_cluster_bonus: 15,
    community_partner_count: 2,

    target_resource_count: 20,
    target_launch_date: '2032-12-31',

    strategic_rationale: 'Largest MT city. Rural state. Native American populations.',
    special_considerations: 'Very rural. Limited services. Native populations.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 6 },
      { category: 'substance_abuse', priority: 'high', target_count: 6 },
      { category: 'housing', priority: 'medium', target_count: 4 },
    ],
    data_sources: [{ name: 'Montana 211', quality: 'low' }],
  },

  {
    city: 'Fargo',
    state: 'ND',
    county: 'Cass',
    metro_area: 'Fargo',
    region: 'midwest',
    phase: 'phase_4',
    priority_tier: 'tier_4',

    population: 250000,
    state_release_volume: 6000, // ND estimated
    incarceration_rate: 270,
    data_availability_score: 60,
    geographic_cluster_bonus: 15,
    community_partner_count: 2,

    target_resource_count: 20,
    target_launch_date: '2032-12-31',

    strategic_rationale: 'Largest ND city. Very small state. Oil boom region.',
    special_considerations: 'Very rural. Oil industry. Harsh climate.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 6 },
      { category: 'housing', priority: 'medium', target_count: 6 },
      { category: 'substance_abuse', priority: 'medium', target_count: 4 },
    ],
    data_sources: [{ name: 'North Dakota 211', quality: 'low' }],
  },

  {
    city: 'Sioux Falls',
    state: 'SD',
    county: 'Minnehaha',
    metro_area: 'Sioux Falls',
    region: 'midwest',
    phase: 'phase_4',
    priority_tier: 'tier_4',

    population: 280000,
    state_release_volume: 8000, // SD estimated
    incarceration_rate: 420,
    data_availability_score: 60,
    geographic_cluster_bonus: 15,
    community_partner_count: 2,

    target_resource_count: 20,
    target_launch_date: '2032-12-31',

    strategic_rationale:
      'Largest SD city. South Dakota has high rates. Native populations. Financial services hub.',
    special_considerations: 'Very rural. Native American populations. Limited services.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 6 },
      { category: 'substance_abuse', priority: 'high', target_count: 6 },
      { category: 'housing', priority: 'medium', target_count: 4 },
    ],
    data_sources: [{ name: 'South Dakota 211', quality: 'low' }],
  },

  {
    city: 'Cheyenne',
    state: 'WY',
    county: 'Laramie',
    metro_area: 'Cheyenne',
    region: 'west',
    phase: 'phase_4',
    priority_tier: 'tier_4',

    population: 100000,
    state_release_volume: 4000, // WY estimated (smallest)
    incarceration_rate: 380,
    data_availability_score: 50,
    geographic_cluster_bonus: 15,
    community_partner_count: 1,

    target_resource_count: 15,
    target_launch_date: '2032-12-31',

    strategic_rationale:
      'State capital. Wyoming has smallest population but moderate rates. Very rural.',
    special_considerations: 'Smallest state by population. Very rural. Limited infrastructure.',
    priority_categories: [
      { category: 'employment', priority: 'high', target_count: 4 },
      { category: 'housing', priority: 'medium', target_count: 4 },
      { category: 'substance_abuse', priority: 'medium', target_count: 4 },
    ],
    data_sources: [{ name: 'Wyoming 211', quality: 'low' }],
  },
]

async function populateExpansionPriorities() {
  console.log('🚀 Populating expansion priorities...\n')

  // Check if any priorities already exist
  const { data: existing, error: checkError } = await supabase
    .from('expansion_priorities')
    .select('id, city, state')
    .limit(1)

  if (checkError) {
    console.error('❌ Error checking existing priorities:', checkError)
    process.exit(1)
  }

  if (existing && existing.length > 0) {
    console.log('⚠️  Expansion priorities already exist. Clearing table first...\n')
    const { error: deleteError } = await supabase
      .from('expansion_priorities')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (deleteError) {
      console.error('❌ Error clearing table:', deleteError)
      process.exit(1)
    }
    console.log('✅ Table cleared\n')
  }

  let successCount = 0
  let errorCount = 0

  for (const priority of expansionPriorities) {
    console.log(`📍 Adding ${priority.city}, ${priority.state} (${priority.priority_tier})...`)

    const { data, error } = await supabase
      .from('expansion_priorities')
      .insert(priority)
      .select()
      .single()

    if (error) {
      console.error(`   ❌ Error: ${error.message}`)
      errorCount++
    } else {
      console.log(`   ✅ Created with priority score: ${data.priority_score}`)
      successCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ Successfully created: ${successCount}`)
  console.log(`❌ Errors: ${errorCount}`)
  console.log('='.repeat(60))

  // Display summary
  const { data: allPriorities } = await supabase
    .from('expansion_priorities')
    .select('city, state, priority_tier, priority_score')
    .order('priority_score', { ascending: false })

  if (allPriorities) {
    console.log('\n📊 Priority Ranking:\n')
    console.log('Rank | City                | Score | Tier')
    console.log('-----|---------------------|-------|------')
    allPriorities.forEach((p, i) => {
      console.log(
        `${String(i + 1).padStart(4)} | ${p.city.padEnd(19)} | ${String(p.priority_score).padStart(5)} | ${p.priority_tier}`
      )
    })
  }
}

// Run the script
populateExpansionPriorities()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
