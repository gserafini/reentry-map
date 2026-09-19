'use client'

import { useState, useEffect } from 'react'
import NextLink from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Alert,
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { Close, FilterList, ListAlt, MapOutlined } from '@mui/icons-material'
import {
  beginSearchJourney,
  recordSearchRefinement,
  recordSearchPosition,
} from '@/lib/analytics/search-journey'
import { ResourceList } from '@/components/resources/ResourceList'
import { ResourceMap } from '@/components/map'
import { CategoryFilter } from './CategoryFilter'
import { DistanceFilter } from './DistanceFilter'
import { SortDropdown } from './SortDropdown'
import { Pagination } from './Pagination'
import { resolveSearchLocation } from '@/lib/utils/search-location'
import { buildViewportUrl, type MapViewportBounds } from '@/lib/utils/map-viewport'
import { getSelectedCategories } from '@/lib/utils/search-filters'
import { groupResourcesByLocation } from '@/lib/utils/resource-groups'
import { getResourceUrl } from '@/lib/utils/resource-url'
import { getCategoryLabel } from '@/lib/utils/categories'
import type { Resource, ResourceCategory } from '@/lib/types/database'
import type { ResourceMapItem } from '@/lib/api/resources'

interface ResultsExplorerProps {
  resources: Resource[]
  mapResources?: ResourceMapItem[]
  categoryCounts?: Partial<Record<ResourceCategory, number>>
  totalCount: number
  pageSize?: number
  currentPage?: number
  intentLabel?: string | null
}

