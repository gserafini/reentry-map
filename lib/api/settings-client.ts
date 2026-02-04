import type { AppSettings, FeatureFlags, AISystemStatus } from '@/lib/types/settings'

/**
 * Client-safe settings functions
 * These call API routes instead of querying the database directly
 * Import this in 'use client' components instead of lib/api/settings
 */

export async function getAppSettings(): Promise<AppSettings | null> {
  try {
    const res = await fetch('/api/settings')
    if (!res.ok) return null
    return (await res.json()) as AppSettings
  } catch {
    console.error('Error fetching app settings')
    return null
  }
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  try {
    const res = await fetch('/api/settings?type=flags')
    if (!res.ok) throw new Error('Failed to fetch')
    return (await res.json()) as FeatureFlags
  } catch {
    return {
      smsAuth: false,
      smsProviderConfigured: false,
      aiMasterEnabled: false,
      aiVerificationEnabled: false,
      aiDiscoveryEnabled: false,
      aiEnrichmentEnabled: false,
      aiRealtimeMonitoringEnabled: true,
    }
  }
}

export async function getAISystemStatus(): Promise<AISystemStatus> {
  try {
    const res = await fetch('/api/settings?type=ai-status')
    if (!res.ok) throw new Error('Failed to fetch')
    return (await res.json()) as AISystemStatus
  } catch {
    return {
      masterEnabled: false,
      verificationEnabled: false,
      discoveryEnabled: false,
      enrichmentEnabled: false,
      realtimeMonitoringEnabled: true,
      isVerificationActive: false,
      isDiscoveryActive: false,
      isEnrichmentActive: false,
    }
  }
}

export async function updateAppSettings(
  updates: Partial<Omit<AppSettings, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/settings/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    return (await res.json()) as { success: boolean; error?: string }
  } catch {
    return { success: false, error: 'Failed to update settings' }
  }
}
