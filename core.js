/* WatcherOsint core: safe DOM builder, API client (CSRF), header, toasts, icons */
(function () {
  'use strict';
  var WO = window.WO, t = WO.t;

  /* ---------- safe DOM builder (never uses innerHTML with data) ---------- */
  WO.h = function h(tag, props) {
    var el = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'href') { if (/^(https?:|mailto:|otpauth:|\/|#)/i.test(v)) el.setAttribute('href', v); }
      else if (k === 'src') { if (/^(https:|\/|data:image\/)/i.test(v)) el.setAttribute('src', v); }
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  };
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) return c.forEach(function (x) { append(el, x); });
    el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  WO.$ = function (s, r) { return (r || document).querySelector(s); };
  WO.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  WO.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  /* ---------- icons (static strings only) ---------- */
  var I = {
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M16 7l3 3M14 9l2 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12 19 7"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'
  };
  WO.icon = function (name, cls) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true'); if (cls) s.setAttribute('class', cls);
    s.innerHTML = I[name] || '';          // static, trusted constants above
    return s;
  };
  WO.mountIcons = function (root) {
    WO.$$('[data-icon]', root).forEach(function (el) { if (!el.firstChild) el.appendChild(WO.icon(el.getAttribute('data-icon'))); });
  };

  /* ---------- toasts ---------- */
  WO.toast = function (msg, kind) {
    var box = WO.$('#toasts');
    if (!box) { box = WO.h('div', { id: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(box); }
    var el = WO.h('div', { class: 'toast ' + (kind || '') , text: msg });
    box.appendChild(el);
    setTimeout(function () { el.remove(); }, 4500);
  };
  WO.copy = function (text) {
    var done = function () { WO.toast(t('common.copied'), 'ok'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { WO.toast(t('err.generic'), 'bad'); });
    else { var ta = WO.h('textarea', { 'aria-hidden': 'true' }); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } ta.remove(); }
  };
  WO.download = function (name, text, mime) {
    var a = WO.h('a', { download: name }); var url = URL.createObjectURL(new Blob([text], { type: mime || 'application/json' }));
    a.href = url; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  };

  /* ---------- API client ---------- */
  WO.csrf = null; var meCache = null;
  WO.me = function (force) {
    if (!meCache || force) {
      meCache = fetch('/api/auth/me', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (j) { WO.csrf = j.csrf || WO.csrf; return j; })
        .catch(function () { return { authenticated: false, user: null }; });
    }
    return meCache;
  };
  WO.api = function api(path, o) {
    o = o || {};
    var method = (o.method || 'GET').toUpperCase(), headers = { Accept: 'application/json' }, body;
    var ready = Promise.resolve();
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(o.body || {});
      if (!WO.csrf) ready = WO.me(true);
    }
    return ready.then(function () {
      if (method !== 'GET') headers['X-CSRF-Token'] = WO.csrf || '';
      return fetch(path, { method: method, headers: headers, body: body, credentials: 'same-origin' });
    }).then(function (res) {
      return res.json().catch(function () { return { success: false, error: 'generic' }; }).then(function (j) {
        j.status = res.status; if (j.csrf) WO.csrf = j.csrf;
        if (j.error === 'csrf_invalid' && !o._retry) return WO.me(true).then(function () { return api(path, Object.assign({}, o, { _retry: true })); });
        return j;
      });
    }).catch(function () { return { success: false, error: 'network', status: 0 }; });
  };
  WO.errMsgFull = function (res) { return res && res.error === 'network' ? t('err.network') : WO.errMsg(res); };

  WO.safeNext = function () {
    var n = new URLSearchParams(location.search).get('next') || '';
    return /^\/[A-Za-z0-9_\-./#?=&%]*$/.test(n) && n.indexOf('//') !== 0 ? n : '/console.html';
  };
  WO.requireAuth = function () {
    return WO.me().then(function (m) {
      if (!m.authenticated) { location.replace('/login.html?next=' + encodeURIComponent(location.pathname + location.hash)); return new Promise(function () {}); }
      return m;
    });
  };

  /* ---------- background preference ---------- */
  WO.applyBgPref = function () {
    var p = WO.store.get('wo_bg') || 'auto';
    document.body.classList.toggle('bg-off', p === 'off');
  };

  /* ---------- header ---------- */
  var LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lgx" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs><path d="M16 3 4 8v8c0 7 5 11.5 12 13 7-1.5 12-6 12-13V8z" fill="rgba(34,211,238,.08)" stroke="url(#lgx)" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="15.5" r="4.2" fill="none" stroke="url(#lgx)" stroke-width="2"/><circle cx="16" cy="15.5" r="1.7" fill="#22d3ee"/></svg>';
  WO.mountHeader = function (active) {
    var host = WO.$('#site-header'); if (!host) return Promise.resolve();
    return WO.me().then(function (m) {
      var u = m.user;
      function link(href, key, id) { var a = WO.h('a', { href: href, text: t(key) }); if (active === id) a.setAttribute('aria-current', 'page'); return a; }
      var links = [link('/', 'nav.home', 'home'), link('/console.html', 'nav.console', 'console')];
      if (u) links.push(link('/settings.html', 'nav.settings', 'settings'));
      var logo = WO.h('a', { class: 'logo', href: '/', 'aria-label': 'WatcherOsint' });
      logo.innerHTML = LOGO; logo.appendChild(WO.h('span', null, 'Watcher', WO.h('b', { text: 'Osint' })));
      var langBtn = WO.h('button', { class: 'btn btn-sm', type: 'button', lang: WO.lang === 'fa' ? 'en' : 'fa', 'aria-label': t('lang.aria'), text: t('lang.other'), onclick: function () { WO.setLang(WO.lang === 'fa' ? 'en' : 'fa'); } });
      var actions = WO.h('div', { class: 'hdr-actions' }, langBtn);
      if (u) {
        actions.appendChild(WO.h('a', { class: 'user-chip', href: '/settings.html', 'aria-label': t('nav.settings') },
          WO.h('span', { class: 'avatar', 'aria-hidden': 'true', text: u.username.slice(0, 1).toUpperCase() }), WO.h('span', { class: 'name', text: u.username })));
        actions.appendChild(WO.h('button', { class: 'icon-btn', type: 'button', title: t('nav.signout'), 'aria-label': t('nav.signout'), onclick: WO.signOut }, WO.icon('out')));
      } else {
        actions.appendChild(WO.h('a', { class: 'btn btn-sm', href: '/login.html', text: t('nav.signin') }));
        actions.appendChild(WO.h('a', { class: 'btn btn-sm btn-primary', href: '/login.html#signup', text: t('nav.signup') }));
      }
      var nav = WO.h('nav', { class: 'nav', 'aria-label': 'Main' }, links);
      var mnav = WO.h('nav', { class: 'wrap mobile-nav', 'aria-label': 'Main (mobile)' }, links.map(function (a) { var c = a.cloneNode(true); return c; }));
      WO.clear(host);
      host.className = 'site-header';
      host.appendChild(WO.h('div', { class: 'wrap' }, logo, nav, WO.h('div', { class: 'spacer' }), actions));
      host.appendChild(mnav);
    });
  };
  WO.signOut = function () {
    WO.api('/api/auth/logout', { method: 'POST' }).then(function () { location.href = '/'; });
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (!WO.$('.skip')) { var s = WO.h('a', { class: 'skip', href: '#main', text: t('skip'), 'data-i18n': 'skip' }); document.body.insertBefore(s, document.body.firstChild); }
    WO.applyBgPref(); WO.mountIcons();
    var page = document.body.getAttribute('data-page');
    WO.mountHeader(page);
    document.addEventListener('wo:lang', function () { WO.mountHeader(page); });
  });
})();

/* ---------- shared UI helpers (password meter, show/hide toggles, OTP boxes) ---------- */
(function () {
  'use strict';
  var WO = window.WO, t = WO.t;
  var COMMON = ['password','123456','12345678','qwerty','letmein','admin','welcome','iloveyou','monkey','dragon','abc123','111111','password1','iran','tehran'];

  WO.pwChecks = function (pw, email, username) {
    var local = (email || '').split('@')[0].toLowerCase(), u = (username || '').toLowerCase(), low = pw.toLowerCase();
    var classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(function (r) { return r.test(pw); }).length;
    return {
      len: pw.length >= 10 && pw.length <= 128,
      mix: classes >= 3 || pw.length >= 16,
      common: COMMON.indexOf(low) < 0 && COMMON.indexOf(low.replace(/[\d\W_]+$/, '')) < 0,
      me: !((local.length >= 3 && low.indexOf(local) >= 0) || (u.length >= 3 && low.indexOf(u) >= 0))
    };
  };
  WO.pwScore = function (pw, email, username) {
    if (!pw) return 0;
    var c = WO.pwChecks(pw, email, username);
    if (!c.len || !c.common || !c.me) return 1;
    if (!c.mix) return 2;
    return pw.length >= 14 && /[^A-Za-z0-9]/.test(pw) ? 4 : 3;
  };
  /* binds a password input + meter + rule list; returns fn(getEmail,getUser) to refresh */
  WO.bindPw = function (inputId, meterId, labelId, rulesId, getCtx) {
    var inp = document.getElementById(inputId), meter = document.getElementById(meterId),
        label = document.getElementById(labelId), rules = rulesId ? document.getElementById(rulesId) : null;
    if (!inp) return function () {};
    function refresh() {
      var ctx = getCtx ? getCtx() : {}, pw = inp.value, s = WO.pwScore(pw, ctx.email, ctx.username);
      if (meter) meter.setAttribute('data-s', String(s));
      if (label) label.textContent = pw ? t('pw.s' + s) : t('pw.s0');
      if (rules) {
        var c = WO.pwChecks(pw, ctx.email, ctx.username);
        WO.$$('li[data-r]', rules).forEach(function (li) { li.classList.toggle('ok', !!c[li.getAttribute('data-r')] && !!pw); });
      }
    }
    inp.addEventListener('input', refresh);
    refresh();
    return refresh;
  };
  /* show/hide buttons: any [data-toggle] */
  WO.bindToggles = function (root) {
    WO.$$('[data-toggle]', root || document).forEach(function (b) {
      if (b.dataset.bound) return; b.dataset.bound = '1';
      var inp = document.getElementById(b.getAttribute('data-toggle'));
      function paint() {
        var shown = inp.type === 'text';
        b.setAttribute('aria-pressed', String(shown));
        b.setAttribute('aria-label', t(shown ? 'common.hide' : 'common.show'));
        WO.clear(b).appendChild(WO.icon(shown ? 'eyeoff' : 'eye'));
      }
      b.addEventListener('click', function () { inp.type = inp.type === 'text' ? 'password' : 'text'; paint(); });
      paint();
    });
  };
  /* 6-box OTP input. returns {code(), clear(), focus(), onFull(fn), set(el state)} */
  WO.otpInput = function (container, labelFn) {
    var boxes = [];
    for (var i = 0; i < 6; i++) {
      (function (idx) {
        var b = WO.h('input', { class: 'otp-box', type: 'text', inputmode: 'numeric', autocomplete: idx === 0 ? 'one-time-code' : 'off', maxlength: '1', 'aria-label': t('otp.digit', { n: idx + 1 }) });
        b.addEventListener('input', function () {
          b.value = b.value.replace(/\D/g, '').slice(-1);
          b.classList.toggle('filled', !!b.value);
          if (b.value && idx < 5) boxes[idx + 1].focus();
          if (api.code().length === 6 && api.onFull) api.onFull(api.code());
        });
        b.addEventListener('keydown', function (e) { if (e.key === 'Backspace' && !b.value && idx > 0) { boxes[idx - 1].value = ''; boxes[idx - 1].classList.remove('filled'); boxes[idx - 1].focus(); e.preventDefault(); } });
        b.addEventListener('paste', function (e) {
          var txt = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
          if (!txt) return; e.preventDefault(); api.fill(txt);
        });
        boxes.push(b);
      })(i);
    }
    WO.clear(container).appendChild(WO.h('div', { class: 'otp-row' }, boxes));
    var api = {
      onFull: null,
      code: function () { return boxes.map(function (b) { return b.value; }).join(''); },
      fill: function (s) { s = (s || '').replace(/\D/g, ''); boxes.forEach(function (b, i) { b.value = s[i] || ''; b.classList.toggle('filled', !!b.value); }); boxes[Math.min(s.length, 5)].focus(); if (s.length === 6 && api.onFull) api.onFull(s); },
      clear: function () { boxes.forEach(function (b) { b.value = ''; b.classList.remove('filled'); }); boxes[0].focus(); },
      focus: function () { boxes[0].focus(); },
      flag: function (kind) { container.classList.remove('bad', 'good'); if (kind) { void container.offsetWidth; container.classList.add(kind); } },
      disable: function (d) { boxes.forEach(function (b) { b.disabled = d; }); }
    };
    return api;
  };
  /* countdown ring: returns {start(seconds), stop()} */
  WO.ring = function (ringEl, timeEl, C) {
    var total = 600, end = 0, timer = null, prog = ringEl && ringEl.querySelector('.prog'), C2 = 2 * Math.PI * 38;
    if (prog) { prog.style.strokeDasharray = C2; }
    function paint() {
      var left = Math.max(0, Math.round((end - Date.now()) / 1000));
      if (timeEl) timeEl.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
      if (prog) prog.style.strokeDashoffset = C2 * (1 - left / total);
      if (left <= 0) { clearInterval(timer); timer = null; if (C && C.onExpire) C.onExpire(); }
      return left;
    }
    return {
      start: function (sec) { total = sec || 600; end = Date.now() + total * 1000; clearInterval(timer); paint(); timer = setInterval(paint, 500); },
      stop: function () { clearInterval(timer); timer = null; },
      left: function () { return Math.max(0, Math.round((end - Date.now()) / 1000)); }
    };
  };
  /* tiny helpers */
  WO.setErr = function (el, msg) { if (!el) return; if (msg) { el.textContent = msg; el.hidden = false; } else { el.textContent = ''; el.hidden = true; } };
  WO.busy = function (btn, on) {
    if (!btn) return; btn.disabled = !!on; btn.setAttribute('aria-busy', String(!!on));
    var sp = btn.querySelector('.spin'); if (on && !sp) btn.insertBefore(WO.h('span', { class: 'spin', 'aria-hidden': 'true' }), btn.firstChild);
    if (!on && sp) sp.remove();
  };
  WO.esc = function (s) { return String(s == null ? '' : s); };
})();
