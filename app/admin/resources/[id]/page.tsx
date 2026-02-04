import { notFound } from 'next/navigation'
import { sql } from '@/lib/db/client'
import type { Resource } from '@/lib/types/database'
import { EditResourceClient } from './EditResourceClient'

export default async function EditResourcePage({ params }: { params: { id: string } }) {
  const rows = await sql<Resource[]>`
    SELECT * FROM resources WHERE id = ${params.id} LIMIT 1
  `
  const resource = rows[0]

  if (!resource) {
    notFound()
  }

  return <EditResourceClient resource={resource} />
}
