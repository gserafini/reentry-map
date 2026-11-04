import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  batch: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
  rename: vi.fn(),
}))
vi.mock('@/lib/utils/admin-auth', () => ({ checkAdminAuth: m.auth }))
vi.mock('@/app/api/resources/suggest-batch/route', () => ({ POST: m.batch }))
vi.mock('fs/promises', () => ({
  default: { mkdir: vi.fn(), readdir: m.readdir, readFile: m.readFile, rename: m.rename },
}))
import { POST } from '@/app/api/admin/import-files/route'
beforeEach(() => {
  vi.clearAllMocks()
  m.auth.mockResolvedValue({ isAuthorized: true })
  m.readdir.mockResolvedValue(['intake.json'])
  m.readFile.mockResolvedValue(JSON.stringify({ resources: [{ name: 'Help' }] }))
  m.batch.mockResolvedValue(NextResponse.json({ stats: { submitted: 1, auto_approved: 1 } }))
})
it('calls trusted batch processing in process, retaining auth without forwarding secrets over network', async () => {
  const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network forbidden'))
  const request = new NextRequest('https://attacker.invalid/api/admin/import-files', {
    method: 'POST',
    headers: { 'x-admin-api-key': 'test-key', cookie: 'session=test' },
  })
  const response = await POST(request)
  expect(response.status).toBe(200)
  expect(m.batch).toHaveBeenCalledTimes(1)
  const batchRequest = m.batch.mock.calls[0][0]
  expect(batchRequest.headers.get('x-admin-api-key')).toBe('test-key')
  expect(batchRequest.headers.get('cookie')).toBe('session=test')
  expect((await batchRequest.json()).resources).toEqual([{ name: 'Help' }])
  expect(network).not.toHaveBeenCalled()
  expect((await response.json()).stats.autoApproved).toBe(1)
  network.mockRestore()
})
