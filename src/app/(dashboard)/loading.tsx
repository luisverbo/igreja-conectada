// Instant skeleton while server components fetch — the page changes
// immediately on navigation instead of appearing frozen.
export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="space-y-2">
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="h-3 w-56 rounded bg-slate-100" />
        </div>
        <div className="h-8 w-8 rounded-full bg-slate-200" />
      </div>

      <div className="p-6 space-y-6">
        {/* KPI skeletons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="h-9 w-9 rounded-xl bg-slate-100" />
              <div className="h-6 w-16 rounded bg-slate-200" />
              <div className="h-3 w-24 rounded bg-slate-100" />
            </div>
          ))}
        </div>

        {/* Content skeletons */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="h-4 w-48 rounded bg-slate-200" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-slate-50" />
          ))}
        </div>
      </div>
    </div>
  )
}
