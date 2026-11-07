/* WatcherOsint front end — the approved design, wired to the real API.
   Vanilla JS, same origin, no inline handlers (CSP-safe). */
(function () {
  'use strict';

  var PAGE = document.body.getAttribute('data-page') || 'phone';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var H = document.documentElement;

  /* ---------- small helpers ---------- */
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); return v; } catch (e) { return null; } }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); return v; } catch (e) { return null; } }
  var prefs = {
    lang: ls('lang') || (/^fa/i.test(navigator.language || '') ? 'fa' : 'en'),
    theme: ls('th') || 'auto',
    accent: parseInt(ls('ac') || '0', 10) || 0,
    calm: ls('calm') === '1'
  };
  var SW = [['#b88429', '#15110a'], ['#1f9d8e', '#04211d'], ['#6a52c8', '#ffffff'], ['#c8405f', '#ffffff']];
  function L(en, fa) { return prefs.lang === 'fa' ? fa : en; }
  function N(x) { var s = String(x); return prefs.lang === 'fa' ? s.replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }) : s; }
  function lt(v) { return '<bdi dir="ltr">' + esc(N(v)) + '</bdi>'; }
  function fmtDate(ts) {
    if (!ts) return '—';
    try { return new Intl.DateTimeFormat(prefs.lang === 'fa' ? 'fa-IR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts * 1000)); }
    catch (e) { return new Date(ts * 1000).toISOString(); }
  }
  function ini(n) { return (String(n || 'W').match(/[A-Za-z\u0600-\u06FF0-9]/g) || ['W']).slice(0, 2).join('').toUpperCase(); }
  function safeUrl(u) { return typeof u === 'string' && /^https:\/\//.test(u) ? u : ''; }
  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || ''); }

  /* ---------- icons (the design's own paths) ---------- */
  var IC = {
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 8l9 6 9-6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
    out: '<path d="M9 4H5a2 2 0 00-2 2v12a2 2 0 002 2h4M16 8l4 4-4 4M20 12H9"/>',
    go: '<path d="M7 17L17 7M8 7h9v9"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>'
  };
  function ico(n, s, cls) { s = s || 20; return '<svg class="' + (cls || '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || '') + '</svg>'; }
  var LOGO = '<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M16 2l12 7v14l-12 7L4 23V9z"/><path d="M8 16c2.5-4 13.5-4 16 0-2.5 4-13.5 4-16 0z"/><circle cx="16" cy="16" r="2.6" fill="currentColor"/></svg>';
  var S = function (b, d) { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="' + (d ? 'none' : 'currentColor') + '" stroke="' + (d ? 'currentColor' : 'none') + '" stroke-width="2" stroke-linecap="round" aria-hidden="true">' + b + '</svg>'; };
  var TGI = S('<path d="M21.5 3.5L2.6 10.8c-.9.4-.9 1.2 0 1.5l4.8 1.5 1.9 5.6c.2.6.9.7 1.3.3l2.7-2.5 4.9 3.6c.7.4 1.3.2 1.5-.7l3-15.7c.2-1-.4-1.5-1.2-1.1zM8.8 13.2l9.6-6.1-7.4 7.2z"/>');
  var SPI = S('<circle cx="12" cy="12" r="9"/><path d="M7.5 9.5c3-1 6.5-.7 9 .8M8 12.5c2.5-.7 5-.5 7.5.8M8.5 15.3c2-.5 4-.3 5.8.6"/>', 1);
  var IGI = S('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>', 1);

  /* platform badges: the design's brand colours; the icon is a letter mark where no logo is bundled */
  var BR = { Telegram: ['#2aabee', TGI], WhatsApp: ['#25d366', 'Wa'], 'بله': ['#2fb9a4', 'Ba'], 'ایتا': ['#f37021', 'Ei'],
    'روبیکا': ['#7b3fe4', 'Ru'], 'گپ': ['#f5a623', 'Gp'], iGap: ['#0a84ff', 'iG'], Instagram: ['#e1306c', IGI],
    X: ['var(--tx)', 'X'], Reddit: ['#ff4500', 'R'], TikTok: ['#ee1d52', 'Tk'], GitHub: ['var(--tx)', 'Gh'], GitLab: ['#fc6d26', 'Gl'],
    Steam: ['#66c0f4', 'St'], Twitch: ['#9146ff', 'Tw'], Aparat: ['#ed145b', 'Ap'], Google: ['#4285f4', 'G'], Gravatar: ['#1e8cbe', 'Gr'],
    Spotify: ['#1db954', SPI], Pinterest: ['#e60023', 'P'], Discord: ['#5865f2', 'Dc'], Dropbox: ['#0061ff', 'Db'], Adobe: ['#fa0f00', 'Ai'] };
  function badge(name) {
    var b = BR[name] || ['#8a94ad', esc(String(name || '?').slice(0, 2))];
    return '<i class="lg" style="--c:' + b[0] + '" aria-hidden="true">' + b[1] + '</i>';
  }

  /* ---------- API ---------- */
  var csrf = null, me = null;
  function api(path, opt, retried) {
    opt = opt || {};
    var m = (opt.method || 'GET').toUpperCase(), h = { Accept: 'application/json' }, body;
    if (m !== 'GET') { h['Content-Type'] = 'application/json'; h['X-CSRF-Token'] = csrf || ''; body = JSON.stringify(opt.body || {}); }
    return fetch(path, { method: m, headers: h, body: body, credentials: 'same-origin' }).then(function (r) {
      return r.json().catch(function () { return { success: false, error: 'server_error' }; }).then(function (j) {
        if (j.csrf) csrf = j.csrf;
        if (j.error === 'csrf_invalid' && !retried && m !== 'GET') return loadMe().then(function () { return api(path, opt, true); });
        return j;
      });
    }).catch(function () { return { success: false, error: 'network' }; });
  }
  function loadMe() {
    return api('/api/auth/me').then(function (r) { me = r.authenticated ? r.user : null; if (r.csrf) csrf = r.csrf; return me; });
  }
  var ERR = {
    network: ['Can’t reach the server.', 'به سرور وصل نشد.'], rate_limited: ['Too many attempts. Wait a moment.', 'تلاش‌های زیاد. کمی صبر کنید.'],
    invalid_credentials: ['Wrong email/username or password.', 'ایمیل/نام‌کاربری یا رمز اشتباه است.'],
    locked: ['Too many failed attempts. The account is locked for a while.', 'تلاش‌های ناموفق زیاد؛ حساب موقتاً قفل شد.'],
    code_invalid: ['That code is not right.', 'کد درست نیست.'], code_expired: ['The code expired. Request a new one.', 'کد منقضی شد؛ کد جدید بگیرید.'],
    code_locked: ['Too many wrong codes. Request a new one.', 'تلاش اشتباه زیاد؛ کد جدید بگیرید.'],
    email_invalid: ['Enter a valid email.', 'ایمیل معتبر وارد کنید.'], email_disposable: ['Disposable emails are not allowed.', 'ایمیل موقت مجاز نیست.'],
    username_invalid: ['Username: 3–24 letters, digits, dot, dash or underscore.', 'نام‌کاربری: ۳ تا ۲۴ حرف، عدد، نقطه، خط تیره یا زیرخط.'],
    username_taken: ['That username is taken.', 'این نام‌کاربری گرفته شده.'],
    pw_short: ['Password must be at least 10 characters.', 'رمز باید حداقل ۱۰ کاراکتر باشد.'],
    pw_weak: ['Use 3 of: lowercase, uppercase, digits, symbols — or 16+ characters.', 'از ۳ مورد استفاده کنید: حروف کوچک، بزرگ، عدد، نماد — یا ۱۶ کاراکتر.'],
    pw_common: ['That password is too common.', 'این رمز خیلی رایج است.'], pw_similar: ['Password must not contain your name or email.', 'رمز نباید شامل نام یا ایمیل باشد.'],
    mail_unavailable: ['Email delivery is not set up on the server yet.', 'ارسال ایمیل روی سرور هنوز تنظیم نشده.'],
    mail_failed: ['Could not send the email. Try again shortly.', 'ارسال ایمیل ناموفق بود؛ کمی بعد تلاش کنید.'],
    cooldown: ['Please wait before requesting another code.', 'قبل از درخواست کد جدید کمی صبر کنید.'],
    password_incorrect: ['Current password is incorrect.', 'رمز فعلی درست نیست.'],
    twofa_already: ['Two-step verification is already on.', 'تأیید دومرحله‌ای از قبل فعال است.'],
    twofa_not_enabled: ['Two-step verification is off.', 'تأیید دومرحله‌ای خاموش است.'],
    twofa_setup_missing: ['Start the setup first.', 'ابتدا راه‌اندازی را شروع کنید.'],
    session_expired: ['Your sign-in expired. Start again.', 'ورودتان منقضی شد؛ دوباره شروع کنید.'],
    auth_required: ['Please log in first.', 'ابتدا وارد شوید.'], csrf_invalid: ['Security token expired. Try again.', 'توکن امنیتی منقضی شد؛ دوباره تلاش کنید.'],
    invalid_input: ['That input is not valid.', 'ورودی معتبر نیست.'], origin_invalid: ['Request blocked for your safety.', 'درخواست برای امنیت شما مسدود شد.']
  };
  function errText(res) {
    if (!res) return L('Something went wrong.', 'مشکلی پیش آمد.');
    if (res.error === 'rate_limited' && res.retry_after) return L('Too many attempts. Try again in ' + res.retry_after + 's.', 'تلاش زیاد؛ ' + N(res.retry_after) + ' ثانیه دیگر دوباره امتحان کنید.');
    var e = ERR[res.error];
    return e ? L(e[0], e[1]) : L('Something went wrong.', 'مشکلی پیش آمد.');
  }
  function pwProblem(p, email, user) {
    var low = (p || '').toLowerCase();
    var cls = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(function (r) { return r.test(p); }).length;
    if (p.length < 10) return 'pw_short';
    if (cls < 3 && p.length < 16) return 'pw_weak';
    if (['password', 'password1', '1234567890', 'qwertyuiop', 'iloveyou', 'letmein'].indexOf(low) >= 0) return 'pw_common';
    var local = (email || '').split('@')[0].toLowerCase();
    if ((local.length >= 3 && low.indexOf(local) >= 0) || (user && user.length >= 3 && low.indexOf(user.toLowerCase()) >= 0)) return 'pw_similar';
    return null;
  }

  /* ---------- toast ---------- */
  var tt = 0;
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('s');
    clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('s'); }, 2400);
  }

  /* ---------- appearance (stored on this device) ---------- */
  function applyPrefs() {
    H.lang = prefs.lang; H.dir = prefs.lang === 'fa' ? 'rtl' : 'ltr';
    if (prefs.theme === 'auto') H.removeAttribute('data-theme'); else H.setAttribute('data-theme', prefs.theme);
    H.dataset.eff = prefs.theme === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : prefs.theme;
    H.style.setProperty('--ac', SW[prefs.accent][0]);
    H.style.setProperty('--onac', SW[prefs.accent][1]);
    document.body.classList.toggle('calm', prefs.calm);
  }

  /* ---------- shell ---------- */
  var NAV = [['phone', '/phone', 'phone', 'Phone lookup', 'جستجوی شماره'], ['email', '/email', 'email', 'Email', 'ایمیل'],
    ['username', '/username', 'user', 'Username', 'نام‌کاربری'], ['settings', '/settings', 'gear', 'Settings', 'تنظیمات']];
  function header() {
    var box = me
      ? '<div class="pl"><span class="av clay" style="width:46px;height:46px;border-radius:16px">' + esc(ini(me.username)) + '</span><div><b>' + esc(me.username) + '</b><small dir="ltr" style="text-align:start">' + esc(me.email) + '</small></div></div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap"><span class="tag f clay">' + L('Account', 'حساب') + '</span>' + (me.totp_enabled ? '<span class="tag f clay">2FA</span>' : '') + '</div>'
        + '<a class="up gh" href="/settings">' + ico('gear', 18) + ' ' + L('Settings', 'تنظیمات') + '</a>'
        + '<a class="up gh" href="/history">' + ico('clock', 18) + ' ' + L('History', 'تاریخچه') + '</a>'
        + '<button class="up gh dng" type="button" data-a="logout">' + ico('out', 18) + ' ' + L('Log out', 'خروج') + '</button>'
      : '<div class="pl"><span class="bl clay">' + LOGO + '</span><div><b>' + L('Welcome to WatcherOsint', 'به WatcherOsint خوش آمدید') + '</b><small>' + L('Log in to run lookups and save history.', 'برای ذخیره تاریخچه وارد شوید.') + '</small></div></div>'
        + '<a class="btn" href="/login">' + ico('key', 18) + ' ' + L('Log in', 'ورود') + '</a><a class="up gh" href="/signup">' + L('Create account', 'ساخت حساب') + '</a>';
    var btn = me ? '<button class="ib clay" type="button" data-a="acct" aria-haspopup="true" aria-expanded="false" aria-label="' + L('Account', 'حساب کاربری') + '">' + esc(ini(me.username)) + '</button>'
      : '<a class="ib up" href="/login" aria-label="' + L('Log in', 'ورود') + '">' + ico('key', 22) + '</a>';
    return '<header id="top" class="up"><a class="brand" href="/phone" aria-label="WatcherOsint"><span class="bl clay">' + LOGO + '</span><span class="bn">Watcher<b>Osint</b><small>' + L('Intelligence suite', 'مجموعه اطلاعاتی') + '</small></span></a>'
      + '<span class="pill in sm"><i class="dot"></i>' + lt(200) + '+ ' + L('sources online', 'منبع آنلاین') + '</span><span class="sp"></span>'
      + '<button class="lang in sm" type="button" data-a="lang" data-l="' + prefs.lang + '" aria-label="' + L('Switch language', 'تغییر زبان') + '"><span>EN</span><span>فا</span></button>'
      + '<button class="ib up" type="button" data-a="theme" aria-label="' + L('Switch theme', 'تغییر پوسته') + '"><span class="moonI">' + ico('moon', 22) + '</span><span class="sunI">' + ico('sun', 22) + '</span></button>'
      + '<div class="acct">' + btn + '<div class="pop up">' + box + '</div></div></header>';
  }
  function sidebar() {
    return '<aside id="side" class="up">' + NAV.map(function (n) {
      var on = PAGE === n[0] || (PAGE === 'history' && n[0] === 'settings');
      return '<a class="nav ' + (on ? 'in on' : 'up') + ' sm" href="' + n[1] + '"' + (on ? ' aria-current="page"' : '') + '>' + ico(n[2], 22, n[2] === 'gear' ? 'gear' : '') + '<span>' + esc(L(n[3], n[4])) + '</span></a>';
    }).join('') + '</aside>';
  }
  function head(t, s, r) { return '<div class="hd"><div><h1>' + t + '</h1><p>' + s + '</p></div>' + (r || '') + '</div>'; }
  function hero() {
    return '<section class="herob up"><div><h1>' + L('Watch every trace of a number, email or username', 'هر ردپایی از شماره، ایمیل و نام‌کاربری را زیر نظر بگیرید') + '</h1><p>' + L('Phone, email and username lookups in one calm workspace.', 'جستجوی شماره، ایمیل و نام‌کاربری در یک فضای کاری آرام.') + '</p></div>'
      + '<div class="vis" aria-hidden="true"><div class="rw in" style="width:178px;position:absolute;inset-inline-start:36px;top:14px"><div class="radar in sm"><span class="bl clay">' + LOGO + '</span><i style="top:20%;left:66%"></i><i style="top:66%;left:22%;animation-delay:.8s"></i></div></div><span class="blob" style="width:58px;height:58px;inset-inline-end:4px;top:4px;--cc:#1f9d8e"></span><span class="blob" style="width:42px;height:42px;inset-inline-start:0;bottom:16px;--cc:#6a52c8;animation-delay:-2s"></span><span class="blob" style="width:30px;height:30px;inset-inline-end:36px;bottom:0;--cc:#c8405f;animation-delay:-3.5s"></span></div></section>';
  }
  function bar(kind, value, ph, label) {
    return '<form class="bar in deep" data-form="' + kind + '" id="bar-' + kind + '" novalidate><label class="sr-only" for="q-' + kind + '">' + esc(label) + '</label><input id="q-' + kind + '" dir="ltr" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="254" value="' + esc(value || '') + '" placeholder="' + esc(ph) + '"><button class="btn" type="submit">' + esc(label) + '</button></form>';
  }
  function row(k, v) { return '<div class="row"><span>' + esc(k) + '</span><span>' + v + '</span></div>'; }
  function ring(p, id) {
    var C = 326.7, off = C * (1 - Math.max(0, Math.min(100, p)) / 100);
    return '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" fill="none" stroke="var(--ln)" stroke-width="10"/><circle id="' + id + '" cx="60" cy="60" r="52" fill="none" stroke="var(--ac)" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + off + '"/></svg>';
  }
  function statusTag(st) {
    if (st === 'FOUND' || st === true) return '<span class="tag f clay">' + L('Found', 'پیدا شد') + '</span>';
    if (st === 'NOT_FOUND' || st === false) return '<span class="tag m">' + L('Not found', 'پیدا نشد') + '</span>';
    return '<span class="tag m">' + L('Unknown', 'نامشخص') + '</span>';
  }

  /* ---------- results: phone ---------- */
  var res = { phone: null, email: null, username: null };
  var uFilter = 'found', region = 'all';
  
  function renderPhone(d) {
    var b = d.basic || {}, v = d.validation || {}, sp = d.spam || {}, ml = d.messenger_links || {}, ir = d.iranian || {};
    var score = Number(sp.score), valid = v.valid !== false && b.valid !== false;
    var level = isNaN(score) ? '' : score >= 7 ? L('High risk', 'ریسک بالا') : score >= 4 ? L('Moderate', 'متوسط') : L('Low risk', 'ریسک کم');
    var links = Object.keys(ml).map(function (k) {
      var href = safeUrl(ml[k]);
      return '<a class="up sm" href="' + esc(href || '#') + '"' + (href ? ' target="_blank" rel="noopener noreferrer"' : ' aria-disabled="true" tabindex="-1"') + '>' + badge(k) + '<span>' + esc(k) + '</span></a>';
    }).join('');

    // اولویت با اطلاعات دقیق جدول ایرانی (ir) است، اگر نبود از basic می‌خوانیم
    var carrierText = ir.carrier || b.carrier || '—';
    var regionsText = ir.regions ? ir.regions.join('، ') : (b.region || '—');
    var lineTypeText = ir.line_type || b.line_type || '—';
    var prefixText = ir.prefix || '—';

    return '<div class="g2"><section class="card up"><div class="rh"><h3>' + L('Number report', 'گزارش شماره') + '</h3><span class="tag ' + (valid ? 'f clay' : 'm') + '">' + (valid ? L('Valid', 'معتبر') : L('Invalid', 'نامعتبر')) + '</span></div>'
      + row(L('Country', 'کشور'), esc(b.country || '—') + (b.country_code ? ' (+' + lt(b.country_code) + ')' : ''))
      + row(L('Carrier', 'اپراتور'), esc(carrierText))
      + (prefixText !== '—' ? row(L('Prefix', 'پیش‌شماره'), lt(prefixText)) : '')
      + row(L('Regions', 'منطقه‌ها'), esc(regionsText))
      + row(L('Line type', 'نوع خط'), esc(lineTypeText))
      + row(L('Timezone', 'منطقه زمانی'), lt((b.timezones || []).join(', ') || '—'))
      + row('E.164', lt(b.e164 || '—'))
      + row(L('National', 'ملی'), lt(b.national || '—'))
      + '</section><div class="col"><section class="card up gw"><div class="gc in">' + ring(isNaN(score) ? 0 : score * 10, 'gc') + '<b>' + lt(isNaN(score) ? '—' : score) + '/10</b></div><div><h3>' + L('Spam score', 'امتیاز اسپم') + '</h3><p style="color:var(--mu);margin:6px 0 0">' + esc(level) + ' · ' + esc((sp.reasons || []).join('، ') || L('Normal', 'عادی')) + '</p></div></section>'
      + '<section class="card up"><h3>' + L('Open in messenger', 'باز کردن در پیام‌رسان') + '</h3><p style="color:var(--mu);margin:6px 0 0;font-size:12px">' + L('Opens the chat or profile of this number if that app has it.', 'اگر این شماره در آن پیام‌رسان ثبت باشد، گفتگو یا پروفایلش باز می‌شود.') + '</p><div class="mg">' + links + '</div></section></div></div>';
  }

  /* ---------- results: email ---------- */
  function renderEmail(d) {
    var v = d.validation || {}, mx = d.mx || {}, sd = d.spf_dmarc || {}, g = d.gravatar || {}, list = d.results || [];
    var found = list.filter(function (r) { return r.exists === true; }).length;
    var notf = list.filter(function (r) { return r.exists === false; }).length;
    var checked = list.filter(function (r) { return r.exists === true || r.exists === false; }).length;
    var pct = list.length ? Math.round(checked / list.length * 100) : 0;
    var cards = list.map(function (r, i) {
      var href = safeUrl(r.homepage);
      return '<article class="res up sm" style="--i:' + i + '"><div class="l1">' + badge(r.name) + '<div><b>' + esc(r.name) + '</b><small>' + esc(r.category || '') + '</small></div>' + statusTag(r.exists) + '</div>'
        + '<div class="l3"><span>' + esc(r.error ? L('Check unavailable', 'بررسی در دسترس نیست') : '') + '</span>' + (href ? '<a class="lk" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + L('Open', 'باز کردن') + ' ' + ico('go', 14) + '</a>' : '') + '</div></article>';
    }).join('');
    return '<div class="g2 eq"><section class="card up"><div class="rh"><h3>' + L('Address details', 'جزئیات نشانی') + '</h3><span class="tag ' + (v.valid === false ? 'm' : 'f clay') + '">' + (v.valid === false ? L('Invalid format', 'قالب نامعتبر') : L('Format valid', 'قالب معتبر')) + '</span></div>'
      + row(L('Domain', 'دامنه'), lt(v.domain || '—'))
      + row(L('Mail server (MX)', 'سرور ایمیل'), esc(mx.has_mx ? (mx.provider || L('Responds', 'پاسخ می‌دهد')) : L('No MX records', 'رکورد MX ندارد')))
      + row('SPF', esc(sd.spf ? L('Present', 'موجود') : L('Missing', 'ندارد')))
      + row('DMARC', esc(sd.dmarc ? L('Present', 'موجود') : L('Missing', 'ندارد')))
      + row(L('Disposable domain', 'دامنه‌ی موقت'), esc((d.domain_info || {}).is_disposable ? L('Yes', 'بله') : L('No', 'خیر')))
      + row('Gravatar', esc(g.found ? L('Profile found', 'پروفایل پیدا شد') : L('No profile', 'پروفایلی نیست')))
      + '</section><section class="card up gw"><div class="rg in">' + ring(pct, 'ering') + '<b>' + lt(list.length) + '</b></div><div><h3>' + L('Sites checked', 'سایت‌های بررسی‌شده') + '</h3><p style="margin:6px 0 0;color:var(--mu)">' + esc(L(found + ' found, ' + notf + ' not found', N(found) + ' پیدا شد، ' + N(notf) + ' پیدا نشد')) + '</p></div></section></div>'
      + '<div class="cards">' + (cards || '<p class="empty">' + L('No modules returned results for this address.', 'هیچ ماژولی برای این نشانی نتیجه نداد.') + '</p>') + '</div>';
  }

  /* ---------- results: username ---------- */
  function renderUser(d) {
    var list = d.results || [], cats = [];
    list.forEach(function (r) { if (r.category && cats.indexOf(r.category) < 0) cats.push(r.category); });
    var shown = list.filter(function (r) {
      if (uFilter === 'all') return true;
      if (uFilter === 'found') return r.status === 'FOUND';
      if (uFilter === 'notfound') return r.status === 'NOT_FOUND';
      if (uFilter === 'unknown') return r.status !== 'FOUND' && r.status !== 'NOT_FOUND';
      return r.category === uFilter;
    });
    var chips = [['found', L('Found', 'پیدا شد')], ['notfound', L('Not found', 'پیدا نشد')], ['unknown', L('Unknown', 'نامشخص')], ['all', L('All', 'همه')]].concat(cats.map(function (c) { return [c, c]; }));
    var chipHtml = '<div class="seg2 in sm" role="group" aria-label="' + L('Filter', 'فیلتر') + '">' + chips.map(function (c) {
      return '<button type="button" data-a="ufilter" data-v="' + esc(c[0]) + '" class="' + (uFilter === c[0] ? 'on' : '') + '" aria-pressed="' + (uFilter === c[0]) + '">' + esc(c[1]) + '</button>';
    }).join('') + '</div>';
    var cards = shown.map(function (r, i) {
      var href = safeUrl(r.url), f = r.status === 'FOUND';
      return '<article class="res up sm" style="--i:' + i + '"><div class="l1">' + badge(r.platform) + '<div><b>' + esc(r.platform) + '</b><small dir="ltr" style="text-align:start">' + esc(r.url || '') + '</small></div>' + statusTag(r.status) + '</div>'
        + '<div class="l3"><span>' + esc(r.category || '') + '</span>' + (href && f ? '<a class="lk" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + L('Open', 'باز کردن') + ' ' + ico('go', 14) + '</a>' : '') + '</div></article>';
    }).join('');
    return '<div class="chipbar">' + chipHtml + '<span class="tag m">' + lt(d.found_count || 0) + ' / ' + lt(d.checked || list.length) + ' ' + L('found', 'پیدا شد') + '</span></div>'
      + '<div class="cards">' + (cards || '<p class="empty">' + L('Nothing matches this filter.', 'موردی با این فیلتر نیست.') + '</p>') + '</div>';
  }

  /* ---------- lookups ---------- */
  function runLookup(kind, q, fromUrl) {
    var out = $('#out'), bar2 = $('#bar-' + kind), btn = bar2 && bar2.querySelector('button');
    var url = kind === 'phone' ? '/api/phone?number=' + encodeURIComponent(q)
      : kind === 'email' ? '/api/email?email=' + encodeURIComponent(q) + '&iranian=1'
      : '/api/username?u=' + encodeURIComponent(q) + '&region=' + encodeURIComponent(region);
    if (btn) btn.disabled = true;
    if (bar2) bar2.classList.add('run');
    out.innerHTML = '<div class="skl" style="display:grid"><i></i><i></i><i></i><i></i></div>';
    if (!fromUrl) history.replaceState(null, '', location.pathname + '?q=' + encodeURIComponent(q));
    return api(url).then(function (r) {
      if (btn) btn.disabled = false;
      if (bar2) bar2.classList.remove('run');
      
      if (r.error === 'auth_required') { 
        out.innerHTML = '<div class="msg err">' + esc(L('Please log in to use the API.', 'برای استفاده از API وارد شوید.')) + '</div>';
        return; 
      }
      if (!r.success) { out.innerHTML = '<div class="msg err">' + esc(errText(r)) + '</div>'; return; }
      res[kind] = r;
      if (kind === 'phone') out.innerHTML = renderPhone(r);
      if (kind === 'email') out.innerHTML = renderEmail(r);
      if (kind === 'username') { uFilter = 'found'; out.innerHTML = renderUser(r); }
      var summary = kind === 'username' ? (r.found_count || 0) + '/' + (r.checked || 0) : '';
      
      if (me) {
        api('/api/history', { method: 'POST', body: { kind: kind, query: q, summary: summary } });
      } else {
        toast(L('Result generated. Log in to save it in history.', 'نتیجه دریافت شد. برای ذخیره در تاریخچه وارد شوید.'));
      }
    });
  }
  function emptyOut(kind) {
    var txt = { phone: L('Enter a number to see its carrier, region, risk score and messenger links.', 'یک شماره وارد کنید تا اپراتور، منطقه، امتیاز ریسک و لینک پیام‌رسان‌ها را ببینید.'),
      email: L('Enter an email to check its domain and the sites that use it.', 'یک ایمیل وارد کنید تا دامنه و سایت‌های مرتبط را ببینید.'),
      username: L('Enter a username to search the platforms.', 'یک نام‌کاربری وارد کنید تا پلتفرم‌ها را جستجو کنید.') };
    return '<p class="empty">' + txt[kind] + '</p>';
  }

  /* ---------- pages ---------- */
  function pagePhone() {
    return hero() + head(L('Phone intelligence', 'اطلاعات شماره تلفن'), L('Carrier, region, risk score and messenger reach for any number', 'اپراتور، منطقه، امتیاز ریسک و دسترسی پیام‌رسان‌ها برای هر شماره'), '<span class="tag m up sm">' + ico('clock', 14) + ' Asia/Tehran</span>')
      + bar('phone', '', '+98 911 000 0000', L('Run lookup', 'جستجو')) + '<div id="out">' + (res.phone ? renderPhone(res.phone) : emptyOut('phone')) + '</div>';
  }
  function pageEmail() {
    return head(L('Email scan', 'اسکن ایمیل'), L('Checks many sites for accounts tied to an address', 'سایت‌های زیادی را برای حساب‌های مرتبط با یک نشانی بررسی می‌کند'))
      + bar('email', '', 'name@example.com', L('Scan', 'اسکن')) + '<div id="out">' + (res.email ? renderEmail(res.email) : emptyOut('email')) + '</div>';
  }
  function pageUsername() {
    var regs = [['all', L('All', 'همه')], ['iran', L('Iran', 'ایران')], ['global', L('Global', 'جهانی')]];
    return head(L('Username hunt', 'شکار نام‌کاربری'), L('Searches Iranian and international apps and sites', 'برنامه‌ها و سایت‌های ایرانی و خارجی را جستجو می‌کند'))
      + bar('username', '', 'username', L('Hunt username', 'جستجو'))
      + '<div class="chipbar"><span style="color:var(--mu)">' + L('Region', 'منطقه') + '</span><div class="seg2 in sm" role="group">' + regs.map(function (r) {
        return '<button type="button" data-a="region" data-v="' + r[0] + '" class="' + (region === r[0] ? 'on' : '') + '" aria-pressed="' + (region === r[0]) + '">' + r[1] + '</button>';
      }).join('') + '</div></div><div id="out">' + (res.username ? renderUser(res.username) : emptyOut('username')) + '</div>';
  }
  var hist = [];
  function histRows() {
    if (!hist.length) return '<p class="empty">' + L('No lookups yet. Run a search and it will appear here.', 'هنوز جستجویی نیست؛ یک جستجو انجام دهید تا اینجا دیده شود.') + '</p>';
    var path = { phone: '/phone', email: '/email', username: '/username' };
    var name = { phone: L('Phone', 'شماره'), email: L('Email', 'ایمیل'), username: L('Username', 'نام‌کاربری') };
    return hist.map(function (h) {
      return '<div class="hrow"><span class="lg" style="--c:var(--ac)">' + ico(h.kind === 'phone' ? 'phone' : h.kind === 'email' ? 'email' : 'user', 18) + '</span>'
        + '<div><span class="mono">' + esc(h.query) + '</span><small>' + esc(name[h.kind] || h.kind) + ' · ' + esc(fmtDate(h.ts)) + (h.summary ? ' · ' + esc(h.summary) : '') + '</small></div>'
        + '<a class="up gh sm" href="' + (path[h.kind] || '/phone') + '?q=' + encodeURIComponent(h.query) + '">' + L('Run again', 'اجرای دوباره') + '</a></div>';
    }).join('');
  }
  function pageHistory() {
    return '<a class="up gh sm" href="/settings" style="margin-bottom:18px">' + ico('back', 18) + ' ' + L('Settings', 'تنظیمات') + '</a>'
      + head(L('History', 'تاریخچه'), L('Your recent lookups, stored for this account', 'جستجوهای اخیر شما، برای این حساب ذخیره می‌شوند'), '<button class="up gh dng" type="button" data-a="clear-hist">' + L('Clear all', 'پاک کردن همه') + '</button>')
      + '<section class="card up" id="hlist">' + L('<p class="empty">Loading…</p>', '<p class="empty">در حال بارگذاری…</p>') + '</section>';
  }
  function loadHistory() {
    return api('/api/history').then(function (r) { hist = r.success ? r.items : []; var el = $('#hlist'); if (el) el.innerHTML = histRows(); });
  }

  /* ---------- settings ---------- */
  var acct = { sessions: [], activity: [], setup: null };
  function sessHtml() {
    if (!acct.sessions.length) return '<p class="empty">—</p>';
    return acct.sessions.map(function (s) {
      return '<div class="hrow"><div><b>' + esc((s.ua || L('Device', 'دستگاه')).slice(0, 70)) + '</b><small>' + esc(s.ip || '') + ' · ' + esc(fmtDate(s.last_seen)) + '</small></div>'
        + (s.current ? '<span class="tag f clay">' + L('This device', 'این دستگاه') + '</span>' : '<button class="up gh sm dng" type="button" data-a="sess-revoke" data-v="' + esc(s.id) + '">' + L('Revoke', 'لغو') + '</button>') + '</div>';
    }).join('');
  }
  function actHtml() {
    if (!acct.activity.length) return '<p class="empty">' + L('No activity yet.', 'هنوز فعالیتی نیست.') + '</p>';
    var nm = { signup: ['Account created', 'حساب ساخته شد'], verify_ok: ['Email verified', 'ایمیل تأیید شد'], login_ok: ['Signed in', 'ورود'], login_fail: ['Failed sign-in', 'ورود ناموفق'],
      locked: ['Account locked', 'حساب قفل شد'], logout: ['Signed out', 'خروج'], password_reset: ['Password reset', 'بازنشانی رمز'], password_changed: ['Password changed', 'تغییر رمز'],
      '2fa_enabled': ['2FA turned on', '2FA فعال شد'], '2fa_disabled': ['2FA turned off', '2FA خاموش شد'], sessions_revoked: ['Sessions signed out', 'لغو نشست‌ها'],
      recovery_code_used: ['Recovery code used', 'کد بازیابی استفاده شد'], login_fail_2fa: ['Failed 2FA code', 'کد 2FA ناموفق'] };
    return acct.activity.map(function (e) {
      var n = nm[e.event] || [e.event, e.event];
      return '<div class="hrow"><div><b>' + esc(L(n[0], n[1])) + '</b><small>' + esc(fmtDate(e.ts)) + '</small></div><span class="mono">' + esc(e.ip || '') + '</span></div>';
    }).join('');
  }
  function twofaArea(u) {
    if (u.totp_enabled) {
      return '<details><summary style="cursor:pointer;font-weight:700">' + L('Turn off two-step verification', 'خاموش کردن تأیید دومرحله‌ای') + '</summary>'
        + '<form class="fm" data-form="2fa-off" style="margin-top:12px">' + (u.has_password ? '<label class="lb">' + L('Password', 'رمز عبور') + '<input name="password" type="password" class="fld in sm" dir="ltr" autocomplete="current-password"></label>' : '')
        + '<label class="lb">' + L('Code from your app', 'کد اپ احراز هویت') + '<input name="code" class="fld in sm" dir="ltr" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label><button class="up gh dng" type="submit">' + L('Turn off', 'خاموش کن') + '</button></form></details>';
    }
    if (acct.setup) {
      return '<div class="fm"><p style="margin:0">' + L('Add this key to your authenticator app, then enter the 6-digit code it shows.', 'این کلید را به اپ احراز هویت اضافه کنید و کد ۶ رقمی‌اش را وارد کنید.') + '</p>'
        + '<div class="secret">' + esc(acct.setup.secret) + '</div><a class="up gh sm" href="' + esc(acct.setup.uri) + '">' + L('Open in authenticator app', 'باز کردن در اپ احراز هویت') + '</a>'
        + '<form class="fm" data-form="2fa-on"><label class="lb">' + L('Code', 'کد') + '<input name="code" class="fld in sm" dir="ltr" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label><button class="btn" type="submit">' + L('Confirm & enable', 'تأیید و فعال‌سازی') + '</button></form></div>';
    }
    return '<p style="color:var(--mu);margin:0 0 14px">' + L('Add an authenticator app. Each sign-in will then ask for a 6-digit code.', 'با یک اپ احراز هویت، هر ورود کد ۶ رقمی می‌خواهد.') + '</p>'
      + '<button class="btn" type="button" data-a="2fa-start">' + L('Set up 2FA', 'راه‌اندازی 2FA') + '</button>';
  }
  function settingsHtml(u) {
    var acc = '<section class="card up"><div class="rh"><h3>' + L('Account', 'حساب کاربری') + '</h3></div>'
      + row(L('Username', 'نام‌کاربری'), esc(u.username)) + row(L('Email', 'ایمیل'), lt(u.email))
      + row(L('Account created', 'تاریخ دقیق ساخت حساب'), esc(fmtDate(u.created_at)))
      + row(L('Password last changed', 'آخرین تغییر رمز'), esc(u.has_password ? fmtDate(u.pw_changed_at) : L('Not applicable', 'ندارد')))
      + row(L('Sign-in method', 'روش ورود'), esc(u.provider || L('Email & password', 'ایمیل و رمز عبور'))) + '</section>';
    var tf = '<section class="card up"><div class="rh"><h3>' + L('Two-step verification', 'تأیید دومرحله‌ای') + '</h3><span class="tag ' + (u.totp_enabled ? 'f clay' : 'm') + '">' + (u.totp_enabled ? L('On', 'فعال') : L('Off', 'خاموش')) + '</span></div>' + twofaArea(u) + '<div id="recovery"></div></section>';
    var pw = u.has_password ? '<section class="card up"><div class="rh"><h3>' + L('Change password', 'تغییر رمز عبور') + '</h3></div><form class="fm" data-form="pw">'
      + '<label class="lb">' + L('Current password', 'رمز فعلی') + '<input name="current" type="password" class="fld in sm" dir="ltr" autocomplete="current-password" required></label>'
      + '<label class="lb">' + L('New password', 'رمز جدید') + '<input name="next" type="password" class="fld in sm" dir="ltr" autocomplete="new-password" minlength="10" required></label>'
      + '<p class="hint">' + L('At least 10 characters, with 3 of: a–z, A–Z, 0–9, symbols. Other devices will be signed out.', 'حداقل ۱۰ کاراکتر و ۳ مورد از: a–z، A–Z، ۰–۹، نماد. دستگاه‌های دیگر خارج می‌شوند.') + '</p>'
      + '<button class="btn" type="submit">' + L('Update password', 'به‌روزرسانی رمز') + '</button></form></section>' : '';
    var se = '<section class="card up"><div class="rh"><h3>' + L('Active sessions', 'نشست‌های فعال') + '</h3><button class="up gh sm" type="button" data-a="sess-all">' + L('Sign out other devices', 'خروج از دستگاه‌های دیگر') + '</button></div><div id="sess">' + sessHtml() + '</div></section>';
    var ac = '<section class="card up"><div class="rh"><h3>' + L('Security activity', 'فعالیت امنیتی') + '</h3></div><div id="act">' + actHtml() + '</div></section>';
    var ap = '<section class="card up"><div class="rh"><h3>' + L('Appearance', 'ظاهر') + '</h3></div>'
      + '<div class="sr"><div><b>' + L('Theme', 'پوسته') + '</b><small>' + L('Auto follows your device', 'خودکار با دستگاه شما هماهنگ است') + '</small></div><div class="seg in sm" role="group">'
      + [['auto', L('Auto', 'خودکار')], ['light', L('Light', 'روشن')], ['dark', L('Dark', 'تیره')]].map(function (o) { return '<button type="button" data-a="theme-set" data-v="' + o[0] + '" class="' + (prefs.theme === o[0] ? 'on' : '') + '" aria-pressed="' + (prefs.theme === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div></div>'
      + '<div class="sr"><div><b>' + L('Language', 'زبان') + '</b><small>' + L('Changes the whole app, including direction', 'کل برنامه و جهت نوشتار را تغییر می‌دهد') + '</small></div><div class="seg in sm" role="group">'
      + [['en', 'English'], ['fa', 'فارسی']].map(function (o) { return '<button type="button" data-a="lang-set" data-v="' + o[0] + '" class="' + (prefs.lang === o[0] ? 'on' : '') + '" aria-pressed="' + (prefs.lang === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div></div>'
      + '<div class="sr"><div><b>' + L('Accent color', 'رنگ تأکید') + '</b></div><div class="sw">' + SW.map(function (c, i) {
        return '<button type="button" data-a="accent" data-v="' + i + '" class="' + (i === prefs.accent ? 'on' : '') + '" style="--s:' + c[0] + '" aria-label="' + L('Accent ', 'رنگ ') + N(i + 1) + '" aria-pressed="' + (i === prefs.accent) + '"></button>';
      }).join('') + '</div></div>'
      + '<div class="sr"><div><b>' + L('Reduce motion', 'کاهش حرکت') + '</b><small>' + L('Turn off animations', 'خاموش کردن انیمیشن‌ها') + '</small></div><label class="tg"><input type="checkbox" data-a="calm" aria-label="' + L('Reduce motion', 'کاهش حرکت') + '"' + (prefs.calm ? ' checked' : '') + '><i></i></label></div></section>';
    var hd2 = '<section class="card up"><div class="rh"><h3>' + L('History and data', 'تاریخچه و داده‌ها') + '</h3></div>'
      + '<div class="sr"><div><b>' + L('Search history', 'تاریخچه جستجو') + '</b><small>' + L('Stored on the server for this account', 'برای این حساب روی سرور ذخیره می‌شود') + '</small></div><a class="up gh sm" href="/history">' + ico('clock', 16) + ' ' + L('Open', 'باز کردن') + '</a></div>'
      + '<div class="sr"><div><b>' + L('Clear all history', 'پاک‌کردن همه‌ی تاریخچه') + '</b><small>' + L('This cannot be undone', 'این کار قابل بازگشت نیست') + '</small></div><button class="up gh sm dng" type="button" data-a="clear-hist">' + L('Clear', 'پاک کردن') + '</button></div></section>';
    return head(L('Settings', 'تنظیمات'), L('Account, security and appearance', 'حساب، امنیت و ظاهر')) + '<div class="cols">' + acc + tf + pw + se + ac + ap + hd2 + '</div>';
  }
  function loadAccount() {
    return Promise.all([api('/api/auth/sessions'), api('/api/auth/activity')]).then(function (r) {
      acct.sessions = r[0].success ? r[0].sessions : [];
      acct.activity = r[1].success ? r[1].events : [];
      var s = $('#sess'); if (s) s.innerHTML = sessHtml();
      var a = $('#act'); if (a) a.innerHTML = actHtml();
    });
  }
  function refreshSettings() {
    return loadMe().then(function () { if (me && PAGE === 'settings') { $('#main').innerHTML = settingsHtml(me); loadAccount(); } });
  }

  /* ---------- login / signup / OTP / 2FA / reset (design panel) ---------- */
  var au = { view: 'main', tab: 'login', email: '', remember: true, msg: '', kind: 'err' };
  function otpBoxes() {
    var s = ''; for (var i = 0; i < 6; i++) s += '<input inputmode="numeric" maxlength="1" autocomplete="' + (i ? 'off' : 'one-time-code') + '" aria-label="' + L('Digit ', 'رقم ') + N(i + 1) + '" data-otp="' + i + '">';
    return '<div class="otp" role="group">' + s + '</div>';
  }
  function authBody() {
    var v = au.view, t = au.tab;
    if (v === 'main' && t === 'login') {
      return '<form class="fm" data-form="login" novalidate><label class="lb">' + L('Email or username', 'ایمیل یا نام‌کاربری') + '<input id="li-e" name="id" dir="ltr" class="fld in sm" autocomplete="username" autocapitalize="none" required></label>'
        + '<label class="lb">' + L('Password', 'رمز عبور') + '<span class="pw"><input id="li-p" name="pw" type="password" dir="ltr" class="fld in sm" autocomplete="current-password" required><button type="button" class="up sm" data-a="eye">' + L('Show', 'نمایش') + '</button></span></label>'
        + '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><label class="ck"><input name="remember" type="checkbox" checked>' + L('Keep me signed in for 14 days', 'تا ۱۴ روز واردم نگه دار') + '</label><button type="button" class="lk2" data-a="view" data-v="forgot">' + L('Forgot password?', 'رمز را فراموش کرده‌اید؟') + '</button></div>'
        + '<button class="btn" type="submit">' + L('Log in', 'ورود') + '</button></form>';
    }
    if (v === 'main' && t === 'signup') {
      return '<form class="fm" data-form="signup" novalidate><label class="lb">' + L('Username', 'نام‌کاربری') + '<input name="username" dir="ltr" class="fld in sm" autocomplete="username" autocapitalize="none" maxlength="24" required></label>'
        + '<label class="lb">' + L('Email', 'ایمیل') + '<input name="email" type="email" dir="ltr" class="fld in sm" autocomplete="email" maxlength="254" required></label>'
        + '<label class="lb">' + L('Password', 'رمز عبور') + '<span class="pw"><input name="pw" type="password" dir="ltr" class="fld in sm" autocomplete="new-password" minlength="10" required><button type="button" class="up sm" data-a="eye">' + L('Show', 'نمایش') + '</button></span></label>'
        + '<span class="hint">' + L('At least 10 characters, with 3 of: a–z, A–Z, 0–9, symbols (or 16+ characters).', 'حداقل ۱۰ کاراکتر و ۳ مورد از: a–z، A–Z، ۰–۹، نماد (یا ۱۶ کاراکتر).') + '</span>'
        + '<label class="ck"><input name="remember" type="checkbox" checked>' + L('Keep me signed in for 14 days', 'تا ۱۴ روز واردم نگه دار') + '</label>'
        + '<button class="btn" type="submit">' + L('Create account & send code', 'ساخت حساب و ارسال کد') + '</button></form>';
    }
    if (v === 'otp') {
      return '<div class="done"><h2>' + L('Check your email', 'ایمیلتان را بررسی کنید') + '</h2><p style="color:var(--mu);margin:0">' + L('We sent a 6-digit code to ', 'یک کد ۶ رقمی به ') + lt(au.email) + L('.', ' فرستادیم.') + '</p></div>'
        + '<form class="fm" data-form="otp" data-kind="verify" novalidate>' + otpBoxes() + '<button class="btn" type="submit">' + L('Verify & continue', 'تأیید و ادامه') + '</button></form>'
        + '<div class="chipbar"><button type="button" class="lk2" data-a="resend">' + L('Resend code', 'ارسال دوباره‌ی کد') + '</button><button type="button" class="lk2" data-a="view" data-v="main">' + L('Use a different email', 'استفاده از ایمیل دیگر') + '</button></div>';
    }
    if (v === 'totp') {
      return '<div class="done"><h2>' + L('Two-step verification', 'تأیید دومرحله‌ای') + '</h2><p style="color:var(--mu);margin:0">' + L('Enter the 6-digit code from your authenticator app.', 'کد ۶ رقمی اپ احراز هویت را وارد کنید.') + '</p></div>'
        + '<form class="fm" data-form="otp" data-kind="totp" novalidate>' + otpBoxes() + '<button class="btn" type="submit">' + L('Verify', 'تأیید') + '</button></form>';
    }
    if (v === 'forgot') {
      return '<h2>' + L('Reset your password', 'بازیابی رمز عبور') + '</h2><form class="fm" data-form="forgot" novalidate><label class="lb">' + L('Email', 'ایمیل') + '<input name="email" type="email" dir="ltr" class="fld in sm" autocomplete="email" required></label><button class="btn" type="submit">' + L('Send code', 'ارسال کد') + '</button></form>'
        + '<div class="chipbar"><button type="button" class="lk2" data-a="view" data-v="main">' + L('Back to log in', 'بازگشت به ورود') + '</button></div>';
    }
    if (v === 'reset') {
      return '<h2>' + L('Choose a new password', 'رمز جدید انتخاب کنید') + '</h2><p style="color:var(--mu);margin:0">' + L('Enter the code we emailed to ', 'کدی که به ') + lt(au.email) + L(' and choose a new password.', ' فرستادیم را وارد کنید و رمز جدید بگذارید.') + '</p>'
        + '<form class="fm" data-form="otp" data-kind="reset" novalidate>' + otpBoxes() + '<label class="lb">' + L('New password', 'رمز جدید') + '<input name="pw" type="password" dir="ltr" class="fld in sm" autocomplete="new-password" minlength="10" required></label><button class="btn" type="submit">' + L('Update password', 'به‌روزرسانی رمز') + '</button></form>'
        + '<div class="chipbar"><button type="button" class="lk2" data-a="resend">' + L('Resend code', 'ارسال دوباره‌ی کد') + '</button></div>';
    }
    return '<div class="done"><h2>' + L('You are in', 'وارد شدید') + '</h2><p style="color:var(--mu);margin:0">' + L('Redirecting to your workspace…', 'در حال انتقال به فضای کاری…') + '</p></div>';
  }
  function authPanel() {
    var tabs = au.view === 'main' ? '<div class="seg in sm" role="tablist"><button type="button" role="tab" data-a="tab" data-v="login" class="' + (au.tab === 'login' ? 'on' : '') + '" aria-selected="' + (au.tab === 'login') + '">' + L('Log in', 'ورود') + '</button><button type="button" role="tab" data-a="tab" data-v="signup" class="' + (au.tab === 'signup' ? 'on' : '') + '" aria-selected="' + (au.tab === 'signup') + '">' + L('Create account', 'ساخت حساب') + '</button></div>' : '';
    var msg = au.msg ? '<div class="' + (au.kind === 'ok' ? 'msg ok' : 'msg err') + '" role="alert">' + esc(au.msg) + '</div>' : '';
    return '<section id="auth"><div class="hero2"><div class="rw in"><div class="radar in sm"><span class="bl clay" style="width:64px;height:64px;border-radius:22px">' + LOGO + '</span><i style="top:22%;left:68%"></i><i style="top:64%;left:24%;animation-delay:.8s"></i><i style="top:74%;left:70%;animation-delay:1.5s"></i></div></div>'
      + '<h2>' + L('Your workspace for every digital trace', 'فضای کاری شما برای هر ردپای دیجیتال') + '</h2><p>' + L('Save reports, sync settings and pick up where you left off.', 'گزارش‌ها را ذخیره کنید، تنظیمات را همگام کنید و از همان‌جا که مانده‌اید ادامه دهید.') + '</p></div>'
      + '<div class="panel up">' + tabs + msg + authBody() + '</div></section>';
  }
  function authMsg(text, kind) { au.msg = text || ''; au.kind = kind || 'err'; renderLogin(); }
  function renderLogin() {
    $('#root').innerHTML = header() + authPanel();
    var f = $('#auth input[data-otp="0"]') || $('#auth input[name="id"], #auth input[name="username"]');
    if (f) f.focus();
  }
  function goNext() {
    au.view = 'done'; renderLogin();
    var n = new URLSearchParams(location.search).get('next') || '/phone';
    if (!/^\/[A-Za-z0-9_\/]*$/.test(n) || n.indexOf('//') === 0) n = '/phone';
    setTimeout(function () { location.replace(n); }, 500);
  }
  function otpCode(form) { return $$('[data-otp]', form).map(function (i) { return i.value; }).join(''); }

  /* ---------- form submit ---------- */
  function onSubmit(form) {
    var kind = form.getAttribute('data-form'), fd = {};
    $$('input[name]', form).forEach(function (i) { fd[i.name] = i.type === 'checkbox' ? i.checked : i.value.trim(); });

    if (kind === 'phone' || kind === 'email' || kind === 'username') {
      var q = ($('#q-' + kind).value || '').trim();
      if (!q) return toast(L('Enter a value first.', 'اول یک مقدار وارد کنید.'));
      if (kind === 'email' && !isEmail(q)) return toast(L('Enter a valid email.', 'ایمیل معتبر وارد کنید.'));
      return runLookup(kind, q, false);
    }
    if (kind === 'login') {
      if (!fd.id || !fd.pw) return authMsg(L('Fill in both fields.', 'هر دو فیلد را پر کنید.'));
      au.remember = !!fd.remember;
      return api('/api/auth/login', { method: 'POST', body: { identifier: fd.id, password: fd.pw, remember: au.remember } }).then(function (r) {
        if (!r.success) return authMsg(errText(r));
        if (r.step === 'verify') { au.email = r.email || fd.id; au.view = 'otp'; return authMsg(L('Your email is not verified yet. We sent a code.', 'ایمیلتان هنوز تأیید نشده؛ کد فرستادیم.'), 'ok'); }
        if (r.step === 'totp') { au.view = 'totp'; return authMsg('', 'ok'); }
        me = r.user; if (r.csrf) csrf = r.csrf; goNext();
      });
    }
    if (kind === 'signup') {
      var em = (fd.email || '').toLowerCase();
      if (!isEmail(em)) return authMsg(L('Enter a valid email.', 'ایمیل معتبر وارد کنید.'));
      var bad = pwProblem(fd.pw || '', em, fd.username || '');
      if (bad) return authMsg(errText({ error: bad }));
      au.remember = !!fd.remember; au.email = em;
      return api('/api/auth/signup', { method: 'POST', body: { email: em, username: fd.username, password: fd.pw } }).then(function (r) {
        if (!r.success) return authMsg(errText(r));
        au.view = 'otp'; authMsg(L('We sent a code to your email.', 'کد به ایمیلتان فرستاده شد.'), 'ok');
      });
    }
    if (kind === 'forgot') {
      var fe = (fd.email || '').toLowerCase();
      if (!isEmail(fe)) return authMsg(L('Enter a valid email.', 'ایمیل معتبر وارد کنید.'));
      return api('/api/auth/forgot', { method: 'POST', body: { email: fe } }).then(function (r) {
        if (!r.success) return authMsg(errText(r));
        au.email = fe; au.view = 'reset'; authMsg(L('If this email has an account, a code is on its way.', 'اگر این ایمیل حساب دارد، کد در راه است.'), 'ok');
      });
    }
    if (kind === 'otp') {
      var code = otpCode(form), k = form.getAttribute('data-kind');
      if (code.length !== 6) return authMsg(L('Enter all 6 digits.', 'هر ۶ رقم را وارد کنید.'));
      if (k === 'verify') return api('/api/auth/verify', { method: 'POST', body: { email: au.email, code: code, remember: au.remember } }).then(function (r) {
        if (!r.success) return authMsg(errText(r));
        me = r.user; if (r.csrf) csrf = r.csrf; goNext();
      });
      if (k === 'totp') return api('/api/auth/login/2fa', { method: 'POST', body: { code: code } }).then(function (r) {
        if (!r.success) return authMsg(errText(r));
        me = r.user; if (r.csrf) csrf = r.csrf; goNext();
      });
      if (k === 'reset') {
        var np = fd.pw || '', weak = pwProblem(np, au.email, '');
        if (weak) return authMsg(errText({ error: weak }));
        return api('/api/auth/reset', { method: 'POST', body: { email: au.email, code: code, password: np } }).then(function (r) {
          if (!r.success) return authMsg(errText(r));
          au.view = 'main'; au.tab = 'login'; authMsg(L('Password updated. Log in with the new one.', 'رمز تغییر کرد؛ با رمز جدید وارد شوید.'), 'ok');
        });
      }
    }
    if (kind === 'pw') {
      return api('/api/auth/change-password', { method: 'POST', body: { current_password: fd.current, new_password: fd.next } }).then(function (r) {
        if (!r.success) return toast(errText(r));
        toast(L('Password updated. Other devices were signed out.', 'رمز تغییر کرد؛ دستگاه‌های دیگر خارج شدند.'));
        refreshSettings();
      });
    }
    if (kind === '2fa-on') {
      return api('/api/auth/2fa/enable', { method: 'POST', body: { code: fd.code } }).then(function (r) {
        if (!r.success) return toast(errText(r));
        acct.setup = null;
        return loadMe().then(function () {
          if (me && PAGE === 'settings') { $('#main').innerHTML = settingsHtml(me); loadAccount(); var rc = $('#recovery'); if (rc) rc.innerHTML = recHtml(r.recovery_codes || []); }
          toast(L('Two-step verification is on.', 'تأیید دومرحله‌ای فعال شد.'));
        });
      });
    }
    if (kind === '2fa-off') {
      return api('/api/auth/2fa/disable', { method: 'POST', body: { password: fd.password || '', code: fd.code } }).then(function (r) {
        if (!r.success) return toast(errText(r));
        toast(L('Two-step verification is off.', 'تأیید دومرحله‌ای خاموش شد.')); refreshSettings();
      });
    }
  }
  function recHtml(codes) {
    return '<div class="fm" style="margin-top:12px"><h3>' + L('Recovery codes (shown once)', 'کدهای بازیابی (فقط یک‌بار نشان داده می‌شوند)') + '</h3><p class="hint">' + L('Store them safely. Each works once if you lose your phone.', 'جای امنی نگه دارید؛ اگر گوشی را گم کنید هر کد یک‌بار کار می‌کند.') + '</p><div class="codes2">' + codes.map(esc).join('<br>') + '</div></div>';
  }

  /* ---------- clicks ---------- */
  function onClick(el, act, v) {
    if (act === 'lang') { ls('lang', prefs.lang === 'en' ? 'fa' : 'en'); return location.reload(); }
    if (act === 'lang-set') { ls('lang', v); return location.reload(); }
    if (act === 'theme') { prefs.theme = H.dataset.eff === 'dark' ? 'light' : 'dark'; ls('th', prefs.theme); return applyPrefs(), rerenderAppearance(); }
    if (act === 'theme-set') { prefs.theme = v; ls('th', v); applyPrefs(); return rerenderAppearance(); }
    if (act === 'accent') { prefs.accent = parseInt(v, 10); ls('ac', String(prefs.accent)); applyPrefs(); return rerenderAppearance(); }
    if (act === 'acct') { var box = el.parentNode, open = !box.classList.contains('open'); box.classList.toggle('open', open); el.setAttribute('aria-expanded', String(open)); return; }
    if (act === 'logout') return api('/api/auth/logout', { method: 'POST' }).then(function () { me = null; location.href = '/login'; });
    if (act === 'eye') { var i = el.previousElementSibling, s = i.type === 'password'; i.type = s ? 'text' : 'password'; el.textContent = s ? L('Hide', 'پنهان') : L('Show', 'نمایش'); return; }
    if (act === 'tab') { au.tab = v; au.view = 'main'; au.msg = ''; return renderLogin(); }
    if (act === 'view') { au.view = v; au.msg = ''; return renderLogin(); }
    if (act === 'resend') {
      var purpose = au.view === 'reset' ? 'reset' : 'verify';
      return api('/api/auth/resend', { method: 'POST', body: { email: au.email, purpose: purpose } }).then(function (r) {
        authMsg(r.success ? L('A new code is on its way.', 'کد جدید در راه است.') : errText(r), r.success ? 'ok' : 'err');
      });
    }
    if (act === 'ufilter') { uFilter = v; if (res.username) $('#out').innerHTML = renderUser(res.username); return; }
    if (act === 'region') { region = v; $$('[data-a="region"]').forEach(function (b) { var on = b.getAttribute('data-v') === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); return; }
    if (act === 'clear-hist') return api('/api/history', { method: 'DELETE' }).then(function (r) {
      if (!r.success) return toast(errText(r));
      hist = []; var l = $('#hlist'); if (l) l.innerHTML = histRows(); toast(L('History cleared.', 'تاریخچه پاک شد.'));
    });
    if (act === '2fa-start') return api('/api/auth/2fa/setup', { method: 'POST' }).then(function (r) {
      if (!r.success) return toast(errText(r));
      acct.setup = { secret: r.secret, uri: r.uri }; $('#main').innerHTML = settingsHtml(me); loadAccount();
    });
    if (act === 'sess-revoke') return api('/api/auth/sessions/revoke', { method: 'POST', body: { id: v } }).then(function (r) { if (!r.success) return toast(errText(r)); toast(L('Session signed out.', 'نشست خارج شد.')); loadAccount(); });
    if (act === 'sess-all') return api('/api/auth/sessions/revoke', { method: 'POST', body: { id: 'all' } }).then(function (r) { if (!r.success) return toast(errText(r)); toast(L('Other devices signed out.', 'دستگاه‌های دیگر خارج شدند.')); loadAccount(); });
  }
  function rerenderAppearance() { if (PAGE === 'settings' && me) $('#main').innerHTML = settingsHtml(me); else renderShellAgain(); }
  function renderShellAgain() { $('#root').innerHTML = header() + '<div id="shell">' + sidebar() + '<main id="main">' + pageHtml() + '</main></div>'; }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.acct')) $$('.acct.open').forEach(function (x) { x.classList.remove('open'); });
    var el = e.target.closest('[data-a]');
    if (!el || el.tagName === 'INPUT') return;
    if (el.getAttribute('aria-disabled') === 'true') { e.preventDefault(); return; }
    e.preventDefault();
    onClick(el, el.getAttribute('data-a'), el.getAttribute('data-v'));
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.getAttribute && t.getAttribute('data-a') === 'calm') { prefs.calm = t.checked; ls('calm', t.checked ? '1' : '0'); applyPrefs(); }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault(); onSubmit(f);
  });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.matches && t.matches('input[data-otp]')) {
      var i = parseInt(t.getAttribute('data-otp'), 10);
      t.value = t.value.replace(/\D/g, '').slice(-1);
      if (t.value && i < 5) { var nx = t.parentNode.querySelector('[data-otp="' + (i + 1) + '"]'); if (nx) nx.focus(); }
      var f = t.closest('form');
      if (otpCode(f).length === 6) f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.target.matches && e.target.matches('input[data-otp]') && e.key === 'Backspace' && !e.target.value) {
      var i = parseInt(e.target.getAttribute('data-otp'), 10);
      if (i > 0) { var pv = e.target.parentNode.querySelector('[data-otp="' + (i - 1) + '"]'); if (pv) { pv.value = ''; pv.focus(); e.preventDefault(); } }
    }
    if (e.key === 'Escape') $$('.acct.open').forEach(function (x) { x.classList.remove('open'); });
  });
  document.addEventListener('paste', function (e) {
    var t = e.target;
    if (!(t.matches && t.matches('input[data-otp]'))) return;
    var txt = ((e.clipboardData || window.clipboardData).getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!txt) return;
    e.preventDefault();
    var f = t.closest('form');
    $$('[data-otp]', f).forEach(function (el, k) { el.value = txt.charAt(k) || ''; });
    if (txt.length === 6) f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  });

  /* ---------- pages ---------- */
  function pageHtml() {
    if (PAGE === 'phone') return pagePhone();
    if (PAGE === 'email') return pageEmail();
    if (PAGE === 'username') return pageUsername();
    if (PAGE === 'history') return pageHistory();
    if (PAGE === 'settings') return settingsHtml(me);
    return '';
  }
  function splash() {
    var sp = $('#splash'); if (!sp) return;
    if (ss('splashed') === '1') { sp.classList.add('off'); return; }
    ss('splashed', '1'); setTimeout(function () { sp.classList.add('off'); }, 900);
  }
  function boot() {
    applyPrefs(); splash();
    
    // صفحاتی که نیازی به لاگین ندارند (برای رفع مشکل لاگین اجباری)
    var publicPages = ['phone', 'email', 'username']; 
    
    loadMe().then(function () {
      if (PAGE === 'login') {
        if (me) { var n = new URLSearchParams(location.search).get('next') || '/phone'; return location.replace(n); }
        au.tab = /signup/.test(location.pathname) ? 'signup' : 'login';
        return renderLogin();
      }
      
      // اگر صفحه محافظت‌شده بود و لاگین نبود (فقط برای صفحات تاریخچه و تنظیمات)
      if (!me && (PAGE === 'settings' || PAGE === 'history')) {
        return location.replace('/login?next=' + encodeURIComponent(location.pathname + location.search));
      }

      $('#root').innerHTML = header() + '<div id="shell">' + sidebar() + '<main id="main">' + pageHtml() + '</main></div>';
      if (PAGE === 'phone' || PAGE === 'email' || PAGE === 'username') {
        var q = new URLSearchParams(location.search).get('q');
        if (q) { var inp = $('#q-' + PAGE); if (inp) inp.value = q; runLookup(PAGE, q, true); }
      }
      if (PAGE === 'history') loadHistory();
      if (PAGE === 'settings') loadAccount();
    });
  }
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (prefs.theme === 'auto') applyPrefs(); });
  boot();
})();
