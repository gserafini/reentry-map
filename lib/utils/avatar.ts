import CryptoJS from 'crypto-js'

/**
 * Get initials from name or email address
 * Examples:
 * - "John", "Doe" → JD
 * - "Jane" (no last name) → JA
 * - john.doe@example.com (email) → JD
 * - jane_smith@example.com (email) → JS
 *
 * @param firstNameOrEmail - User's first name or email as fallback
 * @param lastName - User's last name (optional)
 * @returns Two-character initials in uppercase
 */
export function getInitials(firstNameOrEmail?: string | null, lastName?: string | null): string {
  // If we have first name (and it's not an email), use it
  if (firstNameOrEmail && !firstNameOrEmail.includes('@')) {
    const firstInitial = firstNameOrEmail.charAt(0).toUpperCase()
    const lastInitial = lastName
      ? lastName.charAt(0).toUpperCase()
      : firstNameOrEmail.charAt(1).toUpperCase()
    return firstInitial + lastInitial
  }

  // Fall back to email parsing
  if (firstNameOrEmail) {
    const name = firstNameOrEmail.split('@')[0]
    const parts = name.split(/[._-]/)

    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }

    return name.slice(0, 2).toUpperCase()
  }

  return 'AU' // Anonymous User
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
 * Get user display name from first/last name, email, or phone
 * Priority: first_name + last_name > email username > phone (formatted) > fallback
 *
 * @param firstName - User's first name (optional)
 * @param lastName - User's last name (optional)
 * @param email - User's email address (optional)
 * @param phone - User's phone number (optional)
 * @returns Display name
 */
export function getUserDisplayName(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
  phone?: string | null
): string {
  // Priority 1: Use first and last name if available
  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(' ').trim()
  }

  // Priority 2: Use email username
  if (email) {
    const username = email.split('@')[0]
    // Convert dots/underscores/hyphens to spaces and capitalize
    return username
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  // Priority 3: Use formatted phone
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
