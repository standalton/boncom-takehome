-- seed.sql — kwik-quote demo data.
--
-- What:    3 auth users (Sarah/Mike/Alex) + profiles, a realistic product
--          catalog, demo clients, and two sample quotes with line items and
--          activity, PLUS a bulk block that generates ~60 more clients and ~75
--          more quotes (with line items + activity) so the list/dashboard views
--          have several pages to browse. Lets the app be demoed immediately.
-- Notes:   Auth users are created directly in auth.users + auth.identities so
--          the seed is self-contained. Demo password for all three is
--          "Demo!2026". The named-UUID inserts require a clean database; the
--          bulk block at the bottom is deterministic (no random()) so a reset
--          reproduces the same data, and additive so it can be run on its own
--          against an already-seeded database.

create extension if not exists pgcrypto with schema extensions;

-- Auth users
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111111','authenticated','authenticated','sarah@kwikquote.app', extensions.crypt('Demo!2026', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"Sarah Chen"}','','','',''),
('00000000-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222222222','authenticated','authenticated','mike@kwikquote.app', extensions.crypt('Demo!2026', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"Mike Rivera"}','','','',''),
('00000000-0000-0000-0000-000000000000','33333333-3333-3333-3333-333333333333','authenticated','authenticated','alex@kwikquote.app', extensions.crypt('Demo!2026', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"Alex Doyle"}','','','','');

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values
('11111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111', json_build_object('sub','11111111-1111-1111-1111-111111111111','email','sarah@kwikquote.app'),'email', now(), now(), now()),
('22222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222', json_build_object('sub','22222222-2222-2222-2222-222222222222','email','mike@kwikquote.app'),'email', now(), now(), now()),
('33333333-3333-3333-3333-333333333333','33333333-3333-3333-3333-333333333333', json_build_object('sub','33333333-3333-3333-3333-333333333333','email','alex@kwikquote.app'),'email', now(), now(), now());

insert into profiles (id, full_name) values
('11111111-1111-1111-1111-111111111111','Sarah Chen'),
('22222222-2222-2222-2222-222222222222','Mike Rivera'),
('33333333-3333-3333-3333-333333333333','Alex Doyle');

-- Product catalog
insert into products (name, description, default_rate_cents, unit) values
('Brand Strategy Workshop','Full-day facilitated brand positioning workshop', 400000, 'project'),
('Logo Design','Primary logo plus variations and a usage guide', 200000, 'project'),
('Social Media Package','Monthly content calendar and community management', 150000, 'month'),
('Website Build','Design and build of a marketing website', 1200000, 'project'),
('SEO Retainer','Ongoing search optimization and monthly reporting', 180000, 'month'),
('Brand Guidelines','Comprehensive brand standards document', 350000, 'project');

-- Clients (a client is a company; the contact person is attached)
insert into clients (id, company, contact_name, email, phone, created_by) values
('aaaaaaa1-0000-0000-0000-000000000001','Northwind Foods','Dana Whitfield','dana@northwindfoods.com','(415) 555-0142','11111111-1111-1111-1111-111111111111'),
('aaaaaaa1-0000-0000-0000-000000000002','Lumen Health','Priya Anand','priya@lumenhealth.io','(312) 555-0188','22222222-2222-2222-2222-222222222222'),
('aaaaaaa1-0000-0000-0000-000000000003','Trailhead Outdoors','Marcus Bell','marcus@trailhead.co','(503) 555-0119','11111111-1111-1111-1111-111111111111');

-- Sample quotes (totals match src/lib/pricing.ts)
insert into quotes (id, client_id, title, status, tax_rate, discount_type, discount_value, notes, subtotal_cents, discount_cents, tax_cents, total_cents, created_by, updated_by) values
('bbbbbbb1-0000-0000-0000-000000000001','aaaaaaa1-0000-0000-0000-000000000001','Brand identity refresh','draft',0,'none',0,'Initial scope for the Northwind rebrand.',600000,0,0,600000,'11111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111'),
('bbbbbbb1-0000-0000-0000-000000000002','aaaaaaa1-0000-0000-0000-000000000002','Q3 digital marketing package','sent',8,'percent',5,'Q3 digital package for Lumen Health.',1620000,81000,123120,1662120,'22222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222');

insert into line_items (quote_id, description, quantity, rate_cents, discount_type, discount_value, position) values
('bbbbbbb1-0000-0000-0000-000000000001','Brand Strategy Workshop',1,400000,'none',0,0),
('bbbbbbb1-0000-0000-0000-000000000001','Logo Design',1,200000,'none',0,1),
('bbbbbbb1-0000-0000-0000-000000000002','Website Build',1,1200000,'percent',10,0),
('bbbbbbb1-0000-0000-0000-000000000002','SEO Retainer',3,180000,'none',0,1);

insert into activity_log (quote_id, user_id, action, detail) values
('bbbbbbb1-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','created','{}'),
('bbbbbbb1-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','created','{}'),
('bbbbbbb1-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','status_changed','{"status":"sent"}');

-- ── Bulk demo data ──────────────────────────────────────────────────────────
-- Adds ~60 more clients and ~75 quotes (with line items + activity) so the list
-- and dashboard views have several pages to browse. Deterministic (no random())
-- so a reset reproduces the same rows; additive so it can also be run on its own
-- against an already-seeded database. Totals mirror src/lib/pricing.ts exactly:
-- per-line discount, then order discount, then tax on the discounted subtotal,
-- half-up rounding, clamped at zero. seed_apply_discount is a temporary helper
-- that mirrors pricing.ts's applyDiscount; it is dropped at the end.

create or replace function seed_apply_discount(base bigint, dtype discount_type, val numeric)
returns bigint language sql immutable as $fn$
  select case
    when dtype = 'percent' then round(base * least(greatest(val,0),100) / 100.0)::bigint
    when dtype = 'fixed'   then least(greatest(round(val),0), base)::bigint
    else 0::bigint
  end;
$fn$;

do $seed$
declare
  users uuid[] := array[
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  ];
  -- 60 hand-curated, distinct company names (no shared leading word) so the
  -- client list reads like a real book of business, not a generated grid.
  companies text[] := array[
    'Alder & Oak','Brightline Coffee','Cobalt Robotics','Driftwood Interiors','Ember Kitchen',
    'Fathom Analytics','Granite Peak Gear','Halcyon Spa','Ironwood Furniture','Juniper Botanicals',
    'Kestrel Aviation','Lantern Books','Maple Street Dental','Nimbus Cloudworks','Orchard Lane Bakery',
    'Pinnacle Roofing','Quill & Press','Riverstone Wealth','Saffron Bistro','Tidewater Marine',
    'Umbra Lighting','Verdant Landscaping','Wolfpack Fitness','Yonder Travel','Zephyr Apparel',
    'Anchor Brewing','Basalt Architecture','Cinder & Sage','Dovetail Woodworks','Everest Outfitters',
    'Foxglove Florals','Gearbox Motors','Harvest Table','Indigo Textiles','Jetstream Logistics',
    'Kindred Pediatrics','Lumberjack Supply','Meadowlark Farms','Nautilus Diving','Onyx Jewelers',
    'Provision Grocery','Quicksilver Courier','Redwood Legal','Solstice Yoga','Timber & Twine',
    'Union Square Optics','Vantage Insurance','Willowbrook Vineyards','Axiom Software','Beacon Hill Realty',
    'Crescent Bakehouse','Delta Freight','Elmwood Veterinary','Firefly Electric','Golden Gate Fitness',
    'Hearth & Home','Iris Photography','Jubilee Events','Keystone Masonry','Lakeside Dental'
  ];
  firsts text[] := array['Dana','Priya','Marcus','Elena','Tom','Aisha','Ravi','Grace','Owen','Lena','Hugo','Nadia','Sam','Beatriz','Kofi','Mila'];
  lasts text[] := array['Whitfield','Anand','Bell','Ortiz','Nguyen','Khan','Patel','Kim','Fisher','Romano','Silva','Okafor','Berg','Costa','Mensah','Dubois'];
  titles text[] := array['Brand identity refresh','Website redesign','Q3 marketing retainer','Product launch campaign','Annual SEO program','Social content package','Rebrand rollout','Landing page build','Email design system','Trade show collateral','Packaging refresh','Video ad series'];
  notes_pool text[] := array['Initial scope for discussion.','Revised after kickoff call.','Pending client budget approval.','Includes two rounds of revisions.','Scoped for a Q3 start.','Follow-up to last year''s engagement.', null, null];
  statuses text[] := array['draft','draft','draft','sent','sent','sent','accepted','accepted','paid','paid','paid','paid','declined','sent','draft','accepted','sent','paid','draft','declined'];
  client_ids uuid[];
  prod_ids uuid[]; prod_rates int[]; prod_names text[]; prod_units text[];
  i int; q int; li int; pidx int;
  cid uuid; qid uuid; uid uuid; st quote_status;
  n_lines int; gross bigint; net bigint; subtotal bigint;
  odtype discount_type; oval numeric; disc bigint;
  taxrate numeric; taxable bigint; tax bigint; total bigint;
  ldtype discount_type; lval numeric; qty numeric; rate int; ldesc text;
  created timestamptz; company_name text; domain text;
begin
  -- 60 additional clients (deterministic, unique company names)
  for i in 0..59 loop
    company_name := companies[i + 1];
    domain := regexp_replace(lower(company_name), '[^a-z0-9]', '', 'g') || '.com';
    insert into clients (company, contact_name, email, phone, created_by, created_at)
    values (
      company_name,
      firsts[(i % 16) + 1] || ' ' || lasts[((i * 3) % 16) + 1],
      lower(firsts[(i % 16) + 1]) || '@' || domain,
      '(' || lpad((200 + (i * 13) % 700)::text, 3, '0') || ') 555-' || lpad(((i * 137) % 10000)::text, 4, '0'),
      users[(i % 3) + 1],
      now() - ((90 - i) || ' days')::interval
    );
  end loop;

  select array_agg(id order by created_at) into client_ids from clients;
  select array_agg(id order by name), array_agg(default_rate_cents order by name),
         array_agg(name order by name), array_agg(coalesce(unit,'') order by name)
    into prod_ids, prod_rates, prod_names, prod_units
    from products where active;

  -- ~75 quotes with line items + activity
  for q in 0..74 loop
    cid := client_ids[(q % array_length(client_ids,1)) + 1];
    uid := users[(q % 3) + 1];
    created := now() - ((110 - q) || ' days')::interval;
    st := statuses[(q % 20) + 1]::quote_status;

    if q % 5 = 0 then odtype := 'percent'; oval := 5 + (q % 3) * 2.5;
    else odtype := 'none'; oval := 0; end if;
    if q % 3 = 0 then taxrate := 0; else taxrate := 7 + (q % 3); end if;

    insert into quotes (client_id, title, status, tax_rate, discount_type, discount_value, notes,
                        subtotal_cents, discount_cents, tax_cents, total_cents,
                        created_by, updated_by, created_at, updated_at)
    values (cid, titles[(q % array_length(titles,1)) + 1], st, taxrate, odtype, oval,
            notes_pool[(q % array_length(notes_pool,1)) + 1],
            0,0,0,0, uid, uid, created, created + interval '2 hours')
    returning id into qid;

    n_lines := (q % 4) + 1;
    subtotal := 0;
    for li in 0..(n_lines - 1) loop
      pidx := ((q + li) % array_length(prod_ids,1)) + 1;
      if (q + li) % 6 = 5 then ldtype := 'percent'; lval := 10; else ldtype := 'none'; lval := 0; end if;
      if (q + li) % 4 = 3 then
        -- ~1 line in 4 is a custom (non-catalog) item
        ldesc := 'Custom consulting'; rate := 90000 + ((q+li) % 5) * 15000; qty := 1 + ((q+li) % 3);
        gross := (greatest(round(qty * rate), 0))::bigint;
        net := greatest(gross - seed_apply_discount(gross, ldtype, lval), 0);
        subtotal := subtotal + net;
        insert into line_items (quote_id, description, quantity, rate_cents, discount_type, discount_value, position)
        values (qid, ldesc, qty, rate, ldtype, lval, li);
      else
        rate := prod_rates[pidx]; ldesc := prod_names[pidx];
        if prod_units[pidx] = 'month' then qty := 3 + (q % 4); else qty := 1; end if;
        gross := (greatest(round(qty * rate), 0))::bigint;
        net := greatest(gross - seed_apply_discount(gross, ldtype, lval), 0);
        subtotal := subtotal + net;
        insert into line_items (quote_id, product_id, description, quantity, rate_cents, discount_type, discount_value, position)
        values (qid, prod_ids[pidx], ldesc, qty, rate, ldtype, lval, li);
      end if;
    end loop;

    disc := seed_apply_discount(subtotal, odtype, oval);
    taxable := greatest(subtotal - disc, 0);
    tax := round(taxable * greatest(taxrate,0) / 100.0)::bigint;
    total := greatest(taxable + tax, 0);
    update quotes set subtotal_cents = subtotal, discount_cents = disc, tax_cents = tax, total_cents = total
      where id = qid;

    insert into activity_log (quote_id, user_id, action, detail, created_at)
      values (qid, uid, 'created', '{}'::jsonb, created);
    if st <> 'draft' then
      insert into activity_log (quote_id, user_id, action, detail, created_at)
        values (qid, uid, 'status_changed', json_build_object('status', st::text)::jsonb, created + interval '1 day');
    end if;
  end loop;
end $seed$;

drop function seed_apply_discount(bigint, discount_type, numeric);
