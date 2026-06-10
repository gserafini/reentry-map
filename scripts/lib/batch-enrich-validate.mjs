/**
 * batch-enrich-validate — Source-grounding guards for AI enrichment.
 *
 * The local LLM extracts structured data from fetched website text, but it can
 * guess plausible values that are not actually on the page (e.g. info@<domain>
 * emails, or "rounded"/invented hours). These pure functions reject any
 * extracted email or hours value that is not literally grounded in the fetched
 * page text, so only verifiable data is written to the database.
 *
 * Pure and side-effect-free: safe to import from both the enrichment script and
 * unit tests.
 */

function lower(s) {
  return String(s || '').toLowerCase()
}

/** True only if the email string literally appears in the page text. */
export function emailInSource(email, pageText) {
  if (!email || typeof email !== 'string') return false
  const e = email.trim().toLowerCase()
  if (!e.includes('@')) return false
  return lower(pageText).includes(e)
}

// Matches 5pm, 5 pm, 5:30 p.m., 11AM, 9:00 a.m., etc.
const TIME_RE = /\b(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?/gi

function canonTime(hour, min, ap) {
  const mm = min && min !== '00' ? `:${min}` : ''
  return `${hour}${mm}${ap.toLowerCase()}m`
}

/** Canonical time tokens (e.g. "5pm", "5:30pm", "11am") present in the text. */
export function sourceTimeTokens(pageText) {
  const tokens = new Set()
  const text = String(pageText || '')
  let m
  TIME_RE.lastIndex = 0
  while ((m = TIME_RE.exec(text)) !== null) {
    tokens.add(canonTime(parseInt(m[1], 10), m[2] || null, m[3]))
  }
  return tokens
}

/** Canonical time tokens contained in a single hours value like "9:00 AM - 5:00 PM". */
export function hourTokensFromValue(value) {
  const out = []
  const text = String(value || '')
  let m
  TIME_RE.lastIndex = 0
  while ((m = TIME_RE.exec(text)) !== null) {
    out.push(canonTime(parseInt(m[1], 10), m[2] || null, m[3]))
  }
  return out
}

/**
 * Filter extracted hours to only days whose open AND close times both appear in
 * the page text. Conservative on purpose: a day is dropped unless every time it
 * claims is grounded. Returns the filtered object, or null if nothing is grounded.
 */
export function groundHours(hours, pageText) {
  const present = sourceTimeTokens(pageText)
  if (present.size === 0) return null

  if (typeof hours === 'string') {
    const toks = hourTokensFromValue(hours)
    if (toks.length === 0) return null
    return toks.every((t) => present.has(t)) ? hours : null
  }

  if (hours && typeof hours === 'object') {
    const kept = {}
    for (const [day, value] of Object.entries(hours)) {
      const toks = hourTokensFromValue(value)
      if (toks.length === 0) continue
      if (toks.every((t) => present.has(t))) kept[day] = value
    }
    return Object.keys(kept).length ? kept : null
  }

  return null
}

/**
 * Validate an extracted object against the fetched page text. Removes any
 * email or hours that cannot be grounded in the source. Descriptions and
 * services pass through (generative/summarized fields).
 *
 * @returns {{ extracted: object, rejected: string[] }}
 */
export function groundExtraction(extracted, pageText) {
  const rejected = []
  const out = { ...(extracted || {}) }

  if (out.email && !emailInSource(out.email, pageText)) {
    rejected.push('email')
    delete out.email
  }

  if (out.hours) {
    const grounded = groundHours(out.hours, pageText)
    if (!grounded) {
      rejected.push('hours')
      delete out.hours
    } else {
      out.hours = grounded
    }
  }

  return { extracted: out, rejected }
}
