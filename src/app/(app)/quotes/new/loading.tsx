/**
 * quotes/new/loading.tsx — instant placeholder for the new-quote editor.
 *
 * What:        Streams an editor skeleton on navigation so "New quote" feels
 *              immediate while the clients and products lists load server-side.
 * Where used:  Next.js renders this automatically as the /quotes/new suspense
 *              boundary.
 */
import { EditorSkeleton } from "@/components/skeletons/EditorSkeleton";

export default function Loading() {
  return <EditorSkeleton />;
}
