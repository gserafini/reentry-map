'use client'

import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { SessionProvider } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { LocationProvider } from '@/lib/context/LocationContext'
import { PWAWrapper } from '@/components/pwa/PWAWrapper'

// Create MUI theme with dark mode support
const lightTheme = createTheme({
  palette: {
    mode: 'light',
  },
})

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
})

function MuiThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Prevent hydration mismatch by rendering light theme on server
    return <MuiThemeProvider theme={lightTheme}>{children}</MuiThemeProvider>
  }

  const currentTheme = theme === 'system' ? systemTheme : theme
  const muiTheme = currentTheme === 'dark' ? darkTheme : lightTheme

  return <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <MuiThemeWrapper>
          <CssBaseline />
          <LocationProvider>
            {children}
            <PWAWrapper />
          </LocationProvider>
        </MuiThemeWrapper>
      </NextThemesProvider>
    </SessionProvider>
  )
}
