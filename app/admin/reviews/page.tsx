import { Box, Typography, Paper, Alert, AlertTitle } from '@mui/material'
import { RateReview as ReviewIcon } from '@mui/icons-material'

export default function AdminReviewsPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Review Moderation
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Moderate user reviews and ratings
      </Typography>

      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <ReviewIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
        <Alert severity="info">
          <AlertTitle>Coming Soon</AlertTitle>
          Review moderation features will be available in a future update. This will include review
          flagging, approval workflows, and content moderation tools.
        </Alert>
      </Paper>
    </Box>
  )
}
