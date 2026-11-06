# -*- coding: utf-8 -*-
"""
WatcherOsint — authentication (v2)

 * Email OTP verification on signup (6 digits, HMAC-hashed at rest, 10 min, 5 tries, resend cooldown)
 * scrypt password hashes, password policy, constant-time dummy hash for unknown users
 * Account lockout (5 failures -> 15 min) + per-IP / per-identity / per-email rate limits
 * Server-side sessions (revocable, listed in Settings), fixation-safe rotation on login
 * CSRF token + Origin check on every state-changing request
 * Optional TOTP 2FA (authenticator apps) with one-time recovery codes
 * Google / GitHub sign-in (optional, env-configured)
 * Audit trail shown to the user; security emails on password / 2FA changes
"""
import hmac
import json
import os
import re
import secrets
import time
from urllib.parse import urlencode, urlparse

import requests
from flask import Blueprint, current_app, g, jsonify, redirect, request, session
from werkzeug.security import check_password_hash, generate_password_hash

import mailer
from db import db
from security import (hash_code, hash_token, limiter, new_code, new_recovery_codes, new_totp_secret,
                      otpauth_uri, password_error, verify_totp)

try:
    from email_api import DISPOSABLE_DOMAINS
except Exception:  # pragma: no cover
    DISPOSABLE_DOMAINS = set()

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

OTP_TTL, OTP_COOLDOWN, OTP_MAX_TRIES = 600, 45, 5
LOCK_AFTER, LOCK_SECONDS = 5, 900
SESSION_REMEMBER, SESSION_SHORT = 14 * 86400, 12 * 3600
IDLE_REMEMBER, IDLE_SHORT = 7 * 86400, 2 * 3600
TRUSTED_ORIGINS = {o.strip().rstrip("/") for o in os.environ.get("TRUSTED_ORIGINS", "").split(",") if o.strip()}
BLOCK_DISPOSABLE = os.environ.get("BLOCK_DISPOSABLE", "1") == "1"

EMAIL_RE = re.compile(r"^[a-z0-9._%+\-]{1,64}@[a-z0-9\-]+(\.[a-z0-9\-]+)+$")
USERNAME_RE = re.compile(r"^[A-Za-z0-9_.\-]{3,24}$")
RESERVED = {"admin", "root", "support", "system", "api", "null", "undefined", "watcher", "osint", "watcherosint", "moderator", "staff"}
DUMMY_HASH = generate_password_hash("timing-equalizer-not-a-real-password")

MESSAGES = {
    "csrf_invalid": "Security token expired. Please retry.", "origin_invalid": "Request origin not allowed.",
    "rate_limited": "Too many attempts. Please wait.", "auth_required": "Please sign in.",
    "email_invalid": "Enter a valid email address.", "email_disposable": "Disposable email addresses are not allowed.",
    "username_invalid": "Username: 3–24 letters, digits, dot, dash or underscore.", "username_taken": "That username is taken.",
    "pw_short": "Password must be at least 10 characters.", "pw_long": "Password is too long.",
    "pw_weak": "Use 3 of: lowercase, uppercase, digits, symbols — or 16+ characters.",
    "pw_common": "That password is too common.", "pw_similar": "Password must not contain your name or email.",
    "mail_unavailable": "Email delivery is not configured on this server.", "mail_failed": "Could not send the email. Try again later.",
    "code_invalid": "Invalid code.", "code_expired": "The code expired. Request a new one.",
    "code_locked": "Too many wrong codes. Request a new one.", "cooldown": "Please wait before requesting another code.",
    "invalid_credentials": "Invalid credentials.", "locked": "Account temporarily locked. Try again later.",
    "session_expired": "Session expired. Sign in again.", "password_incorrect": "Current password is incorrect.",
    "twofa_already": "Two-factor authentication is already enabled.", "twofa_not_enabled": "Two-factor authentication is not enabled.",
    "twofa_setup_missing": "Start the setup first.", "not_found": "Not found.", "oauth_failed": "Sign-in with the provider failed.",
}


