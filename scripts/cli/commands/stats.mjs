/**
 * stats - Dashboard statistics, summary reports, AI usage.
 *
 * Subcommands:
 *   dashboard [--section X]   Dashboard stats (resources, agents, etc.)
 *   status [--batch-size N]   Operational status for verification/enrichment
 *   summary                   Comprehensive resource statistics
 *   ai-usage [--days N]       AI agent usage and costs
 *   health                    System health check
 */
import { parseArgs } from 'node:util'
import { apiGet } from '../api.mjs'
import { summary, error, output } from '../output.mjs'
import { getDb, closeDb } from '../db.mjs'
import { buildResourceStatusReport } from '../../lib/resource-status-report.mjs'

function showHelp() {
  console.log(`
stats - Dashboard statistics, summary reports, AI usage

Subcommands:
  dashboard [--section X]   Dashboard stats
    --section X             Section: resources, agents, suggestions, users

  status [--batch-size N]   Operational status for verification + enrichment
    --batch-size N          Batch size used for enrichment math (default: 500)

  summary                   Comprehensive resource stats (by city, state, category)

  ai-usage [--days N]       AI agent usage and costs
    --days N                Number of days to look back (default: 30)

  health                    System health check
`)
}

export async function run(args) {
  const subcommand = args.find((a) => !a.startsWith('-'))

  if (!subcommand || args.includes('--help')) {
    showHelp()
    return
  }

  switch (subcommand) {
    case 'dashboard':
      return await dashboard(args)
    case 'status':
      return await resourceStatus(args)
    case 'summary':
      return await statsSummary(args)
    case 'ai-usage':
      return await aiUsage(args)
    case 'health':
      return await healthCheck(args)
    default:
      error(`Unknown subcommand: ${subcommand}`)
      showHelp()
      process.exit(1)
  }
}

async function dashboard(args) {
  const { values } = parseArgs({
    args,
    options: {
      section: { type: 'string' },
    },
    allowPositionals: true,
    strict: false,
  })

  const data = await apiGet('/api/admin/dashboard/stats', {
    section: values.section,
  })

  if (args.includes('--json')) {
    output(data)
    return
  }

  // Display dashboard sections
  if (data.resources) {
    summary('Resources', data.resources)
  }
  if (data.agents) {
    summary('AI Agents', data.agents)
  }
  if (data.suggestions) {
    summary('Suggestions', data.suggestions)
  }
  if (data.users) {
    summary('Users', data.users)
  }

  // If a single section was requested, just output the data
  if (values.section && data[values.section]) {
    summary(values.section, data[values.section])
  } else if (!data.resources && !data.agents && !data.suggestions && !data.users) {
    output(data)
  }
}

async function statsSummary(args) {
  const data = await apiGet('/api/admin/statistics/summary')

  if (args.includes('--json')) {
    output(data)
    return
  }

  summary('Resource Summary', {
    'Total Active': data.total_active,
    Ungeocoded: data.ungeocoded || 0,
  })

  if (data.by_state && Object.keys(data.by_state).length) {
    summary('By State', data.by_state)
  }

  if (data.by_city && Object.keys(data.by_city).length) {
    summary('By City', data.by_city)
  }

  if (data.by_category && Object.keys(data.by_category).length) {
    summary('By Category', data.by_category)
  }
}

