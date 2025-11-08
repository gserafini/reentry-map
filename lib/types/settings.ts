/**
 * Application settings and feature flags
 * Stored in database for runtime configuration without code deployment
 */

export interface AppSettings {
  id: string
  // Feature Flags
  sms_auth_enabled: boolean
  sms_provider_configured: boolean

  // Contact Info
  support_email?: string
  support_phone?: string

  // Metadata
  created_at: string
  updated_at: string
}

export interface FeatureFlags {
  smsAuth: boolean
  smsProviderConfigured: boolean
}

// SMS Provider Configuration Status
export interface SMSProviderStatus {
  configured: boolean
  provider?: 'twilio' | 'messagebird' | 'vonage' | 'textlocal'
  lastChecked: string
}
