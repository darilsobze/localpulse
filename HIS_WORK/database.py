"""
database.py — SQLite persistence for LocalPulse (feature/3d-map).

Tables:
  push_subscriptions  — web push endpoints + keys
  redemptions         — completed offer redemptions + cashback log
  wallet              — per-user cashback balance and stamps
  merchant_settings   — merchant discount / quiet-gap overrides
  dismissals          — declined / expired offers (for accept-rate tracking)
"""

import json, sqlite3, uuid
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).parent / "localpulse.db"


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            endpoint   TEXT PRIMARY KEY,
            user_id    TEXT NOT NULL DEFAULT 'user_demo',
            keys_json  TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS redemptions (
            id            TEXT PRIMARY KEY,
            user_id       TEXT NOT NULL,
            merchant_id   TEXT NOT NULL,
            merchant_name TEXT NOT NULL,
            offer_code    TEXT NOT NULL UNIQUE,
            discount_pct  INTEGER NOT NULL,
            cashback_eur  REAL NOT NULL,
            created_at    TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS wallet (
            user_id     TEXT PRIMARY KEY,
            balance_eur REAL NOT NULL DEFAULT 0.0,
            stamps_json TEXT NOT NULL DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS merchant_settings (
            merchant_id       TEXT PRIMARY KEY,
            max_discount_pct  INTEGER NOT NULL DEFAULT 20,
            min_quiet_gap_min INTEGER NOT NULL DEFAULT 20,
            updated_at        TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS dismissals (
            id          TEXT PRIMARY KEY,
            user_id     TEXT NOT NULL,
            merchant_id TEXT NOT NULL,
            reason      TEXT NOT NULL DEFAULT 'user_dismissed',
            created_at  TEXT DEFAULT (datetime('now'))
        );
        """)
        conn.commit()


# ── Push subscriptions ───────────────────────────────────────────────────────

def upsert_subscription(endpoint: str, keys: dict, user_id: str = "user_demo") -> None:
    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO push_subscriptions (endpoint, user_id, keys_json) VALUES (?,?,?)",
            (endpoint, user_id, json.dumps(keys)),
        )
        conn.commit()


def delete_subscription(endpoint: str) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM push_subscriptions WHERE endpoint=?", (endpoint,))
        conn.commit()


def all_subscriptions() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute("SELECT endpoint, keys_json FROM push_subscriptions").fetchall()
    return [{"endpoint": r["endpoint"], "keys": json.loads(r["keys_json"])} for r in rows]


def subscription_count() -> int:
    with get_conn() as conn:
        return conn.execute("SELECT COUNT(*) FROM push_subscriptions").fetchone()[0]


# ── Redemptions ──────────────────────────────────────────────────────────────

def insert_redemption(
    user_id: str, merchant_id: str, merchant_name: str,
    offer_code: str, discount_pct: int, cashback_eur: float,
) -> str:
    rid = str(uuid.uuid4())
    with get_conn() as conn:
        conn.execute(
            """INSERT OR IGNORE INTO redemptions
               (id, user_id, merchant_id, merchant_name, offer_code, discount_pct, cashback_eur)
               VALUES (?,?,?,?,?,?,?)""",
            (rid, user_id, merchant_id, merchant_name, offer_code, discount_pct, cashback_eur),
        )
        conn.commit()
    return rid


def get_redemptions(user_id: str, limit: int = 20) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM redemptions WHERE user_id=? ORDER BY created_at DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def merchant_stats(merchant_id: str) -> dict:
    with get_conn() as conn:
        r = conn.execute(
            """SELECT COUNT(*) as accepted,
                      COALESCE(SUM(cashback_eur), 0) as cashback,
                      COALESCE(SUM(cashback_eur / (discount_pct / 100.0)), 0) as recovered
               FROM redemptions WHERE merchant_id=?""",
            (merchant_id,),
        ).fetchone()
        d = conn.execute(
            "SELECT COUNT(*) as dismissed FROM dismissals WHERE merchant_id=?",
            (merchant_id,),
        ).fetchone()
    accepted  = r["accepted"] or 0
    dismissed = d["dismissed"] or 0
    total     = accepted + dismissed
    return {
        "offers_accepted":      accepted,
        "offers_dismissed":     dismissed,
        "accept_rate_pct":      round(accepted / total * 100) if total else 0,
        "cashback_issued_eur":  round(r["cashback"], 2),
        "revenue_recovered_eur": round(r["recovered"], 2),
    }


# ── Wallet ───────────────────────────────────────────────────────────────────

def _ensure_wallet(user_id: str, conn) -> None:
    conn.execute("INSERT OR IGNORE INTO wallet (user_id) VALUES (?)", (user_id,))


def get_wallet(user_id: str) -> dict:
    with get_conn() as conn:
        _ensure_wallet(user_id, conn)
        conn.commit()
        row = conn.execute(
            "SELECT balance_eur, stamps_json FROM wallet WHERE user_id=?", (user_id,)
        ).fetchone()
    return {
        "user_id": user_id,
        "balance_eur": round(row["balance_eur"], 2),
        "stamps": json.loads(row["stamps_json"]),
    }


def add_cashback(user_id: str, merchant_name: str, cashback_eur: float) -> None:
    with get_conn() as conn:
        _ensure_wallet(user_id, conn)
        conn.execute(
            "UPDATE wallet SET balance_eur = balance_eur + ? WHERE user_id=?",
            (cashback_eur, user_id),
        )
        row = conn.execute("SELECT stamps_json FROM wallet WHERE user_id=?", (user_id,)).fetchone()
        stamps = json.loads(row["stamps_json"])
        stamps[merchant_name] = stamps.get(merchant_name, 0) + 1
        conn.execute(
            "UPDATE wallet SET stamps_json=? WHERE user_id=?",
            (json.dumps(stamps), user_id),
        )
        conn.commit()


# ── Merchant settings ────────────────────────────────────────────────────────

def get_merchant_settings(merchant_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT max_discount_pct, min_quiet_gap_min FROM merchant_settings WHERE merchant_id=?",
            (merchant_id,),
        ).fetchone()
    return dict(row) if row else None


def upsert_merchant_settings(merchant_id: str, max_discount_pct: int, min_quiet_gap_min: int) -> None:
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO merchant_settings (merchant_id, max_discount_pct, min_quiet_gap_min)
               VALUES (?,?,?)
               ON CONFLICT(merchant_id) DO UPDATE SET
                 max_discount_pct=excluded.max_discount_pct,
                 min_quiet_gap_min=excluded.min_quiet_gap_min,
                 updated_at=datetime('now')""",
            (merchant_id, max_discount_pct, min_quiet_gap_min),
        )
        conn.commit()


# ── Dismissals ───────────────────────────────────────────────────────────────

def insert_dismissal(user_id: str, merchant_id: str, reason: str = "user_dismissed") -> None:
    with get_conn() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO dismissals (id, user_id, merchant_id, reason) VALUES (?,?,?,?)",
            (str(uuid.uuid4()), user_id, merchant_id, reason),
        )
        conn.commit()
