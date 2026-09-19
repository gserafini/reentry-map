import { parsePageNumber } from '@/lib/utils/pagination'
import { Container, Typography, Alert } from '@mui/material'
import {
  getResources,
  getCategoryCounts,
  getResourcesForMap,
  getResourcesCount,
} from '@/lib/api/resources'
import { ResourcesView } from './ResourcesView'
import { buildResourcesQueryOptions, type ResourcesPageSearchParams } from './params'
import { interpretSearch } from '@/lib/utils/search-intent'
import { getCategoryLabel } from '@/lib/utils/categories'
import { createOpenGraphImage } from '@/lib/seo/open-graph'
import type { Metadata } from 'next'

interface ResourcesPageProps {
  searchParams: Promise<ResourcesPageSearchParams>
}
const PAGE_SIZE = 20

export default async function ResourcesPage({ searchParams }: ResourcesPageProps) {
  const params = await searchParams
  const query = buildResourcesQueryOptions(params)
  const currentPage = parsePageNumber(params.page)
  const [result, map, count, facets] = await Promise.all([
    getResources({ ...query, limit: PAGE_SIZE, offset: (currentPage - 1) * PAGE_SIZE }),
    getResourcesForMap(query),
    getResourcesCount(query),
    getCategoryCounts({ ...query, categories: undefined }),
  ])
  if (result.error || count.error)
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error">Resources could not be loaded. Please try again.</Alert>
      </Container>
    )
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
      <Typography
        variant="h4"
        component="h1"
        sx={{ mb: 2, fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 700 }}
      >
        {query.search ? `Help with “${query.search}”` : 'Community resources'}
      </Typography>
      <ResourcesView
        resources={result.data || []}
        mapResources={map.data || undefined}
        categoryCounts={facets.data || undefined}
        totalCount={count.data || 0}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        intentLabel={interpretSearch(query.search || '').label}
        search={query.search}
        isSearching={query.isSearching}
        isFiltering={query.isFiltering}
      />
    </Container>
  )
}

export async function generateMetadata({ searchParams }: ResourcesPageProps): Promise<Metadata> {
  const params = await searchParams
  const query = buildResourcesQueryOptions(params)
  const category = query.categories?.length === 1 ? query.categories[0] : undefined
  const intent = interpretSearch(query.search)
  const subject = category
    ? `${getCategoryLabel(category)} resources`
    : intent.label || (query.search ? `Help with “${query.search}”` : 'Find reentry help')
  const imageTitle = `${subject}${query.locationName ? ` in ${query.locationName}` : ''}`
  const title = `${imageTitle} | Reentry Map`
  const description =
    'Browse practical community services, compare options, and contact providers directly.'
  const image = createOpenGraphImage({
    kind: query.search ? 'search' : 'directory',
    eyebrow: query.locationName ? 'Local resource directory' : 'Nationwide resource directory',
    title: imageTitle,
    description,
    location: query.locationName,
    category: category || intent.categories[0],
  })

  return {
    title,
    description,
    openGraph: { title, description, type: 'website', siteName: 'Reentry Map', images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}
