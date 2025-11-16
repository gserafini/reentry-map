import type { Metadata } from 'next'
import { Box } from '@mui/material'
import { env } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'
import { Providers } from './providers'
import { ClientAppBar } from '@/components/layout/ClientAppBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Footer } from '@/components/layout/Footer'
import { AuthButton } from '@/components/auth-button'
import { AdminStatusBar } from '@/components/admin/AdminStatusBar'
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userEmail = data?.claims?.email
  const isAuthenticated = !!userEmail

  // Fetch user profile to check admin status
  // Gracefully fail if profile can't be loaded - admin menu just won't show
  let isAdmin = false
  if (isAuthenticated) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle()

        // Only log errors if they're meaningful (not empty objects or PGRST116 not found)
        if (profileError && profileError.code !== 'PGRST116') {
          if (Object.keys(profileError).length > 0) {
            console.warn('Could not fetch admin status:', profileError.message || profileError)
          }
        }

        isAdmin = profile?.is_admin ?? false
      }
    } catch {
      // Silently fail - admin menu just won't show on first load
      // User can still access /admin directly if they are admin
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          <AdminStatusBar />
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100vh',
              pt: { xs: '32px', md: '32px' }, // Top padding for admin status bar (when visible)
            }}
          >
            <ClientAppBar
              authButton={<AuthButton userEmail={userEmail} isAdmin={isAdmin} />}
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
            <Footer />
            <BottomNav />
          </Box>
        </Providers>
      </body>
    </html>
  )
}
