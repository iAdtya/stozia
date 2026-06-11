"""SQLAlchemy ORM models.

Data model: an RFQ (request for quote) is one item the procurement user wants
to buy, at a single quantity. Each RFQ has many SupplierQuotes — competing
offers from different suppliers. The comparison is always done at the RFQ's
quantity so every quote is apples-to-apples.
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class RFQ(Base):
    __tablename__ = "rfqs"

    id: Mapped[int] = mapped_column(primary_key=True)
    item_name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Natural key used to de-duplicate items during CSV import.
    manufacturer_part_number: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    delivery_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    quotes: Mapped[list["SupplierQuote"]] = relationship(
        back_populates="rfq",
        cascade="all, delete-orphan",
        order_by="SupplierQuote.id",
    )


class SupplierQuote(Base):
    __tablename__ = "supplier_quotes"

    id: Mapped[int] = mapped_column(primary_key=True)
    rfq_id: Mapped[int] = mapped_column(
        ForeignKey("rfqs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    supplier_name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Numeric (not float) so prices like 0.0048 keep exact precision.
    unit_price: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    lead_time_days: Mapped[int] = mapped_column(Integer, nullable=False)
    payment_terms: Mapped[str] = mapped_column(String(50), nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    rfq: Mapped["RFQ"] = relationship(back_populates="quotes")
