/**
 * JSON-LD Structured Data Components
 * Helps Google understand our pages and show rich snippets
 */

import type { Resource } from '@/lib/types/database'
import { serializeJsonLd } from '@/lib/utils/structured-data'
import { buildResourceSchema, buildSiteIdentitySchema } from '@/lib/seo/resource-schema'

const SITE_URL = 'https://reentrymap.org'

function absolutePageUrl(url: string): string {
  return new URL(url, `${SITE_URL}/`).toString()
}

function itemListId(url: string): string {
  return `${absolutePageUrl(url)}#item-list`
}

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
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
    />
  )
}

interface LocalBusinessProps {
  resource: Resource
}

export function LocalBusiness({ resource }: LocalBusinessProps) {
  const structuredData = buildResourceSchema(resource)

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
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
    '@id': itemListId(url),
    url: absolutePageUrl(url),
    numberOfItems: resources.slice(0, 20).length,
    itemListElement: resources.slice(0, 20).map((resource, index) => {
      const { ['@context']: _context, ...item } = buildResourceSchema(resource)
      return { '@type': 'ListItem', position: index + 1, item }
    }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
    />
  )
}

export function SiteIdentityStructuredData() {
  const structuredData = buildSiteIdentitySchema()
  return (
    <>
      {structuredData.map((item) => (
        <script
          key={String(item['@type'])}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(item) }}
        />
      ))}
    </>
  )
}

interface CollectionPageProps {
  name: string
  description: string
  url: string
  hasItemList?: boolean
}

export function CollectionPage({
  name,
  description,
  url,
  hasItemList = false,
}: CollectionPageProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${absolutePageUrl(url)}#collection`,
    name,
    description,
    url: absolutePageUrl(url),
    about: {
      '@type': 'Thing',
      name: 'Reentry Resources',
      description: 'Community resources for individuals navigating reentry',
    },
    ...(hasItemList ? { mainEntity: { '@id': itemListId(url) } } : {}),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
    />
  )
}
