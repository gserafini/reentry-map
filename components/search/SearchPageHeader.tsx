import { Box, Typography } from '@mui/material'

export function SearchPageHeader({ search }: { search?: string }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant="h4"
        component="h1"
        sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 700 }}
      >
        {search ? <>Help with &ldquo;{search}&rdquo;</> : 'Find help in your community'}
      </Typography>
    </Box>
  )
}
