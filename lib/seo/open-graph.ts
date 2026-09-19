export const OPEN_GRAPH_IMAGE_WIDTH = 1200
export const OPEN_GRAPH_IMAGE_HEIGHT = 630

const OPEN_GRAPH_KINDS = [
  'home',
  'directory',
  'search',
  'state',
  'city',
  'category',
  'city-category',
  'resource',
] as const

export type OpenGraphImageKind = (typeof OPEN_GRAPH_KINDS)[number]

const CATEGORY_VISUALS = {
  employment: { label: 'Employment', color: '#1976d2' },
  housing: { label: 'Housing', color: '#388e3c' },
  food: { label: 'Food', color: '#d66a00' },
  clothing: { label: 'Clothing', color: '#7b1fa2' },
  healthcare: { label: 'Healthcare', color: '#c62828' },
  'mental-health': { label: 'Mental Health', color: '#8e24aa' },
  'substance-abuse': { label: 'Substance Abuse Treatment', color: '#00796b' },
  'legal-aid': { label: 'Legal Aid', color: '#0277bd' },
  transportation: { label: 'Transportation', color: '#558b2f' },
  'id-documents': { label: 'ID Documents', color: '#5d4037' },
  education: { label: 'Education', color: '#c45f00' },
  'faith-based': { label: 'Faith-Based', color: '#455a64' },
  'general-support': { label: 'General Support', color: '#546e7a' },
} as const

type OpenGraphCategory = keyof typeof CATEGORY_VISUALS

export interface OpenGraphImageInput {
  kind?: OpenGraphImageKind
  eyebrow?: string
  title: string
  description?: string
  location?: string
  category?: string
  count?: number | null
}

export interface OpenGraphImageModel {
  kind: OpenGraphImageKind
  eyebrow: string
  title: string
  description: string
  location: string | null
  category: OpenGraphCategory | null
  categoryLabel: string | null
  count: number | null
  accent: string
  highlights: string[]
}

export interface OpenGraphImageMetadata {
  url: string
  width: typeof OPEN_GRAPH_IMAGE_WIDTH
  height: typeof OPEN_GRAPH_IMAGE_HEIGHT
  alt: string
}

function cleanText(value: string | null | undefined, maxLength: number): string {
  const cleaned = (value || '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.length <= maxLength) return cleaned

  const truncated = cleaned.slice(0, maxLength - 1).trimEnd()
  const lastSpace = truncated.lastIndexOf(' ')
  const wordBoundary =
    lastSpace >= Math.floor(maxLength * 0.6) ? truncated.slice(0, lastSpace) : truncated
  return `${wordBoundary.trimEnd()}…`
}

function parseKind(value: string | null): OpenGraphImageKind {
  return OPEN_GRAPH_KINDS.includes(value as OpenGraphImageKind)
    ? (value as OpenGraphImageKind)
    : 'directory'
}

function parseCategory(value: string | null): OpenGraphCategory | null {
  const normalized = cleanText(value, 40).replace(/_/g, '-')
  return normalized in CATEGORY_VISUALS ? (normalized as OpenGraphCategory) : null
}

function parseCount(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null
  const count = Number(value)
  return Number.isSafeInteger(count) && count >= 0 && count <= 10_000_000 ? count : null
}

function defaultEyebrow(kind: OpenGraphImageKind): string {
  if (kind === 'home') return 'Free nationwide reentry directory'
  if (kind === 'resource') return 'Provider information'
  if (kind === 'search') return 'Search results'
  return 'Community resource directory'
}

function buildHighlights(kind: OpenGraphImageKind, count: number | null): string[] {
  if (count !== null) {
    return [
      `${count.toLocaleString('en-US')} community ${count === 1 ? 'listing' : 'listings'}`,
      'Free to search',
      'Contact providers directly',
    ]
  }
  if (kind === 'home') return ['Housing', 'Jobs', 'Food & healthcare']
  if (kind === 'resource') return ['Contact details', 'Service information', 'Plan your next step']
  return ['Free to search', 'No account needed', 'Contact providers directly']
}

export function createOpenGraphImage(input: OpenGraphImageInput): OpenGraphImageMetadata {
  const params = new URLSearchParams()
  params.set('kind', input.kind || 'directory')
  params.set('title', cleanText(input.title, 86))

  const eyebrow = cleanText(input.eyebrow, 54)
  const description = cleanText(input.description, 150)
  const location = cleanText(input.location, 54)
  const category = parseCategory(input.category || null)
  const count =
    typeof input.count === 'number' && Number.isSafeInteger(input.count) && input.count >= 0
      ? input.count
      : null

  if (eyebrow) params.set('eyebrow', eyebrow)
  if (description) params.set('description', description)
  if (location) params.set('location', location)
  if (category) params.set('category', category)
  if (count !== null) params.set('count', String(count))

  const title = cleanText(input.title, 86) || 'Find reentry help near you'
  const titleIncludesLocation =
    location && title.toLocaleLowerCase().includes(location.toLocaleLowerCase())
  return {
    url: `/api/og?${params.toString()}`,
    width: OPEN_GRAPH_IMAGE_WIDTH,
    height: OPEN_GRAPH_IMAGE_HEIGHT,
    alt: `${title}${location && !titleIncludesLocation ? ` — ${location}` : ''} | Reentry Map`,
  }
}

export function parseOpenGraphImageParams(searchParams: URLSearchParams): OpenGraphImageModel {
  const kind = parseKind(searchParams.get('kind'))
  const category = parseCategory(searchParams.get('category'))
  const count = parseCount(searchParams.get('count'))
  const title = cleanText(searchParams.get('title'), 86) || 'Find reentry help near you'

  return {
    kind,
    eyebrow: cleanText(searchParams.get('eyebrow'), 54) || defaultEyebrow(kind),
    title,
    description:
      cleanText(searchParams.get('description'), 150) ||
      'Practical local services for people navigating reentry and the people supporting them.',
    location: cleanText(searchParams.get('location'), 54) || null,
    category,
    categoryLabel: category ? CATEGORY_VISUALS[category].label : null,
    count,
    accent: category ? CATEGORY_VISUALS[category].color : '#1565c0',
    highlights: buildHighlights(kind, count),
  }
}
