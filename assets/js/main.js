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
      var r = stage.getBoundingClientRect();
      var dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
      pieces.forEach(function (p) {
        var d = parseFloat(p.getAttribute("data-depth")) * 22;
        p.style.translate = (dx * d).toFixed(1) + "px " + (dy * d).toFixed(1) + "px";
      });
    });
    stage.addEventListener("pointerleave", function () { pieces.forEach(function (p) { p.style.translate = ""; }); });
  }

  /* Waveform: square bars on the ink strip, louder near the pointer */
  var canvas = document.getElementById("wave");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var css = getComputedStyle(document.documentElement);
  var red = css.getPropertyValue("--color-accent-400").trim() || "#f6a06b";
  var ground = css.getPropertyValue("--color-neutral-100").trim() || "#f9f4ed";
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

  function draw() {
    energy += (target - energy) * 0.05;
    ctx.clearRect(0, 0, W, H);
    var bw = 6, gap = 3, n = Math.ceil(W / (bw + gap)), mid = H / 2;
    for (var i = 0; i < n; i++) {
      var x = i / n;
      var d = x - mx;
      var env = Math.exp(-d * d * 18) * energy;
      var a = Math.abs(
        Math.sin(x * 13 + t * 1.6) * 0.45 +
        Math.sin(x * 37 - t * 2.4) * 0.3 +
        Math.sin(x * 91 + t * 3.7) * 0.25
      );
      var h = Math.max(bw, (0.12 + a * (0.25 + env * 0.85)) * (H * 0.72));
      ctx.fillStyle = env > 0.35 ? red : ground;
      ctx.globalAlpha = env > 0.35 ? 1 : 0.22 + a * 0.35;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(i * (bw + gap), mid - h / 2, bw, h, bw / 2); else ctx.rect(i * (bw + gap), mid - h / 2, bw, h); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!reduce) { if (!document.hidden) t += 0.016; requestAnimationFrame(draw); }
  }
  draw();
})();
