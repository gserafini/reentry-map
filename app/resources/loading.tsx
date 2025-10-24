/**
 * Loading state for Resources page
 * Displayed while the server component is fetching data
 */
export default function ResourcesLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="mb-2 h-8 w-64 animate-pulse rounded bg-gray-200"></div>
        <div className="h-4 w-96 animate-pulse rounded bg-gray-200"></div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="animate-pulse rounded-lg border border-gray-200 p-6">
            <div className="mb-2 h-6 w-3/4 rounded bg-gray-200"></div>
            <div className="mb-4 h-4 w-1/2 rounded bg-gray-200"></div>
            <div className="h-4 w-full rounded bg-gray-200"></div>
          </div>
        ))}
      </div>
    </div>
  )
}
