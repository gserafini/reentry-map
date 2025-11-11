/**
 * Application settings and feature flags
 * Stored in database for runtime configuration without code deployment
 */

export interface AppSettings {
  id: string
  // Feature Flags
  sms_auth_enabled: boolean
  sms_provider_configured: boolean

  // AI System Control Switches
  ai_master_enabled: boolean
  ai_verification_enabled: boolean
  ai_discovery_enabled: boolean
  ai_enrichment_enabled: boolean
  ai_realtime_monitoring_enabled: boolean

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
  aiMasterEnabled: boolean
  aiVerificationEnabled: boolean
  aiDiscoveryEnabled: boolean
  aiEnrichmentEnabled: boolean
  aiRealtimeMonitoringEnabled: boolean
}

export interface AISystemStatus {
  masterEnabled: boolean
  verificationEnabled: boolean
  discoveryEnabled: boolean
  enrichmentEnabled: boolean
  realtimeMonitoringEnabled: boolean
  // Derived flags for easy checking
  isVerificationActive: boolean // master AND verification
  isDiscoveryActive: boolean // master AND discovery
  isEnrichmentActive: boolean // master AND enrichment
}

// SMS Provider Configuration Status
export interface SMSProviderStatus {
  configured: boolean
  provider?: 'twilio' | 'messagebird' | 'vonage' | 'textlocal'
  lastChecked: string
}
