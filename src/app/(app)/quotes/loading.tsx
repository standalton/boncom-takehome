/**
 * quotes/loading.tsx — instant placeholder for the quotes list.
 *
 * What:        Streams a list skeleton the moment the user navigates here, so
 *              the tab switch feels immediate while listQuotes runs server-side.
 * Where used:  Next.js renders this automatically as the /quotes suspense
 *              boundary.
 */
import { ListPageSkeleton } from "@/components/skeletons/ListPageSkeleton";

export default function Loading() {
  return <ListPageSkeleton />;
}
