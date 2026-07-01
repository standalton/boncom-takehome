/**
 * ListPageSkeleton — shimmer placeholder for the list routes.
 *
 * What:        Mirrors the shared shape of the list pages (title + action,
 *              search/filter toolbar, a table of rows) so navigation shows an
 *              instant, layout-stable placeholder while the server data loads.
 * Where used:  quotes/loading.tsx, clients/loading.tsx, products/loading.tsx.
 * Notes:       Purely presentational; matches the pages' `px-8 py-6` padding so
 *              nothing shifts when the real content streams in.
 */
import { Skeleton } from "@/components/ui/skeleton";

export function ListPageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="px-8 py-6" aria-hidden>
      <div className="mb-6 flex items-center justify-between gap-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-8 w-28" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-full max-w-xs flex-1" />
        <Skeleton className="h-9 w-44" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
