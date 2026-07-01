# Sample import files

Three CSVs for trying the **Import** feature (sidebar → Import). Each is shaped
to show off a different part of the flow.

| File | Import as | What it demonstrates |
| ---- | --------- | -------------------- |
| `clients-sample.csv` | Clients | Straightforward bulk client load (company, contact, email, phone). |
| `products-sample.csv` | Products | Catalog seeding, including a `"$200"` rate to show currency parsing and valid billing units. |
| `quotes-sample.csv` | Quotes | The hero flow — line items grouped into 4 draft quotes across 3 new clients, a `"$1,200"` currency cell, a **repeated "Logo design"** across clients (triggers the *make-a-product* suggestion), and one **quantity-0 row that is flagged and skipped**. |

Tips:
- You can also grab a blank starter from the **Download template** link on the
  upload step.
- Re-importing `clients-sample.csv` after `quotes-sample.csv` will show rows
  **linking** to the clients the quote import already created (exact-match, no
  duplicates).
