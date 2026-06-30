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

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={profile?.full_name ?? user.email ?? "User"} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
