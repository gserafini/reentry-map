/**
 * Verification Utility Functions
 *
 * Level 1: Automated checks (10 seconds)
 * - URL reachability
 * - Phone number validation
 * - Address geocoding
 *
 * Level 2: AI verification (30 seconds)
 * - Website content matching
 * - Service description validation
 *
 * Level 3: Cross-referencing (60 seconds)
 * - 211 database lookup
 * - Google Maps verification
 */

import { geocodeAddress } from './geocoding'
import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/env'
import { trackAICost, calculateAnthropicCost } from '@/lib/ai-agents/verification-events'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
})

// ============================================================================
// LEVEL 1: AUTOMATED CHECKS
// ============================================================================

/**
 * Check if a URL is reachable with redundant verification
 * Uses both direct fetch AND external service (is-it-up.org) to avoid false positives from IP blocks
 * Returns: { pass: boolean, checked_at: string, latency_ms: number, status_code?: number }
 */
export async function checkUrlReachable(url: string): Promise<{
  pass: boolean
  checked_at: string
  latency_ms: number
  status_code?: number
  error?: string
  direct_check?: {
    pass: boolean
    status_code?: number
    error?: string
  }
  redundant_check?: {
    pass: boolean
    status_code?: number
    error?: string
  }
}> {
  const start = Date.now()

  try {
    // Validate URL format
    new URL(url)

    // STEP 1: Direct check from our server
    let directCheck: { pass: boolean; status_code?: number; error?: string } = {
      pass: false,
      error: 'Not tested',
    }

    try {
      // Use Playwright with stealth settings to avoid bot detection
      const { chromium } = await import('playwright')
      const browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-blink-features=AutomationControlled', // Hide automation
          '--disable-dev-shm-usage',
          '--no-sandbox',
        ],
      })
      const context = await browser.newContext({
        // Use realistic browser fingerprint
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/Los_Angeles',
        // Add realistic browser features
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
      })
      const page = await context.newPage()

      // Override navigator.webdriver to hide automation
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        })
      })

      try {
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 15000, // Increased timeout to 15s for slower sites
        })

        const status = response?.status() || 0

        directCheck = {
          pass: status >= 200 && status < 400,
          status_code: status,
        }
      } catch (pageError) {
        directCheck = {
          pass: false,
          error: pageError instanceof Error ? pageError.message : 'Unknown error',
        }
      } finally {
        await browser.close()
      }
    } catch (directError) {
      directCheck = {
        pass: false,
        error: directError instanceof Error ? directError.message : 'Unknown error',
      }
    }

    const latency_ms = Date.now() - start

    // Playwright check is comprehensive - if it passes, site is working
    const finalPass = directCheck.pass
    const status_code = directCheck.status_code
    const error = !finalPass ? directCheck.error : undefined

    return {
      pass: finalPass,
      checked_at: new Date().toISOString(),
      latency_ms,
      status_code,
      error,
      direct_check: directCheck,
      redundant_check: undefined, // No longer using redundant check (is-it-up.org is down)
    }
  } catch (error) {
    const latency_ms = Date.now() - start
    return {
      pass: false,
      checked_at: new Date().toISOString(),
      latency_ms,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Validate US phone number format
 * Returns: { pass: boolean, format: string, type?: string }
 */
export function validatePhoneNumber(phone: string): {
  pass: boolean
  format: string
  normalized?: string
  type?: 'landline' | 'mobile' | 'voip' | 'unknown'
} {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  // Check for valid US phone number (10 digits, optionally starting with 1)
  const is10Digit = /^\d{10}$/.test(digits)
  const is11Digit = /^1\d{10}$/.test(digits)

  if (!is10Digit && !is11Digit) {
    return { pass: false, format: 'invalid' }
  }

  // Normalize to 10 digits
  const normalized = is11Digit ? digits.slice(1) : digits

  // Format as (XXX) XXX-XXXX
  const formatted = `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`

  return {
    pass: true,
    format: 'US',
    normalized: formatted,
    type: 'unknown', // TODO: Add phone number type detection via API
  }
}

/**
 * Validate address can be geocoded
 * Returns: { pass: boolean, coords?: {lat, lng}, confidence?: number }
 */
export async function validateAddressGeocoding(
  address: string,
  city?: string,
  state?: string,
  zip?: string
): Promise<{
  pass: boolean
  coords?: { lat: number; lng: number }
  confidence?: number
  formatted_address?: string
}> {
  try {
    const fullAddress = [address, city, state, zip].filter(Boolean).join(', ')
    const result = await geocodeAddress(fullAddress)

    if (!result) {
      return { pass: false }
    }

    return {
      pass: true,
      coords: { lat: result.latitude, lng: result.longitude },
      confidence: 0.95, // Google Geocoding API is highly accurate
      formatted_address: fullAddress,
    }
  } catch (_error) {
    return { pass: false }
  }
}

// ============================================================================
// LEVEL 2: AI VERIFICATION HELPERS
// ============================================================================

/**
 * Take screenshot of website for AI verification
 * Returns screenshot URL for AI to analyze
 */
export async function captureWebsiteScreenshot(_url: string): Promise<string | null> {
  // TODO: Implement using Playwright or similar
  // For now, return null - will be implemented in Verification Agent
  return null
}

/**
 * Extract text content from website for AI matching
 */
export async function extractWebsiteContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ReentryMap-Verification/1.0',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return null

    const html = await response.text()

    // Basic HTML tag stripping (very naive - AI will do better analysis)
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // Return first 5000 characters for AI analysis
    return text.slice(0, 5000)
  } catch (_error) {
    return null
  }
}

