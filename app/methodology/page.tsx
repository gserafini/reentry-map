import type { Metadata } from 'next'
import { Box, Button, Container, Link as MuiLink, Stack, Typography } from '@mui/material'
import { createOpenGraphImage } from '@/lib/seo/open-graph'

const title = 'How Reentry Map Works | Reentry Map'
const description =
  'Learn how Reentry Map collects, checks, and updates directory information, and how to report a correction or suggest a resource.'
const socialImage = createOpenGraphImage({
  kind: 'directory',
  eyebrow: 'About the directory',
  title: 'How Reentry Map works',
  description: 'How information is checked and how to suggest a correction.',
})

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: 'https://reentrymap.org/methodology' },
  openGraph: {
    title,
    description,
    type: 'article',
    url: 'https://reentrymap.org/methodology',
    images: [socialImage],
  },
  twitter: { card: 'summary_large_image', title, description, images: [socialImage] },
}

export default function DirectoryMethodologyPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 } }}>
      <Typography
        variant="h1"
        sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 700, mb: 2 }}
      >
        How Reentry Map works
      </Typography>
      <Typography variant="h2" sx={{ fontSize: '1.5rem', fontWeight: 700, mt: 4, mb: 1 }}>
        A directory that keeps its limits visible
      </Typography>
      <Typography color="text.secondary" paragraph>
        Reentry Map is a free directory for finding employment, housing, food, health care, and
        other support. Listings help people find and contact providers; they do not guarantee that a
        service is open, available, or a fit for a person’s situation. Please contact the provider
        to confirm current hours, eligibility, costs, and intake requirements.
      </Typography>
      <Typography variant="h2" sx={{ fontSize: '1.5rem', fontWeight: 700, mt: 4, mb: 1 }}>
        Where information comes from
      </Typography>
      <Typography color="text.secondary" paragraph>
        The directory combines public information with suggestions from the community. A team
        reviews resource suggestions and checks their information before an approved suggestion is
        added. Information may change after it is checked, so a review date is not a promise that
        every detail remains current.
      </Typography>
      <Typography color="text.secondary" paragraph>
        A “Listing reviewed” date records a review of public information; it does not mean a
        provider confirmed an opening or that someone visited the site. Some listings show an
        automated public-information check and its date. That check is separate from a provider
        confirmation. It does not confirm current openings, hours, or whether someone qualifies.
        Listings without that badge have no displayed automated-check date.
      </Typography>
      <Typography variant="h2" sx={{ fontSize: '1.5rem', fontWeight: 700, mt: 4, mb: 1 }}>
        Location details
      </Typography>
      <Typography color="text.secondary" paragraph>
        A street address and directions are shown for listings marked as physical locations when
        address details are available. Hotline, online, mobile, confidential, and regional services
        may serve an area without having a public office there. Their coverage area is shown
        separately, and a map marker may be approximate. Check with the provider before traveling.
      </Typography>
      <Typography variant="h2" sx={{ fontSize: '1.5rem', fontWeight: 700, mt: 4, mb: 1 }}>
        Suggest a resource or report a correction
      </Typography>
      <Typography color="text.secondary" paragraph>
        You can suggest a resource for review; you will be asked to sign in to submit a suggestion.
        On a listing, use Report to flag information that may be wrong or out of date. No account is
        needed to report an issue. Reports are reviewed privately before a listing changes; do not
        include personal or medical information.
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mt: 3, alignItems: { xs: 'stretch', sm: 'center' } }}
      >
        <Button href="/suggest-resource" variant="contained">
          Suggest a resource
        </Button>
        <MuiLink href="/resources" underline="hover">
          Browse the directory
        </MuiLink>
      </Stack>
      <Box sx={{ mt: 5 }}>
        <Typography variant="body2" color="text.secondary">
          Need a correction? Open the resource listing and choose <strong>Report</strong>.
        </Typography>
      </Box>
    </Container>
  )
}
