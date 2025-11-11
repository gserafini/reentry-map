'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  Alert,
  Button,
} from '@mui/material'
import {
  Visibility,
  Edit,
  CheckCircle,
  Pending,
  Search,
  ContentCopy,
  SmartToy,
  Settings,
  Warning,
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { RealtimeVerificationViewer } from '@/components/admin/RealtimeVerificationViewer'
import { getAISystemStatus } from '@/lib/api/settings'
import type { AISystemStatus } from '@/lib/types/settings'

interface ExpansionPriority {
  id: string
  city: string
  state: string
  priority_score: number
  priority_tier: number
  phase: string
  resource_count: number
  target_resource_count: number
  status: string
  population?: number
  research_status: string
  strategic_rationale?: string
  priority_categories?: string[]
}

interface ResourceSuggestion {
  id: string
  name: string
  city: string
  state: string
  status: string
  created_at: string
  category: string
}

interface AgentSession {
  id: string
  agent_type: string
  agent_id: string
  started_at: string
  last_activity_at: string
  resources_processed: number
  approvals: number
  rejections: number
  current_task_id: string | null
}

export default function CommandCenterPage() {
  const [coverageData, setCoverageData] = useState<ExpansionPriority[]>([])
  const [nextExpansion, setNextExpansion] = useState<ExpansionPriority | null>(null)
  const [submittedResources, setSubmittedResources] = useState<ResourceSuggestion[]>([])
  const [agentSessions, setAgentSessions] = useState<AgentSession[]>([])
  const [aiSystemStatus, setAiSystemStatus] = useState<AISystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [agentPrompt, setAgentPrompt] = useState<string>('')
  const [copySuccess, setCopySuccess] = useState(false)
  const [agentType, setAgentType] = useState<'code' | 'web'>('code')
  const [pendingImports, setPendingImports] = useState<{ fileCount: number; files: string[] }>({
    fileCount: 0,
    files: [],
  })
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
    stats?: {
      processed: number
      autoApproved: number
      flagged: number
      rejected: number
    }
  } | null>(null)

  const supabase = createClient()

  // Helper function to copy to clipboard
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(agentPrompt)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Check for pending import files
  const checkForImportFiles = async () => {
    try {
      const response = await fetch('/api/admin/import-files')
      if (response.ok) {
        const data = (await response.json()) as {
          hasFiles: boolean
          fileCount: number
          files: string[]
        }
        if (data.hasFiles) {
          setPendingImports({
            fileCount: data.fileCount,
            files: data.files,
          })
        } else {
          setPendingImports({ fileCount: 0, files: [] })
        }
      }
    } catch (error) {
      console.error('Error checking for import files:', error)
    }
  }

  // Trigger import of pending files
  const handleImportFiles = async () => {
    setImporting(true)
    setImportResult(null)

    try {
      const response = await fetch('/api/admin/import-files', {
        method: 'POST',
      })

      const data = (await response.json()) as {
        success: boolean
        message: string
        stats: {
          processed: number
          failed: number
          totalResources: number
          autoApproved: number
          flagged: number
          rejected: number
        }
      }

      if (response.ok) {
        setImportResult({
          success: true,
          message: data.message,
          stats: data.stats,
        })
        setPendingImports({ fileCount: 0, files: [] })

        // Refresh the suggestions list
        const { data: suggestions } = await supabase
          .from('resource_suggestions')
          .select('id, name, city, state, status, created_at, category')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(50)

        if (suggestions) {
          setSubmittedResources(suggestions)
        }
      } else {
        setImportResult({
          success: false,
          message: data.message || 'Import failed',
        })
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Import failed',
      })
    } finally {
      setImporting(false)
    }
  }

  // Helper function to generate agent prompt
  const generateAgentPrompt = (
    target: ExpansionPriority,
    type: 'code' | 'web' = 'code'
  ): string => {
    // priority_categories is JSONB array of objects: [{category: "employment", priority: "high"}, ...]
    // Handle both array of objects and array of strings
    const categories =
      target.priority_categories && target.priority_categories.length > 0
        ? (target.priority_categories as unknown as Array<{ category: string } | string>)
            .map((cat) => (typeof cat === 'string' ? cat : cat.category))
            .join(', ')
        : 'employment, housing, healthcare, legal aid, substance abuse treatment, mental health, food assistance, education, reentry services'

    return `🎯 RESEARCH MISSION: ${target.city}, ${target.state} Reentry Resources

TARGET: ${target.city}, ${target.state}
PRIORITY SCORE: ${target.priority_score}
TARGET RESOURCES: ${target.target_resource_count}
CURRENT PROGRESS: ${target.resource_count || 0}/${target.target_resource_count}
REMAINING: ${(target.target_resource_count || 50) - (target.resource_count || 0)}
FOCUS CATEGORIES: ${categories}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔬 RESEARCH METHODOLOGY (READ THIS CAREFULLY!)

This is NOT a template-filling exercise. You must RESEARCH each organization individually.

⚠️ CRITICAL DATA QUALITY RULES:
1. NEVER copy the example below - it's from a REAL organization to show the level of detail expected
2. NEVER make up contact information - this is the most important data we have
3. NEVER use generic descriptions - get the ACTUAL services from their website
4. BLANK is better than WRONG - if you can't find something, leave it out
5. ACCURACY > COMPLETENESS - one perfect resource beats ten sloppy ones

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 FIELD-BY-FIELD RESEARCH GUIDE:

┌─ CONTACT INFORMATION (MOST CRITICAL!) ─────────────────────────────────┐
│ This is THE MOST IMPORTANT data. People need to contact these orgs.    │
│                                                                         │
│ ✓ DO:                                                                   │
│   • Visit the organization's actual website                            │
│   • Find their Contact page, About page, footer                        │
│   • Copy phone numbers EXACTLY as shown                                │
│   • Get email from contact forms or staff listings                     │
│   • Include ALL available contact methods                              │
│                                                                         │
│ ✗ DON'T:                                                                │
│   • Skip phone/email - these are CRITICAL                              │
│   • Guess phone numbers or use placeholder formats                     │
│   • Use generic emails unless verified on their site                   │
│   • Include broken/outdated links                                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─ SERVICES OFFERED (BE SPECIFIC!) ──────────────────────────────────────┐
│ Use the organization's OWN language - not generic categories.          │
│                                                                         │
│ WHERE TO LOOK:                                                          │
│   • "Services" or "Programs" page                                      │
│   • "What We Do" section                                               │
│   • Navigation menu items                                              │
│                                                                         │
│ ✓ GOOD: ["Pre-Apprenticeship Program", "On-the-Job Training (OJT)",   │
│          "Job Placement Services", "Career Counseling"]                │
│ ✗ BAD:  ["job training", "resume help"] (too generic)                  │
│                                                                         │
│ ⚠️ DO NOT copy the example - each org offers different services!       │
└─────────────────────────────────────────────────────────────────────────┘

┌─ ELIGIBILITY REQUIREMENTS (ACCURACY CRITICAL!) ────────────────────────┐
│ Only include what is EXPLICITLY STATED on their website.               │
│                                                                         │
│ WHERE TO LOOK:                                                          │
│   • "Eligibility" or "Who Can Apply" page                              │
│   • Program descriptions                                               │
│   • FAQ sections                                                       │
│                                                                         │
│ INCLUDE:                                                                │
│   • Age ranges (e.g., "18-24 years old")                               │
│   • Income limits (e.g., "Below 200% federal poverty level")           │
│   • Geographic restrictions (e.g., "Must live in Alameda County")      │
│   • Documentation needed (e.g., "Valid ID required")                   │
│   • Specific populations served (e.g., "Justice-involved individuals") │
│                                                                         │
│ ✗ DON'T assume "formerly incarcerated" - verify it's stated!           │
│ ✗ DON'T infer requirements - only state what's explicit                │
└─────────────────────────────────────────────────────────────────────────┘

┌─ DESCRIPTION ──────────────────────────────────────────────────────────┐
│ Summarize what the organization does in 1-3 sentences.                 │
│                                                                         │
│ ✓ GOOD: "Workforce development agency offering job training,           │
│          placement services, and employer partnerships for adults       │
│          and youth in Oakland."                                        │
│                                                                         │
│ ✗ BAD:  "They help people find jobs." (too vague)                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─ CATEGORIZATION ───────────────────────────────────────────────────────┐
│ primary_category: Pick ONE main category that best fits                │
│   • employment, housing, healthcare, mental_health, legal_aid, etc.    │
│                                                                         │
│ categories: Include ALL applicable categories (array)                  │
│   • Many orgs offer multiple types of services                         │
│                                                                         │
│ tags: Specific searchable terms from their actual programs             │
│   • Use their program names, service types                             │
│   • Examples: "job placement", "vocational training", "GED"            │
└─────────────────────────────────────────────────────────────────────────┘

┌─ OPTIONAL BUT VALUABLE ────────────────────────────────────────────────┐
│ • hours: Operating hours (look for "Hours" on contact page)            │
│ • required_documents: What IDs/docs are needed                         │
│ • fees: Cost info ("Free", "$25 application fee", etc.)                │
│ • languages: Languages spoken besides English                          │
│ • accessibility_features: Wheelchair access, parking, etc.             │
│ • org_name: Parent organization (if it's a branch/location)            │
│ • location_name: Branch name (e.g., "Oakland Office")                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─ PROVENANCE (REQUIRED!) ───────────────────────────────────────────────┐
│ Track where you found this information for quality assurance.          │
│                                                                         │
│ • source: How you found it                                             │
│   → "google_search", "211_database", "government_directory"            │
│                                                                         │
│ • source_url: The actual URL where you found the info                  │
│   → Usually the organization's website or directory listing            │
│                                                                         │
│ • discovered_via: Discovery method                                     │
│   → "websearch", "webfetch", "api"                                     │
│                                                                         │
│ • discovery_notes: Your search query or notes                          │
│   → "Search: 'Oakland reentry employment services'"                    │
└─────────────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 REAL EXAMPLE (showing expected level of detail):

⚠️ DO NOT COPY THIS - it's from Oakland Private Industry Council, a real org.
   Your resources should be equally specific but have DIFFERENT information!

{
  "resources": [
    {
      "name": "Oakland Private Industry Council (Oakland PIC)",
      "description": "Workforce development agency providing job training, placement services, and employer partnerships for adults, youth, and dislocated workers in Oakland and surrounding areas.",
      "address": "1212 Broadway, Suite 600",
      "city": "${target.city}",
      "state": "${target.state}",
      "zip": "94612",

      "phone": "(510) 768-3500",
      "website": "https://oaklandpic.org",
      "email": "info@oaklandpic.org",

      "primary_category": "employment",
      "categories": ["employment", "education"],
      "tags": ["job training", "on-the-job training", "WIOA", "youth programs", "career counseling"],

      "services_offered": [
        "On-the-Job Training (OJT) Program",
        "Adult Program (WIOA Title I)",
        "Dislocated Worker Program",
        "Youth Program (ages 16-24)",
        "Business Services",
        "Career Counseling",
        "Job Placement Assistance"
      ],

      "eligibility_requirements": "Adults 18+, youth ages 16-24. Must meet income requirements for WIOA programs or be a dislocated worker. Priority for veterans, low-income individuals, people with disabilities, and those with barriers to employment. Geographic focus on Oakland and Alameda County.",

      "hours": {
        "monday": {"open": "08:30", "close": "17:00"},
        "tuesday": {"open": "08:30", "close": "17:00"},
        "wednesday": {"open": "08:30", "close": "17:00"},
        "thursday": {"open": "08:30", "close": "17:00"},
        "friday": {"open": "08:30", "close": "17:00"}
      },

      "required_documents": ["Valid ID", "Proof of income", "Proof of address"],
      "fees": "Free - funded by federal WIOA grants",
      "languages": ["English", "Spanish"],
      "accessibility_features": ["Wheelchair accessible", "Elevator access", "Public transit nearby"],

      "source": "google_search",
      "source_url": "https://oaklandpic.org",
      "discovered_via": "websearch",
      "discovery_notes": "Found via Google search: 'Oakland employment services reentry'"
    }
  ]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${
  type === 'code'
    ? `🔌 SUBMISSION (CLAUDE CODE):

API ENDPOINT:
POST ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3003'}/api/resources/suggest-batch

AUTHENTICATION:
Use the admin API key from your /systems command:

Headers:
{
  "Content-Type": "application/json",
  "x-admin-api-key": "YOUR_ADMIN_API_KEY"
}

BATCH SIZE: 5-20 resources per submission (don't overwhelm the queue)

EXAMPLE API CALL:
\`\`\`bash
curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3003'}/api/resources/suggest-batch \\
  -H "Content-Type: application/json" \\
  -H "x-admin-api-key: YOUR_API_KEY" \\
  -d @resources.json
\`\`\``
    : `💾 SUBMISSION (CLAUDE WEB):

⚠️ Claude Web cannot POST to the API directly. Instead, save to the import directory:

WORKFLOW:
1. Research resources following the guide above
2. Save to JSON file: data-imports/${target.city.toLowerCase().replace(/\s+/g, '-')}-${target.state.toLowerCase()}-resources.json
3. File is saved locally - Command Center can see it immediately
4. Refresh Command Center page - you'll see an "Import Now" button
5. Click to import - your file gets auto-processed and archived

NOTE: Claude Web commits to a branch automatically. You'll need to review and merge that branch
manually later. But the import works immediately with the local file - no git push/pull needed.

FILE FORMAT:
{
  "resources": [
    {
      "name": "Organization Name",
      "address": "123 Main St",
      "city": "${target.city}",
      "state": "${target.state}",
      "phone": "(555) 555-1234",
      "website": "https://example.org",
      "description": "What they do...",
      "primary_category": "employment",
      "services_offered": ["Service 1", "Service 2"],
      "source": "google_search",
      "source_url": "https://example.org"
    }
  ],
  "submitter": "claude_web",
  "notes": "Research for ${target.city}, ${target.state} expansion"
}

IMPORTANT:
- Save to data-imports/ directory (not root!)
- Valid JSON format (use the schema shown in the example above)
- 5-20 resources per file (don't create huge files)
- Files are automatically archived after import`
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 YOUR WORKFLOW:

1. Search for reentry resources in ${target.city}, ${target.state}
   → Try: "[category] services ${target.city} ${target.state} reentry"
   → Also try: "reentry services ${target.city} ${target.state}"
   → Check: 211.org, local government sites, Google, community directories

2. For EACH resource you find:
   → Visit their website
   → Read their Services/Programs page
   → Copy contact info EXACTLY
   → Note their specific programs/services
   → Check eligibility requirements
   → Record where you found the info (provenance)

3. Submit in batches of 5-20 resources
   → Quality over quantity
   → Each resource should be complete and accurate

4. The system will auto-verify and approve high-quality submissions
   → 87% auto-approval rate for complete, accurate data
   → Low-quality data gets flagged for human review

START RESEARCHING! Remember: ACCURACY > COMPLETENESS. One perfect resource > ten sloppy ones.`
  }

  // Fetch initial data
  useEffect(() => {
    async function fetchInitialData() {
      try {
        // Fetch expansion priorities (nationwide)
        const { data: priorities } = await supabase
          .from('expansion_priorities')
          .select('*')
          .order('priority_score', { ascending: false })
          .limit(10)

        if (priorities) {
          setCoverageData(priorities)
          // Find next expansion target (highest priority not yet completed)
          const next = priorities.find(
            (p) => (p.resource_count || 0) < (p.target_resource_count || 50)
          )
          setNextExpansion(next || null)

          // Generate agent prompt
          if (next) {
            setAgentPrompt(generateAgentPrompt(next, agentType))
          }
        }

        // Fetch pending suggestions
        const { data: suggestions } = await supabase
          .from('resource_suggestions')
          .select('id, name, city, state, status, created_at, category')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(50)

        if (suggestions) {
          setSubmittedResources(suggestions)
        }

        // Fetch active agent sessions
        const { data: sessions } = await supabase
          .from('agent_sessions')
          .select('*')
          .is('ended_at', null)
          .order('last_activity_at', { ascending: false })

        if (sessions) {
          setAgentSessions(sessions)
        }

        // Fetch AI system status
        const aiStatus = await getAISystemStatus()
        setAiSystemStatus(aiStatus)

        // Check for pending import files
        await checkForImportFiles()

        setLoading(false)
      } catch (error) {
        console.error('Error fetching initial data:', error)
        setLoading(false)
      }
    }

    fetchInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Regenerate prompt when agent type changes
  useEffect(() => {
    if (nextExpansion) {
      setAgentPrompt(generateAgentPrompt(nextExpansion, agentType))
    }
  }, [agentType, nextExpansion])

  // Set up Realtime subscriptions
  useEffect(() => {
    // Subscribe to resource_suggestions changes
    const suggestionsChannel = supabase
      .channel('resource_suggestions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resource_suggestions',
        },
        (payload) => {
          console.log('Resource suggestion change:', payload)

          if (payload.eventType === 'INSERT') {
            const newSuggestion = payload.new as ResourceSuggestion
            if (newSuggestion.status === 'pending') {
              setSubmittedResources((prev) => [newSuggestion, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ResourceSuggestion
            setSubmittedResources((prev) =>
              prev
                .map((s) => (s.id === updated.id ? updated : s))
                .filter((s) => s.status === 'pending')
            )
          } else if (payload.eventType === 'DELETE') {
            setSubmittedResources((prev) => prev.filter((s) => s.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Subscribe to agent_sessions changes
    const sessionsChannel = supabase
      .channel('agent_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sessions',
        },
        (payload) => {
          console.log('Agent session change:', payload)

          if (payload.eventType === 'INSERT') {
            setAgentSessions((prev) => [payload.new as AgentSession, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as AgentSession
            setAgentSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
          }
        }
      )
      .subscribe()

    // Subscribe to expansion_priorities changes
    const prioritiesChannel = supabase
      .channel('expansion_priorities_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'expansion_priorities',
        },
        (payload) => {
          console.log('Expansion priority change:', payload)
          const updated = payload.new as ExpansionPriority
          setCoverageData((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))

          // Update next expansion if needed
          setNextExpansion((prev) => {
            if (prev?.id === updated.id) {
              // Check if this target is still incomplete
              const isIncomplete =
                (updated.resource_count || 0) < (updated.target_resource_count || 50)
              if (isIncomplete) {
                // Update the prompt with new progress
                setAgentPrompt(generateAgentPrompt(updated))
                return updated
              } else {
                // Target completed, clear it and find next target
                setAgentPrompt('')
                return null
              }
            }
            return prev
          })
        }
      )
      .subscribe()

    // Subscribe to resources table changes (for verification status updates)
    // This ensures the page stays in sync with verification activities
    const resourcesChannel = supabase
      .channel('resources_verification_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'resources',
        },
        (payload) => {
          console.log('Resource verification status change:', payload)
          // When resources get flagged or verified during periodic checks, this fires
          // The actual flagged resources are shown in /admin/flagged-resources
          // This subscription ensures the Command Center stays in sync
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(suggestionsChannel)
      supabase.removeChannel(sessionsChannel)
      supabase.removeChannel(prioritiesChannel)
      supabase.removeChannel(resourcesChannel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading Command Center...</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          🎯 Command Center
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Real-time monitoring of research, verification, and expansion activities
        </Typography>
      </Box>

      {/* AI System Status Indicator */}
      {aiSystemStatus && (
        <Alert
          severity={aiSystemStatus.masterEnabled ? 'success' : 'warning'}
          icon={aiSystemStatus.masterEnabled ? <SmartToy /> : <Warning />}
          sx={{ mb: 3 }}
          action={
            <Button
              component={Link}
              href="/admin/settings"
              size="small"
              startIcon={<Settings />}
              color="inherit"
            >
              Settings
            </Button>
          }
        >
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              {aiSystemStatus.masterEnabled ? '✅ AI Systems Active' : '⚠️ AI Systems Disabled'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {aiSystemStatus.masterEnabled ? (
                <>
                  {aiSystemStatus.isVerificationActive && (
                    <Chip
                      label="Verification: Auto-Approving"
                      size="small"
                      color="success"
                      sx={{ mr: 1, mb: 0.5 }}
                    />
                  )}
                  {!aiSystemStatus.isVerificationActive && (
                    <Chip
                      label="Verification: Disabled"
                      size="small"
                      color="default"
                      sx={{ mr: 1, mb: 0.5 }}
                    />
                  )}
                  {aiSystemStatus.isDiscoveryActive && (
                    <Chip
                      label="Discovery: Active"
                      size="small"
                      color="success"
                      sx={{ mr: 1, mb: 0.5 }}
                    />
                  )}
                  {aiSystemStatus.isEnrichmentActive && (
                    <Chip
                      label="Enrichment: Active"
                      size="small"
                      color="success"
                      sx={{ mr: 1, mb: 0.5 }}
                    />
                  )}
                  {aiSystemStatus.realtimeMonitoringEnabled && (
                    <Chip
                      label="Monitoring: Live"
                      size="small"
                      color="info"
                      sx={{ mr: 1, mb: 0.5 }}
                    />
                  )}
                </>
              ) : (
                'All AI operations are currently inactive. All resource submissions will require manual admin review. Enable AI systems in settings to activate autonomous verification.'
              )}
            </Typography>
          </Box>
        </Alert>
      )}

      {/* Agent Research Prompt */}
      {agentPrompt && (
        <Paper
          sx={{
            mb: 4,
            p: 3,
            bgcolor: '#f3e5f5',
            border: '2px solid',
            borderColor: 'primary.main',
          }}
        >
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">🤖 Current Agent Mission</Typography>
              <Chip
                label={
                  nextExpansion ? `${nextExpansion.city}, ${nextExpansion.state}` : 'Loading...'
                }
                color="primary"
                size="small"
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 0.5, mr: 2 }}>
                <Button
                  size="small"
                  variant={agentType === 'code' ? 'contained' : 'outlined'}
                  onClick={() => setAgentType('code')}
                >
                  Claude Code
                </Button>
                <Button
                  size="small"
                  variant={agentType === 'web' ? 'contained' : 'outlined'}
                  onClick={() => setAgentType('web')}
                >
                  Claude Web
                </Button>
              </Box>
              <Button
                variant="contained"
                startIcon={<ContentCopy />}
                onClick={handleCopyPrompt}
                color={copySuccess ? 'success' : 'primary'}
              >
                {copySuccess ? 'Copied!' : 'Copy Prompt'}
              </Button>
            </Box>
          </Box>
          <Box
            sx={{
              bgcolor: '#fff',
              p: 2,
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 400,
              overflow: 'auto',
              border: '1px solid rgba(0,0,0,0.1)',
            }}
          >
            {agentPrompt}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            {agentType === 'code'
              ? '💡 Copy this prompt and paste it into Claude Code (claude.ai/code) with your admin API key to start researching resources.'
              : '💡 Copy this prompt and paste it into Claude Web (claude.ai) - it will save resources to a JSON file for you to review and import.'}
          </Typography>
        </Paper>
      )}

      {/* Pending Import Files */}
      {pendingImports.fileCount > 0 && (
        <Alert
          severity="info"
          sx={{ mb: 4 }}
          action={
            <Button color="inherit" size="small" onClick={handleImportFiles} disabled={importing}>
              {importing ? 'Importing...' : 'Import Now'}
            </Button>
          }
        >
          <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
            📁 {pendingImports.fileCount} data file{pendingImports.fileCount > 1 ? 's' : ''} ready
            to import
          </Typography>
          <Typography variant="caption" display="block">
            Files: {pendingImports.files.join(', ')}
          </Typography>
        </Alert>
      )}

      {/* Import Result */}
      {importResult && (
        <Alert
          severity={importResult.success ? 'success' : 'error'}
          sx={{ mb: 4 }}
          onClose={() => setImportResult(null)}
        >
          <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
            {importResult.message}
          </Typography>
          {importResult.stats && (
            <Typography variant="caption" display="block">
              Processed: {importResult.stats.processed} | Auto-approved:{' '}
              {importResult.stats.autoApproved} | Flagged: {importResult.stats.flagged} | Rejected:{' '}
              {importResult.stats.rejected}
            </Typography>
          )}
        </Alert>
      )}

      {/* Real-Time Verification Viewer */}
      <Box sx={{ mb: 4 }}>
        <RealtimeVerificationViewer />
      </Box>

      {/* Top Row: All 4 Panels */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Submitted Resources */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 2, height: 600, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Pending sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h6">Submitted</Typography>
              <Chip label={submittedResources.length} color="warning" size="small" sx={{ ml: 1 }} />
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {submittedResources.length === 0 ? (
                <Alert severity="info">No pending submissions</Alert>
              ) : (
                submittedResources.map((resource) => (
                  <Box
                    key={resource.id}
                    sx={{
                      py: 1,
                      px: 1.5,
                      mb: 1,
                      bgcolor: 'rgba(0,0,0,0.02)',
                      borderRadius: 1,
                      border: '1px solid rgba(0,0,0,0.1)',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                      {resource.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {resource.city}, {resource.state}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                      <Link href={`/admin/flagged-resources`} passHref>
                        <IconButton size="small" color="primary">
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Link>
                      <IconButton size="small" color="secondary">
                        <Edit fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Verification Queue - Shows active verification agents */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 2, height: 600, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Search sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Verifying</Typography>
              <Chip
                label={agentSessions.filter((s) => s.agent_type === 'verification').length}
                color="primary"
                size="small"
                sx={{ ml: 1 }}
              />
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {agentSessions.filter((s) => s.agent_type === 'verification').length === 0 ? (
                <Alert severity="success" icon={<CheckCircle />}>
                  All verified!
                </Alert>
              ) : (
                agentSessions
                  .filter((s) => s.agent_type === 'verification')
                  .map((session) => (
                    <Box
                      key={session.id}
                      sx={{
                        py: 1,
                        px: 1.5,
                        mb: 1,
                        bgcolor: 'rgba(33,150,243,0.1)',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'primary.light',
                      }}
                    >
                      <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                        Agent {session.agent_id.slice(0, 8)}...
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Processed: {session.resources_processed}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                        <Chip
                          label={`✓ ${session.approvals}`}
                          color="success"
                          size="small"
                          sx={{ fontSize: '0.7rem' }}
                        />
                        <Chip
                          label={`✗ ${session.rejections}`}
                          color="error"
                          size="small"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </Box>
                    </Box>
                  ))
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Next Expansion */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper
            sx={{ p: 2, bgcolor: '#fff3e0', height: 600, display: 'flex', flexDirection: 'column' }}
          >
            <Typography variant="h6" gutterBottom>
              🚀 Next Target
            </Typography>
            {nextExpansion ? (
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
                  {nextExpansion.city}, {nextExpansion.state}
                </Typography>
                <Chip label={nextExpansion.phase} color="primary" size="small" sx={{ mb: 2 }} />
                <Box sx={{ mt: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Score
                  </Typography>
                  <Typography variant="h4">{nextExpansion.priority_score}</Typography>
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Population
                  </Typography>
                  <Typography variant="h6">
                    {((nextExpansion.population || 0) / 1000000).toFixed(1)}M
                  </Typography>
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={nextExpansion.research_status}
                    color={
                      nextExpansion.research_status === 'launched'
                        ? 'success'
                        : nextExpansion.research_status === 'researching'
                          ? 'primary'
                          : 'default'
                    }
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
                {nextExpansion.strategic_rationale && (
                  <Box
                    sx={{
                      mt: 3,
                      p: 2,
                      bgcolor: 'rgba(0,0,0,0.03)',
                      borderRadius: 1,
                      borderLeft: '3px solid',
                      borderColor: 'primary.main',
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      gutterBottom
                    >
                      Why This City?
                    </Typography>
                    <Typography variant="body2">{nextExpansion.strategic_rationale}</Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <Alert severity="success" sx={{ mt: 2 }}>
                All cities launched!
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Top Priorities */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 2, height: 600, display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
            >
              <Typography variant="h6">📊 Top Priorities</Typography>
              <Link href="/admin/expansion" passHref>
                <IconButton size="small" color="primary" title="View All Priorities">
                  <Edit fontSize="small" />
                </IconButton>
              </Link>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto', mt: 1 }}>
              {coverageData.slice(0, 10).map((city, index) => (
                <Box
                  key={city.id}
                  sx={{
                    py: 1.5,
                    mb: 1,
                    borderBottom: '1px solid rgba(0,0,0,0.1)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="h6" color="text.secondary" sx={{ mr: 1, minWidth: 24 }}>
                      {index + 1}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      <Link
                        href={`/admin/expansion/${city.id}`}
                        passHref
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          sx={{ '&:hover': { color: 'primary.main', cursor: 'pointer' } }}
                        >
                          {city.city}, {city.state}
                        </Typography>
                      </Link>
                      <Typography variant="caption" color="text.secondary">
                        {city.phase} • Score: {city.priority_score}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={city.research_status}
                    color={
                      city.research_status === 'launched'
                        ? 'success'
                        : city.research_status === 'researching'
                          ? 'primary'
                          : city.research_status === 'planning'
                            ? 'warning'
                            : 'default'
                    }
                    size="small"
                    sx={{ fontSize: '0.65rem' }}
                  />
                  {city.strategic_rationale && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: 'block',
                        mt: 0.5,
                        fontStyle: 'italic',
                        fontSize: '0.65rem',
                      }}
                    >
                      {city.strategic_rationale}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Active Agents */}
      {agentSessions.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              🤖 Active Agents
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {agentSessions.map((session) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={session.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Chip
                          label={session.agent_type}
                          color={session.agent_type === 'research' ? 'primary' : 'secondary'}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {session.agent_id.slice(0, 8)}...
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Processed
                          </Typography>
                          <Typography variant="h6">{session.resources_processed}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Approved
                          </Typography>
                          <Typography variant="h6" color="success.main">
                            {session.approvals}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Rejected
                          </Typography>
                          <Typography variant="h6" color="error.main">
                            {session.rejections}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Box>
      )}
    </Box>
  )
}
