# Migration Guide: Supabase → Self-Hosted PostgreSQL

**Last Updated**: 2025-11-10
**Estimated Time**: 2-3 weeks
**Difficulty**: Advanced
**Prerequisites**: Linux server with root access, domain name, basic PostgreSQL knowledge

---

## Table of Contents

1. [Pre-Migration Checklist](#pre-migration-checklist)
2. [Server Preparation](#server-preparation)
3. [PostgreSQL Installation & Configuration](#postgresql-installation--configuration)
4. [PostGIS Extension Setup](#postgis-extension-setup)
5. [Connection Pooling (pgBouncer)](#connection-pooling-pgbouncer)
6. [Data Migration](#data-migration)
7. [Auth Migration (Phone OTP)](#auth-migration-phone-otp)
8. [Storage Migration](#storage-migration)
9. [Environment Variable Updates](#environment-variable-updates)
10. [Testing & Validation](#testing--validation)
11. [Cutover Plan](#cutover-plan)
12. [Rollback Plan](#rollback-plan)
13. [Post-Migration Monitoring](#post-migration-monitoring)

---

## Pre-Migration Checklist

**Before starting, ensure:**

- [ ] **Server ready**: WHM/cPanel server with root SSH access
- [ ] **Specs confirmed**: 8+ cores, 64GB+ RAM, 1TB+ SSD, 10TB+ bandwidth
- [ ] **Backups**: Full Supabase backup downloaded and verified
- [ ] **Domain ready**: DNS access for database subdomain (e.g., `db.reentrymap.org`)
- [ ] **Downtime scheduled**: Notify users of maintenance window (2-4 hours)
- [ ] **Team available**: DevOps and developer on standby
- [ ] **Rollback plan**: Ability to revert to Supabase quickly

**Estimated Costs After Migration:**
- Server: $0 (already owned)
- Twilio (phone OTP): $10-50/mo
- Backups (Backblaze B2): $5-10/mo
- **Total: ~$20/mo** (vs $100-200/mo with Supabase at scale)

---

## Server Preparation

### 1.1 Update System

```bash
# SSH into your server as root
ssh root@your-server-ip

# Update package lists
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git build-essential software-properties-common
```

### 1.2 Create Database User

```bash
# Create dedicated user for database management
adduser reentry_db
usermod -aG sudo reentry_db

# Set up SSH key authentication (recommended)
su - reentry_db
mkdir -p ~/.ssh
chmod 700 ~/.ssh
# Add your public key to ~/.ssh/authorized_keys
```

### 1.3 Configure Firewall

```bash
# Allow PostgreSQL port (only from your app servers)
ufw allow from YOUR_APP_SERVER_IP to any port 5432
ufw allow from YOUR_VERCEL_IP_RANGE to any port 5432

# Allow SSH
ufw allow OpenSSH

# Enable firewall
ufw enable
ufw status
```

**Important**: If using Vercel, you'll need to whitelist their IP ranges:
- Get IPs: https://vercel.com/docs/concepts/edge-network/overview#firewall-rules
- Or use connection pooler with public endpoint + SSL

---

## PostgreSQL Installation & Configuration

### 2.1 Install PostgreSQL 16

```bash
# Add PostgreSQL APT repository
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -

# Update and install
apt update
apt install -y postgresql-16 postgresql-contrib-16

# Verify installation
psql --version  # Should show PostgreSQL 16.x
```

### 2.2 Configure PostgreSQL for Production

**Edit `/etc/postgresql/16/main/postgresql.conf`:**

```bash
# Connection Settings
listen_addresses = '*'  # Listen on all interfaces
max_connections = 200   # Adjust based on your RAM (100-500 typical)

# Memory Settings (for 64GB RAM server)
shared_buffers = 16GB              # 25% of RAM
effective_cache_size = 48GB        # 75% of RAM
maintenance_work_mem = 2GB         # For VACUUM, CREATE INDEX
work_mem = 64MB                    # Per-query memory
wal_buffers = 16MB

# Query Planner
random_page_cost = 1.1             # For SSD storage (lower = faster)
effective_io_concurrency = 200     # For SSD

# Write-Ahead Logging (WAL)
wal_level = replica                # For replication (future)
max_wal_senders = 3                # For backups and replicas
checkpoint_completion_target = 0.9
wal_compression = on

# Logging
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_min_duration_statement = 1000  # Log slow queries (>1 second)

# Autovacuum (important for PostGIS)
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 10s
```

**Restart PostgreSQL:**

```bash
systemctl restart postgresql
systemctl status postgresql
```

### 2.3 Secure PostgreSQL

**Edit `/etc/postgresql/16/main/pg_hba.conf`:**

```bash
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections
local   all             postgres                                peer
local   all             all                                     peer

# IPv4 local connections
host    all             all             127.0.0.1/32            scram-sha-256

# IPv4 connections from app servers (replace with your IP)
host    reentry_map     reentry_admin   YOUR_APP_SERVER_IP/32   scram-sha-256

# IPv4 connections via pgBouncer (localhost)
host    reentry_map     reentry_admin   127.0.0.1/32            scram-sha-256

# SSL connections from anywhere (for development, tighten in production)
hostssl reentry_map     reentry_admin   0.0.0.0/0               scram-sha-256

# Reject all other connections
host    all             all             0.0.0.0/0               reject
```

**Restart PostgreSQL:**

```bash
systemctl restart postgresql
```

### 2.4 Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE reentry_map;

# Create user with strong password
CREATE USER reentry_admin WITH PASSWORD 'STRONG_PASSWORD_HERE';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE reentry_map TO reentry_admin;

# Switch to database and grant schema privileges
\c reentry_map
GRANT ALL ON SCHEMA public TO reentry_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO reentry_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO reentry_admin;

# Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO reentry_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO reentry_admin;

# Exit
\q
```

### 2.5 Enable SSL

```bash
# Generate self-signed certificate (for development)
# For production, use Let's Encrypt certificate
cd /var/lib/postgresql/16/main

sudo -u postgres openssl req -new -x509 -days 365 -nodes -text \
  -out server.crt -keyout server.key -subj "/CN=db.reentrymap.org"

sudo -u postgres chmod 600 server.key

# Update postgresql.conf
echo "ssl = on" | sudo tee -a /etc/postgresql/16/main/postgresql.conf
echo "ssl_cert_file = '/var/lib/postgresql/16/main/server.crt'" | sudo tee -a /etc/postgresql/16/main/postgresql.conf
echo "ssl_key_file = '/var/lib/postgresql/16/main/server.key'" | sudo tee -a /etc/postgresql/16/main/postgresql.conf

# Restart
systemctl restart postgresql
```

---

## PostGIS Extension Setup

### 3.1 Install PostGIS

```bash
# Install PostGIS 3.4 for PostgreSQL 16
apt install -y postgresql-16-postgis-3

# Verify installation
apt list --installed | grep postgis
# Should show: postgresql-16-postgis-3
```

### 3.2 Enable PostGIS Extension

```bash
sudo -u postgres psql -d reentry_map

# Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

# Verify installation
SELECT PostGIS_version();
-- Should show: 3.4.x

# Verify spatial reference systems loaded
SELECT count(*) FROM spatial_ref_sys;
-- Should show: 8500+

\q
```

---

## Connection Pooling (pgBouncer)

**Why pgBouncer?** Next.js serverless functions create many short-lived connections. PostgreSQL has limited connection slots (200 max). pgBouncer pools connections efficiently.

### 4.1 Install pgBouncer

```bash
apt install -y pgbouncer

# Verify installation
pgbouncer --version
```

### 4.2 Configure pgBouncer

**Edit `/etc/pgbouncer/pgbouncer.ini`:**

```ini
[databases]
reentry_map = host=127.0.0.1 port=5432 dbname=reentry_map

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 3
max_db_connections = 100
max_user_connections = 100
server_lifetime = 3600
server_idle_timeout = 600
server_connect_timeout = 15
server_login_retry = 15
query_timeout = 0
query_wait_timeout = 120
client_idle_timeout = 0
client_login_timeout = 60
autodb_idle_timeout = 3600
dns_max_ttl = 15
dns_zone_check_period = 0
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
stats_period = 60
verbose = 0
admin_users = postgres
```

**Create user list `/etc/pgbouncer/userlist.txt`:**

```bash
# Generate password hash
echo -n "STRONG_PASSWORD_HEREreentry_admin" | md5sum
# Output: abc123def456...

# Add to userlist.txt (format: "username" "md5<hash>")
echo '"reentry_admin" "md5abc123def456..."' | sudo tee /etc/pgbouncer/userlist.txt

# Secure the file
chmod 600 /etc/pgbouncer/userlist.txt
chown postgres:postgres /etc/pgbouncer/userlist.txt
```

**Alternative: Use SCRAM-SHA-256 (more secure):**

```bash
# Get password hash from PostgreSQL
sudo -u postgres psql -d reentry_map -c "SELECT rolpassword FROM pg_authid WHERE rolname = 'reentry_admin';"

# Add to userlist.txt
echo '"reentry_admin" "SCRAM-SHA-256$..."' | sudo tee /etc/pgbouncer/userlist.txt
```

### 4.3 Start pgBouncer

```bash
# Enable and start pgBouncer
systemctl enable pgbouncer
systemctl start pgbouncer
systemctl status pgbouncer

# Test connection through pgBouncer
psql -h 127.0.0.1 -p 6432 -U reentry_admin -d reentry_map
# Should connect successfully
```

### 4.4 Monitor pgBouncer

```bash
# Connect to pgBouncer admin console
psql -h 127.0.0.1 -p 6432 -U postgres pgbouncer

# Show pools
SHOW POOLS;

# Show databases
SHOW DATABASES;

# Show statistics
SHOW STATS;

# Exit
\q
```

---

## Data Migration

### 5.1 Export from Supabase

**Option 1: pg_dump (Recommended for < 10GB)**

```bash
# Install PostgreSQL client on your local machine
# macOS:
brew install postgresql@16

# Linux:
apt install postgresql-client-16

# Export schema + data from Supabase
pg_dump \
  --host=db.YOUR_PROJECT_ID.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --format=custom \
  --file=supabase_backup_$(date +%Y%m%d).dump \
  --verbose

# Enter Supabase database password when prompted
```

**Option 2: Supabase CLI (Alternative)**

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Export database
supabase db dump --db-url postgresql://postgres:PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres > supabase_backup.sql
```

**Verify backup:**

```bash
# Check file size
ls -lh supabase_backup*.dump
# Should be several MB to GB depending on data

# Test restore to local PostgreSQL (optional)
createdb test_restore
pg_restore --dbname=test_restore --verbose supabase_backup_*.dump
dropdb test_restore  # Clean up test
```

### 5.2 Transfer Backup to Server

```bash
# SCP to your server
scp supabase_backup_*.dump root@YOUR_SERVER_IP:/tmp/

# Or use rsync (faster, resumable)
rsync -avz --progress supabase_backup_*.dump root@YOUR_SERVER_IP:/tmp/
```

### 5.3 Restore to Self-Hosted PostgreSQL

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Restore database
pg_restore \
  --host=127.0.0.1 \
  --port=5432 \
  --username=reentry_admin \
  --dbname=reentry_map \
  --no-owner \
  --no-privileges \
  --verbose \
  /tmp/supabase_backup_*.dump

# If you get permission errors, restore as postgres user first:
sudo -u postgres pg_restore \
  --dbname=reentry_map \
  --no-owner \
  --verbose \
  /tmp/supabase_backup_*.dump

# Then fix ownership
sudo -u postgres psql -d reentry_map -c "REASSIGN OWNED BY postgres TO reentry_admin;"
```

### 5.4 Verify Data Migration

```bash
sudo -u postgres psql -d reentry_map

-- Check table counts
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- Expected tables and approximate counts:
-- resources: 75+
-- users: 10+
-- resource_ratings: 20+
-- resource_reviews: 15+
-- ...

-- Verify PostGIS data
SELECT COUNT(*) FROM resources WHERE location IS NOT NULL;
-- Should match your resource count

-- Verify indexes
\di
-- Should show indexes on location (GIST), categories (GIN), etc.

-- Test spatial query
SELECT name, ST_AsText(location)
FROM resources
WHERE ST_DWithin(
  location::geography,
  ST_MakePoint(-122.2712, 37.8044)::geography,
  10000  -- 10km
)
LIMIT 5;
-- Should return nearby resources

\q
```

### 5.5 Recreate Indexes (If Missing)

```bash
sudo -u postgres psql -d reentry_map

-- Spatial index (GIST)
CREATE INDEX IF NOT EXISTS idx_resources_location
ON resources USING GIST (location);

-- Full-text search index (GIN)
CREATE INDEX IF NOT EXISTS idx_resources_search
ON resources USING GIN (
  to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- Category index (GIN for array)
CREATE INDEX IF NOT EXISTS idx_resources_categories
ON resources USING GIN (categories);

-- Standard B-tree indexes
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources (status);
CREATE INDEX IF NOT EXISTS idx_resources_city ON resources (city);
CREATE INDEX IF NOT EXISTS idx_resources_state ON resources (state);
CREATE INDEX IF NOT EXISTS idx_resources_primary_category ON resources (primary_category);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON resources (created_at DESC);

-- Analyze tables for query planner
ANALYZE resources;
ANALYZE users;
ANALYZE resource_ratings;
ANALYZE resource_reviews;

\q
```

---

## Auth Migration (Phone OTP)

Supabase Auth handles phone OTP automatically. When self-hosting, you need to implement this with Twilio.

### 6.1 Sign Up for Twilio

1. Go to https://www.twilio.com/try-twilio
2. Sign up for free trial ($15 credit)
3. Get phone number ($1/month)
4. Get Account SID and Auth Token
5. Verify your phone number (trial requirement)

### 6.2 Install Twilio SDK

```bash
npm install twilio
npm install @types/twilio --save-dev
```

### 6.3 Create Phone Auth Service

**File: `lib/auth/phone-otp.ts`**

```typescript
import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send OTP via SMS
export async function sendOTP(phone: string, code: string): Promise<boolean> {
  try {
    await client.messages.create({
      body: `Your Reentry Map verification code is: ${code}\n\nThis code expires in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: phone,
    })
    return true
  } catch (error) {
    console.error('Failed to send OTP:', error)
    return false
  }
}

// Verify phone number format (US only for now)
export function isValidPhoneNumber(phone: string): boolean {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '')

  // Check if it's 10 digits (US) or 11 digits (US with country code)
  if (cleaned.length === 10) {
    return /^[2-9]\d{9}$/.test(cleaned)
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return /^1[2-9]\d{9}$/.test(cleaned)
  }

  return false
}

// Format phone number for E.164 (required by Twilio)
export function formatPhoneE164(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')

  if (cleaned.length === 10) {
    return `+1${cleaned}`
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`
  }

  return phone
}
```

### 6.4 Create OTP Storage Table

```sql
-- Store OTPs temporarily (10 min expiry)
CREATE TABLE phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_phone_otps_phone ON phone_otps(phone);
CREATE INDEX idx_phone_otps_expires_at ON phone_otps(expires_at);

-- Auto-delete expired OTPs (cleanup job)
CREATE OR REPLACE FUNCTION delete_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM phone_otps WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

### 6.5 Update API Routes

**File: `app/api/auth/send-otp/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendOTP, generateOTP, isValidPhoneNumber, formatPhoneE164 } from '@/lib/auth/phone-otp'

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()

    // Validate phone number
    if (!isValidPhoneNumber(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    const formattedPhone = formatPhoneE164(phone)

    // Generate OTP
    const code = generateOTP()

    // Store OTP in database
    const supabase = createClient()
    const { error } = await supabase
      .from('phone_otps')
      .insert({
        phone: formattedPhone,
        code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
      })

    if (error) {
      console.error('Failed to store OTP:', error)
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500 }
      )
    }

    // Send OTP via Twilio
    const sent = await sendOTP(formattedPhone, code)

    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**File: `app/api/auth/verify-otp/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatPhoneE164 } from '@/lib/auth/phone-otp'

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json()

    const formattedPhone = formatPhoneE164(phone)

    // Verify OTP
    const supabase = createClient()
    const { data, error } = await supabase
      .from('phone_otps')
      .select('*')
      .eq('phone', formattedPhone)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    // Mark OTP as verified
    await supabase
      .from('phone_otps')
      .update({ verified: true })
      .eq('id', data.id)

    // Create or get user
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', formattedPhone)
      .single()

    if (userError || !user) {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({ phone: formattedPhone, phone_verified: true })
        .select()
        .single()

      if (createError) {
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        )
      }

      user = newUser
    } else {
      // Update phone_verified
      await supabase
        .from('users')
        .update({ phone_verified: true })
        .eq('id', user.id)
    }

    // Create session (implement your session logic here)
    // For now, return user data
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 6.6 Add Environment Variables

```bash
# .env.local
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
```

---

## Storage Migration

If you're using Supabase Storage for user avatars or other files, you have options:

### Option 1: Local Disk Storage (Simplest)

```bash
# Create storage directory
mkdir -p /var/www/reentrymap/storage/avatars
chown -R www-data:www-data /var/www/reentrymap/storage
chmod -R 755 /var/www/reentrymap/storage
```

**File: `lib/storage/local.ts`**

```typescript
import fs from 'fs/promises'
import path from 'path'

const STORAGE_PATH = process.env.STORAGE_PATH || '/var/www/reentrymap/storage'

export async function uploadFile(
  bucket: string,
  filename: string,
  buffer: Buffer
): Promise<string> {
  const bucketPath = path.join(STORAGE_PATH, bucket)
  await fs.mkdir(bucketPath, { recursive: true })

  const filePath = path.join(bucketPath, filename)
  await fs.writeFile(filePath, buffer)

  return `/storage/${bucket}/${filename}`
}

export async function deleteFile(bucket: string, filename: string): Promise<void> {
  const filePath = path.join(STORAGE_PATH, bucket, filename)
  await fs.unlink(filePath)
}

export async function getFile(bucket: string, filename: string): Promise<Buffer> {
  const filePath = path.join(STORAGE_PATH, bucket, filename)
  return await fs.readFile(filePath)
}
```

### Option 2: Wasabi S3 (Cheap, Scalable)

```bash
npm install @aws-sdk/client-s3
```

**Cost**: $5.99/TB/month (vs $25/TB for AWS S3)

### Option 3: Backblaze B2 (Cheapest)

**Cost**: $5/TB/month + $0.01/GB download

---

## Environment Variable Updates

### 7.1 Update `.env.local`

```bash
# Database (update from Supabase to self-hosted)
DATABASE_URL=postgresql://reentry_admin:PASSWORD@YOUR_SERVER_IP:6432/reentry_map?sslmode=require
DIRECT_DATABASE_URL=postgresql://reentry_admin:PASSWORD@YOUR_SERVER_IP:5432/reentry_map?sslmode=require

# Legacy Supabase vars (remove after migration complete)
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...

# Twilio (for phone OTP)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+15551234567

# Storage (if using local)
STORAGE_PATH=/var/www/reentrymap/storage
NEXT_PUBLIC_STORAGE_URL=https://reentrymap.org/storage

# Existing vars (keep)
NEXT_PUBLIC_GOOGLE_MAPS_KEY=...
GOOGLE_MAPS_KEY=...
OPENAI_API_KEY=...
NEXT_PUBLIC_APP_URL=https://reentrymap.org
```

### 7.2 Update Vercel Environment Variables

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Set production environment variables
vercel env add DATABASE_URL production
# Paste: postgresql://reentry_admin:PASSWORD@YOUR_SERVER_IP:6432/reentry_map?sslmode=require

vercel env add TWILIO_ACCOUNT_SID production
vercel env add TWILIO_AUTH_TOKEN production
vercel env add TWILIO_PHONE_NUMBER production

# Remove old Supabase variables
vercel env rm NEXT_PUBLIC_SUPABASE_URL production
vercel env rm NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
vercel env rm SUPABASE_SERVICE_ROLE_KEY production
```

---

## Testing & Validation

### 8.1 Local Testing

```bash
# Update .env.local with new DATABASE_URL
# Test database connection
npm run dev

# Visit http://localhost:3000
# Test:
# - Homepage loads ✓
# - Resources list loads ✓
# - Map displays markers ✓
# - Search works ✓
# - Filter by category works ✓
# - Resource detail page loads ✓
```

### 8.2 Database Performance Testing

```bash
# Connect to database
psql postgresql://reentry_admin:PASSWORD@YOUR_SERVER_IP:6432/reentry_map?sslmode=require

-- Test query performance
EXPLAIN ANALYZE
SELECT * FROM resources
WHERE status = 'active'
AND ST_DWithin(
  location::geography,
  ST_MakePoint(-122.2712, 37.8044)::geography,
  10000
)
LIMIT 20;

-- Should complete in < 100ms
-- Query runtime: ~20-50ms typical

-- Test search query
EXPLAIN ANALYZE
SELECT * FROM resources
WHERE to_tsvector('english', name || ' ' || COALESCE(description, ''))
  @@ to_tsquery('english', 'housing')
AND status = 'active'
LIMIT 20;

-- Should complete in < 100ms
```

### 8.3 Load Testing (Optional)

```bash
# Install k6
brew install k6  # macOS
# Or: https://k6.io/docs/getting-started/installation/

# Create load test script
cat > load-test.js <<EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
};

export default function () {
  // Test homepage
  let res = http.get('https://reentrymap.org');
  check(res, { 'homepage status 200': (r) => r.status === 200 });
  sleep(1);

  // Test resources API
  res = http.get('https://reentrymap.org/api/resources');
  check(res, { 'resources status 200': (r) => r.status === 200 });
  sleep(1);
}
EOF

# Run load test
k6 run load-test.js

# Expected results:
# - 95% of requests < 500ms
# - 0% errors
```

---

## Cutover Plan

### 9.1 Pre-Cutover (1 Week Before)

- [ ] **Final backup**: Export latest Supabase data
- [ ] **DNS TTL**: Lower TTL to 300 seconds (5 min) for fast switchover
- [ ] **Notify users**: Send email about scheduled maintenance
- [ ] **Test restoration**: Verify latest backup restores successfully
- [ ] **Verify certificates**: SSL certificates valid and not expiring soon

### 9.2 Cutover Day (Maintenance Window: 2-4 Hours)

**Recommended time**: Sunday 2-6 AM (lowest traffic)

**Hour 1: Freeze & Export**
- [ ] 2:00 AM: Put Supabase in read-only mode (disable writes via RLS)
- [ ] 2:05 AM: Export final database dump
- [ ] 2:15 AM: Transfer dump to server
- [ ] 2:20 AM: Verify dump integrity

**Hour 2: Restore & Verify**
- [ ] 2:30 AM: Restore to self-hosted PostgreSQL
- [ ] 2:45 AM: Verify row counts match
- [ ] 2:50 AM: Test critical queries (search, map, detail pages)
- [ ] 3:00 AM: Update DNS to point to new database
- [ ] 3:05 AM: Update Vercel environment variables

**Hour 3: Testing**
- [ ] 3:10 AM: Deploy updated Next.js app to Vercel
- [ ] 3:15 AM: Smoke test production:
  - Homepage loads
  - Search works
  - Map displays
  - Resource pages load
  - Phone OTP sends (test with your number)
- [ ] 3:30 AM: Monitor logs for errors
- [ ] 3:45 AM: Test from multiple locations (VPN, mobile)

**Hour 4: Monitoring & Rollback Prep**
- [ ] 4:00 AM: If all tests pass, announce migration complete
- [ ] 4:15 AM: Monitor error rates (Vercel, PostgreSQL logs)
- [ ] 4:30 AM: If errors > 5%, initiate rollback (see below)
- [ ] 5:00 AM: If stable, send "all clear" to team
- [ ] 6:00 AM: Normal operations resume

### 9.3 Post-Cutover (First Week)

- [ ] **Day 1**: Monitor error rates hourly
- [ ] **Day 2**: Check database performance (slow query log)
- [ ] **Day 3**: Verify backups running automatically
- [ ] **Day 7**: Review metrics, optimize queries if needed
- [ ] **Day 30**: If stable, deactivate Supabase project (keep final backup)

---

## Rollback Plan

**If issues arise during cutover, rollback to Supabase:**

### 10.1 Immediate Rollback (< 1 Hour)

```bash
# 1. Revert DNS to Supabase (if changed)
# Update A record to point back to Supabase IP

# 2. Revert Vercel environment variables
vercel env add DATABASE_URL production
# Paste Supabase connection string

vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Paste Supabase URL

# 3. Redeploy previous Vercel deployment
vercel rollback

# 4. Re-enable Supabase writes (remove read-only RLS)

# 5. Notify team and users of rollback
```

**Estimated rollback time**: 15-30 minutes

### 10.2 Data Sync (If New Data Created During Migration)

If users created data during migration window (unlikely at 2 AM):

```bash
# Export data created on self-hosted during cutover
pg_dump \
  --host=YOUR_SERVER_IP \
  --port=6432 \
  --username=reentry_admin \
  --dbname=reentry_map \
  --data-only \
  --table=resources \
  --table=users \
  --table=resource_reviews \
  > delta_data.sql

# Import delta to Supabase
psql \
  --host=db.YOUR_PROJECT_ID.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  < delta_data.sql
```

---

## Post-Migration Monitoring

### 11.1 Set Up Monitoring

**Option 1: Prometheus + Grafana (Self-Hosted, Free)**

```bash
# Install Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*

# Configure Prometheus
cat > prometheus.yml <<EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'postgresql'
    static_configs:
      - targets: ['localhost:9187']  # postgres_exporter

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']  # node_exporter
EOF

# Run Prometheus
./prometheus --config.file=prometheus.yml
```

**Install PostgreSQL Exporter:**

```bash
# Install postgres_exporter
wget https://github.com/prometheus-community/postgres_exporter/releases/download/v0.13.2/postgres_exporter-0.13.2.linux-amd64.tar.gz
tar xvfz postgres_exporter-*.tar.gz

# Set database connection
export DATA_SOURCE_NAME="postgresql://reentry_admin:PASSWORD@localhost:5432/reentry_map?sslmode=disable"

# Run exporter
./postgres_exporter
```

**Install Grafana:**

```bash
# Add Grafana APT repository
apt-get install -y apt-transport-https software-properties-common
wget -q -O - https://packages.grafana.com/gpg.key | apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" | tee /etc/apt/sources.list.d/grafana.list

# Install Grafana
apt-get update
apt-get install -y grafana

# Start Grafana
systemctl enable grafana-server
systemctl start grafana-server

# Access at http://YOUR_SERVER_IP:3000
# Default login: admin / admin
```

**Import PostgreSQL Dashboard:**
1. Go to Dashboards → Import
2. Use ID: 9628 (PostgreSQL Database)
3. Select Prometheus data source
4. Import

**Option 2: Cloud Monitoring (Paid, Easier)**

- **DataDog**: $15/host/month
- **New Relic**: $99/month (free tier available)
- **Grafana Cloud**: Free tier: 10k series

### 11.2 Set Up Alerts

**Critical Alerts (PagerDuty, Email, SMS):**
- Database down (can't connect)
- Disk usage > 90%
- Connection pool exhausted
- Replication lag > 10 seconds (if using replicas)

**Warning Alerts (Email):**
- Slow queries > 1 second
- Connection pool > 80% full
- Disk usage > 80%
- Query errors > 10/minute

**Example: Email Alert for Disk Usage**

```bash
# Create monitoring script
cat > /usr/local/bin/check_disk.sh <<'EOF'
#!/bin/bash
THRESHOLD=80
USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

if [ "$USAGE" -gt "$THRESHOLD" ]; then
  echo "Disk usage is ${USAGE}% (threshold: ${THRESHOLD}%)" | mail -s "ALERT: High Disk Usage" admin@reentrymap.org
fi
EOF

chmod +x /usr/local/bin/check_disk.sh

# Add cron job (check every hour)
echo "0 * * * * /usr/local/bin/check_disk.sh" | crontab -
```

### 11.3 Backup Schedule

**Automated Daily Backups:**

```bash
# Create backup script
cat > /usr/local/bin/backup_postgres.sh <<'EOF'
#!/bin/bash
BACKUP_DIR=/backups/postgresql
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Dump database
pg_dump -h localhost -U reentry_admin -d reentry_map -Fc -f $BACKUP_DIR/reentry_map_$DATE.dump

# Compress
gzip $BACKUP_DIR/reentry_map_$DATE.dump

# Delete old backups (keep 30 days)
find $BACKUP_DIR -name "*.dump.gz" -mtime +$RETENTION_DAYS -delete

# Upload to Backblaze B2 (optional)
# b2 sync $BACKUP_DIR b2://your-bucket/postgresql/
EOF

chmod +x /usr/local/bin/backup_postgres.sh

# Schedule daily at 2 AM
echo "0 2 * * * /usr/local/bin/backup_postgres.sh" | crontab -
```

**Test Restore:**

```bash
# Quarterly test: Restore to test database
createdb reentry_map_test
pg_restore -d reentry_map_test /backups/postgresql/reentry_map_LATEST.dump.gz
dropdb reentry_map_test
```

---

## Migration Checklist Summary

### Pre-Migration
- [ ] Server provisioned and configured
- [ ] PostgreSQL 16 installed
- [ ] PostGIS extension enabled
- [ ] pgBouncer configured
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Twilio account created
- [ ] Backup downloaded from Supabase

### Migration Day
- [ ] Supabase in read-only mode
- [ ] Final export completed
- [ ] Data restored to self-hosted
- [ ] Row counts verified
- [ ] Indexes recreated
- [ ] Performance tested
- [ ] DNS updated
- [ ] Vercel env vars updated
- [ ] Deployment successful
- [ ] Smoke tests passed

### Post-Migration
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Backups scheduled
- [ ] Performance baseline established
- [ ] Documentation updated
- [ ] Team trained on new setup
- [ ] Supabase project deactivated (after 30 days)

---

## Cost Savings Summary

| Item | Supabase (Year 1) | Self-Hosted (Year 1) | Savings |
|------|-------------------|----------------------|---------|
| Database | $1,200 | $0 | $1,200 |
| Hosting | $0 | $0 | $0 |
| SMS (Twilio) | $600 | $600 | $0 |
| Backups | $0 | $120 | -$120 |
| **Total** | **$1,800** | **$720** | **$1,080** |

**ROI**: Migration effort (~80 hours) pays for itself in 6 months of cost savings.

---

## Troubleshooting

### Connection Errors

**Error**: `FATAL: password authentication failed`

**Fix**: Verify password in pg_hba.conf and userlist.txt

```bash
sudo -u postgres psql
\password reentry_admin
# Enter new password

# Update pgbouncer userlist
echo -n "PASSWORDreentry_admin" | md5sum
# Update /etc/pgbouncer/userlist.txt
systemctl restart pgbouncer
```

### Performance Issues

**Error**: Queries taking > 1 second

**Fix**: Check missing indexes

```sql
-- Find missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
AND tablename = 'resources'
ORDER BY abs(correlation) DESC;

-- Create missing index
CREATE INDEX idx_resources_missing ON resources(column_name);
ANALYZE resources;
```

### Connection Pool Exhausted

**Error**: `sorry, too many clients already`

**Fix**: Increase pgBouncer pool size

```bash
# Edit /etc/pgbouncer/pgbouncer.ini
default_pool_size = 50  # Increase from 25
max_client_conn = 2000  # Increase from 1000

systemctl restart pgbouncer
```

---

## Next Steps After Migration

1. **Implement Redis caching** (see REDIS_SETUP_GUIDE.md)
2. **Optimize queries** (see PERFORMANCE_OPTIMIZATION_CHECKLIST.md)
3. **Set up read replicas** (for scaling beyond 100k users)
4. **Consider moving Next.js to self-hosted** (save $200-500/mo)

---

**Questions?** Open an issue or contact the dev team.

**Last Updated**: 2025-11-10
