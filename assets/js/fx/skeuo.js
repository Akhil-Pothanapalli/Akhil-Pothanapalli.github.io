/* Skeuomorphism effects, registered with style-fx.js */
(function () {
  "use strict";
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  /* VU meter face: an arc scale from -20 to +3 with the red zone past 0, and a needle pivoting below the face */
  var VU = { cx: 60, cy: 50, r: 36, sweep: 44 };
  function vuSvg() {
    var cx = VU.cx, cy = VU.cy, r = VU.r, ticks = "", labels = "";
    var marks = [[-20, "20"], [-10, "10"], [-7, "7"], [-5, "5"], [-3, "3"], [-2, ""], [-1, ""], [0, "0"], [1, ""], [2, ""], [3, "+3"]];
    function ang(db) { return ((db + 20) / 23 * 2 - 1) * VU.sweep * Math.PI / 180; }
    function pt(a, rr) { return (cx + Math.sin(a) * rr).toFixed(2) + " " + (cy - Math.cos(a) * rr).toFixed(2); }
    marks.forEach(function (m) {
      var a = ang(m[0]), red = m[0] > 0, long = m[1] !== "";
      ticks += '<path d="M' + pt(a, r - (long ? 5 : 3)) + " L" + pt(a, r) + '" stroke="' + (red ? "#c0281a" : "#2b2926") + '" stroke-width="' + (long ? .9 : .6) + '"/>';
      if (long) labels += '<text transform="translate(' + pt(a, r + 4.5).replace(" ", ",") + ')" dy="1.6" fill="' + (m[0] >= 0 ? "#c0281a" : "#2b2926") + '">' + m[1] + "</text>";
    });
    return '<svg viewBox="0 0 120 40" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      '<path d="M' + pt(ang(-20), r) + " A" + r + " " + r + " 0 0 1 " + pt(ang(0), r) + '" fill="none" stroke="#2b2926" stroke-width=".8"/>' +
      '<path d="M' + pt(ang(0), r - 1) + " A" + (r - 1) + " " + (r - 1) + " 0 0 1 " + pt(ang(3), r - 1) + '" fill="none" stroke="#c0281a" stroke-width="2.2"/>' +
      ticks + '<g font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="4.6" text-anchor="middle">' + labels + "</g>" +
      '<text x="60" y="35" font-family="Lora, serif" font-weight="700" font-size="7" text-anchor="middle" fill="#2b2926">VU</text>' +
      '<g class="dk-needle"><path d="M60 50 L60 13" stroke="#1a1a1a" stroke-width=".8" stroke-linecap="round"/></g>' +
      '<rect x="50" y="37" width="20" height="5" rx="1" fill="#2b2926"/></svg>';
  }

  window.registerStyleFx("skeuo", (function () {
    var deck = null, objs = [], raf = 0, timer = 0, io = null, visible = true;
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; if (timer) clearInterval(timer); timer = 0; }
    return {
      on: function () {
        var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var bar = document.querySelector(".wavebar");
        if (bar) {
          deck = el("div", "deck",
            '<div class="dk">' +
              '<div class="dk-top"><span class="dk-brand">AP · TC 26<small>Stereo cassette</small></span><span class="dk-led"><i></i>Rec</span></div>' +
              '<div class="dk-body">' +
                '<div class="dk-grille"></div>' +
                '<div class="dk-side">' +
                  '<div class="dk-win"><div class="dk-cas"><span class="dk-title">A · Machines that listen · mix 2026</span>' +
                    '<div class="dk-reels"><span class="dk-reel"></span><span class="dk-reel"></span></div></div></div>' +
                  '<div class="dk-row"><div class="dk-vu">' + vuSvg() + '</div>' +
                    '<div class="dk-count"><b><span>0</span><span>2</span><span>6</span></b><small>Counter</small></div></div>' +
                '</div>' +
              '</div>' +
              '<div class="dk-keys"><span class="rec">● REC</span><span>◀◀</span><span class="on">▶</span><span>▶▶</span><span>■</span></div>' +
            "</div>");
          deck.setAttribute("aria-hidden", "true");
          bar.appendChild(deck);

          var needle = deck.querySelector(".dk-needle"), digits = deck.querySelectorAll(".dk-count span");
          var rest = -VU.sweep - 3, level = 0, target = 0, next = 0, n = 26;
          function setNeedle(deg) { needle.setAttribute("transform", "rotate(" + deg.toFixed(2) + " " + VU.cx + " " + VU.cy + ")"); }
          setNeedle(reduce ? -8 : rest);
          if (!reduce) {
            /* speech-like bursts: syllables every 120-260ms, pauses between phrases, VU ballistics */
            var tick = function (t) {
              raf = 0;
              if (!deck || !visible) return;
              if (t > next) {
                var pause = Math.random() < .14;
                target = pause ? 0 : .45 + Math.random() * .55;
                next = t + (pause ? 380 + Math.random() * 500 : 120 + Math.random() * 140);
              }
              level += (target - level) * (target > level ? .16 : .07);
              setNeedle(rest + level * (VU.sweep * 2 + 2) + Math.sin(t / 47) * level * 1.5);
              raf = requestAnimationFrame(tick);
            };
            raf = requestAnimationFrame(tick);
            timer = setInterval(function () {
              if (!visible) return;
              n = (n + 1) % 1000; var s = ("00" + n).slice(-3);
              for (var i = 0; i < 3; i++) digits[i].textContent = s[i];
            }, 1400);
            if ("IntersectionObserver" in window) {
              io = new IntersectionObserver(function (es) {
                visible = es[0].isIntersecting;
                if (visible && !raf && deck) raf = requestAnimationFrame(tick);
              });
              io.observe(deck);
            }
          }
        }
        /* a coffee mug next to the shipping tag and a pencil above the research folders */
        var spots = [["#about", "sk-obj sk-mug", ""], ["#research", "sk-obj sk-pencil", '<i class="pc-tip"></i><i class="pc-body">HB · No. 2</i><i class="pc-ferrule"></i><i class="pc-eraser"></i>']];
        spots.forEach(function (s) {
          var host = document.querySelector(s[0]);
          if (!host) return;
          var o = el("div", s[1], s[2]); o.setAttribute("aria-hidden", "true");
          host.appendChild(o); objs.push(o);
        });
      },
      off: function () {
        stop();
        if (io) io.disconnect(); io = null; visible = true;
        if (deck) deck.remove(); deck = null;
        objs.forEach(function (o) { o.remove(); }); objs = [];
      }
    };
  })());
})();
