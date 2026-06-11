# Stozia — Frontend

Next.js (App Router) + React + Tailwind UI for the Supplier Quote Comparison
tool. Talks to the FastAPI backend over REST.

## Pages

| Route          | What it does                                                       |
|----------------|-------------------------------------------------------------------|
| `/`            | List all RFQs; delete; link to create or compare.                 |
| `/rfqs/new`    | Create an RFQ (item, MPN, quantity, delivery, notes).             |
| `/rfqs/[id]`   | RFQ summary + supplier comparison table (totals, cheapest = green "BEST"), add/delete quotes. |
| `/import`      | Upload a CSV of supplier quotes; shows per-row errors.            |

## Setup

```bash
cd stozia-frontend
npm install
```

Set the backend URL in `.env.local` (already created):

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Run

Start the backend first (see `../backend/README.md`), then:

```bash
npm run dev      # http://localhost:3000
```

