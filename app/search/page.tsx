import { parsePageNumber } from '@/lib/utils/pagination'
import { Alert, Container, Typography } from '@mui/material'
import { getResources, getCategoryCounts, getResourcesCount } from '@/lib/api/resources'
import { ResultsExplorer } from '@/components/search/ResultsExplorer'
import { SearchPageHeader } from '@/components/search/SearchPageHeader'
import { buildResourcesQueryOptions, type ResourcesPageSearchParams } from '@/app/resources/params'
import { interpretSearch } from '@/lib/utils/search-intent'
import { getCategoryLabel } from '@/lib/utils/categories'
import { createOpenGraphImage } from '@/lib/seo/open-graph'
import type { Metadata } from 'next'

interface SearchPageProps {
  searchParams: Promise<ResourcesPageSearchParams>
}
const PAGE_SIZE = 20

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = buildResourcesQueryOptions(params)
  const currentPage = parsePageNumber(params.page)
  const [result, count, facets] = await Promise.all([
    getResources({ ...query, limit: PAGE_SIZE, offset: (currentPage - 1) * PAGE_SIZE }),
    getResourcesCount(query),
    getCategoryCounts({ ...query, categories: undefined }),
  ])
  if (result.error || count.error) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error">
          <Typography fontWeight={600}>Resources could not be loaded</Typography>Please try your
          search again.
        </Alert>
      </Container>
    )
  }
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
      <SearchPageHeader search={query.search} />
      <ResultsExplorer
        resources={result.data || []}
        totalCount={count.data || 0}
        categoryCounts={facets.data || undefined}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        intentLabel={interpretSearch(query.search || '').label}
      />
    </Container>
  )
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams
  const query = buildResourcesQueryOptions(params)
  const intent = interpretSearch(query.search)
  const explicitCategory = query.categories?.length === 1 ? query.categories[0] : undefined
  const category = explicitCategory || intent.categories[0]
  const subject = explicitCategory
    ? getCategoryLabel(explicitCategory)
    : intent.label || (query.search ? `Help with “${query.search}”` : 'Find reentry help')
  const imageTitle = `${subject}${query.locationName ? ` in ${query.locationName}` : ''}`
  const title = `${imageTitle} | Reentry Map`
  const description =
    'Find employment, housing, food, healthcare, and support services. Compare resources, check service areas, and contact a provider.'
  const image = createOpenGraphImage({
    kind: 'search',
    eyebrow: query.locationName ? 'Local search results' : 'Resource search',
    title: imageTitle,
    description,
    location: query.locationName,
    category,
  })
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Reentry Map',
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}
