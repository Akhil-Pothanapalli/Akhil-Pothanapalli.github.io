(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Mobile menu */
  var menuBtn = document.getElementById("menuToggle");
  var links = document.getElementById("navLinks");
  if (menuBtn && links) {
    menuBtn.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* Active section in nav */
  var navMap = {};
  document.querySelectorAll(".nav-links a").forEach(function (a) { navMap[a.getAttribute("href").slice(1)] = a; });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && navMap[e.target.id]) {
          Object.keys(navMap).forEach(function (k) { navMap[k].classList.remove("is-active"); });
          navMap[e.target.id].classList.add("is-active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(navMap).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* Paper filter */
  document.querySelectorAll('input[name="pubf"]').forEach(function (r) {
    r.addEventListener("change", function () {
      var v = r.value;
      document.querySelectorAll(".pub").forEach(function (p) {
        p.hidden = !(v === "all" || p.getAttribute("data-kind") === v);
      });
    });
  });

  /* Collage parallax */
  var stage = document.querySelector(".stage");
  var pieces = document.querySelectorAll("[data-depth]");
  if (stage && !reduce && window.matchMedia("(pointer: fine)").matches) {
    stage.addEventListener("pointermove", function (e) {
      if (document.documentElement.classList.contains("calm")) return;
      var r = stage.getBoundingClientRect();
      var dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
      pieces.forEach(function (p) {
        var d = parseFloat(p.getAttribute("data-depth")) * 22;
        p.style.translate = (dx * d).toFixed(1) + "px " + (dy * d).toFixed(1) + "px";
      });
    });
    stage.addEventListener("pointerleave", function () { pieces.forEach(function (p) { p.style.translate = ""; }); });
  }

  /* Waveform, louder near the pointer. Each style picks how it is drawn with --wave-mode:
     bars (default) · blocks (8-bit spectrum analyser) · scope (oscilloscope trace) · area (soft filled wave)
     · line (seismograph ink) · none. --wave-colors gives a comma list of colours where the mode uses several. */
  var canvas = document.getElementById("wave");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var red, ground, round, mode, colors, barW, barGap, peaks = [];
  function token(css, name) { return css.getPropertyValue(name).trim(); }
  function palette() {
    var css = getComputedStyle(document.documentElement), calm = document.documentElement.classList.contains("calm");
    red = (calm && token(css, "--wave-hi")) || token(css, "--color-accent-400") || "#f6a06b";
    ground = (calm && token(css, "--wave-lo")) || token(css, "--color-neutral-100") || "#f9f4ed";
    round = !(calm && token(css, "--wave-radius") === "0");
    mode = (calm && token(css, "--wave-mode")) || "bars";
    colors = calm ? token(css, "--wave-colors").split(",").map(function (c) { return c.trim(); }).filter(Boolean) : [];
    barW = (calm && parseFloat(token(css, "--wave-bar"))) || 6;
    barGap = (calm && parseFloat(token(css, "--wave-gap"))) || 3;
    peaks = [];
  }
  palette();
  document.addEventListener("stylechange", function () { palette(); size(); if (reduce) draw(); });
  var W = 0, H = 0, t = 0, mx = 0.5, energy = 0.3, target = 0.3;

  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  window.addEventListener("resize", size);
  canvas.parentElement.addEventListener("pointermove", function (e) {
    var r = canvas.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width; target = 1;
  });
  canvas.parentElement.addEventListener("pointerleave", function () { target = 0.3; });

  function amp(x) {
    return Math.abs(Math.sin(x * 13 + t * 1.6) * 0.45 + Math.sin(x * 37 - t * 2.4) * 0.3 + Math.sin(x * 91 + t * 3.7) * 0.25);
  }
  function env(x) { var d = x - mx; return Math.exp(-d * d * 18) * energy; }
  function signed(x) { return Math.sin(x * 13 + t * 1.6) * 0.45 + Math.sin(x * 37 - t * 2.4) * 0.3 + Math.sin(x * 91 + t * 3.7) * 0.25; }

  var renderers = {
    bars: function () {
      var bw = barW, gap = barGap, n = Math.ceil(W / (bw + gap)), mid = H / 2;
      for (var i = 0; i < n; i++) {
        var x = i / n, e = env(x), a = amp(x);
        var h = Math.max(Math.min(bw, 4), (0.12 + a * (0.25 + e * 0.85)) * (H * 0.72));
        if (colors.length) { ctx.fillStyle = colors[i % colors.length]; ctx.globalAlpha = 0.55 + a * 0.45; }
        else { ctx.fillStyle = e > 0.35 ? red : ground; ctx.globalAlpha = e > 0.35 ? 1 : 0.22 + a * 0.35; }
        ctx.beginPath();
        if (round && ctx.roundRect) ctx.roundRect(i * (bw + gap), mid - h / 2, bw, h, bw / 2); else ctx.rect(i * (bw + gap), mid - h / 2, bw, h);
        ctx.fill();
      }
    },
    blocks: function () {
      var cw = barW, gap = barGap, cell = Math.max(3, Math.round(H / 11)), rows = Math.floor((H - 4) / cell);
      var n = Math.floor(W / (cw + gap)), lo = colors[0] || ground, mid = colors[1] || red, hi = colors[2] || red;
      for (var i = 0; i < n; i++) {
        var x = i / n, lvl = Math.min(rows, Math.round((0.15 + amp(x) * (0.35 + env(x) * 0.9)) * rows));
        peaks[i] = Math.max(lvl, (peaks[i] || 0) - 0.12);
        for (var r = 0; r < lvl; r++) {
          var f = r / rows;
          ctx.fillStyle = f > 0.75 ? hi : f > 0.5 ? mid : lo;
          ctx.fillRect(i * (cw + gap), H - 2 - (r + 1) * cell + 1, cw, cell - 2);
        }
        ctx.fillStyle = hi;
        ctx.fillRect(i * (cw + gap), H - 2 - Math.ceil(peaks[i]) * cell - 1, cw, 2);
      }
    },
    scope: function () {
      var mid = H / 2, list = colors.length ? colors : [red];
      ctx.globalAlpha = 0.18; ctx.strokeStyle = ground; ctx.lineWidth = 1;
      for (var gx = 0; gx < W; gx += 24) { ctx.beginPath(); ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, H); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0, mid + 0.5); ctx.lineTo(W, mid + 0.5); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 2; ctx.lineJoin = "round";
      if (list.length > 1) ctx.globalCompositeOperation = "lighter";
      list.forEach(function (c, k) {
        var off = (k - (list.length - 1) / 2) * 3;
        ctx.strokeStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 10;
        ctx.beginPath();
        for (var px = 0; px <= W; px += 2) {
          var x = px / W, y = mid + signed(x * 1.4) * (0.25 + env(x) * 0.9) * H * 0.42;
          if (px) ctx.lineTo(px + off, y); else ctx.moveTo(off, y);
        }
        ctx.stroke();
      });
      ctx.shadowBlur = 0; ctx.globalCompositeOperation = "source-over";
    },
    area: function () {
      var mid = H / 2, list = colors.length ? colors : [red, ground];
      var g = ctx.createLinearGradient(0, 0, W, 0);
      list.forEach(function (c, k) { g.addColorStop(list.length > 1 ? k / (list.length - 1) : 0, c); });
      [0.35, 0.85].forEach(function (alpha, layer) {
        ctx.globalAlpha = alpha; ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, mid);
        var pts = [];
        for (var px = 0; px <= W; px += 4) {
          var x = px / W, h = (0.12 + amp(x * (layer ? 1 : 0.6) + layer) * (0.3 + env(x) * 0.8)) * H * (layer ? 0.4 : 0.48);
          pts.push([px, h]); ctx.lineTo(px, mid - h);
        }
        for (var k = pts.length - 1; k >= 0; k--) ctx.lineTo(pts[k][0], mid + pts[k][1]);
        ctx.closePath(); ctx.fill();
      });
      ctx.globalAlpha = 1;
    },
    line: function () {
      var mid = H / 2;
      ctx.strokeStyle = ground; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
      for (var gy = 6; gy < H; gy += 8) { ctx.beginPath(); ctx.moveTo(0, gy + 0.5); ctx.lineTo(W, gy + 0.5); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.strokeStyle = red; ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (var px = 0; px <= W; px += 1.5) {
        var x = px / W, jag = Math.sin(px * 1.7 + t * 9) * Math.sin(px * 0.31 - t * 4);
        var y = mid + jag * (0.08 + amp(x) * 0.25 + env(x) * 0.6) * H * 0.9;
        if (px) ctx.lineTo(px, y); else ctx.moveTo(0, y);
      }
      ctx.stroke();
    },
    none: function () {}
  };

  function draw() {
    energy += (target - energy) * 0.05;
    if (W && H) {
      ctx.clearRect(0, 0, W, H);
      (renderers[mode] || renderers.bars)();
      ctx.globalAlpha = 1;
    }
    if (!reduce) { if (!document.hidden) t += 0.016; requestAnimationFrame(draw); }
  }
  draw();
})();
