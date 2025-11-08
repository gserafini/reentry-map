'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Container,
  Typography,
  Box,
  Grid2 as Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  LibraryBooks as ResourcesIcon,
  Lightbulb as SuggestionsIcon,
  Flag as FlagIcon,
  RateReview as ReviewsIcon,
  People as PeopleIcon,
  Psychology as AIIcon,
} from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { checkCurrentUserIsAdmin } from '@/lib/utils/admin'
import { createClient } from '@/lib/supabase/client'

interface DashboardStats {
  totalResources: number
  pendingSuggestions: number
  pendingUpdates: number
  totalReviews: number
  totalUsers: number
  activeResources: number
}

export default function AdminDashboardPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalResources: 0,
    pendingSuggestions: 0,
    pendingUpdates: 0,
    totalReviews: 0,
    totalUsers: 0,
    activeResources: 0,
  })
  const [loading, setLoading] = useState(true)

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

  // Fetch dashboard stats
  useEffect(() => {
    async function fetchStats() {
      if (!isAdmin) return

      const supabase = createClient()

      try {
        // Fetch all stats in parallel
        const [
          resourcesCount,
          suggestionsCount,
          updatesCount,
          reviewsCount,
          usersCount,
          activeResourcesCount,
        ] = await Promise.all([
          supabase.from('resources').select('*', { count: 'exact', head: true }),
          supabase
            .from('resource_suggestions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending'),
          supabase
            .from('resource_updates')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending'),
          supabase.from('resource_reviews').select('*', { count: 'exact', head: true }),
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase
            .from('resources')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active'),
        ])

        setStats({
          totalResources: resourcesCount.count || 0,
          pendingSuggestions: suggestionsCount.count || 0,
          pendingUpdates: updatesCount.count || 0,
          totalReviews: reviewsCount.count || 0,
          totalUsers: usersCount.count || 0,
          activeResources: activeResourcesCount.count || 0,
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isAdmin && !checkingAdmin) {
      fetchStats()
    }
  }, [isAdmin, checkingAdmin])

  if (authLoading || checkingAdmin) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (!isAdmin) {
    return null
  }

  const statCards = [
    {
      title: 'Total Resources',
      value: stats.totalResources,
      subtitle: `${stats.activeResources} active`,
      icon: <ResourcesIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2',
      link: '/admin/resources',
    },
    {
      title: 'Pending Suggestions',
      value: stats.pendingSuggestions,
      subtitle: 'Awaiting review',
      icon: <SuggestionsIcon sx={{ fontSize: 40 }} />,
      color: '#ed6c02',
      link: '/admin/suggestions',
    },
    {
      title: 'Pending Updates',
      value: stats.pendingUpdates,
      subtitle: 'Issue reports',
      icon: <FlagIcon sx={{ fontSize: 40 }} />,
      color: '#d32f2f',
      link: '/admin/updates',
    },
    {
      title: 'Total Reviews',
      value: stats.totalReviews,
      subtitle: 'Community feedback',
      icon: <ReviewsIcon sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
      link: null,
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      subtitle: 'Registered users',
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      color: '#9c27b0',
      link: null,
    },
  ]

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <DashboardIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Admin Dashboard
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Manage resources, review submissions, and monitor platform activity
        </Typography>
      </Box>

      {/* Stats Cards */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {statCards.map((card) => (
              <Grid key={card.title} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box>
                        <Typography variant="h4" component="div" sx={{ fontWeight: 600 }}>
                          {card.value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {card.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {card.subtitle}
                        </Typography>
                      </Box>
                      <Box sx={{ color: card.color }}>{card.icon}</Box>
                    </Box>
                  </CardContent>
                  {card.link && (
                    <CardActions>
                      <Button size="small" onClick={() => router.push(card.link)}>
                        Manage
                      </Button>
                    </CardActions>
                  )}
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Quick Actions */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                <Button variant="outlined" startIcon={<ResourcesIcon />} onClick={() => router.push('/admin/resources')}>
                  Manage Resources
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SuggestionsIcon />}
                  onClick={() => router.push('/admin/suggestions')}
                  color={stats.pendingSuggestions > 0 ? 'warning' : 'primary'}
                >
                  Review Suggestions ({stats.pendingSuggestions})
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<FlagIcon />}
                  onClick={() => router.push('/admin/updates')}
                  color={stats.pendingUpdates > 0 ? 'error' : 'primary'}
                >
                  Review Updates ({stats.pendingUpdates})
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AIIcon />}
                  onClick={() => router.push('/admin/agents')}
                >
                  AI Agents
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Alert for pending items */}
          {(stats.pendingSuggestions > 0 || stats.pendingUpdates > 0) && (
            <Alert severity="warning" sx={{ mt: 3 }}>
              You have {stats.pendingSuggestions + stats.pendingUpdates} pending item(s) that need
              review.
            </Alert>
          )}
        </>
      )}
    </Container>
  )
}