async function resourceStatus(args) {
  const { values } = parseArgs({
    args,
    options: {
      'batch-size': { type: 'string', default: '500' },
    },
    allowPositionals: true,
    strict: false,
  })

  const batchSize = parseInt(values['batch-size']) || 500
  const sql = getDb()

  try {
    const [raw] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active')::int AS active_total,
        COUNT(*) FILTER (WHERE status = 'active' AND (verified = true OR verification_status = 'verified'))::int AS verified_total,
        COUNT(*) FILTER (WHERE status = 'active' AND verification_status = 'pending')::int AS verification_pending,
        COUNT(*) FILTER (WHERE status = 'active' AND verification_status = 'needs_review')::int AS verification_needs_review,
        COUNT(*) FILTER (WHERE status = 'active' AND verification_status = 'failed')::int AS verification_failed,
        COUNT(*) FILTER (WHERE status = 'active' AND human_review_required = true)::int AS human_review_required,
        COUNT(*) FILTER (WHERE status = 'active' AND last_verified_at IS NULL)::int AS never_verified,
        COUNT(*) FILTER (WHERE status = 'active' AND last_verified_at IS NOT NULL AND (next_verification_at IS NULL OR next_verification_at <= NOW()))::int AS stale_records,
        COUNT(*) FILTER (WHERE status = 'active' AND website IS NOT NULL AND website != '' AND (next_verification_at IS NULL OR next_verification_at <= NOW()))::int AS due_verification_queue,
        COUNT(*) FILTER (WHERE status = 'active' AND ai_enriched = true)::int AS ai_enriched,
        COUNT(*) FILTER (WHERE status = 'active' AND website IS NOT NULL AND website != '' AND (hours IS NULL OR hours::text = 'null' OR hours::text = '{}' OR description IS NULL OR description = '' OR email IS NULL OR email = ''))::int AS needs_enrichment,
        COUNT(*) FILTER (WHERE status = 'active' AND (website IS NULL OR website = ''))::int AS missing_website,
        COUNT(*) FILTER (WHERE status = 'active' AND (email IS NULL OR email = ''))::int AS missing_email,
        COUNT(*) FILTER (WHERE status = 'active' AND (hours IS NULL OR hours::text = 'null' OR hours::text = '{}'))::int AS missing_hours,
        COUNT(*) FILTER (WHERE status = 'active' AND (latitude IS NULL OR longitude IS NULL))::int AS ungeocoded
      FROM resources
    `

    const report = buildResourceStatusReport(raw || {}, { batchSize })

    if (args.includes('--json')) {
      output(report)
      return
    }

    summary('Operational Status', {
      'Active Total': report.overview.active_total,
      Verified: `${report.overview.verified_total} (${report.overview.verified_rate})`,
      'AI Enriched': `${report.overview.ai_enriched} (${report.overview.ai_enriched_rate})`,
    })

    summary('Verification', {
      Pending: report.verification.pending,
      'Needs Review': report.verification.needs_review,
      Failed: report.verification.failed,
      'Human Review Required': report.verification.human_review_required,
      'Never Verified': report.verification.never_verified,
      'Stale Records': report.verification.stale_records,
      'Due Queue (website-backed)': report.verification.due_queue,
    })

    summary('Enrichment', {
      'Needs Enrichment': report.enrichment.needs_enrichment,
      'Remaining Batches': `${report.enrichment.remaining_batches} @ ${batchSize}/batch`,
      'Final Batch Size': report.enrichment.final_batch_size,
      'Missing Email': report.enrichment.missing_email,
      'Missing Hours': report.enrichment.missing_hours,
    })

    summary('Data Quality', {
      'Missing Website': report.data_quality.missing_website,
      Ungeocoded: report.data_quality.ungeocoded,
    })
  } finally {
    await closeDb()
  }
}

async function aiUsage(args) {
  const { values } = parseArgs({
    args,
    options: {
      days: { type: 'string', default: '30' },
    },
    allowPositionals: true,
    strict: false,
  })

  const data = await apiGet('/api/admin/ai-usage', {
    days: values.days,
  })

  output(data)
}

async function healthCheck(args) {
  const data = await apiGet('/api/analytics/health')

  if (args.includes('--json')) {
    output(data)
    return
  }

  summary('System Health', {
    Status: data.status || 'unknown',
    Database: data.database || 'unknown',
    ...(data.uptime && { Uptime: data.uptime }),
    ...(data.version && { Version: data.version }),
  })
}
