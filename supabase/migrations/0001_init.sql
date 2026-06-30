-- 0001_init.sql — kwik-quote initial schema.
--
-- What:       Tables, enums, CHECK constraints, RLS policies, and the quote
--             number sequence for the estimate app.
-- Notes:      Money is stored as integer cents. RLS is a shared workspace:
--             any authenticated user can read/write, except activity_log which
--             is append-only (insert + read, no update/delete). CHECK
--             constraints mirror the Zod rules in src/lib/validation.ts.
--             Unauthenticated requests are denied (no policy for anon).
--             created_by/updated_by attribution is stamped by the server
--             actions from the session, not enforced per-row in RLS — an
--             accepted tradeoff for a trusted internal team workspace.

-- Enums
create type quote_status as enum ('draft', 'sent', 'accepted', 'paid', 'declined');
create type discount_type as enum ('none', 'percent', 'fixed');

-- profiles (display names for auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

-- clients
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- products (catalog) — used in Phase 2, created now
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  default_rate_cents integer not null default 0 check (default_rate_cents >= 0),
  unit text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- quote number sequence
create sequence quote_number_seq start 1;

-- quotes
create table quotes (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('EST-' || lpad(nextval('quote_number_seq')::text, 4, '0')),
  client_id uuid not null references clients(id),
  status quote_status not null default 'draft',
  tax_rate numeric(5, 2) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  discount_type discount_type not null default 'none',
  discount_value numeric(12, 2) not null default 0 check (discount_value >= 0),
  notes text,
  valid_until date,
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- line_items
create table line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  product_id uuid references products(id),
  description text not null,
  quantity numeric(12, 3) not null check (quantity > 0),
  rate_cents integer not null check (rate_cents >= 0),
  discount_type discount_type not null default 'none',
  discount_value numeric(12, 2) not null default 0 check (discount_value >= 0),
  position integer not null default 0
);

-- activity_log (append-only)
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  user_id uuid references profiles(id),
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table clients enable row level security;
alter table products enable row level security;
alter table quotes enable row level security;
alter table line_items enable row level security;
alter table activity_log enable row level security;

create policy "auth read profiles" on profiles for select to authenticated using (true);

create policy "auth all clients" on clients for all to authenticated using (true) with check (true);
create policy "auth all products" on products for all to authenticated using (true) with check (true);
create policy "auth all quotes" on quotes for all to authenticated using (true) with check (true);
create policy "auth all line_items" on line_items for all to authenticated using (true) with check (true);

create policy "auth read activity" on activity_log for select to authenticated using (true);
create policy "auth insert activity" on activity_log for insert to authenticated with check (true);
-- no update/delete policies => activity_log is append-only
