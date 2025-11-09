'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, RefreshCw, TrendingUp, Users, MapPin, Star, CheckCircle2 } from 'lucide-react'

interface CountyDetail {
  county: {
    fips_code: string
    name: string
    state: string
    state_code: string
    population: number | null
    reentry_population: number | null
    priority_tier: number | null
    priority_reason: string | null
  }
  metrics: {
    coverage_score: number
    total_resources: number
    verified_resources: number
    categories_covered: number
    unique_resources: number
  }
  resources: {
    total: number
    by_category: Record<string, number>
    unique_count: number
    with_reviews: number
  }
  comparison: {
    state: {
      name: string
      coverage_score: number
      total_resources: number
    }
    national: {
      coverage_score: number
      total_resources: number
    }
    rank_in_state: number | null
    total_counties_in_state: number
  }
}

interface CountyDetailPanelProps {
  fips: string | null
  onClose: () => void
}

export function CountyDetailPanel({ fips, onClose }: CountyDetailPanelProps) {
  const [detail, setDetail] = useState<CountyDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [triggeringResearch, setTriggeringResearch] = useState(false)

  useEffect(() => {
    if (!fips) {
      setDetail(null)
      return
    }

    async function loadCountyDetail() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/admin/coverage/county/${fips}`)
        if (!response.ok) throw new Error('Failed to load county details')

        const data = (await response.json()) as CountyDetail
        setDetail(data)
      } catch (err) {
        console.error('Error loading county detail:', err)
        setError(err instanceof Error ? err.message : 'Failed to load county details')
      } finally {
        setLoading(false)
      }
    }

    loadCountyDetail()
  }, [fips])

  async function handleTriggerResearch() {
    if (!fips) return

    try {
      setTriggeringResearch(true)

      const response = await fetch('/api/admin/coverage/trigger-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ county_fips: fips }),
      })

      if (!response.ok) throw new Error('Failed to trigger research')

      const data = (await response.json()) as { job_id: string; message: string }
      alert(`Research job queued! Job ID: ${data.job_id}\n\n${data.message}`)
    } catch (err) {
      console.error('Error triggering research:', err)
      alert('Failed to trigger research: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setTriggeringResearch(false)
    }
  }

  if (!fips) return null

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!detail) return null

  const getCoverageLabel = (score: number) => {
    if (score >= 90) return { label: 'Excellent', variant: 'default' as const }
    if (score >= 70) return { label: 'Good', variant: 'default' as const }
    if (score >= 50) return { label: 'Fair', variant: 'secondary' as const }
    if (score >= 30) return { label: 'Poor', variant: 'secondary' as const }
    return { label: 'None', variant: 'destructive' as const }
  }

  const coverageLabel = getCoverageLabel(detail.metrics.coverage_score)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl">
                {detail.county.name}, {detail.county.state_code}
              </CardTitle>
              <CardDescription className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">FIPS: {detail.county.fips_code}</Badge>
                {detail.county.priority_tier && (
                  <Badge variant={detail.county.priority_tier <= 2 ? 'default' : 'secondary'}>
                    <Star className="mr-1 h-3 w-3" />
                    Tier {detail.county.priority_tier} Priority
                  </Badge>
                )}
                <Badge variant={coverageLabel.variant}>{coverageLabel.label} Coverage</Badge>
              </CardDescription>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm">
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Coverage Score */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Coverage Score</p>
                <p className="text-4xl font-bold">{detail.metrics.coverage_score.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>

          {/* Population Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Total Population</p>
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {detail.county.population ? detail.county.population.toLocaleString() : 'N/A'}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Annual Releases</p>
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {detail.county.reentry_population
                  ? detail.county.reentry_population.toLocaleString()
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* Resource Metrics */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-600">
                {detail.metrics.total_resources}
              </p>
              <p className="text-sm text-muted-foreground">Total Resources</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {detail.metrics.verified_resources}
              </p>
              <p className="text-sm text-muted-foreground">Verified</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">
                {detail.metrics.categories_covered}/13
              </p>
              <p className="text-sm text-muted-foreground">Categories</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">
                {detail.metrics.unique_resources}
              </p>
              <p className="text-sm text-muted-foreground">Unique</p>
            </div>
          </div>

          {/* Resources by Category */}
          {Object.keys(detail.resources.by_category).length > 0 && (
            <div>
              <h4 className="mb-3 font-semibold">Resources by Category</h4>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {Object.entries(detail.resources.by_category)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, count]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between rounded border px-3 py-2"
                    >
                      <span className="text-sm capitalize">{category.replace(/_/g, ' ')}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Comparison */}
          <div>
            <h4 className="mb-3 font-semibold">Comparison</h4>
            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">vs. {detail.comparison.state.name}</span>
                <span className="font-semibold">
                  {detail.metrics.coverage_score > detail.comparison.state.coverage_score
                    ? '↑'
                    : '↓'}{' '}
                  {Math.abs(
                    detail.metrics.coverage_score - detail.comparison.state.coverage_score
                  ).toFixed(1)}
                  %
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">vs. National Average</span>
                <span className="font-semibold">
                  {detail.metrics.coverage_score > detail.comparison.national.coverage_score
                    ? '↑'
                    : '↓'}{' '}
                  {Math.abs(
                    detail.metrics.coverage_score - detail.comparison.national.coverage_score
                  ).toFixed(1)}
                  %
                </span>
              </div>
              {detail.comparison.rank_in_state && (
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-sm">Rank in State</span>
                  <span className="font-semibold">
                    #{detail.comparison.rank_in_state} of{' '}
                    {detail.comparison.total_counties_in_state}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleTriggerResearch}
              disabled={triggeringResearch}
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              {triggeringResearch ? 'Triggering...' : 'Trigger Research'}
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Recalculate Metrics
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              View Resources
            </Button>
          </div>

          {/* Priority Reason */}
          {detail.county.priority_reason && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-semibold">Priority Classification</p>
              <p className="mt-1 text-sm text-muted-foreground">{detail.county.priority_reason}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
