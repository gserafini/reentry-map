function toCount(value) {
  return Number(value || 0)
}

function formatRate(count, total) {
  if (!total) return '0.0%'
  return `${((count / total) * 100).toFixed(1)}%`
}

export function buildResourceStatusReport(raw, { batchSize = 500 } = {}) {
  const activeTotal = toCount(raw.active_total)
  const verifiedTotal = toCount(raw.verified_total)
  const aiEnriched = toCount(raw.ai_enriched)
  const needsEnrichment = toCount(raw.needs_enrichment)

  return {
    overview: {
      active_total: activeTotal,
      verified_total: verifiedTotal,
      verified_rate: formatRate(verifiedTotal, activeTotal),
      ai_enriched: aiEnriched,
      ai_enriched_rate: formatRate(aiEnriched, activeTotal),
    },
    verification: {
      pending: toCount(raw.verification_pending),
      needs_review: toCount(raw.verification_needs_review),
      failed: toCount(raw.verification_failed),
      human_review_required: toCount(raw.human_review_required),
      never_verified: toCount(raw.never_verified),
      stale_records: toCount(raw.stale_records),
      due_queue: toCount(raw.due_verification_queue),
    },
    enrichment: {
      needs_enrichment: needsEnrichment,
      remaining_batches: needsEnrichment > 0 ? Math.ceil(needsEnrichment / batchSize) : 0,
      final_batch_size: needsEnrichment > 0 ? needsEnrichment % batchSize || batchSize : 0,
      missing_email: toCount(raw.missing_email),
      missing_hours: toCount(raw.missing_hours),
    },
    data_quality: {
      missing_website: toCount(raw.missing_website),
      ungeocoded: toCount(raw.ungeocoded),
    },
  }
}
