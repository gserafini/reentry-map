import { notFound, redirect } from 'next/navigation'
import { canonicalResultsUrl } from '@/lib/utils/search-entry'
import { parseCitySlug } from '@/lib/utils/urls'
import { normalizeStateCode } from '@/lib/utils/location-scope'
import type { ResourcesPageSearchParams } from '@/app/resources/params'

interface TagInCityPageProps {
  params: Promise<{ state: string; city: string; tag: string }>
  searchParams: Promise<ResourcesPageSearchParams>
}

export default async function TagInCityPage({ params, searchParams }: TagInCityPageProps) {
  const route = await params
  const state = normalizeStateCode(route.state)
  if (!state) notFound()
  redirect(
    canonicalResultsUrl(await searchParams, {
      state,
      city: parseCitySlug(route.city),
      tags: route.tag,
    })
  )
}
