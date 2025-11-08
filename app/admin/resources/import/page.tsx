'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Container,
  Typography,
  Box,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material'
import {
  Upload as UploadIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  CloudUpload as ImportIcon,
} from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { checkCurrentUserIsAdmin } from '@/lib/utils/admin'

interface ResourcePreview {
  name: string
  primary_category: string
  address: string
  phone?: string
  email?: string
  website?: string
  status?: string
  valid: boolean
  errors: string[]
}

export default function BulkImportPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  // UI state
  const [file, setFile] = useState<File | null>(null)
  const [resources, setResources] = useState<ResourcePreview[]>([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Check admin
  useEffect(() => {
    async function checkAdmin() {
      if (!authLoading && !isAuthenticated) {
        router.push('/auth/login?redirect=/admin/resources/import')
        return
      }
      if (user) {
        const adminStatus = await checkCurrentUserIsAdmin()
        setIsAdmin(adminStatus)
        if (!adminStatus) router.push('/')
        setCheckingAdmin(false)
      }
    }
    checkAdmin()
  }, [user, authLoading, isAuthenticated, router])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validateResource = (resource: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!resource.name || typeof resource.name !== 'string') {
      errors.push('Name is required')
    }
    if (!resource.primary_category || typeof resource.primary_category !== 'string') {
      errors.push('Primary category is required')
    }
    if (!resource.address || typeof resource.address !== 'string') {
      errors.push('Address is required')
    }

    return { valid: errors.length === 0, errors }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)
    setSuccess(null)
    setResources([])

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string) as unknown

        // Ensure it's an array
        const resourcesArray = Array.isArray(json)
          ? json
          : (json as { resources?: unknown[] }).resources || []

        if (!Array.isArray(resourcesArray)) {
          setError('Invalid JSON format. Expected an array of resources.')
          return
        }

        // Validate each resource
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const previews: ResourcePreview[] = resourcesArray.map((resource: any) => {
          const { valid, errors } = validateResource(resource)
          return {
            name: resource.name || '',
            primary_category: resource.primary_category || '',
            address: resource.address || '',
            phone: resource.phone,
            email: resource.email,
            website: resource.website,
            status: resource.status || 'active',
            valid,
            errors,
          }
        })

        setResources(previews)
      } catch (err) {
        setError('Failed to parse JSON file. Please check the file format.')
        console.error(err)
      }
    }

    reader.readAsText(selectedFile)
  }

  const handleImport = async () => {
    const validResources = resources.filter((r) => r.valid)

    if (validResources.length === 0) {
      setError('No valid resources to import')
      return
    }

    setImporting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/resources/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resources: validResources }),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string }
        throw new Error(errorData.message || 'Failed to import resources')
      }

      const result = (await response.json()) as { imported: number }
      setSuccess(
        `Successfully imported ${result.imported} resource${result.imported === 1 ? '' : 's'}`
      )

      // Clear the form after success
      setTimeout(() => {
        router.push('/admin/resources')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import resources. Please try again.')
      console.error(err)
    } finally {
      setImporting(false)
    }
  }

  const validCount = resources.filter((r) => r.valid).length
  const invalidCount = resources.length - validCount

  if (authLoading || checkingAdmin) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (!isAdmin) return null

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Bulk Import Resources
        </Typography>
        <Button variant="outlined" onClick={() => router.push('/admin/resources')}>
          Back to List
        </Button>
      </Box>

      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" gutterBottom>
          <strong>Upload a JSON file</strong> containing an array of resources to import.
        </Typography>
        <Typography variant="body2" component="div">
          <strong>Required fields:</strong> name, primary_category, address
          <br />
          <strong>Optional fields:</strong> phone, email, website, description, hours, services
          (array), latitude, longitude, status, verified
        </Typography>
      </Alert>

      {/* Example Format */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.900', color: 'grey.100' }}>
        <Typography variant="subtitle2" gutterBottom>
          Example JSON format:
        </Typography>
        <pre style={{ margin: 0, overflow: 'auto' }}>
          {JSON.stringify(
            [
              {
                name: 'Oakland Job Center',
                primary_category: 'employment',
                address: '123 Main St, Oakland, CA 94601',
                phone: '(510) 555-1234',
                email: 'info@oaklandjobs.org',
                website: 'https://oaklandjobs.org',
                description: 'Career counseling and job placement',
                hours: 'Mon-Fri 9am-5pm',
                services: ['Job training', 'Resume help', 'Interview prep'],
                status: 'active',
                verified: true,
              },
            ],
            null,
            2
          )}
        </pre>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* File Upload */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="contained" component="label" startIcon={<UploadIcon />}>
            Choose JSON File
            <input type="file" accept=".json" hidden onChange={handleFileChange} />
          </Button>
          {file && (
            <Typography variant="body2" color="text.secondary">
              {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Preview Table */}
      {resources.length > 0 && (
        <>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Chip icon={<CheckIcon />} label={`${validCount} Valid`} color="success" />
                {invalidCount > 0 && (
                  <Chip icon={<WarningIcon />} label={`${invalidCount} Invalid`} color="error" />
                )}
              </Box>
              <Button
                variant="contained"
                color="primary"
                startIcon={importing ? <CircularProgress size={16} /> : <ImportIcon />}
                onClick={handleImport}
                disabled={importing || validCount === 0}
              >
                Import {validCount} Resource{validCount === 1 ? '' : 's'}
              </Button>
            </Box>
          </Paper>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Errors</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resources.map((resource, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      bgcolor: resource.valid ? 'inherit' : 'error.light',
                      opacity: resource.valid ? 1 : 0.7,
                    }}
                  >
                    <TableCell>
                      {resource.valid ? (
                        <Chip icon={<CheckIcon />} label="Valid" color="success" size="small" />
                      ) : (
                        <Chip icon={<WarningIcon />} label="Invalid" color="error" size="small" />
                      )}
                    </TableCell>
                    <TableCell>{resource.name || <em>Missing</em>}</TableCell>
                    <TableCell>{resource.primary_category || <em>Missing</em>}</TableCell>
                    <TableCell>{resource.address || <em>Missing</em>}</TableCell>
                    <TableCell>{resource.phone || '-'}</TableCell>
                    <TableCell>{resource.email || '-'}</TableCell>
                    <TableCell>
                      {resource.errors.length > 0 ? (
                        <Box>
                          {resource.errors.map((err, i) => (
                            <Typography key={i} variant="caption" color="error" display="block">
                              • {err}
                            </Typography>
                          ))}
                        </Box>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Empty State */}
      {resources.length === 0 && !error && (
        <Paper
          sx={{
            p: 8,
            textAlign: 'center',
            bgcolor: 'grey.50',
            border: '2px dashed',
            borderColor: 'grey.300',
          }}
        >
          <UploadIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No file selected
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose a JSON file to preview and import resources
          </Typography>
        </Paper>
      )}
    </Container>
  )
}
