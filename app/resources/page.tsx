import { getResources } from '@/lib/api/resources'
import { ResourceList } from '@/components/resources/ResourceList'

/**
 * Resources List Page
 * Server Component that fetches and displays all active resources
 */
export default async function ResourcesPage() {
  const { data: resources, error } = await getResources({ limit: 100 })

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="mb-2 text-xl font-semibold text-red-800">Error Loading Resources</h2>
          <p className="text-red-700">
            We encountered an issue loading resources. Please try again later.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Community Resources</h1>
        <p className="mt-2 text-gray-600">
          Browse resources in your area to help with employment, housing, food, and more.
        </p>
      </div>

      {resources && resources.length > 0 && (
        <div className="mb-4 text-sm text-gray-500">
          Showing {resources.length} resource{resources.length !== 1 ? 's' : ''}
        </div>
      )}

      <ResourceList resources={resources || []} />
    </div>
  )
}
