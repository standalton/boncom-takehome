/**
 * (app)/layout.tsx — authenticated shell.
 *
 * What:        Guards the authenticated section: redirects to /login when there
 *              is no session, otherwise renders the sidebar + page content.
 * Where used:  Wraps all routes in the (app) group (dashboard, clients, etc.).
 * Notes:       getClaims() validates the session server-side by verifying the
 *              JWT signature locally (no auth-server round-trip on the happy
 *              path). claims.sub is the user id; claims.email may be absent.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", claims.sub)
    .single();

  return (
    <AppShell userName={profile?.full_name ?? claims.email ?? "User"}>
      {children}
    </AppShell>
  );
}
