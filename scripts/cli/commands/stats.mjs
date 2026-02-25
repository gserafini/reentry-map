/**
 * stats - Dashboard statistics, summary reports, AI usage.
 *
 * Subcommands:
 *   dashboard [--section X]   Dashboard stats (resources, agents, etc.)
 *   summary                   Comprehensive resource statistics
 *   ai-usage [--days N]       AI agent usage and costs
 *   health                    System health check
 */
import { parseArgs } from 'node:util'
import { apiGet } from '../api.mjs'
import { summary, error, output } from '../output.mjs'

function showHelp() {
  console.log(`
stats - Dashboard statistics, summary reports, AI usage

Subcommands:
  dashboard [--section X]   Dashboard stats
    --section X             Section: resources, agents, suggestions, users

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
