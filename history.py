# -*- coding: utf-8 -*-
"""Server-side search history (per account). The UI reads it from here, so it follows the user across devices."""
import hmac
import time
from flask import Blueprint, jsonify, request, session

import auth
from db import db

bp = Blueprint("history", __name__, url_prefix="/api/history")
KINDS = {"phone", "email", "user"}
MAX_ROWS = 200


def _err(code, status=400):
    return jsonify({"success": False, "error": code, "message": code}), status


@bp.before_request
def _guard():
    if request.method in ("POST", "DELETE"):
        if not auth._origin_ok():
            return _err("origin_invalid", 403)
        tok = session.get("csrf") or ""
        got = request.headers.get("X-CSRF-Token") or ""
        if not tok or not hmac.compare_digest(tok, got):
            return _err("csrf_invalid", 403)


@bp.get("")
def list_history():
    u = auth.current_user()
    if not u:
        return _err("auth_required", 401)
    with db() as c:
        rows = c.execute("SELECT id, kind, query, summary, ts FROM lookups WHERE user_id=? ORDER BY ts DESC LIMIT ?",
                         (u["id"], MAX_ROWS)).fetchall()
    return jsonify({"success": True, "items": [dict(r) for r in rows]})


@bp.post("")
def add_history():
    u = auth.current_user()
    if not u:
        return _err("auth_required", 401)
    d = request.get_json(silent=True) or {}
    kind, query = d.get("kind"), (d.get("query") or "").strip()
    summary = (d.get("summary") or "")[:200]
    if kind not in KINDS or not query or len(query) > 254:
        return _err("invalid_input")
    with db() as c:
        c.execute("INSERT INTO lookups(user_id,kind,query,summary,ts) VALUES(?,?,?,?,?)", (u["id"], kind, query, summary, time.time()))
        c.execute("DELETE FROM lookups WHERE user_id=? AND id NOT IN (SELECT id FROM lookups WHERE user_id=? ORDER BY ts DESC LIMIT ?)",
                  (u["id"], u["id"], MAX_ROWS))
    return jsonify({"success": True})


@bp.delete("")
def clear_history():
    u = auth.current_user()
    if not u:
        return _err("auth_required", 401)
    with db() as c:
        c.execute("DELETE FROM lookups WHERE user_id=?", (u["id"],))
    return jsonify({"success": True})
