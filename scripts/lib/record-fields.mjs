/**
 * Record-related listing fields (B085): pure rules shared by the backfill and reviews.
 *
 * - record_restrictions: only restrictions a provider's own page states, shown in its words.
 * - reentry_focused: true only when the page says the program is specifically for people
 *   with records. Silence never changes either field.
 */

// Words that make a passage worth reading; deterministic prefilter only (no judgment).
// Bare "record(s)", "registered" and "registration" are left out: medical records, registered
// nurses and event registration would send most pages to the model for nothing.
export const RECORD_PATTERN =
  /\b(criminal|felon(y|ies|s)?|convict(ed|ion|ions)?|offen(se|ses|der|ders)|sex[- ]offenders?|registered sex|offender registry|registr(y|ant|ants)|background[- ]checks?|parole(e|es)?|probation(er|ers)?|incarcerat(ed|ion)|prisons?|jails?|justice[- ]involved|re-?entry|returning citizens?)\b/i

const WINDOW = 350
const MAX_EXCERPT = 5000

export function normalizeText(text) {
  return String(text || '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Merged text windows around record-related words; [] when the page never mentions them. */
export function findRecordMentions(text, { window = WINDOW, max = MAX_EXCERPT } = {}) {
  const clean = normalizeText(text)
  const global = new RegExp(RECORD_PATTERN.source, 'gi')
  const spans = []
  for (const match of clean.matchAll(global)) {
    const start = Math.max(0, match.index - window)
    const end = Math.min(clean.length, match.index + match[0].length + window)
    const last = spans[spans.length - 1]
    if (last && start <= last[1]) last[1] = Math.max(last[1], end)
    else spans.push([start, end])
  }
  const out = []
  let used = 0
  for (const [start, end] of spans) {
    if (used >= max) break
    const piece = clean.slice(start, Math.min(end, start + (max - used)))
    out.push(piece)
    used += piece.length
  }
  return out
}

/** True only for a quote of real length that appears verbatim (whitespace-insensitive). */
export function groundQuote(quote, pageText) {
  const q = normalizeText(quote).toLowerCase()
  if (q.length < 15 || q.length > 400) return false
  return normalizeText(pageText).toLowerCase().includes(q)
}

/** The provider's own words, deduplicated; at most two quotes. */
export function buildRestrictionText(quotes) {
  const unique = [...new Set((quotes || []).map((q) => normalizeText(q)).filter(Boolean))].slice(
    0,
    2
  )
  if (!unique.length) return null
  return `The provider’s website says: ${unique.map((q) => `“${q}”`).join(' ')}`
}

export function isReviewHeld(provenance) {
  return provenance?.coverage_review?.automation_hold === true
}

/**
 * Updates for an automated pass: fill empty fields only, never set the label false, and
 * return null for listings under an independent-review hold (propose, don't write).
 */
export function decideRecordUpdates(current, verified) {
  if (isReviewHeld(current?.provenance)) return null
  const updates = {}
  const text = buildRestrictionText(verified?.restrictions)
  if (
    text &&
    !(typeof current?.record_restrictions === 'string' && current.record_restrictions.trim())
  ) {
    updates.recordRestrictions = text
  }
  if (verified?.reentryFocused === true && current?.reentry_focused !== true) {
    updates.reentryFocused = true
  }
  return updates
}
