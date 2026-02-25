/**
 * resource - Resource CRUD, import, search, and duplicate check.
 *
 * Subcommands:
 *   list [--city X] [--state X] [--status X] [--search X] [--limit N]
 *   get <id>
 *   import <file.json> [--preview]
 *   update <id> <field=value>...
 *   delete <id>
 *   search --name X [--city X --state X]
 *   existing --city X --state X
 */
import { parseArgs } from 'node:util'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { apiGet, apiPost, apiPut, apiDelete } from '../api.mjs'
import { table, summary, error, output, success } from '../output.mjs'
import { PROJECT_ROOT } from '../config.mjs'

function showHelp() {
  console.log(`
resource - Resource CRUD, import, search, and duplicate check

Subcommands:
  list [options]       List resources with optional filters
    --city X           Filter by city name
    --state X          Filter by 2-letter state code
    --status X         Filter by status (active, inactive, etc.)
    --search X         Text search on name/address
    --limit N          Max results (default: 50)
    --page N           Page number (default: 1)

  get <id>             Get a single resource by ID

  import <file>        Import resources from JSON file
    --preview          Dry-run: show what would happen without importing

  update <id> <field=value>...
                       Update resource fields (e.g., phone=555-1234 status=active)

  delete <id>          Delete a resource

  search --name X      Check for duplicate resources
    --city X           Optional city filter
    --state X          Optional state filter

  existing --city X --state X
                       List existing resource names for a city (for dedup)
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
      return await listResources(args)
    case 'get':
      return await getResource(args)
    case 'import':
      return await importResources(args)
    case 'update':
      return await updateResource(args)
    case 'delete':
      return await deleteResource(args)
    case 'search':
      return await searchResource(args)
    case 'existing':
      return await existingResources(args)
    default:
      error(`Unknown subcommand: ${subcommand}`)
      showHelp()
      process.exit(1)
  }
}

async function listResources(args) {
  const { values } = parseArgs({
    args,
    options: {
      city: { type: 'string' },
      state: { type: 'string' },
      status: { type: 'string' },
      search: { type: 'string' },
      limit: { type: 'string', default: '50' },
      page: { type: 'string', default: '1' },
    },
    allowPositionals: true,
    strict: false,
  })

  const data = await apiGet('/api/admin/resources', {
    city: values.city,
    state: values.state,
    status: values.status,
    search: values.search,
    limit: values.limit,
    page: values.page,
  })

  if (args.includes('--json')) {
    output(data)
    return
  }

  summary('Resources', {
    Total: data.pagination?.total || 0,
    Page: `${data.pagination?.page || 1} of ${data.pagination?.totalPages || 1}`,
    Showing: data.data?.length || 0,
  })

  if (data.data?.length) {
    table(
      data.data.map((r) => ({
        id: r.id?.substring(0, 8) + '...',
        name: r.name?.substring(0, 40),
        city: r.city || '',
        state: r.state || '',
        category: r.primaryCategory || '',
        status: r.status || '',
      })),
      ['id', 'name', 'city', 'state', 'category', 'status'],
      { id: 'ID', name: 'Name', city: 'City', state: 'ST', category: 'Category', status: 'Status' }
    )
  }
}

async function getResource(args) {
  const positional = args.filter((a) => !a.startsWith('-'))
  const id = positional[1] // positional[0] is 'get'

  if (!id) {
    error('Usage: resource get <id>')
    process.exit(1)
  }

  const data = await apiGet(`/api/admin/resources/${id}`)
  output(data)
}

async function importResources(args) {
  const positional = args.filter((a) => !a.startsWith('-'))
  const filePath = positional[1] // positional[0] is 'import'

  if (!filePath) {
    error('Usage: resource import <file.json> [--preview]')
    process.exit(1)
  }

  const isPreview = args.includes('--preview') || args.includes('--dry-run')
  const fullPath = resolve(PROJECT_ROOT, filePath)

  let fileContent
  try {
    fileContent = JSON.parse(readFileSync(fullPath, 'utf-8'))
  } catch (err) {
    error(`Failed to read ${fullPath}: ${err.message}`)
    process.exit(1)
  }

  const params = isPreview ? { preview: 'true' } : {}
  const data = await apiPost('/api/admin/resources/import', fileContent, params)

  if (args.includes('--json')) {
    output(data)
    return
  }

  const prefix = isPreview ? 'Preview' : 'Import'
  summary(`${prefix} Results`, {
    Total: data.stats?.total || 0,
    Created: data.stats?.created || 0,
    Updated: data.stats?.updated || 0,
    Skipped: data.stats?.skipped || 0,
    Errors: data.stats?.errors || 0,
    Geocoded: data.stats?.geocoded || 0,
  })

  if (data.preview) {
    console.log('(preview mode - no changes were made)')
  }

  if (data.details?.skipped?.length) {
    console.log(`\nSkipped (duplicates): ${data.details.skipped.join(', ')}`)
  }
  if (data.details?.updated?.length) {
    console.log(`\nUpdated: ${data.details.updated.join(', ')}`)
  }
  if (data.error_details?.length) {
    console.log(`\nErrors:`)
    data.error_details.forEach((e) => console.log(`  - ${e}`))
  }
  if (data.warnings?.length) {
    console.log(`\nWarnings:`)
    data.warnings.forEach((w) => console.log(`  - ${w}`))
  }
}

async function updateResource(args) {
  const positional = args.filter((a) => !a.startsWith('-'))
  const id = positional[1]
  const fieldArgs = positional.slice(2)

  if (!id || !fieldArgs.length) {
    error('Usage: resource update <id> <field=value>...')
    error('Example: resource update abc123 phone=555-1234 status=active')
    process.exit(1)
  }

  const updates = {}
  for (const arg of fieldArgs) {
    const eqIdx = arg.indexOf('=')
    if (eqIdx === -1) {
      error(`Invalid field format: ${arg} (expected field=value)`)
      process.exit(1)
    }
    updates[arg.substring(0, eqIdx)] = arg.substring(eqIdx + 1)
  }

  const data = await apiPut(`/api/admin/resources/${id}`, updates)
  success(`Resource ${id} updated.`)
  output(data)
}

async function deleteResource(args) {
  const positional = args.filter((a) => !a.startsWith('-'))
  const id = positional[1]

  if (!id) {
    error('Usage: resource delete <id>')
    process.exit(1)
  }

  const data = await apiDelete(`/api/admin/resources/${id}`)
  success(`Resource ${id} deleted.`)
  output(data)
}

async function searchResource(args) {
  const { values } = parseArgs({
    args,
    options: {
      name: { type: 'string' },
      city: { type: 'string' },
      state: { type: 'string' },
      address: { type: 'string' },
    },
    allowPositionals: true,
    strict: false,
  })

  if (!values.name) {
    error('Usage: resource search --name "Resource Name" [--city X --state X]')
    process.exit(1)
  }

  const data = await apiGet('/api/resources/check-duplicate', {
    name: values.name,
    address: values.address,
    city: values.city,
    state: values.state,
  })

  output(data)
}

async function existingResources(args) {
  const { values } = parseArgs({
    args,
    options: {
      city: { type: 'string' },
      state: { type: 'string' },
    },
    allowPositionals: true,
    strict: false,
  })

  if (!values.city || !values.state) {
    error('Usage: resource existing --city Boulder --state CO')
    process.exit(1)
  }

  const data = await apiGet('/api/admin/prompt-generator', {
    city: values.city,
    state: values.state,
  })

  if (args.includes('--json')) {
    output(data)
    return
  }

  summary(`Existing Resources: ${values.city}, ${values.state}`, {
    Count: data.count || 0,
  })

  if (data.resources?.length) {
    table(
      data.resources.map((r) => ({
        name: r.name?.substring(0, 45),
        address: r.address?.substring(0, 35),
        category: r.primary_category || '',
      })),
      ['name', 'address', 'category'],
      { name: 'Name', address: 'Address', category: 'Category' }
    )
  }
}
