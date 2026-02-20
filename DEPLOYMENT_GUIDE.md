# Reentry Map - Deployment Guide

## Overview

Reentry Map is self-hosted on dc3-1.serafinihosting.com using PM2 + Apache reverse proxy. The Next.js app and PostgreSQL database both run on the same server.

## Infrastructure

```
┌─────────────────────────────────────────────────────┐
│          dc3-1.serafinihosting.com                  │
│                                                     │
│  ┌──────────────┐     ┌──────────────────────────┐  │
│  │    Apache     │────▶│  PM2: reentry-map-prod   │  │
│  │  (port 443)  │     │  Next.js (port 3007)     │  │
│  │  SSL + proxy  │     │  /home/reentrymap/       │  │
│  └──────────────┘     │  reentry-map-prod/       │  │
│                        └──────────┬───────────────┘  │
│                                   │                  │
│                        ┌──────────▼───────────────┐  │
│                        │  PostgreSQL (port 5432)   │  │
│                        │  Database: reentry_map    │  │
│                        │  User: reentrymap         │  │
│                        └──────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Key Details

| Component            | Detail                                                     |
| -------------------- | ---------------------------------------------------------- |
| **Production URL**   | https://reentrymap.org                                     |
| **Domain aliases**   | reentrymap.com, www.reentrymap.org, www.reentrymap.com     |
| **Server**           | dc3-1.serafinihosting.com (cPanel)                         |
| **SSH**              | `ssh -p 22022 root@dc3-1.serafinihosting.com`              |
| **cPanel user**      | `reentrymap`                                               |
| **App directory**    | `/home/reentrymap/reentry-map-prod`                        |
| **Node.js**          | v20.20.0 (via nvm)                                         |
| **Process manager**  | PM2 (app: `reentry-map-prod`, port 3007)                   |
| **Web server**       | Apache reverse proxy → localhost:3007                      |
| **Database**         | PostgreSQL localhost:5432, database `reentry_map`          |
| **Git remote**       | https://github.com/gserafini/reentry-map.git (main branch) |
| **Ecosystem config** | `/home/reentrymap/ecosystem.config.js`                     |
| **Logs**             | `/home/reentrymap/logs/reentry-map-prod-{out,error}.log`   |

---

## Deploying Changes

### Standard Deploy (from local machine)

```bash
# 1. Push code to GitHub
git push origin main

# 2. SSH to server and deploy as reentrymap user
ssh -p 22022 root@dc3-1.serafinihosting.com

su - reentrymap
cd ~/reentry-map-prod
git pull origin main
npm install
npm run build
pm2 restart reentry-map-prod
```

### One-liner Deploy (from local machine)

```bash
# Push first, then deploy remotely
git push origin main && \
ssh -p 22022 root@dc3-1.serafinihosting.com \
  'su - reentrymap -c "cd ~/reentry-map-prod && git pull origin main && npm install && npm run build && pm2 restart reentry-map-prod"'
```

### Verify Deploy

```bash
# Check PM2 status
ssh -p 22022 root@dc3-1.serafinihosting.com 'su - reentrymap -c "pm2 status"'

# Check recent logs
ssh -p 22022 root@dc3-1.serafinihosting.com 'tail -20 /home/reentrymap/logs/reentry-map-prod-out.log'

# Check deployed commit
ssh -p 22022 root@dc3-1.serafinihosting.com 'su - reentrymap -c "cd ~/reentry-map-prod && git log --oneline -1"'

# Verify site is up
curl -sI https://reentrymap.org | head -5
```

---

## PM2 Management

```bash
# All commands run as reentrymap user on dc3-1

# Status
pm2 status

# Restart
pm2 restart reentry-map-prod

# Stop
pm2 stop reentry-map-prod

# Start (if stopped)
pm2 start ecosystem.config.js

# View logs (live)
pm2 logs reentry-map-prod

# View last 100 log lines
pm2 logs reentry-map-prod --lines 100

# Save PM2 process list (survives reboot)
pm2 save

# Reload without downtime
pm2 reload reentry-map-prod
```

### Ecosystem Config

Located at `/home/reentrymap/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'reentry-map-prod',
      cwd: '/home/reentrymap/reentry-map-prod',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3007',
      instances: 1,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3007,
        NO_AT_BRIDGE: '1',
      },
      error_file: '/home/reentrymap/logs/reentry-map-prod-error.log',
      out_file: '/home/reentrymap/logs/reentry-map-prod-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
}
```

---

## Apache Configuration

Apache reverse proxies HTTPS traffic to PM2 on port 3007.

**Config location**: `/etc/apache2/conf.d/userdata/ssl/2_4/reentrymap/reentrymap.org/proxy.conf`

```apache
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:3007/
ProxyPassReverse / http://127.0.0.1:3007/

# WebSocket support
RewriteEngine On
RewriteCond %{HTTP:Upgrade} websocket [NC]
RewriteCond %{HTTP:Connection} upgrade [NC]
RewriteRule ^/?(.*) ws://127.0.0.1:3007/ [P,L]

