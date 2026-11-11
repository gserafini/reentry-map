import { describe, expect, it } from 'vitest'

import {
  buildEnrichmentProvenance,
  selectResourcesForEnrichment,
} from '../../scripts/lib/batch-enrich-selection.mjs'

describe('batch enrich selection', () => {
  it('never selects a resource explicitly held for source review', () => {
    const now = new Date('2026-04-14T20:00:00.000Z')
    const selected = selectResourcesForEnrichment(
      [
        {
          id: 'held-never-attempted',
          created_at: '2026-01-01T00:00:00.000Z',
          provenance: { coverage_review: { automation_hold: true } },
        },
        {
          id: 'held-old-retry',
          created_at: '2025-01-01T00:00:00.000Z',
          provenance: {
            coverage_review: { automation_hold: true },
            enrichment: {
              last_attempted_at: '2025-01-01T00:00:00.000Z',
              last_outcome: 'unreachable',
            },
          },
        },
        {
          id: 'unheld-never-attempted',
          created_at: '2026-01-02T00:00:00.000Z',
          provenance: { coverage_review: { automation_hold: false } },
        },
      ],
      { limit: 10, now, retryDays: 30 }
    )

    expect(selected.map((resource) => resource.id)).toEqual(['unheld-never-attempted'])
  })

  it('prioritizes never-attempted resources and skips recent retries', () => {
    const now = new Date('2026-04-14T20:00:00.000Z')

    const selected = selectResourcesForEnrichment(
      [
        {
          id: 'newer-never-attempted',
          created_at: '2026-04-14T00:00:00.000Z',
          provenance: null,
        },
        {
          id: 'older-never-attempted',
          created_at: '2026-04-01T00:00:00.000Z',
          provenance: null,
        },
        {
          id: 'recent-attempt',
          created_at: '2026-03-20T00:00:00.000Z',
          provenance: {
            enrichment: {
              last_attempted_at: '2026-04-10T00:00:00.000Z',
              last_outcome: 'unreachable',
            },
          },
        },
        {
          id: 'stale-attempt',
          created_at: '2026-03-15T00:00:00.000Z',
          provenance: {
            enrichment: {
              last_attempted_at: '2026-03-01T00:00:00.000Z',
              last_outcome: 'no_data',
            },
          },
        },
      ],
      { limit: 3, now, retryDays: 30 }
    )

    expect(selected.map((resource) => resource.id)).toEqual([
      'older-never-attempted',
      'newer-never-attempted',
      'stale-attempt',
    ])
  })

  it('records the latest enrichment attempt without dropping existing provenance', () => {
    const provenance = buildEnrichmentProvenance(
      {
        discovered: {
          by: 'research-agent',
        },
        coverage_review: {
          automation_hold: true,
          reviewed_at: '2026-04-14T19:00:00.000Z',
          review_after: '2026-05-14T00:00:00.000Z',
        },
      },
      {
        attemptedAt: '2026-04-14T20:00:00.000Z',
        outcome: 'already_current',
        model: 'qwen3-coder:30b',
        fieldFilter: 'all',
      }
    )

    expect(provenance).toMatchObject({
      discovered: {
        by: 'research-agent',
      },
      coverage_review: {
        automation_hold: true,
        reviewed_at: '2026-04-14T19:00:00.000Z',
        review_after: '2026-05-14T00:00:00.000Z',
      },
      enrichment: {
        last_attempted_at: '2026-04-14T20:00:00.000Z',
        last_outcome: 'already_current',
        model: 'qwen3-coder:30b',
        field_filter: 'all',
      },
    })
  })
})