# ------------------------------------------------------------------ helpers
def _json():
    d = request.get_json(silent=True)
    return d if isinstance(d, dict) else {}


def ok(**kw):
    return jsonify({"success": True, **kw})


def err(code, status=400, **kw):
    return jsonify({"success": False, "error": code, "message": MESSAGES.get(code, code), **kw}), status


def rate(key, limit, window):
    allowed, wait = limiter.hit(key, limit, window)
    return None if allowed else err("rate_limited", 429, retry_after=wait)


def ip():
    return request.remote_addr or "?"


def ua():
    return (request.headers.get("User-Agent") or "")[:160]


def norm_email(v):
    return (v or "").strip().lower() if isinstance(v, str) else ""


def valid_email(e):
    return len(e) <= 254 and bool(EMAIL_RE.match(e)) and ".." not in e


def ensure_csrf():
    if not session.get("csrf"):
        session["csrf"] = secrets.token_urlsafe(32)
    return session["csrf"]


def audit(uid, event):
    with db() as c:
        c.execute("INSERT INTO audit(user_id,event,ip,ua,ts) VALUES(?,?,?,?,?)", (uid, event, ip(), ua(), time.time()))
        if uid:
            c.execute("DELETE FROM audit WHERE user_id=? AND id NOT IN (SELECT id FROM audit WHERE user_id=? ORDER BY id DESC LIMIT 200)", (uid, uid))


def public_user(u):
    return {"email": u["email"], "username": u["username"], "totp_enabled": bool(u["totp_enabled"]),
            "has_password": bool(u["pw_hash"]), "provider": u["oauth_provider"], "created_at": u["created_at"]}


def _origin_ok():
    o = request.headers.get("Origin")
    if not o:
        ref = request.headers.get("Referer")
        if ref:
            p = urlparse(ref)
            o = f"{p.scheme}://{p.netloc}"
    if not o:
        return True          # non-browser client; CSRF token is still required
    o = o.rstrip("/")
    return o == request.host_url.rstrip("/") or o in TRUSTED_ORIGINS


@bp.before_request
def _guard():
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        if not _origin_ok():
            return err("origin_invalid", 403)
        tok = session.get("csrf") or ""
        got = request.headers.get("X-CSRF-Token") or request.headers.get("X-CSRFToken") or ""
        if not tok or not hmac.compare_digest(tok, got):
            return err("csrf_invalid", 403)


# ------------------------------------------------------------------ sessions
def current_user():
    if "cu" in g:
        return g.cu
    g.cu = None
    sid = session.get("sid")
    if not sid:
        return None
    h, t = hash_token(sid), time.time()
    with db() as c:
        s = c.execute("SELECT * FROM sessions WHERE id=?", (h,)).fetchone()
        if not s:
            return None
        idle = IDLE_REMEMBER if s["remember"] else IDLE_SHORT
        if s["expires_at"] < t or s["last_seen"] < t - idle:
            c.execute("DELETE FROM sessions WHERE id=?", (h,))
            return None
        u = c.execute("SELECT * FROM users WHERE id=?", (s["user_id"],)).fetchone()
        if not u or not u["email_verified"]:
            return None
        if t - s["last_seen"] > 60:
            c.execute("UPDATE sessions SET last_seen=? WHERE id=?", (t, h))
    g.cu, g.sid_hash = dict(u), h
    return g.cu


def login_required(f):
    from functools import wraps

    @wraps(f)
    def w(*a, **k):
        if not current_user():
            return err("auth_required", 401)
        return f(*a, **k)
    return w


