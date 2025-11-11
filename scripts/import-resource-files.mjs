#!/usr/bin/env node

/**
 * Import Resource Files
 *
 * Processes JSON files in data-imports/ directory and loads them as resource suggestions.
 *
 * Usage:
 *   npm run import:resources
 *   node scripts/import-resource-files.mjs
 *
 * Workflow:
 * 1. Scans data-imports/*.json
 * 2. Validates JSON format
 * 3. Posts to /api/resources/suggest-batch
 * 4. Moves processed files to archived/ with timestamp
 * 5. Reports results
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const IMPORTS_DIR = path.join(__dirname, '../data-imports')
const ARCHIVED_DIR = path.join(IMPORTS_DIR, 'archived')
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003'

async function importResourceFiles() {
  console.log('🔍 Scanning data-imports/ directory...\n')

  try {
    // Ensure archived directory exists
    await fs.mkdir(ARCHIVED_DIR, { recursive: true })

    // Get all JSON files
    const files = await fs.readdir(IMPORTS_DIR)
    const jsonFiles = files.filter(
      (f) => f.endsWith('.json') && f !== '.gitkeep' && f !== 'README.md'
    )

    if (jsonFiles.length === 0) {
      console.log('✅ No files to import. Place JSON files in data-imports/ directory.')
      return
    }

    console.log(`Found ${jsonFiles.length} file(s) to process:\n`)

    const results = {
      processed: 0,
      failed: 0,
      totalResources: 0,
      autoApproved: 0,
      flagged: 0,
      rejected: 0,
    }

    for (const filename of jsonFiles) {
      const filePath = path.join(IMPORTS_DIR, filename)

      console.log(`📄 Processing: ${filename}`)

      try {
        // Read and parse JSON
        const content = await fs.readFile(filePath, 'utf-8')
        const data = JSON.parse(content)

        // Validate format
        if (!data.resources || !Array.isArray(data.resources)) {
          console.log(`   ❌ Invalid format: missing "resources" array`)
          results.failed++
          continue
        }

        console.log(`   Found ${data.resources.length} resource(s)`)

        // Post to API endpoint
        const response = await fetch(`${API_URL}/api/resources/suggest-batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resources: data.resources,
            submitter: data.submitter || 'file_import',
            notes: data.notes || `Imported from ${filename}`,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          console.log(`   ❌ API error: ${result.message || 'Unknown error'}`)
          results.failed++
          continue
        }

        // Report results
        console.log(`   ✅ Submitted: ${result.stats?.submitted || 0}`)
        console.log(`   ✅ Auto-approved: ${result.stats?.auto_approved || 0}`)
        console.log(`   ⚠️  Flagged: ${result.stats?.flagged_for_human || 0}`)
        console.log(`   ❌ Rejected: ${result.stats?.auto_rejected || 0}`)
        console.log(`   ⏭️  Duplicates: ${result.stats?.skipped_duplicates || 0}`)

        // Update totals
        results.totalResources += result.stats?.submitted || 0
        results.autoApproved += result.stats?.auto_approved || 0
        results.flagged += result.stats?.flagged_for_human || 0
        results.rejected += result.stats?.auto_rejected || 0

        // Archive the file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('-')
        const archivedName = `${timestamp}-${filename}`
        const archivedPath = path.join(ARCHIVED_DIR, archivedName)

        await fs.rename(filePath, archivedPath)
        console.log(`   📦 Archived as: ${archivedName}\n`)

        results.processed++
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`)
        results.failed++
      }
    }

    // Final summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 IMPORT SUMMARY')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Files processed:    ${results.processed}`)
    console.log(`Files failed:       ${results.failed}`)
    console.log(`Total resources:    ${results.totalResources}`)
    console.log(`Auto-approved:      ${results.autoApproved}`)
    console.log(`Flagged for review: ${results.flagged}`)
    console.log(`Auto-rejected:      ${results.rejected}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    if (results.flagged > 0 || results.autoApproved > 0) {
      console.log(`✅ Next step: Review submissions at ${API_URL}/admin/command-center\n`)
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message)
    process.exit(1)
  }
}

// Run the import
importResourceFiles()
