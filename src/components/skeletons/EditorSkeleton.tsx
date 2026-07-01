/**
 * EditorSkeleton — shimmer placeholder for the quote editor routes.
 *
 * What:        Mirrors the editor's shape (header, a details card, a line-item
 *              table, and a totals block) so opening or creating a quote shows
 *              an instant, layout-stable placeholder while the server loads the
 *              quote, clients, and products.
 * Where used:  quotes/[id]/loading.tsx, quotes/new/loading.tsx.
 * Notes:       Purely presentational; matches the editor's `px-8 py-6` padding.
 */
import { Skeleton } from "@/components/ui/skeleton";

export function EditorSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-6 px-8 py-6" aria-hidden>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-8 w-32" />
      </div>

      <div className="space-y-4 rounded-lg border p-6">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-10 w-full max-w-md" />
      </div>

      <div className="space-y-2 rounded-lg border p-6">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>

      <div className="ml-auto w-full max-w-xs space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-7 w-full" />
      </div>
    </div>
  );
}
