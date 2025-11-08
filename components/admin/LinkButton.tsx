'use client'

import { Button, ButtonProps } from '@mui/material'
import { useRouter } from 'next/navigation'

interface LinkButtonProps extends Omit<ButtonProps, 'onClick'> {
  href: string
}

export function LinkButton({ href, children, ...props }: LinkButtonProps) {
  const router = useRouter()

  return (
    <Button {...props} onClick={() => router.push(href)}>
      {children}
    </Button>
  )
}
