import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Box } from '@mui/material'
import { env } from '@/lib/env'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
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
  const session = await getServerSession(authOptions)
  const userEmail = session?.user?.email ?? undefined
  const isAuthenticated = !!session?.user
  const isAdmin = session?.user?.isAdmin ?? false

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <Providers>
          {isAdmin && <AdminStatusBar />}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100vh',
              pt: isAdmin ? '32px' : 0, // Top padding only when admin status bar is visible
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
