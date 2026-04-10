#!/usr/bin/env node
/**
 * Batch Resource Enrichment Script
 *
 * Runs as a standalone background process on dc3-1.
 * Uses local Ollama models (Qwen3 Coder 30B) for free website data extraction.
 * Fetches resources missing hours/description/email, scrapes their websites,
 * and uses the local LLM to extract structured data.
 *
 * Usage:
 *   node scripts/batch-enrich.mjs [--limit N] [--model MODEL] [--dry-run] [--field hours|description|email] [--delay MS]
 *
 * Examples:
 *   node scripts/batch-enrich.mjs --limit 50                    # Enrich 50 resources
 *   node scripts/batch-enrich.mjs --model gemma4:26b-chat       # Use Gemma instead of Qwen
 *   node scripts/batch-enrich.mjs --dry-run --limit 5           # Preview without writing to DB
 *   node scripts/batch-enrich.mjs --field email --limit 100     # Only enrich email field
 *   node scripts/batch-enrich.mjs --delay 5000 --limit 500      # 5s delay between requests (gentle on CPU)
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

// ── Parse args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (flag) => {
  const idx = args.indexOf(flag)
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null
}
const hasFlag = (flag) => args.includes(flag)

const LIMIT = parseInt(getArg('--limit') || '20', 10)
const MODEL = getArg('--model') || 'qwen3-coder:30b'
const DRY_RUN = hasFlag('--dry-run')
const FIELD_FILTER = getArg('--field') // hours, description, email, or null for all
const DELAY_MS = parseInt(getArg('--delay') || '2000', 10) // ms between requests (default 2s, gentle on CPU)
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Load DATABASE_URL from .env.local ───────────────────────────────────────
function loadDatabaseUrl() {
  try {
    const envFile = readFileSync(resolve(projectRoot, '.env.local'), 'utf-8')
    for (const line of envFile.split('\n')) {
      if (line.startsWith('DATABASE_URL=')) {
        return line.slice('DATABASE_URL='.length).trim()
      }
    }
  } catch {
    /* ignore */
  }
  return process.env.DATABASE_URL
}

const DATABASE_URL = loadDatabaseUrl()
if (!DATABASE_URL) {
  console.error('ERROR: No DATABASE_URL found in .env.local or environment')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: DATABASE_URL })

