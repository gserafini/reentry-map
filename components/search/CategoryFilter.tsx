'use client'

import { recordSearchRefinement } from '@/lib/analytics/search-journey'

import React from 'react'
import { getSelectedCategories } from '@/lib/utils/search-filters'
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Paper,
  Chip,
  Collapse,
  IconButton,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { ResourceCategory } from '@/lib/types/database'
import { getAllCategories, getCategoryLabel } from '@/lib/utils/categories'

interface CategoryFilterProps {
  categoryCounts?: Partial<Record<ResourceCategory, number>>
  defaultExpanded?: boolean
}

/**
 * CategoryFilter component for filtering resources by category
 *
 * Features:
 * - Multi-select checkboxes for all categories
 * - Shows resource count per category
 * - Clear all filters button
 * - Updates URL params on filter change (SEO-friendly for single category)
 * - Collapsible on mobile
 * - Fully accessible
 */
export function CategoryFilter({ categoryCounts, defaultExpanded = true }: CategoryFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [expanded, setExpanded] = React.useState(defaultExpanded)

  const selectedCategories = React.useMemo(
    () => getSelectedCategories(searchParams, pathname),
    [searchParams, pathname]
  )

  const browsePath = pathname.replace(/\/category\/[^/]+$/, '') || '/resources'
  const resolvedBrowsePath = pathname.startsWith('/category/') ? '/resources' : browsePath
  const handleCategoryToggle = (category: ResourceCategory) => {
    recordSearchRefinement('category')
    const params = new URLSearchParams(searchParams.toString())
    const next = selectedCategories.includes(category)
      ? selectedCategories.filter((item) => item !== category)
      : [...selectedCategories, category]
    params.delete('page')
    if (next.length) params.set('categories', next.join(','))
    else params.delete('categories')
    router.push(params.size ? `${resolvedBrowsePath}?${params}` : resolvedBrowsePath)
  }
  const handleClearAll = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('categories')
    params.delete('page')
    router.push(params.size ? `${resolvedBrowsePath}?${params}` : resolvedBrowsePath)
  }

  const categories = getAllCategories()
  const hasSelections = selectedCategories.length > 0

  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: expanded ? 2 : 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon color="action" />
          <Typography variant="h6" component="h2">
            Filter by Category
          </Typography>
        </Box>
        <IconButton
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Collapse filters' : 'Expand filters'}
          size="small"
        >
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        {hasSelections && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Active filters:
            </Typography>
            {selectedCategories.map((category) => (
              <Chip
                key={category}
                label={getCategoryLabel(category as ResourceCategory)}
                size="small"
                onDelete={() => handleCategoryToggle(category as ResourceCategory)}
                color="primary"
                variant="outlined"
              />
            ))}
            <Button size="small" onClick={handleClearAll} sx={{ ml: 'auto' }}>
              Clear All
            </Button>
          </Box>
        )}

        <FormGroup>
          {categories.map((category) => {
            const count = categoryCounts?.[category] || 0
            const isSelected = selectedCategories.includes(category)

            return (
              <FormControlLabel
                key={category}
                control={
                  <Checkbox
                    checked={isSelected}
                    onChange={() => handleCategoryToggle(category)}
                    name={category}
                    inputProps={{
                      'aria-label': `Filter by ${getCategoryLabel(category)}`,
                    }}
                  />
                }
                label={
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      minWidth: 200,
                    }}
                  >
                    <Typography variant="body2">{getCategoryLabel(category)}</Typography>
                    <Chip
                      label={count}
                      size="small"
                      variant="outlined"
                      sx={{
                        ml: 1,
                        minWidth: 40,
                        height: 20,
                        '& .MuiChip-label': { px: 1, fontSize: '0.75rem' },
                      }}
                    />
                  </Box>
                }
                sx={{ width: '100%', m: 0, py: 0.5 }}
              />
            )
          })}
        </FormGroup>

        {!hasSelections && categories.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Select one or more categories to filter results
          </Typography>
        )}
      </Collapse>
    </Paper>
  )
}

export default CategoryFilter
