import { parsePageNumber } from '@/lib/utils/pagination'
import { Container, Typography, Alert } from '@mui/material'
import { notFound } from 'next/navigation'
import { getResources, getResourcesCount, getCategoryCounts } from '@/lib/api/resources'
import { getCityPageData } from '@/lib/api/seo-pages'
import { ResultsExplorer } from '@/components/search/ResultsExplorer'
import { getCategoryLabel, CATEGORIES } from '@/lib/utils/categories'
import { BreadcrumbList, CollectionPage, ItemList } from '@/components/seo/StructuredData'
import {
  parseStateSlug,
  parseCitySlug,
  generateCityUrl,
  generateCategoryInCityUrl,
  generateStateUrl,
} from '@/lib/utils/urls'
import { buildResourcesQueryOptions, type ResourcesPageSearchParams } from '@/app/resources/params'
import type { Metadata } from 'next'
import type { ResourceCategory } from '@/lib/types/database'

interface CategoryInCityPageProps {
  params: Promise<{ state: string; city: string; category: string }>
  searchParams: Promise<ResourcesPageSearchParams>
}
const PAGE_SIZE = 20
export default async function CategoryInCityPage({
  params,
  searchParams,
}: CategoryInCityPageProps) {
  const route = await params
  const state = parseStateSlug(route.state)
  const city = parseCitySlug(route.city)
  const category = route.category as ResourceCategory
  if (!CATEGORIES.some((item) => item.value === category)) notFound()
  const page = await getCityPageData(city, state)
  if (!page) notFound()
  const filters = await searchParams
  const query = buildResourcesQueryOptions({
    city,
    state,
    search: filters.search,
    categories: category,
    sort: filters.sort,
    locationName: `${city}, ${state}`,
  })
  const currentPage = parsePageNumber(filters.page)
  const [result, count, facets] = await Promise.all([
    getResources({ ...query, limit: PAGE_SIZE, offset: (currentPage - 1) * PAGE_SIZE }),
    getResourcesCount(query),
    getCategoryCounts({ city, state, search: query.search }),
  ])
  if (result.error || count.error)
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error">Resources could not be loaded. Please try again.</Alert>
      </Container>
    )
  const label = getCategoryLabel(category)
  const cityUrl = generateCityUrl(city, state)
  const categoryUrl = generateCategoryInCityUrl(city, state, category)
  return (
    <>
      <BreadcrumbList
        items={[
          { name: 'Home', url: '/' },
          { name: state, url: generateStateUrl(state) },
          { name: `${city}, ${state}`, url: cityUrl },
          { name: label, url: categoryUrl },
        ]}
      />
      <CollectionPage
        name={`${label} in ${city}, ${state}`}
        description={`Find ${label.toLowerCase()} services in ${city}.`}
        url={categoryUrl}
        numberOfItems={count.data || 0}
      />
      {result.data?.length ? (
        <ItemList
          name={`${label} in ${city}`}
          description="Services for people navigating reentry."
          url={categoryUrl}
          resources={result.data}
        />
      ) : null}
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ mb: 2, fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 700 }}
        >
          {label} in {city}, {state}
        </Typography>
        <ResultsExplorer
          resources={result.data || []}
          totalCount={count.data || 0}
          categoryCounts={facets.data || undefined}
          currentPage={currentPage}
          pageSize={PAGE_SIZE}
        />
      </Container>
    </>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: CategoryInCityPageProps): Promise<Metadata> {
  const { state: stateSlug, city: citySlug, category } = await params

  const state = parseStateSlug(stateSlug)
  const city = parseCitySlug(citySlug)

  if (!CATEGORIES.find((c) => c.value === category)) {
    return { title: 'Page Not Found | Reentry Map' }
  }

  const pageData = await getCityPageData(city, state)
  if (!pageData) {
    return { title: 'Page Not Found | Reentry Map' }
  }

  const count = await getResourcesCount({
    city,
    state,
    categories: [category as ResourceCategory],
    locationName: `${city}, ${state}`,
  })
  const categoryLabel = getCategoryLabel(category as ResourceCategory)
  const title = `${categoryLabel} in ${city}, ${state} | Reentry Map`
  const description = `Find ${count.data || 0} ${categoryLabel.toLowerCase()} resources in ${city}, ${state}. Browse programs, services, and support for individuals navigating reentry.`
  const categoryUrl = generateCategoryInCityUrl(city, state, category as ResourceCategory)

  return {
    title,
    description,
    keywords: [
      `${city} ${categoryLabel.toLowerCase()}`,
      `${categoryLabel.toLowerCase()} ${city} ${state}`,
      `${city} reentry ${categoryLabel.toLowerCase()}`,
      'reentry resources',
      'community support',
    ].join(', '),
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://reentrymap.org${categoryUrl}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `https://reentrymap.org${categoryUrl}`,
    },
  }
}

// Generate static params for all valid category/city combinations (ISR)
// Returns [] during CI build when DATABASE_URL is unavailable
export async function generateStaticParams() {
  try {
    const { getCategoryInCityPages } = await import('@/lib/api/seo-pages')
    const pages = await getCategoryInCityPages()

    return pages.map((page) => ({
      state: page.state.toLowerCase(),
      city: page.city.toLowerCase().replace(/\s+/g, '-'),
      category: page.category,
    }))
  } catch {
    return []
  }
}