def start_session(u, remember):
    """Rotate: new random session id + new CSRF token (prevents fixation)."""
    sid, t = secrets.token_urlsafe(32), time.time()
    with db() as c:
        c.execute("INSERT INTO sessions(id,user_id,created_at,last_seen,expires_at,remember,ip,ua) VALUES(?,?,?,?,?,?,?,?)",
                  (hash_token(sid), u["id"], t, t, t + (SESSION_REMEMBER if remember else SESSION_SHORT), int(bool(remember)), ip(), ua()))
        c.execute("UPDATE users SET failed_logins=0, locked_until=0, last_login=? WHERE id=?", (t, u["id"]))
    session.clear()
    session["sid"] = sid
    session["csrf"] = secrets.token_urlsafe(32)
    session.permanent = bool(remember)
    g.pop("cu", None)
    return session["csrf"]


def drop_sessions(uid, keep_hash=None):
    with db() as c:
        if keep_hash:
            c.execute("DELETE FROM sessions WHERE user_id=? AND id!=?", (uid, keep_hash))
        else:
            c.execute("DELETE FROM sessions WHERE user_id=?", (uid,))


# ------------------------------------------------------------------ OTP
def issue_otp(email, purpose):
    """-> ('sent'|'cooldown'|'failed', wait_seconds)"""
    t = time.time()
    with db() as c:
        row = c.execute("SELECT created_at FROM otps WHERE email=? AND purpose=?", (email, purpose)).fetchone()
        if row and t - row["created_at"] < OTP_COOLDOWN:
            return "cooldown", int(OTP_COOLDOWN - (t - row["created_at"])) + 1
        code = new_code()
        c.execute("""INSERT INTO otps(email,purpose,code_hash,expires_at,attempts,created_at) VALUES(?,?,?,?,0,?)
                     ON CONFLICT(email,purpose) DO UPDATE SET code_hash=excluded.code_hash, expires_at=excluded.expires_at,
                     attempts=0, created_at=excluded.created_at""",
                  (email, purpose, hash_code(current_app.config["SECRET_KEY"], email, purpose, code), t + OTP_TTL, t))
    if not mailer.send_otp(email, code, purpose, OTP_TTL // 60):
        with db() as c:
            c.execute("DELETE FROM otps WHERE email=? AND purpose=?", (email, purpose))
        return "failed", 0
    return "sent", 0


def check_otp(email, purpose, code):
    """-> ('ok'|'invalid'|'expired'|'locked', tries_left)"""
    code = re.sub(r"\s", "", code or "")
    t = time.time()
    with db() as c:
        row = c.execute("SELECT * FROM otps WHERE email=? AND purpose=?", (email, purpose)).fetchone()
        if not row:
            return "invalid", 0
        if row["expires_at"] < t:
            c.execute("DELETE FROM otps WHERE id=?", (row["id"],))
            return "expired", 0
        if row["attempts"] >= OTP_MAX_TRIES:
            c.execute("DELETE FROM otps WHERE id=?", (row["id"],))
            return "locked", 0
        good = re.fullmatch(r"\d{6}", code) and hmac.compare_digest(
            row["code_hash"], hash_code(current_app.config["SECRET_KEY"], email, purpose, code))
        if good:
            c.execute("DELETE FROM otps WHERE id=?", (row["id"],))
            return "ok", OTP_MAX_TRIES
        n = row["attempts"] + 1
        if n >= OTP_MAX_TRIES:
            c.execute("DELETE FROM otps WHERE id=?", (row["id"],))
            return "locked", 0
        c.execute("UPDATE otps SET attempts=? WHERE id=?", (n, row["id"]))
        return "invalid", OTP_MAX_TRIES - n


def otp_error(res, left):
    if res == "expired":
        return err("code_expired", 400)
    if res == "locked":
        return err("code_locked", 400)
    return err("code_invalid", 400, tries_left=left)


def _otp_meta():
    return {"expires_in": OTP_TTL, "resend_in": OTP_COOLDOWN}


def _user(where, val):
    with db() as c:
        r = c.execute(f"SELECT * FROM users WHERE {where}=?", (val,)).fetchone()
    return dict(r) if r else None


# ------------------------------------------------------------------ public info
@bp.get("/config")
def config():
    return ok(mail=mailer.delivery_possible(), real_mail=bool(mailer.provider()),
              providers={"google": bool(os.environ.get("GOOGLE_CLIENT_ID")), "github": bool(os.environ.get("GITHUB_CLIENT_ID"))},
              otp_ttl=OTP_TTL, resend_in=OTP_COOLDOWN)


@bp.get("/me")
def me():
    csrf = ensure_csrf()
    u = current_user()
    return ok(authenticated=bool(u), user=public_user(u) if u else None, csrf=csrf)


# ------------------------------------------------------------------ signup / verify
@bp.post("/signup")
def signup():
    d = _json()
    email, username, pw = norm_email(d.get("email")), (d.get("username") or "").strip(), d.get("password") or ""
    if (r := rate(f"su:ip:{ip()}", 8, 3600)):
        return r
    if not valid_email(email):
        return err("email_invalid")
    if BLOCK_DISPOSABLE and email.rsplit("@", 1)[1] in DISPOSABLE_DOMAINS:
        return err("email_disposable")
    if not USERNAME_RE.match(username) or username.lower() in RESERVED:
        return err("username_invalid")
    if (pe := password_error(pw, email, username)):
        return err(pe)
    if not mailer.delivery_possible():
        return err("mail_unavailable", 503)
    if (r := rate(f"su:em:{email}", 5, 3600)):
        return r

    existing = _user("email", email)
    if existing and existing["email_verified"]:
        # Same response as a fresh signup (no account enumeration); the owner gets a heads-up instead of a code.
        mailer.send_notice(email, "You already have an account", "شما از قبل حساب دارید",
                           "Someone tried to register with this address. If it was you, just sign in or reset your password.",
                           "کسی با این ایمیل ثبت‌نام کرد. اگر خودتان بودید، وارد شوید یا رمز را بازیابی کنید.")
        return ok(step="verify", email=email, **_otp_meta())

    pwh = generate_password_hash(pw)
    with db() as c:
        clash = c.execute("SELECT id FROM users WHERE username=? AND id IS NOT ?", (username, existing["id"] if existing else None)).fetchone()
        if clash:
            return err("username_taken", 409)
        if existing:
            c.execute("UPDATE users SET username=?, pw_hash=?, created_at=? WHERE id=?", (username, pwh, time.time(), existing["id"]))
        else:
            c.execute("INSERT INTO users(email,username,pw_hash,created_at) VALUES(?,?,?,?)", (email, username, pwh, time.time()))
    status, wait = issue_otp(email, "verify")
    if status == "failed":
        return err("mail_failed", 502)
    audit(None, "signup")
    return ok(step="verify", email=email, **_otp_meta())


@bp.post("/verify")
def verify():
    d = _json()
    email = norm_email(d.get("email"))
    if (r := rate(f"vf:ip:{ip()}", 30, 600)) or (r := rate(f"vf:em:{email}", 10, 600)):
        return r
    res, left = check_otp(email, "verify", d.get("code"))
    if res != "ok":
        return otp_error(res, left)
    u = _user("email", email)
    if not u:
        return err("code_invalid")
    with db() as c:
        c.execute("UPDATE users SET email_verified=1 WHERE id=?", (u["id"],))
    u["email_verified"] = 1
    csrf = start_session(u, bool(d.get("remember")))
    audit(u["id"], "verify_ok")
    return ok(user=public_user(u), csrf=csrf)


@bp.post("/resend")
def resend():
    d = _json()
    email, purpose = norm_email(d.get("email")), d.get("purpose")
    if purpose not in ("verify", "reset") or not valid_email(email):
        return err("email_invalid")
    if (r := rate(f"rs:ip:{ip()}", 15, 3600)) or (r := rate(f"rs:em:{email}", 6, 3600)):
        return r
    if not mailer.delivery_possible():
        return err("mail_unavailable", 503)
    u = _user("email", email)
    eligible = u and ((purpose == "verify" and not u["email_verified"]) or (purpose == "reset" and u["email_verified"]))
    if eligible:
        status, wait = issue_otp(email, purpose)
        if status == "cooldown":
            return err("cooldown", 429, retry_after=wait)
        if status == "failed":
            return err("mail_failed", 502)
    return ok(**_otp_meta())


# ------------------------------------------------------------------ login / logout
@bp.post("/login")
def login():
    d = _json()
    ident = (d.get("identifier") or d.get("email") or "").strip().lower()
    pw = d.get("password") or ""
    if not ident or not isinstance(pw, str) or len(pw) > 256:
        return err("invalid_credentials", 401)
    if (r := rate(f"li:ip:{ip()}", 30, 600)) or (r := rate(f"li:id:{ident}", 10, 600)):
        return r
    u = _user("email", ident) if "@" in ident else _user("username", ident)
    t = time.time()
    if u and u["locked_until"] > t:
        return err("locked", 429, retry_after=int(u["locked_until"] - t) + 1)
    good = check_password_hash(u["pw_hash"] if u and u["pw_hash"] else DUMMY_HASH, pw)   # always hash: equal timing
    if not (u and u["pw_hash"] and good):
        if u:
            n, lock = u["failed_logins"] + 1, 0
            if n >= LOCK_AFTER:
                n, lock = 0, t + LOCK_SECONDS
            with db() as c:
                c.execute("UPDATE users SET failed_logins=?, locked_until=? WHERE id=?", (n, lock, u["id"]))
            audit(u["id"], "locked" if lock else "login_fail")
        return err("invalid_credentials", 401)

    if not u["email_verified"]:
        status, _ = issue_otp(u["email"], "verify")
        if status == "failed":
            return err("mail_failed", 502)
        return ok(step="verify", email=u["email"], **_otp_meta())
    if u["totp_enabled"]:
        session.clear()
        ensure_csrf()
        session["pre2fa"] = {"uid": u["id"], "ts": t, "rem": bool(d.get("remember"))}
        return ok(step="totp", csrf=session["csrf"])
    csrf = start_session(u, bool(d.get("remember")))
    audit(u["id"], "login_ok")
    return ok(user=public_user(u), csrf=csrf)


@bp.post("/login/2fa")
def login_2fa():
    p = session.get("pre2fa")
    if not p or time.time() - p["ts"] > 300:
        return err("session_expired", 401)
    if (r := rate(f"2fa:{p['uid']}", 6, 300)):
        return r
    u = _user("id", p["uid"])
    code = (_json().get("code") or "").strip()
    if not u or not u["totp_enabled"]:
        return err("session_expired", 401)
    passed = False
    step = verify_totp(u["totp_secret"], code, u["totp_last_step"])
    if step:
        with db() as c:
            c.execute("UPDATE users SET totp_last_step=? WHERE id=?", (step, u["id"]))
        passed = True
    else:
        h = hash_code(current_app.config["SECRET_KEY"], "recovery", str(u["id"]), code.lower().replace(" ", ""))
        codes = json.loads(u["recovery"] or "[]")
        if h in codes:
            codes.remove(h)
            with db() as c:
                c.execute("UPDATE users SET recovery=? WHERE id=?", (json.dumps(codes), u["id"]))
            passed = True
            audit(u["id"], "recovery_code_used")
    if not passed:
        audit(u["id"], "login_fail_2fa")
        return err("code_invalid", 401)
    csrf = start_session(u, p.get("rem"))
    audit(u["id"], "login_ok")
    return ok(user=public_user(u), csrf=csrf)


@bp.post("/logout")
def logout():
    u = current_user()
    if u:
        with db() as c:
            c.execute("DELETE FROM sessions WHERE id=?", (g.sid_hash,))
        audit(u["id"], "logout")
    session.clear()
    return ok(csrf=ensure_csrf())


# ------------------------------------------------------------------ password reset / change
@bp.post("/forgot")
def forgot():
    email = norm_email(_json().get("email"))
    if not valid_email(email):
        return err("email_invalid")
    if (r := rate(f"fg:ip:{ip()}", 15, 3600)) or (r := rate(f"fg:em:{email}", 5, 3600)):
        return r
    if not mailer.delivery_possible():
        return err("mail_unavailable", 503)
    u = _user("email", email)
    if u and u["email_verified"]:
        issue_otp(email, "reset")          # cooldown/failed are swallowed on purpose (no oracle)
    return ok(step="reset", email=email, **_otp_meta())


@bp.post("/reset")
def reset():
    d = _json()
    email, pw = norm_email(d.get("email")), d.get("password") or ""
    if (r := rate(f"rp:ip:{ip()}", 30, 600)) or (r := rate(f"rp:em:{email}", 10, 600)):
        return r
    u = _user("email", email)
    if (pe := password_error(pw, email, u["username"] if u else "")):
        return err(pe)
    res, left = check_otp(email, "reset", d.get("code"))
    if res != "ok" or not u:
        return otp_error(res if res != "ok" else "invalid", left)
    with db() as c:
        c.execute("UPDATE users SET pw_hash=?, failed_logins=0, locked_until=0 WHERE id=?", (generate_password_hash(pw), u["id"]))
    drop_sessions(u["id"])
    audit(u["id"], "password_reset")
    mailer.send_notice(email, "Your password was reset", "رمز عبور شما بازنشانی شد",
                       "If this wasn't you, contact the administrator immediately.", "اگر کار شما نبوده، فوراً به مدیر اطلاع دهید.")
    return ok()


@bp.post("/change-password")
@login_required
def change_password():
    u, d = current_user(), _json()
    if (r := rate(f"cp:{u['id']}", 6, 600)):
        return r
    new = d.get("new_password") or ""
    if u["pw_hash"] and not check_password_hash(u["pw_hash"], d.get("current_password") or ""):
        return err("password_incorrect", 401)
    if (pe := password_error(new, u["email"], u["username"])):
        return err(pe)
    with db() as c:
        c.execute("UPDATE users SET pw_hash=? WHERE id=?", (generate_password_hash(new), u["id"]))
    drop_sessions(u["id"], keep_hash=g.sid_hash)        # every OTHER device is signed out
    audit(u["id"], "password_changed")
    mailer.send_notice(u["email"], "Your password was changed", "رمز عبور شما تغییر کرد",
                       "All other devices were signed out. If this wasn't you, reset your password now.",
                       "همه دستگاه‌های دیگر خارج شدند. اگر کار شما نبوده، همین حالا رمز را بازیابی کنید.")
    return ok()


# ------------------------------------------------------------------ 2FA
@bp.post("/2fa/setup")
@login_required
def twofa_setup():
    u = current_user()
    if u["totp_enabled"]:
        return err("twofa_already")
    secret = new_totp_secret()
    with db() as c:
        c.execute("UPDATE users SET totp_secret=? WHERE id=?", (secret, u["id"]))
    return ok(secret=secret, uri=otpauth_uri(secret, u["email"]))


@bp.post("/2fa/enable")
@login_required
def twofa_enable():
    u = current_user()
    if u["totp_enabled"]:
        return err("twofa_already")
    if not u["totp_secret"]:
        return err("twofa_setup_missing")
    if (r := rate(f"2fe:{u['id']}", 8, 600)):
        return r
    step = verify_totp(u["totp_secret"], _json().get("code"), 0)
    if not step:
        return err("code_invalid")
    codes = new_recovery_codes()
    hashed = [hash_code(current_app.config["SECRET_KEY"], "recovery", str(u["id"]), c) for c in codes]
    with db() as c:
        c.execute("UPDATE users SET totp_enabled=1, totp_last_step=?, recovery=? WHERE id=?", (step, json.dumps(hashed), u["id"]))
    drop_sessions(u["id"], keep_hash=g.sid_hash)
    audit(u["id"], "2fa_enabled")
    return ok(recovery_codes=codes)


@bp.post("/2fa/disable")
@login_required
def twofa_disable():
    u, d = current_user(), _json()
    if not u["totp_enabled"]:
        return err("twofa_not_enabled")
    if (r := rate(f"2fd:{u['id']}", 6, 600)):
        return r
    if u["pw_hash"] and not check_password_hash(u["pw_hash"], d.get("password") or ""):
        return err("password_incorrect", 401)
    if not verify_totp(u["totp_secret"], d.get("code"), u["totp_last_step"]):
        return err("code_invalid")
    with db() as c:
        c.execute("UPDATE users SET totp_enabled=0, totp_secret=NULL, recovery=NULL, totp_last_step=0 WHERE id=?", (u["id"],))
    audit(u["id"], "2fa_disabled")
    mailer.send_notice(u["email"], "Two-factor authentication disabled", "تایید دومرحله‌ای غیرفعال شد",
                       "If this wasn't you, change your password immediately.", "اگر کار شما نبوده، فوراً رمز را تغییر دهید.")
    return ok()


# ------------------------------------------------------------------ sessions & activity
@bp.get("/sessions")
@login_required
def sessions_list():
    u = current_user()
    with db() as c:
        rows = c.execute("SELECT * FROM sessions WHERE user_id=? AND expires_at>? ORDER BY last_seen DESC", (u["id"], time.time())).fetchall()
    return ok(sessions=[{"id": r["id"], "created_at": r["created_at"], "last_seen": r["last_seen"], "ip": mask_ip(r["ip"]),
                         "ua": r["ua"], "current": r["id"] == g.sid_hash} for r in rows])


@bp.post("/sessions/revoke")
@login_required
def sessions_revoke():
    u, sid = current_user(), _json().get("id")
    with db() as c:
        if sid == "all":
            c.execute("DELETE FROM sessions WHERE user_id=? AND id!=?", (u["id"], g.sid_hash))
        else:
            c.execute("DELETE FROM sessions WHERE user_id=? AND id=? AND id!=?", (u["id"], str(sid), g.sid_hash))
    audit(u["id"], "sessions_revoked")
    return ok()


@bp.get("/activity")
@login_required
def activity():
    u = current_user()
    with db() as c:
        rows = c.execute("SELECT event,ip,ua,ts FROM audit WHERE user_id=? ORDER BY id DESC LIMIT 30", (u["id"],)).fetchall()
    return ok(events=[{"event": r["event"], "ip": mask_ip(r["ip"]), "ua": r["ua"], "ts": r["ts"]} for r in rows])


def mask_ip(v):
    if not v:
        return ""
    if ":" in v:
        return ":".join(v.split(":")[:3]) + ":…"
    p = v.split(".")
    return ".".join(p[:2]) + ".•.•" if len(p) == 4 else v


# ------------------------------------------------------------------ OAuth (optional)
OAUTH = {
    "google": {"auth": "https://accounts.google.com/o/oauth2/v2/auth", "token": "https://oauth2.googleapis.com/token",
               "scope": "openid email profile", "id": "GOOGLE_CLIENT_ID", "secret": "GOOGLE_CLIENT_SECRET"},
    "github": {"auth": "https://github.com/login/oauth/authorize", "token": "https://github.com/login/oauth/access_token",
               "scope": "read:user user:email", "id": "GITHUB_CLIENT_ID", "secret": "GITHUB_CLIENT_SECRET"},
}


def _public_base():
    return (os.environ.get("PUBLIC_URL") or request.url_root).rstrip("/")


def _oauth_cfg(p):
    c = OAUTH.get(p)
    return c if c and os.environ.get(c["id"]) and os.environ.get(c["secret"]) else None


@bp.get("/<provider>")
def oauth_start(provider):
    cfg = _oauth_cfg(provider)
    if not cfg:
        return err("not_found", 404)
    session["oauth_state"], session["oauth_ts"] = secrets.token_urlsafe(24), time.time()
    q = {"client_id": os.environ[cfg["id"]], "redirect_uri": f"{_public_base()}/api/auth/{provider}/callback",
         "response_type": "code", "scope": cfg["scope"], "state": session["oauth_state"]}
    return redirect(cfg["auth"] + "?" + urlencode(q))


def _fetch_profile(provider, cfg, code):
    redirect_uri = f"{_public_base()}/api/auth/{provider}/callback"
    tr = requests.post(cfg["token"], headers={"Accept": "application/json"}, timeout=10, data={
        "client_id": os.environ[cfg["id"]], "client_secret": os.environ[cfg["secret"]], "code": code,
        "redirect_uri": redirect_uri, "grant_type": "authorization_code"})
    tok = tr.json().get("access_token")
    if not tok:
        return None
    h = {"Authorization": f"Bearer {tok}", "Accept": "application/json"}
    if provider == "google":
        j = requests.get("https://openidconnect.googleapis.com/v1/userinfo", headers=h, timeout=10).json()
        return {"id": j.get("sub"), "email": norm_email(j.get("email")), "verified": bool(j.get("email_verified")), "name": j.get("name") or ""}
    j = requests.get("https://api.github.com/user", headers=h, timeout=10).json()
    emails = requests.get("https://api.github.com/user/emails", headers=h, timeout=10).json()
    primary = next((e for e in emails if isinstance(e, dict) and e.get("primary") and e.get("verified")), None) if isinstance(emails, list) else None
    return {"id": str(j.get("id") or ""), "email": norm_email(primary["email"]) if primary else "", "verified": bool(primary), "name": j.get("login") or ""}


@bp.get("/<provider>/callback")
def oauth_callback(provider):
    cfg = _oauth_cfg(provider)
    if not cfg:
        return err("not_found", 404)
    state, ts = session.pop("oauth_state", None), session.pop("oauth_ts", 0)
    if not state or time.time() - ts > 600 or not hmac.compare_digest(state, request.args.get("state", "")) or not request.args.get("code"):
        return redirect("/login.html?error=oauth_failed")
    try:
        prof = _fetch_profile(provider, cfg, request.args["code"])
    except Exception as e:
        print(f"[OAUTH] {provider}: {type(e).__name__}")
        prof = None
    if not prof or not prof["id"] or not prof["email"] or not prof["verified"] or not valid_email(prof["email"]):
        return redirect("/login.html?error=oauth_failed")
    with db() as c:
        row = c.execute("SELECT * FROM users WHERE oauth_provider=? AND oauth_id=?", (provider, prof["id"])).fetchone() \
            or c.execute("SELECT * FROM users WHERE email=?", (prof["email"],)).fetchone()
        if row:
            u = dict(row)
            if not u["oauth_id"]:
                c.execute("UPDATE users SET oauth_provider=?, oauth_id=?, email_verified=1 WHERE id=?", (provider, prof["id"], u["id"]))
            elif not u["email_verified"]:
                c.execute("UPDATE users SET email_verified=1 WHERE id=?", (u["id"],))
        else:
            base = re.sub(r"[^A-Za-z0-9_.\-]", "", prof["name"] or prof["email"].split("@")[0])[:16] or "user"
            name = base if len(base) >= 3 and not c.execute("SELECT 1 FROM users WHERE username=?", (base,)).fetchone() else None
            while not name:
                cand = f"{base[:14]}{secrets.randbelow(10000):04d}"
                name = cand if not c.execute("SELECT 1 FROM users WHERE username=?", (cand,)).fetchone() else None
            cur = c.execute("INSERT INTO users(email,username,email_verified,oauth_provider,oauth_id,created_at) VALUES(?,?,1,?,?,?)",
                            (prof["email"], name, provider, prof["id"], time.time()))
            u = dict(c.execute("SELECT * FROM users WHERE id=?", (cur.lastrowid,)).fetchone())
    u["email_verified"] = 1
    if u["totp_enabled"]:
        session.clear()
        ensure_csrf()
        session["pre2fa"] = {"uid": u["id"], "ts": time.time(), "rem": False}
        return redirect("/login.html#2fa")
    start_session(u, False)
    audit(u["id"], f"login_{provider}")
    return redirect("/console.html")
