import { Container, Typography, Box, Alert, Button, Grid, Paper, Card } from '@mui/material'
import { SearchOff as SearchOffIcon } from '@mui/icons-material'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getResources, getCategoryCounts, getResourcesCount } from '@/lib/api/resources'
import { ResourceList } from '@/components/resources/ResourceList'
import { ResourceMapWithLocation } from '@/components/map/ResourceMapWithLocation'
import { CategoryFilter } from '@/components/search/CategoryFilter'
import { LocationFilterSidebar } from '@/components/search/LocationFilterSidebar'
import { Pagination } from '@/components/search/Pagination'
import { SortDropdown } from '@/components/search/SortDropdown'
import { parseSortParam } from '@/lib/utils/sort'
import { getCategoryLabel, getAllCategories } from '@/lib/utils/categories'
import { getCategoryIcon, getCategoryColor } from '@/lib/utils/category-icons'
import type { ResourceCategory } from '@/lib/types/database'

interface CategoryPageProps {
  params: Promise<{
    category: string
  }>
  searchParams: Promise<{
    search?: string
    page?: string
    sort?: string
  }>
}

const PAGE_SIZE = 20

/**
 * Category-specific Resources Page
 * SEO-friendly route: /resources/category/{category}
 */
export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category } = await params
  const { search, page, sort: sortParam } = await searchParams
  const currentPage = Number(page) || 1
  const offset = (currentPage - 1) * PAGE_SIZE
  const sort = parseSortParam(sortParam)

  // Validate category
  const validCategories = getAllCategories()
  if (!validCategories.includes(category as ResourceCategory)) {
    notFound()
  }

  const typedCategory = category as ResourceCategory

  // Fetch resources for this category
  const { data: resources, error } = await getResources({
    search,
    categories: [typedCategory],
    limit: PAGE_SIZE,
    offset,
    sort,
  })

  // Get total count for pagination
  const { data: totalCount } = await getResourcesCount({
    search,
    categories: [typedCategory],
  })
  const totalPages = Math.ceil((totalCount || 0) / PAGE_SIZE)

  // Fetch category counts for filter display
  const { data: categoryCounts } = await getCategoryCounts()

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Error Loading Resources
          </Typography>
          <Typography>
            We encountered an issue loading resources. Please try again later.
          </Typography>
        </Alert>
      </Container>
    )
  }

  const hasResults = resources && resources.length > 0
  const isSearching = Boolean(search && search.trim())
  const categoryLabel = getCategoryLabel(typedCategory)
  const CategoryIcon = getCategoryIcon(typedCategory)
  const categoryColor = getCategoryColor(typedCategory)

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CategoryIcon sx={{ fontSize: 48, color: categoryColor }} />
          <Typography variant="h3" component="h1">
            {categoryLabel} Resources{isSearching && <> - &ldquo;{search}&rdquo;</>}
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          {isSearching
            ? `Search results in ${categoryLabel.toLowerCase()}`
            : `Browse all ${categoryLabel.toLowerCase()} resources in your area`}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Filter Sidebar - Location + Categories */}
        <Grid size={{ xs: 12, md: 3 }}>
          <LocationFilterSidebar>
            <Card>
              <CategoryFilter categoryCounts={categoryCounts || undefined} />
            </Card>
          </LocationFilterSidebar>
        </Grid>

        {/* Results */}
        <Grid size={{ xs: 12, md: 9 }}>
          {/* Sort dropdown */}
          {hasResults && (
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <SortDropdown />
            </Box>
          )}

          {/* No results state */}
          {!hasResults && (
            <Alert
              severity="info"
              icon={<SearchOffIcon />}
              sx={{ mb: 3 }}
              action={
                <Link href={`/resources/category/${category}`} style={{ textDecoration: 'none' }}>
                  <Button color="inherit" size="small">
                    Clear Search
                  </Button>
                </Link>
              }
            >
              <Typography variant="subtitle2" gutterBottom>
                No results found{isSearching && ` for \u201C${search}"`}
              </Typography>
              <Typography variant="body2">
                {isSearching
                  ? 'Try adjusting your search terms.'
                  : `There are currently no ${categoryLabel.toLowerCase()} resources available.`}
              </Typography>
            </Alert>
          )}

          {/* Map with location-based zoom */}
          {hasResults && (
            <Paper
              elevation={2}
              sx={{
                mb: 3,
                overflow: 'hidden',
                borderRadius: 2,
              }}
            >
              <ResourceMapWithLocation resources={resources || []} height="500px" />
            </Paper>
          )}

          <ResourceList resources={resources || []} />

          {/* Pagination */}
          {hasResults && totalCount && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
            />
          )}
        </Grid>
      </Grid>
    </Container>
  )
}

