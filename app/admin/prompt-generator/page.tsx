'use client'

import { useState } from 'react'
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Snackbar,
} from '@mui/material'
import {
  Psychology as AIIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'

const CATEGORIES = [
  'employment',
  'housing',
  'food',
  'healthcare',
  'legal_aid',
  'mental_health',
  'substance_abuse',
  'education',
  'transportation',
  'clothing',
  'id_documents',
  'faith_based',
  'general_support',
]

const US_STATES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
]

export default function PromptGeneratorPage() {
  // Form state
  const [city, setCity] = useState('Oakland')
  const [state, setState] = useState('CA')
  const [targetCount, setTargetCount] = useState(25)
  const [batchNumber, setBatchNumber] = useState(2)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [existingCoverage, setExistingCoverage] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [error, setError] = useState('')
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')

  const handleGeneratePrompt = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/prompt-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          state,
          targetCount,
          categories: selectedCategories.length > 0 ? selectedCategories : undefined,
          existingCoverage: existingCoverage || undefined,
          batchNumber,
        }),
      })

      const data = (await response.json()) as { prompt?: string; error?: string }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate prompt')
      }

      setGeneratedPrompt(data.prompt || '')
    } catch (_err) {
      setError(_err instanceof Error ? _err.message : 'Failed to generate prompt')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt)
      setSnackbarMessage('Prompt copied to clipboard!')
      setSnackbarOpen(true)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }

  const handleDownloadPrompt = () => {
    const filename = `${city.toLowerCase().replace(/\s+/g, '-')}-prompt-batch-${batchNumber}.txt`
    const blob = new Blob([generatedPrompt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setSnackbarMessage(`Downloaded as ${filename}`)
    setSnackbarOpen(true)
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <AIIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Claude Web Prompt Generator
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Generate customized prompts for Claude Web to discover reentry resources in new cities
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          <strong>Community Tool:</strong> Anyone can use this to help discover resources! Generate
          a prompt, use it with Claude Web, and submit the results via the admin import tool.
        </Alert>
      </Box>

      {/* Form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Configuration
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
          {/* City & State */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              fullWidth
              required
            />
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>State</InputLabel>
              <Select value={state} onChange={(e) => setState(e.target.value)} label="State">
                {US_STATES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Target Count & Batch Number */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Target Resource Count"
              type="number"
              value={targetCount}
              onChange={(e) => setTargetCount(parseInt(e.target.value))}
              inputProps={{ min: 1, max: 100 }}
              fullWidth
            />
            <TextField
              label="Batch Number"
              type="number"
              value={batchNumber}
              onChange={(e) => setBatchNumber(parseInt(e.target.value))}
              inputProps={{ min: 1 }}
              fullWidth
            />
          </Box>

          {/* Categories */}
          <FormControl fullWidth>
            <InputLabel>Focus Categories (optional - leave empty for all)</InputLabel>
            <Select
              multiple
              value={selectedCategories}
              onChange={(e) => setSelectedCategories(e.target.value as string[])}
              label="Focus Categories (optional - leave empty for all)"
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {category.replace('_', ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Existing Coverage Notes */}
          <TextField
            label="Existing Coverage Notes (optional)"
            multiline
            rows={3}
            value={existingCoverage}
            onChange={(e) => setExistingCoverage(e.target.value)}
            placeholder="e.g., We already have good housing coverage, need more employment and healthcare resources"
            fullWidth
          />

          {/* Generate Button */}
          <Button
            variant="contained"
            size="large"
            onClick={handleGeneratePrompt}
            disabled={loading || !city || !state || !targetCount}
            startIcon={loading ? <CircularProgress size={20} /> : <AIIcon />}
          >
            {loading ? 'Generating...' : 'Generate Prompt'}
          </Button>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Generated Prompt */}
      {generatedPrompt && (
        <Paper sx={{ p: 3 }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="h6">Generated Prompt</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton color="primary" onClick={handleCopyPrompt} title="Copy to clipboard">
                <CopyIcon />
              </IconButton>
              <IconButton
                color="primary"
                onClick={handleDownloadPrompt}
                title="Download as text file"
              >
                <DownloadIcon />
              </IconButton>
              <IconButton onClick={handleGeneratePrompt} title="Regenerate">
                <RefreshIcon />
              </IconButton>
            </Box>
          </Box>

          <Box
            sx={{
              bgcolor: 'grey.100',
              p: 2,
              borderRadius: 1,
              maxHeight: '600px',
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
            }}
          >
            {generatedPrompt}
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Next Steps:</strong>
            </Typography>
            <Typography variant="body2">
              1. Copy this prompt using the copy button above
              <br />
              2. Open Claude Web (claude.ai)
              <br />
              3. Paste the prompt and let Claude Web search for resources
              <br />
              4. Download the resulting JSON file
              <br />
              5. Import it via Admin → Resources → Import
            </Typography>
          </Alert>
        </Paper>
      )}

      {/* Snackbar for copy/download confirmations */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Container>
  )
}
