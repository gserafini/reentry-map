import { readFileSync } from 'node:fs'
import { parse } from 'dotenv'
import postgres from 'postgres'
import { getTargetConfig } from './targets.mjs'

export const publicResourceColumns = [
  'id',
  'name',
  'slug',
  'org_name',
  'description',
  'services_offered',
  'phone',
  'email',
  'website',
  'address',
  'city',
  'state',
  'zip',
  'latitude',
  'longitude',
  'county',
  'county_fips',
  'address_type',
  'service_area',
  'hours',
  'timezone',
  'primary_category',
  'categories',
  'tags',
  'eligibility_requirements',
  'accepts_records',
  'appointment_required',
  'required_documents',
  'fees',
  'languages',
  'accessibility_features',
  'rating_average',
  'rating_count',
  'review_count',
  'verified',
  'verified_date',
  'ai_last_verified',
  'last_verified_at',
  'verification_status',
  'ai_discovered',
  'ai_enriched',
  'source',
  'status',
]
const jsonColumns = new Set(['service_area', 'hours'])
export function assertStagingConnection(connection) {
  const url = new URL(connection)
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    [...url.searchParams.keys()].some((key) => !['ssl', 'sslmode'].includes(key)) ||
    url.pathname !== '/reentry_map_staging'
  )
    throw Error(
      'Refusing dataset refresh: use a postgres:// or postgresql:// URL for the local reentry_map_staging database. Remove query parameters other than ssl or sslmode; database/options overrides are forbidden.'
    )
}
export async function refreshStagingResources({ dryRun = true } = {}) {
  const target = getTargetConfig('staging'),
    source = getTargetConfig('production')
  const targetUrl = parse(readFileSync(target.cwd + '/.env.local')).DATABASE_URL
  const sourceUrl = parse(readFileSync(source.cwd + '/.env.local')).DATABASE_URL
  assertStagingConnection(targetUrl)
  if (targetUrl === sourceUrl) throw Error('Source and staging database must differ.')
  const prod = postgres(sourceUrl),
    stage = postgres(targetUrl)
  try {
    const rows =
      await prod`SELECT ${prod(publicResourceColumns)} FROM resources WHERE status='active'`
    if (!rows.length) throw Error('No active production resources: refusing empty refresh.')
    const [{ count }] = await stage`SELECT COUNT(*) AS count FROM resources WHERE status='active'`
    console.log(
      JSON.stringify({
        source: 'public active production listings',
        destination: 'reentry_map_staging',
        sourceCount: rows.length,
        previousActiveCount: Number(count),
        dryRun,
      })
    )
    if (dryRun) return
    const actual = await stage.begin(async (tx) => {
      await tx`CREATE TABLE IF NOT EXISTS resources_before_ux_refresh AS SELECT * FROM resources`
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows
          .slice(i, i + 100)
          .map((row) =>
            Object.fromEntries(
              publicResourceColumns.map((key) => [
                key,
                jsonColumns.has(key) && row[key] != null ? tx.json(row[key]) : row[key],
              ])
            )
          )
        const updates = publicResourceColumns
          .filter((key) => key !== 'id')
          .map((key) => '"' + key + '"=EXCLUDED."' + key + '"')
          .join(',')
        await tx`INSERT INTO resources ${tx(batch, publicResourceColumns)} ON CONFLICT (id) DO UPDATE SET ${tx.unsafe(updates)}`
      }
      await tx`UPDATE resources SET status='inactive' WHERE status='active' AND NOT (id=ANY(${rows.map((r) => r.id)}::uuid[]))`
      const [{ count: refreshedCount }] =
        await tx`SELECT COUNT(*) AS count FROM resources WHERE status='active'`
      if (Number(refreshedCount) !== rows.length)
        throw Error('Staging count differs after refresh; the transaction was rolled back.')
      return Number(refreshedCount)
    })
    console.log(
      'Verified ' +
        actual +
        ' active staging listings. Original staging snapshot preserved in resources_before_ux_refresh.'
    )
  } finally {
    await Promise.all([prod.end(), stage.end()])
  }
}
