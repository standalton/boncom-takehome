/**
 * types.ts — shared database row types.
 *
 * What:        TypeScript shapes for the app's tables, mirroring the schema in
 *              supabase/migrations/0001_init.sql.
 * Where used:  Server actions and components that read/write these rows.
 * Notes:       Money fields are integer cents. Keep in sync with the migration.
 */
export type DiscountType = "none" | "percent" | "fixed";
export type QuoteStatus = "draft" | "sent" | "accepted" | "paid" | "declined";

export interface Client {
  id: string;
  company: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  default_rate_cents: number;
  unit: string | null;
  active: boolean;
}

export interface LineItem {
  id: string;
  quote_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  rate_cents: number;
  discount_type: DiscountType;
  discount_value: number;
  position: number;
}

export interface Quote {
  id: string;
  number: string;
  client_id: string;
  status: QuoteStatus;
  tax_rate: number;
  discount_type: DiscountType;
  discount_value: number;
  notes: string | null;
  valid_until: string | null;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}
