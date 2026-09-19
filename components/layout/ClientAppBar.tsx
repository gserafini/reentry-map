'use client'

import { usePathname } from 'next/navigation'
import { AppBar } from './AppBar'

export function ClientAppBar({
  authButton,
  isAuthenticated = false,
}: {
  authButton?: React.ReactNode
  isAuthenticated?: boolean
}) {
  const pathname = usePathname()
  const focusedTask =
    /^\/(favorites|offline|profile|my-suggestions|suggest-resource|auth|admin)(\/|$)/.test(pathname)
  return (
    <AppBar
      authButton={authButton}
      showSearch={pathname !== '/' && !focusedTask}
      isAuthenticated={isAuthenticated}
    />
  )
}
