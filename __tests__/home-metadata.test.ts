import { describe, expect, it } from 'vitest'
import { metadata } from '@/app/page'
import { metadata as methodologyMetadata } from '@/app/methodology/page'
import { metadata as aboutMetadata } from '@/app/about/page'

describe('homepage metadata', () => {
  it('declares the canonical root URL', () => {
    expect(metadata.alternates?.canonical).toBe('https://reentrymap.org/')
  })

  it('uses metadata image pipeline v3 and canonical public information URLs', () => {
    expect(aboutMetadata.alternates?.canonical).toBe('https://reentrymap.org/about')
    const meta = methodologyMetadata
    expect(meta.alternates?.canonical).toBe('https://reentrymap.org/methodology')
    const images = meta.openGraph?.images
    const first = Array.isArray(images) ? images[0] : images
    const url = typeof first === 'string' ? first : first?.url
    expect(String(url)).toContain('/api/og?')
    expect(String(url)).toContain('v=3')
  })
})
