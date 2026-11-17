import type { MetadataRoute } from 'next'
import { sql } from '@/lib/db/client'
import { buildSitemapEntries, type SitemapResource } from '@/lib/seo/sitemap-entries'

// Reflect reviewed directory corrections without publishing a stale build-time inventory.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rows = await sql<SitemapResource[]>`
    SELECT id,name,city,state,slug,primary_category,updated_at,created_at
    FROM resources WHERE status = 'active'
  `
  return buildSitemapEntries(rows)
}
