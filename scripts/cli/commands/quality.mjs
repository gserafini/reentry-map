/**
 * quality - Quality checks and testing.
 *
 * Subcommands:
 *   quick               Run npm run quality (lint, types, tests, build, console)
 *   full                Run npm run quality:full (above + E2E)
 *   console [path]      Check browser console for errors on a specific page
 */
import { spawn } from 'node:child_process'
import { error } from '../output.mjs'
import { PROJECT_ROOT } from '../config.mjs'

function showHelp() {
  console.log(`
quality - Quality checks and testing

Subcommands:
  quick                Run npm run quality
                       (lint + types + tests + build + dev check + console check)

  full                 Run npm run quality:full
                       (above + E2E tests)

  console [path]       Check browser console for errors on a specific page
                       Default: / (homepage)
                       Example: quality console /resources
`)
}

export async function run(args) {
  const subcommand = args.find((a) => !a.startsWith('-'))

  if (!subcommand || args.includes('--help')) {
    showHelp()
    return
  }

  switch (subcommand) {
    case 'quick':
      return await runNpm('quality')
    case 'full':
      return await runNpm('quality:full')
    case 'console':
      return await checkConsole(args)
    default:
      error(`Unknown subcommand: ${subcommand}`)
      showHelp()
      process.exit(1)
  }
}

function runNpm(script) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', script], {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
    })
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`npm run ${script} exited with code ${code}`))
    })
  })
}

async function checkConsole(args) {
  const positional = args.filter((a) => !a.startsWith('-'))
  const pagePath = positional[1] || '/'

  const scriptPath = `${PROJECT_ROOT}/scripts/check-console.mjs`

  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath, pagePath], {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
    })
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Console check exited with code ${code}`))
    })
  })
}