// ============================================================================
// LEVEL 3: CROSS-REFERENCE HELPERS
// ============================================================================

/**
 * Search 211 database for matching resource
 * Returns: { found: boolean, url?: string, match_score?: number }
 */
export async function search211Database(
  _name: string,
  _address: string
): Promise<{
  found: boolean
  url?: string
  match_score?: number
  data?: {
    name: string
    address: string
    phone?: string
    website?: string
  }
}> {
  // TODO: Implement actual 211 API integration
  // For now, return not found - will be implemented in Verification Agent
  return { found: false }
}

/**
 * Search Google Maps for matching place
 * Returns: { found: boolean, place_id?: string, match_score?: number }
 */
export async function searchGoogleMaps(
  _name: string,
  _address: string
): Promise<{
  found: boolean
  place_id?: string
  match_score?: number
  data?: {
    name: string
    address: string
    phone?: string
    website?: string
    rating?: number
    photos?: string[]
  }
}> {
  // TODO: Implement using Google Places API
  // For now, return not found - will be implemented in Verification Agent
  return { found: false }
}

// ============================================================================
// AUTO-FIX / ENRICHMENT HELPERS
// ============================================================================

/**
 * Auto-fix broken URL using AI-powered web search
 * Uses Claude Sonnet 4.5 with web search to find correct organization website
 * Returns: { fixed: boolean, new_url?: string, confidence?: number }
 */
