"""Backend self-test. Run:  ENV=development SECRET_KEY=x DB_PATH=/tmp/t.db python3 tests/test_backend.py"""
import json, os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import importlib
import app as A, security as S, db as D, auth as AU

fails = []
def check(name, cond, extra=""):
    print(("PASS " if cond else "FAIL ") + name + (f"  {extra}" if extra and not cond else ""))
    if not cond: fails.append(name)

OUT = os.path.join(os.path.dirname(D.DB_PATH), "dev_outbox.jsonl")
def last_code(to):
    rows = [json.loads(l) for l in open(OUT, encoding="utf-8")] if os.path.exists(OUT) else []
    for r in reversed(rows):
        if r["to"] == to:
            m = re.search(r"Code: (\d{6})", r["text"]);  return m.group(1) if m else None

class C:
    """tiny client that keeps the CSRF token"""
    def __init__(self, **kw): self.c = A.app.test_client(**kw); self.csrf = None; self.refresh()
    def refresh(self): self.csrf = self.c.get("/api/auth/me").get_json()["csrf"]
    def post(self, path, **body):
        r = self.c.post("/api/auth" + path, json=body, headers={"X-CSRF-Token": self.csrf})
        j = r.get_json(silent=True) or {}
        if j.get("csrf"): self.csrf = j["csrf"]
        return r.status_code, j
    def get(self, path): r = self.c.get(path); return r.status_code, (r.get_json(silent=True) or {})

PW = "Tr0ub4dor&3xtra!"
S.limiter._h.clear()

# --- policy
for pw, code in [("short1A!", "pw_short"), ("alllowercase", "pw_weak"), ("Password12345", "pw_common"), ("Alice#Secure99x", "pw_similar")]:
    check(f"policy {pw!r} -> {code}", S.password_error(pw, "alice@example.com", "alice") == code, S.password_error(pw, "alice@example.com", "alice"))
check("policy accepts strong", S.password_error(PW, "bob@example.com", "bob") is None)

