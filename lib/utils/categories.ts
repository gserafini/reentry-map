import type { ResourceCategory } from '@/lib/types/database'

/**
 * Category display configuration
 * Maps category keys to user-friendly names and icons
 */
export const CATEGORY_CONFIG: Record<
  ResourceCategory,
  {
    label: string
    description: string
  }
> = {
  employment: {
    label: 'Employment',
    description: 'Job placement, training, and career services',
  },
  housing: {
    label: 'Housing',
    description: 'Emergency shelter, transitional housing, and assistance',
  },
  food: {
    label: 'Food',
    description: 'Food banks, pantries, and meal programs',
  },
  clothing: {
    label: 'Clothing',
    description: 'Clothing assistance and donation centers',
  },
  healthcare: {
    label: 'Healthcare',
    description: 'Medical care and health services',
  },
  'mental-health': {
    label: 'Mental Health',
    description: 'Counseling, therapy, and mental health support',
  },
  'substance-abuse': {
    label: 'Substance Abuse Treatment',
    description: 'Addiction recovery and treatment programs',
  },
  'legal-aid': {
    label: 'Legal Aid',
    description: 'Legal assistance and representation',
  },
  transportation: {
    label: 'Transportation',
    description: 'Public transit assistance and transportation services',
  },
  'id-documents': {
    label: 'ID Documents',
    description: 'Birth certificates, IDs, and vital records',
  },
  education: {
    label: 'Education',
    description: 'GED programs, classes, and educational support',
  },
  'faith-based': {
    label: 'Faith-Based',
    description: 'Religious and spiritual support services',
  },
  'general-support': {
    label: 'General Support',
    description: 'Community centers and general assistance',
  },
}

/**
 * Get all available categories in display order
 */
export function getAllCategories(): ResourceCategory[] {
  return Object.keys(CATEGORY_CONFIG) as ResourceCategory[]
}

/**
 * Get all categories as array of objects with value and label
 */
export const CATEGORIES = (Object.keys(CATEGORY_CONFIG) as ResourceCategory[]).map((key) => ({
  value: key,
  label: CATEGORY_CONFIG[key].label,
}))

/**
 * Get category display label
 */
export function getCategoryLabel(category: ResourceCategory): string {
  return CATEGORY_CONFIG[category]?.label || category
}

/**
 * Get category description
 */
export function getCategoryDescription(category: ResourceCategory): string {
  return CATEGORY_CONFIG[category]?.description || ''
}
