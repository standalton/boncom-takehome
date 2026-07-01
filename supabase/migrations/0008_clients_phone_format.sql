-- 0008_clients_phone_format.sql
--
-- What:       Add the database backstop for the client phone format. A phone is
--             optional (nullable), but any stored value must be the canonical
--             US shape `(123) 456-7890`. This is the final layer beneath the UI
--             input mask and the server-side Zod check (see src/lib/field-helpers.ts
--             PHONE_PATTERN, src/actions/clients.ts).
-- Where used: Enforced by Postgres on every INSERT/UPDATE from the authenticated
--             role, including the import_commit RPC (0006) which bypasses the
--             server action's validation.
-- Notes:      Backfills existing 10-digit numbers to the canonical shape first
--             (the same coercion the CSV importer applies), then adds the
--             constraint NOT VALID so any un-normalizable legacy value can't fail
--             this migration — future writes are still fully checked. Keep the
--             pattern in sync with PHONE_PATTERN in src/lib/field-helpers.ts.

-- Best-effort normalization: any phone that is exactly 10 digits (ignoring
-- separators) becomes `(123) 456-7890`. Rows that already match, are null, or
-- have a non-10-digit value are left untouched.
update clients c
set phone = '(' || substr(d.digits, 1, 3) || ') '
              || substr(d.digits, 4, 3) || '-'
              || substr(d.digits, 7, 4)
from (
  select id, regexp_replace(phone, '\D', '', 'g') as digits
  from clients
  where phone is not null
) d
where c.id = d.id
  and length(d.digits) = 10
  and c.phone !~ '^\(\d{3}\) \d{3}-\d{4}$';

alter table clients
  add constraint clients_phone_format
  check (phone is null or phone ~ '^\(\d{3}\) \d{3}-\d{4}$')
  not valid;
