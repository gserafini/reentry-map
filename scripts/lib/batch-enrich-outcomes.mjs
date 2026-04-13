export function createOutcomeCounts() {
  return {
    enriched: 0,
    current: 0,
    unreachable: 0,
    noData: 0,
    failed: 0,
  }
}

export function getNoWriteCount(counts) {
  return counts.current + counts.unreachable + counts.noData
}

export function getProcessedCount(counts) {
  return counts.enriched + getNoWriteCount(counts) + counts.failed
}

export function formatOutcomeSummary({ elapsedSeconds, counts }) {
  return [
    '',
    `Done in ${elapsedSeconds}s — ` +
      `Enriched: ${counts.enriched}, ` +
      `Already current: ${counts.current}, ` +
      `Unreachable: ${counts.unreachable}, ` +
      `No data: ${counts.noData}, ` +
      `Failed: ${counts.failed}`,
  ].join('')
}

export function buildAgentLogOutput({ success, model, dryRun, counts }) {
  return {
    status: success ? 'success' : 'failure',
    resources_processed: getProcessedCount(counts),
    resources_updated: counts.enriched,
    resources_no_write: getNoWriteCount(counts),
    already_current: counts.current,
    unreachable: counts.unreachable,
    no_data: counts.noData,
    failed: counts.failed,
    model,
    dry_run: dryRun,
  }
}
