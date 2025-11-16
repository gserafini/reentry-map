#!/usr/bin/env tsx

/**
 * Import CareerOneStop American Job Centers (Nationwide)
 *
 * Usage:
 *   npm run import:careeronestop
 *   OR
 *   npx tsx scripts/import-careeronestop.ts
 *
 * Options:
 *   --state=CA         Import only specific state (default: all states)
 *   --batch-size=50    Batch size for processing (default: 50)
 *   --skip-geocoding   Skip geocoding (CareerOneStop already has coords)
 *   --dry-run          Test without actually importing
 */

import { parse } from 'csv-parse/sync'
import fs from 'fs/promises'
import path from 'path'
import { ImportOrchestrator } from '../lib/data-sources/import-orchestrator'

// Parse command line arguments
const args = process.argv.slice(2)
const options = {
  state: args.find((a) => a.startsWith('--state='))?.split('=')[1],
  batchSize: parseInt(args.find((a) => a.startsWith('--batch-size='))?.split('=')[1] || '50'),
  skipGeocoding: args.includes('--skip-geocoding'),
  dryRun: args.includes('--dry-run'),
}

console.log('CareerOneStop Import Script')
console.log('=============================')
console.log('Options:', options)
console.log('')

async function main() {
  // Step 1: Check for CSV file
  const csvPath = path.join(process.cwd(), 'data-imports/raw/careeronestop-ajc.csv')

  let csvExists = false
  try {
    await fs.access(csvPath)
    csvExists = true
  } catch (e) {
    // File doesn't exist
  }

  if (!csvExists) {
    console.log('❌ CSV file not found at:', csvPath)
    console.log('')
    console.log('Please download the CareerOneStop CSV file first:')
    console.log('1. Visit: https://www.careeronestop.org/Developers/Data/comprehensive-and-affiliate-american-job-centers.aspx')
    console.log('2. Download the CSV file')
    console.log(`3. Save it to: ${csvPath}`)
    console.log('')
    console.log('Or run: npm run download:careeronestop')
    process.exit(1)
  }

  console.log('✅ Found CSV file at:', csvPath)

  // Step 2: Parse CSV
  console.log('📖 Reading and parsing CSV...')

  const csvContent = await fs.readFile(csvPath, 'utf-8')
  const allRecords = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, unknown>[]

  console.log(`✅ Parsed ${allRecords.length} total records`)

  // Step 3: Filter by state if specified
  let records = allRecords

  if (options.state) {
    records = allRecords.filter((r) => r.State === options.state || r.state === options.state)
    console.log(`🔍 Filtered to ${records.length} records for state: ${options.state}`)
  } else {
    console.log('🌎 Processing all states (nationwide import)')
  }

  if (records.length === 0) {
    console.log('❌ No records found to import')
    process.exit(1)
  }

  // Step 4: Show sample record
  console.log('')
  console.log('Sample record (first):', JSON.stringify(records[0], null, 2).substring(0, 500))
  console.log('')

  // Step 5: Confirm import
  if (!options.dryRun) {
    console.log(`⚠️  About to import ${records.length} records from CareerOneStop`)
    console.log('Press Ctrl+C within 5 seconds to cancel...')
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  // Step 6: Create import orchestrator
  const orchestrator = new ImportOrchestrator({
    sourceName: 'careeronestop',
    sourceUrl:
      'https://www.careeronestop.org/Developers/Data/comprehensive-and-affiliate-american-job-centers.aspx',
    sourceDescription: 'American Job Centers - Comprehensive and Affiliate Centers',
    filters: {
      state: options.state,
      nationwide: !options.state,
    },
    verificationLevel: 'L1', // Government data = minimal verification
    batchSize: options.batchSize,
    skipGeocoding: true, // CareerOneStop already has lat/lng
  })

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No actual import will occur')
    console.log('')
    console.log('Would import:')
    console.log(`  - Source: CareerOneStop American Job Centers`)
    console.log(`  - Records: ${records.length}`)
    console.log(`  - Batch size: ${options.batchSize}`)
    console.log(`  - Total batches: ${Math.ceil(records.length / options.batchSize)}`)
    console.log(`  - Estimated time: ${Math.ceil((records.length * 2) / 60)} minutes`)
    console.log('')
    process.exit(0)
  }

  // Step 7: Run import
  console.log('')
  console.log('🚀 Starting import...')
  console.log('')

  const startTime = Date.now()

  try {
    await orchestrator.run(records)

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1)

    console.log('')
    console.log('✅ Import completed successfully!')
    console.log(`   Duration: ${duration} minutes`)
    console.log('')
    console.log('Next steps:')
    console.log('1. Review flagged resources in admin verification queue')
    console.log('2. Check import job status in database')
    console.log('3. Verify resources appear on the map')
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1)

    console.error('')
    console.error('❌ Import failed!')
    console.error(`   Duration: ${duration} minutes`)
    console.error('   Error:', error instanceof Error ? error.message : error)
    console.error('')
    console.error('The import job has been marked as failed in the database.')
    console.error('Check data_import_jobs and data_import_records for details.')

    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
