#!/usr/bin/env node
/**
 * Re-validate enrichment writes.
 *
 * For resources whose enrichment wrote an email or hours, re-fetch the website
 * and clear any value that is NOT grounded in the page text (per the same guard
 * used by batch-enrich). Conservative: if a site can't be fetched, the value is
 * left untouched (we don't clear what we can't verify).
 *
 * Usage: node scripts/revalidate-enrichment.mjs [--dry-run] [--since YYYY-MM-DD]
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { emailInSource, groundHours } from './lib/batch-enrich-validate.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const DRY_RUN = process.argv.includes('--dry-run')
const sinceIdx = process.argv.indexOf('--since')
const SINCE = sinceIdx >= 0 ? process.argv[sinceIdx + 1] : new Date().toISOString().slice(0, 10)

function loadDatabaseUrl() {
  try {
    const envFile = readFileSync(resolve(projectRoot, '.env.local'), 'utf-8')
    for (const line of envFile.split('\n')) {
      if (line.startsWith('DATABASE_URL=')) return line.slice('DATABASE_URL='.length).trim()
    }
  } catch {
    /* ignore */
  }
  return process.env.DATABASE_URL
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchText(url) {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReentryMapRevalidate/1.0)' },
      signal: AbortSignal.timeout(15000),
    })
    if (!resp.ok) return ''
    return htmlToText(await resp.text())
  } catch {
    return ''
  }
}

async function fetchSiteText(website) {
  const base = (website.match(/^https?:\/\/[^/]+/) || [])[0]
  if (!base) return await fetchText(website)
  const candidates = [
    website,
    base,
    base + '/contact',
    base + '/contact-us',
    base + '/about',
    base + '/about-us',
    base + '/hours',
    base + '/locations',
  ]
  const seen = new Set()
  let combined = ''
  for (const u of candidates) {
    const key = u.replace(/\/$/, '')
    if (seen.has(key)) continue
    seen.add(key)
    if (combined.length > 30000) break
    const t = await fetchText(u)
    if (t) combined += ' ' + t
  }
  return combined
}

async function main() {
  const DATABASE_URL = loadDatabaseUrl()
  if (!DATABASE_URL) {
    console.error('No DATABASE_URL')
    process.exit(1)
  }
  const pool = new pg.Pool({ connectionString: DATABASE_URL })

  const { rows } = await pool.query(
    `SELECT id, name, website, email, hours,
            provenance->'enrichment'->'last_updated_fields' AS fields
     FROM resources
     WHERE status='active'
       AND (provenance->'enrichment'->>'last_attempted_at')::timestamptz::date >= $1::date
       AND provenance->'enrichment'->>'last_outcome'='enriched'
       AND ( (provenance->'enrichment'->'last_updated_fields' ? 'email')
          OR (provenance->'enrichment'->'last_updated_fields' ? 'hours') )`,
    [SINCE]
  )

  console.log(
    `Re-validating ${rows.length} enriched records (since ${SINCE})${DRY_RUN ? ' [DRY-RUN]' : ''}\n`
  )

  let clearedEmail = 0
  let clearedHours = 0
  let keptEmail = 0
  let keptHours = 0
  let skipped = 0

  for (const r of rows) {
    const fields = Array.isArray(r.fields) ? r.fields : []
    const wroteEmail = fields.includes('email') && r.email
    const wroteHours = fields.includes('hours') && r.hours
    if (!r.website) {
      console.log(`SKIP ${r.name} — no website to verify against`)
      skipped++
      continue
    }
    const text = await fetchSiteText(r.website)
    if (!text || text.length < 50) {
      console.log(`SKIP ${r.name} — site unreachable, leaving values untouched`)
      skipped++
      continue
    }

    const sets = []
    const vals = []
    let p = 1

    if (wroteEmail) {
      if (emailInSource(r.email, text)) {
        keptEmail++
      } else {
        sets.push(`email = NULL`)
        clearedEmail++
        console.log(`CLEAR email ${r.name} — "${r.email}" not on site`)
      }
    }
    if (wroteHours) {
      const grounded = groundHours(r.hours, text)
      if (grounded && JSON.stringify(grounded) === JSON.stringify(r.hours)) {
        keptHours++
      } else if (grounded) {
        sets.push(`hours = $${p++}::jsonb`)
        vals.push(JSON.stringify(grounded))
        clearedHours++
        console.log(`TRIM hours ${r.name} — kept only grounded days`)
      } else {
        sets.push(`hours = NULL`)
        clearedHours++
        console.log(`CLEAR hours ${r.name} — not grounded on site`)
      }
    }

    if (sets.length && !DRY_RUN) {
      sets.push(`updated_at = NOW()`)
      vals.push(r.id)
      await pool.query(`UPDATE resources SET ${sets.join(', ')} WHERE id = $${p}`, vals)
    }
  }

  console.log(
    `\nDone. Email: ${keptEmail} kept, ${clearedEmail} cleared. Hours: ${keptHours} kept, ${clearedHours} cleared/trimmed. Skipped (unverifiable): ${skipped}.`
  )
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
