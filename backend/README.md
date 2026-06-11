# Stozia — Supplier Quote Comparison (Backend)

FastAPI + SQLAlchemy + Supabase (Postgres) backend for a procurement tool where
a user creates an **RFQ** (an item to buy at a given quantity), attaches
**supplier quotes**, and compares them. The API computes
`Total Price = Unit Price × RFQ Quantity` for every quote and flags the cheapest.

## Tech stack

| Layer      | Choice                                   |
|------------|------------------------------------------|
| API        | FastAPI                                  |
| ORM        | SQLAlchemy 2.0 (sync) + psycopg2         |
| Validation | Pydantic v2                              |
| Database   | Supabase (hosted Postgres)               |

Supabase is used purely as hosted Postgres — FastAPI owns all logic, so its
auto-REST/auth layers are not used (the assignment says to skip auth).

## Data model

```
rfqs                              supplier_quotes
----                              ---------------
id (PK)                           id (PK)
item_name                         rfq_id (FK -> rfqs.id, cascade)
manufacturer_part_number (unique) supplier_name
description                       unit_price        (Numeric 14,4)
quantity                          currency          (3-letter)
delivery_days (nullable)          lead_time_days
notes (nullable)                  payment_terms     ("Net 30")
created_at                        remarks (nullable)
                                  created_at
```

One RFQ has many quotes. Quantity lives on the **RFQ** (not the quote) so all
quotes for an item are compared at the same volume — otherwise "lowest total"
is meaningless when suppliers quote different quantities.

## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1          # Windows PowerShell
pip install -r requirements.txt
copy .env.example .env                # then paste your Supabase URL
```

### Database URL (important)

Use the Supabase **Session Pooler** connection string (IPv4-compatible). The
direct host `db.<ref>.supabase.co` is **IPv6-only** and will fail with
`could not translate host name` on an IPv4 network. Get the pooler string from
*Supabase Dashboard → Project Settings → Database → Connection string → Session
pooler*. It looks like:

```
DATABASE_URL=postgresql+psycopg2://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres
```

(`.env` is already filled in for this project.)

## Seed the database

```powershell
python make_seed.py     # regenerate seed_quotes.csv from ../seed.csv (optional)
python seed.py --reset  # create tables + load the seed (25 RFQs, 50 quotes)
```

## Run

```powershell
uvicorn main:app --reload
```

On startup it prints `[OK] Database connection established to <host>`. Open
interactive docs at <http://localhost:8000/docs>.

## API

| Method | Path                  | Purpose                                            |
|--------|-----------------------|----------------------------------------------------|
| GET    | `/`                   | Health.                                            |
| GET    | `/health/db`          | Confirm DB connectivity.                           |
| POST   | `/rfqs`               | Create an RFQ.                                      |
| GET    | `/rfqs`               | List RFQs.                                          |
| GET    | `/rfqs/{id}`          | RFQ + quotes with totals + the cheapest flagged.   |
| DELETE | `/rfqs/{id}`          | Delete RFQ (cascades to its quotes).               |
| POST   | `/rfqs/{id}/quotes`   | Add a supplier quote.                              |
| DELETE | `/quotes/{id}`        | Delete a quote.                                    |
| POST   | `/import/quotes`      | Upload a CSV of supplier quotes.                   |

### Comparison response (`GET /rfqs/{id}`)

Quotes come back sorted cheapest-first; each has a computed `total_price` and
an `is_best` flag; `best_quote_id` names the winner. Ties break on lead time.

## CSV import

`POST /import/quotes` (multipart, field `file`). Format is the denormalized
`seed_quotes.csv`:

```
item_name, manufacturer_part_number, description, quantity, unit_price,
currency, supplier_name, lead_time_days, payment_terms, remarks
```

- Headers are matched case-insensitively; order doesn't matter.
- Rows are de-duplicated by `manufacturer_part_number`: the first row for an MPN
  creates the RFQ; later rows with the same MPN add another quote to it.
- **Per-row validation** — invalid rows are skipped and returned with their row
  number and field-level messages; valid rows still import. Response:
  `{ total_rows, imported, rfqs_created, quotes_added, errors: [{row, errors}] }`.

### Validation rules (Pydantic v2)

| Field            | Rule                                              |
|------------------|---------------------------------------------------|
| item_name / mpn / description / supplier_name | non-empty           |
| quantity         | integer > 0                                       |
| unit_price       | ≥ 0; a leading `$` and thousands `,` are stripped |
| currency         | 3-letter uppercase (e.g. `USD`), defaults to USD  |
| lead_time_days   | integer ≥ 0                                       |
| payment_terms    | matches `^Net\s?\d+$` (e.g. `Net 30`)             |
| remarks          | optional; blank → null                            |

## Assumptions & tradeoffs

- **Seed data fixes.** The original `seed.csv` stored prices as `$1.00`
  (unparseable as float) and gave the *same item different quantities* per
  supplier. `make_seed.py` strips the `$` and normalizes each item to one
  quantity (the max across its rows) so suppliers are comparable. The
  `multiple_of_10` quantity rule from the draft schema was dropped — real parts
  sell as qty 1, 5, reels of 5000, etc.
- **One CSV, two tables.** The import file is quote-oriented (one row = one
  quote) and denormalized; the importer normalizes it into `rfqs` +
  `supplier_quotes`. No second seed file is needed — each item already has two
  competing supplier rows, which is the comparison data.
- **Quantity authority.** When re-importing, the RFQ keeps its original
  quantity; a row's quantity only sets it when the RFQ is first created.
- **Currency.** All seed data is USD; multi-currency normalization (FX) is out
  of scope, so totals assume a single currency per comparison.
- Sync SQLAlchemy (not async) for readability at this scale; `pool_pre_ping`
  guards against dropped pooled connections.
