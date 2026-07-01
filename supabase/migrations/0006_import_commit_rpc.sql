-- 0006_import_commit_rpc.sql — transactional commit for spreadsheet import.
--
-- What:       import_commit(payload jsonb, p_user_id uuid) inserts new clients,
--             new products, and quotes-with-line-items in a SINGLE transaction
--             (a function body is atomic: any raised error rolls the whole thing
--             back, so a failure on the last quote un-does the clients created
--             for the first). Returns counts + the created quote ids.
-- Notes:      SECURITY INVOKER (default) so the caller's RLS still applies — the
--             shared-workspace policies already allow authenticated writes.
--             Totals are computed in TS (lib/pricing) and passed in, keeping
--             pricing authority in one place. New entities are referenced by a
--             client-supplied tempId that this function maps to real UUIDs.
--             created_by is stamped from p_user_id (passed by the server action).

create or replace function import_commit(payload jsonb, p_user_id uuid)
returns jsonb
language plpgsql
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
    insert into clients (company, contact_name, email, phone, created_by)
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
    insert into products (name, description, default_rate_cents, unit)
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

    insert into quotes (client_id, status, subtotal_cents, discount_cents, tax_cents, total_cents, created_by, updated_by)
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

      insert into line_items (quote_id, product_id, description, quantity, rate_cents, discount_type, discount_value, position)
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

    insert into activity_log (quote_id, user_id, action, detail)
    values (quote_id, p_user_id, 'created', jsonb_build_object('imported', true));
  end loop;

  return jsonb_build_object(
    'clientsCreated', clients_created,
    'productsCreated', products_created,
    'quoteIds', to_jsonb(quote_ids)
  );
end;
$$;
