"""Database operations and the quote-comparison logic."""
from sqlalchemy import select
from sqlalchemy.orm import Session

import models
import schemas


# --------------------------------------------------------------------------- #
# RFQ
# --------------------------------------------------------------------------- #
def create_rfq(db: Session, data: schemas.RFQCreate) -> models.RFQ:
    rfq = models.RFQ(**data.model_dump())
    db.add(rfq)
    db.commit()
    db.refresh(rfq)
    return rfq


def list_rfqs(db: Session) -> list[models.RFQ]:
    return list(db.scalars(select(models.RFQ).order_by(models.RFQ.id)).all())


def get_rfq(db: Session, rfq_id: int) -> models.RFQ | None:
    return db.get(models.RFQ, rfq_id)


def get_rfq_by_mpn(db: Session, mpn: str) -> models.RFQ | None:
    return db.scalar(
        select(models.RFQ).where(models.RFQ.manufacturer_part_number == mpn)
    )


def delete_rfq(db: Session, rfq: models.RFQ) -> None:
    db.delete(rfq)
    db.commit()


# --------------------------------------------------------------------------- #
# Supplier quote
# --------------------------------------------------------------------------- #
def create_quote(
    db: Session, rfq_id: int, data: schemas.QuoteCreate
) -> models.SupplierQuote:
    quote = models.SupplierQuote(rfq_id=rfq_id, **data.model_dump())
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return quote


def get_quote(db: Session, quote_id: int) -> models.SupplierQuote | None:
    return db.get(models.SupplierQuote, quote_id)


def delete_quote(db: Session, quote: models.SupplierQuote) -> None:
    db.delete(quote)
    db.commit()


# --------------------------------------------------------------------------- #
# Comparison
# --------------------------------------------------------------------------- #
def build_comparison(rfq: models.RFQ) -> schemas.RFQComparison:
    """Compute total_price for every quote and flag the cheapest eligible one.

    Total Price = unit_price * RFQ quantity. A quote is only eligible to win if
    its MOQ <= the RFQ quantity (you can't order fewer than the supplier's
    minimum). The winner is the lowest total among eligible quotes; lead time
    breaks ties so the faster supplier wins an equal-price contest.
    """
    rows: list[schemas.QuoteComparison] = []
    for q in rfq.quotes:
        rows.append(
            schemas.QuoteComparison(
                id=q.id,
                supplier_name=q.supplier_name,
                unit_price=float(q.unit_price),
                currency=q.currency,
                lead_time_days=q.lead_time_days,
                payment_terms=q.payment_terms,
                moq=q.moq,
                remarks=q.remarks,
                total_price=round(float(q.unit_price) * rfq.quantity, 4),
                meets_moq=q.moq <= rfq.quantity,
                is_best=False,
            )
        )

    best_id = None
    eligible = [r for r in rows if r.meets_moq]
    if eligible:
        best = min(eligible, key=lambda r: (r.total_price, r.lead_time_days))
        best.is_best = True
        best_id = best.id

    # Eligible cheapest first; MOQ-blocked quotes sink to the bottom.
    rows.sort(key=lambda r: (not r.meets_moq, r.total_price))

    return schemas.RFQComparison(
        id=rfq.id,
        item_name=rfq.item_name,
        manufacturer_part_number=rfq.manufacturer_part_number,
        description=rfq.description,
        quantity=rfq.quantity,
        delivery_days=rfq.delivery_days,
        notes=rfq.notes,
        created_at=rfq.created_at,
        quotes=rows,
        best_quote_id=best_id,
    )
