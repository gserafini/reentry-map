'use client'

import { useRouter } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import { ResourceForm } from '@/components/admin/ResourceForm'
import type { Database } from '@/lib/types/database'

type Resource = Database['public']['Tables']['resources']['Row']
type ResourceInsert = Database['public']['Tables']['resources']['Insert']

interface EditResourceClientProps {
  resource: Resource
}

export function EditResourceClient({ resource }: EditResourceClientProps) {
  const router = useRouter()

  async function handleSubmit(data: Partial<ResourceInsert>) {
    try {
      const response = await fetch(`/api/admin/resources/${resource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = (await response.json()) as { error?: string }
        return { success: false, error: result.error || 'Failed to update resource' }
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
