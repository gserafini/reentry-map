// @vitest-environment node
import { expect, it, vi } from 'vitest'
const row = vi.hoisted(() => ({
  id: '7a9646e7-a6af-4a27-af0a-8b2182de6cdd',
  name: 'Denver Day Works',
  city: 'Denver',
  state: 'CO',
  status: 'active',
  provenance: { public_slug_aliases: ['denver-day-works-bayaud-enterprises'] },
}))
vi.mock('@/lib/db/client', () => ({
  sql: (parts: TemplateStringsArray) =>
    Promise.resolve(parts.join('').includes("status = 'inactive'") ? [] : [row]),
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
import Page from '@/app/[state]/[city]/[resource-slug]/page'
it('preserves an explicit prior public slug after the source-reviewed operator correction', async () => {
  await expect(
    Page({
      params: Promise.resolve({
        state: 'co',
        city: 'denver',
        'resource-slug': 'denver-day-works-bayaud-enterprises',
      }),
    })
  ).rejects.toThrow('PERMANENT:/co/denver/denver-day-works')
})
