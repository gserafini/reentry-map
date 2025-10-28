import CryptoJS from 'crypto-js'

/**
 * Get initials from email address
 * Examples:
 * - john.doe@example.com → JD
 * - jane_smith@example.com → JS
 * - bob@example.com → BO
 *
 * @param email - User's email address
 * @returns Two-character initials in uppercase
 */
export function getInitials(email: string): string {
  const name = email.split('@')[0]
  const parts = name.split(/[._-]/)

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }

  return name.slice(0, 2).toUpperCase()
}

/**
 * Get Gravatar URL for an email address
 * Falls back to a default avatar if no Gravatar exists
 *
 * @param email - User's email address
 * @param size - Avatar size in pixels (default: 200)
 * @param defaultType - Default avatar type if no Gravatar exists
 *   - 'mp' - mystery person (default)
 *   - 'identicon' - geometric pattern
 *   - 'monsterid' - generated monster
 *   - 'wavatar' - generated face
 *   - 'retro' - 8-bit arcade-style
 *   - 'robohash' - generated robot
 * @returns Gravatar URL
 */
export function getGravatarUrl(
  email: string,
  size: number = 200,
  defaultType: string = 'mp'
): string {
  const trimmedEmail = email.trim().toLowerCase()
  const hash = CryptoJS.MD5(trimmedEmail).toString()
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${defaultType}`
}

/**
 * Get user display name from email or phone
 * Priority: email username > phone (formatted) > fallback
 *
 * @param email - User's email address (optional)
 * @param phone - User's phone number (optional)
 * @returns Display name
 */
export function getUserDisplayName(email?: string | null, phone?: string | null): string {
  if (email) {
    const username = email.split('@')[0]
    // Convert dots/underscores/hyphens to spaces and capitalize
    return username
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  if (phone) {
    // Format phone for display (assumes E.164 format +1XXXXXXXXXX)
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 11 && digits.startsWith('1')) {
      const areaCode = digits.slice(1, 4)
      const prefix = digits.slice(4, 7)
      const suffix = digits.slice(7, 11)
      return `(${areaCode}) ${prefix}-${suffix}`
    }
    return phone
  }

  return 'Anonymous User'
}

/**
 * Check if a Gravatar exists for an email address
 * Uses the d=404 parameter to return 404 if no Gravatar exists
 *
 * @param email - User's email address
 * @returns Promise that resolves to true if Gravatar exists, false otherwise
 */
export async function checkGravatarExists(email: string): Promise<boolean> {
  if (!email) return false

  try {
    const trimmedEmail = email.trim().toLowerCase()
    const hash = CryptoJS.MD5(trimmedEmail).toString()
    // Use d=404 to return 404 if no Gravatar exists
    const url = `https://www.gravatar.com/avatar/${hash}?d=404`

    const response = await fetch(url, { method: 'HEAD' })
    return response.ok // Returns true if status is 200-299
  } catch {
    return false
  }
}

/**
 * Get avatar color based on email/phone hash
 * Provides consistent color for same email/phone
 *
 * @param identifier - Email or phone number
 * @returns Hex color code
 */
export function getAvatarColor(identifier: string): string {
  const colors = [
    '#1976d2', // Blue
    '#388e3c', // Green
    '#d32f2f', // Red
    '#f57c00', // Orange
    '#7b1fa2', // Purple
    '#0288d1', // Light Blue
    '#c2185b', // Pink
    '#5d4037', // Brown
    '#455a64', // Blue Grey
  ]

  // Simple hash function to get consistent color
  let hash = 0
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % colors.length
  return colors[index]
}
