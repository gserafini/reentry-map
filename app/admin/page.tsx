'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Container, Typography, Box, Grid, CircularProgress } from '@mui/material'
import { Dashboard as DashboardIcon } from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { checkCurrentUserIsAdmin } from '@/lib/utils/admin'
import {
  HeroStats,
  RealTimeOperations,
  PendingActions,
  SystemHealth,
  ResearchMission,
  CoverageSnapshot,
  ActivityFeed,
  CostPanel,
} from '@/components/admin/CommandCenter'

export default function AdminDashboardPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  // Check admin status
  useEffect(() => {
    async function checkAdmin() {
      if (!authLoading && !isAuthenticated) {
        router.push('/auth/login?redirect=/admin')
        return
      }

      if (user) {
        const adminStatus = await checkCurrentUserIsAdmin()
        setIsAdmin(adminStatus)

        if (!adminStatus) {
          router.push('/')
        }

        setCheckingAdmin(false)
      }
    }

    checkAdmin()
  }, [user, authLoading, isAuthenticated, router])

  if (authLoading || checkingAdmin) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <DashboardIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Command Center
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Real-time operations dashboard with live metrics and system controls
        </Typography>
      </Box>

      {/* Hero Stats - Full Width */}
      <HeroStats />

      {/* Main Dashboard Grid */}
      <Grid container spacing={3}>
        {/* Row 1: Real-Time Operations (8 cols) + Pending Actions (4 cols) */}
        <Grid size={{ xs: 12, md: 8 }}>
          <RealTimeOperations />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <PendingActions />
        </Grid>

        {/* Row 2: System Health (6 cols) + Research Mission (6 cols) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <SystemHealth />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ResearchMission />
        </Grid>

        {/* Row 3: Coverage Snapshot (6 cols) + Cost Panel (6 cols) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <CoverageSnapshot />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <CostPanel />
        </Grid>

        {/* Row 4: Activity Feed - Full Width */}
        <Grid size={{ xs: 12 }}>
          <ActivityFeed />
        </Grid>
      </Grid>
    </Container>
  )
}
