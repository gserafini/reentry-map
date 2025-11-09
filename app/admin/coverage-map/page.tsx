import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CoverageMapDashboard } from '@/components/admin/CoverageMapDashboard'

export const metadata: Metadata = {
  title: 'Coverage Map | Admin | Reentry Map',
  description: 'Geographic coverage tracking and metrics for reentry resources',
}

export default async function CoverageMapPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth')
  }

  // Check admin status
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.is_admin) {
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
