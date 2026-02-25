/**
 * flagged - Flagged resource queue management.
 *
 * Subcommands:
 *   list [--status X]                     List flagged resources
 *   approve <id>                          Approve a flagged resource
 *   reject <id> --reason X               Reject a flagged resource
 *   batch-approve <id1> <id2>...         Batch approve multiple
 *   batch-reject <id1> <id2>... --reason X  Batch reject multiple
 */
import { parseArgs } from 'node:util'
import { apiGet, apiPost } from '../api.mjs'
import { table, summary, error, output, success } from '../output.mjs'

function showHelp() {
  console.log(`
flagged - Flagged resource queue management

Subcommands:
  list [--status X]           List flagged resources
    --status X                Filter: pending, approved, rejected, needs_attention

  approve <id>                Approve a single flagged resource

  reject <id> --reason X      Reject a flagged resource
    --reason X                Required: duplicate, wrong_service_type, permanently_closed,
                              does_not_exist, wrong_location, spam, insufficient_info,
                              wrong_name, incomplete_address, temporarily_closed,
                              needs_verification, confidential_address, missing_details

  batch-approve <id1> <id2>...
                              Approve multiple flagged resources at once

  batch-reject <id1> <id2>... --reason X
                              Reject multiple flagged resources at once
`)
}

export async function run(args) {
  const subcommand = args.find((a) => !a.startsWith('-'))

  if (!subcommand || args.includes('--help')) {
    showHelp()
    return
  }

  switch (subcommand) {
    case 'list':
      return await listFlagged(args)
    case 'approve':
      return await approveFlagged(args)
    case 'reject':
      return await rejectFlagged(args)
    case 'batch-approve':
      return await batchApprove(args)
    case 'batch-reject':
      return await batchReject(args)
    default:
      error(`Unknown subcommand: ${subcommand}`)
      showHelp()
      process.exit(1)
  }
}

async function listFlagged(args) {
  const { values } = parseArgs({
    args,
    options: {
      status: { type: 'string', default: 'pending' },
    },
    allowPositionals: true,
    strict: false,
  })

  const data = await apiGet('/api/admin/flagged-resources', {
    status: values.status,
  })

  if (args.includes('--json')) {
    output(data)
    return
  }

  const items = data.data || data.suggestions || data || []
  if (!Array.isArray(items) || !items.length) {
    console.log('No flagged resources found.')
    return
  }

  summary('Flagged Resources', {
    Count: items.length,
    Status: values.status,
  })

  table(
    items.map((s) => ({
      id: s.id?.substring(0, 8) + '...',
      name: s.name?.substring(0, 35) || '',
      city: s.city || '',
      state: s.state || '',
      category: s.primaryCategory || s.category || '',
      status: s.status || '',
    })),
    ['id', 'name', 'city', 'state', 'category', 'status'],
    { id: 'ID', name: 'Name', city: 'City', state: 'ST', category: 'Category', status: 'Status' }
  )
}

async function approveFlagged(args) {
  const positional = args.filter((a) => !a.startsWith('-'))
  const id = positional[1]

  if (!id) {
    error('Usage: flagged approve <id>')
    process.exit(1)
  }

  const data = await apiPost(`/api/admin/flagged-resources/${id}/approve`)
  success(`Flagged resource ${id} approved. Resource ID: ${data.resource_id}`)
}

async function rejectFlagged(args) {
  const { values } = parseArgs({
    args,
    options: {
      reason: { type: 'string' },
      notes: { type: 'string' },
    },
    allowPositionals: true,
    strict: false,
  })

  const positional = args.filter((a) => !a.startsWith('-'))
  const id = positional[1]

  if (!id || !values.reason) {
    error('Usage: flagged reject <id> --reason duplicate')
    process.exit(1)
  }

  const data = await apiPost(`/api/admin/flagged-resources/${id}/reject`, {
    reason: values.reason,
    notes: values.notes,
  })

  success(`Flagged resource ${id} ${data.status || 'rejected'}.`)
}

async function batchApprove(args) {
  const positional = args.filter((a) => !a.startsWith('-'))
  const ids = positional.slice(1)

  if (!ids.length) {
    error('Usage: flagged batch-approve <id1> <id2> <id3>...')
    process.exit(1)
  }

  const data = await apiPost('/api/admin/flagged-resources/batch', {
    action: 'approve',
    ids,
  })

  if (args.includes('--json')) {
    output(data)
    return
  }

  summary('Batch Approve Results', {
    Total: data.total,
    Processed: data.processed,
    Failed: data.failed,
  })

  if (data.results?.some((r) => r.status === 'failed')) {
    console.log('\nFailed:')
    data.results
      .filter((r) => r.status === 'failed')
      .forEach((r) => console.log(`  ${r.id}: ${r.error}`))
  }
}

async function batchReject(args) {
  const { values } = parseArgs({
    args,
    options: {
      reason: { type: 'string' },
    },
    allowPositionals: true,
    strict: false,
  })

  const positional = args.filter((a) => !a.startsWith('-'))
  const ids = positional.slice(1)

  if (!ids.length || !values.reason) {
    error('Usage: flagged batch-reject <id1> <id2>... --reason duplicate')
    process.exit(1)
  }

  const data = await apiPost('/api/admin/flagged-resources/batch', {
    action: 'reject',
    ids,
    reason: values.reason,
  })

  if (args.includes('--json')) {
    output(data)
    return
  }

  summary('Batch Reject Results', {
    Total: data.total,
    Processed: data.processed,
    Failed: data.failed,
  })
}
