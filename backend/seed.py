"""Load the cleaned seed CSV into the database.

Usage:
    python make_seed.py     # (re)generate seed_quotes.csv from ../seed.csv
    python seed.py          # create tables + import seed_quotes.csv

Safe to re-run: items are de-duplicated by MPN, so importing twice just adds
duplicate supplier quotes — pass --reset to wipe the tables first.
"""
import os
import sys

import csv_import
from database import Base, SessionLocal, engine
import models  # noqa: F401 - register tables on Base

SEED_CSV = os.path.join(os.path.dirname(__file__), "seed_quotes.csv")


def main(reset: bool = False):
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if reset:
            db.query(models.SupplierQuote).delete()
            db.query(models.RFQ).delete()
            db.commit()
            print("Cleared existing rfqs and supplier_quotes.")

        with open(SEED_CSV, "rb") as f:
            result = csv_import.import_quotes_csv(db, f.read())

        print(
            f"Seed complete: {result.rfqs_created} RFQs created, "
            f"{result.quotes_added} quotes added, "
            f"{len(result.errors)} row error(s)."
        )
        for e in result.errors:
            print(f"  row {e.row}: {'; '.join(e.errors)}")
    finally:
        db.close()


if __name__ == "__main__":
    main(reset="--reset" in sys.argv)
