# -*- coding: utf-8 -*-
"""Security primitives: rate limiting, password policy, OTP hashing, TOTP (RFC 6238), recovery codes."""
import base64
import hashlib
import hmac
import re
import secrets
import struct
import threading
import time

# ---------------------------------------------------------------- rate limiter
class Limiter:
    """Sliding-window limiter, in-memory (fine for a single gunicorn worker)."""
    def __init__(self):
        self._h, self._l, self._n = {}, threading.Lock(), 0

    def hit(self, key: str, limit: int, window: int):
        now = time.time()
        with self._l:
            q = self._h.setdefault(key, [])
            cut = now - window
            while q and q[0] <= cut:
                q.pop(0)
            if len(q) >= limit:
                return False, int(q[0] + window - now) + 1
            q.append(now)
            self._n += 1
            if self._n % 500 == 0:
                for k in [k for k, v in self._h.items() if not v or v[-1] < now - 3600]:
                    self._h.pop(k, None)
            return True, 0


limiter = Limiter()

# ---------------------------------------------------------------- password policy
COMMON = set("""password passw0rd p@ssword p@ssw0rd qwerty qwertyuiop asdfgh asdfghjkl zxcvbnm letmein welcome admin administrator
login master dragon monkey football baseball iloveyou sunshine princess superman batman trustno1 shadow michael jennifer
abc123 abcdef abcd1234 changeme secret hello freedom whatever starwars computer internet google facebook instagram telegram
iran tehran irani mohammad ali reza hossein mehdi persian 123456 1234567 12345678 123456789 1234567890 0123456789 1q2w3e4r
1qaz2wsx qazwsx zaq12wsx 111111 000000 121212 654321 987654321 aaaaaa qwe123 q1w2e3r4 watcher watcherosint osint""".split())


def password_error(pw: str, email: str = "", username: str = ""):
    """Return an error code or None. Mirrors the checklist shown in the UI."""
    if not isinstance(pw, str) or len(pw) < 10:
        return "pw_short"
    if len(pw) > 128:
        return "pw_long"
    classes = sum(bool(re.search(p, pw)) for p in (r"[a-z]", r"[A-Z]", r"\d", r"[^A-Za-z0-9]"))
    if classes < 3 and len(pw) < 16:
        return "pw_weak"
    low = pw.lower()
    core = re.sub(r"[\d\W_]+$", "", low)
    if low in COMMON or core in COMMON or len(set(pw)) < 5:
        return "pw_common"
    local = (email or "").split("@")[0].lower()
    for part in (username.lower(), local):
        if len(part) >= 3 and part in low:
            return "pw_similar"
    return None


# ---------------------------------------------------------------- OTP
def new_code() -> str:
    return f"{secrets.randbelow(10 ** 6):06d}"


def hash_code(secret: str, email: str, purpose: str, code: str) -> str:
    return hmac.new(secret.encode(), f"{email}|{purpose}|{code}".encode(), hashlib.sha256).hexdigest()


def hash_token(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


# ---------------------------------------------------------------- TOTP (authenticator apps)
def new_totp_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")


def _hotp(secret_b32: str, counter: int, digits: int = 6) -> str:
    key = base64.b32decode(secret_b32 + "=" * (-len(secret_b32) % 8), casefold=True)
    h = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    o = h[-1] & 0x0F
    n = (struct.unpack(">I", h[o:o + 4])[0] & 0x7FFFFFFF) % (10 ** digits)
    return f"{n:0{digits}d}"


def verify_totp(secret_b32: str, code: str, last_step: int = 0, window: int = 1):
    """Return the matched time-step (store it to block replay) or None."""
    code = re.sub(r"\s", "", code or "")
    if not re.fullmatch(r"\d{6}", code):
        return None
    cur = int(time.time() // 30)
    for step in range(cur - window, cur + window + 1):
        if step > last_step and hmac.compare_digest(_hotp(secret_b32, step), code):
            return step
    return None


def otpauth_uri(secret_b32: str, account: str, issuer: str = "WatcherOsint") -> str:
    from urllib.parse import quote
    return f"otpauth://totp/{quote(issuer)}:{quote(account)}?secret={secret_b32}&issuer={quote(issuer)}&algorithm=SHA1&digits=6&period=30"


def new_recovery_codes(n: int = 8):
    return [f"{secrets.token_hex(3)}-{secrets.token_hex(3)}" for _ in range(n)]
