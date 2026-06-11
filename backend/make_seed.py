"""Generate a cleaned seed CSV from the original ../seed.csv.

Fixes applied (no DB or external deps needed — run with plain `python`):
  1. Strip the leading "$" from unit_price (so it parses as a number).
  2. Normalize each item to ONE RFQ quantity (the max across its supplier
     rows), so both suppliers for an item are compared at the same quantity.
     Without this, a 20-piece quote always looks cheaper than a 1000-piece
     quote and the comparison is meaningless.
  3. Keep each row's ORIGINAL quantity as that supplier's MOQ (minimum order
     quantity). The original per-supplier quantity is really their minimum, so
     this maps it to the right column instead of throwing it away.

Output: ./seed_quotes.csv (the file the API imports / the assignment ships).
"""
import csv
import os

SRC = os.path.join(os.path.dirname(__file__), "..", "seed.csv")
DST = os.path.join(os.path.dirname(__file__), "seed_quotes.csv")

FIELDS = [
    "item_name", "manufacturer_part_number", "description", "quantity", "moq",
    "unit_price", "currency", "supplier_name", "lead_time_days",
    "payment_terms", "remarks",
]


def main():
    with open(SRC, newline="", encoding="utf-8-sig") as f:
        rows = [r for r in csv.DictReader(f) if r.get("item_name")]

    # First pass: the RFQ quantity for each item = max quantity across its rows.
    qty_by_mpn: dict[str, int] = {}
    for r in rows:
        mpn = r["manufacturer_part_number"]
        qty = int(r["quantity"])
        qty_by_mpn[mpn] = max(qty_by_mpn.get(mpn, 0), qty)

    cleaned = []
    for r in rows:
        cleaned.append({
            "item_name": r["item_name"],
            "manufacturer_part_number": r["manufacturer_part_number"],
            "description": r["description"],
            "quantity": qty_by_mpn[r["manufacturer_part_number"]],
            "moq": int(r["quantity"]),  # this supplier's original qty = its MOQ
            "unit_price": r["unit_price"].replace("$", "").replace(",", "").strip(),
            "currency": r["currency"],
            "supplier_name": r["supplier_name"],
            "lead_time_days": r["lead_time_days"],
            "payment_terms": r["payment_terms"],
            "remarks": r.get("remarks", "") or "",
        })

    with open(DST, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(cleaned)

    print(f"Wrote {len(cleaned)} rows -> {os.path.abspath(DST)}")


if __name__ == "__main__":
    main()
