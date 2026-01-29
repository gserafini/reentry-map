# Migration Plan: Supabase → Self-Hosted PostgreSQL on dc3-1

**Project**: reentry-map
**Target**: dc3-1.serafinihosting.com (PostgreSQL already running)
**Complexity**: High (auth replacement, 17+ tables, PostGIS, realtime)
**Timeline**: 3-4 weeks (phased)
**Downtime**: 2-4 hours during cutover

---

## Current Dependencies Summary

| Service      | Usage                               | Replacement                   |
| ------------ | ----------------------------------- | ----------------------------- |
| **Auth**     | Phone OTP, Email/Password, Sessions | NextAuth.js + Twilio          |
| **Database** | 17+ tables, PostGIS, 31 migrations  | Direct PostgreSQL on dc3-1    |
| **Realtime** | Verification events (admin only)    | Polling or SSE                |
| **Storage**  | Not implemented                     | N/A                           |
| **RLS**      | 30+ policies                        | Application-level auth checks |

---

## Phase 1: Infrastructure Preparation (3 days)

### Tasks

1. Create `reentrymap` user on dc3-1
2. Create PostgreSQL database: `reentry_map`
3. Install/verify PostGIS extension
4. Configure pgBouncer for connection pooling (critical for Vercel)
5. Set up SSL for remote connections
6. Open firewall for Vercel IP ranges

### Server Commands

```bash
# SSH to dc3-1
ssh -p 22022 root@dc3-1.serafinihosting.com

# Create user and database
sudo -u postgres createuser reentrymap
sudo -u postgres createdb -O reentrymap reentry_map
sudo -u postgres psql -c "CREATE EXTENSION postgis;" reentry_map
```

### Verification

- [ ] PostgreSQL accessible from local machine
- [ ] PostGIS extension enabled
- [ ] pgBouncer configured (port 6432)
- [ ] SSL working

---

## Phase 2: Auth Migration (4 days)

### Strategy: NextAuth.js with Custom Twilio Provider

**Why NextAuth.js**:

- Built-in session management (JWT/cookies)
- PostgreSQL adapter available
- TypeScript support
- Middleware integration

### New Dependencies

```bash
npm install next-auth @auth/pg-adapter twilio
```

### New Files to Create

| File                                  | Purpose                        |
| ------------------------------------- | ------------------------------ |
| `lib/auth/config.ts`                  | NextAuth configuration         |
| `lib/auth/twilio-provider.ts`         | Phone OTP credentials provider |
| `app/api/auth/[...nextauth]/route.ts` | Auth API routes                |
| `app/api/auth/otp/send/route.ts`      | Send OTP via Twilio            |

### New Database Table

```sql
CREATE TABLE phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_phone_otps_phone ON phone_otps(phone);
```

### Files to Modify

| File                            | Changes                          |
| ------------------------------- | -------------------------------- |
| `lib/supabase/middleware.ts`    | Replace with NextAuth middleware |
| `lib/hooks/useAuth.ts`          | Replace with `useSession()`      |
| `components/auth/PhoneAuth.tsx` | Update to NextAuth OTP flow      |
| `components/login-form.tsx`     | Update to NextAuth signIn()      |
| `lib/utils/admin-auth.ts`       | Update session checks            |

### Verification

- [ ] Phone OTP login works
- [ ] Email/password login works
- [ ] Sessions persist across page refreshes
- [ ] Admin routes protected
- [ ] Sign out works

---

## Phase 3: Database Client Migration (4 days)

### Strategy: Drizzle ORM (Recommended)

**Why Drizzle**:

- Type-safe queries
- PostgreSQL native
- Good PostGIS support
- Familiar SQL-like syntax

### New Dependencies

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

### New Files to Create

| File                          | Purpose                    |
| ----------------------------- | -------------------------- |
| `lib/db/schema.ts`            | Drizzle schema definitions |
| `lib/db/client.ts`            | Database client singleton  |
| `lib/db/queries/resources.ts` | Resource query functions   |
| `drizzle.config.ts`           | Drizzle configuration      |

### Files to Modify (55 total)

**Priority 1 - Core APIs**:

- `lib/api/resources.ts` - Resource queries with PostGIS
- `lib/api/favorites.ts` - Favorites CRUD
- `lib/api/ratings.ts` - Ratings CRUD
- `lib/api/reviews.ts` - Reviews CRUD

**Priority 2 - Admin Routes** (26 files in `app/api/admin/`)

**Priority 3 - AI Agents** (`lib/ai-agents/*.ts`)

### RLS Migration

**Strategy**: Application-level authorization (not PostgreSQL RLS)

- Add auth checks in API route handlers
- Use middleware for route protection
- Simpler to debug and test

### Verification

- [ ] All CRUD operations work
- [ ] PostGIS `get_resources_near()` works
- [ ] Admin authorization enforced
- [ ] No Supabase client imports remain

---

## Phase 4: Realtime Replacement (2-3 days)

