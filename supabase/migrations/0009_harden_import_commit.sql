-- 0009_harden_import_commit.sql — resolve the two open security advisories on
-- the import_commit RPC.
--
-- What:       (1) Pins the function's search_path to empty and schema-qualifies
--             every table it touches, clearing advisor lint 0011
--             (function_search_path_mutable). (2) Revokes EXECUTE from the
--             `public` and `anon` roles so only a logged-in session can call it.
-- Where used: import_commit is invoked by commitImport in src/actions/import.ts,
--             which runs through the SSR server client (anon key + session
--             cookies) i.e. as the `authenticated` role. That grant is kept.
-- Notes:      The function stays SECURITY INVOKER (see 0006), so it already runs
--             under the caller's RLS — these changes are defense-in-depth, not a
--             fix for an exploitable hole. With `search_path = ''` unqualified
--             names no longer resolve, so each relation is written `public.<t>`;
--             built-in functions/types still resolve via the implicit pg_catalog.
--             `authenticated` must retain EXECUTE or the import feature breaks;
--             `public`/`anon` never could call it usefully (RLS denies their
--             writes) so revoking them removes dead surface area.
--             Body is unchanged from 0006 apart from the schema qualifications.

create or replace function import_commit(payload jsonb, p_user_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  client_map jsonb := '{}'::jsonb;   -- tempId -> uuid
  product_map jsonb := '{}'::jsonb;  -- tempId -> uuid
  item jsonb;
  line jsonb;
  new_id uuid;
  resolved_client uuid;
  resolved_product uuid;
  quote_id uuid;
  quote_ids uuid[] := '{}';
  clients_created int := 0;
  products_created int := 0;
begin
  -- 1. New clients
  for item in select * from jsonb_array_elements(coalesce(payload->'newClients', '[]'::jsonb)) loop
    insert into public.clients (company, contact_name, email, phone, created_by)
    values (
      item->>'company',
      nullif(item->>'contactName', ''),
      nullif(item->>'email', ''),
      nullif(item->>'phone', ''),
      p_user_id
    )
    returning id into new_id;
    client_map := jsonb_set(client_map, array[item->>'tempId'], to_jsonb(new_id));
    clients_created := clients_created + 1;
  end loop;

  -- 2. New products
  for item in select * from jsonb_array_elements(coalesce(payload->'newProducts', '[]'::jsonb)) loop
    insert into public.products (name, description, default_rate_cents, unit)
    values (
      item->>'name',
      nullif(item->>'description', ''),
      (item->>'defaultRateCents')::int,
      nullif(item->>'unit', '')
    )
    returning id into new_id;
    product_map := jsonb_set(product_map, array[item->>'tempId'], to_jsonb(new_id));
    products_created := products_created + 1;
  end loop;

  -- 3. Quotes + line items
  for item in select * from jsonb_array_elements(coalesce(payload->'quotes', '[]'::jsonb)) loop
    -- Resolve the client: existing id, or a newly-created one via the temp map.
    if item->>'clientId' is not null then
      resolved_client := (item->>'clientId')::uuid;
    else
      resolved_client := (client_map->>(item->>'clientTempId'))::uuid;
    end if;
    if resolved_client is null then
      raise exception 'Import: could not resolve client for a quote';
    end if;

    insert into public.quotes (client_id, status, subtotal_cents, discount_cents, tax_cents, total_cents, created_by, updated_by)
    values (
      resolved_client,
      'draft',
      (item->>'subtotalCents')::int,
      (item->>'discountCents')::int,
      (item->>'taxCents')::int,
      (item->>'totalCents')::int,
      p_user_id,
      p_user_id
    )
    returning id into quote_id;
    quote_ids := array_append(quote_ids, quote_id);

    for line in select * from jsonb_array_elements(coalesce(item->'lineItems', '[]'::jsonb)) loop
      if line->>'productId' is not null then
        resolved_product := (line->>'productId')::uuid;
      elsif line->>'productTempId' is not null then
        resolved_product := (product_map->>(line->>'productTempId'))::uuid;
      else
        resolved_product := null;
      end if;

      insert into public.line_items (quote_id, product_id, description, quantity, rate_cents, discount_type, discount_value, position)
      values (
        quote_id,
        resolved_product,
        line->>'description',
        (line->>'quantity')::numeric,
        (line->>'rateCents')::int,
        'none',
        0,
        (line->>'position')::int
      );
    end loop;

    insert into public.activity_log (quote_id, user_id, action, detail)
    values (quote_id, p_user_id, 'created', jsonb_build_object('imported', true));
  end loop;

  return jsonb_build_object(
    'clientsCreated', clients_created,
    'productsCreated', products_created,
    'quoteIds', to_jsonb(quote_ids)
  );
end;
$$;

-- Restrict who can call it: only a logged-in session (authenticated). The
-- public/anon grants are dead surface — RLS already denies their writes.
revoke execute on function public.import_commit(jsonb, uuid) from public;
revoke execute on function public.import_commit(jsonb, uuid) from anon;
grant execute on function public.import_commit(jsonb, uuid) to authenticated;