# Don't proxy .well-known (SSL cert renewal)
ProxyPassMatch ^/\.well-known !
```

Same config exists for HTTP (std) at `/etc/apache2/conf.d/userdata/std/2_4/reentrymap/reentrymap.org/proxy.conf`.

**After modifying Apache configs**:

```bash
# As root on dc3-1
/usr/local/cpanel/scripts/rebuildhttpdconf
httpd -t  # Test config
systemctl restart httpd
```

---

## Database

### Connection Details

| Setting  | Value                                                        |
| -------- | ------------------------------------------------------------ |
| Host     | localhost (from server) / dc3-1.serafinihosting.com (remote) |
| Port     | 5432                                                         |
| Database | reentry_map                                                  |
| User     | reentrymap                                                   |
| Password | (in `.env.local`)                                            |

### From Server

```bash
su - reentrymap
psql -U reentrymap reentry_map
```

### From Local Machine

```bash
# Direct connection (requires SSL)
psql "postgresql://reentrymap:PASSWORD@dc3-1.serafinihosting.com:5432/reentry_map?sslmode=require"
```

### From Scripts

All scripts in `scripts/` use `DATABASE_URL` from `.env.local` with automatic SSL detection:

```javascript
const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
const sql = postgres(databaseUrl, {
  ssl: isLocalhost ? false : 'require',
})
```

**Important**: On the server, the database is `localhost` so SSL is disabled. From local dev machines, SSL is required.

### Environment Variables

`.env.local` on server (`/home/reentrymap/reentry-map-prod/.env.local`):

```bash
# Database (localhost on same server, no SSL needed)
DATABASE_URL=postgresql://reentrymap:PASSWORD@localhost:5432/reentry_map
DIRECT_DATABASE_URL=postgresql://reentrymap:PASSWORD@localhost:5432/reentry_map
```

`.env.local` on local dev machine:

```bash
# Database (remote, SSL required)
DATABASE_URL=postgresql://reentrymap:PASSWORD@dc3-1.serafinihosting.com:5432/reentry_map
DIRECT_DATABASE_URL=postgresql://reentrymap:PASSWORD@dc3-1.serafinihosting.com:5432/reentry_map
```

---

## Environment Variables

Full list of required environment variables (set in `.env.local`):

```bash
# Database
DATABASE_URL=postgresql://reentrymap:PASSWORD@...
DIRECT_DATABASE_URL=postgresql://reentrymap:PASSWORD@...

# NextAuth.js
NEXTAUTH_URL=https://reentrymap.org
NEXTAUTH_SECRET=your-secret

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIza...
GOOGLE_MAPS_KEY=AIza...

# AI (Anthropic Claude for verification agents)
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (for enrichment)
OPENAI_API_KEY=sk-...

# Admin API key (for Claude Code / automated scripts)
ADMIN_API_KEY=your-key

# App URL
NEXT_PUBLIC_APP_URL=https://reentrymap.org
```

---

## Rollback Procedure

### Quick Rollback (Revert to Previous Build)

```bash
ssh -p 22022 root@dc3-1.serafinihosting.com
su - reentrymap
cd ~/reentry-map-prod

# Find last good commit
git log --oneline -10

# Reset to specific commit
git checkout <commit-hash>
npm run build
pm2 restart reentry-map-prod
```

### Code Revert (Git)

```bash
# From local machine
git revert <bad-commit>
git push origin main

# Then deploy normally
```

---

## Monitoring

### Logs

```bash
# Live application logs
ssh -p 22022 root@dc3-1.serafinihosting.com 'su - reentrymap -c "pm2 logs reentry-map-prod"'

# Error log
ssh -p 22022 root@dc3-1.serafinihosting.com 'tail -50 /home/reentrymap/logs/reentry-map-prod-error.log'

# Apache access logs
ssh -p 22022 root@dc3-1.serafinihosting.com 'tail -50 /etc/apache2/logs/domlogs/reentrymap/reentrymap.org'
```

### Health Check

```bash
# Quick check site is responding
curl -sI https://reentrymap.org | head -3

# Check resource count in database
ssh -p 22022 root@dc3-1.serafinihosting.com 'su - reentrymap -c "psql -U reentrymap reentry_map -c \"SELECT count(*) FROM resources;\""'
```

---

## Troubleshooting

### PM2 Process Not Starting

```bash
su - reentrymap
cd ~/reentry-map-prod

# Check for build errors
npm run build

# Check PM2 error log
cat ~/logs/reentry-map-prod-error.log | tail -50

# Try starting manually to see errors
node node_modules/next/dist/bin/next start -p 3007
```

### Database Connection Issues

```bash
# Test local connection (from server)
psql -U reentrymap reentry_map -c "SELECT 1;"

# Test remote connection (from local machine)
psql "postgresql://reentrymap:PASSWORD@dc3-1.serafinihosting.com:5432/reentry_map?sslmode=require" -c "SELECT 1;"

# Check PostgreSQL is running
systemctl status postgresql
```

### Apache Proxy Issues

```bash
# Test Apache config
httpd -t

# Check if port 3007 is listening
ss -tlnp | grep 3007

# Check Apache error log
tail -50 /var/log/apache2/error_log
```

### Build Failures

```bash
# On server as reentrymap user
cd ~/reentry-map-prod

# Check TypeScript
npx tsc --noEmit

# Check for missing deps
npm install

# Clear Next.js cache and rebuild
rm -rf .next
npm run build
```

---

## Backups

### Database

```bash
# Manual backup (as reentrymap user on dc3-1)
pg_dump -U reentrymap reentry_map > ~/backups/reentry_map_$(date +%Y%m%d).sql

# Restore from backup
psql -U reentrymap reentry_map < ~/backups/reentry_map_YYYYMMDD.sql
```

### Code

GitHub is the code backup. All production code is on the `main` branch.

---

## WordPress (reentrymap.org marketing site)

There is also a WordPress installation at `/home/reentrymap/public_html/` that was the original marketing site. The Apache proxy config routes all traffic to the Next.js app, so WordPress is effectively bypassed. The WordPress files remain but are not actively used.
