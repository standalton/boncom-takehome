/**
 * (app)/loading.tsx — instant placeholder for the dashboard.
 *
 * What:        Streams a dashboard-shaped skeleton (metric cards, pipeline bar,
 *              recent-quotes list) the moment the landing route is entered, so
 *              it feels immediate while listQuotes runs server-side. Also serves
 *              as the fallback boundary for any (app) child route lacking its
 *              own loading file.
 * Where used:  Next.js renders this automatically as the "/" suspense boundary.
 * Notes:       Matches the dashboard's `space-y-6 px-8 py-6` layout and its
 *              2/4-column card grid so nothing shifts when data streams in.
 */
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 px-8 py-6" aria-hidden>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-8 w-32" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      <Skeleton className="h-14 w-full rounded-xl" />

      <div className="space-y-2">
        <Skeleton className="mb-3 h-5 w-32" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
