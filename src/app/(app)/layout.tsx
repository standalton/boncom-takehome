/**
 * (app)/layout.tsx — authenticated shell.
 *
 * What:        Guards the authenticated section: redirects to /login when there
 *              is no session, otherwise renders the sidebar + page content.
 * Where used:  Wraps all routes in the (app) group (dashboard, clients, etc.).
 * Notes:       getUser() validates the session server-side on every request.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app-shell/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // Fixed-height shell: the sidebar stays put (its footer pinned to the viewport)
  // and only the main column scrolls.
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userName={profile?.full_name ?? user.email ?? "User"} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
