// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
const fixture = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }))
vi.mock('@/lib/db/client', () => ({
  sql: (parts: TemplateStringsArray, ...values: unknown[]) =>
    Promise.resolve(
      parts.join('?').includes('WHERE id =')
        ? fixture.rows.filter((r) => r.id === values[0])
        : fixture.rows.filter(
            (r) =>
              String(r.city).toLowerCase() === String(values[0]).toLowerCase() &&
              r.state === values[1] &&
              r.status === (parts.join('?').includes("status = 'inactive'") ? 'inactive' : 'active')
          )
    ),
}))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw Error('NOT_FOUND')
  },
  redirect: (u: string) => {
    throw Error('REDIRECT:' + u)
  },
  permanentRedirect: (u: string) => {
    throw Error('PERMANENT:' + u)
  },
}))
vi.mock('@/components/resources/ResourceDetail', () => ({ ResourceDetail: () => null }))
vi.mock('@/components/seo/StructuredData', () => ({ LocalBusiness: () => null }))
vi.mock('@/components/navigation/SmartBreadcrumbs', () => ({ SmartBreadcrumbs: () => null }))
vi.mock('@/components/analytics/ResourceViewTracker', () => ({ ResourceViewTracker: () => null }))
import Page, { generateMetadata } from '@/app/[state]/[city]/[resource-slug]/page'
const id = '11111111-1111-4111-8111-111111111111',
  other = '22222222-2222-4222-8222-222222222222'
const first = {
  id,
  name: 'Community Service',
  city: 'Oakland',
  state: 'CA',
  status: 'active',
  primary_category: 'housing',
  address: '100 Main St',
  address_type: 'physical',
  slug: `community-service--${id}`,
}
import LegacyPage, { generateMetadata as legacyMetadata } from '@/app/resources/[...segments]/page'
const params = (slug: string) => ({
  params: Promise.resolve({ state: 'ca', city: 'oakland', 'resource-slug': slug }),
})
describe('distinct resource URL identity', () => {
  beforeEach(() => {
    fixture.rows = [
      first,
      { ...first, id: other, address: '200 Main St', slug: `community-service--${other}` },
    ]
  })
  it('resolves each identity-qualified record and emits its own canonical', async () => {
    const meta = await generateMetadata(params(`community-service--${other}`))
    expect(meta.alternates?.canonical).toBe(
      `https://reentrymap.org/ca/oakland/community-service--${other}`
    )
    expect(JSON.stringify(meta.openGraph?.images)).toContain(other)
  })
  it('shows an explicit choice for a shared old name instead of arbitrarily selecting a record', async () => {
    const meta = await generateMetadata(params('community-service'))
    expect(meta.robots).toMatchObject({ index: false, follow: true })
    const html = renderToStaticMarkup(await Page(params('community-service')))
    expect(html).toContain(`/ca/oakland/community-service--${id}`)
    expect(html).toContain(`/ca/oakland/community-service--${other}`)
    expect(html).toContain('100 Main St')
    expect(html).toContain('200 Main St')
  })
  it('permanently redirects an unambiguous previous name to its explicit canonical', async () => {
    fixture.rows = [first]
    await expect(Page(params('community-service'))).rejects.toThrow(
      'PERMANENT:/ca/oakland/community-service--' + id
    )
  })
  it('uses generated lowercase canonicals for mixed-case resource aliases', async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({
        state: 'CA',
        city: 'OaKlAnD',
        'resource-slug': `community-service--${id}`,
      }),
    })
    expect(meta.alternates?.canonical).toBe(
      `https://reentrymap.org/ca/oakland/community-service--${id}`
    )
  })
  it('permanently redirects the legacy state/city/slug namespace to the canonical resolver', async () => {
    const p = {
      params: Promise.resolve({ segments: ['ca', 'oakland', `community-service--${id}`] }),
    }
    await expect(LegacyPage(p)).rejects.toThrow('PERMANENT:/ca/oakland/community-service--' + id)
  })
  it('gives a legacy UUID page the same canonical as its identified resource', async () => {
    const meta = await legacyMetadata({ params: Promise.resolve({ segments: [id] }) })
    expect(meta.alternates?.canonical).toBe(
      `https://reentrymap.org/ca/oakland/community-service--${id}`
    )
  })
  it('rejects a mismatched identity suffix', async () => {
    await expect(
      Page(params('community-service--33333333-3333-4333-8333-333333333333'))
    ).rejects.toThrow('NOT_FOUND')
  })
  it('describes nationwide coverage instead of presenting the anchor city as a local office', async () => {
    fixture.rows = [
      {
        ...first,
        name: '988 Suicide & Crisis Lifeline',
        slug: null,
        city: 'Lubbock',
        state: 'TX',
        address_type: 'online',
        service_area: { type: 'nationwide', values: ['United States'] },
      },
    ]
    const meta = await generateMetadata({
      params: Promise.resolve({
        state: 'tx',
        city: 'lubbock',
        'resource-slug': '988-suicide-crisis-lifeline',
      }),
    })
    expect(meta.title).toBe(
      '988 Suicide & Crisis Lifeline | Serves people nationwide | Reentry Map'
    )
    expect(JSON.stringify(meta.openGraph?.images)).toContain('Serves+people+nationwide')
    expect(JSON.stringify(meta)).not.toContain('in Lubbock')
  })
  it('uses declared coverage on legacy UUID sharing metadata too', async () => {
    fixture.rows = [
      {
        ...first,
        name: '988 Suicide & Crisis Lifeline',
        slug: null,
        city: 'Lubbock',
        state: 'TX',
        address_type: 'online',
        service_area: { type: 'nationwide', values: ['United States'] },
      },
    ]
    const meta = await legacyMetadata({ params: Promise.resolve({ segments: [id] }) })
    expect(meta.title).toBe(
      '988 Suicide & Crisis Lifeline | Serves people nationwide | Reentry Map'
    )
    expect(JSON.stringify(meta.openGraph?.images)).toContain('Serves+people+nationwide')
    expect(JSON.stringify(meta.openGraph?.images)).not.toContain('Lubbock')
  })

  it('keeps unknown nonphysical coverage unknown instead of falling back to an office city', async () => {
    fixture.rows = [
      {
        ...first,
        name: 'Community Service',
        slug: null,
        address_type: 'online',
        service_area: null,
        description: null,
      },
    ]
    const meta = await generateMetadata(params('community-service'))
    expect(meta.title).toBe('Community Service | Online resource | Reentry Map')
    expect(meta.description).not.toContain('Oakland')
    expect(JSON.stringify(meta.openGraph?.images)).not.toContain('Oakland')
  })
  it('does not assign a regional coverage claim to a hotline with unknown coverage', async () => {
    fixture.rows = [
      {
        ...first,
        name: 'Community Service',
        slug: null,
        address_type: 'hotline',
        service_area: null,
        description: null,
      },
    ]
    const meta = await generateMetadata(params('community-service'))
    expect(meta.title).toBe('Community Service | Hotline | Reentry Map')
    expect(meta.description).not.toContain('Regional')
  })
})
