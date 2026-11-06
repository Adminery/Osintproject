# -*- coding: utf-8 -*-
"""SQLite storage. NOTE: on Render's free tier the disk is ephemeral (wiped on restart/redeploy).
Set DB_PATH to a persistent disk path (paid plan) or migrate to Postgres for permanent accounts."""
import contextlib
import os
import sqlite3
import time

BASE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("DB_PATH") or os.path.join(BASE, "data", "watcher.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pw_hash TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  totp_secret TEXT,
  totp_enabled INTEGER NOT NULL DEFAULT 0,
  totp_last_step INTEGER NOT NULL DEFAULT 0,
  recovery TEXT,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until REAL NOT NULL DEFAULT 0,
  oauth_provider TEXT,
  oauth_id TEXT,
  created_at REAL NOT NULL,
  last_login REAL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_oauth ON users(oauth_provider, oauth_id) WHERE oauth_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS otps(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at REAL NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at REAL NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_otp ON otps(email, purpose);

CREATE TABLE IF NOT EXISTS sessions(
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at REAL NOT NULL,
  last_seen REAL NOT NULL,
  expires_at REAL NOT NULL,
  remember INTEGER NOT NULL DEFAULT 0,
  ip TEXT,
  ua TEXT
);
CREATE INDEX IF NOT EXISTS ix_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS audit(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  event TEXT NOT NULL,
  ip TEXT,
  ua TEXT,
  ts REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_audit_user ON audit(user_id, ts);
"""


@contextlib.contextmanager
def db():
    c = sqlite3.connect(DB_PATH, timeout=15)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys=ON")
    try:
        yield c
        c.commit()
    except Exception:
        c.rollback()
        raise
    finally:
        c.close()


def init():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with db() as c:
        c.execute("PRAGMA journal_mode=WAL")
        c.executescript(SCHEMA)
        now = time.time()
        c.execute("DELETE FROM otps WHERE expires_at < ?", (now,))
        c.execute("DELETE FROM sessions WHERE expires_at < ?", (now,))
        c.execute("DELETE FROM audit WHERE ts < ?", (now - 90 * 86400,))
        c.execute("DELETE FROM users WHERE email_verified=0 AND oauth_provider IS NULL AND created_at < ?", (now - 86400,))
