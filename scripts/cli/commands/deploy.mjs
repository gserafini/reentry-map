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
import { spawn, execSync } from 'node:child_process'
import { error, summary, success } from '../output.mjs'
import { getTargetConfig } from '../targets.mjs'

function showHelp() {
  console.log(`
deploy - Deployment, logs, and status

Subcommands:
  production               Deploy to production
                           Runs: git pull, npm install, npm run build, pm2 restart
  staging                  Deploy to staging
                           Runs: git pull, npm install, npm run build, pm2 restart

  check-logs [--lines N]   View target error logs
    --lines N              Number of lines (default: 50)
    --target TARGET        production (default) or staging

  status                   Check target status (HTTP response + PM2)
    --target TARGET        production (default) or staging
`)
}

export async function run(args) {
  const subcommand = args.find((a) => !a.startsWith('-'))

  if (!subcommand || args.includes('--help')) {
    showHelp()
    return
  }

  switch (subcommand) {
    case 'production':
      return await deployTarget('production')
    case 'staging':
      return await deployTarget('staging')
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

function buildDeployCommand(target) {
  return `su - ${target.user} -c "cd ${target.cwd} && git pull origin ${target.branch} && npm install && npm run build && pm2 restart ${target.appName} --update-env"`
}

async function deployTarget(targetName) {
  const target = getTargetConfig(targetName)
  const deployCmd = buildDeployCommand(target)

  console.log(`Deploying to ${target.name}...`)
  console.log(`SSH: ${target.sshHost}:${target.sshPort}`)
  console.log(`Command: ${deployCmd}\n`)

  return new Promise((resolve, reject) => {
    const child = spawn('ssh', ['-p', target.sshPort, target.sshHost, deployCmd], {
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
  const cmd = `tail -${values.lines} /home/${target.user}/logs/${target.logPrefix}-error.log`
  return new Promise((resolve, reject) => {
    const child = spawn('ssh', ['-p', target.sshPort, target.sshHost, cmd], {
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
    pm2Status = execSync(
      `ssh -p ${target.sshPort} ${target.sshHost} 'su - ${target.user} -c "pm2 show ${target.appName} --no-color"' 2>/dev/null`,
      { encoding: 'utf-8', timeout: 15000 }
    )
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
