'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Dynamically import the map component with no SSR to avoid window reference errors
const CoverageMapLeaflet = dynamic(() => import('./CoverageMapLeaflet'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full animate-pulse rounded-md bg-gray-200 dark:bg-gray-800">
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    </div>
  ),
})

interface CoverageMapProps {
  onCountyClick?: (fips: string) => void
  viewMode?: 'coverage' | 'resources' | 'priority'
}

export interface CountyData {
  fips_code: string
  state_fips: string
  county_fips: string
  state_code: string
  state_name: string
  county_name: string
  total_population: number | null
  estimated_annual_releases: number | null
  priority_tier: number | null
  priority_weight: number | null
  priority_reason: string | null
  geometry: unknown // GeoJSON object
  center_lat: number | null
  center_lng: number | null
}

export interface CoverageMetrics {
  geography_type: string
  geography_id: string
  geography_name: string
  coverage_score: number
  total_resources: number
  verified_resources: number
  categories_covered: number
  unique_resources: number
  total_population: number | null
  reentry_population: number | null
}

export interface CoverageSummary {
  last_updated: string
  total_resources: number
  national_coverage: number
  states_with_coverage: number
  counties_with_coverage: number
  cities_with_coverage: number
  tier1_counties_total: number
  tier1_counties_covered: number
  tier1_coverage_percent: number
}

export function CoverageMap({ onCountyClick, viewMode = 'coverage' }: CoverageMapProps) {
  const [counties, setCounties] = useState<CountyData[]>([])
  const [metrics, setMetrics] = useState<Record<string, CoverageMetrics>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<CoverageSummary | null>(null)

  useEffect(() => {
    async function loadCoverageData() {
      try {
        setLoading(true)
        setError(null)

        // Fetch coverage metrics
        const metricsResponse = await fetch('/api/admin/coverage/metrics')
        if (!metricsResponse.ok) throw new Error('Failed to load coverage metrics')

        const metricsData = (await metricsResponse.json()) as {
          summary: CoverageSummary
          counties?: CoverageMetrics[]
        }
        setSummary(metricsData.summary)

        // Convert metrics array to lookup object
        const metricsLookup: Record<string, CoverageMetrics> = {}

        // Index county metrics by FIPS code
        metricsData.counties?.forEach((m: CoverageMetrics) => {
          metricsLookup[m.geography_id] = m
        })

        setMetrics(metricsLookup)

        // TODO: Load actual county GeoJSON data
        // For now, we'll use the metrics we have
        // In production, this would load from a GeoJSON file with county boundaries

        setCounties([])
      } catch (err) {
        console.error('Error loading coverage data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load coverage data')
      } finally {
        setLoading(false)
      }
    }

    loadCoverageData()
  }, [])

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading Coverage Data...</CardTitle>
          <CardDescription>Please wait while we load coverage metrics</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Error Loading Coverage Map</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Resources</CardDescription>
              <CardTitle className="text-3xl">{summary.total_resources}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>National Coverage</CardDescription>
              <CardTitle className="text-3xl">{summary.national_coverage.toFixed(1)}%</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>States Covered</CardDescription>
              <CardTitle className="text-3xl">{summary.states_with_coverage}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Counties Covered</CardDescription>
              <CardTitle className="text-3xl">{summary.counties_with_coverage}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tier 1 Counties</CardDescription>
              <CardTitle className="text-3xl">
                {summary.tier1_counties_covered}/{summary.tier1_counties_total}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tier 1 Coverage</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl">
                {summary.tier1_coverage_percent.toFixed(1)}%
                <Badge variant={summary.tier1_coverage_percent >= 75 ? 'default' : 'secondary'}>
                  {summary.tier1_coverage_percent >= 75 ? 'Excellent' : 'Growing'}
                </Badge>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Map Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Coverage Map Legend</CardTitle>
          <CardDescription>Color-coded by {viewMode} score</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-8 rounded bg-emerald-700"></div>
              <span className="text-sm">Excellent (90-100)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-8 rounded bg-emerald-500"></div>
              <span className="text-sm">Good (70-89)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-8 rounded bg-yellow-400"></div>
              <span className="text-sm">Fair (50-69)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-8 rounded bg-orange-500"></div>
              <span className="text-sm">Poor (30-49)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-8 rounded bg-red-600"></div>
              <span className="text-sm">None (0-29)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-8 rounded border border-gray-300 bg-gray-100"></div>
              <span className="text-sm">No Data</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Component */}
      <Card>
        <CardContent className="p-0">
          <CoverageMapLeaflet
            counties={counties}
            metrics={metrics}
            viewMode={viewMode}
            onCountyClick={onCountyClick}
          />
        </CardContent>
      </Card>
    </div>
  )
}
