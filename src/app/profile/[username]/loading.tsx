export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Header Section Skeleton */}
      <div className="relative">
        {/* Banner Skeleton */}
        <div className="h-64 bg-gray-800 animate-pulse" />
        
        {/* Profile Info Skeleton */}
        <div className="relative px-4 sm:px-6 lg:px-8 -mt-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
              {/* Avatar Skeleton */}
              <div className="w-32 h-32 rounded-full bg-gray-700 animate-pulse border-4 border-gray-900" />
              
              {/* Profile Details Skeleton */}
              <div className="flex-1 space-y-3">
                <div className="h-8 bg-gray-700 rounded animate-pulse w-64" />
                <div className="h-6 bg-gray-700 rounded animate-pulse w-48" />
                <div className="h-5 bg-gray-700 rounded animate-pulse w-32" />
              </div>
              
              {/* Action Buttons Skeleton */}
              <div className="flex gap-3">
                <div className="h-10 bg-gray-700 rounded-lg animate-pulse w-24" />
                <div className="h-10 bg-gray-700 rounded-lg animate-pulse w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections Skeleton */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* About Section Skeleton */}
          <div className="bg-gray-800/20 border border-gray-700 rounded-xl p-6">
            <div className="h-6 bg-gray-700 rounded animate-pulse w-32 mb-4" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded animate-pulse w-full" />
              <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-gray-700 rounded animate-pulse w-5/6" />
            </div>
          </div>

          {/* Experience Section Skeleton */}
          <div className="bg-gray-800/20 border border-gray-700 rounded-xl p-6">
            <div className="h-6 bg-gray-700 rounded animate-pulse w-32 mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="h-5 bg-gray-700 rounded animate-pulse w-48" />
                    <div className="h-4 bg-gray-700 rounded animate-pulse w-24" />
                  </div>
                  <div className="h-4 bg-gray-700 rounded animate-pulse w-32 mb-2" />
                  <div className="space-y-1">
                    <div className="h-3 bg-gray-700 rounded animate-pulse w-full" />
                    <div className="h-3 bg-gray-700 rounded animate-pulse w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Work Section Skeleton */}
          <div className="bg-gray-800/20 border border-gray-700 rounded-xl p-6">
            <div className="h-6 bg-gray-700 rounded animate-pulse w-32 mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-gray-700 rounded-lg overflow-hidden">
                  <div className="h-48 bg-gray-700 animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-5 bg-gray-700 rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-gray-700 rounded animate-pulse w-full" />
                    <div className="h-4 bg-gray-700 rounded animate-pulse w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skills Section Skeleton */}
          <div className="bg-gray-800/20 border border-gray-700 rounded-xl p-6">
            <div className="h-6 bg-gray-700 rounded animate-pulse w-32 mb-6" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-8 bg-gray-700 rounded-full animate-pulse w-20" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
