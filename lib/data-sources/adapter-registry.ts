/**
 * Adapter Registry - Central registry for all data source adapters
 */

import { CareerOneStopAdapter, CareerOneStopReEntryAdapter } from './adapters/careeronestop'
import type { DataSourceAdapter } from './types'

/**
 * Registry of all available data source adapters
 */
export const adapterRegistry: Record<string, DataSourceAdapter> = {
  careeronestop: new CareerOneStopAdapter(),
  careeronestop_reentry: new CareerOneStopReEntryAdapter(),
  // More adapters will be added as they're implemented:
  // samhsa: new SAMHSAAdapter(),
  // hud_exchange: new HUDExchangeAdapter(),
  // lsc: new LSCAdapter(),
  // usda_food: new USDAFoodAdapter(),
}

/**
 * Get adapter by name
 */
export function getAdapter(name: string): DataSourceAdapter {
  const adapter = adapterRegistry[name]

  if (!adapter) {
    const available = Object.keys(adapterRegistry).join(', ')
    throw new Error(
      `Unknown adapter: ${name}. Available adapters: ${available}`
    )
  }

  return adapter
}

/**
 * List all available adapters
 */
export function listAdapters(): Array<{ name: string; displayName: string }> {
  return Object.values(adapterRegistry).map((adapter) => ({
    name: adapter.name,
    displayName: adapter.displayName,
  }))
}

/**
 * Check if an adapter exists
 */
export function hasAdapter(name: string): boolean {
  return name in adapterRegistry
}
