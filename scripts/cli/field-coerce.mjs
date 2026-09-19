/**
 * field-coerce — Coerce raw CLI `field=value` strings into the proper JS types
 * the admin API expects, so `resource update` can set array and JSON columns
 * (not just scalar strings).
 *
 * Pure, side-effect-free: safe to import from both the CLI and unit tests.
 */

// text[] columns in the resources table
export const ARRAY_FIELDS = new Set([
  'categories',
  'services_offered',
  'languages',
  'tags',
  'accessibility_features',
  'required_documents',
])

// jsonb columns
export const JSON_FIELDS = new Set(['hours', 'service_area'])

// numeric columns
export const NUMBER_FIELDS = new Set(['latitude', 'longitude'])

// boolean columns
export const BOOLEAN_FIELDS = new Set(['verified'])

/**
 * Coerce one `field=value` raw string into the correct type.
 *
 * - Array fields accept comma-separated values ("a,b,c") or a JSON array.
 * - JSON fields accept a JSON object string.
 * - Number/boolean fields are parsed from their string form.
 * - Everything else passes through unchanged.
 *
 * @param {string} field   snake_case field name as sent to the API
 * @param {string} rawValue  the raw string after the first "="
 */
export function coerceUpdateValue(field, rawValue) {
  if (ARRAY_FIELDS.has(field)) {
    const trimmed = rawValue.trim()
    if (trimmed === '') return []
    if (trimmed.startsWith('[')) {
      let parsed
      try {
        parsed = JSON.parse(trimmed)
      } catch {
        throw new Error(`Field "${field}" looks like JSON but failed to parse: ${rawValue}`)
      }
      if (!Array.isArray(parsed)) {
        throw new Error(`Field "${field}" expects an array`)
      }
      return parsed.map((v) => String(v).trim()).filter(Boolean)
    }
    return trimmed
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  }

  if (JSON_FIELDS.has(field)) {
    try {
      return JSON.parse(rawValue)
    } catch {
      throw new Error(`Field "${field}" expects valid JSON, got: ${rawValue}`)
    }
  }

  if (NUMBER_FIELDS.has(field)) {
    const n = Number(rawValue)
    if (Number.isNaN(n)) {
      throw new Error(`Field "${field}" expects a number, got: ${rawValue}`)
    }
    return n
  }

  if (BOOLEAN_FIELDS.has(field)) {
    return rawValue === 'true' || rawValue === '1'
  }

  return rawValue
}
