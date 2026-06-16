export default function AdminLoading() {
  return (
    <div className="space-y-6 p-2">
      {/* Title skeleton */}
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-border bg-muted/50"
          />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded bg-muted/50"
          />
        ))}
      </div>
    </div>
  );
}
