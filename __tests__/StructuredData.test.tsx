import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  BreadcrumbList,
  CollectionPage,
  ItemList,
  LocalBusiness,
  SiteIdentityStructuredData,
} from '@/components/seo/StructuredData'
import type { Resource } from '@/lib/types/database'
import { buildResourceSchema } from '@/lib/seo/resource-schema'

const malicious = '</script><script>globalThis.injected = true</script>'
const resource = {
  id: 'example-resource',
  name: malicious,
  description: 'Help with <housing> & employment',
  address: '123 Example Street',
  city: 'Dallas',
  state: 'TX',
} as Resource

describe('JSON-LD HTML embedding', () => {
  it.each([
    {
      component: 'BreadcrumbList',
      element: <BreadcrumbList items={[{ name: malicious, url: '/tx/dallas' }]} />,
      expected: { itemListElement: [{ name: malicious }] },
    },
    {
      component: 'LocalBusiness',
      element: <LocalBusiness resource={resource} />,
      expected: { name: malicious, description: resource.description },
    },
    {
      component: 'ItemList',
      element: (
        <ItemList
          name="Dallas resources"
          description="Useful help"
          url="/tx/dallas"
          resources={[resource]}
        />
      ),
      expected: {
        itemListElement: [{ item: { name: malicious, description: resource.description } }],
      },
    },
    {
      component: 'CollectionPage',
      element: <CollectionPage name={malicious} description="Useful help" url="/tx/dallas" />,
      expected: { name: malicious },
    },
  ])(
    '$component keeps hostile text inside one JSON script and preserves its data',
    ({ element, expected }) => {
      const holder = document.createElement('div')
      holder.innerHTML = renderToStaticMarkup(element)
      expect(holder.querySelectorAll('script')).toHaveLength(1)
      expect(holder.querySelectorAll('img')).toHaveLength(0)
      const script = holder.querySelector('script[type="application/ld+json"]')
      expect(script).not.toBeNull()
      expect(script!.textContent).not.toContain('</script>')
      expect(JSON.parse(script!.textContent || '')).toMatchObject(expected)
    }
  )
})

describe('resource schema location claims', () => {
  it('emits a physical place only with a plausible street address', () => {
    const schema = buildResourceSchema({
      ...resource,
      address: '123 Main St',
      city: 'Dallas',
      state: 'TX',
      latitude: 32.7,
      longitude: -96.8,
      address_type: 'physical',
    } as Resource)
    expect(schema['@type']).toBe('LocalBusiness')
    expect(schema.address).toMatchObject({
      streetAddress: '123 Main St',
      addressLocality: 'Dallas',
    })
    expect(schema.geo).toMatchObject({ latitude: 32.7, longitude: -96.8 })
  })

  it('represents regional service coverage without publishing its map anchor as an address', () => {
    const schema = buildResourceSchema({
      ...resource,
      address: 'Lubbock',
      city: 'Lubbock',
      state: 'TX',
      latitude: 33.5779,
      longitude: -101.8552,
      address_type: 'regional',
      service_area: { type: 'statewide', values: ['Texas'] },
    } as Resource)
    expect(schema['@type']).toBe('Service')
    expect(schema.address).toBeUndefined()
    expect(schema.geo).toBeUndefined()
    expect(schema.areaServed).toEqual([{ '@type': 'AdministrativeArea', name: 'Texas' }])
  })

  it('does not invent a service area when coverage is missing', () => {
    const schema = buildResourceSchema({ ...resource, address_type: 'online' } as Resource)
    expect(schema['@type']).toBe('Service')
    expect(schema.areaServed).toBeUndefined()
    expect(schema.address).toBeUndefined()
  })
})

describe('site identity structured data', () => {
  it('publishes only the evidenced organization name, public URL and site logo', () => {
    const holder = document.createElement('div')
    holder.innerHTML = renderToStaticMarkup(<SiteIdentityStructuredData />)
    const scripts = Array.from(holder.querySelectorAll('script[type="application/ld+json"]')).map(
      (script) => JSON.parse(script.textContent || '')
    )
    expect(scripts).toHaveLength(2)
    expect(scripts).toContainEqual(
      expect.objectContaining({
        '@type': 'Organization',
        name: 'Reentry Map',
        url: 'https://reentrymap.org',
        logo: 'https://reentrymap.org/ReentryMap_logo_400x100.png',
      })
    )
    expect(scripts).toContainEqual(
      expect.objectContaining({
        '@type': 'WebSite',
        name: 'Reentry Map',
        url: 'https://reentrymap.org',
      })
    )
    expect(JSON.stringify(scripts)).not.toMatch(/address|telephone|email|nonprofit/i)
  })
})

it('uses the same service schema for national hotlines as for other non-physical listings', () => {
  const schema = buildResourceSchema({
    ...resource,
    address: 'Lubbock',
    city: 'Lubbock',
    state: 'TX',
    latitude: 33.5779,
    longitude: -101.8552,
    address_type: 'hotline',
    service_area: { type: 'nationwide', values: ['USA'] },
  } as Resource)
  expect(schema).toMatchObject({
    '@type': 'Service',
    areaServed: [{ '@type': 'Country', name: 'United States' }],
  })
  expect(schema.address).toBeUndefined()
  expect(schema.geo).toBeUndefined()
})

it('does not coerce human hours copy into a structured schedule or publish a zero-coordinate placeholder', () => {
  const schema = buildResourceSchema({
    ...resource,
    address: '123 Main Street',
    hours: { monday: 'Call for appointments; holidays vary' },
    latitude: 0,
    longitude: 0,
  } as Resource)
  expect(schema.openingHours).toBeUndefined()
  expect(schema.geo).toBeUndefined()
})

it('connects a collection page to its one bounded ItemList and matching URL', () => {
  const resources = Array.from({ length: 25 }, (_, index) => ({
    ...resource,
    id: `resource-${index + 1}`,
    name: `Resource ${index + 1}`,
  })) as Resource[]
  const url = 'https://reentrymap.org/co/denver?page=2'
  const holder = document.createElement('div')
  holder.innerHTML = renderToStaticMarkup(
    <>
      <CollectionPage
        name="Denver resources"
        description="Services in Denver"
        url={url}
        numberOfItems={100}
        hasItemList
      />
      <ItemList
        name="Denver resources"
        description="Services in Denver"
        url={url}
        resources={resources}
      />
    </>
  )
  const [collection, itemList] = Array.from(
    holder.querySelectorAll('script[type="application/ld+json"]'),
    (script) => JSON.parse(script.textContent || '')
  )
  expect(collection.mainEntity).toEqual({ '@id': itemList['@id'] })
  expect(itemList['@id']).toBe(`${url}#item-list`)
  expect(itemList.url).toBe(url)
  expect(itemList.numberOfItems).toBe(20)
  expect(itemList.itemListElement).toHaveLength(20)
})
