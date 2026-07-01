/**
 * clients/loading.tsx — instant placeholder for the clients list.
 *
 * What:        Streams a list skeleton on navigation so the tab switch feels
 *              immediate while the clients query runs server-side.
 * Where used:  Next.js renders this automatically as the /clients suspense
 *              boundary.
 */
import { ListPageSkeleton } from "@/components/skeletons/ListPageSkeleton";

export default function Loading() {
  return <ListPageSkeleton />;
}
