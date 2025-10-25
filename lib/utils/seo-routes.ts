import type { ResourceCategory } from '@/lib/types/database'

/**
 * Canonical SEO URL patterns for each category
 * Primary patterns used when generating URLs
 */
export const CANONICAL_SEO_PATTERNS: Record<ResourceCategory, string> = {
  employment: 'employment',
  housing: 'housing',
  food: 'food-assistance',
  clothing: 'clothing',
  healthcare: 'healthcare',
  'mental-health': 'mental-health-services',
  'substance-abuse': 'substance-abuse-treatment',
  'legal-aid': 'legal-aid',
  transportation: 'transportation',
  'id-documents': 'id-documents',
  education: 'education',
  'faith-based': 'faith-based-services',
  'general-support': 'support',
}

/**
 * Mapping of SEO-friendly category phrases to ResourceCategory slugs
 * Includes canonical patterns plus common aliases for backward compatibility
 * Used for URLs like /find-employment-in-oakland-ca/
 */
export const SEO_CATEGORY_MAP: Record<string, ResourceCategory> = {
  // Canonical patterns (primary URLs)
  employment: 'employment',
  housing: 'housing',
  'food-assistance': 'food',
  clothing: 'clothing',
  healthcare: 'healthcare',
  'mental-health-services': 'mental-health',
  'substance-abuse-treatment': 'substance-abuse',
  'legal-aid': 'legal-aid',
  transportation: 'transportation',
  'id-documents': 'id-documents',
  education: 'education',
  'faith-based-services': 'faith-based',
  support: 'general-support',

  // Common aliases (also accepted, but canonicals preferred)
  'a-job': 'employment',
  jobs: 'employment',
  food: 'food',
  'mental-health': 'mental-health',
  'substance-abuse': 'substance-abuse',
  'faith-based': 'faith-based',
  'general-support': 'general-support',
}

/**
 * Generate human-readable category phrase from ResourceCategory
 */
export function getCategoryPhrase(category: ResourceCategory): string {
  const phrases: Record<ResourceCategory, string> = {
    employment: 'a Job',
    housing: 'Housing',
    food: 'Food Assistance',
    clothing: 'Clothing',
    healthcare: 'Healthcare',
    'mental-health': 'Mental Health Services',
    'substance-abuse': 'Substance Abuse Treatment',
    'legal-aid': 'Legal Aid',
    transportation: 'Transportation',
    'id-documents': 'ID Documents',
    education: 'Education',
    'faith-based': 'Faith-Based Services',
    'general-support': 'Support',
  }
  return phrases[category] || category
}

/**
 * Parse SEO-friendly URL slug like "employment-in-oakland-ca"
 * (Note: the slug doesn't include "find-" prefix, that's in the route path)
 * Returns { category, city, state } or null if invalid
 */
export function parseSeoUrl(
  slug: string
): { category: ResourceCategory; city: string; state: string } | null {
  // Pattern: {category}-in-{city}-{state}
  const match = slug.match(/^(.+)-in-(.+)-([a-z]{2})$/i)
  if (!match) return null

  const [, categoryPhrase, city, state] = match

  // Look up category
  const category = SEO_CATEGORY_MAP[categoryPhrase.toLowerCase()]
  if (!category) return null

  return {
    category,
    city: city.replace(/-/g, ' '), // Convert "oakland" or "san-francisco" to "Oakland" or "San Francisco"
    state: state.toUpperCase(),
  }
}

/**
 * Generate SEO-friendly URL from category and location
 * Always uses canonical pattern for consistency
 */
export function generateSeoUrl(category: ResourceCategory, city: string, state: string): string {
  const categoryPhrase = CANONICAL_SEO_PATTERNS[category] || category
  const citySlug = city.toLowerCase().replace(/\s+/g, '-')
  const stateSlug = state.toLowerCase()

  return `/find/${categoryPhrase}-in-${citySlug}-${stateSlug}`
}

/**
 * Generate SEO intro text for localized landing pages
 */
export function generateSeoIntro(category: ResourceCategory, city: string, state: string): string {
  const categoryPhrase = getCategoryPhrase(category).toLowerCase()
  const intros: Record<ResourceCategory, string> = {
    employment:
      'Connect with local employers, job training programs, and employment services that welcome individuals with records.',
    housing:
      'Find emergency shelter, transitional housing, and permanent housing resources in your area.',
    food: 'Access food banks, meal programs, and nutrition assistance to help you and your family.',
    clothing: 'Get free or low-cost clothing for work, interviews, and everyday needs.',
    healthcare: 'Find affordable medical care, health screenings, and wellness services near you.',
    'mental-health':
      'Access counseling, therapy, and mental health support services in your community.',
    'substance-abuse':
      'Connect with addiction treatment, recovery programs, and support groups in your area.',
    'legal-aid': 'Get free or low-cost legal assistance for record expungement, housing, and more.',
    transportation:
      'Find public transit assistance, bus passes, and transportation services to help you get where you need to go.',
    'id-documents': 'Get help obtaining birth certificates, state IDs, and other vital documents.',
    education:
      'Access GED programs, job training, and educational opportunities to advance your career.',
    'faith-based':
      'Connect with churches, religious organizations, and faith-based programs offering support.',
    'general-support':
      'Find community centers and organizations offering a range of support services.',
  }

  return intros[category] || `Find ${categoryPhrase} resources and services in ${city}, ${state}.`
}
