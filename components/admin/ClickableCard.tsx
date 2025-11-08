'use client'

import { Card, CardProps } from '@mui/material'
import { useRouter } from 'next/navigation'

interface ClickableCardProps extends Omit<CardProps, 'onClick'> {
  href: string
}

export function ClickableCard({ href, children, sx, ...props }: ClickableCardProps) {
  const router = useRouter()

  return (
    <Card
      {...props}
      onClick={() => router.push(href)}
      sx={{
        cursor: 'pointer',
        ...sx,
      }}
    >
      {children}
    </Card>
  )
}
