import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import fs from 'fs/promises'
import path from 'path'

const IMPORTS_DIR = path.join(process.cwd(), 'data-imports')
const ARCHIVED_DIR = path.join(IMPORTS_DIR, 'archived')

/**
 * GET /api/admin/import-files
 *
 * Checks for JSON files in data-imports/ directory
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    // Check for files
    const files = await fs.readdir(IMPORTS_DIR)
    const jsonFiles = files.filter(
      (f) => f.endsWith('.json') && !f.startsWith('.') && f !== 'README.md'
    )

    return NextResponse.json({
      hasFiles: jsonFiles.length > 0,
      fileCount: jsonFiles.length,
      files: jsonFiles,
    })
  } catch (error) {
    console.error('Error checking import files:', error)
    return NextResponse.json({ error: 'Failed to check files' }, { status: 500 })
  }
}

/**
 * POST /api/admin/import-files
 *
 * Processes JSON files in data-imports/ directory and loads as suggestions
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    // Ensure archived directory exists
    await fs.mkdir(ARCHIVED_DIR, { recursive: true })

    // Get all JSON files
    const files = await fs.readdir(IMPORTS_DIR)
    const jsonFiles = files.filter(
      (f) => f.endsWith('.json') && !f.startsWith('.') && f !== 'README.md'
    )

    if (jsonFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No files to import',
        stats: {
          processed: 0,
          failed: 0,
          totalResources: 0,
          autoApproved: 0,
          flagged: 0,
          rejected: 0,
        },
        files: [],
      })
    }

    const results = {
      processed: 0,
      failed: 0,
      totalResources: 0,
      autoApproved: 0,
      flagged: 0,
      rejected: 0,
      fileResults: [] as Array<{
        filename: string
        status: 'success' | 'error'
        error?: string
        stats?: {
          submitted?: number
          auto_approved?: number
          flagged_for_human?: number
          auto_rejected?: number
          skipped_duplicates?: number
        }
      }>,
    }

    for (const filename of jsonFiles) {
      const filePath = path.join(IMPORTS_DIR, filename)

      try {
        // Read and parse JSON
        const content = await fs.readFile(filePath, 'utf-8')
        const data = JSON.parse(content) as {
          resources: unknown[]
          submitter?: string
          notes?: string
        }

        // Validate format
        if (!data.resources || !Array.isArray(data.resources)) {
          results.failed++
          results.fileResults.push({
            filename,
            status: 'error',
            error: 'Invalid format: missing "resources" array',
          })
          continue
        }

        // Post to API endpoint (internal call)
        const response = await fetch(`${request.nextUrl.origin}/api/resources/suggest-batch`, {
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

        const result = (await response.json()) as {
          message?: string
          stats?: {
            submitted?: number
            auto_approved?: number
            flagged_for_human?: number
            auto_rejected?: number
            skipped_duplicates?: number
          }
        }

        if (!response.ok) {
          results.failed++
          results.fileResults.push({
            filename,
            status: 'error',
            error: result.message || 'Unknown error',
          })
          continue
        }

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

        results.processed++
        results.fileResults.push({
          filename,
          status: 'success',
          stats: result.stats,
        })
      } catch (error) {
        results.failed++
        results.fileResults.push({
          filename,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} file(s): ${results.autoApproved} auto-approved, ${results.flagged} flagged, ${results.rejected} rejected`,
      stats: results,
    })
  } catch (error) {
    console.error('Error in import-files:', error)
    return NextResponse.json(
      {
        error: 'Failed to process imports',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
