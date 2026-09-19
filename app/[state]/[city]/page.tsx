import { parsePageNumber } from '@/lib/utils/pagination'
import { Container, Typography, Alert } from '@mui/material'
import { notFound } from 'next/navigation'
import { getResources, getCategoryCounts, getResourcesCount } from '@/lib/api/resources'
import { getCityPageData } from '@/lib/api/seo-pages'
import { ResultsExplorer } from '@/components/search/ResultsExplorer'
import { BreadcrumbList, CollectionPage, ItemList } from '@/components/seo/StructuredData'
import { parseStateSlug, parseCitySlug, generateCityUrl, generateStateUrl } from '@/lib/utils/urls'
import { buildResourcesQueryOptions, type ResourcesPageSearchParams } from '@/app/resources/params'
import { createOpenGraphImage } from '@/lib/seo/open-graph'
import type { Metadata } from 'next'

interface CityPageProps {
  params: Promise<{ state: string; city: string }>
  searchParams: Promise<ResourcesPageSearchParams>
}
const PAGE_SIZE = 20
export default async function CityPage({ params, searchParams }: CityPageProps) {
  const route = await params
  const state = parseStateSlug(route.state)
  const city = parseCitySlug(route.city)
  const page = await getCityPageData(city, state)
  if (!page) notFound()
  const filters = await searchParams
  const currentPage = parsePageNumber(filters.page)
  const query = buildResourcesQueryOptions({
    city,
    state,
    search: filters.search,
    categories: filters.categories,
    sort: filters.sort,
    locationName: `${city}, ${state}`,
  })
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
  const cityUrl = generateCityUrl(city, state)
  return (
    <>
      <BreadcrumbList
        items={[
          { name: 'Home', url: '/' },
          { name: state, url: generateStateUrl(state) },
          { name: `${city}, ${state}`, url: cityUrl },
        ]}
      />
      <CollectionPage
        name={`Reentry Resources in ${city}, ${state}`}
        description={`Find help in ${city}, ${state}.`}
        url={cityUrl}
        numberOfItems={count.data || 0}
      />
      {result.data?.length ? (
        <ItemList
          name={`Resources in ${city}`}
          description="Services for people navigating reentry."
          url={cityUrl}
          resources={result.data}
        />
      ) : null}
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ mb: 2, fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 700 }}
        >
          Resources in {city}, {state}
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
export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params

  const state = parseStateSlug(stateSlug)
  const city = parseCitySlug(citySlug)
  const cityData = await getCityPageData(city, state)

  if (!cityData) {
    return { title: 'Page Not Found | Reentry Map' }
  }

  const title = `Reentry Resources in ${city}, ${state} | Reentry Map`
  const description = `Find ${cityData.totalResources} reentry resources in ${city}, ${state}. Browse employment, housing, food, healthcare, and support services.`
  const cityUrl = generateCityUrl(city, state)
  const image = createOpenGraphImage({
    kind: 'city',
    eyebrow: 'Local resource directory',
    title: `Reentry resources in ${city}, ${state}`,
    description,
    location: `${city}, ${state}`,
    count: cityData.totalResources,
  })

  return {
    title,
    description,
    keywords: [
      `${city} reentry resources`,
      `${city} employment services`,
      `${city} housing assistance`,
      `${city} ${state} reentry programs`,
      'community resources',
      'support services',
    ].join(', '),
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://reentrymap.org${cityUrl}`,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    alternates: {
      canonical: `https://reentrymap.org${cityUrl}`,
    },
  }
}

// Generate static params for all valid city pages (ISR)
// Returns [] during CI build when DATABASE_URL is unavailable
export async function generateStaticParams() {
  try {
    const { getCityPages } = await import('@/lib/api/seo-pages')
    const cityPages = await getCityPages()

    return cityPages.map((page) => ({
      state: page.state.toLowerCase(),
      city: page.city.toLowerCase().replace(/\s+/g, '-'),
    }))
  } catch {
    return []
  }
}
