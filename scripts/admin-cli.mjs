#!/usr/bin/env node

/**
 * Reentry Map Admin CLI
 *
 * Unified command-line interface for all admin operations.
 * Wraps the HTTP API and direct DB access into repeatable subcommands.
 *
 * Usage: node scripts/admin-cli.mjs <command> <subcommand> [options]
 *
 * Global flags:
 *   --json      Output as JSON (machine-readable)
 *   --help      Show help for any command
 *   --verbose   Show full API responses
 *   --dry-run   Preview without executing (where supported)
 */

import { setJsonMode } from './cli/output.mjs'

const COMMANDS = {
  resource: () => import('./cli/commands/resources.mjs'),
  flagged: () => import('./cli/commands/flagged.mjs'),
  coverage: () => import('./cli/commands/coverage.mjs'),
  stats: () => import('./cli/commands/stats.mjs'),
  verify: () => import('./cli/commands/verify.mjs'),
  suggestions: () => import('./cli/commands/suggestions.mjs'),
  agents: () => import('./cli/commands/agents.mjs'),
  deploy: () => import('./cli/commands/deploy.mjs'),
  quality: () => import('./cli/commands/quality.mjs'),
}

const COMMAND_DESCRIPTIONS = {
  resource: 'Resource CRUD, import, search, and duplicate check',
  flagged: 'Flagged resource queue management (approve/reject/batch)',
  coverage: 'Coverage analysis, gap detection, expansion targets',
  stats: 'Dashboard statistics, summary reports, AI usage',
  verify: 'Resource verification operations',
  suggestions: 'Suggestions queue management',
  agents: 'AI agent control (discovery, enrichment)',
  deploy: 'Production deployment, logs, status',
  quality: 'Quality checks and testing',
}

function showHelp() {
  console.log(`
Reentry Map Admin CLI

Usage: node scripts/admin-cli.mjs <command> <subcommand> [options]
       npm run admin -- <command> <subcommand> [options]

Commands:`)

  const maxLen = Math.max(...Object.keys(COMMAND_DESCRIPTIONS).map((k) => k.length))
  for (const [cmd, desc] of Object.entries(COMMAND_DESCRIPTIONS)) {
    console.log(`  ${cmd.padEnd(maxLen + 2)}${desc}`)
  }

  console.log(`
Global Options:
  --json       Output as JSON (machine-readable)
  --help       Show help for any command
  --verbose    Show full API responses
  --dry-run    Preview without executing (where supported)

Examples:
  node scripts/admin-cli.mjs resource list --city Boulder --state CO
  node scripts/admin-cli.mjs coverage gaps --city Boulder --state CO
  node scripts/admin-cli.mjs stats summary
  node scripts/admin-cli.mjs resource import data-imports/file.json --preview
  node scripts/admin-cli.mjs flagged list
`)
}

async function main() {
  const args = process.argv.slice(2)

  // Check global flags
  if (args.includes('--json')) {
    setJsonMode(true)
  }

  // Filter out global flags for command routing
  const positional = args.filter((a) => !a.startsWith('--'))
  const command = positional[0]
  if (!command) {
    showHelp()
    process.exit(0)
  }

  if (!COMMANDS[command]) {
    console.error(`Unknown command: ${command}`)
    console.error(`Run with --help to see available commands.`)
    process.exit(1)
  }

  try {
    const mod = await COMMANDS[command]()
    await mod.run(args.slice(1)) // Pass everything after the command name
  } catch (err) {
    console.error(`Error: ${err.message}`)
    if (args.includes('--verbose')) {
      console.error(err.stack)
    }
    process.exit(1)
  }
}

main()
