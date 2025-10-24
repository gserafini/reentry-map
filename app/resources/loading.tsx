import { Container, Box, Skeleton, Grid, Card, CardContent } from '@mui/material'

/**
 * Loading state for Resources page
 * Displayed while the server component is fetching data
 */
export default function ResourcesLoading() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={500} height={24} />
      </Box>

      <Grid container spacing={3}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="75%" height={32} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="50%" height={24} sx={{ mb: 2 }} />
                <Skeleton variant="text" width="100%" height={20} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  )
}
