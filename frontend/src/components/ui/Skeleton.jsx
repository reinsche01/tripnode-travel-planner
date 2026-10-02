/**
 * Reusable skeleton loading placeholder.
 * Usage: <Skeleton className="h-5 w-32" />
 */
export function Skeleton({ className = '' }) {
  return (
    <div className={`skeleton ${className}`} aria-hidden="true" />
  );
}

/**
 * Full card skeleton for trip items.
 */
export function ItineraryItemSkeleton() {
  return (
    <div className="card p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

/**
 * Page-level loading spinner.
 */
export function PageLoader({ text = 'Loading…' }) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-ink-muted">{text}</p>
      </div>
    </div>
  );
}
