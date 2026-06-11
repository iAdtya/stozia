"""Pydantic v2 schemas — request validation, response shaping, CSV row rules.

Validation decisions (and how they differ from the assignment's draft model):
  * unit_price uses ge=0 (free samples / no-charge lines are legal) and a
    pre-validator strips a leading "$" and thousands commas, because the CSV
    stores prices like "$1.00".
  * quantity is just gt=0. The draft used multiple_of=10, but real electronics
    sell as qty 1 (modules), 5 (terminal blocks), reels of 5000, etc., so that
    rule rejected ~44% of legitimate rows.
  * currency must be a 3-letter uppercase code; payment_terms must look like
    "Net 30".
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _strip_money(v):
    """Turn "$1,234.56" into "1234.56" so float coercion succeeds."""
    if isinstance(v, str):
        return v.replace("$", "").replace(",", "").strip()
    return v


def _blank_to_none(v):
    """Treat empty / whitespace-only strings as missing."""
    if isinstance(v, str) and v.strip() == "":
        return None
    return v

# IF MOQ is blank, means no minimum quantity and set it to 1
def _blank_to_one(v):
    """A blank moq cell means 'no minimum', i.e. 1."""
    if v is None or (isinstance(v, str) and v.strip() == ""):
        return 1
    return v


# --------------------------------------------------------------------------- #
# RFQ
# --------------------------------------------------------------------------- #
class RFQBase(BaseModel):
    item_name: str = Field(min_length=1)
    manufacturer_part_number: str = Field(min_length=1)
    description: str = Field(min_length=1)
    quantity: int = Field(gt=0) # greater than 0
    delivery_days: Optional[int] = Field(default=None, ge=0)
    notes: Optional[str] = None

    _notes_blank = field_validator("notes", mode="before")(_blank_to_none)


class RFQCreate(RFQBase):
    pass


class RFQOut(RFQBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# --------------------------------------------------------------------------- #
# Supplier quote
# --------------------------------------------------------------------------- #
class QuoteBase(BaseModel):
    supplier_name: str = Field(min_length=1)
    unit_price: float = Field(ge=0)
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    lead_time_days: int = Field(ge=0)
    payment_terms: str = Field(pattern=r"^Net\s?\d+$")
    moq: int = Field(default=1, ge=1)  # minimum order quantity
    remarks: Optional[str] = None

    _price = field_validator("unit_price", mode="before")(_strip_money)
    _remarks_blank = field_validator("remarks", mode="before")(_blank_to_none)


class QuoteCreate(QuoteBase):
    pass


class QuoteOut(QuoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rfq_id: int
    created_at: datetime


class QuoteComparison(BaseModel):
    """A quote enriched with the computed total and whether it's the winner."""
    id: int
    supplier_name: str
    unit_price: float
    currency: str
    lead_time_days: int
    payment_terms: str
    moq: int
    remarks: Optional[str] = None
    total_price: float  # unit_price * RFQ quantity
    meets_moq: bool  # moq <= RFQ quantity (eligible to win)
    is_best: bool


class RFQComparison(RFQOut):
    quotes: list[QuoteComparison]
    best_quote_id: Optional[int] = None


# --------------------------------------------------------------------------- #
# CSV import
# --------------------------------------------------------------------------- #
class QuoteImportRow(BaseModel):
    """One denormalized CSV row: RFQ fields + one supplier quote."""
    item_name: str = Field(min_length=1)
    manufacturer_part_number: str = Field(min_length=1)
    description: str = Field(min_length=1)
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0)
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    supplier_name: str = Field(min_length=1)
    lead_time_days: int = Field(ge=0)
    payment_terms: str = Field(pattern=r"^Net\s?\d+$")
    moq: int = Field(default=1, ge=1)  # optional column; defaults to 1 if absent
    remarks: Optional[str] = None

    _price = field_validator("unit_price", mode="before")(_strip_money)
    _moq_blank = field_validator("moq", mode="before")(_blank_to_one)
    _remarks_blank = field_validator("remarks", mode="before")(_blank_to_none)


class RowError(BaseModel):
    row: int  # 1-based row number in the data (header is row 0)
    errors: list[str]


class ImportResult(BaseModel):
    total_rows: int
    imported: int
    rfqs_created: int
    quotes_added: int
    errors: list[RowError]
