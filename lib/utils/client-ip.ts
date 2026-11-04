function isValidIP(value: string): boolean {
  const octets = value.split('.')
  if (
    octets.length === 4 &&
    octets.every((octet) => /^(0|[1-9]\d{0,2})$/.test(octet) && Number(octet) <= 255)
  ) {
    return true
  }

  if (!value.includes(':') || value.includes('%')) return false
  try {
    return new URL(`http://[${value}]/`).hostname.length > 2
  } catch {
    return false
  }
}

/**
 * Resolve the client address from the trusted Apache proxy contract.
 * Apache appends its observed client address as the rightmost X-Forwarded-For
 * element; X-Real-IP and caller-supplied leftmost entries are not trusted.
 */
export function getTrustedClientIP(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for')
  const candidate = forwardedFor?.split(',').at(-1)?.trim()
  return candidate && isValidIP(candidate) ? candidate : 'unknown'
}
