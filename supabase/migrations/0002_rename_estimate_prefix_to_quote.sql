-- 0002_rename_estimate_prefix_to_quote.sql
--
-- What:       Switch quote numbers from the "EST-" (estimate) prefix to "QUO-"
--             (quote) so the human-facing identifier matches the product's
--             terminology. The app standardizes on "quote" everywhere.
-- Notes:      Updates the column default for future inserts and migrates the
--             existing rows in place. The unique constraint on quotes.number is
--             preserved (each row keeps its distinct sequence suffix).

alter table quotes
  alter column number set default ('QUO-' || lpad(nextval('quote_number_seq')::text, 4, '0'));

update quotes
  set number = 'QUO-' || substring(number from 5)
  where number like 'EST-%';
