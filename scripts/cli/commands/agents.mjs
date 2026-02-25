/**
 * agents - AI agent control.
 *
 * Subcommands:
 *   discovery               Trigger resource discovery agent
 *   enrichment              Trigger resource enrichment agent
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
