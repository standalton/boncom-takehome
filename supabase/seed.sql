-- seed.sql — kwik-quote demo data.
--
-- What:    3 auth users (Sarah/Mike/Alex) + profiles, a realistic product
--          catalog, demo clients, and two sample quotes with line items and
--          activity. Lets the app be demoed immediately.
-- Notes:   Auth users are created directly in auth.users + auth.identities so
--          the seed is self-contained. Demo password for all three is
--          "Demo!2026". Re-running requires a clean database (fixed UUIDs).

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

-- Clients
insert into clients (id, name, company, email, created_by) values
('aaaaaaa1-0000-0000-0000-000000000001','Dana Whitfield','Northwind Foods','dana@northwindfoods.com','11111111-1111-1111-1111-111111111111'),
('aaaaaaa1-0000-0000-0000-000000000002','Priya Anand','Lumen Health','priya@lumenhealth.io','22222222-2222-2222-2222-222222222222'),
('aaaaaaa1-0000-0000-0000-000000000003','Marcus Bell','Trailhead Outdoors','marcus@trailhead.co','11111111-1111-1111-1111-111111111111');

-- Sample quotes (totals match src/lib/pricing.ts)
insert into quotes (id, client_id, status, tax_rate, discount_type, discount_value, notes, subtotal_cents, discount_cents, tax_cents, total_cents, created_by, updated_by) values
('bbbbbbb1-0000-0000-0000-000000000001','aaaaaaa1-0000-0000-0000-000000000001','draft',0,'none',0,'Initial scope for the Northwind rebrand.',600000,0,0,600000,'11111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111'),
('bbbbbbb1-0000-0000-0000-000000000002','aaaaaaa1-0000-0000-0000-000000000002','sent',8,'percent',5,'Q3 digital package for Lumen Health.',1620000,81000,123120,1662120,'22222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222');

insert into line_items (quote_id, description, quantity, rate_cents, discount_type, discount_value, position) values
('bbbbbbb1-0000-0000-0000-000000000001','Brand Strategy Workshop',1,400000,'none',0,0),
('bbbbbbb1-0000-0000-0000-000000000001','Logo Design',1,200000,'none',0,1),
('bbbbbbb1-0000-0000-0000-000000000002','Website Build',1,1200000,'percent',10,0),
('bbbbbbb1-0000-0000-0000-000000000002','SEO Retainer',3,180000,'none',0,1);

insert into activity_log (quote_id, user_id, action, detail) values
('bbbbbbb1-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','created','{}'),
('bbbbbbb1-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','created','{}'),
('bbbbbbb1-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','status_changed','{"status":"sent"}');
