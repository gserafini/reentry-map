/**
 * coverage - Coverage analysis, gap detection, and expansion targets.
 *
 * Subcommands:
 *   gaps --city X --state X    Category coverage gaps for a city
 *   metrics [--type X]         Geographic coverage metrics
 *   targets [--limit N]        Next expansion target cities
 */
import { parseArgs } from 'node:util'
import { apiGet } from '../api.mjs'
import { table, summary, error, output } from '../output.mjs'
import { getDb, closeDb } from '../db.mjs'

function showHelp() {
  console.log(`
coverage - Coverage analysis, gap detection, and expansion targets

Subcommands:
  gaps --city X --state X    Show category coverage for a city
                             Identifies missing (0) and thin (1-2) categories

  metrics [--type X]         Geographic coverage metrics
    --type state|county      Aggregation level (default: state)

  targets [--limit N]        Show next expansion target cities
    --limit N                Number of targets (default: 10)
    --status X               Filter by status
    --research-status X      Filter by research status
`)
}

export async function run(args) {
  const subcommand = args.find((a) => !a.startsWith('-'))

  if (!subcommand || args.includes('--help')) {
    showHelp()
    return
  }

  switch (subcommand) {
    case 'gaps':
      return await coverageGaps(args)
    case 'metrics':
      return await coverageMetrics(args)
    case 'targets':
      return await coverageTargets(args)
    default:
      error(`Unknown subcommand: ${subcommand}`)
      showHelp()
      process.exit(1)
  }
}

async function coverageGaps(args) {
  const { values } = parseArgs({
    args,
    options: {
      city: { type: 'string' },
      state: { type: 'string' },
    },
    allowPositionals: true,
    strict: false,
  })

  if (!values.city || !values.state) {
    error('Usage: coverage gaps --city Boulder --state CO')
    process.exit(1)
  }

  const data = await apiGet('/api/admin/coverage/city', {
    city: values.city,
    state: values.state,
  })

  if (args.includes('--json')) {
    output(data)
    return
  }

  summary(`Coverage: ${data.city}, ${data.state}`, {
    'Total Resources': data.total_resources,
    Ungeocoded: data.ungeocoded || 0,
    'Categories with Coverage': Object.values(data.categories).filter((v) => v > 0).length,
    'Gaps (0 resources)': data.gaps?.length || 0,
    'Thin (1-2 resources)': data.thin_coverage?.length || 0,
  })

  // Show categories table
  const rows = Object.entries(data.categories).map(([cat, count]) => ({
    category: cat,
    count,
    status: count === 0 ? 'GAP' : count <= 2 ? 'THIN' : 'OK',
  }))
  rows.sort((a, b) => a.count - b.count)

  table(rows, ['category', 'count', 'status'], {
    category: 'Category',
    count: 'Count',
    status: 'Status',
  })

  if (data.gaps?.length) {
    console.log(`\nGaps (need resources): ${data.gaps.join(', ')}`)
  }
  if (data.thin_coverage?.length) {
    console.log(`Thin coverage (need more): ${data.thin_coverage.join(', ')}`)
  }
}

async function coverageMetrics(args) {
  const { values } = parseArgs({
    args,
    options: {
      type: { type: 'string', default: 'state' },
    },
    allowPositionals: true,
    strict: false,
  })

  const data = await apiGet('/api/admin/coverage/metrics', {
    type: values.type,
  })

  output(data)
}

async function coverageTargets(args) {
  const { values } = parseArgs({
    args,
    options: {
      limit: { type: 'string', default: '10' },
      status: { type: 'string' },
      'research-status': { type: 'string' },
    },
    allowPositionals: true,
    strict: false,
  })

  const limit = parseInt(values.limit) || 10

  // Direct DB query — replicates get-next-targets.mjs logic
  const sql = getDb()

  try {
    const rows = await sql`
      SELECT
        city_name, state_code, county_name,
        metro_population, priority_score, tier,
        resource_count, status, research_status, notes
      FROM expansion_priorities
      WHERE 1=1
        ${values.status ? sql`AND status = ${values.status}` : sql``}
        ${values['research-status'] ? sql`AND research_status = ${values['research-status']}` : sql``}
      ORDER BY priority_score DESC
      LIMIT ${limit}
    `

    if (args.includes('--json')) {
      output(rows)
      return
    }

    if (!rows.length) {
      console.log('No expansion targets found.')
      return
    }

    summary('Expansion Targets', {
      Showing: rows.length,
    })

    table(
      rows.map((r) => ({
        city: `${r.city_name}, ${r.state_code}`,
        population: r.metro_population?.toLocaleString() || '?',
        score: r.priority_score?.toFixed(1) || '?',
        tier: r.tier || '?',
        resources: r.resource_count || 0,
        status: r.status || 'pending',
      })),
      ['city', 'population', 'score', 'tier', 'resources', 'status'],
      {
        city: 'City',
        population: 'Metro Pop',
        score: 'Priority',
        tier: 'Tier',
        resources: 'Resources',
        status: 'Status',
      }
    )
  } finally {
    await closeDb()
  }
}
