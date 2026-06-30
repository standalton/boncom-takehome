/**
 * middleware.ts (supabase) — session refresh helper.
 *
 * What:        Refreshes the Supabase auth session on every request and keeps
 *              the auth cookies current.
 * Where used:  Called by the root middleware.ts.
 * Notes:       Must run on every request so server-rendered pages see a valid
 *              session. Do not add logic between createServerClient and
 *              getUser().
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  await supabase.auth.getUser();
  return response;
}
