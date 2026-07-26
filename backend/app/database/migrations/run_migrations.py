"""
Sahyog — One-Time Schema Migration Script
==========================================
Run this ONCE to add the new audit columns to hospital_users:
  - is_first_login  (BOOLEAN, default TRUE)
  - password_changed (BOOLEAN, default FALSE)

Usage:
  cd backend
  python app/database/migrations/run_migrations.py
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from sqlalchemy import text
from app.database.session import engine

MIGRATIONS = [
    # Add is_first_login column — tracks whether the user is still on their generated temp password
    """
    ALTER TABLE hospital_users
    ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN NOT NULL DEFAULT TRUE;
    """,
    # Add password_changed column — set to TRUE once the user successfully changes their password
    """
    ALTER TABLE hospital_users
    ADD COLUMN IF NOT EXISTS password_changed BOOLEAN NOT NULL DEFAULT FALSE;
    """,
]

def run():
    print("=" * 55)
    print("Sahyog — Running schema migrations on hospital_users")
    print("=" * 55)
    with engine.begin() as conn:
        for i, sql in enumerate(MIGRATIONS, 1):
            try:
                conn.execute(text(sql.strip()))
                print(f"  [OK] Migration {i} executed successfully.")
            except Exception as e:
                print(f"  [SKIP] Migration {i} skipped or already applied: {e}")
    print("=" * 55)
    print("Done.")

if __name__ == "__main__":
    run()
