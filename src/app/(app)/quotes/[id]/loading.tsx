/**
 * quotes/[id]/loading.tsx — instant placeholder for the quote editor.
 *
 * What:        Streams an editor skeleton on navigation so opening a quote feels
 *              immediate while the quote, clients, products, and activity load
 *              server-side (the app's heaviest fetch).
 * Where used:  Next.js renders this automatically as the /quotes/[id] suspense
 *              boundary.
 */
import { EditorSkeleton } from "@/components/skeletons/EditorSkeleton";

export default function Loading() {
  return <EditorSkeleton />;
}
