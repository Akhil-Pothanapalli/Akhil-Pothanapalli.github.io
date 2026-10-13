/* Cyberpunk effects, registered with style-fx.js:
   neon rain behind the page, a skyline with lit windows in the hero, a hex data stream and a
   kanji neon sign in the hero margins, viewport HUD corners and a nav readout, and glitches
   that fire when a heading scrolls in or is hovered (never constantly). */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  window.registerStyleFx("cyberpunk", (function () {
    var nodes = [], timers = [], cleanups = [], io = null, ioSec = null, raf = 0;
    var rain = null, rctx = null, drops = [], city = null, cctx = null, windows = [], readout = null;
    var NEON = ["0,240,255", "0,240,255", "0,240,255", "255,42,109", "252,238,10"];
    var GLITCH = ".sec-title, .about-statement, .poster-title, .title .t1, .title .t2, .title .t3, .proj-title, .job-org, .nav-brand";

    function add(n, parent, before) { if (before) parent.insertBefore(n, before); else parent.appendChild(n); nodes.push(n); return n; }
    function listen(t, ev, fn, opt) { t.addEventListener(ev, fn, opt); cleanups.push(function () { t.removeEventListener(ev, fn, opt); }); }

    /* ── rain: thin neon streaks on a fixed canvas behind everything ── */
    function sizeRain() {
      if (!rain) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2), w = window.innerWidth, h = window.innerHeight;
      rain.width = Math.round(w * dpr); rain.height = Math.round(h * dpr);
      rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = w < 600 ? 45 : w < 1100 ? 90 : 150;
      drops = [];
      for (var i = 0; i < n; i++) drops.push(newDrop(w, h, true));
    }
    function newDrop(w, h, anywhere) {
      var z = Math.random();
      return { x: rnd(-100, w), y: anywhere ? rnd(-h, h) : rnd(-200, -20), len: 10 + z * 26, v: 6 + z * 12, a: .08 + z * .32, c: NEON[(Math.random() * NEON.length) | 0], w: z > .8 ? 1.4 : 1 };
    }
    function drawRain() {
      var w = window.innerWidth, h = window.innerHeight;
      rctx.clearRect(0, 0, w, h);
      rctx.lineCap = "round";
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i];
        rctx.strokeStyle = "rgba(" + d.c + "," + d.a.toFixed(2) + ")"; rctx.lineWidth = d.w;
        rctx.beginPath(); rctx.moveTo(d.x, d.y); rctx.lineTo(d.x + d.len * .18, d.y + d.len); rctx.stroke();
      }
    }
    function stepRain() {
      var w = window.innerWidth, h = window.innerHeight;
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i]; d.y += d.v; d.x += d.v * .18;
        if (d.y > h + 40) drops[i] = newDrop(w, h, false);
      }
    }

    /* ── skyline: drawn once per resize, a few windows blink ── */
    function drawCity() {
      if (!city) return;
      var r = city.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2), W = Math.max(1, r.width), H = Math.max(1, r.height);
      city.width = Math.round(W * dpr); city.height = Math.round(H * dpr);
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cctx.clearRect(0, 0, W, H);
      windows = [];
      // two layers: far towers (dim, tall) and near blocks (darker, wider)
      [[.95, "#140b1f", 18, 46, .35], [.7, "#0b0a12", 30, 80, .6]].forEach(function (L) {
        var x = -10;
        while (x < W) {
          var bw = rnd(L[2], L[3]), bh = H * rnd(.3, L[0]);
          cctx.fillStyle = L[1]; cctx.fillRect(x, H - bh, bw, bh);
          if (Math.random() < .25) { cctx.fillRect(x + bw / 2 - 1, H - bh - rnd(10, 30), 2, 30); } // antenna
          for (var wy = H - bh + 8; wy < H - 6; wy += 7) {
            for (var wx = x + 4; wx < x + bw - 4; wx += 6) {
              if (Math.random() < .14) {
                var c = Math.random() < .6 ? "252,238,10" : Math.random() < .6 ? "0,240,255" : "255,42,109";
                var win = { x: wx, y: wy, c: c, a: L[4] * rnd(.4, 1) };
                windows.push(win); paintWin(win, true);
              }
            }
          }
          // a neon strip on some buildings
          if (Math.random() < .18 && bh > H * .4) {
            var sc = Math.random() < .5 ? "255,42,109" : "0,240,255";
            cctx.fillStyle = "rgba(" + sc + ",.85)"; cctx.shadowColor = "rgba(" + sc + ",1)"; cctx.shadowBlur = 10;
            cctx.fillRect(x + 3, H - bh + rnd(10, bh * .5), bw - 6, 2);
            cctx.shadowBlur = 0;
          }
          x += bw + rnd(2, 10);
        }
      });
    }
    function paintWin(w, on) {
      cctx.fillStyle = on ? "rgba(" + w.c + "," + w.a.toFixed(2) + ")" : "#0b0a12";
      cctx.fillRect(w.x, w.y, 3, 3);
    }
    function blinkWindows() {
      if (!city || !windows.length) return;
      for (var i = 0; i < 4; i++) { var w = windows[(Math.random() * windows.length) | 0]; w.off = !w.off; paintWin(w, !w.off); }
    }

    /* ── glitch: slice copies via data-cp-text, for ~0.6s ── */
    function glitch(n) {
      if (reduce || !n || n.classList.contains("cp-glitch")) return;
      n.setAttribute("data-cp-text", n.textContent.replace(/\s+/g, " ").trim());
      n.classList.add("cp-glitch");
      timers.push(setTimeout(function () { n.classList.remove("cp-glitch"); }, 650));
    }

    function loop() {
      raf = 0;
      if (!rain || document.hidden) return;
      stepRain(); drawRain();
      raf = requestAnimationFrame(loop);
    }
    function onVis() { if (!document.hidden && !raf && !reduce) raf = requestAnimationFrame(loop); }
    function onResize() { sizeRain(); drawRain(); drawCity(); }

    return {
      on: function () {
        var body = document.body, stage = document.querySelector(".stage"), nav = document.querySelector(".site-nav");

        rain = add(el("canvas", "cp-rain"), body, body.firstChild);
        rain.setAttribute("aria-hidden", "true");
        rctx = rain.getContext("2d");
        sizeRain(); drawRain(); // first frame drawn synchronously

        var frame = add(el("div", "cp-frame", "<i></i><i></i><i></i><i></i>"), body);
        frame.setAttribute("aria-hidden", "true");

        if (stage) {
          city = add(el("canvas", "cp-city"), stage, stage.firstChild);
          city.setAttribute("aria-hidden", "true");
          cctx = city.getContext("2d");
          drawCity();

          var hex = [], i;
          for (i = 0; i < 80; i++) {
            var b = ((Math.random() * 65536) | 0).toString(16).toUpperCase();
            while (b.length < 4) b = "0" + b;
            hex.push(Math.random() < .08 ? "<b>" + b + "</b>" : b);
          }
          var txt = hex.join("\n");
          var stream = add(el("div", "cp-stream", "<pre>" + txt + "\n" + txt + "</pre>"), stage);
          stream.setAttribute("aria-hidden", "true");

          var sign = add(el("div", "cp-sign", '<span class="cp-sign-k">聴く<b>機</b>械</span><span class="cp-sign-l">LISTEN.SYS</span>'), stage);
          sign.setAttribute("aria-hidden", "true");

          var portrait = stage.querySelector(".art .portrait");
          if (portrait && !reduce) { var bar = add(el("span", "cp-scanbar"), portrait); bar.setAttribute("aria-hidden", "true"); }
        }

        if (nav) {
          readout = add(el("div", "cp-readout", '<span class="cp-dot"></span><span>NET:<b>LINKED</b></span><span class="cp-sec">SEC.00 <b>HOME</b></span><i class="cp-clock">--:--:--</i>'), nav);
          readout.setAttribute("aria-hidden", "true");
          var clock = readout.querySelector(".cp-clock");
          var tick = function () { var d = new Date(); clock.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (v) { return (v < 10 ? "0" : "") + v; }).join(":"); };
          tick(); timers.push(setInterval(tick, 1000));
        }

        // headings get the glitch hook; cards get the decrypt reveal
        document.querySelectorAll(GLITCH).forEach(function (n) { n.classList.add("cp-glitchable"); });
        var cards = document.querySelectorAll(".proj, .skill, .job, .pub, .link-cell, .now");
        cards.forEach(function (n) { n.classList.add("cp-reveal"); });

        if ("IntersectionObserver" in window) {
          io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
              if (!e.isIntersecting) return;
              var t = e.target;
              if (t.classList.contains("sec-head") || t.classList.contains("cp-reveal")) t.classList.add("cp-in");
              else timers.push(setTimeout(function () { glitch(t); }, 150));
              io.unobserve(t);
            });
          }, { threshold: .35 });
          document.querySelectorAll(".sec-head, .sec-title, .about-statement, .poster-title").forEach(function (n) { io.observe(n); });
          cards.forEach(function (n) { io.observe(n); });

          // the nav readout follows the section in view
          if (readout) {
            var secEl = readout.querySelector(".cp-sec"), names = { about: "01 ABOUT", research: "02 RESEARCH", papers: "03 PAPERS", skills: "04 SKILLS", work: "05 WORK", contact: "06 CONTACT" };
            ioSec = new IntersectionObserver(function (entries) {
              entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                var p = (names[e.target.id] || "00 HOME").split(" ");
                secEl.innerHTML = "SEC." + p[0] + " <b>" + p[1] + "</b>";
              });
            }, { rootMargin: "-45% 0px -50% 0px" });
            document.querySelectorAll("section[id], .hero").forEach(function (s) { ioSec.observe(s); });
          }
        } else {
          document.querySelectorAll(".sec-head").forEach(function (n) { n.classList.add("cp-in"); });
        }

        if (!reduce) {
          // hover glitches on headings
          listen(document, "pointerover", function (e) {
            var t = e.target.closest && e.target.closest(".proj-title, .job-org, .sec-title, .nav-brand, .poster-title");
            if (t && !(e.relatedTarget && t.contains(e.relatedTarget))) glitch(t);
          });
          // the hero title glitches at random every 4–9s
          var heroGlitch = function () {
            var spans = document.querySelectorAll(".title .t1, .title .t2, .title .t3");
            if (spans.length && !document.hidden) glitch(spans[(Math.random() * spans.length) | 0]);
            timers.push(setTimeout(heroGlitch, rnd(4000, 9000)));
          };
          timers.push(setTimeout(heroGlitch, 2500));
          timers.push(setInterval(blinkWindows, 280));
          listen(document, "visibilitychange", onVis);
          raf = requestAnimationFrame(loop);
        }
        var rt = 0;
        listen(window, "resize", function () { clearTimeout(rt); rt = setTimeout(onResize, 150); timers.push(rt); });
      },
      off: function () {
        if (raf) cancelAnimationFrame(raf); raf = 0;
        timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = [];
        cleanups.forEach(function (f) { f(); }); cleanups = [];
        if (io) io.disconnect(); io = null;
        if (ioSec) ioSec.disconnect(); ioSec = null;
        nodes.forEach(function (n) { n.remove(); }); nodes = [];
        document.querySelectorAll(".cp-glitchable, .cp-glitch, .cp-reveal, .cp-in").forEach(function (n) {
          n.classList.remove("cp-glitchable", "cp-glitch", "cp-reveal", "cp-in"); n.removeAttribute("data-cp-text");
        });
        rain = rctx = city = cctx = readout = null; drops = []; windows = [];
      }
    };
  })());
})();
