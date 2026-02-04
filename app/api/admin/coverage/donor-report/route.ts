import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { sql } from '@/lib/db/client'

type MetricRow = {
  geography_type: string
  geography_id: string
  geography_name: string
  coverage_score: number
  total_resources: number
  verified_resources: number
  categories_covered: number
  unique_resources: number
  avg_completeness_score: number
  avg_verification_score: number
  resources_with_reviews: number
  reentry_population: number
  last_updated: string
}

type Tier1CountyRow = {
  fips_code: string
  county_name: string
  state_code: string
  priority_tier: number
  estimated_annual_releases: number
}

interface StateEntry {
  name: string
  coverage_score: number
  total_resources: number
  categories_covered: number
}

interface CountyEntry {
  name: string
  coverage_score: number
  total_resources: number
  unique_resources: number
}

interface DonorReportData {
  generated_at: string
  report_period: string
  executive_summary: {
    total_resources: number
    verified_resources: number
    states_covered: number
    counties_covered: number
    tier1_coverage_percent: number
    estimated_people_served: number
  }
  talking_points: string[]
  geographic_breakdown: {
    national: {
      coverage_score: number
      total_resources: number
      categories_covered: number
    }
    top_states: StateEntry[]
    top_counties: CountyEntry[]
  }
  impact_metrics: {
    unique_resources: number
    average_completeness: number
    average_verification: number
    resources_with_reviews: number
  }
  future_plans: string[]
}

