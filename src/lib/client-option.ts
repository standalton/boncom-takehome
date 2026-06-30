/**
 * client-option.ts — the client shape the picker and editor consume.
 *
 * What:        `ClientOption` (the fields the UI needs) and `toClientOption`,
 *              which maps a full client row to it.
 * Where used:  Server pages (mapping rows) and client components (picker,
 *              editor). Lives in lib — NOT a "use client" module — so server
 *              components can call `toClientOption` directly.
 */
import type { Client } from "@/lib/types";

export type ClientOption = {
  id: string;
  company: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
};

export function toClientOption(c: Client): ClientOption {
  return {
    id: c.id,
    company: c.company,
    contactName: c.contact_name,
    email: c.email,
    phone: c.phone,
  };
}
