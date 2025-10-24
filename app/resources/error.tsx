'use client'

/**
 * Error boundary for Resources page
 * Displayed when an error occurs during rendering
 */
export default function ResourcesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="mb-2 text-xl font-semibold text-red-800">Something went wrong!</h2>
        <p className="mb-4 text-red-700">
          {error.message || 'An unexpected error occurred while loading resources.'}
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
