/**
 * Dependency Monitoring System
 *
 * Tracks health of external services and sends alerts when failures occur.
 * Designed to be extensible for all external dependencies:
 * - ipapi.co (GeoIP)
 * - Google Maps API
 * - OpenAI API
 * - PostgreSQL Database
 *
 * Features:
 * - Rate limiting (max 1 alert per service per hour)
 * - Console logging (captured by Vercel logs)
 * - Easy to extend with email notifications (add Resend)
 */

export type DependencyService = 'ipapi.co' | 'google-maps' | 'openai' | 'database' | 'vercel'

export interface DependencyAlert {
  service: DependencyService
  error: string
  details?: Record<string, unknown>
  timestamp: Date
  severity: 'warning' | 'error' | 'critical'
}

// In-memory rate limiting (resets on server restart)
const alertCache = new Map<string, number>()
const ALERT_COOLDOWN_MS = 60 * 60 * 1000 // 1 hour

/**
 * Check if we should send an alert for this service
 * Rate limits to max 1 alert per service per hour
 */
function shouldSendAlert(service: DependencyService): boolean {
  const now = Date.now()
  const lastAlert = alertCache.get(service)

  if (lastAlert && now - lastAlert < ALERT_COOLDOWN_MS) {
    return false // Still in cooldown period
  }

  alertCache.set(service, now)
  return true
}

/**
 * Send a dependency failure alert
 * Currently logs to console (captured by Vercel logs)
 * TODO: Add email notifications via Resend when RESEND_API_KEY is configured
 */
export async function sendDependencyAlert(alert: DependencyAlert): Promise<void> {
  // Rate limiting to avoid spam
  if (!shouldSendAlert(alert.service)) {
    console.debug(`[Dependency Monitor] Alert rate limited for ${alert.service}`)
    return
  }

  // Log to console (Vercel captures these in server logs)
  const logMessage = `
╔═══════════════════════════════════════════════════════════
║ 🚨 DEPENDENCY ALERT - ${alert.severity.toUpperCase()}
╠═══════════════════════════════════════════════════════════
║ Service:    ${alert.service}
║ Error:      ${alert.error}
║ Timestamp:  ${alert.timestamp.toISOString()}
║ Severity:   ${alert.severity}
${alert.details ? `║ Details:    ${JSON.stringify(alert.details, null, 2)}` : ''}
╚═══════════════════════════════════════════════════════════
`

  if (alert.severity === 'critical') {
    console.error(logMessage)
  } else if (alert.severity === 'error') {
    console.error(logMessage)
  } else {
    console.warn(logMessage)
  }

  // TODO: Add email notification when Resend is configured
  // Uncomment and configure when ready:
  /*
  if (env.ADMIN_EMAIL && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'alerts@reentrymap.org',
        to: env.ADMIN_EMAIL,
        subject: `🚨 ${alert.severity.toUpperCase()}: ${alert.service} Failure`,
        html: `
          <h2>Dependency Alert</h2>
          <p><strong>Service:</strong> ${alert.service}</p>
          <p><strong>Error:</strong> ${alert.error}</p>
          <p><strong>Timestamp:</strong> ${alert.timestamp.toISOString()}</p>
          <p><strong>Severity:</strong> ${alert.severity}</p>
          ${alert.details ? `<pre>${JSON.stringify(alert.details, null, 2)}</pre>` : ''}
        `,
      })
      console.log(`[Dependency Monitor] Email alert sent to ${env.ADMIN_EMAIL}`)
    } catch (emailError) {
      console.error('[Dependency Monitor] Failed to send email alert:', emailError)
    }
  }
  */
}

/**
 * Monitor ipapi.co GeoIP service
 */
export async function monitorGeoIPService(
  error: Error,
  details?: Record<string, unknown>
): Promise<void> {
  await sendDependencyAlert({
    service: 'ipapi.co',
    error: error.message,
    details: {
      ...details,
      errorStack: error.stack,
    },
    timestamp: new Date(),
    severity: 'error',
  })
}

/**
 * Monitor Google Maps API
 */
export async function monitorGoogleMapsService(
  error: Error,
  details?: Record<string, unknown>
): Promise<void> {
  await sendDependencyAlert({
    service: 'google-maps',
    error: error.message,
    details: {
      ...details,
      errorStack: error.stack,
    },
    timestamp: new Date(),
    severity: 'critical', // Maps are critical for core functionality
  })
}

/**
 * Monitor OpenAI API
 */
export async function monitorOpenAIService(
  error: Error,
  details?: Record<string, unknown>
): Promise<void> {
  await sendDependencyAlert({
    service: 'openai',
    error: error.message,
    details: {
      ...details,
      errorStack: error.stack,
    },
    timestamp: new Date(),
    severity: 'warning', // AI agents are nice-to-have, not critical
  })
}

/**
 * Monitor Database
 */
export async function monitorDatabaseService(
  error: Error,
  details?: Record<string, unknown>
): Promise<void> {
  await sendDependencyAlert({
    service: 'database',
    error: error.message,
    details: {
      ...details,
      errorStack: error.stack,
    },
    timestamp: new Date(),
    severity: 'critical', // Database is critical
  })
}

/**
 * Clear alert cache for a specific service (for testing)
 */
export function clearAlertCache(service?: DependencyService): void {
  if (service) {
    alertCache.delete(service)
  } else {
    alertCache.clear()
  }
}
