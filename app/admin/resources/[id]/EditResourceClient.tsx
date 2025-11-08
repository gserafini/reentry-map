'use client'

import { useRouter } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import { ResourceForm } from '@/components/admin/ResourceForm'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type Resource = Database['public']['Tables']['resources']['Row']
type ResourceInsert = Database['public']['Tables']['resources']['Insert']

interface EditResourceClientProps {
  resource: Resource
}

export function EditResourceClient({ resource }: EditResourceClientProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(data: Partial<ResourceInsert>) {
    try {
      const { error } = await supabase.from('resources').update(data).eq('id', resource.id)

      if (error) {
        console.error('Error updating resource:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err) {
      console.error('Unexpected error:', err)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  function handleCancel() {
    router.push('/admin/resources')
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Edit Resource
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Update information for {resource.name}
      </Typography>

      <ResourceForm resource={resource} onSubmit={handleSubmit} onCancel={handleCancel} />
    </Box>
  )
}
