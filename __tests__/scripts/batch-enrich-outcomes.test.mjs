import { describe, expect, it } from 'vitest'

import {
  buildAgentLogOutput,
  formatOutcomeSummary,
} from '../../scripts/lib/batch-enrich-outcomes.mjs'

describe('batch enrich outcome reporting', () => {
  it('formats explicit no-write categories instead of a generic skipped count', () => {
    const summary = formatOutcomeSummary({
      elapsedSeconds: '123.4',
      counts: {
        enriched: 24,
        current: 460,
        unreachable: 12,
        noData: 8,
        failed: 2,
      },
    })

    expect(summary).toContain('Enriched: 24')
    expect(summary).toContain('Already current: 460')
    expect(summary).toContain('Unreachable: 12')
    expect(summary).toContain('No data: 8')
    expect(summary).toContain('Failed: 2')
    expect(summary).not.toContain('Skipped')
  })

  it('builds an agent-log payload without a skipped field', () => {
    const output = buildAgentLogOutput({
      success: false,
      model: 'qwen3-coder:30b',
      dryRun: false,
      counts: {
        enriched: 24,
        current: 460,
        unreachable: 12,
        noData: 8,
        failed: 2,
      },
    })

    expect(output).toMatchObject({
      status: 'failure',
      resources_processed: 506,
      resources_updated: 24,
      resources_no_write: 480,
      already_current: 460,
      unreachable: 12,
      no_data: 8,
      failed: 2,
      model: 'qwen3-coder:30b',
      dry_run: false,
    })
    expect(output).not.toHaveProperty('skipped')
  })
})
