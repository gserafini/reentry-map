import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, resetRouterMocks, setMockSearchParams } from '@/__tests__/test-utils'
import { ResourcesView } from '@/app/resources/ResourcesView'

const mockResourceList = vi.fn()

vi.mock('@/components/resources/ResourceList', () => ({
  ResourceList: (props: unknown) => {
    mockResourceList(props)
    return null
  },
}))

vi.mock('@/components/map', () => ({
  ResourceMap: () => null,
}))

vi.mock('@/components/search/NearMeButton', () => ({
  NearMeButton: () => null,
}))

vi.mock('@/components/search/DistanceFilter', () => ({
  DistanceFilter: () => null,
}))

vi.mock('@/components/search/CategoryFilter', () => ({
  CategoryFilter: () => null,
}))

vi.mock('@/lib/context/LocationContext', () => ({
  useUserLocation: () => ({ coordinates: null }),
}))

describe('ResourcesView', () => {
  beforeEach(() => {
    mockResourceList.mockReset()
    resetRouterMocks()
  })

  it('passes URL-based coordinates through to ResourceList for distance display', () => {
    setMockSearchParams({
      lat: '32.715738',
      lng: '-117.1610838',
      distance: '25',
    })

    render(
      <ResourcesView
        resources={[
          {
            id: '1',
            name: 'Test Resource',
            address: '123 Main St',
          },
        ]}
        isSearching={false}
        isFiltering={true}
      />
    )

    expect(mockResourceList).toHaveBeenCalledWith(
      expect.objectContaining({
        userLocation: {
          lat: 32.715738,
          lng: -117.1610838,
        },
      })
    )
  })
})
