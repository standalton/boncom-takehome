-- 0004_add_quote_title.sql
--
-- What:  A short human title/description for a quote (e.g. "Website redesign"),
--        shown under the quote number in the editor. Optional free text.
-- Notes: Keep src/lib/types.ts (Quote) in sync.

alter table quotes add column title text;
