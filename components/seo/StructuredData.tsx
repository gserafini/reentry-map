/**
 * JSON-LD Structured Data Components
 * Helps Google understand our pages and show rich snippets
 */

import type { Resource } from '@/lib/types/database'

interface BreadcrumbListProps {
  items: Array<{
    name: string
    url: string
  }>
}

export function BreadcrumbList({ items }: BreadcrumbListProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://reentrymap.org${item.url}`,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

interface LocalBusinessProps {
  resource: Resource
}

export function LocalBusiness({ resource }: LocalBusinessProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: resource.name,
    description: resource.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: resource.address,
      addressLocality: resource.city,
      addressRegion: resource.state,
      postalCode: resource.zip,
      addressCountry: 'US',
    },
    ...(resource.latitude &&
      resource.longitude && {
        geo: {
          '@type': 'GeoCoordinates',
          latitude: resource.latitude,
          longitude: resource.longitude,
        },
      }),
    ...(resource.phone && { telephone: resource.phone }),
    ...(resource.website && { url: resource.website }),
    ...(resource.email && { email: resource.email }),
    ...(resource.rating_average &&
      resource.rating_count && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: resource.rating_average,
          ratingCount: resource.rating_count,
          bestRating: 5,
          worstRating: 1,
        },
      }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

interface ItemListProps {
  name: string
  description: string
  url: string
  resources: Resource[]
}

export function ItemList({ name, description, url, resources }: ItemListProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    description,
    url: `https://reentrymap.org${url}`,
    numberOfItems: resources.length,
    itemListElement: resources.slice(0, 20).map((resource, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'LocalBusiness',
        name: resource.name,
        description: resource.description,
        address: {
          '@type': 'PostalAddress',
          streetAddress: resource.address,
          addressLocality: resource.city,
          addressRegion: resource.state,
        },
        ...(resource.rating_average &&
          resource.rating_count && {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: resource.rating_average,
              ratingCount: resource.rating_count,
            },
          }),
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

interface CollectionPageProps {
  name: string
  description: string
  url: string
  numberOfItems: number
}

export function CollectionPage({ name, description, url, numberOfItems }: CollectionPageProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: `https://reentrymap.org${url}`,
    about: {
      '@type': 'Thing',
      name: 'Reentry Resources',
      description: 'Community resources for individuals navigating reentry',
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
