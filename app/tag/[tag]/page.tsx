import { redirect } from 'next/navigation'
import { canonicalResultsUrl } from '@/lib/utils/search-entry'
import type { ResourcesPageSearchParams } from '@/app/resources/params'

interface TagPageProps {
  params: Promise<{ tag: string }>
  searchParams: Promise<ResourcesPageSearchParams>
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { tag } = await params
  redirect(canonicalResultsUrl(await searchParams, { tags: tag }))
}
