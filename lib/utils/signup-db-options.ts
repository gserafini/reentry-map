export function getSignupPoolOptions(connectionString: string) {
  const parsed = new URL(connectionString)
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('DATABASE_URL must use the postgres protocol')
  }

  // node-postgres lets TLS query parameters in the URL override the explicit
  // `ssl` option. Remove them so a URL suffix cannot weaken remote verification.
  for (const key of [...parsed.searchParams.keys()]) {
    if (
      [
        'ssl',
        'sslmode',
        'sslcert',
        'sslkey',
        'sslrootcert',
        'sslnegotiation',
        'uselibpqcompat',
      ].includes(key.toLowerCase())
    ) {
      parsed.searchParams.delete(key)
    }
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!hostname) throw new Error('DATABASE_URL must include a database host')
  const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  return {
    connectionString: parsed.toString(),
    ssl: isLoopback ? false : { rejectUnauthorized: true },
  }
}
