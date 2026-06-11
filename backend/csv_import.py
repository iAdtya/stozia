"""CSV parsing and validation for the supplier-quote import feature.

Expected header (case-insensitive, order-independent):
    item_name, manufacturer_part_number, description, quantity, unit_price,
    currency, supplier_name, lead_time_days, payment_terms, remarks

Each row is one supplier quote for an item. Items are de-duplicated by
manufacturer_part_number: the first row for a given MPN creates the RFQ (and
sets its quantity); later rows with the same MPN just attach another quote.
Invalid rows are skipped and reported with their row number — one bad row never
blocks the rest of the file.
"""
import csv
import io

from pydantic import ValidationError
from sqlalchemy.orm import Session

import crud
import models
import schemas

REQUIRED_COLUMNS = {
    "item_name",
    "manufacturer_part_number",
    "description",
    "quantity",
    "unit_price",
    "currency",
    "supplier_name",
    "lead_time_days",
    "payment_terms",
}


def _format_errors(exc: ValidationError) -> list[str]:
    """Flatten a Pydantic error into ['field: message', ...]."""
    out = []
    for err in exc.errors():
        loc = ".".join(str(p) for p in err["loc"]) or "row"
        out.append(f"{loc}: {err['msg']}")
    return out


def import_quotes_csv(db: Session, raw: bytes) -> schemas.ImportResult:
    # utf-8-sig drops a BOM if the file was saved from Excel.
    text = raw.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    if reader.fieldnames is None:
        raise ValueError("CSV file is empty.")

    # Normalize headers to lowercase so "Unit_Price" etc. still match.
    reader.fieldnames = [(h or "").strip().lower() for h in reader.fieldnames]

    missing = REQUIRED_COLUMNS - set(reader.fieldnames)
    if missing:
        raise ValueError(f"CSV is missing required columns: {', '.join(sorted(missing))}")

    errors: list[schemas.RowError] = []
    total = 0
    quotes_added = 0
    rfqs_created = 0

    # Cache RFQs created within this import so we don't re-query per row.
    rfq_by_mpn: dict[str, models.RFQ] = {}

    for i, raw_row in enumerate(reader, start=1):
        total += 1
        # Lowercase keys and drop the surplus columns csv may pad with (None key).
        row = {k: v for k, v in raw_row.items() if k}

        try:
            parsed = schemas.QuoteImportRow(**row)
        except ValidationError as exc:
            errors.append(schemas.RowError(row=i, errors=_format_errors(exc)))
            continue

        mpn = parsed.manufacturer_part_number
        rfq = rfq_by_mpn.get(mpn) or crud.get_rfq_by_mpn(db, mpn)

        if rfq is None:
            rfq = models.RFQ(
                item_name=parsed.item_name,
                manufacturer_part_number=mpn,
                description=parsed.description,
                quantity=parsed.quantity,
            )
            db.add(rfq)
            db.flush()  # assigns rfq.id without committing yet
            rfqs_created += 1
        rfq_by_mpn[mpn] = rfq

        db.add(
            models.SupplierQuote(
                rfq_id=rfq.id,
                supplier_name=parsed.supplier_name,
                unit_price=parsed.unit_price,
                currency=parsed.currency,
                lead_time_days=parsed.lead_time_days,
                payment_terms=parsed.payment_terms,
                remarks=parsed.remarks,
            )
        )
        quotes_added += 1

    db.commit()

    return schemas.ImportResult(
        total_rows=total,
        imported=quotes_added,
        rfqs_created=rfqs_created,
        quotes_added=quotes_added,
        errors=errors,
    )
