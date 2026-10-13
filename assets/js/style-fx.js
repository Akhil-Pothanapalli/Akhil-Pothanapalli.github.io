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

  /* ── Space: a three-layer starfield that drifts with scroll, twinkles and throws the odd shooting star; an orbit round the portrait ── */
  fx.space = (function () {
    var sky = null, orbit = null, raf = 0, stars = [], shoot = null, W = 0, H = 0, ctx = null, t = 0;
    function seeded(n) { var x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      sky.width = W * dpr; sky.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function frame() {
      t += 1;
      ctx.clearRect(0, 0, W, H);
      var sy = window.scrollY || 0;
      stars.forEach(function (s) {
        var y = ((s.y * H * 3 - sy * s.depth) % (H * 3) + H * 3) % (H * 3);
        if (y > H) return;
        var tw = reduce ? 1 : 0.65 + 0.35 * Math.sin(t * s.speed + s.phase);
        ctx.globalAlpha = s.a * tw; ctx.fillStyle = s.c;
        ctx.beginPath(); ctx.arc(s.x * W, y, s.r, 0, Math.PI * 2); ctx.fill();
      });
      if (!reduce) {
        if (!shoot && Math.random() < 0.004) shoot = { x: Math.random() * W * 0.8 + W * 0.2, y: Math.random() * H * 0.4, life: 0 };
        if (shoot) {
          shoot.life += 1;
          var len = 140, k = shoot.life * 9, x = shoot.x - k, y = shoot.y + k * 0.45;
          var g = ctx.createLinearGradient(x, y, x + len, y - len * 0.45);
          g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.globalAlpha = Math.max(0, 1 - shoot.life / 45); ctx.strokeStyle = g; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y - len * 0.45); ctx.stroke();
          if (shoot.life > 45) shoot = null;
        }
        raf = requestAnimationFrame(frame);
      }
      ctx.globalAlpha = 1;
    }
    function scrolled() { if (reduce) frame(); }
    return {
      on: function () {
        sky = el("canvas", "space-sky"); sky.setAttribute("aria-hidden", "true");
        document.body.insertBefore(sky, document.body.firstChild);
        ctx = sky.getContext("2d");
        var tints = ["#ffffff", "#ffffff", "#ffffff", "#cfe0ff", "#ffe2c4", "#bfefff"];
        stars = [];
        for (var i = 0; i < 420; i++) {
          var layer = i % 3;
          stars.push({ x: seeded(i), y: seeded(i + 999), depth: [0.08, 0.2, 0.42][layer], r: [0.6, 1, 1.6][layer] * (0.6 + seeded(i + 7) * 0.8),
            a: [0.45, 0.7, 0.95][layer], c: tints[i % tints.length], speed: 0.02 + seeded(i + 3) * 0.05, phase: seeded(i + 5) * 6.28 });
        }
        size(); window.addEventListener("resize", size); window.addEventListener("scroll", scrolled, { passive: true });
        var p = document.querySelector(".art .portrait");
        if (p) { orbit = el("span", "space-orbit"); orbit.setAttribute("aria-hidden", "true"); p.appendChild(orbit); }
        frame();
      },
      off: function () {
        cancelAnimationFrame(raf); window.removeEventListener("resize", size); window.removeEventListener("scroll", scrolled);
        if (sky) sky.remove(); if (orbit) orbit.remove(); sky = orbit = null; shoot = null;
      }
    };
  })();

  /* ── Food: pixel-art dishes drawn on a 24×24 grid, auto-outlined, scaled up crisp and animated like a GIF ── */
  fx.food = (function () {
    var N = 24, INK = "#2b160c", nodes = [], sprites = [], timer = 0, frame = 0;
    function hex(c) { var n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    function make() {
      var px = new Array(N * N).fill(null), soft = new Array(N * N).fill(false);
      var g = {
        set: function (x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < N && y < N) px[y * N + x] = c; },
        get: function (x, y) { return px[y * N + x]; },
        clear: function (x, y) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < N && y < N) px[y * N + x] = null; },
        steam: function (x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < N && y < N && !px[y * N + x]) { px[y * N + x] = c || "#f4efe6"; soft[y * N + x] = true; } },
        disc: function (cx, cy, r, c) { for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if ((x + .5 - cx) * (x + .5 - cx) + (y + .5 - cy) * (y + .5 - cy) <= r * r) g.set(x, y, typeof c === "function" ? c(x, y) : c); },
        outline: function () {
          var add = [];
          for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
            if (px[y * N + x]) continue;
            var near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { var X = x + d[0], Y = y + d[1]; return X >= 0 && Y >= 0 && X < N && Y < N && px[Y * N + X] && !soft[Y * N + X]; });
            if (near) add.push(y * N + x);
          }
          add.forEach(function (i) { px[i] = INK; });
        },
        data: function () { return px; }
      };
      return g;
    }
    function steam(g, xs, f, top) {
      xs.forEach(function (xc, k) {
        for (var y = top; y < top + 7; y++) {
          if ((y + f + k * 2) % 4 === 0) continue;
          g.steam(xc + Math.round(Math.sin((y + f * 1.4 + k * 2) * 0.9)), y);
        }
      });
    }
    var draw = {
      chocolate: function (g, f) {
        for (var y = 3; y <= 14; y++) for (var x = 5; x <= 18; x++) {
          var cx = (x - 5) % 7, cy = (y - 3) % 6, edge = cx === 6 || cy === 5;
          g.set(x, y, edge ? "#4a2a1a" : (cx === 0 || cy === 0) ? "#8c5530" : "#6b3a1f");
        }
        for (var y2 = 0; y2 < 9; y2++) for (var x2 = 14; x2 < 24; x2++) if ((x2 + .5 - 19.5) * (x2 + .5 - 19.5) + (y2 + .5 - 2.5) * (y2 + .5 - 2.5) < 20) g.clear(x2, y2);
        var s = f % 10;
        if (s < 7) for (var yy = 3; yy <= 14; yy++) for (var xx = 5; xx <= 18; xx++) { var d = (xx - yy) - (s * 4 - 10); if ((d === 0 || d === 1) && g.get(xx, yy)) g.set(xx, yy, "#c99a6e"); }
        for (var fy = 14; fy <= 20; fy++) for (var fx2 = 4; fx2 <= 19; fx2++) { if (fy === 14 && fx2 % 2) continue; g.set(fx2, fy, fx2 % 3 === 0 ? "#9aa1ab" : "#d7dbe1"); }
        g.outline();
      },
      truffle: function (g, f) {
        var b = (f % 6 === 1 || f % 6 === 2) ? -1 : 0;
        for (var y = 15; y <= 20; y++) for (var x = 5 + Math.floor((y - 15) / 2); x <= 18 - Math.floor((y - 15) / 2); x++) g.set(x, y, x % 2 ? "#a8693b" : "#8c5530");
        g.disc(11.5, 10.5 + b, 6.6, "#4a2a1a");
        [[8, 7], [9, 7], [8, 8]].forEach(function (p) { g.set(p[0], p[1] + b, "#8c5530"); });
        for (var x3 = 6; x3 <= 17; x3++) { var yy = Math.round(9.5 + Math.sin(x3 * 1.3) * 1.2) + b; if (g.get(x3, yy) === "#4a2a1a") g.set(x3, yy, "#fff6e5"); }
        g.outline();
      },
      jalebi: function (g, f) {
        var i = 0;
        for (var t = 0; t < Math.PI * 3.3; t += 0.06, i++) {
          var r = 1.6 + t * 1.45, x = 11.5 + r * Math.cos(t), y = 12 + r * Math.sin(t);
          var c = (Math.floor(t * 3) % 10) === (f % 10) ? "#ffe08a" : "#f28c1b";
          g.set(x, y, c); g.set(x + 1, y, c === "#ffe08a" ? c : "#e0700f");
        }
        g.outline();
      },
      samosa: function (g, f) {
        function inside(x, y) { var a = (21 - 3) * (y - 5) - (x - 12) * 0; return y >= 5 && y <= 19 && Math.abs(x + .5 - 12) <= (y - 4) * 0.64; }
        for (var y = 5; y <= 19; y++) for (var x = 2; x <= 22; x++) if (inside(x, y)) {
          var c = "#d79a3c";
          if ((x * 7 + y * 3) % 11 === 0) c = "#b0702c";
          if (Math.abs(x + .5 - 12) > (y - 4) * 0.64 - 1.2 && x < 12) c = "#e8b45c";
          if (y === 19) c = x % 2 ? "#9a5a1e" : "#b8742c";
          g.set(x, y, c);
        }
        g.set(19, 20, "#3c9a5f"); g.set(20, 20, "#3c9a5f"); g.set(20, 19, "#7cc576");
        g.outline(); steam(g, [9, 15], f, 0);
      },
      chai: function (g, f) {
        for (var y = 10; y <= 20; y++) { var l = Math.round(6 + (y - 10) * 0.3), r = Math.round(17 - (y - 10) * 0.3);
          for (var x = l; x <= r; x++) g.set(x, y, x > r - 3 ? "#7e3518" : x < l + 2 ? "#cf6d3e" : "#b5562b"); }
        for (var x2 = 6; x2 <= 17; x2++) g.set(x2, 9, "#d0784a");
        for (var x3 = 7; x3 <= 16; x3++) g.set(x3, 10, x3 < 10 ? "#d49a5e" : "#a8652f");
        for (var x4 = 7; x4 <= 16; x4++) if (x4 % 3 === 0) g.set(x4, 15, "#d0784a");
        g.outline(); steam(g, [9, 12, 15], f, 1);
      },
      jamun: function (g, f) {
        for (var y = 13; y <= 20; y++) { var hw = Math.round(10 - (y - 13) * 0.9); for (var x = 12 - hw; x < 12 + hw; x++) g.set(x, y, y === 13 ? "#eef0f3" : y > 17 ? "#9aa1ab" : "#c9ced6"); }
        for (var x2 = 4; x2 < 20; x2++) g.set(x2, 14, "#e0a02a");
        [[8, 11.4, 3.3], [15.5, 11.4, 3.3], [11.8, 9.2, 3.1]].forEach(function (b) {
          g.disc(b[0], b[1], b[2], function (x, y) { return (x + .5 < b[0] - .6 && y + .5 < b[1] - .6) ? "#c0562a" : "#7a2f12"; });
        });
        g.outline(); steam(g, [9, 15], f, 0);
      },
      ladoo: function (g, f) {
        var b = (f % 6 === 2 || f % 6 === 3) ? -1 : 0;
        function ball(cx, cy) { g.disc(cx, cy, 4.6, function (x, y) { if (x + .5 < cx - 1 && y + .5 < cy - 1) return "#ffd27a"; return (x * 5 + y * 7) % 6 === 0 ? "#d9821a" : "#f5a623"; }); }
        ball(7.5, 16.5); ball(16.5, 16.5); ball(12, 9.5 + b);
        g.outline();
      },
      chilli: function (g, f) {
        var w = Math.round(Math.sin(f * 0.9));
        for (var t = 0; t <= 1; t += 0.02) {
          var x = 5 + t * 15, y = 7 + 10 * t * t + w * t, th = 2.6 - t * 1.8;
          for (var k = -th; k <= th; k += 0.5) g.set(x, y + k, k < -th + 0.8 ? "#f06a4f" : "#d6402b");
        }
        g.set(4, 6, "#3c9a5f"); g.set(3, 5, "#3c9a5f"); g.set(4, 5, "#7cc576"); g.set(5, 6, "#3c9a5f"); g.set(3, 4, "#3c9a5f");
        g.outline();
      }
    };
    function sprite(name) {
      var c = el("canvas", "food-sprite"); c.width = N; c.height = N; c.setAttribute("aria-hidden", "true");
      sprites.push({ c: c, ctx: c.getContext("2d"), name: name }); return c;
    }
    function render() {
      sprites.forEach(function (s) {
        var g = make(); draw[s.name](g, frame);
        var img = s.ctx.createImageData(N, N), d = g.data();
        d.forEach(function (c, i) { if (!c) return; var v = hex(c); img.data[i * 4] = v[0]; img.data[i * 4 + 1] = v[1]; img.data[i * 4 + 2] = v[2]; img.data[i * 4 + 3] = 255; });
        s.ctx.putImageData(img, 0, 0);
      });
    }
    return {
      on: function () {
        var p = document.querySelector(".art .portrait");
        if (p) {
          var ring = el("div", "food-ring"); ring.setAttribute("aria-hidden", "true");
          ["chai", "samosa", "jalebi", "jamun", "ladoo", "chocolate"].forEach(function (n, i) {
            var a = (-150 + i * 60) * Math.PI / 180, s = sprite(n);
            s.style.left = (50 + 49 * Math.cos(a)) + "%"; s.style.top = (50 + 49 * Math.sin(a)) + "%";
            ring.appendChild(s);
          });
          p.appendChild(ring); nodes.push(ring);
        }
        var bySection = { about: "chai", research: "samosa", papers: "chocolate", skills: "chilli", work: "ladoo" };
        Object.keys(bySection).forEach(function (id) {
          var head = document.querySelector("#" + id + " .sec-head");
          if (!head) return;
          var s = sprite(bySection[id]); head.insertBefore(s, head.firstChild); nodes.push(s);
        });
        var title = document.querySelector(".poster-title");
        if (title) {
          var box = el("div", "food-dessert"); box.setAttribute("aria-hidden", "true");
          ["truffle", "chocolate", "jamun", "truffle"].forEach(function (n) { box.appendChild(sprite(n)); });
          title.after(box); nodes.push(box);
        }
        render();
        if (!reduce) timer = setInterval(function () { frame++; render(); }, 170);
      },
      off: function () {
        clearInterval(timer); nodes.forEach(function (n) { n.remove(); }); nodes = []; sprites = []; frame = 0;
      }
    };
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
