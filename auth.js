/* WatcherOsint — login / signup / OTP / 2FA / reset flow */
(function () {
  'use strict';
  var WO = window.WO, tt = WO.t;
  var $ = function (id) { return document.getElementById(id); };
  var views = ['v-main', 'v-otp', 'v-totp', 'v-forgot', 'v-reset', 'v-done'];
  var state = { email: '', purpose: 'verify', remember: false, next: WO.safeNext(), pending2fa: false };

  function show(id, focusId) {
    views.forEach(function (v) { $(v).hidden = v !== id; });
    if (focusId) setTimeout(function () { var el = $(focusId); if (el) el.focus(); }, 30);
    window.scrollTo(0, 0);
  }
  function fail(res, errEl) { WO.setErr(errEl, WO.errMsgFull(res)); }

  /* ---------- setup ---------- */
  WO.bindToggles();
  WO.api('/api/auth/config').then(function (c) {
    if (!c.success) return;
    if (!c.mail) { var n = $('su-nomail'); n.textContent = tt('err.mail_unavailable'); n.hidden = false; }
    ['oa-google', 'oa-google2'].forEach(function (id) { var el = $(id); if (el) el.hidden = !(c.providers && c.providers.google); });
    ['oa-github', 'oa-github2'].forEach(function (id) { var el = $(id); if (el) el.hidden = !(c.providers && c.providers.github); });
    if (c.providers.google || c.providers.github) document.querySelectorAll('.social-box').forEach(function (b) { b.hidden = false; });
  });
  WO.me().then(function (m) {
    if (m.authenticated) { location.replace(state.next); }
  });

  function ctxSignup() { return { email: $('su-email').value.trim(), username: $('su-user').value.trim() }; }
  WO.bindPw('su-pw', 'su-pw-meter', 'su-pw-label', 'su-pw-rules', ctxSignup);
  WO.bindPw('rs-pw', 'rs-pw-meter', 'rs-pw-label', 'rs-pw-rules', function () { return { email: state.email }; });

  /* ---------- tabs ---------- */
  var tabs = [$('tab-signin'), $('tab-signup')];
  function selectTab(i, focus) {
    tabs.forEach(function (tb, j) { tb.setAttribute('aria-selected', String(i === j)); tb.tabIndex = i === j ? 0 : -1; });
    $('p-signin').hidden = i !== 0; $('p-signup').hidden = i !== 1;
    if (focus) tabs[i].focus();
    history.replaceState(null, '', i ? '#signup' : '#signin');
  }
  tabs.forEach(function (tb, i) {
    tb.addEventListener('click', function () { selectTab(i, false); });
    tb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var n = (i + (e.key === 'ArrowRight' ? 1 : 1)) % 2; selectTab(n, true); e.preventDefault(); }
    });
  });
  if (location.hash === '#signup') selectTab(1, false);
  $('go-forgot').addEventListener('click', function () { $('fg-email').value = $('si-id').value.indexOf('@') > 0 ? $('si-id').value : ''; show('v-forgot', 'fg-email'); });

  /* ---------- OTP view ---------- */
  var otp = WO.otpInput($('ov-boxes'));
  var ring = WO.ring($('ov-ring'), $('ov-time'), { onExpire: function () { WO.setErr($('ov-err'), tt('otp.expired')); } });
  var resendTimer = null;
  function startResendCooldown(btn, sec) {
    clearInterval(resendTimer); var left = sec;
    btn.disabled = true;
    function paint() { btn.textContent = left > 0 ? tt('otp.resend_in', { s: left }) : tt('otp.resend'); if (left <= 0) { btn.disabled = false; clearInterval(resendTimer); } left--; }
    paint(); resendTimer = setInterval(paint, 1000);
  }
  function enterOtp(email, purpose, meta) {
    state.email = email; state.purpose = purpose;
    $('otp-desc').textContent = tt('otp.d', { email: email });
    otp.clear(); otp.flag(null); otp.disable(false);
    ring.start(meta.expires_in || 600);
    startResendCooldown($('ov-resend'), meta.resend_in || 45);
    show('v-otp', 'otp-h');
  }
  otp.onFull = function () { verifyOtp(); };
  function verifyOtp() {
    var code = otp.code(); if (code.length !== 6) return;
    WO.setErr($('ov-err'), ''); WO.busy($('ov-btn'), true); otp.disable(true);
    WO.api('/api/auth/verify', { method: 'POST', body: { email: state.email, code: code, remember: state.remember } }).then(function (res) {
      WO.busy($('ov-btn'), false); otp.disable(false);
      if (res.success) { otp.flag('good'); ring.stop(); finish(); return; }
      otp.flag('bad'); otp.clear();
      var msg = WO.errMsgFull(res);
      if (res.tries_left != null) msg += ' — ' + tt('otp.tries', { n: res.tries_left });
      WO.setErr($('ov-err'), msg);
      if (res.error === 'code_expired' || res.error === 'code_locked') ring.stop();
    });
  }
  $('ov-btn').addEventListener('click', verifyOtp);
  $('ov-resend').addEventListener('click', function () {
    WO.api('/api/auth/resend', { method: 'POST', body: { email: state.email, purpose: state.purpose } }).then(function (res) {
      if (res.success) { WO.toast(tt('otp.sent_again'), 'ok'); ring.start(res.expires_in || 600); startResendCooldown($('ov-resend'), res.resend_in || 45); otp.clear(); }
      else { WO.setErr($('ov-err'), WO.errMsgFull(res)); if (res.retry_after) startResendCooldown($('ov-resend'), res.retry_after); }
    });
  });
  $('ov-change').addEventListener('click', function () { ring.stop(); show('v-main', 'tab-signup'); selectTab(1, false); });

  /* ---------- finish ---------- */
  function finish() {
    show('v-done', 'dn-h');
    setTimeout(function () { location.replace(state.next); }, 900);
  }

  /* ---------- sign in ---------- */
  $('f-signin').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = $('si-id').value.trim(), pw = $('si-pw').value, err = $('si-err');
    WO.setErr(err, '');
    if (!id || !pw) return WO.setErr(err, tt('err.invalid_credentials'));
    state.remember = $('si-rem').checked;
    WO.busy($('si-btn'), true);
    WO.api('/api/auth/login', { method: 'POST', body: { identifier: id, password: pw, remember: state.remember } }).then(function (res) {
      WO.busy($('si-btn'), false);
      if (!res.success) return fail(res, err);
      if (res.step === 'verify') return enterOtp(res.email, 'verify', res);
      if (res.step === 'totp') return enterTotp();
      finish();
    });
  });

  /* ---------- sign up ---------- */
  $('f-signup').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('su-email').value.trim(), user = $('su-user').value.trim(), pw = $('su-pw').value, err = $('su-err');
    WO.setErr(err, '');
    if (!email || !user || !pw) return WO.setErr(err, tt('err.invalid_input'));
    var c = WO.pwChecks(pw, email, user);
    if (!(c.len && c.mix && c.common && c.me)) return WO.setErr(err, tt('err.pw_weak'));
    state.remember = $('su-rem').checked;
    WO.busy($('su-btn'), true);
    WO.api('/api/auth/signup', { method: 'POST', body: { email: email, username: user, password: pw } }).then(function (res) {
      WO.busy($('su-btn'), false);
      if (!res.success) return fail(res, err);
      enterOtp(email, 'verify', res);
    });
  });

  /* ---------- 2FA ---------- */
  var totp = WO.otpInput($('tp-boxes'));
  var recovery = false;
  function enterTotp() {
    recovery = false; totp.clear(); totp.flag(null);
    $('tp-app').hidden = false; $('tp-rec').hidden = true; $('tp-toggle').textContent = tt('totp.recovery');
    show('v-totp', 'totp-h');
  }
  totp.onFull = function () { submitTotp(); };
  function submitTotp() {
    var code = recovery ? $('tp-recin').value.trim() : totp.code();
    if (!recovery && code.length !== 6) return;
    if (recovery && !code) return;
    WO.setErr($('tp-err'), ''); WO.busy($('tp-btn'), true);
    WO.api('/api/auth/login/2fa', { method: 'POST', body: { code: code } }).then(function (res) {
      WO.busy($('tp-btn'), false);
      if (res.success) { totp.flag('good'); return finish(); }
      totp.flag('bad'); totp.clear();
      WO.setErr($('tp-err'), WO.errMsgFull(res));
    });
  }
  $('tp-btn').addEventListener('click', submitTotp);
  $('tp-toggle').addEventListener('click', function () {
    recovery = !recovery;
    $('tp-app').hidden = recovery; $('tp-rec').hidden = !recovery;
    $('tp-toggle').textContent = tt(recovery ? 'totp.app' : 'totp.recovery');
    if (recovery) $('tp-recin').focus(); else totp.focus();
  });

  /* ---------- forgot / reset ---------- */
  $('f-forgot').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('fg-email').value.trim(), err = $('fg-err');
    WO.setErr(err, '');
    WO.busy($('fg-btn'), true);
    WO.api('/api/auth/forgot', { method: 'POST', body: { email: email } }).then(function (res) {
      WO.busy($('fg-btn'), false);
      if (!res.success) return fail(res, err);
      $('rs-desc').textContent = tt('reset.d', { email: email });
      state.email = email;
      rsOtp.clear(); rsOtp.flag(null); rsRing.start(res.expires_in || 600);
      startResendCooldown($('rs-resend'), res.resend_in || 45);
      show('v-reset', 'rs-h');
    });
  });
  $('fg-back').addEventListener('click', function () { show('v-main', 'tab-signin'); selectTab(0, false); });
  $('rs-back').addEventListener('click', function () { show('v-main', 'tab-signin'); selectTab(0, false); });
  var rsOtp = WO.otpInput($('rs-boxes'));
  var rsRing = WO.ring($('rs-ring'), $('rs-time'), { onExpire: function () { WO.setErr($('rs-err'), tt('otp.expired')); } });
  $('rs-resend').addEventListener('click', function () {
    WO.api('/api/auth/resend', { method: 'POST', body: { email: state.email, purpose: 'reset' } }).then(function (res) {
      if (res.success) { WO.toast(tt('otp.sent_again'), 'ok'); rsRing.start(res.expires_in || 600); startResendCooldown($('rs-resend'), res.resend_in || 45); }
      else WO.setErr($('rs-err'), WO.errMsgFull(res));
    });
  });
  $('rs-btn').addEventListener('click', function () {
    var pw = $('rs-pw').value, err = $('rs-err'), code = rsOtp.code();
    WO.setErr(err, '');
    if (code.length !== 6) return WO.setErr(err, tt('err.code_invalid'));
    var c = WO.pwChecks(pw, state.email, '');
    if (!(c.len && c.mix && c.common)) return WO.setErr(err, tt('err.pw_weak'));
    WO.busy($('rs-btn'), true);
    WO.api('/api/auth/reset', { method: 'POST', body: { email: state.email, code: code, password: pw } }).then(function (res) {
      WO.busy($('rs-btn'), false);
      if (!res.success) { rsOtp.flag('bad'); rsOtp.clear(); return fail(res, err); }
      rsRing.stop(); WO.toast(tt('reset.ok'), 'ok');
      $('rs-pw').value = ''; selectTab(0, false); show('v-main', 'si-id');
    });
  });
  rsOtp.onFull = function () { if ($('rs-pw').value) $('rs-btn').click(); else $('rs-pw').focus(); };
})();
