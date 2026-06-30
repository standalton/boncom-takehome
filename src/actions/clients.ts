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
  company: z.string().min(1, "Company is required"),
  contactName: z.string().optional().default(""),
  email: z
    .string()
    .optional()
    .default("")
    .refine((v) => !v || /.+@.+\..+/.test(v), "Enter a valid email"),
  phone: z.string().optional().default(""),
});

export async function listClients() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select("*").order("company");
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
      company: parsed.data.company,
      contact_name: parsed.data.contactName || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/clients");
  return { ok: true as const, data: data as Client };
}
