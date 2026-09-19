'use client'

import { InstallPrompt } from './InstallPrompt'
import { useEffect } from 'react'

/**
 * PWA Wrapper Component
 *
 * Client-side wrapper for PWA features
 */
export function PWAWrapper() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {
        // Device storage/downloads still work when service workers are unavailable.
      })
    }
  }, [])
  return (
    <>
      <InstallPrompt />
    </>
  )
}
