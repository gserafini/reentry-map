import { notFound, redirect } from 'next/navigation'
import { parseSeoUrl } from '@/lib/utils/seo-routes'
import { canonicalResultsUrl } from '@/lib/utils/search-entry'
import { normalizeStateCode } from '@/lib/utils/location-scope'
import type { ResourcesPageSearchParams } from '@/app/resources/params'

interface HyperlocalSearchPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<ResourcesPageSearchParams>
}

/** Keep legacy search links working with the same city/category scope as the main results. */
export default async function HyperlocalSearchPage({
  params,
  searchParams,
}: HyperlocalSearchPageProps) {
  const { slug } = await params
  const parsed = parseSeoUrl(slug)
  if (!parsed || !normalizeStateCode(parsed.state)) notFound()
  redirect(
    canonicalResultsUrl(await searchParams, {
      city: parsed.city,
      state: parsed.state,
      categories: parsed.category,
    })
  )
}
