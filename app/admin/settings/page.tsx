'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  FormGroup,
  FormControlLabel,
  Switch,
  Alert,
  AlertTitle,
  Divider,
  Link as MuiLink,
  CircularProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material'
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  OpenInNew as OpenInNewIcon,
  SmartToy as SmartToyIcon,
  VerifiedUser as VerifiedUserIcon,
  Search as SearchIcon,
  AutoAwesome as AutoAwesomeIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material'
import { getAppSettings, updateAppSettings, getAISystemStatus } from '@/lib/api/settings-client'
import type { AppSettings, AISystemStatus } from '@/lib/types/settings'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [aiStatus, setAiStatus] = useState<AISystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const data = await getAppSettings()
      const aiData = await getAISystemStatus()
      setSettings(data)
      setAiStatus(aiData)
    } catch (err) {
      setError('Failed to load settings')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleSMSAuth(enabled: boolean) {
    if (!settings) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await updateAppSettings({
        sms_auth_enabled: enabled,
      })

      if (result.success) {
        setSettings({ ...settings, sms_auth_enabled: enabled })
        setSuccess(`SMS authentication ${enabled ? 'enabled' : 'disabled'} successfully`)
      } else {
        setError(result.error || 'Failed to update settings')
      }
    } catch (err) {
      setError('Failed to update settings')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleAIMaster(enabled: boolean) {
    if (!settings) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await updateAppSettings({
        ai_master_enabled: enabled,
      })

      if (result.success) {
        setSettings({ ...settings, ai_master_enabled: enabled })
        await loadSettings() // Reload to update derived status
        setSuccess(
          `AI systems ${enabled ? 'enabled' : 'disabled'} successfully. ${enabled ? 'Individual systems can now be configured.' : 'All AI operations are now inactive.'}`
        )
      } else {
        setError(result.error || 'Failed to update settings')
      }
    } catch (err) {
      setError('Failed to update settings')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleAISystem(
    field:
      | 'ai_verification_enabled'
      | 'ai_discovery_enabled'
      | 'ai_enrichment_enabled'
      | 'ai_realtime_monitoring_enabled',
    enabled: boolean,
    systemName: string
  ) {
    if (!settings) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await updateAppSettings({
        [field]: enabled,
      })

      if (result.success) {
        setSettings({ ...settings, [field]: enabled })
        await loadSettings() // Reload to update derived status
        setSuccess(`${systemName} ${enabled ? 'enabled' : 'disabled'} successfully`)
      } else {
        setError(result.error || 'Failed to update settings')
      }
    } catch (err) {
      setError('Failed to update settings')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!settings) {
    return (
      <Alert severity="error">
        <AlertTitle>Error</AlertTitle>
        Failed to load application settings.
      </Alert>
    )
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Application Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Configure authentication methods and application features.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* SMS Authentication Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          SMS Authentication
        </Typography>

        {/* Provider Status */}
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                SMS Provider Status
              </Typography>
              {settings.sms_provider_configured ? (
                <Chip icon={<CheckCircleIcon />} label="Configured" color="success" size="small" />
              ) : (
                <Chip icon={<ErrorIcon />} label="Not Configured" color="error" size="small" />
              )}
            </Box>

            {!settings.sms_provider_configured && (
              <Alert severity="warning" icon={<InfoIcon />} sx={{ mb: 2 }}>
                <AlertTitle>SMS Provider Not Configured</AlertTitle>
                You need to configure Twilio SMS credentials in your environment variables before
                enabling phone authentication.
              </Alert>
            )}

            {/* Configuration Instructions */}
            <Typography variant="body2" color="text.secondary" gutterBottom>
              To enable SMS authentication, follow these steps:
            </Typography>

            <List dense>
              <ListItem>
                <ListItemIcon>
                  <Typography variant="body2" fontWeight="bold">
                    1.
                  </Typography>
                </ListItemIcon>
                <ListItemText
                  primary="Sign up for Twilio"
                  secondary={
                    <MuiLink
                      href="https://www.twilio.com/try-twilio"
                      target="_blank"
                      rel="noopener"
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                    >
                      Create a Twilio account
                      <OpenInNewIcon fontSize="small" />
                    </MuiLink>
                  }
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Typography variant="body2" fontWeight="bold">
                    2.
                  </Typography>
                </ListItemIcon>
                <ListItemText
                  primary="Get your Twilio credentials"
                  secondary="Find your Account SID, Auth Token, and phone number in the Twilio Console"
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Typography variant="body2" fontWeight="bold">
                    3.
                  </Typography>
                </ListItemIcon>
                <ListItemText
                  primary="Add credentials to environment variables"
                  secondary="Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env.local"
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Typography variant="body2" fontWeight="bold">
                    4.
                  </Typography>
                </ListItemIcon>
                <ListItemText
                  primary="Restart the development server"
                  secondary="Environment variable changes require a server restart to take effect"
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Typography variant="body2" fontWeight="bold">
                    5.
                  </Typography>
                </ListItemIcon>
                <ListItemText
                  primary="Update provider status in database"
                  secondary="Run: UPDATE app_settings SET sms_provider_configured = TRUE;"
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Typography variant="body2" fontWeight="bold">
                    6.
                  </Typography>
                </ListItemIcon>
                <ListItemText
                  primary="Return here and enable SMS authentication"
                  secondary="Use the toggle below to make phone auth available to users"
                />
              </ListItem>
            </List>

            <Alert severity="info" sx={{ mt: 2 }}>
              <AlertTitle>Cost Warning</AlertTitle>
              SMS authentication incurs per-message costs from your provider. Typical costs:
              $0.01-$0.05 per SMS. Budget accordingly based on expected user volume.
            </Alert>
          </CardContent>
        </Card>

        <Divider sx={{ my: 3 }} />

        {/* Enable/Disable Toggle */}
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={settings.sms_auth_enabled}
                onChange={(e) => handleToggleSMSAuth(e.target.checked)}
                disabled={!settings.sms_provider_configured || saving}
              />
            }
            label={
              <Box>
                <Typography variant="body1">Enable SMS Authentication</Typography>
                <Typography variant="body2" color="text.secondary">
                  Allow users to sign in with phone number and OTP
                </Typography>
              </Box>
            }
          />
        </FormGroup>

        {!settings.sms_provider_configured && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            You must configure an SMS provider before enabling this feature.
          </Alert>
        )}

        {settings.sms_provider_configured && !settings.sms_auth_enabled && (
          <Alert severity="info" sx={{ mt: 2 }}>
            SMS authentication is currently disabled. Users can only sign in with email.
          </Alert>
        )}

        {settings.sms_auth_enabled && (
          <Alert severity="success" sx={{ mt: 2 }}>
            SMS authentication is enabled. Users can sign in with phone or email.
          </Alert>
        )}
      </Paper>

      {/* AI Systems Control Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SmartToyIcon sx={{ mr: 1.5, fontSize: 28 }} />
          <Typography variant="h6">AI Systems Control</Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" paragraph>
          Manage autonomous AI agents and automated systems. Master switch controls all AI
          operations.
        </Typography>

        {/* Master AI Switch */}
        <Card variant="outlined" sx={{ mb: 3, bgcolor: 'background.default' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
                Master AI Control
              </Typography>
              {aiStatus?.masterEnabled ? (
                <Chip icon={<CheckCircleIcon />} label="Enabled" color="success" size="small" />
              ) : (
                <Chip icon={<ErrorIcon />} label="Disabled" color="error" size="small" />
              )}
            </Box>

            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.ai_master_enabled ?? false}
                    onChange={(e) => handleToggleAIMaster(e.target.checked)}
                    disabled={saving}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Enable All AI Systems</Typography>
                    <Typography variant="body2" color="text.secondary">
                      When enabled, individual AI systems can be activated. When disabled, all AI
                      operations are inactive.
                    </Typography>
                  </Box>
                }
              />
            </FormGroup>

            {!settings?.ai_master_enabled && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <AlertTitle>All AI Systems Disabled</AlertTitle>
                AI operations are currently inactive. Enable the master switch to activate
                individual systems.
              </Alert>
            )}

            {settings?.ai_master_enabled && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <AlertTitle>Ready for AI Operations</AlertTitle>
                Master AI control is enabled. Configure individual systems below.
              </Alert>
            )}
          </CardContent>
        </Card>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
          Individual AI Systems
        </Typography>

        {/* Verification Agent */}
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <VerifiedUserIcon
                sx={{
                  mr: 1,
                  color: aiStatus?.isVerificationActive ? 'success.main' : 'text.disabled',
                }}
              />
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                Verification Agent
              </Typography>
              {aiStatus?.isVerificationActive ? (
                <Chip icon={<CheckCircleIcon />} label="Active" color="success" size="small" />
              ) : (
                <Chip label="Inactive" color="default" size="small" />
              )}
            </Box>

            <Typography variant="body2" color="text.secondary" paragraph>
              Autonomous verification of submitted resources. Validates phone numbers, URLs,
              geocodes addresses, and performs AI content checks. Auto-approves high-quality
              submissions.
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={settings?.ai_verification_enabled ?? false}
                  onChange={(e) =>
                    handleToggleAISystem(
                      'ai_verification_enabled',
                      e.target.checked,
                      'Verification Agent'
                    )
                  }
                  disabled={!settings?.ai_master_enabled || saving}
                  size="small"
                />
              }
              label={
                <Typography variant="body2">
                  {settings?.ai_verification_enabled ? 'Enabled' : 'Disabled'}
                </Typography>
              }
            />

            {!settings?.ai_master_enabled && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Enable master AI control first to activate this system.
              </Alert>
            )}

            {settings?.ai_master_enabled && !settings?.ai_verification_enabled && (
              <Alert severity="info" sx={{ mt: 1 }}>
                System disabled. All resource submissions will require manual review.
              </Alert>
            )}

            {aiStatus?.isVerificationActive && (
              <Alert severity="success" sx={{ mt: 1 }}>
                Ready for autonomous verification. High-quality submissions will be auto-approved.
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Discovery Agent */}
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <SearchIcon
                sx={{
                  mr: 1,
                  color: aiStatus?.isDiscoveryActive ? 'success.main' : 'text.disabled',
                }}
              />
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                Discovery Agent
              </Typography>
              {aiStatus?.isDiscoveryActive ? (
                <Chip icon={<CheckCircleIcon />} label="Active" color="success" size="small" />
              ) : (
                <Chip label="Inactive" color="default" size="small" />
              )}
            </Box>

            <Typography variant="body2" color="text.secondary" paragraph>
              Automatically discovers new resources from 211 directories, government sites, and
              Google searches. Expands the resource database proactively.
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={settings?.ai_discovery_enabled ?? false}
                  onChange={(e) =>
                    handleToggleAISystem(
                      'ai_discovery_enabled',
                      e.target.checked,
                      'Discovery Agent'
                    )
                  }
                  disabled={!settings?.ai_master_enabled || saving}
                  size="small"
                />
              }
              label={
                <Typography variant="body2">
                  {settings?.ai_discovery_enabled ? 'Enabled' : 'Disabled'}
                </Typography>
              }
            />

            {!settings?.ai_master_enabled && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Enable master AI control first to activate this system.
              </Alert>
            )}

            {settings?.ai_master_enabled && !settings?.ai_discovery_enabled && (
              <Alert severity="info" sx={{ mt: 1 }}>
                System disabled. Resource discovery will not run automatically.
              </Alert>
            )}

            {aiStatus?.isDiscoveryActive && (
              <Alert severity="success" sx={{ mt: 1 }}>
                Ready for resource discovery. Agent will find new resources from external sources.
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Enrichment Agent */}
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AutoAwesomeIcon
                sx={{
                  mr: 1,
                  color: aiStatus?.isEnrichmentActive ? 'success.main' : 'text.disabled',
                }}
              />
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                Enrichment Agent
              </Typography>
              {aiStatus?.isEnrichmentActive ? (
                <Chip icon={<CheckCircleIcon />} label="Active" color="success" size="small" />
              ) : (
                <Chip label="Inactive" color="default" size="small" />
              )}
            </Box>

            <Typography variant="body2" color="text.secondary" paragraph>
              Enhances existing resources by filling missing data fields via geocoding, website
              scraping, and Google Maps photos. Improves data quality automatically.
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={settings?.ai_enrichment_enabled ?? false}
                  onChange={(e) =>
                    handleToggleAISystem(
                      'ai_enrichment_enabled',
                      e.target.checked,
                      'Enrichment Agent'
                    )
                  }
                  disabled={!settings?.ai_master_enabled || saving}
                  size="small"
                />
              }
              label={
                <Typography variant="body2">
                  {settings?.ai_enrichment_enabled ? 'Enabled' : 'Disabled'}
                </Typography>
              }
            />

            {!settings?.ai_master_enabled && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Enable master AI control first to activate this system.
              </Alert>
            )}

            {settings?.ai_master_enabled && !settings?.ai_enrichment_enabled && (
              <Alert severity="info" sx={{ mt: 1 }}>
                System disabled. Resource data will not be enhanced automatically.
              </Alert>
            )}

            {aiStatus?.isEnrichmentActive && (
              <Alert severity="success" sx={{ mt: 1 }}>
                Ready for data enrichment. Agent will enhance resources with missing information.
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Real-time Monitoring */}
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <VisibilityIcon
                sx={{
                  mr: 1,
                  color: settings?.ai_realtime_monitoring_enabled
                    ? 'success.main'
                    : 'text.disabled',
                }}
              />
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                Real-time Monitoring
              </Typography>
              {settings?.ai_realtime_monitoring_enabled ? (
                <Chip icon={<CheckCircleIcon />} label="Active" color="success" size="small" />
              ) : (
                <Chip label="Inactive" color="default" size="small" />
              )}
            </Box>

            <Typography variant="body2" color="text.secondary" paragraph>
              Live event streaming in Command Center for monitoring AI agent operations. Shows
              real-time progress, costs, and verification results.
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={settings?.ai_realtime_monitoring_enabled ?? false}
                  onChange={(e) =>
                    handleToggleAISystem(
                      'ai_realtime_monitoring_enabled',
                      e.target.checked,
                      'Real-time Monitoring'
                    )
                  }
                  disabled={saving}
                  size="small"
                />
              }
              label={
                <Typography variant="body2">
                  {settings?.ai_realtime_monitoring_enabled ? 'Enabled' : 'Disabled'}
                </Typography>
              }
            />

            <Alert severity="info" sx={{ mt: 1 }}>
              Real-time monitoring operates independently of other AI systems. It only controls UI
              event streaming, not AI operations.
            </Alert>
          </CardContent>
        </Card>
      </Paper>

      {/* Future Settings Sections */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Support Contact Information
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Configure support contact details displayed to users.
        </Typography>

        <Alert severity="info">
          <AlertTitle>Coming Soon</AlertTitle>
          Support email and phone configuration will be available in a future update.
        </Alert>
      </Paper>
    </Box>
  )
}
