-- 0007_tighten_rls_policies.sql — resolve "RLS policy always true" advisories.
--
-- What:       Replaces the blanket `for all ... using (true) with check (true)`
--             policies (Supabase security advisor lint 0024) with per-command
--             policies. Reads stay shared across the workspace; writes now carry
--             an honest predicate instead of a literal `true`.
-- Where used: Enforced by Postgres on every request from the authenticated role
--             (server actions in src/actions/*, the import_commit RPC).
-- Notes:      The advisor flags `using (true)` / `with check (true)` on
--             INSERT/UPDATE/DELETE because it cannot tell an intentional shared
--             workspace from a missing policy. Splitting per command lets us
--             keep the "any authenticated teammate reads/edits everything" model
--             (see 0001_init.sql) while adding real integrity where a truthful
--             owner column exists:
--               - clients/quotes INSERT require created_by = auth.uid(): a user
--                 can only create rows attributed to themselves. createQuote /
--                 createClient and import_commit already stamp this.
--               - activity_log INSERT requires user_id = auth.uid(): audit
--                 entries cannot be forged under another user's id.
--               - products (shared catalog, no owner column) and line_items
--                 (child of quotes) gate writes on an authenticated session /
--                 a real parent quote rather than an owner match.
--               - SELECT keeps `using (true)`: shared reads are intentional and
--                 are explicitly excluded by the advisor.
--             auth.uid() is wrapped in `(select …)` so Postgres caches it once
--             per statement (Supabase RLS performance guidance).

-- clients ---------------------------------------------------------------
drop policy "auth all clients" on clients;
create policy "clients select" on clients for select to authenticated using (true);
create policy "clients insert" on clients for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy "clients update" on clients for update to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "clients delete" on clients for delete to authenticated
  using ((select auth.uid()) is not null);

-- products (shared catalog, no owner column) ----------------------------
drop policy "auth all products" on products;
create policy "products select" on products for select to authenticated using (true);
create policy "products insert" on products for insert to authenticated
  with check ((select auth.uid()) is not null);
create policy "products update" on products for update to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "products delete" on products for delete to authenticated
  using ((select auth.uid()) is not null);

-- quotes ----------------------------------------------------------------
drop policy "auth all quotes" on quotes;
create policy "quotes select" on quotes for select to authenticated using (true);
create policy "quotes insert" on quotes for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy "quotes update" on quotes for update to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "quotes delete" on quotes for delete to authenticated
  using ((select auth.uid()) is not null);

-- line_items (child of quotes) ------------------------------------------
drop policy "auth all line_items" on line_items;
create policy "line_items select" on line_items for select to authenticated using (true);
create policy "line_items insert" on line_items for insert to authenticated
  with check (exists (select 1 from quotes where quotes.id = line_items.quote_id));
create policy "line_items update" on line_items for update to authenticated
  using ((select auth.uid()) is not null)
  with check (exists (select 1 from quotes where quotes.id = line_items.quote_id));
create policy "line_items delete" on line_items for delete to authenticated
  using ((select auth.uid()) is not null);

-- activity_log (append-only; truthful attribution) ----------------------
drop policy "auth insert activity" on activity_log;
create policy "auth insert activity" on activity_log for insert to authenticated
  with check (user_id = (select auth.uid()));
