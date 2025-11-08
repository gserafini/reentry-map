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
} from '@mui/icons-material'
import { getAppSettings, updateAppSettings } from '@/lib/api/settings'
import type { AppSettings } from '@/lib/types/settings'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
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
      setSettings(data)
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
                You need to configure an SMS provider in Supabase before enabling phone
                authentication.
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
                  primary="Go to Supabase Dashboard"
                  secondary={
                    <MuiLink
                      href="https://app.supabase.com"
                      target="_blank"
                      rel="noopener"
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                    >
                      Open Supabase Dashboard
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
                  primary="Navigate to Authentication → Providers"
                  secondary="Find 'Phone' in the list of authentication providers"
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Typography variant="body2" fontWeight="bold">
                    3.
                  </Typography>
                </ListItemIcon>
                <ListItemText
                  primary="Choose an SMS provider"
                  secondary="Options: Twilio, MessageBird, Vonage, or Textlocal"
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Typography variant="body2" fontWeight="bold">
                    4.
                  </Typography>
                </ListItemIcon>
                <ListItemText
                  primary="Enter your provider credentials"
                  secondary="Account SID, Auth Token, and Phone Number from your SMS provider"
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Typography variant="body2" fontWeight="bold">
                    5.
                  </Typography>
                </ListItemIcon>
                <ListItemText
                  primary="Enable Phone provider in Supabase"
                  secondary="Toggle the Phone provider to 'Enabled' and save"
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Typography variant="body2" fontWeight="bold">
                    6.
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
                    7.
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
