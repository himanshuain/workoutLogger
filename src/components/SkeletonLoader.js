export function SkeletonCard({ isDarkMode = false }) {
  const c = isDarkMode;
  return (
    <div className={`animate-pulse rounded-2xl p-4 ${c ? "bg-iron-800" : "bg-slate-100"}`}>
      <div className={`h-4 w-1/3 rounded-lg mb-3 ${c ? "bg-iron-700" : "bg-slate-300"}`} />
      <div className={`h-3 w-full rounded-lg mb-2 ${c ? "bg-iron-800" : "bg-slate-200"}`} />
      <div className={`h-3 w-full rounded-lg mb-2 ${c ? "bg-iron-800" : "bg-slate-200"}`} />
      <div className={`h-3 w-2/3 rounded-lg ${c ? "bg-iron-800" : "bg-slate-200"}`} />
    </div>
  );
}

export function SkeletonList({ isDarkMode = false }) {
  const c = isDarkMode;
  return (
    <div className={`animate-pulse rounded-2xl p-4 ${c ? "bg-iron-800" : "bg-slate-100"}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`flex items-center gap-3 py-3 border-b last:border-0 ${c ? "border-iron-700/50" : "border-slate-200"}`}>
          <div className={`h-10 w-10 rounded-xl flex-shrink-0 ${c ? "bg-iron-700" : "bg-slate-200"}`} />
          <div className="flex-1">
            <div className={`h-3.5 w-2/3 rounded-lg mb-1.5 ${c ? "bg-iron-700" : "bg-slate-200"}`} />
            <div className={`h-3 w-1/2 rounded-lg ${c ? "bg-iron-800" : "bg-slate-100"}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ isDarkMode = false }) {
  const c = isDarkMode;
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`flex-shrink-0 animate-pulse rounded-xl p-4 min-w-[100px] ${c ? "bg-iron-800" : "bg-slate-100"}`}>
          <div className={`h-3 w-1/2 rounded-lg mb-3 ${c ? "bg-iron-700" : "bg-slate-200"}`} />
          <div className={`h-8 w-3/4 rounded-lg ${c ? "bg-iron-700" : "bg-slate-200"}`} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonHeatmap({ isDarkMode = false }) {
  const c = isDarkMode;
  return (
    <div className={`animate-pulse rounded-2xl p-4 ${c ? "bg-iron-800" : "bg-slate-100"}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`h-10 w-10 rounded-xl ${c ? "bg-iron-700" : "bg-slate-200"}`} />
        <div className={`h-4 w-1/3 rounded-lg ${c ? "bg-iron-700" : "bg-slate-200"}`} />
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 42 }).map((_, i) => (
          <div key={i} className={`aspect-square rounded-md ${c ? "bg-iron-700" : "bg-slate-200"}`} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonPage({ isDarkMode = false }) {
  const c = isDarkMode;
  return (
    <div className="space-y-4 px-4 pt-4">
      <div className={`animate-pulse h-8 w-1/2 rounded-xl mb-2 ${c ? "bg-iron-800" : "bg-slate-200"}`} />
      <div className={`animate-pulse h-4 w-1/4 rounded-lg mb-6 ${c ? "bg-iron-700" : "bg-slate-200"}`} />
      <SkeletonStats isDarkMode={isDarkMode} />
      <div className="space-y-3 pt-2">
        <SkeletonCard isDarkMode={isDarkMode} />
        <SkeletonCard isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}
