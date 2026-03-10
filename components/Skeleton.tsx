'use client';

export function MovieCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="relative overflow-hidden rounded-xl aspect-[2/3] mb-3 bg-gray-800">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-shimmer" 
          style={{
            backgroundSize: '200% 100%'
          }}
        />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-800 rounded w-3/4"></div>
        <div className="h-3 bg-gray-800 rounded w-1/2"></div>
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative h-screen bg-gray-900 animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 animate-shimmer"
        style={{
          backgroundSize: '200% 100%'
        }}
      />
      <div className="relative h-full flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-2xl space-y-6">
            <div className="h-8 bg-gray-800 rounded w-1/4"></div>
            <div className="h-16 bg-gray-800 rounded w-2/3"></div>
            <div className="h-4 bg-gray-800 rounded w-full"></div>
            <div className="h-4 bg-gray-800 rounded w-5/6"></div>
            <div className="flex space-x-4 pt-4">
              <div className="h-12 bg-gray-800 rounded w-40"></div>
              <div className="h-12 bg-gray-800 rounded w-40"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}
