const DAY_MS = 24 * 60 * 60 * 1000

function normalizeProvenance(provenance) {
  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) {
    return {}
  }
  return provenance
}

function getAttemptDate(provenance) {
  const attemptedAt = provenance?.enrichment?.last_attempted_at
  if (!attemptedAt) return null

  const parsed = new Date(attemptedAt)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getCreatedDate(resource) {
  const parsed = new Date(resource.created_at)
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed
}

export function shouldRetryEnrichment(resource, { now = new Date(), retryDays = 30 } = {}) {
  const lastAttemptedAt = getAttemptDate(resource?.provenance)
  if (!lastAttemptedAt) return true

  return now.getTime() - lastAttemptedAt.getTime() >= retryDays * DAY_MS
}

export function selectResourcesForEnrichment(
  resources,
  { limit, now = new Date(), retryDays = 30 } = {}
) {
  return [...resources]
    .filter((resource) => shouldRetryEnrichment(resource, { now, retryDays }))
    .sort((left, right) => {
      const leftAttempt = getAttemptDate(left.provenance)
      const rightAttempt = getAttemptDate(right.provenance)

      if (!leftAttempt && !rightAttempt) {
        return getCreatedDate(left).getTime() - getCreatedDate(right).getTime()
      }
      if (!leftAttempt) return -1
      if (!rightAttempt) return 1

      if (leftAttempt.getTime() !== rightAttempt.getTime()) {
        return leftAttempt.getTime() - rightAttempt.getTime()
      }

      return getCreatedDate(left).getTime() - getCreatedDate(right).getTime()
    })
    .slice(0, limit)
}

export function buildEnrichmentProvenance(
  provenance,
  { attemptedAt, outcome, model, fieldFilter = 'all', updatedFields = [] }
) {
  const current = normalizeProvenance(provenance)
  const currentEnrichment = normalizeProvenance(current.enrichment)

  return {
    ...current,
    enrichment: {
      ...currentEnrichment,
      last_attempted_at: attemptedAt,
      last_outcome: outcome,
      model,
      field_filter: fieldFilter,
      ...(updatedFields.length ? { last_updated_fields: updatedFields } : {}),
    },
  }
}
