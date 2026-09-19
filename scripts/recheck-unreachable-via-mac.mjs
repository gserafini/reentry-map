#!/usr/bin/env node

import fs from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { execFile } from 'child_process'
import { promisify } from 'util'
import pg from 'pg'
import {
  buildStatusCounts,
  classifyMacRecheckResult,
  parseUnreachableNames,
} from './lib/unreachable-recheck.mjs'

const execFileAsync = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const envPath = resolve(projectRoot, '.env.local')
const macPatchrightModule = '/Users/gserafini/.claude/scripts/social/node_modules/patchright'
const defaultOutputDir = '/tmp/reentrymap-unreachable-rechecks'

function getArg(args, flag) {
  const idx = args.indexOf(flag)
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null
}

function parseDbUrl() {
  const env = fs.readFileSync(envPath, 'utf8')
  const match = env.match(/^DATABASE_URL=(.*)$/m)
  if (!match) throw new Error('DATABASE_URL not found')
  return match[1].trim()
}

function shellSingleQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`
}

function csvEscape(value) {
  const s = String(value ?? '')
  return `"${s.replace(/"/g, '""')}"`
}

async function queryResources(names) {
  const pool = new pg.Pool({ connectionString: parseDbUrl() })
  try {
    const { rows } = await pool.query(
      'select name, website from resources where name = any($1::text[]) order by name',
      [names]
    )
    return rows
  } finally {
    await pool.end()
  }
}

async function recheckViaMac(url) {
  const js = [
    `const { chromium } = require(${JSON.stringify(macPatchrightModule)});`,
    '(async () => {',
    '  const browser = await chromium.launch({ headless: true });',
    '  try {',
    '    const page = await browser.newPage();',
    `    await page.goto(${JSON.stringify(url)}, { waitUntil: 'networkidle', timeout: 15000 });`,
    '    const text = await page.evaluate(() => document.body.innerText);',
    "    process.stdout.write((text || '').slice(0, 5000));",
    '  } finally {',
    '    await browser.close();',
    '  }',
    '})().catch((err) => {',
    '  console.error(err.message);',
    '  process.exit(1);',
    '});',
  ].join('\n')

  const remoteCommand = `node -e ${shellSingleQuote(js)}`

  try {
    const { stdout } = await execFileAsync(
      'ssh',
      [
        '-o',
        'ConnectTimeout=10',
        '-o',
        'StrictHostKeyChecking=no',
        'gserafini@100.72.66.60',
        remoteCommand,
      ],
      { timeout: 30000, maxBuffer: 1024 * 1024 }
    )
    return classifyMacRecheckResult({ stdout })
  } catch (err) {
    const combinedError = [err.stdout, err.stderr, err.message].filter(Boolean).join(' | ')
    return classifyMacRecheckResult({ combinedError })
  }
}

export async function runCli(args = process.argv.slice(2)) {
  const logPath = getArg(args, '--log')
  const outputDir = getArg(args, '--outdir') || defaultOutputDir
  const limit = parseInt(getArg(args, '--limit') || '0', 10)

  if (!logPath || args.includes('--help')) {
    console.log(`Usage:
  node scripts/recheck-unreachable-via-mac.mjs --log /tmp/enrich-batch4-2026-04-13.log [--outdir /tmp/reentrymap-unreachable-rechecks] [--limit 20]
`)
    if (!logPath) process.exitCode = 1
    return null
  }

  fs.mkdirSync(outputDir, { recursive: true })
  const logText = fs.readFileSync(logPath, 'utf8')
  let names = parseUnreachableNames(logText)
  if (limit > 0) names = names.slice(0, limit)

  const rows = await queryResources(names)
  const websiteByName = new Map(rows.map((row) => [row.name, row.website || '']))
  const results = []

  for (const name of names) {
    const website = websiteByName.get(name) || ''
    if (!website) {
      results.push({
        name,
        website,
        status: 'missing_website',
        detail: 'No website found in DB',
        preview: '',
      })
      continue
    }
    const recheck = await recheckViaMac(website)
    results.push({ name, website, ...recheck })
  }

  const statusCounts = buildStatusCounts(results)
  const tag = new Date().toISOString().slice(0, 10)
  const csvPath = resolve(outputDir, `unreachable-mac-recheck-${tag}.csv`)
  const txtPath = resolve(outputDir, `unreachable-mac-recheck-${tag}.txt`)

  const csvLines = [
    ['name', 'website', 'mac_status', 'detail', 'preview'].map(csvEscape).join(','),
    ...results.map((row) =>
      [row.name, row.website, row.status, row.detail, row.preview].map(csvEscape).join(',')
    ),
  ]
  fs.writeFileSync(csvPath, csvLines.join('\n') + '\n')

  const summaryLines = [
    `Unreachable Mac recheck for ${logPath}`,
    `Total unreachable parsed: ${names.length}`,
    ...Object.entries(statusCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([status, count]) => `- ${status}: ${count}`),
    '',
    'Reachable via Mac:',
    ...results
      .filter((row) => row.status === 'reachable_via_mac')
      .map((row) => `- ${row.name} -> ${row.website}`),
  ]
  fs.writeFileSync(txtPath, summaryLines.join('\n') + '\n')

  const result = {
    total: names.length,
    statusCounts,
    csv: csvPath,
    txt: txtPath,
  }

  console.log(JSON.stringify(result, null, 2))
  return result
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
