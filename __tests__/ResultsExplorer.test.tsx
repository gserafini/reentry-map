import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  resetRouterMocks,
  setMockSearchParams,
  setMockPathname,
} from '@/__tests__/test-utils'
import { ResultsExplorer } from '@/components/search/ResultsExplorer'

const list = vi.fn()
vi.mock('@/components/resources/ResourceList', () => ({
  ResourceList: (props: unknown) => {
    list(props)
    return <div>Result cards</div>
  },
}))
vi.mock('@/components/map', () => ({
  ResourceMap: ({ onResourceClick }: { onResourceClick: (id: string) => void }) => (
    <div>
      Interactive map
      <button onClick={() => onResourceClick('outside-page')}>Select off-page marker</button>
    </div>
  ),
}))
vi.mock('@/components/search/CategoryFilter', () => ({
  CategoryFilter: () => <div>Category choices</div>,
}))
vi.mock('@/components/search/DistanceFilter', () => ({
  DistanceFilter: () => <div>Radius choices</div>,
}))
vi.mock('@/components/search/SortDropdown', () => ({ SortDropdown: () => <div>Sort choices</div> }))

describe('ResultsExplorer', () => {
  beforeEach(() => {
    resetRouterMocks()
    list.mockReset()
  })
  it('explains that sorting applies within physical and area service sections', () => {
    render(
      <ResultsExplorer
        resources={
          [
            { id: 'p', name: 'Place', address_type: 'physical' },
            { id: 's', name: 'Area service', address_type: 'regional' },
          ] as import('@/lib/types/database').Resource[]
        }
        totalCount={2}
      />
    )
    expect(screen.getByText('Sorted within each section')).toBeInTheDocument()
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ groupByLocationType: true }))
  })
  it('makes the visible map subset explicit', () => {
    render(<ResultsExplorer resources={[]} totalCount={25} />)
    fireEvent.click(screen.getByRole('button', { name: 'Map' }))
    expect(screen.getByText(/Map shows 0 of 25 matching resources/)).toBeInTheDocument()
  })
  it('starts with usable cards and only loads mobile map when requested', () => {
    render(<ResultsExplorer resources={[]} totalCount={0} />)
    expect(screen.queryByText('Interactive map')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Map' }))
    expect(screen.getByText('Interactive map')).toBeInTheDocument()
  })
  it('keeps category controls behind a labeled filters button', () => {
    render(<ResultsExplorer resources={[]} totalCount={0} />)
    expect(screen.queryByText('Category choices')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    expect(screen.getByText('Category choices')).toBeInTheDocument()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Filter resources' })).toHaveAttribute(
      'aria-modal',
      'true'
    )
  })
  it('shows a detail link when a marker is outside the visible result page', () => {
    render(
      <ResultsExplorer
        resources={[]}
        totalCount={25}
        mapResources={[
          {
            id: 'outside-page',
            primary_category: 'general-support',
            address: '',
            latitude: null,
            longitude: null,
            name: 'Area support',
            slug: 'area-support',
            city: 'Dallas',
            state: 'TX',
          },
        ]}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Map' }))
    fireEvent.click(screen.getByRole('button', { name: 'Select off-page marker' }))
    expect(screen.getByRole('link', { name: 'View selected resource' })).toHaveAttribute(
      'href',
      '/tx/dallas/area-support'
    )
  })
  it('keeps the city when clearing an empty category search', () => {
    setMockPathname('/tx/dallas/category/housing')
    render(<ResultsExplorer resources={[]} totalCount={0} />)
    expect(screen.getByRole('link', { name: 'Browse all help in this area' })).toHaveAttribute(
      'href',
      '/tx/dallas'
    )
  })
  it('shows the category route chip ahead of a conflicting query filter', () => {
    setMockPathname('/category/housing')
    setMockSearchParams({ categories: 'employment' })
    render(<ResultsExplorer resources={[]} totalCount={0} />)
    expect(screen.getByText('Housing')).toBeInTheDocument()
    expect(screen.queryByText('Employment')).not.toBeInTheDocument()
  })
  it('shows an active tag and clears it while preserving the location', () => {
    setMockPathname('/resources')
    setMockSearchParams({ state: 'TX', tags: 'veterans' })
    render(<ResultsExplorer resources={[]} totalCount={0} />)
    expect(screen.getByText('Tag: veterans')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse all help in this area' })).toHaveAttribute(
      'href',
      '/resources?state=TX'
    )
  })
  it('preserves location when offering a broader no-results search', () => {
    setMockSearchParams({
      search: 'housing',
      lat: '32.77',
      lng: '-96.79',
      distance: '25',
      locationName: 'Dallas, TX',
    })
    render(<ResultsExplorer resources={[]} totalCount={0} />)
    const expand = screen.getByRole('link', { name: 'Try 50 miles' })
    expect(expand.getAttribute('href')).toContain('distance=50')
    expect(expand.getAttribute('href')).toContain('lat=32.77')
    expect(expand.getAttribute('href')).toContain('search=housing')
  })
})
