/**
 * server.ts — server-side Supabase client (cookie-bound).
 *
 * What:        Creates a Supabase client for Server Components and Server
 *              Actions, wired to the request's cookies for auth.
 * Where used:  All server-side data reads and the quote/client server actions.
 * Notes:       Reads the session from cookies so RLS sees the logged-in user.
 *              The cookie setAll is wrapped in try/catch because it is a no-op
 *              when called from a Server Component (only Actions/Route Handlers
 *              may write cookies).
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // no-op in Server Components
          }
        },
      },
    },
  );
}
