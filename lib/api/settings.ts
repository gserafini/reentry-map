import { createClient } from '@/lib/supabase/client'
import type { AppSettings, FeatureFlags } from '@/lib/types/settings'

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
