/* WatcherOsint — landing terminal animation (text only, no HTML from data) */
(function () {
  'use strict';
  var WO = window.WO, body = document.getElementById('term');
  if (!body) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function line(cls, text) { var s = document.createElement('span'); if (cls) s.className = cls; s.textContent = text + '\n'; return s; }
  function script() {
    var cmd1 = WO.t('term.run1'), cmd2 = WO.t('term.run2');
    return [
      ['p', '$ '], ['', cmd1], ['\n', ''],
      ['m', '  › parsing E.164 · carrier · line type'], ['\n', ''],
      ['g', '  ✓ valid mobile · risk score 12 (low)'], ['\n', ''],
      ['\n', ''],
      ['p', '$ '], ['', cmd2], ['\n', ''],
      ['m', '  › 46 platforms · concurrent · 10s timeout'], ['\n', ''],
      ['g', '  ✓ 11 found   '], ['a', '· 31 not found   · 4 unknown'], ['\n', ''],
      ['\n', ''], ['m', '  ' + (WO.lang === 'fa' ? 'نتایج فقط از نشانه‌های عمومی است.' : 'results use public signals only.')]
    ];
  }
  function clear() { while (body.firstChild) body.removeChild(body.firstChild); }
  function render(upTo) {
    clear();
    var parts = script(), n = 0, cur = null;
    for (var i = 0; i < parts.length && n < upTo; i++) {
      var cls = parts[i][0], text = parts[i][1];
      if (cls === '\n') { body.appendChild(document.createTextNode('\n')); }
      else { var s = document.createElement('span'); if (cls) s.className = cls; s.textContent = text; body.appendChild(s); }
      n++;
    }
    if (!reduce) { var c = document.createElement('span'); c.className = 'cursor'; c.setAttribute('aria-hidden', 'true'); body.appendChild(c); }
  }
  if (reduce) { render(1e9); return; }
  var step = 0, total = script().length;
  (function tick() {
    render(step);
    step++;
    if (step <= total + 14) setTimeout(tick, step > total ? 900 : step % 2 ? 110 : 60);
    else { step = 0; setTimeout(tick, 1800); }
  })();
  document.addEventListener('wo:lang', function () { step = 0; });
})();

/* landing CTAs depend on session state */
(function () {
  'use strict';
  var WO = window.WO, cta = document.getElementById('cta');
  if (!cta) return;
  WO.me().then(function (m) {
    var a = function (href, cls, key) { return WO.h('a', { class: 'btn ' + cls, href: href, text: WO.t(key) }); };
    WO.clear(cta);
    if (m.authenticated) cta.appendChild(a('/console.html', 'btn-primary', 'hero.cta.console'));
    else {
      cta.appendChild(a('/login.html#signup', 'btn-primary', 'hero.cta.signup'));
      cta.appendChild(a('/login.html', '', 'hero.cta.signin'));
    }
  });
  document.addEventListener('wo:lang', function () { WO.me().then(function () {}); });
})();
