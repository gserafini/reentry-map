import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { CoverageMapDashboard } from '@/components/admin/CoverageMapDashboard'

export const metadata: Metadata = {
  title: 'Coverage Map | Admin | Reentry Map',
  description: 'Geographic coverage tracking and metrics for reentry resources',
}

export default async function CoverageMapPage() {
  const session = await getServerSession(authOptions)

  // Check authentication
  if (!session?.user) {
    redirect('/auth')
  }

  // Check admin status (from JWT token populated by NextAuth callbacks)
  if (!session.user.isAdmin) {
    redirect('/') // Redirect non-admins to home
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Coverage Tracking System</h1>
        <p className="mt-2 text-muted-foreground">
          Geographic coverage metrics, resource distribution analysis, and expansion planning for
          reentry resources across the United States.
        </p>
      </div>

      <CoverageMapDashboard />
    </div>
  )
}
