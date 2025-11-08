/**
 * Resource Deduplication Utilities
 *
 * Prevents duplicate resources from being imported by:
 * 1. Exact address matching (same street, city, state)
 * 2. Fuzzy name matching for organization identification
 * 3. Auto-detection of parent-child relationships
 */

import { createClient } from '@/lib/supabase/server'
import type { Resource } from '@/lib/types/database'

export interface DeduplicationResult {
  isDuplicate: boolean
  existingResource?: Resource
  matchType?: 'exact_address' | 'fuzzy_name' | 'none'
  similarity?: number
  suggestedAction?: 'skip' | 'update' | 'create_child' | 'merge'
}

export interface ImportResource {
  name: string
  address: string
  city?: string | null
  state?: string | null
  zip?: string | null
  [key: string]: unknown
}

/**
 * Check if a resource already exists in the database
 * Returns deduplication result with suggested action
 */
export async function checkForDuplicate(resource: ImportResource): Promise<DeduplicationResult> {
  const supabase = await createClient()

  // Strategy 1: Exact address match (most reliable)
  const exactMatch = await findExactAddressMatch(resource, supabase)
  if (exactMatch) {
    return {
      isDuplicate: true,
      existingResource: exactMatch,
      matchType: 'exact_address',
      similarity: 1.0,
      suggestedAction: determineSuggestedAction(resource, exactMatch),
    }
  }

  // Strategy 2: Fuzzy name + similar address (catches typos, formatting differences)
  const fuzzyMatch = await findFuzzyMatch(resource, supabase)
  if (fuzzyMatch && fuzzyMatch.similarity > 0.8) {
    return {
      isDuplicate: true,
      existingResource: fuzzyMatch.resource,
      matchType: 'fuzzy_name',
      similarity: fuzzyMatch.similarity,
      suggestedAction: determineSuggestedAction(resource, fuzzyMatch.resource),
    }
  }

  // No duplicate found
  return {
    isDuplicate: false,
    matchType: 'none',
    suggestedAction: 'skip', // Will be changed to 'create' by caller
  }
}

/**
 * Find exact address match
 * Normalizes address, city, state for comparison
 */
async function findExactAddressMatch(
  resource: ImportResource,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<Resource | null> {
  const { data } = await supabase
    .from('resources')
    .select('*')
    .ilike('address', resource.address.trim())
    .ilike('city', resource.city?.trim() || '')
    .ilike('state', resource.state?.trim() || '')
    .eq('status', 'active')
    .limit(1)
    .single()

  return data
}

/**
 * Find fuzzy match using pg_trgm similarity
 * Uses PostgreSQL's trigram similarity for fuzzy matching
 */
async function findFuzzyMatch(
  resource: ImportResource,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ resource: Resource; similarity: number } | null> {
  // Use raw SQL query to leverage pg_trgm similarity function
  const { data, error } = await supabase.rpc('find_similar_resources', {
    search_name: resource.name,
    search_address: resource.address,
    similarity_threshold: 0.7,
  })

  if (error || !data || data.length === 0) {
    return null
  }

  const match = data[0]
  return {
    resource: match,
    similarity: match.similarity_score || 0,
  }
}

/**
 * Determine suggested action based on resource comparison
 */
function determineSuggestedAction(
  newResource: ImportResource,
  existingResource: Resource
): 'skip' | 'update' | 'create_child' | 'merge' {
  // Same address, same name → Skip (exact duplicate)
  if (
    normalizeString(newResource.name) === normalizeString(existingResource.name) &&
    normalizeString(newResource.address) === normalizeString(existingResource.address)
  ) {
    return 'skip'
  }

  // Same address, different name → Might be same org, different program
  // Check if names are similar enough to be variants of same org
  const nameSimilarity = calculateStringSimilarity(
    normalizeString(newResource.name),
    normalizeString(existingResource.name)
  )

  if (nameSimilarity > 0.8) {
    // Very similar names, same address → Update existing
    return 'update'
  }

  // Somewhat similar names, same address → Create as child location
  if (nameSimilarity > 0.5) {
    return 'create_child'
  }

  // Different names, same/similar address → Needs manual review (merge)
  return 'merge'
}

/**
 * Batch check for duplicates
 * Optimized for bulk import operations
 */
export async function batchCheckForDuplicates(
  resources: ImportResource[]
): Promise<Map<number, DeduplicationResult>> {
  const results = new Map<number, DeduplicationResult>()

  // Process in parallel for performance
  await Promise.all(
    resources.map(async (resource, index) => {
      const result = await checkForDuplicate(resource)
      results.set(index, result)
    })
  )

  return results
}

/**
 * Auto-detect parent-child relationships
 * Groups resources by organization name (fuzzy matching)
 */
export async function detectParentChildRelationships(
  resources: ImportResource[]
): Promise<Map<string, ImportResource[]>> {
  const orgGroups = new Map<string, ImportResource[]>()

  // Group by normalized org name
  resources.forEach((resource) => {
    const orgName = extractOrgName(resource.name)
    const existing = orgGroups.get(orgName) || []
    existing.push(resource)
    orgGroups.set(orgName, existing)
  })

  // Filter out groups with only one resource
  const multiLocationOrgs = new Map<string, ImportResource[]>()
  orgGroups.forEach((group, orgName) => {
    if (group.length > 1) {
      multiLocationOrgs.set(orgName, group)
    }
  })

  return multiLocationOrgs
}

/**
 * Extract organization name from full name
 * Removes location suffixes like "- Oakland Office", "(SF Location)"
 */
function extractOrgName(fullName: string): string {
  return fullName
    .replace(
      /\s*(-|–|—|\()\s*(Oakland|San Francisco|Berkeley|SF|East Bay|Bay Area)?\s*(Office|Location|Site|Center|Branch|Program)?\s*\)?$/i,
      ''
    )
    .trim()
}

/**
 * Normalize string for comparison
 */
function normalizeString(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

/**
 * Calculate string similarity (simple version, 0-1 scale)
 * Uses Levenshtein-like approach
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1

  if (longer.length === 0) return 1.0

  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}
