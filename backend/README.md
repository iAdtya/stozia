# Stozia — Supplier Quote Comparison (Backend)

FastAPI + SQLAlchemy + Supabase (Postgres) backend for a procurement tool where
a user creates an **RFQ** (an item to buy at a given quantity), attaches
**supplier quotes**, and compares them. The API computes
`Total Price = Unit Price × RFQ Quantity` for every quote and flags the cheapest.


## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1          # Windows PowerShell
pip install -r requirements.txt
copy .env.example .env                # then paste your Supabase URL
```


## Seed the database

```powershell
python make_seed.py     # regenerate seed_quotes.csv from ../seed.csv (optional)
python seed.py --reset  # create tables + load the seed (25 RFQs, 50 quotes)
```

## Run

```powershell
uvicorn main:app --reload
```
Open interactive docs at <http://localhost:8000/docs>.
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