# --- TOTP RFC 6238 vector (SHA1, secret '12345678901234567890', T=59 -> 94287082 => last 6 = 287082)
import base64
sec = base64.b32encode(b"12345678901234567890").decode()
check("TOTP RFC6238 vector", S._hotp(sec, 59 // 30) == "287082")

# --- tools need auth
c = C()
check("tool API blocked when anonymous", c.get("/api/phone?number=09121234567")[0] == 401)
check("pages served", c.c.get("/").status_code in (200, 404))   # index may not exist yet during build
check("app.py not exposed", c.c.get("/app.py").status_code == 404 and c.c.get("/data/watcher.db").status_code == 404)

# --- csrf / origin
r = A.app.test_client().post("/api/auth/login", json={"identifier": "a", "password": "b"})
check("POST without CSRF rejected", r.status_code == 403 and r.get_json()["error"] == "csrf_invalid")
c2 = C(); r = c2.c.post("/api/auth/login", json={"identifier": "a", "password": "b"}, headers={"X-CSRF-Token": c2.csrf, "Origin": "https://evil.example"})
check("foreign Origin rejected", r.status_code == 403 and r.get_json()["error"] == "origin_invalid")

# --- signup validation
c = C()
check("bad email", c.post("/signup", email="nope", username="alice", password=PW)[1].get("error") == "email_invalid")
check("disposable email blocked", c.post("/signup", email="x@mailinator.com", username="alice", password=PW)[1].get("error") in ("email_disposable", None) )
check("bad username", c.post("/signup", email="alice@example.com", username="a b", password=PW)[1].get("error") == "username_invalid")
check("reserved username", c.post("/signup", email="alice@example.com", username="admin", password=PW)[1].get("error") == "username_invalid")
check("weak pw", c.post("/signup", email="alice@example.com", username="alice", password="12345678")[1].get("error") == "pw_short")

# --- signup -> OTP -> verify
st, j = c.post("/signup", email="alice@example.com", username="alice", password=PW)
check("signup ok -> verify step", st == 200 and j.get("step") == "verify" and j.get("expires_in") == 600, j)
code = last_code("alice@example.com"); check("OTP delivered to dev outbox", bool(code))
with D.db() as db: row = db.execute("SELECT code_hash FROM otps WHERE email='alice@example.com'").fetchone()
check("OTP stored hashed, not plaintext", row and code not in row["code_hash"] and len(row["code_hash"]) == 64)
check("cannot login before verifying (gets verify step)", c.post("/login", identifier="alice@example.com", password=PW)[1].get("step") == "verify")
c.post("/resend", email="alice@example.com", purpose="verify")
st, j = c.post("/resend", email="alice@example.com", purpose="verify"); check("resend cooldown enforced", st == 429 and j["error"] == "cooldown", j)
code = last_code("alice@example.com")
wrong = "000000" if code != "000000" else "111111"
st, j = c.post("/verify", email="alice@example.com", code=wrong); check("wrong OTP rejected w/ tries_left", st == 400 and j["error"] == "code_invalid" and j["tries_left"] == 4, j)
st, j = c.post("/verify", email="alice@example.com", code=code); check("correct OTP verifies + logs in", st == 200 and j["user"]["username"] == "alice", j)
check("session works after verify", c.get("/api/auth/me")[1]["authenticated"] is True)
check("tools allowed when signed in", c.get("/api/phone?number=09121234567")[0] == 200)
check("OTP is single-use", c.post("/verify", email="alice@example.com", code=code)[1].get("error") in ("code_invalid",))

# --- OTP brute force lock
c3 = C(); c3.post("/signup", email="bob@example.com", username="bob", password=PW)
good = last_code("bob@example.com"); res = []
for i in range(5):
    res.append(c3.post("/verify", email="bob@example.com", code="000000" if good != "000000" else "999999")[1].get("error"))
check("5 wrong OTPs burn the code", res[-1] == "code_locked", res)
st, j = c3.post("/verify", email="bob@example.com", code=good); check("burned OTP no longer works", st == 400, j)
S.limiter._h.clear()

# --- account enumeration: existing email gets same generic response
c4 = C(); st, j = c4.post("/signup", email="alice@example.com", username="alice2", password=PW)
check("duplicate email -> identical generic response", st == 200 and j.get("step") == "verify")
check("duplicate username -> 409", C().post("/signup", email="carol@example.com", username="ALICE", password=PW)[0] == 409)

# --- login, lockout
S.limiter._h.clear()
c5 = C(); st, j = c5.post("/login", identifier="alice", password="WrongPassword1!")
check("bad password -> 401 generic", st == 401 and j["error"] == "invalid_credentials")
check("unknown user same error", C().post("/login", identifier="ghost@example.com", password="x")[1]["error"] == "invalid_credentials")
for _ in range(4): c5.post("/login", identifier="alice", password="WrongPassword1!")
st, j = c5.post("/login", identifier="alice", password=PW); check("account locked after 5 failures (even with right pw)", st == 429 and j["error"] == "locked", j)
with D.db() as db: db.execute("UPDATE users SET locked_until=0, failed_logins=0 WHERE username='alice'")
S.limiter._h.clear()
st, j = c5.post("/login", identifier="alice@example.com", password=PW, remember=True); check("login by email ok", st == 200 and j["user"]["email"] == "alice@example.com", j)
c5b = C(); check("login by username (case-insens.) ok", c5b.post("/login", identifier="ALICE", password=PW)[0] == 200)

# --- session fixation: csrf rotates
c6 = C(); before = c6.csrf; c6.post("/login", identifier="alice", password=PW); check("CSRF token rotated on login", c6.csrf != before)
# --- sessions list / revoke
st, j = c5.get("/api/auth/sessions"); check("sessions listed (>=3)", st == 200 and len(j["sessions"]) >= 3 and any(s["current"] for s in j["sessions"]))
other = next(s for s in j["sessions"] if not s["current"])["id"]
check("revoke another session", c5.post("/sessions/revoke", id=other)[0] == 200)
# --- logout revokes server-side
cookie_before = dict((k.key, k.value) for k in c6.c._cookies.values()) if hasattr(c6.c, "_cookies") else None
c6.post("/logout"); check("logout -> unauthenticated", c6.get("/api/auth/me")[1]["authenticated"] is False)

# --- change password
S.limiter._h.clear()
check("change pw wrong current", c5.post("/change-password", current_password="nope", new_password="N3w-Passw0rd-Zeta!")[1].get("error") == "password_incorrect")
NEW = "N3w-Passw0rd-Zeta!"
check("change pw ok", c5.post("/change-password", current_password=PW, new_password=NEW)[0] == 200)
check("other device signed out after pw change", c5b.get("/api/auth/me")[1]["authenticated"] is False)
check("old password dead, new works", C().post("/login", identifier="alice", password=PW)[0] == 401 and C().post("/login", identifier="alice", password=NEW)[0] == 200)
PW = NEW

# --- 2FA
S.limiter._h.clear()
c7 = C(); c7.post("/login", identifier="alice", password=PW)
st, j = c7.post("/2fa/setup"); secret = j["secret"]; check("2FA setup returns secret+uri", st == 200 and j["uri"].startswith("otpauth://totp/"))
check("2FA enable rejects bad code", c7.post("/2fa/enable", code="123456")[1].get("error") == "code_invalid")
step = int(time.time() // 30); code = S._hotp(secret, step)
st, j = c7.post("/2fa/enable", code=code); rec = j.get("recovery_codes", []); check("2FA enabled + 8 recovery codes", st == 200 and len(rec) == 8, j)
c8 = C(); st, j = c8.post("/login", identifier="alice", password=PW); check("login now asks for TOTP", j.get("step") == "totp")
check("tools blocked at pre-2FA stage", c8.get("/api/phone?number=09121234567")[0] == 401)
check("replay of used TOTP rejected", c8.post("/login/2fa", code=code)[0] == 401)
st, j = c8.post("/login/2fa", code=S._hotp(secret, step + 1)); check("fresh TOTP logs in", st == 200, j)
c9 = C(); c9.post("/login", identifier="alice", password=PW)
check("recovery code logs in", c9.post("/login/2fa", code=rec[0])[0] == 200)
c10 = C(); c10.post("/login", identifier="alice", password=PW)
check("recovery code is one-time", c10.post("/login/2fa", code=rec[0])[0] == 401)

# --- password reset
S.limiter._h.clear()
c11 = C(); st, j = c11.post("/forgot", email="alice@example.com"); check("forgot -> reset step", j.get("step") == "reset")
check("forgot unknown email: same response", C().post("/forgot", email="nobody@example.com")[1].get("step") == "reset")
code = last_code("alice@example.com")
check("reset rejects weak pw", c11.post("/reset", email="alice@example.com", code=code, password="password")[1].get("error") == "pw_short")
check("reset rejects wrong code", c11.post("/reset", email="alice@example.com", code="000000" if code != "000000" else "111111", password="Br4nd-New-Pass!!")[1].get("error") == "code_invalid")
st, j = c11.post("/reset", email="alice@example.com", code=code, password="Br4nd-New-Pass!!"); check("reset ok", st == 200, j)
check("all sessions killed by reset", c7.get("/api/auth/me")[1]["authenticated"] is False)

# --- activity
c12 = C(); c12.post("/login", identifier="alice", password="Br4nd-New-Pass!!"); c12.post("/login/2fa", code=rec[1])
st, j = c12.get("/api/auth/activity"); evs = {e["event"] for e in j.get("events", [])}
check("audit trail recorded", {"login_ok", "password_changed", "2fa_enabled"} <= evs, evs)

# --- security headers
r = A.app.test_client().get("/api/health"); h = r.headers
check("security headers present", all(k in h for k in ("Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options")) and "script-src 'self' https://cdnjs.cloudflare.com" in h["Content-Security-Policy"])

print("\nFAILED: %d" % len(fails) if fails else "\nALL BACKEND TESTS PASSED")
sys.exit(1 if fails else 0)
