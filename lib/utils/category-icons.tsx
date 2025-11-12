import {
  Work as WorkIcon,
  Home as HomeIcon,
  Restaurant as FoodIcon,
  LocalHospital as HealthIcon,
  Checkroom as ClothingIcon,
  Gavel as LegalIcon,
  DirectionsBus as TransportIcon,
  School as EducationIcon,
  Psychology as MentalHealthIcon,
  LocalPharmacy as SubstanceAbuseIcon,
  Badge as IdDocumentsIcon,
  Church as FaithBasedIcon,
  VolunteerActivism as GeneralSupportIcon,
} from '@mui/icons-material'
import type { ResourceCategory } from '@/lib/types/database'
import type { SvgIconProps } from '@mui/material'

/**
 * Map of category slugs to their corresponding Material UI icons
 */
export const CATEGORY_ICONS: Record<ResourceCategory, React.ComponentType<SvgIconProps>> = {
  employment: WorkIcon,
  housing: HomeIcon,
  food: FoodIcon,
  healthcare: HealthIcon,
  clothing: ClothingIcon,
  'legal-aid': LegalIcon,
  transportation: TransportIcon,
  education: EducationIcon,
  'mental-health': MentalHealthIcon,
  'substance-abuse': SubstanceAbuseIcon,
  'id-documents': IdDocumentsIcon,
  'faith-based': FaithBasedIcon,
  'general-support': GeneralSupportIcon,
}

/**
 * Map of category slugs to their brand colors
 */
export const CATEGORY_COLORS: Record<ResourceCategory, string> = {
  employment: '#1976d2', // Blue
  housing: '#388e3c', // Green
  food: '#f57c00', // Orange
  healthcare: '#d32f2f', // Red
  clothing: '#7b1fa2', // Purple
  'legal-aid': '#0288d1', // Light Blue
  transportation: '#689f38', // Light Green
  education: '#f57c00', // Orange
  'mental-health': '#9c27b0', // Purple
  'substance-abuse': '#00796b', // Teal
  'id-documents': '#5d4037', // Brown
  'faith-based': '#455a64', // Blue Grey
  'general-support': '#616161', // Grey
}

/**
 * Normalize category name to handle both hyphen and underscore formats
 * Examples: "general_support" -> "general-support", "mental_health" -> "mental-health"
 */
function normalizeCategoryName(category: string): ResourceCategory {
  // Replace underscores with hyphens
  const normalized = category.replace(/_/g, '-') as ResourceCategory
  // Return normalized if it exists in icons config, otherwise return original
  return CATEGORY_ICONS[normalized] ? normalized : (category as ResourceCategory)
}

/**
 * Get the icon component for a given category
 * Handles both hyphen and underscore formats (e.g., "general-support" and "general_support")
 */
export function getCategoryIcon(category: ResourceCategory): React.ComponentType<SvgIconProps> {
  const normalized = normalizeCategoryName(category)
  return CATEGORY_ICONS[normalized] || GeneralSupportIcon
}

/**
 * Get the brand color for a given category
 * Handles both hyphen and underscore formats (e.g., "general-support" and "general_support")
 */
export function getCategoryColor(category: ResourceCategory): string {
  const normalized = normalizeCategoryName(category)
  return CATEGORY_COLORS[normalized] || '#616161'
}
