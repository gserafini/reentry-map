# Progress Report: 2026-01-28 - Self-hosted deployment on dc3-1

## Session Summary


Deployed reentry-map to dc3-1 with PM2, configured PostgreSQL 16 with PostGIS and pgBouncer, set up cPanel proxy for reentrymap.org

## What Was Done

- Install PostgreSQL 16 via PGDG
- Migrate PG10 databases to PG16
- Install PostGIS 3.5
- Create reentry_map database
- Configure SSL and remote access
- Set up pgBouncer connection pooling
- Deploy Next.js app with PM2
- Configure cPanel proxy for domain

## Next Steps

1. [ ] Fix WHM process monitor for PostgreSQL 16
2. [ ] Phase 2-4 code migration (Supabase to PostgreSQL)
3. [ ] Plan AlmaLinux 8→9 upgrade