// ── Ollama helpers ──────────────────────────────────────────────────────────
async function ollamaChat(messages, options = {}) {
  const model = options.model || MODEL
  const resp = await fetch(`${OLLAMA_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      max_tokens: options.maxTokens || 512,
      stream: false,
    }),
    signal: AbortSignal.timeout(options.timeoutMs || 120_000),
  })

  if (!resp.ok) throw new Error(`Ollama ${resp.status}: ${await resp.text()}`)
  const data = await resp.json()
  return data.choices?.[0]?.message?.content || ''
}

function parseJson(text) {
  const m = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/)
  const raw = m ? m[1] : text.trim()
  return JSON.parse(raw)
}

// ── Website fetching ────────────────────────────────────────────────────────

/** Fetch a URL and return { html, text } or null on failure */
async function fetchPage(url) {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'ReentryMap-Enrichment/1.0' },
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
    })
    if (!resp.ok) return null

    const html = await resp.text()
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return { html, text: text.slice(0, 5000) }
  } catch {
    return null
  }
}

/**
 * Extract internal navigation links from HTML that are likely to contain
 * contact info, hours, or about content. Only returns same-domain links.
 */
function extractContactLinks(html, baseUrl) {
  // Match href values from <a> tags
  const hrefPattern = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi
  // Match URL paths and short link text (< 40 chars) to avoid matching blog posts
  const contactKeywords = /contact|about|hours|location|get-?help|connect|reach|find-?us|visit/i
  const serviceKeywords = /^(services|programs|get-?involved|info|resources)$/i
  const found = new Map() // url -> link text

  let match
  while ((match = hrefPattern.exec(html)) !== null) {
    const href = match[1].trim()
    const linkText = match[2]
      .replace(/<[^>]+>/g, '')
      .trim()
      .toLowerCase()

    // Skip external links, mailto, tel, anchors, files
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) continue
    if (/\.(pdf|jpg|png|gif|zip|doc)$/i.test(href)) continue

    // Build absolute URL
    let absoluteUrl
    try {
      absoluteUrl = new URL(href, baseUrl).href
    } catch {
      continue
    }

    // Must be same domain
    if (!absoluteUrl.startsWith(baseUrl.replace(/\/$/, ''))) continue

    // Check if the URL path or link text suggests contact/about/hours content
    // Only match short link text to avoid blog post titles that contain keywords
    const path = absoluteUrl.replace(baseUrl, '').toLowerCase()
    const isShortText = linkText.length < 40
    if (
      contactKeywords.test(path) ||
      (isShortText && contactKeywords.test(linkText)) ||
      serviceKeywords.test(linkText.trim())
    ) {
      // Assign priority: contact/hours pages first (most likely to have email/hours)
      const isContactPage = /contact|hours|reach|find-?us|get-?help/i.test(path + ' ' + linkText)
      const priority = isContactPage ? 0 : 1
      found.set(absoluteUrl.replace(/\/$/, ''), { text: linkText || path, priority })
    }
  }

  // Sort by priority (contact pages first) then return URLs only
  return [...found.entries()]
    .sort((a, b) => a[1].priority - b[1].priority)
    .map(([url]) => url)
    .slice(0, 4)
}

/**
 * Multi-page fetch: crawl the stored URL, then discover real navigation
 * links from the homepage that are likely to contain contact/about/hours.
 * Only fetches pages that actually exist on the site.
 */
async function fetchWebsiteText(url) {
  const baseMatch = url.match(/^(https?:\/\/[^/]+)/)
  if (!baseMatch) {
    const page = await fetchPage(url)
    return page?.text || null
  }
  const base = baseMatch[1]

  const sections = []
  const visited = new Set()

  // 1. Always fetch the stored URL first
  const storedPage = await fetchPage(url)
  if (storedPage?.text && storedPage.text.length > 50) {
    const path = url.replace(base, '').replace(/\/$/, '') || '/'
    sections.push(`[Page: ${path}]\n${storedPage.text}`)
    visited.add(url.replace(/\/$/, ''))
  }

  // 2. Fetch homepage to discover nav links (but DON'T add homepage content yet —
  //    contact/about pages are more valuable and should get priority in the char budget)
  const homeUrl = base.replace(/\/$/, '')
  let homePageData = null
  if (!visited.has(homeUrl)) {
    homePageData = await fetchPage(base)
    visited.add(homeUrl) // Mark visited to avoid re-fetching
  }

  // Use stored page or homepage for link discovery
  const discoveryHtml = homePageData?.html || storedPage?.html
  const discoveredLinks = discoveryHtml ? extractContactLinks(discoveryHtml, base) : []

  // 3. Fetch discovered pages (contact pages sorted first by extractContactLinks)
  for (const linkUrl of discoveredLinks) {
    const normalized = linkUrl.replace(/\/$/, '')
    if (visited.has(normalized)) continue
    if (sections.reduce((sum, s) => sum + s.length, 0) > 8000) break

    const linkPage = await fetchPage(linkUrl)
    if (linkPage?.text && linkPage.text.length > 50) {
      const linkPath = normalized.replace(base.replace(/\/$/, ''), '') || '/'
      sections.push(`[Page: ${linkPath}]\n${linkPage.text}`)
      visited.add(normalized)
    }
  }

  // 4. Probe /contact and /contact-us if nav discovery didn't find a contact page
  const hasContactPage = [...visited].some((u) => /\/contact/.test(u))
  if (!hasContactPage) {
    for (const probeUrl of [base + '/contact', base + '/contact-us']) {
      const normalized = probeUrl.replace(/\/$/, '')
      if (visited.has(normalized)) continue
      if (sections.reduce((sum, s) => sum + s.length, 0) > 8000) break

      const probePage = await fetchPage(probeUrl)
      if (probePage?.text && probePage.text.length > 50) {
        const probePath = normalized.replace(base.replace(/\/$/, ''), '') || '/'
        sections.push(`[Page: ${probePath} (probed)]\n${probePage.text}`)
        visited.add(normalized)
        break // Only need one contact page
      }
    }
  }

  // 5. Add homepage content last (only if we still have budget — it's mostly marketing copy)
  if (homePageData?.text && homePageData.text.length > 50) {
    const currentSize = sections.reduce((sum, s) => sum + s.length, 0)
    if (currentSize < 7000) {
      // Trim homepage to fit remaining budget
      const remainingBudget = Math.max(9000 - currentSize, 1000)
      sections.push(`[Page: /]\n${homePageData.text.slice(0, remainingBudget)}`)
    }
  }

  if (sections.length === 0) return null
  return sections.join('\n\n').slice(0, 10000)
}

// ── Build the enrichment query based on field filter ────────────────────────
function buildQuery(_limit) {
  const conditions = []

  if (FIELD_FILTER === 'hours') {
    conditions.push("(hours IS NULL OR hours::text = 'null' OR hours::text = '{}')")
  } else if (FIELD_FILTER === 'description') {
    conditions.push("(description IS NULL OR description = '')")
  } else if (FIELD_FILTER === 'email') {
    conditions.push("(email IS NULL OR email = '')")
  } else {
    // Default: missing any of the key fields
    conditions.push(
      "(hours IS NULL OR hours::text = 'null' OR hours::text = '{}' OR description IS NULL OR description = '' OR email IS NULL OR email = '')"
    )
  }

  return `
    SELECT id, name, address, city, state, website, phone, email,
           description, hours, services_offered
    FROM resources
    WHERE status = 'active'
      AND website IS NOT NULL AND website != ''
      AND ${conditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $1
  `
}

// ── Build the extraction prompt ─────────────────────────────────────────────
function buildPrompt(resource, websiteText) {
  return `You are analyzing a reentry services organization's website to extract structured data for a resource directory.

Organization: ${resource.name}
City/State: ${resource.city || 'unknown'}, ${resource.state || 'unknown'}
Current phone on file: ${resource.phone || 'none'}
Current email on file: ${resource.email || 'none'}
Current description on file: ${resource.description || 'none'}

Below is text extracted from multiple pages of this organization's website. Each section is labeled with the page path.

${websiteText}

Extract information from ANY of the pages above. Look carefully for:
- Email addresses (often on /contact pages or in page footers)
- Operating hours (often on /contact, /about, or homepage)
- Services offered (often on homepage or /about)
- A clear description if the current one is missing or too short

Extract ONLY information that is clearly stated. Do not guess or make up data.

Respond with ONLY valid JSON:
{
  "hours": "Operating hours string, e.g. 'Monday-Friday 9am-5pm', or null if not found",
  "description": "2-3 sentence description of what this organization does for people reentering society, or null if not clearly stated",
  "email": "Contact email address found on the website, or null if not found",
  "services": ["list", "of", "specific", "services"]
}`
}

// ── Agent logging (writes to ai_agent_logs so admin dashboard sees runs) ────
async function createAgentLog() {
  const { rows } = await pool.query(
    `INSERT INTO ai_agent_logs (agent_type, action, input, success)
     VALUES ('enrichment', 'batch_run', $1::jsonb, NULL)
     RETURNING id`,
    [
      JSON.stringify({
        model: MODEL,
        limit: LIMIT,
        field_filter: FIELD_FILTER || 'all',
        dry_run: DRY_RUN,
      }),
    ]
  )
  return rows[0]?.id
}

async function updateAgentLog(logId, { success, enriched, skipped, failed, durationMs, error }) {
  if (!logId) return
  await pool.query(
    `UPDATE ai_agent_logs SET
       success = $1,
       output = $2::jsonb,
       error_message = $3,
       duration_ms = $4
     WHERE id = $5`,
    [
      success,
      JSON.stringify({
        status: success ? 'success' : 'failure',
        resources_processed: enriched + skipped + failed,
        resources_updated: enriched,
        skipped,
        failed,
        model: MODEL,
        dry_run: DRY_RUN,
      }),
      error || null,
      durationMs,
      logId,
    ]
  )
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  // Health check
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(5000) })
    const data = await resp.json()
    const models = data.models?.map((m) => m.name) || []
    const found = models.some((m) => m === MODEL || m.startsWith(MODEL.split(':')[0]))
    if (!found) {
      console.error(`Model ${MODEL} not found. Available: ${models.join(', ')}`)
      process.exit(1)
    }
    console.log(`Ollama OK — using ${MODEL}`)
  } catch (err) {
    console.error(`Ollama not reachable at ${OLLAMA_BASE}: ${err.message}`)
    process.exit(1)
  }

  // Create agent log entry (visible on admin dashboard)
  const logId = DRY_RUN ? null : await createAgentLog().catch(() => null)

  // Fetch resources needing enrichment
  const query = buildQuery(LIMIT)
  const { rows: resources } = await pool.query(query, [LIMIT])

  console.log(
    `Found ${resources.length} resources needing enrichment${FIELD_FILTER ? ` (field: ${FIELD_FILTER})` : ''}`
  )
  if (resources.length === 0) {
    console.log('Nothing to do.')
    if (logId)
      await updateAgentLog(logId, {
        success: true,
        enriched: 0,
        skipped: 0,
        failed: 0,
        durationMs: 0,
      })
    await pool.end()
    return
  }

  let enriched = 0
  let failed = 0
  let skipped = 0
  const startTime = Date.now()

  for (let i = 0; i < resources.length; i++) {
    const resource = resources[i]
    const progress = `[${i + 1}/${resources.length}]`

    // Fetch website
    const websiteText = await fetchWebsiteText(resource.website)
    if (!websiteText || websiteText.length < 50) {
      console.log(`${progress} UNREACHABLE ${resource.name} — website down or too little content`)
      skipped++
      continue
    }

    // Extract with local model
    try {
      const prompt = buildPrompt(resource, websiteText)
      const rawResponse = await ollamaChat(
        [
          {
            role: 'system',
            content:
              'You extract structured data from website content. Respond with ONLY valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        { maxTokens: 512, timeoutMs: 60_000 }
      )

      const extracted = parseJson(rawResponse)

      // Build update fields
      const updates = []
      const values = []
      let paramIdx = 1

      if (extracted.hours && !resource.hours) {
        updates.push(`hours = $${paramIdx++}::jsonb`)
        values.push(JSON.stringify(extracted.hours))
      }
      if (extracted.description && (!resource.description || resource.description.length < 20)) {
        updates.push(`description = $${paramIdx++}`)
        values.push(extracted.description)
      }
      if (extracted.email && !resource.email) {
        // Basic email validation
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(extracted.email)) {
          updates.push(`email = $${paramIdx++}`)
          values.push(extracted.email)
        }
      }
      if (extracted.services?.length && !resource.services_offered?.length) {
        updates.push(`services_offered = $${paramIdx++}::text[]`)
        values.push(extracted.services)
      }

      if (updates.length === 0) {
        // Distinguish: did the model find data we already have, or find nothing at all?
        const modelFoundSomething =
          extracted.hours || extracted.description || extracted.email || extracted.services?.length
        if (modelFoundSomething) {
          console.log(`${progress} CURRENT ${resource.name} — analyzed, already has this data`)
        } else {
          console.log(
            `${progress} NO_DATA ${resource.name} — analyzed website, no structured data found`
          )
        }
        skipped++
        continue
      }

      // Mark as enriched
      updates.push(`ai_enriched = true`)
      updates.push(`updated_at = NOW()`)

      if (DRY_RUN) {
        console.log(`${progress} DRY-RUN ${resource.name} — would update: ${updates.join(', ')}`)
        console.log(`  Data: ${JSON.stringify(extracted, null, 2).substring(0, 200)}`)
        enriched++
        continue
      }

      // Write to DB
      values.push(resource.id)
      const updateQuery = `UPDATE resources SET ${updates.join(', ')} WHERE id = $${paramIdx}`
      await pool.query(updateQuery, values)
      enriched++

      const fields = updates
        .filter((u) => !u.startsWith('ai_enriched') && !u.startsWith('updated_at'))
        .map((u) => u.split(' = ')[0])
      console.log(`${progress} OK ${resource.name} — enriched: ${fields.join(', ')}`)
    } catch (err) {
      console.log(`${progress} FAIL ${resource.name} — ${err.message?.substring(0, 100)}`)
      failed++
    }

    // Rate limit: pause between requests to keep server load reasonable
    if (DELAY_MS > 0 && i < resources.length - 1) {
      await sleep(DELAY_MS)
    }
  }

  const durationMs = Date.now() - startTime
  const elapsed = (durationMs / 1000).toFixed(1)
  console.log(
    `\nDone in ${elapsed}s — Enriched: ${enriched}, Skipped: ${skipped}, Failed: ${failed}`
  )

  // Update agent log for admin dashboard visibility
  if (logId) {
    await updateAgentLog(logId, {
      success: failed === 0,
      enriched,
      skipped,
      failed,
      durationMs,
      error: failed > 0 ? `${failed} resource(s) failed enrichment` : null,
    }).catch((err) => console.error('Failed to update agent log:', err.message))
  }

  await pool.end()
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
