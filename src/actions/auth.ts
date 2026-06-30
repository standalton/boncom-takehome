/**
 * auth.ts — authentication server actions.
 *
 * What:        Sign in (email/password) and sign out, backed by Supabase Auth.
 * Where used:  The login page and the sidebar logout button.
 * Notes:       On success, signIn redirects to the dashboard (the redirect
 *              throws by design in Next, so callers only see the error case).
 */
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(email: string, password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false as const, error: error.message };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
