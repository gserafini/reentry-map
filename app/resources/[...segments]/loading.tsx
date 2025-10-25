import { Container, Box, Skeleton, Card, CardContent, Stack, Divider } from '@mui/material'

/**
 * Loading state for Resource Detail Page
 * Displays skeleton loaders for all major content sections
 */
export default function ResourceDetailLoading() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="60%" height={56} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Skeleton variant="rounded" width={100} height={32} />
          <Skeleton variant="rounded" width={80} height={32} />
        </Box>
        <Skeleton variant="text" width={200} height={32} />
      </Box>

      {/* Description Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Skeleton variant="text" width={100} height={32} sx={{ mb: 2 }} />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="80%" />
        </CardContent>
      </Card>

      {/* Contact Information Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Skeleton variant="text" width={180} height={32} sx={{ mb: 2 }} />
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Skeleton variant="circular" width={24} height={24} />
              <Skeleton variant="text" width="40%" sx={{ flexGrow: 1 }} />
              <Skeleton variant="rounded" width={80} height={32} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Skeleton variant="circular" width={24} height={24} />
              <Skeleton variant="text" width="50%" sx={{ flexGrow: 1 }} />
              <Skeleton variant="rounded" width={80} height={32} />
            </Box>
            <Divider />
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="rounded" width="100%" height={40} />
          </Stack>
        </CardContent>
      </Card>

      {/* Details Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Skeleton variant="text" width={100} height={32} sx={{ mb: 2 }} />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="90%" />
        </CardContent>
      </Card>
    </Container>
  )
}
