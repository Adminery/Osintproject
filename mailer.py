# -*- coding: utf-8 -*-
"""Outgoing email. Render's free tier blocks SMTP ports, so HTTPS APIs come first.

Providers (first configured wins):
  BREVO_API_KEY   + MAIL_FROM="WatcherOsint <you@gmail.com>"   (free 300/day, verify ONE sender address, no domain needed)
  RESEND_API_KEY  + MAIL_FROM                                   (needs a verified domain to mail other people)
  SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS + MAIL_FROM           (paid Render / VPS)
Without a provider: ENV=development writes data/dev_outbox.jsonl; production only logs if OTP_LOG_FALLBACK=1.
"""
import email.utils
import html
import json
import os
import time

import requests

from db import DB_PATH

DEV = os.environ.get("ENV", "production") == "development"


def provider():
    if os.environ.get("BREVO_API_KEY"):
        return "brevo"
    if os.environ.get("RESEND_API_KEY"):
        return "resend"
    if os.environ.get("SMTP_HOST"):
        return "smtp"
    return None


def delivery_possible():
    """True when a code can reach a human (real provider, dev mailbox, or explicit log fallback)."""
    return bool(provider()) or DEV or os.environ.get("OTP_LOG_FALLBACK", "0") == "1"


def _sender():
    name, addr = email.utils.parseaddr(os.environ.get("MAIL_FROM", ""))
    if provider() == "resend" and not addr:
        return "WatcherOsint", "onboarding@resend.dev"
    return (name or "WatcherOsint"), addr


def send_mail(to: str, subject: str, text: str, html_body: str) -> bool:
    prov = provider()
    name, addr = _sender()
    try:
        if prov == "brevo":
            if not addr:
                print("[MAIL] MAIL_FROM is required for Brevo")
                return False
            r = requests.post("https://api.brevo.com/v3/smtp/email",
                              headers={"api-key": os.environ["BREVO_API_KEY"], "accept": "application/json"},
                              json={"sender": {"name": name, "email": addr}, "to": [{"email": to}],
                                    "subject": subject, "htmlContent": html_body, "textContent": text}, timeout=15)
            ok = r.status_code < 300
            if not ok:
                print(f"[MAIL] brevo {r.status_code}: {r.text[:200]}")
            return ok
        if prov == "resend":
            r = requests.post("https://api.resend.com/emails",
                              headers={"Authorization": "Bearer " + os.environ["RESEND_API_KEY"]},
                              json={"from": email.utils.formataddr((name, addr)), "to": [to], "subject": subject,
                                    "html": html_body, "text": text}, timeout=15)
            ok = r.status_code < 300
            if not ok:
                print(f"[MAIL] resend {r.status_code}: {r.text[:200]}")
            return ok
        if prov == "smtp":
            import smtplib
            from email.message import EmailMessage
            m = EmailMessage()
            m["Subject"], m["To"], m["From"] = subject, to, email.utils.formataddr((name, addr or os.environ.get("SMTP_USER", "")))
            m.set_content(text)
            m.add_alternative(html_body, subtype="html")
            s = smtplib.SMTP(os.environ["SMTP_HOST"], int(os.environ.get("SMTP_PORT", "587")), timeout=15)
            s.starttls()
            if os.environ.get("SMTP_USER"):
                s.login(os.environ["SMTP_USER"], os.environ.get("SMTP_PASS", ""))
            s.send_message(m)
            s.quit()
            return True
    except Exception as e:  # network/provider errors must never crash a request
        print(f"[MAIL] {prov} error: {type(e).__name__}: {e}")
        return False

    # no provider
    if DEV:
        box = os.path.join(os.path.dirname(DB_PATH), "dev_outbox.jsonl")
        os.makedirs(os.path.dirname(box), exist_ok=True)
        with open(box, "a", encoding="utf-8") as f:
            f.write(json.dumps({"ts": time.time(), "to": to, "subject": subject, "text": text}, ensure_ascii=False) + "\n")
        return True
    if os.environ.get("OTP_LOG_FALLBACK", "0") == "1":
        print(f"[MAIL:log-only] to={to} | {subject} | {text}")
        return True
    return False


_PURPOSE = {
    "verify": ("Verify your email", "تایید ایمیل", "Use this code to finish creating your account.", "برای تکمیل ساخت حساب از این کد استفاده کنید."),
    "reset": ("Reset your password", "بازیابی رمز عبور", "Use this code to choose a new password.", "برای انتخاب رمز عبور جدید از این کد استفاده کنید."),
}


def _card(title_en, title_fa, body_en, body_fa, big=None):
    e = html.escape
    code_html = (f'<div style="font:700 34px/1 Consolas,Menlo,monospace;letter-spacing:10px;color:#22d3ee;'
                 f'background:#071019;border:1px solid #164e63;border-radius:12px;padding:18px 12px;text-align:center;margin:22px 0">{e(big)}</div>') if big else ""
    return f"""<!doctype html><html><body style="margin:0;background:#05070d;padding:24px;font-family:Segoe UI,Tahoma,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0b1322;border:1px solid #1e3a5f;border-radius:16px">
<tr><td style="padding:28px 28px 8px;color:#e6edf7">
<div style="font-weight:700;letter-spacing:.5px;color:#22d3ee;font-size:15px">WatcherOsint</div>
<h1 style="font-size:20px;margin:14px 0 6px;color:#fff">{e(title_en)} · {e(title_fa)}</h1>
<p style="margin:0;color:#a8b8d0;font-size:14px;line-height:1.7">{e(body_en)}<br><span dir="rtl">{e(body_fa)}</span></p>
{code_html}
<p style="color:#8da0ba;font-size:12px;line-height:1.7;margin:0 0 24px">Never share this code. We will never ask for it.<br><span dir="rtl">این کد را با هیچ‌کس به اشتراک نگذارید.</span></p>
</td></tr></table></td></tr></table></body></html>"""


def send_otp(to: str, code: str, purpose: str, minutes: int = 10) -> bool:
    t_en, t_fa, b_en, b_fa = _PURPOSE.get(purpose, _PURPOSE["verify"])
    b_en += f" It expires in {minutes} minutes."
    b_fa += f" این کد تا {minutes} دقیقه معتبر است."
    text = f"WatcherOsint — {t_en} / {t_fa}\n\nCode: {code}\n{b_en}\n{b_fa}\n\nNever share this code."
    return send_mail(to, f"{code} is your WatcherOsint code · کد شما", text, _card(t_en, t_fa, b_en, b_fa, big=code))


def send_notice(to: str, title_en: str, title_fa: str, body_en: str, body_fa: str) -> bool:
    if not (provider() or DEV):
        return False
    return send_mail(to, f"WatcherOsint · {title_en}", f"{title_en} / {title_fa}\n\n{body_en}\n{body_fa}",
                     _card(title_en, title_fa, body_en, body_fa))
