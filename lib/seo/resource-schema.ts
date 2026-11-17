import type { Resource } from '@/lib/types/database'
import {
  getResourceAddressType,
  getResourceServiceArea,
  hasPlausibleStreetAddress,
} from '@/lib/utils/resource-location'

const BASE_URL = 'https://reentrymap.org'

export type ResourceSchema = Record<string, unknown> & {
  '@context': string
  '@type': string
  name: string
}

function areaServed(resource: Resource): Array<Record<string, string>> | undefined {
  const serviceArea = getResourceServiceArea(resource)
  if (!serviceArea) return undefined

  const type = serviceArea.type.toLowerCase()
  if (type === 'nationwide') {
    return [{ '@type': 'Country', name: 'United States' }]
  }

  const schemaType =
    type === 'city'
      ? 'City'
      : type === 'county' || type === 'statewide' || type === 'region'
        ? 'AdministrativeArea'
        : null
  if (!schemaType) return undefined

  const values = [...new Set(serviceArea.values.map((value) => value.trim()).filter(Boolean))]
  return values.length ? values.map((name) => ({ '@type': schemaType, name })) : undefined
}

function organizationFields(resource: Resource): Record<string, unknown> {
  return {
    name: resource.name,
    ...(resource.description ? { description: resource.description } : {}),
    ...(resource.phone ? { telephone: resource.phone } : {}),
    ...(resource.email ? { email: resource.email } : {}),
    ...(resource.website ? { url: resource.website } : {}),
  }
}

export function buildResourceSchema(resource: Resource): ResourceSchema {
  const nonPhysical = getResourceAddressType(resource) !== 'physical'
  const base: ResourceSchema = {
    '@context': 'https://schema.org',
    '@type': nonPhysical
      ? 'Service'
      : resource.primary_category === 'healthcare'
        ? 'MedicalBusiness'
        : 'LocalBusiness',
    ...organizationFields(resource),
    name: resource.name,
  }

  if (nonPhysical) {
    const served = areaServed(resource)
    return {
      ...base,
      ...(served ? { areaServed: served } : {}),
      provider: {
        '@type': 'Organization',
        ...organizationFields(resource),
      },
    }
  }

  const streetAddress = typeof resource.address === 'string' ? resource.address.trim() : ''
  if (hasPlausibleStreetAddress(streetAddress, resource.city, resource.state)) {
    base.address = {
      '@type': 'PostalAddress',
      streetAddress,
      ...(resource.city ? { addressLocality: resource.city } : {}),
      ...(resource.state ? { addressRegion: resource.state } : {}),
      ...(resource.zip ? { postalCode: resource.zip } : {}),
      addressCountry: 'US',
    }
    if (
      typeof resource.latitude === 'number' &&
      Number.isFinite(resource.latitude) &&
      typeof resource.longitude === 'number' &&
      Number.isFinite(resource.longitude) &&
      Math.abs(resource.latitude) <= 90 &&
      Math.abs(resource.longitude) <= 180 &&
      !(resource.latitude === 0 && resource.longitude === 0)
    ) {
      base.geo = {
        '@type': 'GeoCoordinates',
        latitude: resource.latitude,
        longitude: resource.longitude,
      }
    }
  }

  if (
    resource.rating_average != null &&
    resource.rating_count != null &&
    resource.rating_count > 0
  ) {
    base.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: resource.rating_average,
      ratingCount: resource.rating_count,
      bestRating: 5,
      worstRating: 1,
    }
  }
  // Human-authored hours remain visible on the listing; do not infer a typed schedule.
  return base
}

export function buildSiteIdentitySchema(): Array<Record<string, unknown>> {
  const organizationId = `${BASE_URL}/#organization`
  const websiteId = `${BASE_URL}/#website`
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': organizationId,
      name: 'Reentry Map',
      url: BASE_URL,
      logo: `${BASE_URL}/ReentryMap_logo_400x100.png`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': websiteId,
      name: 'Reentry Map',
      url: BASE_URL,
      publisher: { '@id': organizationId },
    },
  ]
}
