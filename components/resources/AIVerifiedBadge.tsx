'use client'

import { useState } from 'react'
import { Box, Chip, Popover, Typography } from '@mui/material'
import { InfoOutlined } from '@mui/icons-material'

export const AI_VERIFIED_EXPLANATION =
  'An automated check reviewed public information about this organization. This is not a confirmation from the provider, and it does not confirm available spaces, current hours, or whether you qualify. Contact the organization before visiting.'

/** A dated public-information check, never a promise of provider availability. */
export function AIVerifiedBadge({ checkedAt }: { checkedAt?: string | null }) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const date = checkedAt ? new Date(checkedAt) : null
  const dateLabel =
    date && Number.isFinite(date.getTime())
      ? date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : null
  return (
    <>
      <Chip
        icon={<InfoOutlined />}
        label={dateLabel ? 'Automated check · ' + dateLabel : 'Automated check'}
        variant="outlined"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label={
          dateLabel ? 'About the automated check on ' + dateLabel : 'About automated checks'
        }
        sx={{
          cursor: 'pointer',
          maxWidth: '100%',
          '& .MuiChip-label': { whiteSpace: 'normal' },
          height: 'auto',
          minHeight: 32,
          py: 0.5,
        }}
      />
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, maxWidth: 320 }}>
          <Typography variant="subtitle2" gutterBottom>
            What an automated check means
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {AI_VERIFIED_EXPLANATION}
          </Typography>
          {!dateLabel && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Check date unavailable.
            </Typography>
          )}
        </Box>
      </Popover>
    </>
  )
}
