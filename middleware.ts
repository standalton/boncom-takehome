/**
 * middleware.ts — Next.js middleware entry point.
 *
 * What:        Runs Supabase session refresh on matched requests.
 * Where used:  Next.js invokes this automatically per the matcher below.
 * Notes:       Excludes static assets and the login route from the matcher.
 */
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
