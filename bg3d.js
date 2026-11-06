/* WatcherOsint — 3D network-graph background.
   Three.js (WebGL, r128 from cdnjs) when available; automatically falls back to a lightweight 2D-canvas
   projection of the same graph if WebGL/Three is unavailable. Respects prefers-reduced-motion,
   pauses on hidden tabs and honours the "3D background" preference (Settings). */
(function () {
  'use strict';
  var canvas = document.getElementById('bg');
  if (!canvas) return;
  function pref() { try { return localStorage.getItem('wo_bg') || 'auto'; } catch (e) { return 'auto'; } }
  if (pref() === 'off') return;

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.matchMedia && matchMedia('(max-width: 700px)').matches;
  var weak = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory && navigator.deviceMemory <= 2);
  var lite = pref() === 'auto' && (small || weak);
  var N = lite ? 46 : 96, PACKETS = lite ? 7 : 16, R = 48;
  if (reduce && pref() === 'auto') lite = true;

  /* ---------- deterministic graph ---------- */
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function buildGraph() {
    var rand = rng(1337), pos = new Float32Array(N * 3), size = new Float32Array(N), col = new Float32Array(N * 3), deg = new Array(N).fill(0), edges = [], seen = {};
    var cy = [0.13, 0.83, 0.93], vi = [0.65, 0.55, 0.98], wh = [0.85, 0.93, 1.0];
    for (var i = 0; i < N; i++) {
      var u = rand() * 2 - 1, th = rand() * Math.PI * 2, r = R * Math.pow(rand(), 0.55), s = Math.sqrt(1 - u * u);
      pos[i * 3] = r * s * Math.cos(th) * 1.25; pos[i * 3 + 1] = r * u * 0.8; pos[i * 3 + 2] = r * s * Math.sin(th);
      var pick = rand(), c = pick < 0.55 ? cy : pick < 0.85 ? vi : wh;
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      size[i] = 1.2 + rand() * 1.6;
    }
    function add(a, b) { if (a === b) return; var k = a < b ? a * 1000 + b : b * 1000 + a; if (seen[k]) return; seen[k] = 1; edges.push([a, b]); deg[a]++; deg[b]++; }
    function d2(a, b) { var x = pos[a * 3] - pos[b * 3], y = pos[a * 3 + 1] - pos[b * 3 + 1], z = pos[a * 3 + 2] - pos[b * 3 + 2]; return x * x + y * y + z * z; }
    for (var a = 0; a < N; a++) {
      var near = [];
      for (var b = 0; b < N; b++) if (b !== a) near.push([d2(a, b), b]);
      near.sort(function (p, q) { return p[0] - q[0]; });
      add(a, near[0][1]); if (rand() < 0.75) add(a, near[1][1]);
    }
    for (var k = 0; k < Math.floor(N / 10); k++) add(Math.floor(rand() * N), Math.floor(rand() * N));
    for (var h = 0; h < N; h++) if (deg[h] >= 4) { size[h] *= 1.9; }
    return { pos: pos, size: size, col: col, edges: edges, rand: rand };
  }

  /* ---------- shared packet state ---------- */
  function makePackets(g) {
    var p = [];
    for (var i = 0; i < PACKETS; i++) p.push({ e: Math.floor(g.rand() * g.edges.length), t: g.rand(), v: 0.18 + g.rand() * 0.3 });
    return p;
  }
  function stepPackets(pk, g, dt) {
    for (var i = 0; i < pk.length; i++) { pk[i].t += pk[i].v * dt; if (pk[i].t >= 1) { pk[i].t = 0; pk[i].e = Math.floor(Math.random() * g.edges.length); } }
  }

  var pointer = { x: 0, y: 0 }, hidden = document.hidden, raf = 0, stopped = false;
  window.addEventListener('pointermove', function (e) { pointer.x = (e.clientX / innerWidth) * 2 - 1; pointer.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  document.addEventListener('visibilitychange', function () { hidden = document.hidden; if (!hidden && !stopped && !reduce) { last = performance.now(); raf = requestAnimationFrame(loop); } });

  var last = performance.now(), tick = null;
  function loop(now) {
    if (stopped || hidden) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    try { tick(dt, now / 1000); } catch (err) { console.warn('bg3d render error, switching to fallback', err); fallback(); return; }
    if (!reduce) raf = requestAnimationFrame(loop);
  }

  /* ---------- Three.js renderer ---------- */
  var VERT = 'attribute float aSize; attribute vec3 aColor; varying vec3 vColor; uniform float uPx;' +
    'void main(){ vColor=aColor; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=aSize*uPx*(260.0/-mv.z); gl_Position=projectionMatrix*mv; }';
  var FRAG = 'precision mediump float; varying vec3 vColor;' +
    'void main(){ float d=length(gl_PointCoord-vec2(0.5)); float a=pow(smoothstep(0.5,0.0,d),1.7); gl_FragColor=vec4(vColor*1.2,a); }';

  function startThree(g) {
    var THREE = window.THREE;
    if (!THREE) throw new Error('three missing');
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: !lite, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.75));
    renderer.setClearColor(0x000000, 0);
    var scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500), group = new THREE.Group();
    scene.add(group);

    var uni = { uPx: { value: renderer.getPixelRatio() } };
    var pmat = new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(g.pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(g.col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(g.size, 1));
    group.add(new THREE.Points(geo, pmat));

    var E = g.edges.length, lp = new Float32Array(E * 6), lc = new Float32Array(E * 6);
    for (var i = 0; i < E; i++) {
      var a = g.edges[i][0], b = g.edges[i][1];
      for (var k = 0; k < 3; k++) { lp[i * 6 + k] = g.pos[a * 3 + k]; lp[i * 6 + 3 + k] = g.pos[b * 3 + k]; lc[i * 6 + k] = g.col[a * 3 + k] * 0.42; lc[i * 6 + 3 + k] = g.col[b * 3 + k] * 0.42; }
    }
    var lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    lg.setAttribute('color', new THREE.BufferAttribute(lc, 3));
    group.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })));

    var pk = makePackets(g), ppos = new Float32Array(PACKETS * 3), pcol = new Float32Array(PACKETS * 3), psize = new Float32Array(PACKETS);
    for (var q = 0; q < PACKETS; q++) { pcol[q * 3] = 0.6; pcol[q * 3 + 1] = 1; pcol[q * 3 + 2] = 1; psize[q] = 3.2; }
    var pg = new THREE.BufferGeometry();
    var pAttr = new THREE.BufferAttribute(ppos, 3);
    pg.setAttribute('position', pAttr);
    pg.setAttribute('aColor', new THREE.BufferAttribute(pcol, 3));
    pg.setAttribute('aSize', new THREE.BufferAttribute(psize, 1));
    var pts = new THREE.Points(pg, pmat); pts.frustumCulled = false; group.add(pts);

    function resize() {
      var w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.position.z = 95 + (camera.aspect < 1 ? (1 - camera.aspect) * 80 : 0);
      camera.updateProjectionMatrix();
      if (reduce) renderer.render(scene, camera);
    }
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 120); });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); fallback(); }, false);
    resize();

    var t0 = 0;
    tick = function (dt) {
      t0 += dt;
      group.rotation.y = t0 * 0.045; group.rotation.x = Math.sin(t0 * 0.08) * 0.12;
      group.position.y = (window.scrollY || 0) * 0.018;
      camera.position.x += (pointer.x * 9 - camera.position.x) * 0.04;
      camera.position.y += (-pointer.y * 6 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
      stepPackets(pk, g, dt);
      for (var i = 0; i < pk.length; i++) {
        var e = g.edges[pk[i].e], a = e[0], b = e[1], tt = pk[i].t;
        for (var k = 0; k < 3; k++) ppos[i * 3 + k] = g.pos[a * 3 + k] + (g.pos[b * 3 + k] - g.pos[a * 3 + k]) * tt;
      }
      pAttr.needsUpdate = true;
      renderer.render(scene, camera);
    };
    return resize;
  }

  /* ---------- 2D canvas fallback (same graph, simple perspective) ---------- */
  function start2D(g, cv) {
    var ctx = cv.getContext('2d'); if (!ctx) throw new Error('no 2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5), w = 0, h = 0, pk = makePackets(g), ang = 0, proj = new Float32Array(N * 3);
    function resize() { w = window.innerWidth; h = window.innerHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); if (reduce) draw(); }
    function project(i) {
      var x = g.pos[i * 3], y = g.pos[i * 3 + 1], z = g.pos[i * 3 + 2];
      var ca = Math.cos(ang), sa = Math.sin(ang), x1 = x * ca - z * sa, z1 = x * sa + z * ca;
      var tilt = Math.sin(ang * 0.7) * 0.12, y1 = y * Math.cos(tilt) - z1 * Math.sin(tilt), z2 = y * Math.sin(tilt) + z1 * Math.cos(tilt);
      var f = 120, s = f / (f + z2 + 40), k = Math.max(w, h) / 112;
      proj[i * 3] = w / 2 + (x1 + pointer.x * 6) * s * k; proj[i * 3 + 1] = h / 2 + (y1 + pointer.y * 4) * s * k; proj[i * 3 + 2] = s;
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < N; i++) project(i);
      ctx.lineWidth = 1;
      for (var e = 0; e < g.edges.length; e++) {
        var a = g.edges[e][0], b = g.edges[e][1], s = (proj[a * 3 + 2] + proj[b * 3 + 2]) / 2;
        ctx.strokeStyle = 'rgba(34,211,238,' + (0.06 + s * 0.16).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(proj[a * 3], proj[a * 3 + 1]); ctx.lineTo(proj[b * 3], proj[b * 3 + 1]); ctx.stroke();
      }
      for (var n = 0; n < N; n++) {
        var sc = proj[n * 3 + 2], r = g.size[n] * sc * 1.5;
        ctx.fillStyle = 'rgba(' + Math.round(g.col[n * 3] * 255) + ',' + Math.round(g.col[n * 3 + 1] * 255) + ',' + Math.round(g.col[n * 3 + 2] * 255) + ',' + (0.35 + sc * 0.5).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(proj[n * 3], proj[n * 3 + 1], Math.max(0.8, r), 0, 6.2832); ctx.fill();
      }
      ctx.fillStyle = 'rgba(190,255,255,.95)';
      for (var p = 0; p < pk.length; p++) {
        var ed = g.edges[pk[p].e], t = pk[p].t, A = ed[0], B = ed[1];
        ctx.beginPath(); ctx.arc(proj[A * 3] + (proj[B * 3] - proj[A * 3]) * t, proj[A * 3 + 1] + (proj[B * 3 + 1] - proj[A * 3 + 1]) * t, 2, 0, 6.2832); ctx.fill();
      }
    }
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 120); });
    resize();
    tick = function (dt) { ang += dt * 0.045; stepPackets(pk, g, dt); draw(); };
  }

  var graph = null, usedFallback = false;
  function fallback() {
    if (usedFallback) return; usedFallback = true; cancelAnimationFrame(raf);
    var fresh = canvas.cloneNode(false); canvas.parentNode.replaceChild(fresh, canvas); canvas = fresh;   // a canvas locked to WebGL can't give a 2D context
    try { start2D(graph, canvas); last = performance.now(); if (reduce) tick(0.016); else raf = requestAnimationFrame(loop); }
    catch (e) { canvas.style.display = 'none'; stopped = true; }
  }

  function boot() {
    graph = buildGraph();
    try { startThree(graph); }
    catch (e) { usedFallback = false; fallback(); return; }
    last = performance.now();
    if (reduce) tick(0.016); else raf = requestAnimationFrame(loop);
  }
  // let the page paint first
  (window.requestIdleCallback || function (f) { return setTimeout(f, 60); })(boot, { timeout: 400 });
})();
