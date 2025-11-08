import { Box, Typography, Paper, Alert, AlertTitle } from '@mui/material'
import { Lightbulb as SuggestionIcon } from '@mui/icons-material'

export default function AdminSuggestionsPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Resource Suggestions
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Review and approve user-submitted resource suggestions
      </Typography>

      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <SuggestionIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
        <Alert severity="info">
          <AlertTitle>Coming Soon</AlertTitle>
          Resource suggestion management will be available in a future update. This will allow you
          to review, approve, or reject community-submitted resources.
        </Alert>
      </Paper>
    </Box>
  )
}
