/**
 * migrate - Apply SQL migrations to production database.
 *
 * Subcommands:
 *   apply <file>        Apply a migration file to production DB via SSH
 *   list                List all migration files (with applied status if available)
 *   check <file>        Preview migration SQL without applying
 */
import { parseArgs } from 'node:util'
import { spawn, execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { error, success, table } from '../output.mjs'

const SSH_HOST = 'root@dc3-1.serafinihosting.com'
const SSH_PORT = '22022'
const DB_NAME = 'reentry_map'
const DB_USER = 'reentrymap'
const MIGRATIONS_DIR = resolve(import.meta.dirname, '../../../lib/db/migrations')

function showHelp() {
  console.log(`
migrate - Apply SQL migrations to production database

Subcommands:
  apply <file>     Apply a migration to production DB
                   <file> can be a full path or just the filename (e.g. 030_create_agent_sessions.sql)
                   Runs via SSH as reentrymap user on dc3-1

  list             List all migration files in lib/db/migrations/

  check <file>     Preview migration SQL without applying

Options:
  --dry-run        Show the SSH command without executing (for apply)
  --force          Skip confirmation prompt
`)
}

export async function run(args) {
  const subcommand = args.find((a) => !a.startsWith('-'))

  if (!subcommand || args.includes('--help')) {
    showHelp()
    return
  }

  switch (subcommand) {
    case 'apply':
      return await applyMigration(args)
    case 'list':
      return await listMigrations()
    case 'check':
      return await checkMigration(args)
    default:
      error(`Unknown subcommand: ${subcommand}`)
      showHelp()
      process.exit(1)
  }
}

function resolveMigrationPath(fileArg) {
  if (!fileArg) {
    error('Migration file required. Usage: migrate apply <file>')
    process.exit(1)
  }

  // Try as-is first (full path)
  if (existsSync(fileArg)) {
    return resolve(fileArg)
  }

  // Try in migrations dir
  const inMigrationsDir = resolve(MIGRATIONS_DIR, fileArg)
  if (existsSync(inMigrationsDir)) {
    return inMigrationsDir
  }

  // Try with .sql extension
  const withExt = resolve(MIGRATIONS_DIR, fileArg.endsWith('.sql') ? fileArg : `${fileArg}.sql`)
  if (existsSync(withExt)) {
    return withExt
  }

  // Try partial match (e.g. "030" matches "030_create_agent_sessions.sql")
  try {
    const files = execSync(`ls ${MIGRATIONS_DIR}/*.sql 2>/dev/null`, { encoding: 'utf-8' })
      .trim()
      .split('\n')
    const match = files.find((f) => basename(f).startsWith(fileArg))
    if (match) return match
  } catch {
    // No files found
  }

  error(`Migration file not found: ${fileArg}`)
  error(`Searched: ${MIGRATIONS_DIR}`)
  process.exit(1)
}

async function applyMigration(args) {
  const { values } = parseArgs({
    args,
    options: {
      'dry-run': { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
    },
    allowPositionals: true,
    strict: false,
  })

  const positionals = args.filter((a) => !a.startsWith('-'))
  const fileArg = positionals[1] // first positional is "apply"
  const migrationPath = resolveMigrationPath(fileArg)
  const fileName = basename(migrationPath)

  console.log(`Migration: ${fileName}`)
  console.log(`Source:    ${migrationPath}`)
  console.log(`Target:    ${DB_USER}@dc3-1/${DB_NAME}`)
  console.log()

  // Read and show a preview
  const sql = readFileSync(migrationPath, 'utf-8')
  const lines = sql.split('\n')
  const preview = lines.slice(0, 10).join('\n')
  console.log('Preview (first 10 lines):')
  console.log('─'.repeat(60))
  console.log(preview)
  if (lines.length > 10) console.log(`... (${lines.length - 10} more lines)`)
  console.log('─'.repeat(60))
  console.log()

  // The SSH command pipes the local file to psql on the remote
  const sshCmd = `ssh -p ${SSH_PORT} ${SSH_HOST} 'su - ${DB_USER} -c "psql -U ${DB_USER} ${DB_NAME}"'`

  if (values['dry-run']) {
    console.log('Dry run - would execute:')
    console.log(`cat ${migrationPath} | ${sshCmd}`)
    return
  }

  console.log('Applying migration...')

  return new Promise((resolve, reject) => {
    const child = spawn(
      'sh',
      [
        '-c',
        `cat "${migrationPath}" | ssh -p ${SSH_PORT} ${SSH_HOST} 'su - ${DB_USER} -c "psql -U ${DB_USER} ${DB_NAME}"'`,
      ],
      { stdio: ['pipe', 'inherit', 'inherit'] }
    )

    child.on('close', (code) => {
      if (code === 0) {
        success(`\nMigration ${fileName} applied successfully!`)
        resolve()
      } else {
        error(`Migration failed with exit code ${code}`)
        reject(new Error(`Migration failed with exit code ${code}`))
      }
    })
  })
}

async function listMigrations() {
  let files
  try {
    files = execSync(`ls ${MIGRATIONS_DIR}/*.sql 2>/dev/null`, { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((f) => basename(f))
  } catch {
    error('No migration files found')
    return
  }

  const rows = files.map((f) => {
    const num = f.match(/^(\d+)/)?.[1] || '?'
    const name = f.replace(/^\d+_/, '').replace(/\.sql$/, '')
    return { num, name, file: f }
  })

  console.log(`\nMigrations (${MIGRATIONS_DIR}):\n`)
  table(rows, ['num', 'name', 'file'], { num: '#', name: 'Description', file: 'Filename' })
  console.log(`\nTotal: ${files.length} migration files`)
}

async function checkMigration(args) {
  const positionals = args.filter((a) => !a.startsWith('-'))
  const fileArg = positionals[1]
  const migrationPath = resolveMigrationPath(fileArg)
  const fileName = basename(migrationPath)

  const sql = readFileSync(migrationPath, 'utf-8')

  console.log(`\nMigration: ${fileName}`)
  console.log(`Path:      ${migrationPath}`)
  console.log(`Size:      ${sql.length} bytes, ${sql.split('\n').length} lines`)
  console.log()
  console.log('─'.repeat(60))
  console.log(sql)
  console.log('─'.repeat(60))
}
