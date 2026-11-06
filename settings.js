/* WatcherOsint — account, security, 2FA, sessions, activity */
(function () {
  'use strict';
  var WO = window.WO, tt = WO.t, h = WO.h;
  var $ = function (id) { return document.getElementById(id); };
  var me = null;

  WO.bindToggles();

  WO.requireAuth().then(function (m) { me = m; boot(m.user); });

  function boot(u) {
    renderProfile(u);
    WO.bindPw('pw-new', 'pw-meter', 'pw-label', null, function () { return { email: u.email, username: u.username }; });
    initPrefs();
    loadSessions();
    loadActivity();
    setup2fa(u);
  }

  /* ---------- profile ---------- */
  function renderProfile(u) {
    var dl = $('profile'); WO.clear(dl);
    var rows = [
      [tt('set.email'), u.email], [tt('set.username'), u.username],
      [tt('set.joined'), u.created_at ? WO.fmtDate(u.created_at) : '—'],
      [tt('set.provider'), u.provider ? (u.provider === 'google' ? tt('auth.google') : tt('auth.github')) : tt('common.this_device')]
    ];
    rows.forEach(function (r) { dl.appendChild(h('dt', { text: r[0] })); dl.appendChild(h('dd', { text: r[1] })); });
    if (!u.has_password) { $('f-pw').hidden = true; $('f-pw').parentNode.querySelector('.muted').textContent = 'Google / GitHub sign-in — no local password.'; }
  }

  /* ---------- preferences ---------- */
  function initPrefs() {
    var lang = $('pref-lang'), bg = $('pref-bg');
    lang.value = WO.lang;
    bg.value = WO.store.get('wo_bg') || 'auto';
    lang.addEventListener('change', function () { WO.setLang(lang.value); renderProfile(me.user); });
    bg.addEventListener('change', function () { WO.store.set('wo_bg', bg.value); WO.toast(tt('common.copied'), 'ok'); setTimeout(function () { location.reload(); }, 400); });
  }

  /* ---------- change password ---------- */
  $('f-pw').addEventListener('submit', function (e) {
    e.preventDefault();
    var cur = $('pw-cur').value, nw = $('pw-new').value, err = $('pw-err');
    WO.setErr(err, '');
    var c = WO.pwChecks(nw, me.user.email, me.user.username);
    if (!(c.len && c.mix && c.common && c.me)) return WO.setErr(err, tt('err.pw_weak'));
    WO.busy($('pw-btn'), true);
    WO.api('/api/auth/change-password', { method: 'POST', body: { current_password: cur, new_password: nw } }).then(function (res) {
      WO.busy($('pw-btn'), false);
      if (!res.success) return WO.setErr(err, WO.errMsgFull(res));
      $('pw-cur').value = ''; $('pw-new').value = ''; WO.toast(tt('set.pw.ok'), 'ok');
      loadSessions(); loadActivity();
    });
  });

  /* ---------- 2FA ---------- */
  function setup2fa(u) {
    var on = !!u.totp_enabled;
    $('twofa-off').hidden = on; $('twofa-on').hidden = !on;
    $('twofa-setup').hidden = true; $('twofa-codes').hidden = true;
    $('d-pw-wrap').hidden = !u.has_password;
  }
  $('twofa-start').addEventListener('click', function () {
    var err = $('twofa-err'); WO.setErr(err, '');
    WO.busy($('twofa-start'), true);
    WO.api('/api/auth/2fa/setup', { method: 'POST' }).then(function (res) {
      WO.busy($('twofa-start'), false);
      if (!res.success) return WO.toast(WO.errMsgFull(res), 'bad');
      $('twofa-secret').textContent = res.secret;
      $('twofa-link').setAttribute('href', res.uri);
      $('twofa-off').hidden = true; $('twofa-setup').hidden = false;
      $('twofa-code').focus();
    });
  });
  $('twofa-copy').addEventListener('click', function () { WO.copy($('twofa-secret').textContent); });
  $('f-2fa-on').addEventListener('submit', function (e) {
    e.preventDefault(); var err = $('twofa-err'); WO.setErr(err, '');
    WO.api('/api/auth/2fa/enable', { method: 'POST', body: { code: $('twofa-code').value.replace(/\s/g, '') } }).then(function (res) {
      if (!res.success) return WO.setErr(err, WO.errMsgFull(res));
      showCodes(res.recovery_codes || []);
      WO.toast(tt('set.2fa.ok'), 'ok');
      me.user.totp_enabled = true;
      loadSessions(); loadActivity();
    });
  });
  function showCodes(codes) {
    var box = $('codes-list'); WO.clear(box);
    codes.forEach(function (c) { box.appendChild(h('code', { text: c })); });
    $('twofa-setup').hidden = true; $('twofa-on').hidden = false; $('twofa-codes').hidden = false;
    $('codes-copy').onclick = function () { WO.copy(codes.join('\n')); };
    $('codes-dl').onclick = function () { WO.download('watcherosint-recovery-codes.txt', codes.join('\n') + '\n', 'text/plain'); };
  }
  $('f-2fa-off').addEventListener('submit', function (e) {
    e.preventDefault(); var err = $('d-err'); WO.setErr(err, '');
    WO.api('/api/auth/2fa/disable', { method: 'POST', body: { password: $('d-pw').value, code: $('d-code').value.replace(/\s/g, '') } }).then(function (res) {
      if (!res.success) return WO.setErr(err, WO.errMsgFull(res));
      me.user.totp_enabled = false; setup2fa(me.user);
      WO.toast(tt('set.2fa.dis.ok'), 'ok'); loadActivity();
    });
  });

  /* ---------- sessions ---------- */
  function loadSessions() {
    WO.api('/api/auth/sessions').then(function (res) {
      var box = $('sessions'); WO.clear(box);
      if (!res.success) return box.appendChild(h('p', { class: 'muted', text: WO.errMsgFull(res) }));
      res.sessions.forEach(function (s) {
        var revoke = s.current ? h('span', { class: 'badge info', text: tt('common.this_device') }) :
          h('button', { class: 'btn btn-sm btn-danger', type: 'button', text: tt('common.revoke'), onclick: function () {
            WO.api('/api/auth/sessions/revoke', { method: 'POST', body: { id: s.id } }).then(function () { loadSessions(); loadActivity(); });
          } });
        box.appendChild(h('div', { class: 'sess' },
          h('div', { class: 'meta' }, h('div', { class: 'ua', text: s.ua || '—' }), h('div', { class: 'small muted', text: (s.ip || '') + ' · ' + WO.fmtDate(s.last_seen) })),
          revoke));
      });
    });
  }
  $('sess-all').addEventListener('click', function () {
    WO.api('/api/auth/sessions/revoke', { method: 'POST', body: { id: 'all' } }).then(function () { WO.toast(tt('set.sess.ok'), 'ok'); loadSessions(); loadActivity(); });
  });

  /* ---------- activity ---------- */
  function loadActivity() {
    WO.api('/api/auth/activity').then(function (res) {
      var body = $('activity'); WO.clear(body);
      var list = (res.events || []);
      if (!list.length) return body.appendChild(h('tr', null, h('td', { colspan: '3', class: 'muted', text: tt('set.act.none') })));
      list.forEach(function (ev) {
        var key = 'ev.' + ev.event, label = WO.dict[WO.lang][key] || WO.dict.en[key] || ev.event;
        body.appendChild(h('tr', null, h('td', { text: label }), h('td', { text: WO.fmtDate(ev.ts) }), h('td', { class: 'mono', text: ev.ip || '—' })));
      });
    });
  }
  document.addEventListener('wo:lang', function () { if (me) { renderProfile(me.user); loadActivity(); } });
})();
