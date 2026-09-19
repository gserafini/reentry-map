'use client'

import { useEffect, useState } from 'react'
import { Box, FormControlLabel, Switch, Typography } from '@mui/material'
import { analytics, enableAnalytics, disableAnalytics } from '@/lib/analytics/queue'

export function AnalyticsPreference() {
  const [enabled, setEnabled] = useState(false)
  const [browserOptOut, setBrowserOptOut] = useState(false)
  useEffect(() => {
    setEnabled(analytics.isTrackingEnabled())
    setBrowserOptOut(
      navigator.doNotTrack === '1' ||
        Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl)
    )
  }, [])
  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            disabled={browserOptOut}
            slotProps={{ input: { role: 'switch' } }}
            onChange={(_, checked) => {
              if (checked) enableAnalytics()
              else disableAnalytics()
              setEnabled(checked)
            }}
          />
        }
        label="Share usage statistics"
      />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {browserOptOut
          ? 'Off because your browser requests privacy.'
          : 'Optional. Helps us improve finding and contacting resources.'}
      </Typography>
    </Box>
  )
}
