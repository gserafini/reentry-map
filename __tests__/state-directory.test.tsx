import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
vi.mock('@/lib/api/resources', () => ({
  getResourcesCount: vi.fn(async () => ({ data: 100, error: null })),
}))
vi.mock('@/lib/db/client', () => ({
  sql: vi.fn(async (strings: TemplateStringsArray) => {
    const query = strings.join('')
    if (query.includes('COUNT(*)') && !query.includes('GROUP BY')) return [{ count: 20 }]
    const rows = Array.from({ length: 24 }, (_, i) => ({ city: 'City' + (i + 1), count: i + 1 }))
    return query.includes('LIMIT 20') ? rows.slice(0, 20) : rows
  }),
}))
vi.mock('@/components/seo/StructuredData', () => ({
  BreadcrumbList: () => null,
  CollectionPage: () => null,
}))
import StatePage from '@/app/[state]/page'
describe('state directory', () => {
  it('lists every available city and uses coverage-aware state totals', async () => {
    const html = renderToStaticMarkup(await StatePage({ params: Promise.resolve({ state: 'tx' }) }))
    expect(html).toContain('City24')
    expect(html).toContain('100 resources')
    expect(html).toContain('/resources?state=TX')
  })
})
