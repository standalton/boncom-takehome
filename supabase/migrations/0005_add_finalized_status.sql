-- 0005_add_finalized_status.sql
--
-- What:  Add a "finalized" stage to the quote lifecycle. A quote is finalized
--        (locked-in and exportable) before it is sent:
--        draft -> finalized -> sent -> accepted / paid / declined.
-- Notes: Keep QuoteStatus (src/lib/types.ts) and the status colour maps in sync.

alter type quote_status add value if not exists 'finalized' after 'draft';