/**
 * GET /api/admin/coverage/donor-report
 *
 * Generates a formatted donor report with coverage statistics
 *
 * Query params:
 * - format?: 'json' | 'markdown' | 'html' (default: 'json')
 *
 * Returns:
 * - Donor-ready statistics and talking points
 * - Geographic coverage breakdown
 * - Growth metrics and future plans
 *
 * Requires admin authentication
 *
 * TODO: Add PDF generation using a library like pdfkit or puppeteer
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

    const format = request.nextUrl.searchParams.get('format') || 'json'

    // Fetch coverage metrics
    const metrics = await sql<MetricRow[]>`SELECT * FROM coverage_metrics ORDER BY coverage_score DESC`

    // Get national metrics
    const national = metrics.find((m) => m.geography_type === 'national')

    // Get state metrics
    const states = metrics.filter((m) => m.geography_type === 'state')

    // Get county metrics
    const counties = metrics.filter((m) => m.geography_type === 'county')

    // Get tier 1 county coverage
    const tier1Counties = await sql<Tier1CountyRow[]>`SELECT fips_code, county_name, state_code, priority_tier, estimated_annual_releases FROM county_data WHERE priority_tier = 1`

    const tier1Count = tier1Counties.length
    const tier1WithCoverage = tier1Counties.filter((county) =>
      metrics.some((m) => m.geography_id === county.fips_code && m.total_resources > 0)
    ).length

    const tier1CoveragePercent = tier1Count > 0 ? (tier1WithCoverage / tier1Count) * 100 : 0

    // Calculate total estimated reentry population covered
    const totalReentryPopulationCovered = counties.reduce((sum, county) => {
      return sum + (county.reentry_population || 0)
    }, 0)

    // Build report data
    const reportData = {
      generated_at: new Date().toISOString(),
      report_period: 'Current',
      executive_summary: {
        total_resources: national?.total_resources || 0,
        verified_resources: national?.verified_resources || 0,
        states_covered: states.length,
        counties_covered: counties.length,
        tier1_coverage_percent: Math.round(tier1CoveragePercent * 100) / 100,
        estimated_people_served: totalReentryPopulationCovered,
      },
      talking_points: [
        `We are currently covering ${counties.length} counties across ${states.length} states with ${national?.total_resources || 0} verified resources.`,
        `Our coverage includes ${tier1WithCoverage} of the ${tier1Count} highest-priority counties (${Math.round(tier1CoveragePercent)}%), representing the areas with the greatest reentry population.`,
        `These resources serve an estimated ${totalReentryPopulationCovered.toLocaleString()} returning citizens annually.`,
        `${national?.verified_resources || 0} of our resources have been verified within the last 90 days, ensuring up-to-date information for those navigating reentry.`,
        counties.length > 10
          ? `We've achieved comprehensive coverage in ${counties.filter((c) => c.coverage_score >= 70).length} counties with "good" or better coverage scores.`
          : `We're actively expanding our coverage and are on track to serve all Tier 1 priority counties by Q2 2025.`,
      ],
      geographic_breakdown: {
        national: {
          coverage_score: national?.coverage_score || 0,
          total_resources: national?.total_resources || 0,
          categories_covered: national?.categories_covered || 0,
        },
        top_states: states.slice(0, 5).map((s) => ({
          name: s.geography_name,
          coverage_score: s.coverage_score,
          total_resources: s.total_resources,
          categories_covered: s.categories_covered,
        })),
        top_counties: counties.slice(0, 10).map((c) => ({
          name: c.geography_name,
          coverage_score: c.coverage_score,
          total_resources: c.total_resources,
          unique_resources: c.unique_resources,
        })),
      },
      impact_metrics: {
        unique_resources: national?.unique_resources || 0,
        average_completeness: national?.avg_completeness_score || 0,
        average_verification: national?.avg_verification_score || 0,
        resources_with_reviews: national?.resources_with_reviews || 0,
      },
      future_plans: [
        'Expand to all Tier 1 counties (highest reentry populations) by Q2 2025',
        'Achieve 90%+ coverage in California, Texas, Florida, New York, and Illinois',
        'Launch AI-powered resource discovery agents to automate coverage expansion',
        'Partner with 211 directories and government agencies for comprehensive coverage',
        'Build mobile apps for iOS and Android to increase accessibility',
      ],
    }

    // Return in requested format
    if (format === 'markdown') {
      const markdown = generateMarkdownReport(reportData)
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="donor-report-${new Date().toISOString().split('T')[0]}.md"`,
        },
      })
    }

    if (format === 'html') {
      const html = generateHTMLReport(reportData)
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
        },
      })
    }

    // Default: JSON
    return NextResponse.json(reportData)
  } catch (error) {
    console.error('Error generating donor report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateMarkdownReport(data: DonorReportData): string {
  return `
# Reentry Map - Donor Report
**Generated:** ${new Date(data.generated_at).toLocaleDateString()}

## Executive Summary

- **Total Resources:** ${data.executive_summary.total_resources.toLocaleString()}
- **Verified Resources:** ${data.executive_summary.verified_resources.toLocaleString()}
- **States Covered:** ${data.executive_summary.states_covered}
- **Counties Covered:** ${data.executive_summary.counties_covered}
- **Tier 1 Coverage:** ${data.executive_summary.tier1_coverage_percent}%
- **Estimated People Served:** ${data.executive_summary.estimated_people_served.toLocaleString()} annually

## Key Talking Points

${data.talking_points.map((point: string, i: number) => `${i + 1}. ${point}`).join('\n')}

## Geographic Coverage

### National
- Coverage Score: ${data.geographic_breakdown.national.coverage_score.toFixed(1)}%
- Total Resources: ${data.geographic_breakdown.national.total_resources}
- Categories Covered: ${data.geographic_breakdown.national.categories_covered}/13

### Top 5 States
${data.geographic_breakdown.top_states
  .map(
    (s: StateEntry, i: number) =>
      `${i + 1}. **${s.name}**: ${s.coverage_score.toFixed(1)}% coverage, ${s.total_resources} resources, ${s.categories_covered}/13 categories`,
  )
  .join('\n')}

### Top 10 Counties
${data.geographic_breakdown.top_counties
  .map(
    (c: CountyEntry, i: number) =>
      `${i + 1}. **${c.name}**: ${c.coverage_score.toFixed(1)}% coverage, ${c.total_resources} resources (${c.unique_resources} unique)`,
  )
  .join('\n')}

## Impact Metrics

- **Unique Resources:** ${data.impact_metrics.unique_resources} (not available in other directories)
- **Average Completeness:** ${data.impact_metrics.average_completeness?.toFixed(1)}%
- **Average Verification Score:** ${data.impact_metrics.average_verification?.toFixed(1)}%
- **Resources with Reviews:** ${data.impact_metrics.resources_with_reviews}

## Future Plans

${data.future_plans.map((plan: string, i: number) => `${i + 1}. ${plan}`).join('\n')}

---

*This report was generated automatically by Reentry Map's Coverage Tracking System.*
`
}

function generateHTMLReport(data: DonorReportData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Reentry Map - Donor Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; color: #333; }
    h1 { color: #065f46; border-bottom: 3px solid #10b981; padding-bottom: 10px; }
    h2 { color: #047857; margin-top: 40px; border-bottom: 2px solid #d1fae5; padding-bottom: 8px; }
    h3 { color: #065f46; margin-top: 24px; }
    .metric { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #10b981; }
    .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .metric-item { background: white; padding: 16px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .metric-value { font-size: 32px; font-weight: bold; color: #065f46; }
    .metric-label { font-size: 14px; color: #6b7280; margin-top: 4px; }
    ul { line-height: 1.8; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; text-align: center; }
  </style>
</head>
<body>
  <h1>Reentry Map - Donor Report</h1>
  <p><strong>Generated:</strong> ${new Date(data.generated_at).toLocaleDateString()}</p>

  <h2>Executive Summary</h2>
  <div class="metric-grid">
    <div class="metric-item">
      <div class="metric-value">${data.executive_summary.total_resources.toLocaleString()}</div>
      <div class="metric-label">Total Resources</div>
    </div>
    <div class="metric-item">
      <div class="metric-value">${data.executive_summary.verified_resources.toLocaleString()}</div>
      <div class="metric-label">Verified Resources</div>
    </div>
    <div class="metric-item">
      <div class="metric-value">${data.executive_summary.states_covered}</div>
      <div class="metric-label">States Covered</div>
    </div>
    <div class="metric-item">
      <div class="metric-value">${data.executive_summary.counties_covered}</div>
      <div class="metric-label">Counties Covered</div>
    </div>
    <div class="metric-item">
      <div class="metric-value">${data.executive_summary.tier1_coverage_percent.toFixed(1)}%</div>
      <div class="metric-label">Tier 1 Coverage</div>
    </div>
    <div class="metric-item">
      <div class="metric-value">${data.executive_summary.estimated_people_served.toLocaleString()}</div>
      <div class="metric-label">People Served Annually</div>
    </div>
  </div>

  <h2>Key Talking Points</h2>
  <ol>
    ${data.talking_points.map((point: string) => `<li>${point}</li>`).join('')}
  </ol>

  <h2>Geographic Coverage</h2>

  <h3>National</h3>
  <div class="metric">
    <strong>Coverage Score:</strong> ${data.geographic_breakdown.national.coverage_score.toFixed(1)}%<br>
    <strong>Total Resources:</strong> ${data.geographic_breakdown.national.total_resources}<br>
    <strong>Categories Covered:</strong> ${data.geographic_breakdown.national.categories_covered}/13
  </div>

  <h3>Top 5 States</h3>
  <ol>
    ${data.geographic_breakdown.top_states
      .map(
        (s: StateEntry) =>
          `<li><strong>${s.name}:</strong> ${s.coverage_score.toFixed(1)}% coverage, ${s.total_resources} resources, ${s.categories_covered}/13 categories</li>`,
      )
      .join('')}
  </ol>

  <h3>Top 10 Counties</h3>
  <ol>
    ${data.geographic_breakdown.top_counties
      .map(
        (c: CountyEntry) =>
          `<li><strong>${c.name}:</strong> ${c.coverage_score.toFixed(1)}% coverage, ${c.total_resources} resources (${c.unique_resources} unique)</li>`,
      )
      .join('')}
  </ol>

  <h2>Future Plans</h2>
  <ol>
    ${data.future_plans.map((plan: string) => `<li>${plan}</li>`).join('')}
  </ol>

  <div class="footer">
    <p>This report was generated automatically by Reentry Map's Coverage Tracking System.</p>
  </div>
</body>
</html>
`
}
