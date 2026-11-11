import { sql } from '@/lib/db/client'
import {
  getDuplicateCanonicalResourceId,
  getDuplicateCanonicalResourceUrl,
  type ResourceMergeSource,
  type ResourceMergeTarget,
  type ResourceSlugPeer,
} from '@/lib/utils/duplicate-resource'

/** Resolve a merge only when its generated active route uniquely names the target. */
export async function resolveDuplicateResourceRedirect(
  duplicate: ResourceMergeSource
): Promise<string | null> {
  const canonicalId = getDuplicateCanonicalResourceId(duplicate)
  if (!canonicalId) return null

  const canonicalRows = await sql<ResourceMergeTarget[]>`
    SELECT id, name, city, state, status, provenance
    FROM resources
    WHERE id = ${canonicalId} AND status = 'active'
    LIMIT 1
  `
  const canonical = canonicalRows[0]
  if (!canonical || !getDuplicateCanonicalResourceUrl(duplicate, canonical, [canonical])) {
    return null
  }

  const activeCityPeers = await sql<ResourceSlugPeer[]>`
    SELECT id, name, city, state, status
    FROM resources
    WHERE status = 'active'
      AND LOWER(city) = LOWER(${canonical.city})
      AND UPPER(state) = UPPER(${canonical.state})
  `

  return getDuplicateCanonicalResourceUrl(duplicate, canonical, activeCityPeers)
}
