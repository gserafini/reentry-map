'use client'

import { useRouter } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import { ResourceForm } from '@/components/admin/ResourceForm'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type ResourceInsert = Database['public']['Tables']['resources']['Insert']

export default function NewResourcePage() {
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(data: Partial<ResourceInsert>) {
    try {
      const { error } = await supabase.from('resources').insert({
        ...data,
        status: data.status || 'active',
        primary_category: data.primary_category || 'general_support',
      } as ResourceInsert)

      if (error) {
        console.error('Error creating resource:', error)
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
        Add New Resource
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Create a new resource entry for the directory.
      </Typography>

      <ResourceForm onSubmit={handleSubmit} onCancel={handleCancel} />
    </Box>
  )
}
