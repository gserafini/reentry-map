'use client'

import { useState } from 'react'
import { Box, Chip, Popover, Typography } from '@mui/material'
import { Verified as VerifiedIcon } from '@mui/icons-material'

export const AI_VERIFIED_EXPLANATION =
  'This resource was checked by our automated verification system, which reviews the organization’s website and public listings to confirm it appears active and that its contact information, location, and services look accurate. AI verification complements — but does not replace — human review, so please confirm time-sensitive details like hours before visiting.'

/**
 * Badge shown on verified resources. Labeled "AI Verified" and tappable to
 * reveal a plain-language explanation of what that means — a popover rather
 * than a hover tooltip so it works on touch devices (the primary audience).
 */
export function AIVerifiedBadge() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  return (
    <>
      <Chip
        icon={<VerifiedIcon />}
        label="AI Verified"
        color="success"
        variant="outlined"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label="What “AI Verified” means — tap to learn more"
        sx={{ cursor: 'pointer' }}
      />
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, maxWidth: 320 }}>
          <Typography variant="subtitle2" gutterBottom>
            What “AI Verified” means
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {AI_VERIFIED_EXPLANATION}
          </Typography>
        </Box>
      </Popover>
    </>
  )
}
