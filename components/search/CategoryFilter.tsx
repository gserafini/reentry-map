'use client'

import React from 'react'
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

  // Get selected categories from URL (both query params and pathname)
  const selectedCategories = React.useMemo(() => {
    // Check if we're on a category page (/resources/category/{category})
    const categoryMatch = pathname.match(/\/resources\/category\/([^\/]+)/)
    if (categoryMatch) {
      return [categoryMatch[1]]
    }

    // Otherwise check query params
    const categories = searchParams.get('categories')
    return categories ? categories.split(',').filter(Boolean) : []
  }, [searchParams, pathname])

  const handleCategoryToggle = (category: ResourceCategory) => {
    const params = new URLSearchParams(searchParams.toString())
    let newCategories: string[]

    if (selectedCategories.includes(category)) {
      // Remove category
      newCategories = selectedCategories.filter((c) => c !== category)
    } else {
      // Add category
      newCategories = [...selectedCategories, category]
    }

    // Use SEO-friendly URLs for single category, query params for multiple or none
    if (newCategories.length === 1) {
      // Single category: use SEO-friendly URL
      const search = params.get('search')
      if (search) {
        router.push(`/resources/category/${newCategories[0]}?search=${encodeURIComponent(search)}`)
      } else {
        router.push(`/resources/category/${newCategories[0]}`)
      }
    } else if (newCategories.length > 1) {
      // Multiple categories: use query params
      params.set('categories', newCategories.join(','))
      router.push(`/resources?${params.toString()}`)
    } else {
      // No categories: go to main resources page
      params.delete('categories')
      router.push(`/resources?${params.toString()}`)
    }
  }

  const handleClearAll = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('categories')

    // Navigate to main resources page (preserving search if present)
    const queryString = params.toString()
    router.push(queryString ? `/resources?${queryString}` : '/resources')
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
