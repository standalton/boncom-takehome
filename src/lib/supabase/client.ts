/**
 * client.ts — browser-side Supabase client.
 *
 * What:        Creates a Supabase client for use in Client Components.
 * Where used:  Client components that need auth or realtime (e.g. the login
 *              form, the quote editor's realtime subscription).
 * Notes:       Only uses the public anon key; never the service-role key.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
