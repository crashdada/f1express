export const SkeletonCard = () => (
  <div className="bg-primary/10 rounded-2xl p-6 h-64 animate-pulse border border-border">
    <div className="flex items-center space-x-4 mb-4">
      <div className="w-16 h-16 rounded-full bg-primary/20" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-primary/20 rounded w-3/4" />
        <div className="h-3 bg-primary/20 rounded w-1/2" />
      </div>
    </div>
    <div className="space-y-3">
      <div className="h-3 bg-primary/20 rounded" />
      <div className="h-3 bg-primary/20 rounded w-5/6" />
    </div>
  </div>
);

export const SkeletonTable = () => (
  <div className="bg-primary/10 rounded-2xl p-6 animate-pulse border border-border">
    <div className="space-y-4">
      {Array(8).fill(null).map((_, i) => (
        <div key={i} className="h-12 bg-primary/20 rounded" />
      ))}
    </div>
  </div>
);

export const SkeletonRaceCard = () => (
  <div className="bg-primary/10 rounded-2xl p-6 h-48 animate-pulse border border-border">
    <div className="flex justify-between mb-6">
      <div className="space-y-2">
        <div className="h-6 bg-primary/20 rounded w-32" />
        <div className="h-4 bg-primary/20 rounded w-48" />
      </div>
      <div className="w-24 h-10 bg-primary/20 rounded-xl" />
    </div>
    <div className="grid grid-cols-3 gap-4">
      <div className="h-12 bg-primary/20 rounded-xl" />
      <div className="h-12 bg-primary/20 rounded-xl" />
      <div className="h-12 bg-primary/20 rounded-xl" />
    </div>
  </div>
);

export const SkeletonChart = () => (
  <div className="bg-primary/10 rounded-2xl p-6 h-80 animate-pulse border border-border">
    <div className="w-48 h-6 bg-primary/20 rounded mb-6" />
    <div className="h-56 bg-primary/20 rounded-xl" />
  </div>
);

export const SkeletonStats = () => (
  <div className="grid md:grid-cols-3 gap-6">
    {[1, 2, 3].map(i => (
      <div key={i} className="bg-primary/10 rounded-2xl p-6 border border-border animate-pulse">
        <div className="w-12 h-12 bg-primary/20 rounded-lg mb-4" />
        <div className="h-8 bg-primary/20 rounded w-1/3 mb-2" />
        <div className="h-4 bg-primary/20 rounded w-1/2" />
      </div>
    ))}
  </div>
);

export const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 border-4 border-f1-red/20 rounded-full" />
      <div className="absolute inset-0 border-4 border-f1-red rounded-full border-t-transparent animate-spin" />
    </div>
    <div className="text-secondary font-orbitron text-sm animate-pulse">
      Loading F1 Data...
    </div>
  </div>
);
