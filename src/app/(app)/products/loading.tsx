/**
 * products/loading.tsx — instant placeholder for the products list.
 *
 * What:        Streams a list skeleton on navigation so the tab switch feels
 *              immediate while the products query runs server-side.
 * Where used:  Next.js renders this automatically as the /products suspense
 *              boundary.
 */
import { ListPageSkeleton } from "@/components/skeletons/ListPageSkeleton";

export default function Loading() {
  return <ListPageSkeleton />;
}
