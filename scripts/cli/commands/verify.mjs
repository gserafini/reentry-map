/**
 * verify - Resource verification operations.
 *
 * Subcommands:
 *   run [--limit N] [--dry-run]   Run periodic verification
 *   queue [--batch N]             Process verification queue
 *   force-all                     Reset all verification timestamps
 */
import { parseArgs } from 'node:util'
import { spawn } from 'node:child_process'
import { apiPost } from '../api.mjs'
import { error, output, success } from '../output.mjs'
import { getDb, closeDb } from '../db.mjs'
import { PROJECT_ROOT } from '../config.mjs'

function showHelp() {
  console.log(`
verify - Resource verification operations

Subcommands:
  run [--limit N] [--dry-run]   Run periodic verification
    --limit N                   Max resources to verify
    --dry-run                   Preview without making changes

  queue [--batch N]             Process verification queue via API
    --batch N                   Batch size (default: 10)

  force-all                     Reset all verification timestamps
                                (forces re-verification of all resources)
`)
}

export async function run(args) {
  const subcommand = args.find((a) => !a.startsWith('-'))

  if (!subcommand || args.includes('--help')) {
    showHelp()
    return
  }

  switch (subcommand) {
    case 'run':
      return await runVerification(args)
    case 'queue':
      return await processQueue(args)
    case 'force-all':
      return await forceAll(args)
    default:
      error(`Unknown subcommand: ${subcommand}`)
      showHelp()
      process.exit(1)
  }
}

async function runVerification(args) {
  // Delegate to existing periodic-verification.mjs script
  const scriptArgs = []
  if (args.includes('--dry-run')) scriptArgs.push('--dry-run')

  const { values } = parseArgs({
    args,
    options: { limit: { type: 'string' } },
    allowPositionals: true,
    strict: false,
  })
  if (values.limit) scriptArgs.push(`--limit=${values.limit}`)

  const scriptPath = `${PROJECT_ROOT}/scripts/periodic-verification.mjs`
  console.log(`Running periodic verification...`)

  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath, ...scriptArgs], {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
    })
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Verification exited with code ${code}`))
    })
  })
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

async function forceAll(_args) {
  const sql = getDb()

  try {
    const result = await sql`
      UPDATE resources
      SET last_verified_at = NULL, verification_status = 'pending'
      WHERE status = 'active'
    `

    success(`Reset verification for ${result.count} resources.`)
  } finally {
    await closeDb()
  }
}
