'use client'

import { useRouter } from 'next/navigation'
import { List, ListItem, ListItemText } from '@mui/material'

interface QuickAction {
  href: string
  primary: string
  secondary: string
}

interface QuickActionsListProps {
  pendingSuggestions: number
}

export function QuickActionsList({ pendingSuggestions }: QuickActionsListProps) {
  const router = useRouter()

  const actions: QuickAction[] = [
    {
      href: '/admin/resources/new',
      primary: 'Add New Resource',
      secondary: 'Create a new resource entry',
    },
    {
      href: '/admin/resources',
      primary: 'Manage Resources',
      secondary: 'View, edit, and delete resources',
    },
    {
      href: '/admin/suggestions',
      primary: 'Review Suggestions',
      secondary: `${pendingSuggestions || 0} pending suggestions`,
    },
    {
      href: '/admin/settings',
      primary: 'Application Settings',
      secondary: 'Configure authentication and features',
    },
  ]

  return (
    <List>
      {actions.map((action) => (
        <ListItem
          key={action.href}
          onClick={() => router.push(action.href)}
          sx={{
            borderRadius: 1,
            mb: 1,
            '&:hover': { bgcolor: 'action.hover' },
            cursor: 'pointer',
          }}
        >
          <ListItemText primary={action.primary} secondary={action.secondary} />
        </ListItem>
      ))}
    </List>
  )
}
