import type { ResourceCategory } from '@/lib/types/database'

const NEEDS: { category: ResourceCategory; label: string; phrases: string[] }[] = [
  {
    category: 'employment',
    label: 'Employment support',
    phrases: [
      'job',
      'a job',
      'jobs',
      'work',
      'employment',
      'employement',
      'employmnt',
      'job help',
      'find a job',
      'job training',
      'job placement',
    ],
  },
  {
    category: 'housing',
    label: 'Housing support',
    phrases: [
      'housing',
      'houseing',
      'shelter',
      'shelters',
      'homeless',
      'homelessness',
      'place to sleep',
      'a place to sleep',
      'somewhere to sleep',
      'a place to stay',
      'place to stay',
      'somewhere to stay',
    ],
  },
  {
    category: 'food',
    label: 'Food assistance',
    phrases: ['food', 'hungry', 'groceries', 'food bank', 'food pantry', 'meals'],
  },
  {
    category: 'id-documents',
    label: 'ID and documents',
    phrases: [
      'id',
      'identification',
      'get an id',
      'birth certificate',
      'documents',
      'social security card',
    ],
  },
  {
    category: 'transportation',
    label: 'Transportation',
    phrases: ['transportation', 'transport', 'bus', 'bus pass', 'ride', 'rides'],
  },
  {
    category: 'legal-aid',
    label: 'Legal help',
    phrases: ['legal aid', 'legal help', 'lawyer', 'lawyers', 'expungement'],
  },
  {
    category: 'healthcare',
    label: 'Health care',
    phrases: ['healthcare', 'health care', 'doctor', 'medical', 'medical care', 'clinic'],
  },
  {
    category: 'mental-health',
    label: 'Mental health support',
    phrases: ['mental health', 'counseling', 'counselling', 'therapy', 'therapist'],
  },
  {
    category: 'substance-abuse',
    label: 'Substance use support',
    phrases: [
      'addiction',
      'rehab',
      'recovery',
      'substance abuse',
      'substance use',
      'drug treatment',
      'alcohol treatment',
    ],
  },
  { category: 'education', label: 'Education', phrases: ['education', 'school', 'ged', 'college'] },
  { category: 'clothing', label: 'Clothing', phrases: ['clothing', 'clothes', 'shoes'] },
  {
    category: 'faith-based',
    label: 'Faith-based support',
    phrases: ['faith based', 'faith-based', 'spiritual support'],
  },
  {
    category: 'general-support',
    label: 'Reentry support',
    phrases: ['reentry', 're-entry', 'case management', 'general support'],
  },
]
const HOUSING_SPECIFIC = [
  'emergency shelter',
  'transitional housing',
  'rental assistance',
  'rent assistance',
  'sober living',
]
export interface SearchIntent {
  query: string
  categories: ResourceCategory[]
  label: string | null
  terms: string[]
  specific: boolean
}
/** Curated phrases only: an organization name containing a need word stays a name search. */
export function interpretSearch(value?: string): SearchIntent {
  const query = (value || '').trim().replace(/\s+/g, ' ').slice(0, 200)
  const normalized = query
    .toLowerCase()
    .replace(
      /^(?:i (?:need|want|am looking for)|help (?:me find|with)|looking for|find me)\s+(?:help with\s+)?/,
      ''
    )
    .replace(/[.!?]+$/, '')
  const need = NEEDS.find((entry) => entry.phrases.includes(normalized))
  const specific = HOUSING_SPECIFIC.includes(normalized)
  return {
    query,
    categories: need ? [need.category] : specific ? ['housing'] : [],
    label:
      need?.label || (specific ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : null),
    terms: (need ? [] : normalized.split(/\s+/)).filter(Boolean).slice(0, 12),
    specific,
  }
}
export function escapeSearchPattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}
export function searchMatchRank(
  resource: { name: string; description?: string | null },
  query: string
): number {
  const name = resource.name.trim().toLowerCase()
  const term = query.trim().toLowerCase()
  return name === term ? 0 : name.startsWith(term) ? 1 : name.includes(term) ? 2 : 3
}
