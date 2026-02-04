/**
 * Data Migration Script: Supabase → Self-Hosted PostgreSQL
 *
 * Migrates resources, resource_suggestions, and verification_logs
 *
 * Usage: npx tsx scripts/migrate-data.ts
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import postgres from 'postgres'
import { createClient } from '@supabase/supabase-js'

// Supabase connection (source)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Self-hosted PostgreSQL connection (target)
const targetSql = postgres(process.env.DATABASE_URL!, {
  ssl: 'require',
  max: 5,
})

async function migrateResources() {
  console.log('\n=== Migrating resources ===')

  // Fetch all resources from Supabase
  const { data: resources, error } = await supabase
    .from('resources')
    .select('*')
    .order('created_at')

  if (error) {
    console.error('Error fetching resources:', error)
    return
  }

  console.log(`Found ${resources?.length || 0} resources to migrate`)

  if (!resources || resources.length === 0) return

  // Migrate in batches
  const batchSize = 10
  let migrated = 0

  for (let i = 0; i < resources.length; i += batchSize) {
    const batch = resources.slice(i, i + batchSize)

    for (const resource of batch) {
      try {
        await targetSql`
          INSERT INTO resources (
            id, name, description, services_offered, phone, phone_verified,
            phone_last_verified, email, website, address, city, state, zip,
            latitude, longitude, county, county_fips, neighborhood, formatted_address,
            google_place_id, location_type, address_type, service_area, hours, timezone,
            primary_category, categories, tags, eligibility_requirements, accepts_records,
            appointment_required, required_documents, fees, languages, accessibility_features,
            photos, logo_url, screenshot_url, screenshot_captured_at, ai_discovered,
            ai_enriched, ai_last_verified, ai_verification_score, data_completeness_score,
            verification_status, verification_confidence, verification_history,
            last_verified_at, next_verification_at, verification_source,
            human_review_required, provenance, verified, verified_by, verified_date,
            rating_average, rating_count, review_count, view_count, status, status_reason,
            closure_status, correction_notes, parent_resource_id, org_name, location_name,
            is_parent, change_log, source, is_unique, also_in_211, also_in_govt_db,
            external_211_id, external_govt_id, created_at, updated_at, slug
          ) VALUES (
            ${resource.id}, ${resource.name}, ${resource.description},
            ${resource.services_offered}, ${resource.phone}, ${resource.phone_verified},
            ${resource.phone_last_verified}, ${resource.email}, ${resource.website},
            ${resource.address}, ${resource.city}, ${resource.state}, ${resource.zip},
            ${resource.latitude}, ${resource.longitude}, ${resource.county},
            ${resource.county_fips}, ${resource.neighborhood}, ${resource.formatted_address},
            ${resource.google_place_id}, ${resource.location_type}, ${resource.address_type},
            ${resource.service_area}, ${resource.hours}, ${resource.timezone},
            ${resource.primary_category}, ${resource.categories}, ${resource.tags},
            ${resource.eligibility_requirements}, ${resource.accepts_records},
            ${resource.appointment_required}, ${resource.required_documents},
            ${resource.fees}, ${resource.languages}, ${resource.accessibility_features},
            ${resource.photos}, ${resource.logo_url}, ${resource.screenshot_url},
            ${resource.screenshot_captured_at}, ${resource.ai_discovered},
            ${resource.ai_enriched}, ${resource.ai_last_verified},
            ${resource.ai_verification_score}, ${resource.data_completeness_score},
            ${resource.verification_status}, ${resource.verification_confidence},
            ${resource.verification_history}, ${resource.last_verified_at},
            ${resource.next_verification_at}, ${resource.verification_source},
            ${resource.human_review_required}, ${resource.provenance},
            ${resource.verified}, ${resource.verified_by}, ${resource.verified_date},
            ${resource.rating_average}, ${resource.rating_count},
            ${resource.review_count}, ${resource.view_count}, ${resource.status},
            ${resource.status_reason}, ${resource.closure_status},
            ${resource.correction_notes}, ${resource.parent_resource_id},
            ${resource.org_name}, ${resource.location_name}, ${resource.is_parent},
            ${resource.change_log}, ${resource.source}, ${resource.is_unique},
            ${resource.also_in_211}, ${resource.also_in_govt_db},
            ${resource.external_211_id}, ${resource.external_govt_id},
            ${resource.created_at}, ${resource.updated_at}, ${resource.slug}
          )
          ON CONFLICT (id) DO NOTHING
        `
        migrated++
      } catch (err) {
        console.error(`Error migrating resource ${resource.id}:`, err)
      }
    }
    console.log(`  Migrated ${migrated}/${resources.length} resources...`)
  }

  console.log(`✓ Migrated ${migrated} resources`)
}

async function migrateResourceSuggestions() {
  console.log('\n=== Migrating resource_suggestions ===')

  const { data: suggestions, error } = await supabase
    .from('resource_suggestions')
    .select('*')
    .order('created_at')

  if (error) {
    console.error('Error fetching suggestions:', error)
    return
  }

  console.log(`Found ${suggestions?.length || 0} suggestions to migrate`)

  if (!suggestions || suggestions.length === 0) return

  let migrated = 0
  for (const s of suggestions) {
    try {
      await targetSql`
        INSERT INTO resource_suggestions (
          id, suggested_by, name, address, phone, website, description,
          category, city, state, latitude, longitude, reason, personal_experience,
          source_type, source_url, source_metadata, status, reviewed_by,
          reviewed_at, review_notes, priority, ai_processed, ai_confidence,
          ai_notes, created_resource_id, created_at
        ) VALUES (
          ${s.id}, ${s.suggested_by}, ${s.name}, ${s.address}, ${s.phone},
          ${s.website}, ${s.description}, ${s.category}, ${s.city}, ${s.state},
          ${s.latitude}, ${s.longitude}, ${s.reason}, ${s.personal_experience},
          ${s.source_type}, ${s.source_url}, ${s.source_metadata}, ${s.status},
          ${s.reviewed_by}, ${s.reviewed_at}, ${s.review_notes}, ${s.priority || 0},
          ${s.ai_processed || false}, ${s.ai_confidence}, ${s.ai_notes},
          ${s.created_resource_id}, ${s.created_at}
        )
        ON CONFLICT (id) DO NOTHING
      `
      migrated++
    } catch (err) {
      console.error(`Error migrating suggestion ${s.id}:`, err)
    }
  }

  console.log(`✓ Migrated ${migrated} suggestions`)
}

async function migrateVerificationLogs() {
  console.log('\n=== Migrating verification_logs ===')

  const { data: logs, error } = await supabase
    .from('verification_logs')
    .select('*')
    .order('created_at')

  if (error) {
    console.error('Error fetching verification logs:', error)
    return
  }

  console.log(`Found ${logs?.length || 0} verification logs to migrate`)

  if (!logs || logs.length === 0) return

  let migrated = 0
  const batchSize = 50

  for (let i = 0; i < logs.length; i += batchSize) {
    const batch = logs.slice(i, i + batchSize)

    for (const log of batch) {
      try {
        await targetSql`
          INSERT INTO verification_logs (
            id, resource_id, verification_type, status, confidence,
            details, error_message, created_at
          ) VALUES (
            ${log.id}, ${log.resource_id}, ${log.verification_type},
            ${log.status}, ${log.confidence}, ${log.details},
            ${log.error_message}, ${log.created_at}
          )
          ON CONFLICT (id) DO NOTHING
        `
        migrated++
      } catch (err) {
        console.error(`Error migrating verification log ${log.id}:`, err)
      }
    }
  }

  console.log(`✓ Migrated ${migrated} verification logs`)
}

async function main() {
  console.log('Starting data migration from Supabase to self-hosted PostgreSQL...')
  console.log(`Target: ${process.env.DATABASE_URL?.replace(/:[^@]+@/, ':***@')}`)

  try {
    // Check target connection
    const [{ count }] = await targetSql`SELECT COUNT(*) as count FROM resources`
    console.log(`Target database already has ${count} resources`)

    // Run migrations
    await migrateResources()
    await migrateResourceSuggestions()
    await migrateVerificationLogs()

    // Verify
    console.log('\n=== Verifying migration ===')
    const [resCount] = await targetSql`SELECT COUNT(*) as count FROM resources`
    const [sugCount] = await targetSql`SELECT COUNT(*) as count FROM resource_suggestions`
    const [logCount] = await targetSql`SELECT COUNT(*) as count FROM verification_logs`

    console.log(`Resources: ${resCount.count}`)
    console.log(`Suggestions: ${sugCount.count}`)
    console.log(`Verification logs: ${logCount.count}`)

    console.log('\n✅ Migration complete!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await targetSql.end()
  }
}

main()
