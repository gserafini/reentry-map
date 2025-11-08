'use client'

import { ListItem, ListItemProps } from '@mui/material'
import { useRouter } from 'next/navigation'

interface ClickableListItemProps extends Omit<ListItemProps, 'onClick'> {
  href: string
}

export function ClickableListItem({ href, children, sx, ...props }: ClickableListItemProps) {
  const router = useRouter()

  return (
    <ListItem
      {...props}
      onClick={() => router.push(href)}
      sx={{
        cursor: 'pointer',
        ...sx,
      }}
    >
      {children}
    </ListItem>
  )
}
