'use client'

import { useEffect, useState } from 'react'
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  Avatar,
  ListItemIcon,
  ListItemText,
  Divider,
  LinearProgress,
  Switch,
} from '@mui/material'
import {
  Circle as CircleIcon,
  Bolt as BoltIcon,
  AttachMoney as MoneyIcon,
  Notifications as NotificationsIcon,
  Help as HelpIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  Flag as FlagIcon,
  LibraryBooks as ResourcesIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { checkCurrentUserIsAdmin } from '@/lib/utils/admin'
import { createClient } from '@/lib/supabase/client'
import { getAISystemStatus, updateAppSettings } from '@/lib/api/settings'
import type { AISystemStatus } from '@/lib/types/settings'

interface StatusBarStats {
  systemStatus: 'online' | 'offline' | 'issues'
  activeProcesses: number
  monthlyBudget: number
  monthlySpent: number
  pendingCount: number
}

export function AdminStatusBar() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState<StatusBarStats>({
    systemStatus: 'online',
    activeProcesses: 0,
    monthlyBudget: 25.0,
    monthlySpent: 0,
    pendingCount: 0,
  })
  const [aiStatus, setAiStatus] = useState<AISystemStatus | null>(null)

  // Menu state
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null)
  const [processMenuAnchor, setProcessMenuAnchor] = useState<null | HTMLElement>(null)
  const [budgetMenuAnchor, setBudgetMenuAnchor] = useState<null | HTMLElement>(null)
  const [notifMenuAnchor, setNotifMenuAnchor] = useState<null | HTMLElement>(null)
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null)

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      if (isAuthenticated && user) {
        const adminStatus = await checkCurrentUserIsAdmin()
        setIsAdmin(adminStatus)
      } else {
        setIsAdmin(false)
      }
    }

    if (!isLoading) {
      checkAdmin()
    }
  }, [user, isAuthenticated, isLoading])

  // Fetch stats for admin status bar
  useEffect(() => {
    async function fetchStats() {
      if (!isAdmin) return

      const supabase = createClient()

      try {
        // Fetch AI system status
        const aiSystemStatus = await getAISystemStatus()
        setAiStatus(aiSystemStatus)

        // Determine system status
        const systemStatus = aiSystemStatus.masterEnabled ? 'online' : 'issues'

        // Fetch active agent sessions (verification running)
        const { count: activeCount } = await supabase
          .from('agent_sessions')
          .select('*', { count: 'exact', head: true })
          .is('ended_at', null)

        // Fetch pending suggestions
        const { count: pendingCount } = await supabase
          .from('resource_suggestions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        // Fetch AI usage costs (this month)
        const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split('T')[0]

        const { data: usageData } = await supabase
          .from('ai_usage_logs')
          .select('total_cost_usd')
          .gte('created_at', firstOfMonth)

        const monthlySpent =
          usageData?.reduce((sum, log) => sum + (log.total_cost_usd || 0), 0) || 0

        setStats({
          systemStatus,
          activeProcesses: activeCount || 0,
          monthlyBudget: 25.0, // TODO: Get from settings
          monthlySpent,
          pendingCount: pendingCount || 0,
        })
      } catch (error) {
        console.error('Error fetching admin status bar stats:', error)
      }
    }

    if (isAdmin) {
      fetchStats()

      // Refresh stats every 30 seconds
      const interval = setInterval(fetchStats, 30000)
      return () => clearInterval(interval)
    }
  }, [isAdmin])

  // Set up real-time subscriptions for live updates
  useEffect(() => {
    if (!isAdmin) return

    const supabase = createClient()

    // Subscribe to agent_sessions for active process count
    const sessionsChannel = supabase
      .channel('statusbar_sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sessions',
        },
        async () => {
          const { count } = await supabase
            .from('agent_sessions')
            .select('*', { count: 'exact', head: true })
            .is('ended_at', null)

          setStats((prev) => ({ ...prev, activeProcesses: count || 0 }))
        }
      )
      .subscribe()

    // Subscribe to resource_suggestions for pending count
    const suggestionsChannel = supabase
      .channel('statusbar_suggestions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resource_suggestions',
        },
        async () => {
          const { count } = await supabase
            .from('resource_suggestions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')

          setStats((prev) => ({ ...prev, pendingCount: count || 0 }))
        }
      )
      .subscribe()

    // Subscribe to ai_usage_logs for cost updates
    const usageChannel = supabase
      .channel('statusbar_usage')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_usage_logs',
        },
        async () => {
          const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            .toISOString()
            .split('T')[0]

          const { data: usageData } = await supabase
            .from('ai_usage_logs')
            .select('total_cost_usd')
            .gte('created_at', firstOfMonth)

          const monthlySpent =
            usageData?.reduce((sum, log) => sum + (log.total_cost_usd || 0), 0) || 0

          setStats((prev) => ({ ...prev, monthlySpent }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sessionsChannel)
      supabase.removeChannel(suggestionsChannel)
      supabase.removeChannel(usageChannel)
    }
  }, [isAdmin])

  // Handle logout
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  // Handle toggle AI systems
  const handleToggleMasterAI = async (checked: boolean) => {
    const result = await updateAppSettings({ ai_master_enabled: checked })
    if (result.success) {
      // Refresh AI status
      const newStatus = await getAISystemStatus()
      setAiStatus(newStatus)
      setStats((prev) => ({ ...prev, systemStatus: checked ? 'online' : 'issues' }))
    }
  }

  const handleToggleVerification = async (checked: boolean) => {
    const result = await updateAppSettings({ ai_verification_enabled: checked })
    if (result.success) {
      const newStatus = await getAISystemStatus()
      setAiStatus(newStatus)
    }
  }

  const handleToggleDiscovery = async (checked: boolean) => {
    const result = await updateAppSettings({ ai_discovery_enabled: checked })
    if (result.success) {
      const newStatus = await getAISystemStatus()
      setAiStatus(newStatus)
    }
  }

  const handleToggleEnrichment = async (checked: boolean) => {
    const result = await updateAppSettings({ ai_enrichment_enabled: checked })
    if (result.success) {
      const newStatus = await getAISystemStatus()
      setAiStatus(newStatus)
    }
  }

  const handleToggleMonitoring = async (checked: boolean) => {
    const result = await updateAppSettings({ ai_realtime_monitoring_enabled: checked })
    if (result.success) {
      const newStatus = await getAISystemStatus()
      setAiStatus(newStatus)
    }
  }

  // Don't render if not admin or still loading
  if (isLoading || !isAdmin) {
    return null
  }

  const budgetPercent = (stats.monthlySpent / stats.monthlyBudget) * 100
  const budgetColor = budgetPercent >= 120 ? 'error' : budgetPercent >= 80 ? 'warning' : 'success'

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: '#23282d',
          boxShadow: '0 1px 1px rgba(0,0,0,.1)',
        }}
      >
        <Toolbar variant="dense" sx={{ minHeight: 32, px: 2 }}>
          {/* Left: Branding */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
            <Link href="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" fontWeight="600" sx={{ color: '#fff' }}>
                  🎯 Reentry Map Admin
                </Typography>
              </Box>
            </Link>
          </Box>

          {/* Center-Left: System Status */}
          <Tooltip title="Click for system details">
            <Chip
              icon={
                <CircleIcon
                  sx={{
                    fontSize: 12,
                    color:
                      stats.systemStatus === 'online'
                        ? '#46b450'
                        : stats.systemStatus === 'issues'
                          ? '#ffb900'
                          : '#dc3232',
                  }}
                />
              }
              label={
                stats.systemStatus === 'online'
                  ? 'Online'
                  : stats.systemStatus === 'issues'
                    ? 'Issues'
                    : 'Offline'
              }
              size="small"
              onClick={(e) => setStatusMenuAnchor(e.currentTarget)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '0.75rem',
                height: 24,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                cursor: 'pointer',
                mr: 1,
              }}
            />
          </Tooltip>

          {/* Center: Active Processes */}
          {stats.activeProcesses > 0 && (
            <Tooltip title="Active verification processes">
              <Chip
                icon={<BoltIcon sx={{ fontSize: 14 }} />}
                label={stats.activeProcesses}
                size="small"
                onClick={(e) => setProcessMenuAnchor(e.currentTarget)}
                sx={{
                  bgcolor: 'rgba(33,150,243,0.2)',
                  color: '#fff',
                  fontSize: '0.75rem',
                  height: 24,
                  '&:hover': { bgcolor: 'rgba(33,150,243,0.3)' },
                  cursor: 'pointer',
                  mr: 1,
                  animation: 'pulse 2s infinite',
                }}
              />
            </Tooltip>
          )}

          {/* Center-Right: Budget */}
          <Tooltip title={`${budgetPercent.toFixed(0)}% of monthly budget used`}>
            <Chip
              icon={<MoneyIcon sx={{ fontSize: 14 }} />}
              label={`$${stats.monthlySpent.toFixed(2)}/${stats.monthlyBudget.toFixed(0)}`}
              size="small"
              onClick={(e) => setBudgetMenuAnchor(e.currentTarget)}
              color={budgetColor}
              sx={{
                fontSize: '0.75rem',
                height: 24,
                '&:hover': { opacity: 0.9 },
                cursor: 'pointer',
                mr: 1,
              }}
            />
          </Tooltip>

          <Box sx={{ flexGrow: 1 }} />

          {/* Right: Quick Nav + User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* Quick Nav Links */}
            <Tooltip title="Dashboard">
              <IconButton
                size="small"
                component={Link}
                href="/admin"
                sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                <DashboardIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Flagged Resources">
              <IconButton
                size="small"
                component={Link}
                href="/admin/flagged-resources"
                sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                <Badge
                  badgeContent={stats.pendingCount > 0 ? stats.pendingCount : null}
                  color="error"
                >
                  <FlagIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title="Resources">
              <IconButton
                size="small"
                component={Link}
                href="/admin/resources"
                sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                <ResourcesIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Settings">
              <IconButton
                size="small"
                component={Link}
                href="/admin/settings"
                sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton
                size="small"
                onClick={(e) => setNotifMenuAnchor(e.currentTarget)}
                sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                <Badge badgeContent={stats.pendingCount} color="error">
                  <NotificationsIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Help */}
            <Tooltip title="Help">
              <IconButton
                size="small"
                component={Link}
                href="/docs"
                target="_blank"
                sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                <HelpIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* User Menu */}
            <Tooltip title="Account">
              <IconButton
                size="small"
                onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                sx={{ ml: 1 }}
              >
                <Avatar sx={{ width: 24, height: 24, fontSize: '0.875rem' }}>
                  {user?.email?.charAt(0).toUpperCase() || 'A'}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* System Status Dropdown */}
      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={() => setStatusMenuAnchor(null)}
        PaperProps={{ sx: { width: 300 } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            System Status
          </Typography>
          <Box sx={{ mt: 1 }}>
            {/* Master AI Switch */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
              }}
            >
              <Typography variant="caption">Master AI:</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" fontWeight="bold">
                  {aiStatus?.masterEnabled ? 'ON' : 'OFF'}
                </Typography>
                <Switch
                  size="small"
                  checked={aiStatus?.masterEnabled || false}
                  onChange={(e) => handleToggleMasterAI(e.target.checked)}
                />
              </Box>
            </Box>

            {/* Individual System Switches (only shown when Master is ON) */}
            {aiStatus?.masterEnabled && (
              <>
                {/* Verification */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 0.5,
                    pl: 2,
                  }}
                >
                  <Typography variant="caption">Verification:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography
                      variant="caption"
                      color={aiStatus.isVerificationActive ? 'success.main' : 'text.secondary'}
                    >
                      {aiStatus.isVerificationActive ? '✅ Active' : '⏸️ Paused'}
                    </Typography>
                    <Switch
                      size="small"
                      checked={aiStatus.verificationEnabled || false}
                      onChange={(e) => handleToggleVerification(e.target.checked)}
                    />
                  </Box>
                </Box>

                {/* Monitoring */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 0.5,
                    pl: 2,
                  }}
                >
                  <Typography variant="caption">Monitoring:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography
                      variant="caption"
                      color={aiStatus.realtimeMonitoringEnabled ? 'success.main' : 'text.secondary'}
                    >
                      {aiStatus.realtimeMonitoringEnabled ? '✅ Active' : '⏸️ Paused'}
                    </Typography>
                    <Switch
                      size="small"
                      checked={aiStatus.realtimeMonitoringEnabled || false}
                      onChange={(e) => handleToggleMonitoring(e.target.checked)}
                    />
                  </Box>
                </Box>

                {/* Discovery */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 0.5,
                    pl: 2,
                  }}
                >
                  <Typography variant="caption">Discovery:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography
                      variant="caption"
                      color={aiStatus.isDiscoveryActive ? 'success.main' : 'text.secondary'}
                    >
                      {aiStatus.isDiscoveryActive ? '✅ Active' : '⏸️ Paused'}
                    </Typography>
                    <Switch
                      size="small"
                      checked={aiStatus.discoveryEnabled || false}
                      onChange={(e) => handleToggleDiscovery(e.target.checked)}
                    />
                  </Box>
                </Box>

                {/* Enrichment */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pl: 2,
                  }}
                >
                  <Typography variant="caption">Enrichment:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography
                      variant="caption"
                      color={aiStatus.isEnrichmentActive ? 'success.main' : 'text.secondary'}
                    >
                      {aiStatus.isEnrichmentActive ? '✅ Active' : '⏸️ Paused'}
                    </Typography>
                    <Switch
                      size="small"
                      checked={aiStatus.enrichmentEnabled || false}
                      onChange={(e) => handleToggleEnrichment(e.target.checked)}
                    />
                  </Box>
                </Box>
              </>
            )}
          </Box>
          <Divider sx={{ my: 1 }} />
          <MenuItem
            component={Link}
            href="/admin/settings"
            onClick={() => setStatusMenuAnchor(null)}
          >
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Configure Systems" />
          </MenuItem>
        </Box>
      </Menu>

      {/* Active Processes Dropdown */}
      <Menu
        anchorEl={processMenuAnchor}
        open={Boolean(processMenuAnchor)}
        onClose={() => setProcessMenuAnchor(null)}
        PaperProps={{ sx: { width: 320 } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Active Processes
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              🔄 Verification: {stats.activeProcesses} active
            </Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <MenuItem
            component={Link}
            href="/admin/command-center"
            onClick={() => setProcessMenuAnchor(null)}
          >
            <ListItemText primary="View Details →" />
          </MenuItem>
        </Box>
      </Menu>

      {/* Budget Dropdown */}
      <Menu
        anchorEl={budgetMenuAnchor}
        open={Boolean(budgetMenuAnchor)}
        onClose={() => setBudgetMenuAnchor(null)}
        PaperProps={{ sx: { width: 300 } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Budget Status
          </Typography>
          <Box sx={{ mt: 1, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption">
                ${stats.monthlySpent.toFixed(2)} / ${stats.monthlyBudget.toFixed(2)}
              </Typography>
              <Typography variant="caption" fontWeight="bold">
                {budgetPercent.toFixed(0)}% used
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(budgetPercent, 100)}
              color={budgetColor}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption">This Month:</Typography>
            <Typography variant="caption" fontWeight="bold">
              ${stats.monthlySpent.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption">Budget:</Typography>
            <Typography variant="caption">${stats.monthlyBudget.toFixed(2)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption">Remaining:</Typography>
            <Typography variant="caption" color={budgetColor}>
              ${Math.max(0, stats.monthlyBudget - stats.monthlySpent).toFixed(2)}
            </Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <MenuItem
            component={Link}
            href="/admin/ai-usage"
            onClick={() => setBudgetMenuAnchor(null)}
          >
            <ListItemText primary="View Cost Breakdown" />
          </MenuItem>
          <MenuItem
            onClick={() => {
              window.open('https://console.anthropic.com/usage', '_blank')
              setBudgetMenuAnchor(null)
            }}
          >
            <ListItemIcon>
              <OpenInNewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Anthropic Console" />
          </MenuItem>
        </Box>
      </Menu>

      {/* Notifications Dropdown */}
      <Menu
        anchorEl={notifMenuAnchor}
        open={Boolean(notifMenuAnchor)}
        onClose={() => setNotifMenuAnchor(null)}
        PaperProps={{ sx: { width: 320 } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Notifications
          </Typography>
          {stats.pendingCount > 0 ? (
            <>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  🔴 {stats.pendingCount} resource{stats.pendingCount > 1 ? 's' : ''} pending review
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <MenuItem
                component={Link}
                href="/admin/flagged-resources"
                onClick={() => setNotifMenuAnchor(null)}
              >
                <ListItemText primary="Review Now →" />
              </MenuItem>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              No new notifications
            </Typography>
          )}
        </Box>
      </Menu>

      {/* User Menu Dropdown */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
        PaperProps={{ sx: { width: 200 } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Signed in as
          </Typography>
          <Typography variant="body2" fontWeight="bold" noWrap>
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem component={Link} href="/profile" onClick={() => setUserMenuAnchor(null)}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Profile" />
        </MenuItem>
        <MenuItem component={Link} href="/admin/settings" onClick={() => setUserMenuAnchor(null)}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </MenuItem>
      </Menu>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </>
  )
}
