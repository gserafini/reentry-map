/**
 * suggestions - Suggestions queue management.
 *
 * Subcommands:
 *   list [--status X]    List suggestions
 *   approve <id>         Approve a suggestion
 *   reject <id>          Reject a suggestion
 */
import { parseArgs } from 'node:util'
import { apiGet, apiPut } from '../api.mjs'
import { table, summary, error, output, success } from '../output.mjs'

function showHelp() {
  console.log(`
suggestions - Suggestions queue management

Subcommands:
  list [--status X]    List suggestions
    --status X         Filter: pending, approved, rejected, duplicate

  approve <id>         Mark suggestion as approved (does NOT create a resource;
                       use 'flagged approve' for that)

  reject <id>          Mark suggestion as rejected
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
      return await listSuggestions(args)
    case 'approve':
      return await approveSuggestion(args)
    case 'reject':
      return await rejectSuggestion(args)
    default:
      error(`Unknown subcommand: ${subcommand}`)
      showHelp()
      process.exit(1)
  }
}

async function listSuggestions(args) {
  const { values } = parseArgs({
    args,
    options: {
      status: { type: 'string', default: 'pending' },
    },
    allowPositionals: true,
    strict: false,
  })

  const data = await apiGet('/api/suggestions', {
    type: values.status,
  })

  if (args.includes('--json')) {
    output(data)
    return
  }

  const items = Array.isArray(data) ? data : data.data || data.suggestions || []
  if (!items.length) {
    console.log('No suggestions found.')
    return
  }

  summary('Suggestions', {
    Count: items.length,
    Status: values.status,
  })

  table(
    items.map((s) => ({
      id: s.id?.substring(0, 8) + '...',
      name: s.name?.substring(0, 35) || '',
      city: s.city || '',
      state: s.state || '',
      status: s.status || '',
    })),
    ['id', 'name', 'city', 'state', 'status'],
    { id: 'ID', name: 'Name', city: 'City', state: 'ST', status: 'Status' }
  )
}

async function approveSuggestion(args) {
  const positional = args.filter((a) => !a.startsWith('-'))
  const id = positional[1]

  if (!id) {
    error('Usage: suggestions approve <id>')
    process.exit(1)
  }

  const data = await apiPut(`/api/suggestions/${id}/status`, {
    status: 'approved',
  })

  success(`Suggestion ${id} marked as approved.`)
  output(data)
}

async function rejectSuggestion(args) {
  const positional = args.filter((a) => !a.startsWith('-'))
  const id = positional[1]

  if (!id) {
    error('Usage: suggestions reject <id>')
    process.exit(1)
  }

  const data = await apiPut(`/api/suggestions/${id}/status`, {
    status: 'rejected',
  })

  success(`Suggestion ${id} marked as rejected.`)
  output(data)
}
