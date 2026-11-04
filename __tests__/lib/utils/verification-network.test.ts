// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetchPublicUrl: vi.fn(),
  resolvePublicUrl: vi.fn(),
  openPublicBrowser: vi.fn(),
  close: vi.fn(),
  goto: vi.fn(),
  launch: vi.fn(),
}))
vi.mock('@/lib/utils/public-network.mjs', () => mocks)
vi.mock('playwright', () => ({ chromium: { launch: mocks.launch } }))
vi.mock('@/lib/utils/geocoding', () => ({ geocodeAddress: vi.fn() }))
import { extractWebsiteContent, checkUrlReachable } from '@/lib/utils/verification'
import { toolFetchUrl } from '@/lib/ai-agents/ollama-client'

describe('verification uses the public network boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchPublicUrl.mockResolvedValue(new Response('<p>Public service</p>'))
    mocks.resolvePublicUrl.mockResolvedValue({ url: new URL('https://example.org') })
    const context = { newPage: async () => ({ goto: mocks.goto, addInitScript: vi.fn() }) }
    mocks.openPublicBrowser.mockResolvedValue({ context, close: mocks.close })
    mocks.launch.mockResolvedValue({ newContext: async () => context, close: mocks.close })
    mocks.goto.mockResolvedValue({ status: () => 200 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<p>unsafe direct fetch</p>')))
  })

  it('extracts website text through bounded public fetch', async () => {
    expect(await extractWebsiteContent('https://example.org')).toBe('Public service')
    expect(mocks.fetchPublicUrl).toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('constrains model-selected URLs with the same fetch policy', async () => {
    const result = JSON.parse(await toolFetchUrl({ url: 'https://example.org' }))
    expect(result.content).toBe('Public service')
    expect(mocks.fetchPublicUrl).toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('checks browser URLs before launch and closes the isolated browser', async () => {
    expect((await checkUrlReachable('https://example.org')).pass).toBe(true)
    expect(mocks.resolvePublicUrl).toHaveBeenCalled()
    expect(mocks.openPublicBrowser).toHaveBeenCalled()
    expect(mocks.close).toHaveBeenCalledOnce()
    expect(mocks.launch).not.toHaveBeenCalled()
  })

  it('rejects a private URL before starting any browser', async () => {
    mocks.resolvePublicUrl.mockRejectedValue(new Error('Website destination is not public'))
    expect((await checkUrlReachable('http://127.0.0.1')).pass).toBe(false)
    expect(mocks.openPublicBrowser).not.toHaveBeenCalled()
    expect(mocks.launch).not.toHaveBeenCalled()
  })
})
