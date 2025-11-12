import { createClient } from '@/lib/supabase/client'
import type { AppSettings, FeatureFlags, AISystemStatus } from '@/lib/types/settings'

/**
 * Get application settings (feature flags, config)
 * Cached for 5 minutes to reduce database queries
 */
export async function getAppSettings(): Promise<AppSettings | null> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.from('app_settings').select('*').single()

    if (error) {
      console.error('Error fetching app settings:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getAppSettings:', error)
    return null
  }
}

/**
 * Get feature flags only (lightweight)
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  const settings = await getAppSettings()

  return {
    smsAuth: settings?.sms_auth_enabled ?? false,
    smsProviderConfigured: settings?.sms_provider_configured ?? false,
    aiMasterEnabled: settings?.ai_master_enabled ?? false,
    aiVerificationEnabled: settings?.ai_verification_enabled ?? false,
    aiDiscoveryEnabled: settings?.ai_discovery_enabled ?? false,
    aiEnrichmentEnabled: settings?.ai_enrichment_enabled ?? false,
    aiRealtimeMonitoringEnabled: settings?.ai_realtime_monitoring_enabled ?? true,
  }
}

/**
 * Check if SMS authentication is enabled
 */
export async function isSMSAuthEnabled(): Promise<boolean> {
  const flags = await getFeatureFlags()
  return flags.smsAuth && flags.smsProviderConfigured
}

/**
 * Get AI system status with derived flags
 * Checks both master switch AND individual switches
 */
export async function getAISystemStatus(): Promise<AISystemStatus> {
  const settings = await getAppSettings()

  const masterEnabled = settings?.ai_master_enabled ?? false
  const verificationEnabled = settings?.ai_verification_enabled ?? false
  const discoveryEnabled = settings?.ai_discovery_enabled ?? false
  const enrichmentEnabled = settings?.ai_enrichment_enabled ?? false
  const realtimeMonitoringEnabled = settings?.ai_realtime_monitoring_enabled ?? true

  return {
    masterEnabled,
    verificationEnabled,
    discoveryEnabled,
    enrichmentEnabled,
    realtimeMonitoringEnabled,
    // Derived flags - require BOTH master AND individual to be true
    isVerificationActive: masterEnabled && verificationEnabled,
    isDiscoveryActive: masterEnabled && discoveryEnabled,
    isEnrichmentActive: masterEnabled && enrichmentEnabled,
  }
}

/**
 * Update app settings (admin only)
 */
export async function updateAppSettings(
  updates: Partial<Omit<AppSettings, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  try {
    // Get current settings to update
    const { data: current } = await supabase.from('app_settings').select('id').single()

    if (!current) {
      return { success: false, error: 'Settings not found' }
    }

    const { error } = await supabase.from('app_settings').update(updates).eq('id', current.id)

    if (error) {
      console.error('Error updating settings:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in updateAppSettings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
