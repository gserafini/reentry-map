'use client'

import { useState } from 'react'
import { CoverageMap } from './CoverageMap'
import { CountyDetailPanel } from './CountyDetailPanel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshCw, Download, TrendingUp, MapPin, Target } from 'lucide-react'

export function CoverageMapDashboard() {
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'coverage' | 'resources' | 'priority'>('coverage')
  const [isCalculating, setIsCalculating] = useState(false)

  async function handleRecalculateAll() {
    if (!confirm('Recalculate coverage metrics for all geographies? This may take a few minutes.')) {
      return
    }

    try {
      setIsCalculating(true)

      const response = await fetch('/api/admin/coverage/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geography_type: 'all' }),
      })

      if (!response.ok) throw new Error('Failed to recalculate coverage')

      const data = (await response.json()) as { calculated: number }
      alert(`Successfully recalculated ${data.calculated} coverage metrics!`)

      // Refresh the page to show updated data
      window.location.reload()
    } catch (err) {
      console.error('Error recalculating coverage:', err)
      alert('Failed to recalculate coverage: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setIsCalculating(false)
    }
  }

  async function handleExportReport() {
    try {
      const response = await fetch('/api/admin/coverage/metrics')
      if (!response.ok) throw new Error('Failed to fetch metrics')

      const data = await response.json()

      // Create CSV export
      const csv = generateCSVReport(data)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `coverage-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting report:', err)
      alert('Failed to export report: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  async function handleGenerateDonorReport() {
    try {
      // Open donor report in new window
      window.open('/api/admin/coverage/donor-report?format=html', '_blank')
    } catch (err) {
      console.error('Error generating donor report:', err)
      alert('Failed to generate donor report: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  function generateCSVReport(data: any): string {
    const lines: string[] = []

    // Header
    lines.push('Geography Type,Geography Name,Coverage Score,Total Resources,Verified Resources,Categories Covered,Unique Resources')

    // National
    if (data.national) {
      lines.push(
        `National,${data.national.geography_name},${data.national.coverage_score},${data.national.total_resources},${data.national.verified_resources},${data.national.categories_covered},${data.national.unique_resources}`,
      )
    }

    // States
    data.states?.forEach((s: any) => {
      lines.push(
        `State,${s.geography_name},${s.coverage_score},${s.total_resources},${s.verified_resources},${s.categories_covered},${s.unique_resources}`,
      )
    })

    // Counties
    data.counties?.forEach((c: any) => {
      lines.push(
        `County,"${c.geography_name}",${c.coverage_score},${c.total_resources},${c.verified_resources},${c.categories_covered},${c.unique_resources}`,
      )
    })

    return lines.join('\n')
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Controls</CardTitle>
          <CardDescription>Manage coverage tracking and generate reports</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={handleRecalculateAll} disabled={isCalculating} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${isCalculating ? 'animate-spin' : ''}`} />
            {isCalculating ? 'Calculating...' : 'Recalculate All Metrics'}
          </Button>
          <Button onClick={handleExportReport} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV Report
          </Button>
          <Button onClick={handleGenerateDonorReport} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Generate Donor Report
          </Button>
        </CardContent>
      </Card>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="coverage" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Coverage
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="priority" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Priority
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coverage" className="mt-6">
          <CoverageMap viewMode="coverage" onCountyClick={setSelectedCounty} />
        </TabsContent>

        <TabsContent value="resources" className="mt-6">
          <CoverageMap viewMode="resources" onCountyClick={setSelectedCounty} />
        </TabsContent>

        <TabsContent value="priority" className="mt-6">
          <CoverageMap viewMode="priority" onCountyClick={setSelectedCounty} />
        </TabsContent>
      </Tabs>

      {/* County Detail Panel */}
      {selectedCounty && (
        <div className="mt-6">
          <CountyDetailPanel fips={selectedCounty} onClose={() => setSelectedCounty(null)} />
        </div>
      )}

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>About Coverage Tracking</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <h4>Coverage Score Formula</h4>
          <p>The coverage score is a weighted composite of four key metrics:</p>
          <ul>
            <li>
              <strong>Resource Count (30%)</strong>: Number of resources vs. target (50 resources = 100%)
            </li>
            <li>
              <strong>Category Coverage (30%)</strong>: Breadth across 13 categories (all categories = 100%)
            </li>
            <li>
              <strong>Population Coverage (20%)</strong>: Resources per 1,000 returning citizens (5 per 1K = 100%)
            </li>
            <li>
              <strong>Verification Quality (20%)</strong>: Percentage verified in last 90 days + avg verification score
            </li>
          </ul>

          <h4>Priority Tiers</h4>
          <ul>
            <li>
              <strong>Tier 1</strong>: Highest priority counties (estimated 10,000+ annual releases)
            </li>
            <li>
              <strong>Tier 2</strong>: High priority counties (5,000-9,999 annual releases)
            </li>
            <li>
              <strong>Tier 3</strong>: Medium priority counties (2,000-4,999 annual releases)
            </li>
            <li>
              <strong>Tier 4</strong>: Lower priority counties (500-1,999 annual releases)
            </li>
            <li>
              <strong>Tier 5</strong>: Lowest priority counties (&lt;500 annual releases)
            </li>
          </ul>

          <h4>Using This Dashboard</h4>
          <ol>
            <li>
              <strong>View Mode</strong>: Switch between Coverage, Resources, and Priority views using the tabs
            </li>
            <li>
              <strong>Explore Counties</strong>: Click on a county marker to see detailed metrics
            </li>
            <li>
              <strong>Trigger Research</strong>: Queue AI research agents to discover resources for specific counties
            </li>
            <li>
              <strong>Export Data</strong>: Generate CSV reports for analysis or PDF reports for donors
            </li>
            <li>
              <strong>Recalculate Metrics</strong>: Refresh all coverage scores after adding new resources
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