// Category-specific SEO content
const getCategoryDescription = (category: string): string => {
  const descriptions: Record<string, string> = {
    employment:
      'Find employment resources, job training programs, and career counseling services for individuals navigating reentry. Connect with employers who hire people with criminal records.',
    housing:
      'Discover housing assistance programs, transitional housing, and permanent supportive housing for individuals reentering society. Find affordable housing options and rental assistance.',
    food: 'Access food assistance programs, food pantries, and meal services in your community. Find resources for nutritional support and emergency food aid.',
    'mental-health':
      'Connect with mental health services, counseling, therapy, and support groups for individuals in reentry. Find trauma-informed care and wellness programs.',
    healthcare:
      'Find healthcare services, medical clinics, and health insurance enrollment assistance. Access primary care, dental, and vision services for reentry individuals.',
    'substance-abuse-treatment':
      'Locate substance abuse treatment programs, recovery services, and support groups. Find evidence-based treatment and medication-assisted recovery programs.',
    'legal-aid':
      'Access legal aid services, expungement assistance, and criminal justice advocacy. Find free legal help for record clearing and civil legal issues.',
    transportation:
      'Find transportation assistance, bus passes, and ride programs to help with job interviews, appointments, and daily needs during reentry.',
    education:
      'Discover educational programs, GED classes, vocational training, and college access resources. Find literacy programs and skills development opportunities.',
    clothing:
      'Access clothing assistance programs for job interviews, work attire, and everyday needs. Find free clothing closets and professional wardrobe services.',
    'id-documents':
      "Get help obtaining vital documents including birth certificates, state IDs, Social Security cards, and driver's licenses needed for reentry.",
    'faith-based':
      'Connect with faith-based organizations offering spiritual support, mentorship, and reentry services. Find community churches and religious programs.',
    'general-support':
      'Find comprehensive support services, case management, and navigation assistance for all aspects of reentry. Access holistic support programs.',
  }
  return (
    descriptions[category] ||
    `Find ${category} resources and support services for individuals navigating reentry in your community.`
  )
}

const getCategoryKeywords = (category: string): string[] => {
  const keywords: Record<string, string[]> = {
    employment: [
      'employment',
      'jobs',
      'job training',
      'career counseling',
      'work programs',
      'fair chance hiring',
      'ban the box',
    ],
    housing: [
      'housing assistance',
      'transitional housing',
      'affordable housing',
      'rental assistance',
      'supportive housing',
      'shelter',
    ],
    food: [
      'food assistance',
      'food pantry',
      'meal programs',
      'nutrition',
      'food stamps',
      'SNAP benefits',
    ],
    'mental-health': [
      'mental health',
      'counseling',
      'therapy',
      'support groups',
      'trauma care',
      'wellness',
    ],
    healthcare: [
      'healthcare',
      'medical services',
      'health insurance',
      'primary care',
      'dental care',
      'vision care',
    ],
    'substance-abuse-treatment': [
      'substance abuse',
      'addiction treatment',
      'recovery programs',
      'rehab',
      'sobriety support',
    ],
    'legal-aid': [
      'legal aid',
      'expungement',
      'record clearing',
      'legal services',
      'criminal justice',
      'legal help',
    ],
    transportation: [
      'transportation',
      'bus passes',
      'rides',
      'transit assistance',
      'mobility services',
    ],
    education: [
      'education',
      'GED',
      'vocational training',
      'college access',
      'literacy programs',
      'skills training',
    ],
    clothing: [
      'clothing assistance',
      'professional attire',
      'work clothes',
      'clothing closet',
      'dress for success',
    ],
    'id-documents': [
      'ID documents',
      'birth certificate',
      'state ID',
      'Social Security card',
      'driver license',
      'vital records',
    ],
    'faith-based': [
      'faith-based',
      'church programs',
      'spiritual support',
      'religious services',
      'ministry',
    ],
    'general-support': [
      'support services',
      'case management',
      'reentry programs',
      'navigation assistance',
      'comprehensive care',
    ],
  }
  return keywords[category] || [category]
}

// Generate metadata for SEO
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params

  // Validate category
  const validCategories = getAllCategories()
  if (!validCategories.includes(category as ResourceCategory)) {
    return {
      title: 'Category Not Found | Reentry Map',
    }
  }

  const categoryLabel = getCategoryLabel(category as ResourceCategory)
  const description = getCategoryDescription(category)
  const categoryKeywords = getCategoryKeywords(category)

  const keywords = [
    ...categoryKeywords,
    'reentry resources',
    'reentry services',
    'criminal justice',
    'second chances',
    'community resources',
  ]

  return {
    title: `${categoryLabel} Resources | Reentry Map`,
    description,
    keywords: keywords.join(', '),
    openGraph: {
      title: `${categoryLabel} Resources | Reentry Map`,
      description,
      type: 'website',
      siteName: 'Reentry Map',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${categoryLabel} Resources`,
      description,
    },
  }
}
