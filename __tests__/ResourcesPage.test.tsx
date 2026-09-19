import { beforeEach, describe, expect, it, vi } from 'vitest'
import ResourcesPage from '@/app/resources/page'
import type { ReactNode, ReactElement } from 'react'

const mockGetResources = vi.fn()
const mockGetResourcesForMap = vi.fn()
const mockGetCategoryCounts = vi.fn()
const mockGetResourcesCount = vi.fn()

vi.mock('@/lib/api/resources', () => ({
  getResources: (...args: unknown[]) => mockGetResources(...args),
  getResourcesForMap: (...args: unknown[]) => mockGetResourcesForMap(...args),
  getResourcesCount: (...args: unknown[]) => mockGetResourcesCount(...args),
  getCategoryCounts: (...args: unknown[]) => mockGetCategoryCounts(...args),
}))

function findElementWithProp(node: ReactNode, propName: string): ReactElement | null {
  if (!node || typeof node !== 'object') return null

  if ('props' in node && node.props && typeof node.props === 'object' && propName in node.props) {
    return node as ReactElement
  }

  const children =
    'props' in node && node.props && typeof node.props === 'object' ? node.props.children : null

  if (Array.isArray(children)) {
    for (const child of children) {
      const match = findElementWithProp(child, propName)
      if (match) return match
    }
    return null
  }

  return findElementWithProp(children, propName)
}

describe('ResourcesPage', () => {
  beforeEach(() => {
    mockGetResources.mockReset()
    mockGetResourcesForMap.mockReset()
    mockGetCategoryCounts.mockReset()
    mockGetResourcesCount.mockResolvedValue({ data: 42, error: null })
  })

  it('passes a capped list dataset and a full map dataset separately', async () => {
    const listResources = [
      {
        id: 'list-1',
        name: 'A List Resource',
        city: 'Seattle',
        state: 'WA',
      },
    ]

    const mapResources = [
      ...listResources,
      {
        id: 'map-2',
        name: 'Z Map Only Resource',
        city: 'Walla Walla',
        state: 'WA',
      },
    ]

    mockGetResources.mockResolvedValue({ data: listResources, error: null })
    mockGetResourcesForMap.mockResolvedValue({ data: mapResources, error: null })
    mockGetCategoryCounts.mockResolvedValue({ data: {}, error: null })

    const ui = await ResourcesPage({
      searchParams: Promise.resolve({}),
    })

    const resourcesViewElement = findElementWithProp(ui, 'isSearching')

    expect(mockGetResources).toHaveBeenCalledWith(expect.objectContaining({ limit: 20, offset: 0 }))
    const { limit: _limit, offset: _offset, ...sharedOptions } = mockGetResources.mock.calls[0][0]
    expect(_limit).toBe(20)
    expect(_offset).toBe(0)
    expect(mockGetResourcesForMap).toHaveBeenCalledWith(sharedOptions)
    expect(mockGetResourcesCount).toHaveBeenCalledWith(sharedOptions)
    expect(resourcesViewElement?.props).toEqual(
      expect.objectContaining({
        resources: listResources,
        mapResources,
        totalCount: 42,
      })
    )
  })
})
