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
