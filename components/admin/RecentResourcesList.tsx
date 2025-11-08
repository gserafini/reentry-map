'use client'

import { useRouter } from 'next/navigation'
import { List, ListItem, ListItemText, Chip, Box } from '@mui/material'

interface Resource {
  id: string
  name: string
  primary_category: string
  status: string
}

interface RecentResourcesListProps {
  resources: Resource[]
}

export function RecentResourcesList({ resources }: RecentResourcesListProps) {
  const router = useRouter()

  if (!resources || resources.length === 0) {
    return null
  }

  return (
    <List>
      {resources.map((resource) => (
        <ListItem
          key={resource.id}
          onClick={() => router.push(`/admin/resources/${resource.id}`)}
          sx={{
            borderRadius: 1,
            mb: 1,
            '&:hover': { bgcolor: 'action.hover' },
            cursor: 'pointer',
          }}
        >
          <ListItemText
            primary={resource.name}
            secondary={
              <Box component="span" sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <Chip label={resource.primary_category} size="small" variant="outlined" />
                <Chip
                  label={resource.status}
                  size="small"
                  color={resource.status === 'active' ? 'success' : 'default'}
                />
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  )
}
