import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Box } from '@mui/material'
import { env } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'
import { Providers } from './providers'
import { ClientAppBar } from '@/components/layout/ClientAppBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { AuthButton } from '@/components/auth-button'
import '../styles/tailwind.css'

const defaultUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003'

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'Reentry Map - Find Resources for Reentry',
  description:
    'Find employment, housing, food, healthcare, and support services in your community. Mobile-first resource directory for individuals navigating reentry.',
  keywords: [
    'reentry',
    'resources',
    'employment',
    'housing',
    'support services',
    'Oakland',
    'community resources',
    'criminal justice',
    'second chances',
    'reentry services',
    'resource directory',
    'job assistance',
    'housing assistance',
    'food assistance',
    'healthcare services',
    'legal aid',
    'mental health',
    'substance abuse treatment',
  ],
  icons: {
    icon: '/ReentryMap_favicon.png',
    apple: '/ReentryMap_favicon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: defaultUrl,
    siteName: 'Reentry Map',
    title: 'Reentry Map - Find Resources for Reentry',
    description:
      'Find employment, housing, food, healthcare, and support services in your community. Mobile-first resource directory for individuals navigating reentry.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reentry Map - Find Resources for Reentry',
    description:
      'Find employment, housing, food, healthcare, and support services in your community. Mobile-first resource directory for individuals navigating reentry.',
  },
}

const geistSans = Geist({
  variable: '--font-geist-sans',
  display: 'swap',
  subsets: ['latin'],
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userEmail = data?.claims?.email
  const isAuthenticated = !!userEmail

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <Providers>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100vh',
            }}
          >
            <ClientAppBar
              authButton={<AuthButton userEmail={userEmail} />}
              isAuthenticated={isAuthenticated}
            />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                pb: { xs: 7, md: 0 }, // padding-bottom for mobile bottom nav
              }}
            >
              {children}
            </Box>
            <BottomNav />
          </Box>
        </Providers>
      </body>
    </html>
  )
}
