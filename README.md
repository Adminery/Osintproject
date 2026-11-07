# WatcherOsint v2 — Render (free)

One Flask service serves the website (`web/`) and the API (`/api/*`) from the same origin.

## Deploy
1. Replace the old repo contents with this folder (delete old root `*.html`, `email.py`, `.github/workflows`).
2. Render → New → Blueprint → select the repo. `SECRET_KEY` is generated automatically.
3. Set `BREVO_API_KEY` and `MAIL_FROM` (verify the sender address in Brevo) so OTP emails arrive.
   Without them, the app refuses signups with a clear message instead of silently failing.
4. Optional: `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`, callback URLs
   `<PUBLIC_URL>/api/auth/google/callback` and `<PUBLIC_URL>/api/auth/github/callback`.
5. Optional: `ALLOW_USER_PROXY=1` lets the username tool route through a user-supplied http(s) proxy (off by default).

## Local
    pip install -r requirements.txt
    ENV=development SECRET_KEY=dev python app.py      # http://127.0.0.1:5000
    # dev mode prints OTP codes to data/dev_outbox.jsonl (no email provider needed)
    ENV=development SECRET_KEY=dev python tests/test_backend.py

## Security model
- Email OTP (6 digits, HMAC-hashed, 10 min, 5 tries, resend cooldown) on signup and reset.
- scrypt passwords, policy blocks common/name-based passwords, lockout after 5 failures.
- Optional TOTP 2FA with replay protection and one-time recovery codes.
- Server-side sessions (listed and revocable in Settings), CSRF tokens, Origin checks, strict CSP, `__Host-` cookies.
- OSINT tools require a signed-in account.

## Free-tier caveats
- Service sleeps after ~15 min idle; first request is slow.
- Disk is ephemeral: the SQLite database resets on redeploy. For permanent accounts, use a persistent disk or Postgres.
