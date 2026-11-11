// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fixture = vi.hoisted(() => ({ resources: [] as Array<Record<string, unknown>> }))

vi.mock('@/lib/db/client', () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join('?')

    if (text.includes('WHERE id = ?')) {
      return Promise.resolve(
        fixture.resources.filter(
          (resource) => resource.id === values[0] && resource.status === 'active'
        )
      )
    }

    if (!text.includes('FROM resources')) return Promise.resolve([])

    const city = String(values[0]).toLowerCase()
    const state = values[1]
    const status = text.includes("status = 'inactive'")
      ? 'inactive'
      : text.includes("status = 'active'")
        ? 'active'
        : undefined
    return Promise.resolve(
      fixture.resources.filter(
        (resource) =>
          String(resource.city).toLowerCase() === city &&
          resource.state === state &&
          (!status || resource.status === status)
      )
    )
  },
}))

vi.mock('@/lib/api/resources', () => ({
  getResourceById: async (id: string) => ({
    data: fixture.resources.find((resource) => resource.id === id) || null,
    error: null,
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/components/resources/ResourceDetail', () => ({ ResourceDetail: () => null }))
vi.mock('@/components/seo/StructuredData', () => ({ LocalBusiness: () => null }))
vi.mock('@/components/navigation/SmartBreadcrumbs', () => ({ SmartBreadcrumbs: () => null }))
vi.mock('@/components/analytics/ResourceViewTracker', () => ({ ResourceViewTracker: () => null }))

import ResourcePage, { generateMetadata } from '@/app/[state]/[city]/[resource-slug]/page'
import ShortResourcePage from '@/app/r/[id]/page'

const canonicalId = '22222222-2222-4222-8222-222222222222'
const duplicateId = '11111111-1111-4111-8111-111111111111'
const alternateCanonicalId = '33333333-3333-4333-8333-333333333333'
const alternateDuplicateId = '44444444-4444-4444-8444-444444444444'

const canonical = {
  id: canonicalId,
  name: 'RTD LiVE Program',
  city: 'Denver',
  state: 'CO',
  status: 'active',
  description: 'Current canonical record.',
  primary_category: 'transportation',
}
const duplicate = {
  ...canonical,
  id: duplicateId,
  name: 'RTD LiVE Discount Program',
  status: 'inactive',
  provenance: { duplicate_merge: { canonical_resource_id: canonicalId } },
}

const shortParams = (id: string) => ({ params: Promise.resolve({ id }) })
const slugParams = (slug: string) => ({
  params: Promise.resolve({ state: 'co', city: 'denver', 'resource-slug': slug }),
})

describe('duplicate resource public routes', () => {
  beforeEach(() => {
    fixture.resources = [canonical, duplicate]
  })

  it('redirects an eligible short duplicate URL to the active canonical URL', async () => {
    await expect(ShortResourcePage(shortParams(duplicateId))).rejects.toThrow(
      'NEXT_REDIRECT:/co/denver/rtd-live-program'
    )
  })

  it('redirects an eligible SEO slug to the active canonical URL', async () => {
    await expect(ResourcePage(slugParams('rtd-live-discount-program'))).rejects.toThrow(
      'NEXT_REDIRECT:/co/denver/rtd-live-program'
    )
  })

  it('redirects duplicate SEO metadata requests to the canonical URL', async () => {
    await expect(generateMetadata(slugParams('rtd-live-discount-program'))).rejects.toThrow(
      'NEXT_REDIRECT:/co/denver/rtd-live-program'
    )
  })

  it('keeps ambiguous inactive SEO slugs unavailable', async () => {
    fixture.resources = [
      canonical,
      {
        ...canonical,
        id: alternateCanonicalId,
        name: 'Metro Regional Transit Program',
      },
      duplicate,
      {
        ...duplicate,
        id: alternateDuplicateId,
        name: 'RTD LiVE Discount Program!',
        provenance: { duplicate_merge: { canonical_resource_id: alternateCanonicalId } },
      },
    ]

    await expect(ResourcePage(slugParams('rtd-live-discount-program'))).rejects.toThrow(
      'NEXT_NOT_FOUND'
    )
    await expect(generateMetadata(slugParams('rtd-live-discount-program'))).resolves.toMatchObject({
      title: 'Resource Not Found | Reentry Map',
    })
  })

  it('keeps duplicate links unavailable when another active peer owns the same slug', async () => {
    const collision = {
      ...canonical,
      id: '33333333-3333-4333-8333-333333333333',
      name: 'RTD LiVE Program!',
    }
    fixture.resources = [canonical, duplicate, collision]

    await expect(ShortResourcePage(shortParams(duplicateId))).rejects.toThrow('NEXT_REDIRECT:/')
    await expect(ResourcePage(slugParams('rtd-live-discount-program'))).rejects.toThrow(
      'NEXT_NOT_FOUND'
    )
  })

  it('uses the canonical city and state when its active target is in a different city', async () => {
    fixture.resources = [
      { ...canonical, city: 'Aurora' },
      duplicate,
      { ...canonical, id: '33333333-3333-4333-8333-333333333333', name: 'RTD LiVE Program!' },
    ]

    await expect(ShortResourcePage(shortParams(duplicateId))).rejects.toThrow(
      'NEXT_REDIRECT:/co/aurora/rtd-live-program'
    )
    await expect(ResourcePage(slugParams('rtd-live-discount-program'))).rejects.toThrow(
      'NEXT_REDIRECT:/co/aurora/rtd-live-program'
    )
  })

  it('keeps non-duplicate inactive records unavailable on both routes', async () => {
    const privateRecord = { ...duplicate, provenance: null }
    fixture.resources = [canonical, privateRecord]

    await expect(ShortResourcePage(shortParams(duplicateId))).rejects.toThrow('NEXT_REDIRECT:/')
    await expect(ResourcePage(slugParams('rtd-live-discount-program'))).rejects.toThrow(
      'NEXT_NOT_FOUND'
    )
  })

  it.each(['draft', 'flagged'])(
    'keeps %s records unavailable despite a merge pointer',
    async (status) => {
      fixture.resources = [canonical, { ...duplicate, status }]

      await expect(ShortResourcePage(shortParams(duplicateId))).rejects.toThrow('NEXT_REDIRECT:/')
      await expect(ResourcePage(slugParams('rtd-live-discount-program'))).rejects.toThrow(
        'NEXT_NOT_FOUND'
      )
    }
  )

  it('keeps an inactive duplicate unavailable when its target is missing or inactive', async () => {
    fixture.resources = [{ ...canonical, status: 'inactive' }, duplicate]
    await expect(ShortResourcePage(shortParams(duplicateId))).rejects.toThrow('NEXT_REDIRECT:/')
    await expect(ResourcePage(slugParams('rtd-live-discount-program'))).rejects.toThrow(
      'NEXT_NOT_FOUND'
    )

    fixture.resources = [duplicate]
    await expect(ShortResourcePage(shortParams(duplicateId))).rejects.toThrow('NEXT_REDIRECT:/')
  })

  it('keeps active records on their existing detail route', async () => {
    await expect(ResourcePage(slugParams('rtd-live-program'))).resolves.toBeTruthy()
    await expect(ShortResourcePage(shortParams(canonicalId))).rejects.toThrow(
      'NEXT_REDIRECT:/co/denver/rtd-live-program'
    )
  })
})
