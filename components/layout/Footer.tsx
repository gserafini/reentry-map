'use client'

import { Box, Container, Typography, Link as MuiLink } from '@mui/material'
import Link from 'next/link'

/**
 * Footer Component
 * Displays site-wide footer with useful links
 */
export function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) =>
          theme.palette.mode === 'light' ? theme.palette.grey[200] : theme.palette.grey[800],
        borderTop: '1px solid',
        borderColor: 'divider',
        display: { xs: 'none', md: 'block' }, // Hidden on mobile (bottom nav instead)
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Reentry Map. All rights reserved.
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <MuiLink
              component={Link}
              href="/suggest-resource"
              variant="body2"
              color="text.secondary"
              underline="hover"
            >
              Suggest Resource
            </MuiLink>
            <MuiLink
              href="/sitemap.xml"
              variant="body2"
              color="text.secondary"
              underline="hover"
              target="_blank"
            >
              Sitemap
            </MuiLink>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
