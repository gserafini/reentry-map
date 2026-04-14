import { describe, expect, it } from 'vitest'

import { buildResourceStatusReport } from '../../scripts/lib/resource-status-report.mjs'

describe('resource status report', () => {
  it('derives percentages and enrichment batch math from raw counts', () => {
    const report = buildResourceStatusReport(
      {
        active_total: 3078,
        verified_total: 2325,
        verification_pending: 754,
        verification_needs_review: 7,
        verification_failed: 2,
        human_review_required: 7,
        never_verified: 2871,
        stale_records: 207,
        due_verification_queue: 2835,
        ai_enriched: 384,
        needs_enrichment: 2553,
        missing_website: 243,
        missing_email: 1684,
        missing_hours: 2447,
        ungeocoded: 6,
      },
      { batchSize: 500 }
    )

    expect(report.overview).toEqual({
      active_total: 3078,
      verified_total: 2325,
      verified_rate: '75.5%',
      ai_enriched: 384,
      ai_enriched_rate: '12.5%',
    })

    expect(report.verification).toMatchObject({
      pending: 754,
      needs_review: 7,
      failed: 2,
      human_review_required: 7,
      never_verified: 2871,
      stale_records: 207,
      due_queue: 2835,
    })

    expect(report.enrichment).toMatchObject({
      needs_enrichment: 2553,
      remaining_batches: 6,
      final_batch_size: 53,
      missing_email: 1684,
      missing_hours: 2447,
    })

    expect(report.data_quality).toEqual({
      missing_website: 243,
      ungeocoded: 6,
    })
  })
})
