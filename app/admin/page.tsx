import { createClient } from '@/lib/supabase/server'
import { Box, Grid, Paper, Typography, CardContent } from '@mui/material'
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  RateReview as ReviewIcon,
  Lightbulb as SuggestionIcon,
  Add as AddIcon,
  Edit as EditIcon,
} from '@mui/icons-material'
import { ClickableCard } from '@/components/admin/ClickableCard'
import { LinkButton } from '@/components/admin/LinkButton'
import { RecentResourcesList } from '@/components/admin/RecentResourcesList'
import { QuickActionsList } from '@/components/admin/QuickActionsList'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Fetch dashboard statistics
  const [
    { count: totalResources },
    { count: activeResources },
    { count: totalUsers },
    { count: totalReviews },
    { count: pendingSuggestions },
    { data: recentResources },
  ] = await Promise.all([
    supabase.from('resources').select('*', { count: 'exact', head: true }),
    supabase.from('resources').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('resource_reviews').select('*', { count: 'exact', head: true }),
    supabase
      .from('resource_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('resources')
      .select('id, name, primary_category, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const stats = [
    {
      title: 'Total Resources',
      value: totalResources || 0,
      subtitle: `${activeResources || 0} active`,
      icon: <BusinessIcon sx={{ fontSize: 40 }} />,
      color: 'primary.main',
      href: '/admin/resources',
    },
    {
      title: 'Total Users',
      value: totalUsers || 0,
      subtitle: 'Registered users',
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      color: 'success.main',
      href: '/admin/users',
    },
    {
      title: 'Reviews',
      value: totalReviews || 0,
      subtitle: 'Community reviews',
      icon: <ReviewIcon sx={{ fontSize: 40 }} />,
      color: 'info.main',
      href: '/admin/reviews',
    },
    {
      title: 'Suggestions',
      value: pendingSuggestions || 0,
      subtitle: 'Pending review',
      icon: <SuggestionIcon sx={{ fontSize: 40 }} />,
      color: 'warning.main',
      href: '/admin/suggestions',
    },
  ]

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Dashboard Overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage resources, users, and community content
          </Typography>
        </Box>
        <LinkButton
          href="/admin/resources/new"
          variant="contained"
          startIcon={<AddIcon />}
          size="large"
        >
          Add Resource
        </LinkButton>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.title}>
            <ClickableCard
              href={stat.href}
              sx={{
                textDecoration: 'none',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <Box
                    sx={{
                      bgcolor: stat.color,
                      color: 'white',
                      borderRadius: 2,
                      p: 1,
                      mr: 2,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h3" component="div">
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.subtitle}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="h6" color="text.secondary">
                  {stat.title}
                </Typography>
              </CardContent>
            </ClickableCard>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Resources */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Recent Resources</Typography>
              <LinkButton href="/admin/resources" size="small" endIcon={<EditIcon />}>
                View All
              </LinkButton>
            </Box>

            {recentResources && recentResources.length > 0 ? (
              <RecentResourcesList resources={recentResources} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                No resources yet. Start by adding your first resource.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <QuickActionsList pendingSuggestions={pendingSuggestions || 0} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
