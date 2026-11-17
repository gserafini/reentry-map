import type { Metadata } from 'next'
import { Button, Container, Link as MuiLink, Stack, Typography } from '@mui/material'
import { createOpenGraphImage } from '@/lib/seo/open-graph'

const title = 'About Reentry Map | Reentry Map'
const description =
  'Reentry Map is a free directory to help people find employment, housing, food, health care, and other support connected to reentry.'
const socialImage = createOpenGraphImage({
  kind: 'directory',
  eyebrow: 'About Reentry Map',
  title: 'Find support for your next step',
  description: 'A free directory of services connected to reentry.',
})

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: 'https://reentrymap.org/about' },
  openGraph: {
    title,
    description,
    type: 'article',
    url: 'https://reentrymap.org/about',
    images: [socialImage],
  },
  twitter: { card: 'summary_large_image', title, description, images: [socialImage] },
}

export default function AboutPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 } }}>
      <Typography
        variant="h1"
        sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 700, mb: 2 }}
      >
        About Reentry Map
      </Typography>
      <Typography color="text.secondary" paragraph>
        Reentry Map is a free directory for finding employment, housing, food, health care, and
        other support connected to reentry. You can search listings by service and location, then
        contact providers to ask about current services.
      </Typography>
      <Typography color="text.secondary" paragraph>
        ReentryMap.org publishes this directory to make service information easier to find. Listed
        providers deliver their own services. A listing is a starting point: it does not guarantee
        that a service is open, has space available, or will meet a person’s eligibility needs.
      </Typography>
      <Typography variant="h2" sx={{ fontSize: '1.5rem', fontWeight: 700, mt: 4, mb: 1 }}>
        Contact and corrections
      </Typography>
      <Typography color="text.secondary" paragraph>
        To suggest a resource, use the submission form. To correct a listing, open that listing and
        choose Report. Reports are reviewed privately before a listing changes. Please leave out
        personal or medical information.
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mt: 3, alignItems: { xs: 'stretch', sm: 'center' } }}
      >
        <Button href="/suggest-resource" variant="contained">
          Suggest a resource
        </Button>
        <MuiLink href="/methodology" underline="hover">
          How information is checked
        </MuiLink>
        <MuiLink href="/resources" underline="hover">
          Browse the directory
        </MuiLink>
      </Stack>
    </Container>
  )
}
