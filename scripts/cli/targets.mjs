const SSH_HOST = 'root@dc3-1.serafinihosting.com'
const SSH_PORT = '22022'
const PROJECT_USER = 'reentrymap'

export const TARGETS = {
  production: {
    name: 'production',
    aliases: ['prod', 'production'],
    sshHost: SSH_HOST,
    sshPort: SSH_PORT,
    user: PROJECT_USER,
    appName: 'reentry-map-prod',
    cwd: '/home/reentrymap/reentry-map-prod',
    port: 3007,
    dbName: 'reentry_map',
    publicUrl: 'https://reentrymap.org',
    logPrefix: 'reentry-map-prod',
    branch: 'main',
  },
  staging: {
    name: 'staging',
    aliases: ['stage', 'staging'],
    sshHost: SSH_HOST,
    sshPort: SSH_PORT,
    user: PROJECT_USER,
    appName: 'reentry-map-staging',
    cwd: '/home/reentrymap/reentry-map-staging',
    port: 3009,
    dbName: 'reentry_map_staging',
    publicUrl: 'https://staging.reentrymap.org',
    logPrefix: 'reentry-map-staging',
    branch: 'staging',
  },
}

export function getTargetConfig(target = 'production') {
  const normalized = target.toLowerCase()

  for (const config of Object.values(TARGETS)) {
    if (config.aliases.includes(normalized)) {
      return config
    }
  }

  throw new Error(`Unknown target: ${target}`)
}
