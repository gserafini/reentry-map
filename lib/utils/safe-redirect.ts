/** Allow only same-origin absolute paths suitable for router.push(). */
export function safeRelativeRedirect(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return '/'
  }

  try {
    const url = new URL(value, 'https://reentrymap.invalid')
    if (url.origin !== 'https://reentrymap.invalid') return '/'
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/'
  }
}