export function ResultsExplorer({
  resources,
  mapResources,
  categoryCounts,
  totalCount,
  pageSize = 20,
  currentPage = 1,
  intentLabel,
}: ResultsExplorerProps) {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const location = resolveSearchLocation(params, pathname)
  const desktop = useMediaQuery(useTheme().breakpoints.up('md'))
  const [view, setView] = useState<'list' | 'map'>('list')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null)
  const [pendingBounds, setPendingBounds] = useState<MapViewportBounds | null>(null)
  const categories = getSelectedCategories(params, pathname)
  const tags = [
    ...new Set(
      (params.get('tags') || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    ),
  ]
  const signature = params.toString()
  const categoryMetric = categories.join(',')
  const scope = location.city
    ? 'city'
    : location.state
      ? 'state'
      : location.coordinates
        ? 'radius'
        : location.viewportBounds
          ? 'map'
          : 'nationwide'
  useEffect(() => {
    beginSearchJourney({ scope, category: categoryMetric, results_count: totalCount })
  }, [signature, pathname, scope, categoryMetric, totalCount])
  const scopedLabel = location.city
    ? `In ${location.label}, including services covering this area`
    : location.state
      ? `Serving ${location.label}`
      : location.coordinates
        ? `Within ${location.radiusMiles} miles of ${location.label}, plus services covering this area`
        : location.label === 'Map area'
          ? 'In the selected map area'
          : 'Across the United States'
  const changeQuery = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString())
    next.delete('page')
    Object.entries(changes).forEach(([key, value]) =>
      value === null ? next.delete(key) : next.set(key, value)
    )
    const route =
      changes.categories === null && pathname.includes('/category/')
        ? pathname.replace(/\/category\/[^/]+$/, '') || '/resources'
        : pathname
    return next.size ? `${route}?${next}` : route
  }
  const selectFromMap = (id: string) => {
    setSelectedResourceId(id)
    setView('list')
    requestAnimationFrame(() =>
      (
        document.getElementById(`resource-${id}`) || document.getElementById('selected-map-result')
      )?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    )
  }
  const mapDataset = mapResources?.length ? mapResources : resources
  const selectedOutsidePage =
    selectedResourceId && !resources.some((resource) => resource.id === selectedResourceId)
      ? mapDataset.find((resource) => resource.id === selectedResourceId)
      : undefined
  const totalPages = Math.ceil(totalCount / pageSize)
  const hasMultipleSections = groupResourcesByLocation(resources).length > 1

  return (
    <Box>
      <Box sx={{ mb: 1.5 }} aria-live="polite">
        <Typography component="h2" variant="h6">
          {totalCount.toLocaleString()} resource{totalCount === 1 ? '' : 's'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {scopedLabel}
        </Typography>
        {intentLabel && (
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Showing help with {intentLabel.toLowerCase()}.
          </Typography>
        )}
      </Box>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}
      >
        <Button
          variant="outlined"
          startIcon={<FilterList />}
          onClick={() => setFiltersOpen(true)}
          aria-haspopup="dialog"
        >
          Filters{categories.length ? ` (${categories.length})` : ''}
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ textAlign: 'right' }}>
          <SortDropdown
            showDistanceSort={Boolean(location.coordinates)}
            defaultSort={
              params.get('search')?.trim()
                ? 'relevance'
                : location.coordinates
                  ? 'distance-asc'
                  : 'name-asc'
            }
            variant="inline"
          />
          {hasMultipleSections && (
            <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2 }}>
              Sorted within each section
            </Typography>
          )}
        </Box>
        {!desktop && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={view}
            aria-label="Results view"
            onChange={(_, value: 'list' | 'map' | null) => value && setView(value)}
          >
            <ToggleButton value="list" aria-label="List">
              <ListAlt fontSize="small" sx={{ mr: 0.5 }} />
              List
            </ToggleButton>
            <ToggleButton value="map" aria-label="Map">
              <MapOutlined fontSize="small" sx={{ mr: 0.5 }} />
              Map
            </ToggleButton>
          </ToggleButtonGroup>
        )}
      </Stack>
      {(categories.length > 0 || tags.length > 0) && (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
          {tags.map((tag) => (
            <Chip
              key={'tag-' + tag}
              size="small"
              label={'Tag: ' + tag}
              onDelete={() => {
                recordSearchRefinement('clear_filters')
                router.push(
                  changeQuery({ tags: tags.filter((value) => value !== tag).join(',') || null })
                )
              }}
            />
          ))}
          {categories.map((category) => (
            <Chip
              key={category}
              size="small"
              label={getCategoryLabel(category as ResourceCategory)}
              color="primary"
              variant="outlined"
            />
          ))}
        </Stack>
      )}
      <Box
        sx={{
          display: { xs: 'block', md: 'grid' },
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Box
          onClickCapture={(event) => {
            const row = (event.target as HTMLElement).closest('[data-result-position]')
            if (row) recordSearchPosition(Number(row.getAttribute('data-result-position')))
          }}
          sx={{ minWidth: 0, display: desktop || view === 'list' ? 'block' : 'none' }}
        >
          {selectedOutsidePage && (
            <Alert id="selected-map-result" severity="info" sx={{ mb: 2 }}>
              <Typography fontWeight={600}>Selected on map: {selectedOutsidePage.name}</Typography>
              <Button
                component={NextLink}
                href={getResourceUrl(selectedOutsidePage)}
                size="small"
                sx={{ mt: 1 }}
              >
                View selected resource
              </Button>
            </Alert>
          )}
          {resources.length > 0 ? (
            <ResourceList
              resources={resources}
              singleColumn
              groupByLocationType
              selectedResourceId={selectedResourceId}
              onResourceSelect={(id) => {
                setSelectedResourceId(id)
                setView('map')
              }}
              userLocation={
                location.coordinates
                  ? { lat: location.coordinates.latitude, lng: location.coordinates.longitude }
                  : null
              }
            />
          ) : (
            <Alert severity="info">
              <Typography fontWeight={600}>No matching resources in this area</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Try a wider area or remove a search term or category. Availability may change;
                contact the provider before traveling.
              </Typography>
              <Stack direction="row" flexWrap="wrap" useFlexGap gap={1} sx={{ mt: 2 }}>
                {location.coordinates &&
                  [50, 100]
                    .filter((radius) => radius > (location.radiusMiles || 25))
                    .map((radius) => (
                      <Button
                        component={NextLink}
                        key={radius}
                        href={changeQuery({ distance: String(radius) })}
                        onClick={() => recordSearchRefinement('expand_area')}
                        size="small"
                        variant="outlined"
                      >
                        Try {radius} miles
                      </Button>
                    ))}
                {(params.get('search') || categories.length > 0 || tags.length > 0) && (
                  <Button
                    component={NextLink}
                    href={changeQuery({ search: null, categories: null, tags: null })}
                    onClick={() => recordSearchRefinement('clear_filters')}
                    size="small"
                    variant="outlined"
                  >
                    Browse all help in this area
                  </Button>
                )}
              </Stack>
            </Alert>
          )}
          {totalCount > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
            />
          )}
        </Box>
        {(desktop || view === 'map') && (
          <Box
            sx={{
              position: { md: 'sticky' },
              top: { md: 190 },
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <ResourceMap
              resources={mapDataset}
              height={desktop ? '540px' : '55vh'}
              userLocation={location.coordinates}
              radiusMiles={location.radiusMiles}
              viewportBounds={location.viewportBounds}
              fitToResources={!location.coordinates}
              selectedResourceId={selectedResourceId}
              onResourceClick={selectFromMap}
              onViewportBoundsChange={setPendingBounds}
            />
            <Box sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                Map shows {mapDataset.length} of {totalCount.toLocaleString()} matching resources.
                {mapDataset.length < totalCount && ' Narrow the area to see more.'} Area services
                may cover more than a single pin.
              </Typography>
              {pendingBounds && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    recordSearchRefinement('map_area')
                    const mapParams = new URLSearchParams(params.toString())
                    if (categories.length) mapParams.set('categories', categories.join(','))
                    router.push(
                      buildViewportUrl(
                        location.city ? '/resources' : pathname,
                        mapParams,
                        pendingBounds
                      ),
                      { scroll: false }
                    )
                    setPendingBounds(null)
                  }}
                >
                  Search this map area
                </Button>
              )}
            </Box>
          </Box>
        )}
      </Box>
      <Drawer
        anchor="right"
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        PaperProps={{
          'aria-label': 'Filter resources',
          sx: { width: { xs: '90vw', sm: 360 }, maxWidth: 420 },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6" component="h2">
              Filter resources
            </Typography>
            <IconButton onClick={() => setFiltersOpen(false)} aria-label="Close filters">
              <Close />
            </IconButton>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {scopedLabel}
          </Typography>
          <DistanceFilter
            hasLocation={Boolean(location.coordinates)}
            defaultDistance={location.radiusMiles || 25}
          />
          <CategoryFilter categoryCounts={categoryCounts} />
          <Button
            fullWidth
            variant="contained"
            onClick={() => setFiltersOpen(false)}
            sx={{ mt: 2 }}
          >
            Show {totalCount.toLocaleString()} results
          </Button>
        </Box>
      </Drawer>
    </Box>
  )
}
