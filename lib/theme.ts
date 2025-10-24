/**
 * Theme configuration for Reentry Map
 * Centralized constants for colors, spacing, and other design tokens
 */

export const theme = {
  colors: {
    /**
     * Primary brand color - vibrant yellow used for header and key branding
     */
    brand: '#fadf61',

    /**
     * Text color for content on brand background
     * Black for proper contrast against brand yellow
     */
    brandText: '#000',
  },
} as const

export type Theme = typeof theme
