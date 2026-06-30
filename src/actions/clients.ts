/**
 * clients.ts — client (customer) server actions.
 *
 * What:        List and create clients. Validates input server-side and stamps
 *              the creating user.
 * Where used:  The clients page and the quote editor's client picker.
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/types";

const clientInput = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional().default(""),
  email: z
    .string()
    .optional()
    .default("")
    .refine((v) => !v || /.+@.+\..+/.test(v), "Enter a valid email"),
});

export async function listClients() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select("*").order("name");
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: data as Client[] };
}

export async function createClientRecord(input: unknown) {
  const parsed = clientInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0].message };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: parsed.data.name,
      company: parsed.data.company || null,
      email: parsed.data.email || null,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/clients");
  return { ok: true as const, data: data as Client };
}
