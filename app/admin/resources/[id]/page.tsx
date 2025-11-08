import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditResourceClient } from './EditResourceClient'

export default async function EditResourcePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: resource, error } = await supabase
    .from('resources')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !resource) {
    notFound()
  }

  return <EditResourceClient resource={resource} />
}