### Current Usage

Only `RealtimeVerificationViewer.tsx` uses Supabase Realtime for admin command center.

### Strategy: Polling (Simple) or SSE (Better UX)

**Option A: Polling** (Recommended for simplicity)

```typescript
// Poll every 5 seconds
useEffect(() => {
  const interval = setInterval(fetchEvents, 5000)
  return () => clearInterval(interval)
}, [])
```

**Option B: Server-Sent Events**

- New route: `app/api/admin/verification-events/stream/route.ts`
- Better UX but more complex

### Files to Modify

- `components/admin/RealtimeVerificationViewer.tsx`

### Verification

- [ ] Verification events appear in admin UI
- [ ] No Supabase realtime imports remain

---

## Phase 5: Data Migration (3 days)

### Export from Supabase

```bash
pg_dump \
  --host=db.scvshbntarpyjvdexpmp.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --format=custom \
  --file=supabase_backup_$(date +%Y%m%d).dump
```

### Apply Schema on dc3-1

1. Run all 31 migrations from `supabase/migrations/`
2. Modify `users` table (remove auth.users FK)
3. Create NextAuth tables
4. Create `phone_otps` table

### Import Data

```bash
pg_restore \
  --host=localhost \
  --port=5432 \
  --username=reentrymap \
  --dbname=reentry_map \
  --no-owner \
  --no-privileges \
  supabase_backup.dump
```

### User Migration

- Export `auth.users` from Supabase
- Map to new `users` table structure
- Phone users: re-verify via OTP on first login
- Email users: require password reset

### Verification

- [ ] Row counts match Supabase
- [ ] All indexes created
- [ ] PostGIS spatial queries work
- [ ] Foreign keys intact

---

## Phase 6: Environment & Deployment (3-4 days)

### Environment Variables

**Remove**:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

**Add**:

```
DATABASE_URL=postgresql://reentrymap:PASSWORD@dc3-1.domain.com:6432/reentry_map
DIRECT_DATABASE_URL=postgresql://reentrymap:PASSWORD@dc3-1.domain.com:5432/reentry_map
NEXTAUTH_URL=https://reentrymap.org
NEXTAUTH_SECRET=<generated>
TWILIO_ACCOUNT_SID=<from_twilio>
TWILIO_AUTH_TOKEN=<from_twilio>
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

### Update Files

- `lib/env.ts` - Update schema for new variables
- `.env.example` - Document new variables
- Vercel dashboard - Update production/preview env vars

### Verification

- [ ] Preview deployment works
- [ ] Database connects from Vercel
- [ ] All features work in preview

---

## Phase 7: Cutover (4-6 hours)

### Pre-Cutover (1 week before)

- [ ] Lower DNS TTL to 300s
- [ ] Notify users of maintenance window
- [ ] Test rollback procedure
- [ ] Final verification of self-hosted setup

### Cutover Day (Sunday 2-6 AM recommended)

| Time | Action                         |
| ---- | ------------------------------ |
| 2:00 | Enable Supabase read-only mode |
| 2:10 | Export final database dump     |
| 2:30 | Import to dc3-1 PostgreSQL     |
| 2:45 | Verify row counts              |
| 3:00 | Update Vercel env vars         |
| 3:05 | Deploy to production           |
| 3:15 | Smoke test all features        |
| 3:30 | Monitor for errors             |
| 4:00 | If stable, announce completion |

### Rollback (if needed)

1. Revert Vercel env vars to Supabase
2. Run `vercel rollback`
3. Re-enable Supabase writes
4. Estimated time: 15-30 minutes

---

## Phase 8: Post-Migration (5 days)

### Monitoring Setup

- PostgreSQL metrics (connections, queries, disk)
- Application error tracking
- Backup verification

### Backup Automation

```bash
# Daily backup cron
0 3 * * * pg_dump -Fc reentry_map > /home/reentrymap/backups/reentry_map_$(date +\%Y\%m\%d).dump
```

### Decommission Supabase (Day 30+)

- Keep active 30 days as fallback
- Archive final backup
- Delete project

---

## Effort Summary

| Phase              | Duration      | Hours      |
| ------------------ | ------------- | ---------- |
| 1. Infrastructure  | 3 days        | 8-12       |
| 2. Auth Migration  | 4 days        | 20-30      |
| 3. Database Client | 4 days        | 16-24      |
| 4. Realtime        | 2-3 days      | 6-10       |
| 5. Data Migration  | 3 days        | 8-12       |
| 6. Environment     | 3-4 days      | 12-16      |
| 7. Cutover         | 1 day         | 4-6        |
| 8. Post-Migration  | 5 days        | 12-16      |
| **Total**          | **3-4 weeks** | **86-126** |

---

## Decisions (Finalized)

1. **Auth Library**: NextAuth.js + Twilio ✓
2. **Database ORM**: Drizzle ORM ✓
3. **Realtime**: Polling (5-second interval) ✓
4. **Timeline**: Start immediately
