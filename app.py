#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WatcherOsint v2 — one Flask app serving the API (/api/*) AND the website (static pages in the project root).

Same origin => first-party cookies, no CORS. If you put the site on Netlify, proxy /api/* to this
service (see netlify.toml) so the browser still sees a single origin.
"""
import os
import secrets

from flask import Flask, jsonify, redirect, request, send_from_directory
from werkzeug.middleware.proxy_fix import ProxyFix

import auth
import db as database
from email_api import bp as email_bp      # never name a module "email.py": it shadows Python's stdlib
from number import bp as phone_bp
from username import bp as username_bp

VERSION = "2.0.0"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = BASE_DIR   # flat layout: pages and static files live next to app.py
IS_DEV = os.environ.get("ENV", "production") == "development"

PAGES = {"index.html", "login.html", "console.html", "settings.html"}
CLEAN = {"login": "login.html", "console": "console.html", "settings": "settings.html"}
LEGACY = {"phone.html": "/console.html#phone", "email.html": "/console.html#email", "username.html": "/console.html#username"}
TOOL_PREFIXES = ("/api/phone", "/api/email", "/api/username")

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)   # Render / Netlify proxies

secret = os.environ.get("SECRET_KEY")
if not secret:
    if IS_DEV:
        secret = secrets.token_hex(32)
        print("WARNING: dev mode — random SECRET_KEY (sessions reset on restart)")
    else:
        raise RuntimeError("SECRET_KEY environment variable is required in production (Render: Environment tab)")

app.config.update(
    SECRET_KEY=secret,
    SESSION_COOKIE_NAME="wo_sid" if IS_DEV else "__Host-wo",     # __Host- = Secure + Path=/ + no Domain
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=not IS_DEV,
    SESSION_COOKIE_SAMESITE="Lax",
    PERMANENT_SESSION_LIFETIME=14 * 86400,
    MAX_CONTENT_LENGTH=64 * 1024,
    JSON_SORT_KEYS=False,
)
database.init()

for bp in (phone_bp, email_bp, username_bp, auth.bp):
    app.register_blueprint(bp)

CSP = ("default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self'; "
       "img-src 'self' data: https://*.gravatar.com https://gravatar.com; font-src 'self'; connect-src 'self'; "
       "object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'")


@app.before_request
def guard_tools():
    """OSINT tools are for signed-in, verified users only (keeps the server from becoming an open scanner)."""
    if request.path.startswith(TOOL_PREFIXES) and not auth.current_user():
        return jsonify({"success": False, "error": "auth_required", "message": "Please sign in."}), 401


# ---------------------------------------------------------------- website
@app.get("/")
def home():
    return send_from_directory(WEB_DIR, "index.html")


STATIC = {"style.css", "core.js", "i18n.js", "bg3d.js", "auth.js", "console.js", "settings.js", "landing.js", "banner.svg", "favicon.svg"}


@app.get("/<page>")
def pages(page):
    if page in PAGES or page in STATIC:
        return send_from_directory(WEB_DIR, page, max_age=0 if (IS_DEV or page in PAGES) else 3600)
    if page in CLEAN:
        return send_from_directory(WEB_DIR, CLEAN[page])
    if page in LEGACY:
        return redirect(LEGACY[page], 301)
    if page == "favicon.ico":
        return send_from_directory(WEB_DIR, "favicon.svg", mimetype="image/svg+xml")
    return jsonify({"success": False, "error": "not_found"}), 404


@app.after_request
def headers(resp):
    resp.headers["Content-Security-Policy"] = CSP
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "same-origin"
    resp.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
    resp.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    resp.headers["Cross-Origin-Resource-Policy"] = "same-origin"
    if request.path.lstrip("/") not in STATIC:
        resp.headers["Cache-Control"] = "no-store"
    if not IS_DEV:
        resp.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return resp


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "version": VERSION})


@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "error": "not_found"}), 404


@app.errorhandler(405)
def bad_method(e):
    return jsonify({"success": False, "error": "method_not_allowed"}), 405


@app.errorhandler(413)
def too_large(e):
    return jsonify({"success": False, "error": "payload_too_large"}), 413


@app.errorhandler(500)
def server_error(e):
    return jsonify({"success": False, "error": "server_error"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=os.environ.get("FLASK_DEBUG") == "1")
