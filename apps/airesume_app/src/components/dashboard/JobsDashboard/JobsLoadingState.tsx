export default function JobsLoadingState() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-64 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
        </div>
      </div>

      {/* Metrics grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="glass-widget-premium rounded-xl p-6 animate-pulse"
          >
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24 mb-4"></div>
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-20"></div>
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="glass-widget-premium rounded-xl p-6 h-72 animate-pulse"
          >
            <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-32 mb-4"></div>
            <div className="h-full bg-gray-300 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="glass-widget-premium rounded-xl p-6">
        <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-32 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="h-12 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
