/* Per-style extras that CSS alone can't do. Each style may register { on, off }; the active one
   is started on load and swapped whenever the style picker fires "stylechange". */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;

  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function tickerWords(t) { return Array.prototype.map.call(t.querySelectorAll(".ticker-run:first-child span:not(.dot)"), function (s) { return s.textContent; }); }

  var fx = {};

  /* ── Terminal: boot screen, typed banners, section titles typed on arrival ── */
  fx.terminal = (function () {
    var timers = [], io = null, nodes = [], titles = [];
    function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
    function typeLoop(out, words, i) {
      var w = words[i % words.length], c = 0;
      (function type() {
        out.textContent = w.slice(0, ++c);
        if (c < w.length) return later(type, 38 + Math.random() * 50);
        later(function erase() {
          out.textContent = w.slice(0, --c);
          if (c > 0) return later(erase, 14);
          later(function () { typeLoop(out, words, i + 1); }, 260);
        }, 1500);
      })();
    }
    function typeTitle(h) {
      var full = h.getAttribute("data-full"), c = 0;
      h.classList.add("is-typing");
      (function step() {
        h.textContent = full.slice(0, ++c);
        if (c < full.length) later(step, 55 + Math.random() * 45); else h.classList.remove("is-typing");
      })();
    }
    function boot() {
      try { if (sessionStorage.getItem("termBooted")) return; sessionStorage.setItem("termBooted", "1"); } catch (e) {}
      var lines = [
        "AKHIL-BIOS (C) 2026  Hyderabad Audio Lab",
        "Memory check ........................ 640K OK",
        "Detecting microphones ............... 2 found",
        "[ OK ] Loaded speech recognition",
        "[ OK ] Loaded speaker diarization",
        "[ OK ] Loaded long-form audio reasoning",
        "[ OK ] Full-duplex voice link established",
        "",
        "Welcome, visitor. Press any key to skip."
      ];
      var ov = el("div", "term-boot"), pre = el("pre");
      ov.setAttribute("aria-hidden", "true");
      ov.appendChild(pre); document.body.appendChild(ov); nodes.push(ov);
      var done = function () { ov.classList.add("is-done"); later(function () { ov.remove(); }, 400); window.removeEventListener("keydown", done); };
      ov.addEventListener("click", done); window.addEventListener("keydown", done);
      lines.forEach(function (l, i) { later(function () { pre.textContent += l + "\n"; }, 140 * i); });
      later(done, 140 * lines.length + 700);
    }
    return {
      on: function () {
        document.querySelectorAll(".ticker").forEach(function (t, k) {
          var words = tickerWords(t), box = el("div", "typer");
          box.setAttribute("aria-hidden", "true");
          box.appendChild(el("span", "typer-prompt", k ? "akhil@lab:~$ tail -f research.log &gt; " : "akhil@lab:~$ echo "));
          var out = el("span", "typer-text"); box.appendChild(out); box.appendChild(el("span", "typer-cur", "█"));
          t.appendChild(box); nodes.push(box);
          if (reduce) out.textContent = words.join(" · "); else typeLoop(out, words, k);
        });
        if (reduce) return;
        boot();
        titles = Array.prototype.slice.call(document.querySelectorAll(".sec-title"));
        titles.forEach(function (h) { h.setAttribute("data-full", h.textContent); h.setAttribute("aria-label", h.textContent); h.textContent = ""; });
        io = new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); typeTitle(e.target); } });
        }, { rootMargin: "0px 0px -15% 0px" });
        titles.forEach(function (h) { io.observe(h); });
      },
      off: function () {
        timers.forEach(clearTimeout); timers = [];
        if (io) io.disconnect(); io = null;
        nodes.forEach(function (n) { n.remove(); }); nodes = [];
        titles.forEach(function (h) { h.textContent = h.getAttribute("data-full"); h.removeAttribute("data-full"); h.removeAttribute("aria-label"); h.classList.remove("is-typing"); });
        titles = [];
      }
    };
  })();

  /* ── Flat (Metro): a Start screen of live tiles built from the page's own content ── */
  fx.flat = (function () {
    var box = null, timers = [];
    var mailSvg = '<svg class="mt-icon" viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="2.5"><rect x="5" y="11" width="38" height="26"/><path d="M5 11l19 15 19-15"/></svg>';
    var capSvg = '<svg class="mt-icon" viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="2.5"><path d="M3 18 24 8l21 10-21 10z"/><path d="M12 23v10c6 5 18 5 24 0V23"/><path d="M45 18v12"/></svg>';
    function texts(sel) { return Array.prototype.map.call(document.querySelectorAll(sel), function (n) { return n.textContent.trim(); }); }
    function esc(t) { return t.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    function live(tile, backs, every, delay) {
      var i = 0, back = tile.querySelector(".mt-back");
      function flip() {
        if (!tile.classList.contains("is-flipped")) { back.innerHTML = backs[i % backs.length]; i++; }
        tile.classList.toggle("is-flipped");
        timers.push(setTimeout(flip, every));
      }
      timers.push(setTimeout(flip, delay));
    }
    /* live tiles further down the page: a two-face box that slides up, refilling the hidden face each time */
    var boxes = [], hidden = [];
    function cycle(box, faces, every, delay) {
      var flip = box.querySelector(".mt-flip"), a = flip.children[0], b = flip.children[1], i = 0;
      a.innerHTML = faces[0];
      if (reduce || faces.length < 2) return;
      function step() {
        i = (i + 1) % faces.length;
        var showingB = box.classList.contains("is-flipped");
        (showingB ? a : b).innerHTML = faces[i];
        box.classList.toggle("is-flipped");
        timers.push(setTimeout(step, every));
      }
      timers.push(setTimeout(step, delay));
    }
    function liveBox(cls) {
      var box = el("div", "mt-box " + cls, '<div class="mt-flip"><div class="mt-face"></div><div class="mt-face mt-back"></div></div>');
      box.setAttribute("aria-hidden", "true"); boxes.push(box); return box;
    }
    function hide(n) { if (n) { n.classList.add("mt-sr"); hidden.push(n); } }
    var glyph = {
      email: '<svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="2.5"><rect x="5" y="11" width="38" height="26"/><path d="M5 11l19 15 19-15"/></svg>',
      "google scholar": '<svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="2.5"><path d="M3 18 24 8l21 10-21 10z"/><path d="M12 23v10c6 5 18 5 24 0V23"/><path d="M45 18v12"/></svg>',
      linkedin: '<span class="mt-glyph">in</span>',
      github: '<span class="mt-glyph">{ }</span>'
    };
    function deeper() {
      var k = 0;
      document.querySelectorAll(".proj").forEach(function (p) {
        var facts = Array.prototype.map.call(p.querySelectorAll(".proj-facts > div"), function (d) {
          return '<span class="mt-big">' + esc(d.querySelector("dt").textContent) + '</span><small>' + esc(d.querySelector("dd").textContent) + '</small>';
        });
        var dl = p.querySelector(".proj-facts");
        if (!dl || !facts.length) return;
        var box = liveBox("mt-facts"); dl.after(box); hide(dl);
        cycle(box, facts, 3200, 1800 + 900 * k++);
      });
      var now = document.querySelector(".now ol");
      if (now) {
        var items = Array.prototype.map.call(now.querySelectorAll("li"), function (li, n) {
          return '<span class="mt-num">' + (n + 1) + '</span><b>' + esc(li.textContent.trim()) + '</b>';
        });
        var nb = liveBox("mt-now"); now.after(nb); hide(now);
        cycle(nb, items, 2800, 1200);
      }
      document.querySelectorAll(".link-cell").forEach(function (c, n) {
        var label = (c.querySelector(".label") || {}).textContent || "", handle = c.querySelector("strong");
        var icon = glyph[label.trim().toLowerCase()];
        if (!handle || !icon) return;
        var box = liveBox("mt-link"); c.appendChild(box); hide(handle);
        cycle(box, ['<span class="mt-handle">' + esc(handle.textContent) + '</span>', '<span class="mt-icon-face">' + icon + '</span>'], 4200, 2200 + 1100 * n);
      });
    }

    /* the waveform becomes the Music + Videos "now playing" tile */
    var np = [], ticker = null;
    function clock(t) { return Math.floor(t / 60) + ":" + ("0" + Math.floor(t % 60)).slice(-2); }
    function player() {
      var bar = document.querySelector(".wavebar");
      if (!bar) return;
      var ico = {
        prev: '<svg viewBox="0 0 16 16"><path d="M3 2h2v12H3zM14 2v12L6 8z"/></svg>',
        pause: '<svg viewBox="0 0 16 16"><path d="M3 2h3.5v12H3zM9.5 2H13v12H9.5z"/></svg>',
        play: '<svg viewBox="0 0 16 16"><path d="M4 2l10 6-10 6z"/></svg>',
        next: '<svg viewBox="0 0 16 16"><path d="M11 2h2v12h-2zM2 2v12l8-6z"/></svg>'
      };
      var info = el("div", "np-info",
        '<span class="np-kicker">now playing</span><span class="np-title">machines that listen</span>' +
        '<span class="np-artist">akhil pothanapalli · speech &amp; audio ai</span>' +
        '<span class="np-progress"><span class="np-now">1:12</span><span class="np-bar"><span class="np-fill"></span></span><span class="np-len">3:47</span></span>');
      var ctrl = el("div", "np-ctrl",
        '<button type="button" class="np-btn" aria-label="Previous">' + ico.prev + '</button>' +
        '<button type="button" class="np-btn np-play" aria-label="Pause">' + ico.pause + '</button>' +
        '<button type="button" class="np-btn" aria-label="Next">' + ico.next + '</button>');
      bar.appendChild(info); bar.appendChild(ctrl); np = [info, ctrl];
      var len = 227, t = 72, playing = true, fill = info.querySelector(".np-fill"), now = info.querySelector(".np-now"), play = ctrl.querySelector(".np-play");
      function paint() { fill.style.width = (t / len * 100).toFixed(2) + "%"; now.textContent = clock(t); }
      paint();
      play.addEventListener("click", function () {
        playing = !playing;
        bar.classList.toggle("is-paused", !playing);
        play.innerHTML = playing ? ico.pause : ico.play;
        play.setAttribute("aria-label", playing ? "Pause" : "Play");
      });
      var skip = ctrl.querySelectorAll(".np-btn");
      skip[0].addEventListener("click", function () { t = 0; paint(); });
      skip[2].addEventListener("click", function () { t = 0; paint(); });
      if (!reduce) ticker = setInterval(function () { if (playing) { t = (t + 1) % len; paint(); } }, 1000);
      window.dispatchEvent(new Event("resize"));
    }

    return {
      on: function () {
        var stage = document.querySelector(".stage");
        if (!stage) return;
        var mail = document.querySelector(".nav-cta"), scholar = document.querySelector('.bubble a[href*="scholar"]');
        var pubs = document.querySelectorAll(".pub"), venues = texts(".pub-short"), projects = texts(".proj-title"), kickers = texts(".proj-kicker"), now = texts(".now li");
        box = el("div", "metro-tiles");
        box.innerHTML =
          '<a class="mt mt-wide mt-live" href="#papers"><div class="mt-flip"><div class="mt-face"><span class="mt-big">' + pubs.length + '</span><small>papers and workshop contributions</small></div><div class="mt-face mt-back"></div></div><span class="mt-label">papers</span></a>' +
          (mail ? '<a class="mt" href="' + esc(mail.getAttribute("href")) + '">' + mailSvg + '<span class="mt-label">mail</span></a>' : "") +
          (scholar ? '<a class="mt" href="' + esc(scholar.getAttribute("href")) + '" target="_blank" rel="noopener">' + capSvg + '<span class="mt-label">scholar</span></a>' : "") +
          '<a class="mt mt-wide mt-live" href="#research"><div class="mt-flip"><div class="mt-face"><b>now working on</b><small>' + esc(now.slice(0, 2).join(" · ")) + '</small></div><div class="mt-face mt-back"></div></div><span class="mt-label">research</span></a>';
        stage.appendChild(box);
        player();
        deeper();
        if (reduce) return;
        var tiles = box.querySelectorAll(".mt-live");
        live(tiles[0], venues.map(function (v) { return "<b>" + esc(v) + "</b>"; }), 3800, 2600);
        live(tiles[1], projects.map(function (p, k) { return "<b>" + esc(p) + "</b><small>" + esc(kickers[k] || "") + "</small>"; }), 4600, 4200);
      },
      off: function () {
        timers.forEach(clearTimeout); timers = [];
        if (box) box.remove(); box = null;
        if (ticker) clearInterval(ticker); ticker = null;
        np.forEach(function (n) { n.remove(); }); np = [];
        boxes.forEach(function (n) { n.remove(); }); boxes = [];
        hidden.forEach(function (n) { n.classList.remove("mt-sr"); }); hidden = [];
        var bar = document.querySelector(".wavebar"); if (bar) bar.classList.remove("is-paused");
        window.dispatchEvent(new Event("resize"));
      }
    };
  })();

  /* ── Swiss: concentric arcs, sound as Müller-Brockmann geometry, on the hero and contact posters ── */
  fx.swiss = (function () {
    var layers = [], raf = 0;
    function seeded(n) { var x = Math.sin(n * 97.13) * 43758.5453; return x - Math.floor(x); }
    function rings(count) {
      var out = [];
      for (var i = 0; i < count; i++) {
        out.push({ r: 0.1 + i * 0.065, w: [2, 9, 3, 14, 2, 5][i % 6], a: seeded(i) * Math.PI * 2, len: 0.6 + seeded(i + 40) * 1.5, v: (seeded(i + 80) - 0.5) * 0.0026, red: i % 5 === 3 });
      }
      return out;
    }
    function add(host, cx, cy, reach, ink, red) {
      if (!host) return;
      var c = el("canvas", "swiss-arcs"); c.setAttribute("aria-hidden", "true");
      host.insertBefore(c, host.firstChild);
      layers.push({ c: c, ctx: c.getContext("2d"), cx: cx, cy: cy, reach: reach, ink: ink, red: red, rings: rings(16) });
    }
    function paint() {
      layers.forEach(function (L) {
        var dpr = Math.min(window.devicePixelRatio || 1, 2), w = L.c.clientWidth, h = L.c.clientHeight;
        if (!w || !h) return;
        if (L.c.width !== Math.round(w * dpr) || L.c.height !== Math.round(h * dpr)) { L.c.width = Math.round(w * dpr); L.c.height = Math.round(h * dpr); }
        var g = L.ctx, scale = w * (w < 700 ? L.reach * 0.55 : L.reach);
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); g.lineCap = "butt";
        L.rings.forEach(function (R) {
          if (!reduce) R.a += R.v;
          g.strokeStyle = R.red ? L.red : L.ink; g.lineWidth = R.w;
          g.beginPath(); g.arc(w * L.cx, h * L.cy, R.r * scale, R.a, R.a + R.len); g.stroke();
        });
      });
      if (!reduce) raf = requestAnimationFrame(paint);
    }
    return {
      on: function () {
        add(document.querySelector(".stage"), 1, 1, 0.5, "rgba(242, 240, 234, .85)", "#b3261e");
        add(document.querySelector(".poster"), 1, 0, 0.34, "#111111", "#f2f0ea");
        paint();
      },
      off: function () {
        cancelAnimationFrame(raf);
        layers.forEach(function (L) { L.c.remove(); }); layers = [];
      }
    };
  })();

  /* ── Space: a night sky with the Milky Way, the portrait as a Sun with planets and an asteroid belt in orbit,
        asteroids streaking past with debris trails, and a mission clock ── */
  fx.space = (function () {
    var nodes = [], raf = 0, t = 0, sky, sctx, W = 0, H = 0, stars = [], streaks = [];
    var sys = null, back, front, bctx, fctx, belt = [], hud, met, t0 = Date.now();
    function seeded(n) { var x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }
    var planets = [
      { name: "mercury", a: 1.42, r: 4, c: ["#d9cfc4", "#8a7f74"], speed: 1.6, ph: 0.4 },
      { name: "venus", a: 1.72, r: 6.5, c: ["#ffe6b0", "#c9963c"], speed: 1.18, ph: 2.1 },
      { name: "earth", a: 2.05, r: 7, c: ["#7fd0ff", "#1d5fa8"], speed: 1, ph: 4.0, moon: true },
      { name: "mars", a: 2.38, r: 5, c: ["#ff9c6b", "#a4361c"], speed: .8, ph: 1.0 },
      { name: "jupiter", a: 3.25, r: 15, c: ["#f3d2a6", "#a7643a"], speed: .42, ph: 5.2, bands: true },
      { name: "saturn", a: 3.85, r: 12, c: ["#f7e3b0", "#b48a4a"], speed: .32, ph: 3.0, ring: true }
    ];
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      sky.width = W * dpr; sky.height = H * dpr; sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (sys) [back, front].forEach(function (c) { var w = c.clientWidth, h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0); });
    }
    function drawSky() {
      sctx.clearRect(0, 0, W, H);
      var sy = window.scrollY || 0;
      stars.forEach(function (s) {
        var y = ((s.y * H * 3 - sy * s.depth) % (H * 3) + H * 3) % (H * 3);
        if (y > H) return;
        sctx.globalAlpha = s.a * (reduce ? 1 : 0.6 + 0.4 * Math.sin(t * s.speed + s.phase));
        sctx.fillStyle = s.c; sctx.beginPath(); sctx.arc(s.x * W, y, s.r, 0, 6.283); sctx.fill();
      });
      if (!reduce && Math.random() < 0.006 && streaks.length < 2) {
        var fromLeft = Math.random() < .5;
        streaks.push({ x: fromLeft ? -40 : W + 40, y: Math.random() * H * .6, vx: (fromLeft ? 1 : -1) * (5 + Math.random() * 4), vy: 1.4 + Math.random() * 2, r: 2 + Math.random() * 2.5, life: 0, debris: [] });
      }
      streaks = streaks.filter(function (a) {
        a.life++; a.x += a.vx; a.y += a.vy;
        if (a.life % 2 === 0) a.debris.push({ x: a.x, y: a.y, l: 0, dx: (Math.random() - .5) * .8, dy: (Math.random() - .5) * .8 });
        var g = sctx.createLinearGradient(a.x, a.y, a.x - a.vx * 26, a.y - a.vy * 26);
        g.addColorStop(0, "rgba(255,220,180,.85)"); g.addColorStop(1, "rgba(255,220,180,0)");
        sctx.globalAlpha = 1; sctx.strokeStyle = g; sctx.lineWidth = a.r * 1.4; sctx.lineCap = "round";
        sctx.beginPath(); sctx.moveTo(a.x, a.y); sctx.lineTo(a.x - a.vx * 26, a.y - a.vy * 26); sctx.stroke();
        a.debris = a.debris.filter(function (d) { d.l++; d.x += d.dx; d.y += d.dy; sctx.globalAlpha = Math.max(0, .7 - d.l / 50); sctx.fillStyle = "#ffcfa0"; sctx.fillRect(d.x, d.y, 1.6, 1.6); return d.l < 50; });
        sctx.globalAlpha = 1; sctx.fillStyle = "#8f8478"; sctx.beginPath(); sctx.ellipse(a.x, a.y, a.r * 1.3, a.r, .6, 0, 6.283); sctx.fill();
        return a.x > -200 && a.x < W + 200 && a.y < H + 200;
      });
      sctx.globalAlpha = 1;
    }
    function planet(g, p, x, y, scale) {
      var r = p.r * scale;
      if (p.ring) { g.strokeStyle = "rgba(230,205,150,.75)"; g.lineWidth = r * .35; g.beginPath(); g.ellipse(x, y, r * 2.1, r * .7, -.35, 0, 6.283); g.stroke(); }
      var grd = g.createRadialGradient(x - r * .4, y - r * .4, r * .2, x, y, r);
      grd.addColorStop(0, p.c[0]); grd.addColorStop(1, p.c[1]);
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
      if (p.bands) { g.save(); g.beginPath(); g.arc(x, y, r, 0, 6.283); g.clip(); g.fillStyle = "rgba(140,70,30,.45)"; [-.45, -.1, .3].forEach(function (k) { g.fillRect(x - r, y + k * r, r * 2, r * .16); }); g.restore(); }
    }
    function drawSystem() {
      var w = back.clientWidth, h = back.clientHeight, cx = w / 2, cy = h / 2, R = sys.clientWidth / 2 * 0.62, tilt = 0.36, rot = -0.22;
      bctx.clearRect(0, 0, w, h); fctx.clearRect(0, 0, w, h);
      function pos(a, ang) { var x = Math.cos(ang) * a * R, y = Math.sin(ang) * a * R * tilt; return { x: cx + x * Math.cos(rot) - y * Math.sin(rot), y: cy + x * Math.sin(rot) + y * Math.cos(rot), front: Math.sin(ang) > 0 }; }
      planets.forEach(function (p) {
        [bctx, fctx].forEach(function (g, k) {
          g.strokeStyle = "rgba(140,170,255,.22)"; g.lineWidth = 1; g.beginPath();
          for (var i = 0; i <= 64; i++) { var an = k ? i / 64 * Math.PI : Math.PI + i / 64 * Math.PI, q = pos(p.a, an); if (i) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); }
          g.stroke();
        });
      });
      belt.forEach(function (b) {
        if (!reduce) b.ang += b.v;
        var q = pos(b.a, b.ang), g = q.front ? fctx : bctx;
        g.globalAlpha = b.alpha; g.fillStyle = b.c; g.fillRect(q.x, q.y, b.s, b.s);
      });
      bctx.globalAlpha = fctx.globalAlpha = 1;
      planets.forEach(function (p) {
        var ang = p.ph + (reduce ? 0 : t * 0.004 * p.speed), q = pos(p.a, ang), g = q.front ? fctx : bctx, scale = q.front ? 1.1 : .85;
        planet(g, p, q.x, q.y, scale);
        if (p.moon) { var ma = t * .03, mx = q.x + Math.cos(ma) * 14, my = q.y + Math.sin(ma) * 6; g.fillStyle = "#d6d9e0"; g.beginPath(); g.arc(mx, my, 2.2, 0, 6.283); g.fill(); }
      });
    }
    function loop() {
      t++; drawSky(); if (sys) drawSystem();
      if (met) { var s = Math.floor((Date.now() - t0) / 1000); met.textContent = "T+ " + ("0" + Math.floor(s / 3600)).slice(-2) + ":" + ("0" + Math.floor(s / 60) % 60).slice(-2) + ":" + ("0" + s % 60).slice(-2); }
      if (!reduce) raf = requestAnimationFrame(loop);
    }
    function scrolled() { if (reduce) drawSky(); }
    return {
      on: function () {
        sky = el("canvas", "space-sky"); sky.setAttribute("aria-hidden", "true");
        document.body.insertBefore(sky, document.body.firstChild); nodes.push(sky);
        sctx = sky.getContext("2d");
        var tints = ["#ffffff", "#ffffff", "#ffffff", "#cfe0ff", "#ffe2c4", "#bfefff"];
        stars = [];
        for (var i = 0; i < 520; i++) {
          var layer = i % 3;
          stars.push({ x: seeded(i), y: seeded(i + 999), depth: [.08, .2, .42][layer], r: [.5, .9, 1.5][layer] * (.6 + seeded(i + 7) * .8),
            a: [.4, .65, .95][layer], c: tints[i % tints.length], speed: .02 + seeded(i + 3) * .05, phase: seeded(i + 5) * 6.28 });
        }
        for (var m = 0; m < 900; m++) {
          var u = seeded(m + 5000), v = (seeded(m + 7000) - .5) * .16 + (seeded(m + 8000) - .5) * .06;
          stars.push({ x: u, y: (.15 + u * .55 + v) / 3, depth: .1, r: .45 + seeded(m + 9000) * .5, a: .3 + seeded(m + 9100) * .4, c: "#e9ecff", speed: .03, phase: seeded(m) * 6.28 });
        }
        var p = document.querySelector(".art .portrait");
        if (p) {
          sys = el("div", "space-system"); sys.setAttribute("aria-hidden", "true");
          back = el("canvas", "space-back"); front = el("canvas", "space-front");
          sys.appendChild(back); sys.appendChild(front); p.appendChild(sys); nodes.push(sys);
          bctx = back.getContext("2d"); fctx = front.getContext("2d");
          belt = [];
          for (var k = 0; k < 340; k++) belt.push({ a: 2.62 + seeded(k + 300) * .4, ang: seeded(k + 400) * 6.283, v: .0012 + seeded(k + 500) * .0012, s: .8 + seeded(k + 600) * 1.8, alpha: .35 + seeded(k + 700) * .5, c: k % 3 ? "#b9ad9f" : "#8f8478" });
        }
        hud = el("div", "space-hud", '<span class="hud-dot"></span>MISSION ELAPSED <b class="hud-met">T+ 00:00:00</b><span class="hud-sep">·</span>VEL 7.66 km/s<span class="hud-sep">·</span>SIGNAL ▮▮▮▮▯');
        hud.setAttribute("aria-hidden", "true"); document.body.appendChild(hud); nodes.push(hud); met = hud.querySelector(".hud-met");
        size(); window.addEventListener("resize", size); window.addEventListener("scroll", scrolled, { passive: true });
        loop();
      },
      off: function () {
        cancelAnimationFrame(raf); window.removeEventListener("resize", size); window.removeEventListener("scroll", scrolled);
        nodes.forEach(function (n) { n.remove(); }); nodes = []; sys = null; met = null; streaks = [];
      }
    };
  })();

  /* ── Food: food emojis as the icons, a lazy-susan ring round the thali and a few dishes floating past ── */
  fx.food = (function () {
    var nodes = [];
    function emoji(ch, cls) { var e = el("span", "food-emoji" + (cls ? " " + cls : ""), ch); e.setAttribute("aria-hidden", "true"); return e; }
    return {
      on: function () {
        var p = document.querySelector(".art .portrait");
        if (p) {
          var ring = el("div", "food-ring"); ring.setAttribute("aria-hidden", "true");
          var dishes = ["☕", "🥟", "🍛", "🍫", "🍩", "🌶️", "🍪", "🧁"];
          dishes.forEach(function (d, i) {
            var a = (i / dishes.length) * Math.PI * 2 - Math.PI / 2, s = el("span", "food-emoji", d);
            s.style.left = (50 + 50 * Math.cos(a)) + "%"; s.style.top = (50 + 50 * Math.sin(a)) + "%";
            ring.appendChild(s);
          });
          p.appendChild(ring); nodes.push(ring);
        }
        var bySection = { about: "☕", research: "🍫", papers: "🍛", skills: "🧇", work: "🍪" };
        Object.keys(bySection).forEach(function (id) {
          var head = document.querySelector("#" + id + " .sec-head");
          if (!head) return;
          var e = emoji(bySection[id]); head.insertBefore(e, head.firstChild); nodes.push(e);
        });
        var title = document.querySelector(".poster-title");
        if (title) { var box = el("div", "food-dessert food-emoji", "🍫 🍩 🧁 🍪 🍬"); box.setAttribute("aria-hidden", "true"); title.after(box); nodes.push(box); }
        var float = el("div", "food-float"); float.setAttribute("aria-hidden", "true");
        ["🍫", "🍩", "🥟", "🍪", "🌶️", "🧁", "☕", "🍬", "🍛", "🥭", "🍫", "🍪"].forEach(function (d, i) {
          var s = el("span", "food-emoji", d);
          s.style.left = ((i * 37) % 96) + "%"; s.style.top = ((i * 53 + 11) % 92) + "%";
          s.style.animationDelay = (-i * 1.9) + "s"; float.appendChild(s);
        });
        document.body.insertBefore(float, document.body.firstChild); nodes.push(float);
      },
      off: function () { nodes.forEach(function (n) { n.remove(); }); nodes = []; }
    };
  })();

  /* ── Pixel / 8-bit: NES sprites drawn in code, a live HUD, hittable ? blocks, a pixelated portrait and a CONTINUE? countdown ── */
  fx.pixel = (function () {
    var root = document.documentElement, nodes = [], timers = [], io = null, onScroll = null, vars = [];
    var P = { k: "#000000", w: "#fcfcfc", y: "#fcbc3c", Y: "#c84c0c", o: "#c84c0c", O: "#fc9838", n: "#881400", g: "#00a800", G: "#80d010", d: "#005800", c: "#a4e4fc", r: "#d82800", R: "#fc7460", s: "#a4a4a4" };
    function draw(w, h, scale, fn) {
      var c = document.createElement("canvas"); c.width = w * scale; c.height = h * scale;
      var g = c.getContext("2d");
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { var ch = fn(x, y); if (ch && P[ch]) { g.fillStyle = P[ch]; g.fillRect(x * scale, y * scale, scale, scale); } }
      return 'url("' + c.toDataURL() + '")';
    }
    function rows(r, scale) { return draw(r[0].length, r.length, scale || 1, function (x, y) { var ch = r[y][x]; return ch === "." ? null : ch; }); }
    function blob(w, h, discs, fill, shade, scale) {
      var grid = [];
      for (var y = 0; y < h; y++) { grid[y] = []; for (var x = 0; x < w; x++) {
        var inside = discs.some(function (d) { return (x + .5 - d[0]) * (x + .5 - d[0]) / (d[2] * d[2]) + (y + .5 - d[1]) * (y + .5 - d[1]) / ((d[3] || d[2]) * (d[3] || d[2])) <= 1; });
        grid[y][x] = inside ? (y > h * .62 ? shade : fill) : null;
      } }
      return draw(w, h, scale || 1, function (x, y) {
        if (grid[y][x]) return grid[y][x];
        var n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { var X = x + d[0], Y = y + d[1]; return X >= 0 && Y >= 0 && X < w && Y < h && grid[Y][X]; });
        return n ? "k" : null;
      });
    }
    function sprites() {
      var q = [".kkkkkkkkkkkkkk.", "kyyyyyyyyyyyyyyk", "kykyyyyyyyyyykyk", "kyyyykkkkkyyyyyk", "kyyykkYyykkyyyyk", "kyyykkYyykkYyyyk", "kyyyyYYyykkYyyyk",
               "kyyyyyyykkYYyyyk", "kyyyyyykkYYyyyyk", "kyyyyyykkYyyyyyk", "kyyyyyyYYyyyyyyk", "kyyyyyykkyyyyyyk", "kyyyyyykkYyyyyyk", "kykyyyyyYYyyykyk", "kyyyyyyyyyyyyyyk", ".kkkkkkkkkkkkkk."];
      var blank = q.map(function (r, i) { return i > 2 && i < 13 ? "kyyyyyyyyyyyyyyk" : r; });
      var used = q.map(function (r, i) { return r.replace(/[yY]/g, "o").replace(/k(?=o)/g, "k"); }).map(function (r, i) { return i > 2 && i < 13 ? "kooooooooooooook" : r; });
      var coin = ["..kkkk..", ".kyyyyk.", "kyywwyyk", "kyywYyyk", "kyywYyyk", "kyywYyyk", "kyywYyyk", "kyywYyyk", "kyywYyyk", "kyyyYyyk", ".kyyyyk.", "..kkkk.."];
      var heart = [".kk...kk.", "kRRk.krrk", "kRrrkrrrk", "krrrrrrrk", ".krrrrrk.", "..krrrk..", "...krk...", "....k...."];
      var arrow = ["w.....", "ww....", "www...", "wwww..", "wwwww.", "wwww..", "www...", "ww....", "w....."];
      var cursor = ["k.........", "kk........", "kwk.......", "kwwk......", "kwwwk.....", "kwwwwk....", "kwwwwwk...", "kwwwwwwk..", "kwwwwwwwk.", "kwwwwkkkkk", "kwwkwk....", "kwk.kwk...", "kk..kwk...", "k....kwk..", ".....kk..."];
      var frame = [".wwwwwww.", "w.......w", "w.......w", "w.......w", "w.......w", "w.......w", "w.......w", "w.......w", ".wwwwwww."];
      var brick = draw(16, 16, 1, function (x, y) {
        var row = Math.floor(y / 4), off = row % 2 ? 4 : 0;
        if (y % 4 === 3 || (x + off) % 8 === 7) return "k";
        return y % 4 === 0 ? "O" : "o";
      });
      var hill = (function () {
        var w = 48, h = 20;
        return draw(w, h, 1, function (x, y) {
          var cx = w / 2, inside = (x + .5 - cx) * (x + .5 - cx) / ((cx - 1) * (cx - 1)) + (y + .5 - h) * (y + .5 - h) / ((h - 1) * (h - 1)) <= 1;
          var edge = !inside && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { var X = x + d[0] + .5 - cx, Y = y + d[1] + .5 - h; return X * X / ((cx - 1) * (cx - 1)) + Y * Y / ((h - 1) * (h - 1)) <= 1 && y + d[1] < h; });
          if (edge) return "k";
          if (!inside) return null;
          if ((x === 18 || x === 19) && y > 8 && y < 13 || (x === 28 || x === 29) && y > 9 && y < 14 || (x === 23 || x === 24) && y > 4 && y < 8) return "d";
          return "g";
        });
      })();
      var cloud = blob(32, 16, [[9, 10, 6, 5], [16, 7, 7, 6], [24, 10, 6, 5], [16, 11, 10, 4]], "w", "c");
      var bush = blob(32, 12, [[8, 8, 6, 5], [16, 6, 7, 6], [24, 8, 6, 5], [16, 9, 12, 3]], "G", "g");
      return { "--px-qblock": rows(q), "--px-qblank": rows(blank), "--px-qused": rows(used), "--px-coin": rows(coin), "--px-heart": rows(heart), "--px-arrow": rows(arrow),
        "--px-frame": rows(frame), "--px-brick": brick, "--px-hill": hill, "--px-cloud": cloud, "--px-bush": bush, "--px-cursor": rows(cursor, 2) + " 0 0" };
    }
    var hud = null, score = 0, coins = 0, best = 0, time = 400;
    function pad(n, l) { return ("000000" + n).slice(-l); }
    function paint() { if (!hud) return; hud.querySelector(".hud-score b").textContent = pad(score, 6); hud.querySelector(".hud-coins b").textContent = "×" + pad(coins, 2); hud.querySelector(".hud-time b").textContent = pad(time, 3); }
    function award(n, coin) { score += n; if (coin) coins = (coins + 1) % 100; paint(); }
    function hit(block, host) {
      if (block.classList.contains("is-used")) { block.classList.remove("is-hit"); void block.offsetWidth; block.classList.add("is-hit"); return; }
      block.classList.remove("is-hit"); void block.offsetWidth; block.classList.add("is-hit");
      var c = el("span", "px-coin"), p = el("span", "px-points", "200");
      (host || block).appendChild(c); (host || block).appendChild(p);
      setTimeout(function () { c.remove(); p.remove(); }, 1000);
      award(200, true);
      if (block.classList.contains("px-block")) { block.classList.add("is-used"); timers.push(setTimeout(function () { block.classList.remove("is-used"); }, 12000)); }
    }
    return {
      on: function () {
        var sp = sprites();
        Object.keys(sp).forEach(function (k) { root.style.setProperty(k, sp[k]); vars.push(k); });
        var nav = document.querySelector(".site-nav");
        if (nav) {
          hud = el("div", "px-hud", '<span class="hud-lives">AKHIL<b>×03</b></span><span class="hud-score">SCORE<b>000000</b></span><span class="hud-coins">COINS<b>×00</b></span><span class="hud-world">WORLD<b>TITLE</b></span><span class="hud-time">TIME<b>400</b></span>');
          hud.setAttribute("aria-hidden", "true"); nav.appendChild(hud); nodes.push(hud);
        }
        var art = document.querySelector(".art"), portrait = document.querySelector(".art .portrait");
        if (art && portrait) {
          var row = el("div", "px-blocks"); row.setAttribute("aria-hidden", "true");
          for (var i = 0; i < 3; i++) { var b = el("button", "px-block"); b.type = "button"; b.tabIndex = -1; b.addEventListener("click", function () { hit(this); }); row.appendChild(b); }
          art.insertBefore(row, portrait); nodes.push(row);
          var img = portrait.querySelector("img");
          if (img) {
            var px = el("canvas", "px-portrait"); px.width = 44; px.height = 44; px.setAttribute("aria-hidden", "true");
            var paintImg = function () {
              var g = px.getContext("2d"), s = Math.min(img.naturalWidth, img.naturalHeight);
              if (!s) return;
              g.imageSmoothingEnabled = true;
              g.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 44, 44);
            };
            if (img.complete) paintImg(); else img.addEventListener("load", paintImg, { once: true });
            portrait.querySelector(".washed").appendChild(px); nodes.push(px);
          }
        }
        document.querySelectorAll(".sec-num").forEach(function (n) { n.addEventListener("click", onNum); });
        var kicker = document.querySelector(".poster-kicker");
        if (kicker) {
          var cont = el("span", "px-continue", "CONTINUE? 9"); cont.setAttribute("aria-hidden", "true");
          kicker.after(cont); nodes.push(cont);
          var k = 9; if (!reduce) timers.push(setInterval(function () { k = k > 0 ? k - 1 : 9; cont.textContent = "CONTINUE? " + k; }, 1000));
        }
        var worlds = { about: "1-1", research: "1-2", papers: "1-3", skills: "1-4", work: "2-1", contact: "2-2" };
        io = new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting && hud) { hud.querySelector(".hud-world b").textContent = worlds[e.target.id]; if (e.target.id === "contact" && best < 1e9) { award(1000); best = 1e9; } } });
        }, { rootMargin: "-40% 0px -55% 0px" });
        Object.keys(worlds).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
        onScroll = function () { var d = Math.floor((window.scrollY || 0) / 100); if (d > best && best < 1e9) { award((d - best) * 10); best = d; } };
        window.addEventListener("scroll", onScroll, { passive: true });
        if (!reduce) timers.push(setInterval(function () { time = time > 0 ? time - 1 : 400; paint(); }, 1000));
        paint();
      },
      off: function () {
        timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = [];
        if (io) io.disconnect(); io = null;
        if (onScroll) window.removeEventListener("scroll", onScroll);
        document.querySelectorAll(".sec-num").forEach(function (n) { n.removeEventListener("click", onNum); });
        nodes.forEach(function (n) { n.remove(); }); nodes = []; hud = null;
        vars.forEach(function (k) { root.style.removeProperty(k); }); vars = [];
        score = 0; coins = 0; best = 0; time = 400;
      }
    };
    function onNum(e) { var n = e.currentTarget; n.style.position = "relative"; hit(n, n); }
  })();

  /* ── Glass: floating glass orbs, and a highlight that follows the pointer across each pane ── */
  fx.glass = (function () {
    var orbs = null, sel = ".stage, .proj, .skill, .job, .now, .bubble, .link-cell, .pub, .ink, .poster";
    function move(e) {
      var pane = e.target.closest && e.target.closest(sel);
      if (!pane) return;
      var r = pane.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      pane.style.setProperty("--gx", (x * 100).toFixed(1) + "%");
      pane.style.setProperty("--gy", (y * 100).toFixed(1) + "%");
      if (pane.matches(".proj, .skill, .link-cell")) {
        pane.style.setProperty("--rx", ((0.5 - y) * 6).toFixed(2) + "deg");
        pane.style.setProperty("--ry", ((x - 0.5) * 8).toFixed(2) + "deg");
      }
    }
    function leave(e) {
      var pane = e.target.closest && e.target.closest(".proj, .skill, .link-cell");
      if (pane && !pane.contains(e.relatedTarget)) { pane.style.removeProperty("--rx"); pane.style.removeProperty("--ry"); }
    }
    return {
      on: function () {
        orbs = el("div", "glass-orbs", "<i></i><i></i><i></i><i></i><i></i>");
        orbs.setAttribute("aria-hidden", "true");
        document.body.insertBefore(orbs, document.body.firstChild);
        if (fine && !reduce) { document.addEventListener("pointermove", move); document.addEventListener("pointerout", leave); }
      },
      off: function () {
        document.removeEventListener("pointermove", move); document.removeEventListener("pointerout", leave);
        if (orbs) orbs.remove(); orbs = null;
        document.querySelectorAll(sel).forEach(function (p) { ["--gx", "--gy", "--rx", "--ry"].forEach(function (k) { p.style.removeProperty(k); }); });
      }
    };
  })();

  /* ── Skeuomorphism: the waveform becomes a cassette tape ── */
  fx.skeuo = (function () {
    var tape = null;
    return {
      on: function () {
        var bar = document.querySelector(".wavebar");
        if (!bar) return;
        tape = el("div", "cassette",
          '<div class="cs-label"><span class="cs-side">A</span><span class="cs-title">Machines that listen · mix 2026</span><span class="cs-lines"></span></div>' +
          '<div class="cs-window"><span class="cs-reel"></span><span class="cs-tape"></span><span class="cs-reel"></span></div>' +
          '<div class="cs-foot"><i></i><i></i><i></i><i></i></div>' +
          '<span class="cs-screw"></span><span class="cs-screw"></span><span class="cs-screw"></span><span class="cs-screw"></span>');
        tape.setAttribute("aria-hidden", "true");
        bar.appendChild(tape);
      },
      off: function () { if (tape) tape.remove(); tape = null; }
    };
  })();

  var current = null;
  function sync() {
    var id = root.getAttribute("data-style");
    if (id === current) return;
    if (current && fx[current]) fx[current].off();
    current = id;
    if (fx[id]) fx[id].on();
  }
  document.addEventListener("stylechange", sync);
  sync();
})();
