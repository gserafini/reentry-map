/**
 * deploy - Production deployment, logs, and status.
 *
 * Subcommands:
 *   production             Deploy to production (git pull, build, restart)
 *   check-logs [--lines N] View production error logs
 *   status                 Check production status (HTTP + PM2)
 */
import { parseArgs } from 'node:util'
import { spawn, execSync } from 'node:child_process'
import { error, summary, success } from '../output.mjs'

const SSH_HOST = 'root@dc3-1.serafinihosting.com'
const SSH_PORT = '22022'
const DEPLOY_CMD =
  'su - reentrymap -c "cd ~/reentry-map-prod && git pull origin main && npm install && npm run build && pm2 restart reentry-map-prod"'
const PROD_URL = 'https://reentrymap.org'

function showHelp() {
  console.log(`
deploy - Production deployment, logs, and status

Subcommands:
  production               Deploy to production
                           Runs: git pull, npm install, npm run build, pm2 restart

  check-logs [--lines N]   View production error logs
    --lines N              Number of lines (default: 50)

  status                   Check production status (HTTP response + PM2)
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
      return await deployProduction(args)
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

async function deployProduction() {
  console.log('Deploying to production...')
  console.log(`SSH: ${SSH_HOST}:${SSH_PORT}`)
  console.log(`Command: ${DEPLOY_CMD}\n`)

  return new Promise((resolve, reject) => {
    const child = spawn('ssh', ['-p', SSH_PORT, SSH_HOST, DEPLOY_CMD], {
      stdio: 'inherit',
    })
    child.on('close', (code) => {
      if (code === 0) {
        success('\nDeployment complete!')
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
    options: { lines: { type: 'string', default: '50' } },
    allowPositionals: true,
    strict: false,
  })

  const cmd = `tail -${values.lines} /home/reentrymap/logs/reentry-map-prod-error.log`
  return new Promise((resolve, reject) => {
    const child = spawn('ssh', ['-p', SSH_PORT, SSH_HOST, cmd], {
      stdio: 'inherit',
    })
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`SSH exited with code ${code}`))
    })
  })
}

async function checkStatus() {
  // Check HTTP
  let httpStatus = 'unknown'
  try {
    const response = await fetch(PROD_URL, { method: 'HEAD' })
    httpStatus = `${response.status} ${response.statusText}`
  } catch (err) {
    httpStatus = `ERROR: ${err.message}`
  }

  // Check PM2 via SSH
  let pm2Status = 'unknown'
  try {
    pm2Status = execSync(
      `ssh -p ${SSH_PORT} ${SSH_HOST} 'su - reentrymap -c "pm2 show reentry-map-prod --no-color"' 2>/dev/null`,
      { encoding: 'utf-8', timeout: 15000 }
    )
      .split('\n')
      .filter((l) => l.includes('status') || l.includes('uptime') || l.includes('memory'))
      .map((l) => l.trim())
      .join('\n')
  } catch {
    pm2Status = 'Could not reach server'
  }

  summary('Production Status', {
    URL: PROD_URL,
    HTTP: httpStatus,
  })

  if (pm2Status) {
    console.log('PM2 Info:')
    console.log(pm2Status)
  }
}
