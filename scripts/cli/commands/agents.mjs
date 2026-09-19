/**
 * agents - AI agent control.
 *
 * Subcommands:
 *   discovery               Trigger resource discovery agent
 *   enrichment              Trigger resource enrichment agent
 *   recheck-unreachable     Re-run UNREACHABLE batch-log entries via the Mac pathway
 *   process-queue [--batch N]  Process AI agent verification queue
 */
import { parseArgs } from 'node:util'
import { apiPost } from '../api.mjs'
import { error, output, success } from '../output.mjs'

function showHelp() {
  console.log(`
agents - AI agent control

Subcommands:
  discovery                 Trigger resource discovery agent
  enrichment                Trigger resource enrichment agent
  recheck-unreachable       Re-run UNREACHABLE batch-log entries via the Mac pathway
    --log PATH              Batch enrich log file to parse
    --outdir PATH           Output directory for CSV/TXT report (default: /tmp/reentrymap-unreachable-rechecks)
    --limit N               Optional cap on how many unreachable entries to recheck
  process-queue [--batch N] Process AI agent verification queue
    --batch N               Batch size (default: 10)
`)
}

export async function run(args) {
  const subcommand = args.find((a) => !a.startsWith('-'))

  if (!subcommand || args.includes('--help')) {
    showHelp()
    return
  }

  switch (subcommand) {
    case 'discovery':
      return await triggerDiscovery(args)
    case 'enrichment':
      return await triggerEnrichment(args)
    case 'recheck-unreachable':
      return await recheckUnreachable(args)
    case 'process-queue':
      return await processQueue(args)
    default:
      error(`Unknown subcommand: ${subcommand}`)
      showHelp()
      process.exit(1)
  }
}

async function triggerDiscovery(args) {
  const data = await apiPost('/api/admin/agents/discovery')
  if (args.includes('--json')) {
    output(data)
  } else {
    success('Discovery agent triggered.')
    output(data)
  }
}

async function triggerEnrichment(args) {
  const data = await apiPost('/api/admin/agents/enrichment')
  if (args.includes('--json')) {
    output(data)
  } else {
    success('Enrichment agent triggered.')
    output(data)
  }
}

async function recheckUnreachable(args) {
  const { runCli } = await import('../../recheck-unreachable-via-mac.mjs')
  const result = await runCli(args)
  output(result)
}

async function processQueue(args) {
  const { values } = parseArgs({
    args,
    options: { batch: { type: 'string', default: '10' } },
    allowPositionals: true,
    strict: false,
  })

  const data = await apiPost('/api/admin/verification/process-queue', {
    batchSize: parseInt(values.batch) || 10,
  })

  output(data)
}
