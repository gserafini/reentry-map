/**
 * deploy - Deployment, logs, and status.
 *
 * Subcommands:
 *   production             Deploy to production (git pull, build, restart)
 *   staging                Deploy to staging (git pull, build, restart)
 *   check-logs [--lines N] View target error logs
 *   status                 Check target status (HTTP + PM2)
 */
import { parseArgs } from 'node:util'
import { spawn, spawnSync } from 'node:child_process'
import { hostname, userInfo } from 'node:os'
import { error, summary, success } from '../output.mjs'
import { getTargetConfig } from '../targets.mjs'

function showHelp() {
  console.log(`
deploy - Deployment, logs, and status

Subcommands:
  production               Deploy to production
                           Runs: git pull --ff-only, npm ci, npm run build, pm2 restart --update-env
  staging                  Deploy to staging
                           Runs: git pull --ff-only, npm ci, npm run build, pm2 restart --update-env

  --local --revision SHA  Build an exact committed local revision (no GitHub pull)
  --dry-run               Preview deployment commands only
  refresh-staging-resources [--apply] [--dry-run]
                          Preview/copy public listings to staging; no users copied
                          --dry-run always prevents writes, even with --apply
  check-logs [--lines N]   View current PM2 runtime logs
    --lines N              Number of lines (default: 50)
    --target TARGET        production (default) or staging

  status                   Check target status (HTTP response + PM2)
    --target TARGET        production (default) or staging
`)
}

export function buildUserCommandTransport(
  target,
  userCommand,
  currentHostname = hostname(),
  currentUser = userInfo().username
) {
  const targetHost = String(target.sshHost).split('@').pop()
  const isLocalHost =
    targetHost === currentHostname || targetHost === 'localhost' || targetHost === '127.0.0.1'

  if (isLocalHost) {
    if (currentUser === target.user) {
      return {
        cmd: 'bash',
        args: ['-lc', userCommand],
      }
    }

    return {
      cmd: 'su',
      args: ['-', target.user, '-c', userCommand],
    }
  }

  return {
    cmd: 'ssh',
    args: [
      '-p',
      target.sshPort,
      target.sshHost,
      `su - ${target.user} -c ${shellQuote(userCommand)}`,
    ],
  }
}

function spawnTargetUserCommand(target, userCommand, options = {}) {
  const transport = buildUserCommandTransport(target, userCommand)
  return spawn(transport.cmd, transport.args, options)
}

function execTargetUserCommand(target, userCommand, options = {}) {
  const transport = buildUserCommandTransport(target, userCommand)
  return spawnSync(transport.cmd, transport.args, options)
}

export async function run(args) {
  const subcommand = args.find((a) => !a.startsWith('-'))

  if (!subcommand || args.includes('--help')) {
    showHelp()
    return
  }

  switch (subcommand) {
    case 'production':
      return await deployTarget('production', args)
    case 'staging':
      return await deployTarget('staging', args)
    case 'refresh-staging-resources': {
      const { refreshStagingResources } = await import('../staging-resources.mjs')
      const { values } = parseArgs({
        args,
        options: { apply: { type: 'boolean' }, 'dry-run': { type: 'boolean' } },
        allowPositionals: true,
        strict: true,
      })
      return refreshStagingResources({ dryRun: !!values['dry-run'] || !values.apply })
    }
    case 'check-logs':
      return await checkLogs(args)
    case 'status':
      return await checkStatus(args)
    default:
      error(`Unknown subcommand: ${subcommand}`)
      showHelp()
      process.exit(1)
  }
}

