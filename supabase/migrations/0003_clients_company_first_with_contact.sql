-- 0003_clients_company_first_with_contact.sql
--
-- What:       Reframe a client as a company (the billable entity) with contact
--             details attached. The former person "name" becomes an optional
--             "contact_name", a "phone" is added, and "company" becomes the
--             required primary identity.
-- Notes:      Backfills company from name before adding the NOT NULL constraint
--             so no existing row is rejected. Keep src/lib/types.ts in sync.

update clients set company = name where company is null or btrim(company) = '';

alter table clients rename column name to contact_name;
alter table clients alter column contact_name drop not null;
alter table clients alter column company set not null;
alter table clients add column phone text;
