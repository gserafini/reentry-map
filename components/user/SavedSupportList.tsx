'use client'

import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  GlobalStyles,
  Link,
  Stack,
  Typography,
} from '@mui/material'
import { Download, Print, Phone, DeleteOutline } from '@mui/icons-material'
import { supportListText, type SavedResource } from '@/lib/utils/saved-resources'

interface SavedSupportListProps {
  resources: SavedResource[]
  onRemove: (id: string) => void
  onClear?: () => void
}

export function SavedSupportList({ resources, onRemove, onClear }: SavedSupportListProps) {
  const [confirmClear, setConfirmClear] = useState(false)
  function download() {
    const url = URL.createObjectURL(
      new Blob([supportListText(resources)], { type: 'text/plain;charset=utf-8' })
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'my-reentry-support-list.txt'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <Box>
      <GlobalStyles
        styles={{
          '@media print': {
            'header, footer, nav, [data-print-hide]': { display: 'none !important' },
            '[data-support-card]': { breakInside: 'avoid', boxShadow: 'none', marginBottom: 16 },
            main: { paddingBottom: '0 !important' },
          },
        }}
      />
      {resources.length > 0 && (
        <Stack
          direction="row"
          useFlexGap
          flexWrap="wrap"
          spacing={1}
          sx={{ mb: 2 }}
          data-print-hide
        >
          <Button variant="outlined" startIcon={<Download />} onClick={download}>
            Download list
          </Button>
          <Button variant="outlined" startIcon={<Print />} onClick={() => window.print()}>
            Print
          </Button>
          {onClear && (
            <Button
              color="error"
              startIcon={<DeleteOutline />}
              onClick={() => setConfirmClear(true)}
            >
              Clear device list
            </Button>
          )}
        </Stack>
      )}
      {resources.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No resources saved here yet. Tap the heart on a resource to keep its contact details.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {resources.map((resource) => (
            <Card key={resource.id} variant="outlined" data-support-card>
              <CardContent>
                <Typography variant="h6" component="h3">
                  {resource.name}
                </Typography>
                <Typography sx={{ mt: 1 }}>
                  {resource.phone ? 'Phone: ' + resource.phone : 'Phone not listed'}
                </Typography>
                <Stack
                  direction="row"
                  useFlexGap
                  flexWrap="wrap"
                  spacing={1}
                  sx={{ mt: 2 }}
                  data-print-hide
                >
                  {resource.phone && (
                    <Button
                      variant="contained"
                      startIcon={<Phone />}
                      href={'tel:' + resource.phone.replace(/[^+\d]/g, '')}
                    >
                      Call
                    </Button>
                  )}
                  <Button href={resource.url} variant="outlined">
                    Current details
                  </Button>
                  <Button
                    color="error"
                    onClick={() => onRemove(resource.id)}
                    aria-label={'Remove ' + resource.name + ' from saved list'}
                  >
                    Remove
                  </Button>
                </Stack>
                {resource.description && (
                  <Typography sx={{ mt: 1 }}>{resource.description}</Typography>
                )}
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {resource.location || 'Location not listed'}
                </Typography>
                <Typography sx={{ mt: 1 }}>
                  <strong>Who this helps:</strong> {resource.eligibility}
                </Typography>
                <Typography sx={{ mt: 1 }}>
                  <strong>Next step:</strong> {resource.intake}
                </Typography>
                {resource.website && (
                  <Typography sx={{ overflowWrap: 'anywhere' }}>
                    <Link href={resource.website} target="_blank" rel="noopener noreferrer">
                      {resource.website}
                    </Link>
                  </Typography>
                )}
                <Typography variant="caption" component="p" color="text.secondary" sx={{ mt: 1 }}>
                  {resource.checked
                    ? 'Listing last checked: ' + resource.checked.slice(0, 10) + '. '
                    : 'Check date not listed. '}
                  Saved copy: {resource.savedAt.slice(0, 10)}. Confirm details before visiting.
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
      <Dialog open={confirmClear} onClose={() => setConfirmClear(false)}>
        <DialogTitle>Clear saved resources from this device?</DialogTitle>
        <DialogContent>
          This removes this browser&apos;s saved copies. Downloaded files and account favorites are
          separate.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClear(false)}>Keep list</Button>
          <Button
            color="error"
            onClick={() => {
              onClear?.()
              setConfirmClear(false)
            }}
          >
            Clear device list
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
