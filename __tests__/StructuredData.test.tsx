import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  BreadcrumbList,
  CollectionPage,
  ItemList,
  LocalBusiness,
} from '@/components/seo/StructuredData'
import type { Resource } from '@/lib/types/database'

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
      element: (
        <CollectionPage
          name={malicious}
          description="Useful help"
          url="/tx/dallas"
          numberOfItems={1}
        />
      ),
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
