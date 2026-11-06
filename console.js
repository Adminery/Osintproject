/* WatcherOsint — console: phone / email / username tools (signed-in only) */
(function () {
  'use strict';
  var WO = window.WO, tt = WO.t, h = WO.h;
  var $ = function (id) { return document.getElementById(id); };
  var out = $('out'), lastUser = null;
  var lastResult = null;

  /* ---------- guard ---------- */
  WO.requireAuth().then(function (m) { lastUser = m.user; });

  /* ---------- tabs ---------- */
  var tabIds = ['phone', 'email', 'username'];
  function select(name, focus) {
    tabIds.forEach(function (n) {
      var tab = $('tab-' + n), pane = $('panel-' + n), on = n === name;
      tab.setAttribute('aria-selected', String(on)); tab.tabIndex = on ? 0 : -1; pane.hidden = !on;
    });
    if (focus) $('tab-' + name).focus();
    history.replaceState(null, '', '#' + name);
    WO.clear(out);
  }
  tabIds.forEach(function (n) {
    $('tab-' + n).addEventListener('click', function () { select(n, false); });
    $('tab-' + n).addEventListener('keydown', function (e) {
      var i = tabIds.indexOf(n), j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % 3; if (e.key === 'ArrowLeft') j = (i + 2) % 3;
      if (j !== null) { select(tabIds[j], true); e.preventDefault(); }
    });
  });
  var initial = (location.hash || '').slice(1);
  select(tabIds.indexOf(initial) >= 0 ? initial : 'phone', false);

  /* ---------- generic safe renderers ---------- */
  function isPrim(v) { return v == null || typeof v !== 'object'; }
  function linkish(v) { return typeof v === 'string' && /^https?:\/\//.test(v) ? h('a', { href: v, target: '_blank', rel: 'noopener noreferrer', text: v }) : null; }
  function valueNode(v) {
    if (v === true) return h('span', { class: 'badge ok', text: tt('common.yes') });
    if (v === false) return h('span', { class: 'badge', text: tt('common.no') });
    if (v == null || v === '') return h('span', { class: 'faint', text: '—' });
    var l = linkish(v); if (l) return l;
    if (Array.isArray(v) && v.every(isPrim)) return v.length ? h('div', { class: 'chips' }, v.map(function (x) { return h('span', { class: 'chip', text: String(x) }); })) : h('span', { class: 'faint', text: tt('common.none') });
    if (Array.isArray(v) || typeof v === 'object') return kv(v, 1);
    return h('span', { class: 'big-num', text: String(v) });
  }
  function kv(obj, depth) {
    var dl = h('dl', { class: 'kv' });
    Object.keys(obj || {}).forEach(function (k) {
      if (obj[k] === undefined || k === 'raw') return;
      var label = k.replace(/_/g, ' ');
      if (depth > 2 && !isPrim(obj[k])) return;
      dl.appendChild(h('dt', { text: label }));
      dl.appendChild(h('dd', null, valueNode(obj[k])));
    });
    return dl;
  }
  function card(title, body, extra) {
    return h('section', { class: 'glass card stack' }, h('div', { class: 'row between' }, h('h2', { text: title }), extra || null), body);
  }
  function errorBox(res) { return h('div', { class: 'form-error', role: 'alert' }, WO.errMsgFull(res)); }
  function skeleton(msg) { return h('div', { class: 'stack' }, h('p', { class: 'muted', text: msg }), h('div', { class: 'progress' }, h('i'))); }
  function setOut(node) { WO.clear(out).appendChild(node); out.setAttribute('aria-busy', 'false'); }
  function setLoading(msg) { WO.clear(out).appendChild(h('div', { class: 'glass card' }, skeleton(msg))); out.setAttribute('aria-busy', 'true'); }

  function exportBar(name, data) {
    lastResult = data;
    return h('div', { class: 'row' },
      h('button', { class: 'btn btn-sm', type: 'button', onclick: function () { WO.copy(JSON.stringify(data, null, 2)); } }, WO.icon('copy'), h('span', { text: tt('x.copy') })),
      h('button', { class: 'btn btn-sm', type: 'button', onclick: function () { WO.download(name + '.json', JSON.stringify(data, null, 2)); } }, WO.icon('download'), h('span', { text: tt('x.download') })));
  }

  /* ---------- request helper ---------- */
  function run(panelBtn, msgKey, url, render, name) {
    WO.busy(panelBtn, true); setLoading(tt(msgKey));
    WO.api(url).then(function (res) {
      WO.busy(panelBtn, false);
      if (!res.success) {
        if (res.error === 'auth_required') return location.replace('/login.html?next=/console.html');
        return setOut(errorBox(res));
      }
      setOut(h('div', { class: 'results stack' }, exportBar(name, res), render(res)));
    });
  }

  /* ---------- phone ---------- */
  function renderPhone(d) {
    var v = d.validation || {}, sp = d.spam || {}, score = Number(sp.score != null ? sp.score : sp.risk_score);
    var level = isNaN(score) ? null : score >= 70 ? 'high' : score >= 40 ? 'med' : 'low';
    var color = level === 'high' ? '#fb7185' : level === 'med' ? '#fbbf24' : '#34d399';
    var gauge = isNaN(score) ? null : h('div', { class: 'stack center' },
      (function () {
        var NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 170 100'); svg.setAttribute('class', 'gauge'); svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', tt('r.spam') + ': ' + score);
        var len = Math.PI * 70, bg = document.createElementNS(NS, 'path'), fg = document.createElementNS(NS, 'path'), tx = document.createElementNS(NS, 'text');
        bg.setAttribute('d', 'M15 90 A70 70 0 0 1 155 90'); bg.setAttribute('class', 'g-track');
        fg.setAttribute('d', 'M15 90 A70 70 0 0 1 155 90'); fg.setAttribute('class', 'g-val'); fg.setAttribute('stroke', color);
        fg.style.strokeDasharray = len; fg.style.strokeDashoffset = len * (1 - Math.max(0, Math.min(100, score)) / 100);
        tx.setAttribute('x', '85'); tx.setAttribute('y', '86'); tx.textContent = String(Math.round(score));
        svg.appendChild(bg); svg.appendChild(fg); svg.appendChild(tx); return svg;
      })(),
      h('span', { class: 'badge ' + (level === 'high' ? 'bad' : level === 'med' ? 'warn' : 'ok'), text: tt('r.spam.' + (level === 'high' ? 'high' : level === 'med' ? 'med' : 'low')) }));
    var links = (d.messenger_links || []);
    return h('div', { class: 'res-grid' },
      card(tt('r.valid'), h('div', { class: 'stack' }, h('span', { class: 'badge ' + (v.valid === false ? 'bad' : 'ok'), text: v.valid === false ? tt('r.invalid') : tt('r.valid') }), kv(d.basic || {}, 0))),
      gauge ? card(tt('r.spam'), gauge) : null,
      card(tt('r.patterns'), kv({ premium: d.premium, service: d.service }, 0)),
      links.length ? card(tt('r.links'), h('ul', { class: 'plist' }, links.map(function (l) {
        var href = l.url || l.href; return h('li', null, h('span', { class: 'pn', text: l.name || l.app || 'link' }), href ? h('a', { class: 'go btn btn-sm', href: href, target: '_blank', rel: 'noopener noreferrer', text: tt('u.open') }) : null);
      }))) : null,
      card(tt('r.errors'), kv(v, 0)));
  }
  $('f-phone').addEventListener('submit', function (e) {
    e.preventDefault(); var n = $('in-phone').value.trim();
    if (!n) return setOut(errorBox({ error: 'invalid_input' }));
    run($('f-phone').querySelector('button'), 'scanning.phone', '/api/phone?number=' + encodeURIComponent(n), renderPhone, 'phone-report');
  });

  /* ---------- email ---------- */
  function renderEmail(d) {
    var v = d.validation || {}, mx = d.mx || {}, spf = d.spf_dmarc || {}, g = d.gravatar || {}, res = d.results || [];
    var hits = res.filter(function (r) { return r.exists === true; }).length;
    return h('div', { class: 'stack' },
      h('div', { class: 'res-grid' },
        card(tt('e.syntax'), kv(v, 0)),
        card(tt('e.mx'), h('div', { class: 'stack' }, kv(mx, 0))),
        card('SPF · DMARC', kv(spf, 0)),
        card(tt('e.gravatar'), h('div', { class: 'stack' }, h('span', { class: 'badge ' + (g.found || g.exists ? 'ok' : '') , text: (g.found || g.exists) ? tt('e.grav.found') : tt('e.grav.none') }), g.url ? h('a', { href: g.url, target: '_blank', rel: 'noopener noreferrer', text: g.url }) : null))),
      card(tt('e.modules'), h('div', { class: 'stack' },
        h('p', { class: 'muted', text: tt('e.modules.n', { n: res.length, k: hits }) }),
        h('ul', { class: 'plist' }, res.map(function (r) {
          var cls = r.exists === true ? 'hit' : '', badge = r.exists === true ? 'ok' : r.exists === false ? '' : 'warn';
          var label = r.exists === true ? tt('e.exists.yes') : r.exists === false ? tt('e.exists.no') : tt('e.exists.unk');
          return h('li', { class: cls }, h('div', null, h('div', { class: 'pn', text: r.name }), h('div', { class: 'pc', text: r.category || '' })),
            h('span', { class: 'badge ' + badge + ' go', text: label }));
        })))));
  }
  $('f-email').addEventListener('submit', function (e) {
    e.preventDefault(); var em = $('in-email').value.trim(), ir = $('in-iran').checked ? '1' : '0';
    if (!em) return setOut(errorBox({ error: 'email_invalid' }));
    run($('f-email').querySelector('button'), 'scanning.email', '/api/email?email=' + encodeURIComponent(em) + '&iranian=' + ir, renderEmail, 'email-report');
  });

  /* ---------- username ---------- */
  var region = 'all', statusFilter = 'ALL';
  WO.$$('[data-region]').forEach(function (b) {
    b.addEventListener('click', function () {
      region = b.getAttribute('data-region');
      WO.$$('[data-region]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    });
  });
  function renderUser(d) {
    var list = d.results || [];
    var counts = { FOUND: 0, NOT_FOUND: 0, UNKNOWN: 0, ERROR: 0, TIMEOUT: 0 };
    list.forEach(function (r) { counts[r.status] = (counts[r.status] || 0) + 1; });
    var listBox = h('ul', { class: 'plist', 'aria-live': 'polite' });
    function paint() {
      WO.clear(listBox);
      var items = list.filter(function (r) { return statusFilter === 'ALL' || r.status === statusFilter; });
      if (!items.length) listBox.appendChild(h('li', { class: 'empty', text: tt('u.none') }));
      items.forEach(function (r) {
        var st = r.status || 'UNKNOWN';
        listBox.appendChild(h('li', { class: st === 'FOUND' ? 'hit' : '' },
          h('span', { class: 'dot ' + st, 'aria-hidden': 'true' }),
          h('div', { class: 'min0' }, h('div', { class: 'pn', text: r.platform }), h('div', { class: 'pc', text: [r.category, r.region].filter(Boolean).join(' · ') + ' — ' + tt('st.' + st) })),
          r.url && st === 'FOUND' ? h('a', { class: 'go btn btn-sm', href: r.url, target: '_blank', rel: 'noopener noreferrer', text: tt('u.open') }) : null));
      });
    }
    var filters = h('div', { class: 'chips', role: 'group', 'aria-label': tt('u.filter') },
      ['ALL', 'FOUND', 'NOT_FOUND', 'UNKNOWN'].map(function (k) {
        var n = k === 'ALL' ? list.length : counts[k] || 0;
        var b = h('button', { class: 'chip', type: 'button', 'aria-pressed': String(statusFilter === k), text: (k === 'ALL' ? tt('region.all') : tt('st.' + k)) + ' · ' + n });
        b.addEventListener('click', function () { statusFilter = k; WO.$$('button', filters).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); paint(); });
        return b;
      }));
    paint();
    return h('div', { class: 'stack' },
      h('div', { class: 'res-grid' },
        h('div', { class: 'stat' }, h('b', { text: String(d.checked || list.length) }), h('span', { text: tt('u.checked') })),
        h('div', { class: 'stat' }, h('b', { class: 'ok-num', text: String(d.found_count != null ? d.found_count : counts.FOUND) }), h('span', { text: tt('u.found') }))),
      card(tt('tab.username'), h('div', { class: 'stack' }, filters, listBox)));
  }
  $('f-username').addEventListener('submit', function (e) {
    e.preventDefault(); var u = $('in-user').value.trim().replace(/^@/, '');
    if (!/^[A-Za-z0-9_.\-]{2,32}$/.test(u)) return setOut(errorBox({ error: 'invalid_input' }));
    statusFilter = 'ALL';
    run($('f-username').querySelector('button'), 'scanning.user', '/api/username?u=' + encodeURIComponent(u) + '&region=' + region, renderUser, 'username-' + u);
  });
})();
