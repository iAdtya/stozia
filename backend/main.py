from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import crud
import csv_import
import schemas
from database import Base, check_connection, engine, get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # On startup: verify the DB is reachable and create tables if missing.
    try:
        host = check_connection()
        print(f"[OK] Database connection established to {host}")
    except Exception as exc:  # noqa: BLE001 - we want to surface any failure
        print(f"[ERROR] Database connection FAILED: {exc}")
        raise
    Base.metadata.create_all(bind=engine)
    print("[OK] Tables ready (rfqs, supplier_quotes)")
    yield


app = FastAPI(title="Stozia Supplier Quote Comparison", version="1.0.0", lifespan=lifespan)

# Open CORS so the Next.js frontend can call the API in dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["health"])
def root():
    return {"service": "Stozia Supplier Quote Comparison", "status": "ok"}


@app.get("/health/db", tags=["health"])
def health_db():
    try:
        host = check_connection()
        return {"database": "connected", "host": host}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"Database unreachable: {exc}")


# --------------------------------------------------------------------------- #
# RFQs
# --------------------------------------------------------------------------- #
@app.post("/rfqs", response_model=schemas.RFQOut, status_code=201, tags=["rfqs"])
def create_rfq(payload: schemas.RFQCreate, db: Session = Depends(get_db)):
    if crud.get_rfq_by_mpn(db, payload.manufacturer_part_number):
        raise HTTPException(
            status_code=409,
            detail=f"An RFQ with MPN '{payload.manufacturer_part_number}' already exists.",
        )
    return crud.create_rfq(db, payload)


@app.get("/rfqs", response_model=list[schemas.RFQOut], tags=["rfqs"])
def list_rfqs(db: Session = Depends(get_db)):
    return crud.list_rfqs(db)


@app.get("/rfqs/{rfq_id}", response_model=schemas.RFQComparison, tags=["rfqs"])
def get_rfq(rfq_id: int, db: Session = Depends(get_db)):
    """Return an RFQ with all supplier quotes, computed totals, and the winner."""
    rfq = crud.get_rfq(db, rfq_id)
    if rfq is None:
        raise HTTPException(status_code=404, detail="RFQ not found")
    return crud.build_comparison(rfq)


@app.delete("/rfqs/{rfq_id}", status_code=204, tags=["rfqs"])
def delete_rfq(rfq_id: int, db: Session = Depends(get_db)):
    rfq = crud.get_rfq(db, rfq_id)
    if rfq is None:
        raise HTTPException(status_code=404, detail="RFQ not found")
    crud.delete_rfq(db, rfq)


# --------------------------------------------------------------------------- #
# Supplier quotes
# --------------------------------------------------------------------------- #
@app.post(
    "/rfqs/{rfq_id}/quotes",
    response_model=schemas.QuoteOut,
    status_code=201,
    tags=["quotes"],
)
def add_quote(rfq_id: int, payload: schemas.QuoteCreate, db: Session = Depends(get_db)):
    if crud.get_rfq(db, rfq_id) is None:
        raise HTTPException(status_code=404, detail="RFQ not found")
    return crud.create_quote(db, rfq_id, payload)


@app.delete("/quotes/{quote_id}", status_code=204, tags=["quotes"])
def delete_quote(quote_id: int, db: Session = Depends(get_db)):
    quote = crud.get_quote(db, quote_id)
    if quote is None:
        raise HTTPException(status_code=404, detail="Quote not found")
    crud.delete_quote(db, quote)


# --------------------------------------------------------------------------- #
# CSV import
# --------------------------------------------------------------------------- #
@app.post("/import/quotes", response_model=schemas.ImportResult, tags=["import"])
async def import_quotes(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a CSV of supplier quotes. Valid rows are imported; invalid rows
    are skipped and returned with per-row error messages."""
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file.")
    raw = await file.read()
    try:
        return csv_import.import_quotes_csv(db, raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
