import { parsePageNumber } from '@/lib/utils/pagination'
import { Container, Typography, Box, Alert } from '@mui/material'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getResources, getCategoryCounts, getResourcesCount } from '@/lib/api/resources'
import { ResultsExplorer } from '@/components/search/ResultsExplorer'
import { getCategoryLabel, getAllCategories } from '@/lib/utils/categories'
import { BreadcrumbList, CollectionPage, ItemList } from '@/components/seo/StructuredData'
import { buildResourcesQueryOptions, type ResourcesPageSearchParams } from '@/app/resources/params'
import type { ResourceCategory } from '@/lib/types/database'

interface CategoryPageProps {
  params: Promise<{ category: string }>
  searchParams: Promise<ResourcesPageSearchParams>
}
const PAGE_SIZE = 20

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category } = await params
  if (!getAllCategories().includes(category as ResourceCategory)) notFound()
  const typedCategory = category as ResourceCategory
  const categoryLabel = getCategoryLabel(typedCategory)
  const search = await searchParams
  const query = buildResourcesQueryOptions({ ...search, categories: category })
  const currentPage = parsePageNumber(search.page)
  const [result, count, facets] = await Promise.all([
    getResources({ ...query, limit: PAGE_SIZE, offset: (currentPage - 1) * PAGE_SIZE }),
    getResourcesCount(query),
    getCategoryCounts({ ...query, categories: undefined }),
  ])
  if (result.error || count.error)
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error">Resources could not be loaded. Please try again.</Alert>
      </Container>
    )
  const description = `Browse ${categoryLabel.toLowerCase()} resources${query.locationName ? ' in ' + query.locationName : ' across the United States'}.`
  return (
    <>
      <BreadcrumbList
        items={[
          { name: 'Home', url: '/' },
          { name: categoryLabel, url: `/category/${category}` },
        ]}
      />
      <CollectionPage
        name={`${categoryLabel} Reentry Resources`}
        description={description}
        url={`/category/${category}`}
        numberOfItems={count.data || 0}
      />
      {result.data?.length ? (
        <ItemList
          name={`${categoryLabel} Resources`}
          description={description}
          url={`/category/${category}`}
          resources={result.data}
        />
      ) : null}
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 700 }}
          >
            {categoryLabel}
            {query.search ? ` — “${query.search}”` : ' resources'}
          </Typography>
        </Box>
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

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params
  if (!getAllCategories().includes(category as ResourceCategory))
    return { title: 'Category Not Found | Reentry Map' }
  const categoryLabel = getCategoryLabel(category as ResourceCategory)
  const title = `${categoryLabel} Reentry Resources | Reentry Map`
  const description = `Find ${categoryLabel.toLowerCase()} resources for individuals navigating reentry. Compare services and contact providers in your area.`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://reentrymap.org/category/${category}`,
    },
    alternates: { canonical: `https://reentrymap.org/category/${category}` },
  }
}

export async function generateStaticParams() {
  return getAllCategories().map((category) => ({ category }))
}
