/**
 * Smart Breadcrumbs Component
 * Dynamically generates breadcrumb trail based on how user arrived at the page
 */

import { Breadcrumbs, Typography } from '@mui/material'
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material'
import Link from 'next/link'
import type { Resource, ResourceCategory } from '@/lib/types/database'
import { generateCityUrl, generateCategoryInCityUrl, generateStateUrl } from '@/lib/utils/urls'
import { getCategoryLabel } from '@/lib/utils/categories'
import { BreadcrumbList } from '@/components/seo/StructuredData'

interface SmartBreadcrumbsProps {
  resource: Resource
  referer?: string
}

/**
 * Extract category from referrer URL if user came from a category page
 * Examples:
 * - https://reentrymap.org/ca/oakland/category/employment -> "employment"
 * - https://reentrymap.org/ca/oakland/category/housing -> "housing"
 * - null if came from elsewhere
 */
function extractCategoryFromReferer(referer: string, state: string, city: string): string | null {
  if (!referer) return null

  try {
    const url = new URL(referer)
    const pathname = url.pathname

    const stateSlug = state.toLowerCase()
    const citySlug = city.toLowerCase().replace(/\s+/g, '-')

    // Pattern: /{state}/{city}/category/{category}
    const pattern = new RegExp(`^/${stateSlug}/${citySlug}/category/([a-z-]+)$`)
    const match = pathname.match(pattern)

    if (match) {
      return match[1]
    }
  } catch {
    // Invalid URL, ignore
  }

  return null
}

/**
 * Generate breadcrumb items based on context
 */
function generateBreadcrumbItems(resource: Resource, referer?: string) {
  if (!resource.city || !resource.state) {
    // Resources without location just show Home > Resource
    return [
      { name: 'Home', url: '/' },
      { name: resource.name, url: '' },
    ]
  }

  const items = [
    {
      name: 'Home',
      url: '/',
    },
    {
      name: resource.state,
      url: generateStateUrl(resource.state),
    },
    {
      name: `${resource.city}, ${resource.state}`,
      url: generateCityUrl(resource.city, resource.state),
    },
  ]

  // If user came from a category page, add that to breadcrumbs
  const categoryFromReferer = referer
    ? extractCategoryFromReferer(referer, resource.state, resource.city)
    : null

  if (categoryFromReferer) {
    items.push({
      name: getCategoryLabel(categoryFromReferer as ResourceCategory),
      url: generateCategoryInCityUrl(
        resource.city,
        resource.state,
        categoryFromReferer as ResourceCategory
      ),
    })
  } else if (resource.primary_category) {
    // Fallback to primary category if no referer context
    items.push({
      name: getCategoryLabel(resource.primary_category as ResourceCategory),
      url: generateCategoryInCityUrl(
        resource.city,
        resource.state,
        resource.primary_category as ResourceCategory
      ),
    })
  }

  // Current page (not a link)
  items.push({
    name: resource.name,
    url: '', // Empty URL means current page
  })

  return items
}

export function SmartBreadcrumbs({ resource, referer }: SmartBreadcrumbsProps) {
  const items = generateBreadcrumbItems(resource, referer)

  return (
    <>
      {/* JSON-LD Structured Data for Search Engines */}
      <BreadcrumbList
        items={items.filter((item) => item.url).map((item) => ({ name: item.name, url: item.url }))}
      />

      {/* Visual Breadcrumbs for Users */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 3 }}
        aria-label="breadcrumb"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          if (isLast) {
            return (
              <Typography key={item.name} color="text.primary">
                {item.name}
              </Typography>
            )
          }

          return (
            <Link
              key={item.url}
              href={item.url}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <Typography
                color="text.secondary"
                sx={{
                  '&:hover': {
                    color: 'primary.main',
                    textDecoration: 'underline',
                  },
                }}
              >
                {item.name}
              </Typography>
            </Link>
          )
        })}
      </Breadcrumbs>
    </>
  )
}