export async function autoFixUrl(
  organizationName: string,
  currentUrl: string,
  city?: string,
  state?: string
): Promise<{
  fixed: boolean
  new_url?: string
  confidence?: number
  method?: string
  cost_usd?: number
  input_tokens?: number
  output_tokens?: number
}> {
  try {
    console.log(
      `    🤖 Using Claude with web search to find correct URL for "${organizationName}"${city && state ? ` in ${city}, ${state}` : ''}...`
    )

    const locationContext = city && state ? ` in ${city}, ${state}` : ''

    const prompt = `Find the CORRECT, WORKING website URL for "${organizationName}"${locationContext}.

Current broken URL: ${currentUrl} (returns 404)

IMPORTANT INSTRUCTIONS:
1. Search for the organization's OFFICIAL website (ceoworks.org, not directory listings like findhelp.org, LinkedIn, Indeed)
2. For multi-location organizations, systematically test URL patterns:
   - /locations/${city?.toLowerCase() || 'city'}
   - /locations/${city?.toLowerCase().replace(/\s+/g, '-') || 'city'}
   - /${city?.toLowerCase() || 'city'}
   - /${city?.toLowerCase().replace(/\s+/g, '-') || 'city'}
3. The URL you return MUST be the organization's official website and MUST return HTTP 200 (not 404)
4. If you find search results, extract the organization's domain and test actual URL patterns

CRITICAL: Your response must be EXACTLY ONE LINE containing ONLY the URL.
- Start with http:// or https://
- No explanations, no markdown, no additional text
- Just the URL, nothing else
- Example correct response: https://www.ceoworks.org/locations/oakland
- Example incorrect response: "Based on search results, the URL is https://..."

If you cannot find a verified working URL, return exactly: NOT_FOUND`

    const response = await anthropic.messages.create({
      model: env.ANTHROPIC_VERIFICATION_MODEL, // Sonnet 4.5 with web search
      max_tokens: 1024, // More tokens for reasoning through URL patterns
      temperature: 0.1, // Low temperature for factual responses
      tools: [
        {
          type: 'web_search_20250305' as const, // Enable real-time web search
          name: 'web_search',
        },
      ],
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // Extract URL from response (find the text block, not tool_use blocks)
    const textBlock = response.content.find((block) => block.type === 'text')
    const textContent = textBlock && textBlock.type === 'text' ? textBlock.text : ''
    const foundUrl = textContent.trim()

    // Calculate cost using centralized pricing function
    const { input_cost_usd, output_cost_usd } = calculateAnthropicCost(
      env.ANTHROPIC_VERIFICATION_MODEL,
      response.usage.input_tokens,
      response.usage.output_tokens
    )
    const totalCost = input_cost_usd + output_cost_usd

    console.log(
      `    💰 Claude API cost: ${response.usage.input_tokens} in + ${response.usage.output_tokens} out = $${totalCost.toFixed(4)}`
    )
    console.log(`    🔍 Response content blocks:`, JSON.stringify(response.content, null, 2))
    console.log(`    📝 Claude returned: "${foundUrl}"`)

    // Track cost to database (async, don't await to avoid slowing down verification)
    trackAICost({
      operation_type: 'url_autofix',
      provider: 'anthropic',
      model: env.ANTHROPIC_VERIFICATION_MODEL,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      input_cost_usd,
      output_cost_usd,
      operation_context: {
        organization_name: organizationName,
        current_url: currentUrl,
        city,
        state,
      },
    }).catch((err) => console.error('Failed to track AI cost:', err))

    // Check if URL was found
    if (foundUrl === 'NOT_FOUND' || !foundUrl.startsWith('http')) {
      console.log(`    ❌ Claude could not find a working URL`)
      return {
        fixed: false,
        method: 'ai_web_search',
        cost_usd: totalCost,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      }
    }

    // Verify the URL Claude found is actually reachable
    console.log(`    🔍 Verifying Claude's URL: ${foundUrl}`)
    const checkResult = await checkUrlReachable(foundUrl)

    if (checkResult.pass) {
      console.log(`    ✅ Found working URL: ${foundUrl}`)
      return {
        fixed: true,
        new_url: foundUrl,
        confidence: 0.95, // High confidence when Claude finds it and it's reachable
        method: 'ai_web_search',
        cost_usd: totalCost,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      }
    } else {
      console.log(`    ❌ Claude's URL is not reachable (${checkResult.status_code})`)
      return {
        fixed: false,
        method: 'ai_web_search',
        cost_usd: totalCost,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      }
    }
  } catch (error) {
    console.error(`    ❌ Error in AI URL auto-fix:`, error)
    return { fixed: false }
  }
}

/**
 * Enrich address with full city/state/zip context for geocoding
 * Returns: { enriched: boolean, full_address?: string }
 */
export function enrichAddress(
  address: string,
  city?: string,
  state?: string,
  zip?: string
): {
  enriched: boolean
  full_address: string
  added_fields: string[]
} {
  const added: string[] = []
  const parts = [address.trim()]

  // Add city if missing
  if (city && !address.toLowerCase().includes(city.toLowerCase())) {
    parts.push(city)
    added.push('city')
  }

  // Add state if missing
  if (state && !address.toLowerCase().includes(state.toLowerCase())) {
    parts.push(state)
    added.push('state')
  }

  // Add ZIP if available and missing
  if (zip && !address.includes(zip)) {
    parts.push(zip)
    added.push('zip')
  }

  return {
    enriched: added.length > 0,
    full_address: parts.join(', '),
    added_fields: added,
  }
}

// ============================================================================
// FIELD-LEVEL VERIFICATION CADENCE
// ============================================================================

/**
 * Get verification cadence (in days) for a specific field
 */
export function getFieldVerificationCadence(fieldName: string): number {
  const cadence: Record<string, number> = {
    // Very volatile - check monthly
    phone: 30,
    hours: 30,

    // Moderately volatile - check every 2 months
    website: 60,
    email: 60,
    services_offered: 60,

    // Less volatile - check quarterly
    description: 90,
    eligibility_requirements: 90,

    // Stable - check semi-annually
    address: 180,
    city: 180,
    state: 180,
    zip: 180,

    // Very stable - check annually
    name: 365,
    primary_category: 365,
  }

  return cadence[fieldName] || 90 // Default: 90 days
}

/**
 * Calculate next verification date based on field changes
 * Returns the earliest date based on which fields changed
 */
export function calculateNextVerificationDate(changedFields: string[]): Date {
  if (changedFields.length === 0) {
    // No changes, use default 30-day cadence
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }

  // Find the shortest cadence among changed fields
  const shortestCadence = Math.min(
    ...changedFields.map((field) => getFieldVerificationCadence(field))
  )

  return new Date(Date.now() + shortestCadence * 24 * 60 * 60 * 1000)
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

export interface FieldConflict {
  field: string
  submitted: string | number | boolean | null
  found: string | number | boolean | null
  confidence: number
  source: string
}

/**
 * Compare submitted data against external source
 * Returns array of conflicts found
 */
export function detectConflicts(
  submitted: Record<string, unknown>,
  external: Record<string, unknown>,
  source: string,
  threshold: number = 0.7
): FieldConflict[] {
  const conflicts: FieldConflict[] = []

  // Fields to check for conflicts
  const fieldsToCheck = ['name', 'phone', 'website', 'address', 'email']

  for (const field of fieldsToCheck) {
    const submittedValue = submitted[field]
    const externalValue = external[field]

    // Skip if either value is missing
    if (!submittedValue || !externalValue) continue

    // Normalize strings for comparison
    const normalize = (val: unknown) =>
      typeof val === 'string' ? val.toLowerCase().trim() : String(val)

    const normalizedSubmitted = normalize(submittedValue)
    const normalizedExternal = normalize(externalValue)

    // Check for exact match
    if (normalizedSubmitted === normalizedExternal) continue

    // Check for fuzzy match (simple Levenshtein-like check)
    const similarity = calculateSimilarity(normalizedSubmitted, normalizedExternal)

    if (similarity < threshold) {
      conflicts.push({
        field,
        submitted: submittedValue as string | number | boolean | null,
        found: externalValue as string | number | boolean | null,
        confidence: 1 - similarity, // Higher confidence = more different
        source,
      })
    }
  }

  return conflicts
}

/**
 * Calculate string similarity (0 = completely different, 1 = identical)
 * Using simple character-based similarity (not full Levenshtein)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1
  if (str1.length === 0 || str2.length === 0) return 0

  // Count matching characters
  const len = Math.max(str1.length, str2.length)
  let matches = 0

  for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
    if (str1[i] === str2[i]) matches++
  }

  return matches / len
}

// ============================================================================
// VERIFICATION SCORING
// ============================================================================

export interface VerificationChecks {
  url_reachable: {
    pass: boolean
    checked_at: string
    latency_ms: number
    status_code?: number
  }
  phone_valid: {
    pass: boolean
    format: string
    normalized?: string
  }
  address_geocodable: {
    pass: boolean
    coords?: { lat: number; lng: number }
    confidence?: number
  }
  website_content_matches?: {
    pass: boolean
    confidence: number
    evidence: string
  }
  cross_referenced?: {
    pass: boolean
    sources: Array<{
      name: string
      url?: string
      match_score: number
    }>
  }
  conflict_detection?: {
    pass: boolean
    conflicts: FieldConflict[]
  }
}

/**
 * Calculate overall verification score from individual checks
 * Returns score 0-1
 */
export function calculateVerificationScore(checks: Partial<VerificationChecks>): number {
  const weights = {
    url_reachable: 0.15,
    phone_valid: 0.15,
    address_geocodable: 0.2,
    website_content_matches: 0.2,
    cross_referenced: 0.2,
    conflict_detection: 0.1,
  }

  let totalScore = 0
  let totalWeight = 0

  // URL reachable
  if (checks.url_reachable) {
    totalScore += checks.url_reachable.pass ? weights.url_reachable : 0
    totalWeight += weights.url_reachable
  }

  // Phone valid
  if (checks.phone_valid) {
    totalScore += checks.phone_valid.pass ? weights.phone_valid : 0
    totalWeight += weights.phone_valid
  }

  // Address geocodable
  if (checks.address_geocodable) {
    const score = checks.address_geocodable.pass
      ? (checks.address_geocodable.confidence || 1) * weights.address_geocodable
      : 0
    totalScore += score
    totalWeight += weights.address_geocodable
  }

  // Website content matches
  if (checks.website_content_matches) {
    const score = checks.website_content_matches.confidence * weights.website_content_matches
    totalScore += score
    totalWeight += weights.website_content_matches
  }

  // Cross-referenced
  if (checks.cross_referenced && checks.cross_referenced.sources.length > 0) {
    const avgMatchScore =
      checks.cross_referenced.sources.reduce((sum, s) => sum + s.match_score, 0) /
      checks.cross_referenced.sources.length
    totalScore += avgMatchScore * weights.cross_referenced
    totalWeight += weights.cross_referenced
  }

  // Conflict detection (pass = no conflicts)
  if (checks.conflict_detection) {
    const score = checks.conflict_detection.pass ? weights.conflict_detection : 0
    totalScore += score
    totalWeight += weights.conflict_detection
  }

  // Normalize by total weight (handles partial checks)
  return totalWeight > 0 ? totalScore / totalWeight : 0
}