export function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'"
}
export function buildLogCommand(target, lines = 50) {
  if (!/^\d+$/.test(String(lines)) || Number(lines) < 1 || Number(lines) > 5000)
    throw Error('Use --lines with an integer between 1 and 5000.')
  return `pm2 logs ${shellQuote(target.appName)} --lines ${Number(lines)} --nostream`
}
export function buildDeployCommand(target, { local = false, revision } = {}) {
  if (local && !/^[a-f0-9]{40}$/.test(revision || ''))
    throw Error(
      'Local deployment requires --revision with the full committed SHA from git rev-parse HEAD.'
    )
  const clean = `test -z "$(git status --porcelain)" || { echo 'Deployment refused: commit or preserve working-tree changes first.' >&2; exit 1; }`
  const sync = local
    ? `test "$(git rev-parse HEAD)" = ${shellQuote(revision)} || { echo 'Deployment refused: local HEAD differs from --revision.' >&2; exit 1; }`
    : `git pull --ff-only origin ${shellQuote(target.branch)}`
  return `cd ${shellQuote(target.cwd)} && { ${clean}; } && { ${sync}; } && npm ci && npm run build && pm2 restart ${shellQuote(target.appName)} --update-env`
}

async function deployTarget(targetName, args = []) {
  const { values } = parseArgs({
    args,
    options: {
      local: { type: 'boolean' },
      revision: { type: 'string' },
      'dry-run': { type: 'boolean' },
    },
    allowPositionals: true,
    strict: true,
  })
  const target = getTargetConfig(targetName)
  const deployCmd = buildDeployCommand(target, values)
  if (values['dry-run']) {
    console.log(deployCmd)
    return
  }
  const transport = buildUserCommandTransport(target, deployCmd)

  console.log(`Deploying to ${target.name}...`)
  console.log(`SSH: ${target.sshHost}:${target.sshPort}`)
  console.log(`Command: ${transport.cmd} ${transport.args.join(' ')}\n`)

  return new Promise((resolve, reject) => {
    const child = spawnTargetUserCommand(target, deployCmd, {
      stdio: 'inherit',
    })
    child.on('close', (code) => {
      if (code === 0) {
        success(`\n${target.name} deployment complete!`)
        resolve()
      } else {
        reject(new Error(`Deployment failed with exit code ${code}`))
      }
    })
  })
}

async function checkLogs(args) {
  const { values } = parseArgs({
    args,
    options: {
      lines: { type: 'string', default: '50' },
      target: { type: 'string', default: 'production' },
    },
    allowPositionals: true,
    strict: false,
  })

  const target = getTargetConfig(values.target)
  const cmd = buildLogCommand(target, values.lines)
  return new Promise((resolve, reject) => {
    const child = spawnTargetUserCommand(target, cmd, {
      stdio: 'inherit',
    })
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`SSH exited with code ${code}`))
    })
  })
}

async function checkStatus(args) {
  const { values } = parseArgs({
    args,
    options: {
      target: { type: 'string', default: 'production' },
    },
    allowPositionals: true,
    strict: false,
  })

  const target = getTargetConfig(values.target)

  // Check HTTP
  let httpStatus = 'unknown'
  try {
    const response = await fetch(target.publicUrl, { method: 'HEAD' })
    httpStatus = `${response.status} ${response.statusText}`
  } catch (err) {
    httpStatus = `ERROR: ${err.message}`
  }

  // Check PM2 via SSH
  let pm2Status = 'unknown'
  try {
    const result = execTargetUserCommand(target, `pm2 show ${target.appName} --no-color`, {
      encoding: 'utf-8',
      timeout: 15000,
    })

    if (result.status !== 0) {
      throw new Error(result.stderr || `Process exited with ${result.status}`)
    }

    pm2Status = String(result.stdout)
      .split('\n')
      .filter((l) => l.includes('status') || l.includes('uptime') || l.includes('memory'))
      .map((l) => l.trim())
      .join('\n')
  } catch {
    pm2Status = 'Could not reach server'
  }

  summary(`${target.name[0].toUpperCase()}${target.name.slice(1)} Status`, {
    URL: target.publicUrl,
    HTTP: httpStatus,
  })

  if (pm2Status) {
    console.log('PM2 Info:')
    console.log(pm2Status)
  }
}
