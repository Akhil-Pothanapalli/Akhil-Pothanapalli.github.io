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
    /* extras: a working shell in the hero, sections dressed as command output, a tmux status bar */
    var extra = [], decorated = [], statusIO = null, clockT = 0, onKey = null;
    function q(sel) { return document.querySelector(sel); }
    function qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
    function txt(n) { return n ? n.textContent.replace(/\s+/g, " ").trim() : ""; }
    function slug(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
    function hash(t) { var h = 2166136261; for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return ("0000000" + (h >>> 0).toString(16)).slice(-7); }
    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    function shell() {
      var stage = q(".stage"); if (!stage) return;
      var box = el("div", "term-shell"), log = el("div", "term-log"), line = el("label", "term-line");
      log.setAttribute("aria-live", "polite");
      line.innerHTML = '<span class="term-ps1">akhil@lab:~$</span>';
      var input = el("input"); input.type = "text"; input.autocomplete = "off"; input.spellcheck = false; input.setAttribute("autocapitalize", "off");
      input.setAttribute("aria-label", "Terminal: type a command, for example help");
      line.appendChild(input); box.appendChild(log); box.appendChild(line); stage.appendChild(box); extra.push(box);
      var hist = [], hi = 0, cwd = "~";
      var sections = { about: "about", research: "research", papers: "papers", skills: "skills", work: "work", contact: "contact" };
      var mail = (q(".nav-cta") || {}).href || "";
      function out(html, cls) { var d = el("div", "term-out" + (cls ? " " + cls : ""), html); log.appendChild(d); log.scrollTop = log.scrollHeight; }
      function go(id) { var s2 = document.getElementById(id); if (s2) { s2.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); cwd = "~/" + id; input.parentNode.querySelector(".term-ps1").textContent = "akhil@lab:" + cwd + "$"; } }
      var cmds = {
        help: function () { out('available commands:<br><b>about</b> <b>research</b> <b>papers</b> <b>skills</b> <b>work</b> <b>contact</b> &nbsp;jump to a section<br><b>ls</b> <b>cd &lt;dir&gt;</b> <b>cat about.md</b> <b>whoami</b> <b>date</b> <b>echo</b> <b>history</b> <b>clear</b><br>tab completes · ↑ ↓ history'); },
        ls: function () { out(Object.keys(sections).map(function (k) { return '<span class="dir">' + k + '/</span>'; }).join("  ") + '  about.md  resume.pdf'); },
        whoami: function () { out(esc(txt(q(".bubble p")))); },
        date: function () { out(new Date().toString()); },
        clear: function () { log.innerHTML = ""; },
        history: function () { out(hist.map(function (h, i) { return (i + 1) + "  " + esc(h); }).join("<br>") || "(empty)"); },
        pwd: function () { out(cwd.replace("~", "/home/akhil")); },
        "cat": function (a) {
          if (a === "about.md") { out(esc(txt(q(".about-statement")))); go("about"); }
          else if (a === "resume.pdf") out("binary file. try: <b>work</b>");
          else out("cat: " + esc(a || "") + ": no such file");
        },
        cd: function (a) { a = (a || "").replace(/[~\/.]/g, ""); if (!a) { cwd = "~"; line.querySelector(".term-ps1").textContent = "akhil@lab:~$"; window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); } else if (sections[a]) go(a); else out("cd: no such directory: " + esc(a)); },
        echo: function (a, raw) { out(esc(raw)); },
        sudo: function (a, raw) {
          if (/^hire( akhil)?$/.test(raw)) { out('<span class="ok">[sudo] access granted.</span> opening a message to akhil…'); if (mail) setTimeout(function () { window.location.href = mail; }, 600); }
          else out("akhil is not in the sudoers file. this incident will be reported.");
        },
        exit: function () { out("there is no escape. try <b>contact</b>"); },
        rm: function () { out('<span class="err">nice try.</span>'); }
      };
      Object.keys(sections).forEach(function (k) { cmds[k] = function () { out("→ " + k); go(k); }; });
      out('type <b>help</b> to explore · try <b>sudo hire akhil</b>', "dim");
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          var raw = input.value.trim(); input.value = ""; if (!raw) return;
          hist.push(raw); hi = hist.length;
          out('<span class="term-ps1">akhil@lab:' + esc(cwd) + '$</span> ' + esc(raw), "echo");
          var parts = raw.split(/\s+/), c = parts[0].toLowerCase(), rest = raw.slice(parts[0].length).trim();
          if (cmds[c]) cmds[c](parts[1] && parts[1].toLowerCase(), c === "sudo" ? rest.toLowerCase() : rest);
          else out("zsh: command not found: " + esc(c) + " · try <b>help</b>", "err");
        } else if (e.key === "ArrowUp") { e.preventDefault(); if (hi > 0) input.value = hist[--hi]; }
        else if (e.key === "ArrowDown") { e.preventDefault(); hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ""; }
        else if (e.key === "Tab" && input.value) {
          e.preventDefault();
          var v = input.value, words = Object.keys(cmds).concat(["about.md", "resume.pdf"]);
          var parts2 = v.split(" "), last = parts2.pop(), hits = words.filter(function (w) { return w.indexOf(last.toLowerCase()) === 0; });
          if (hits.length === 1) { parts2.push(hits[0]); input.value = parts2.join(" ") + " "; }
          else if (hits.length > 1) out(hits.join("  "), "dim");
        }
      });
      box.addEventListener("click", function () { input.focus({ preventScroll: true }); });
    }
    function dress() {
      var heads = { about: "cat about.md", research: "ls -la ~/research/", papers: "git log --oneline papers/", skills: "htop --tree skills", work: "history | grep job", contact: "ping akhil" };
      Object.keys(heads).forEach(function (id) {
        var sec = document.getElementById(id); if (!sec) return;
        var at = sec.querySelector(".sec-head") || sec.querySelector(".poster-kicker");
        if (!at) return;
        var c = el("div", "term-cmd", '<span class="term-ps1">akhil@lab:~$</span> ' + heads[id]); c.setAttribute("aria-hidden", "true");
        at.parentNode.insertBefore(c, at); extra.push(c);
      });
      var projects = q(".projects");
      if (projects) {
        var rows = qa(".proj").map(function (p, i) {
          var t = txt(p.querySelector(".proj-title"));
          return '<span>drwxr-xr-x</span><span>akhil</span><span>' + (4096 * (i + 1)) + '</span><span>2026</span><span class="dir">' + slug(t) + '/</span>';
        });
        var ls = el("div", "term-ls", '<span>total ' + rows.length + '</span>' + rows.map(function (r) { return '<div>' + r + '</div>'; }).join(""));
        ls.setAttribute("aria-hidden", "true"); projects.before(ls); extra.push(ls);
      }
      qa(".pub").forEach(function (p) {
        var h = el("span", "term-hash", hash(txt(p.querySelector(".pub-title")))); h.setAttribute("aria-hidden", "true");
        var v = p.querySelector(".pub-venue"); if (v) { v.insertBefore(h, v.firstChild); decorated.push(h); }
      });
      var max = Math.max.apply(0, qa(".skill").map(function (k) { return k.querySelectorAll("li").length; }));
      qa(".skill").forEach(function (k, i) {
        var n = k.querySelectorAll("li").length, pct = Math.round(40 + 58 * n / max), cells = Math.round(pct / 10);
        var bar = el("div", "term-htop", '<span class="pid">' + (1100 + i * 37) + '</span><span class="bar">[' + "|".repeat(cells) + '<i>' + "·".repeat(10 - cells) + '</i>]</span><span class="pct">' + pct + '.0%</span>');
        bar.setAttribute("aria-hidden", "true"); var h2 = k.querySelector(".skill-h"); if (h2) { h2.after(bar); decorated.push(bar); }
      });
    }
    function tmux() {
      var ids = ["about", "research", "papers", "skills", "work", "contact"];
      var bar = el("div", "term-tmux", '<span class="tm-session">[akhil]</span><span class="tm-wins">' + ids.map(function (id, i) { return '<a href="#' + id + '" data-win="' + id + '">' + i + ':' + id + '</a>'; }).join("") + '</span><span class="tm-clock"></span>');
      bar.setAttribute("aria-label", "Sections"); document.body.appendChild(bar); extra.push(bar);
      var clock = bar.querySelector(".tm-clock");
      var tick = function () { var d = new Date(); clock.textContent = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + " " + d.toDateString().slice(4, 10); };
      tick(); clockT = setInterval(tick, 15000);
      statusIO = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) bar.querySelectorAll("a").forEach(function (a) { a.classList.toggle("is-on", a.getAttribute("data-win") === e.target.id); }); });
      }, { rootMargin: "-45% 0px -50% 0px" });
      ids.forEach(function (id) { var s2 = document.getElementById(id); if (s2) statusIO.observe(s2); });
    }
    function neofetch() {
      var poster = q(".poster"); if (!poster) return;
      var tags = qa(".kicker .tag").map(txt), jobs = qa(".job").filter(function (j) { return !/education/i.test(txt(j.querySelector(".job-org"))); }).map(function (j) { return txt(j.querySelector(".job-period")); });
      var years = jobs.join(" ").match(/\b(19|20)\d{2}\b/g) || [], since = years.length ? Math.min.apply(0, years.map(Number)) : "";
      var org = txt(q(".job-org")), team = txt(q(".job-team"));
      var rows = [
        ["OS", tags[0] || "Speech & Audio AI"],
        ["Host", org + (team ? " · " + team.split("·")[0].trim() : "")],
        ["Location", tags[1] || ""],
        ["Uptime", since ? "shipping since " + since : ""],
        ["Papers", qa(".pub").length + " (" + qa(".pub-role.is-first").length + " as co-first author)"],
        ["Projects", qa(".proj").length + " benchmarks & systems"],
        ["Focus", qa(".now li").map(txt).slice(0, 2).join(", ")],
        ["Shell", "zsh · try the prompt up top"],
        ["Status", "open to collaborations"]
      ].filter(function (r) { return r[1]; });
      var logo = ["        ██      ██        ", "    ██  ██  ██  ██  ██    ", "  ██ ██ ██ ██ ██ ██ ██ ██  ", "██ ██ ██ ██ ██ ██ ██ ██ ██", "  ██ ██ ██ ██ ██ ██ ██ ██  ", "    ██  ██  ██  ██  ██    ", "        ██      ██        "].join("\n");
      var box = el("div", "term-neofetch",
        '<div class="nf-cmd"><span class="term-ps1">akhil@lab:~$</span> neofetch</div>' +
        '<div class="nf-body"><pre class="nf-logo">' + logo + '</pre><div class="nf-info"><b class="nf-user">akhil<span>@</span>lab</b><span class="nf-rule">' + "-".repeat(9) + '</span>' +
        rows.map(function (r) { return '<span><i>' + esc(r[0]) + ':</i> ' + esc(r[1]) + '</span>'; }).join("") +
        '<span class="nf-palette"><u style="background:#050a05"></u><u style="background:#ff5c5c"></u><u style="background:#33ff66"></u><u style="background:#ffb000"></u><u style="background:#5cc8ff"></u><u style="background:#c77dff"></u><u style="background:#5cf2e0"></u><u style="background:#e8ffe8"></u></span></div></div>');
      box.setAttribute("aria-hidden", "true");
      poster.appendChild(box); extra.push(box);
    }
    function extrasOn() { shell(); dress(); tmux(); neofetch(); }
    function extrasOff() {
      clearInterval(clockT); if (statusIO) statusIO.disconnect(); statusIO = null;
      extra.concat(decorated).forEach(function (n) { n.remove(); }); extra = []; decorated = [];
    }
    return {
      on: function () {
        extrasOn();
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
        extrasOff();
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

  /* ── Pixel / 8-bit: an arcade of genres. Sprites drawn in code, an arcade HUD, INSERT COIN, a character-select card,
        an invader wave to shoot, a VS screen, and SIGNAL RUN: an endless runner starring a listening robot ── */
  fx.pixel = (function () {
    var root = document.documentElement, nodes = [], timers = [], io = null, onScroll = null, vars = [], cleanups = [];
    var P = { k: "#000000", w: "#fcfcfc", y: "#fcbc3c", Y: "#c84c0c", o: "#c84c0c", O: "#fc9838", g: "#00a800", G: "#80d010", d: "#005800",
              r: "#d82800", R: "#fc7460", s: "#a4a4a4", S: "#585858", b: "#3cbcfc", B: "#0058f8", p: "#f878f8", m: "#00a844", c: "#a4e4fc" };
    function draw(w, h, scale, fn) {
      var c = document.createElement("canvas"); c.width = w * scale; c.height = h * scale;
      var g = c.getContext("2d");
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { var ch = fn(x, y); if (ch && P[ch]) { g.fillStyle = P[ch]; g.fillRect(x * scale, y * scale, scale, scale); } }
      return c;
    }
    function grid(r, scale) { return draw(r[0].length, r.length, scale || 1, function (x, y) { var ch = r[y][x]; return ch === "." ? null : ch; }); }
    function url(c) { return 'url("' + c.toDataURL() + '")'; }
    var S = {
      coin: ["..kkkk..", ".kyyyyk.", "kyywwyyk", "kyywYyyk", "kyywYyyk", "kyywYyyk", "kyywYyyk", "kyywYyyk", "kyywYyyk", "kyyyYyyk", ".kyyyyk.", "..kkkk.."],
      heart: [".kk...kk.", "kRRk.krrk", "kRrrkrrrk", "krrrrrrrk", ".krrrrrk.", "..krrrk..", "...krk...", "....k...."],
      arrow: ["w.....", "ww....", "www...", "wwww..", "wwwww.", "wwww..", "www...", "ww....", "w....."],
      cursor: ["k.........", "kk........", "kwk.......", "kwwk......", "kwwwk.....", "kwwwwk....", "kwwwwwk...", "kwwwwwwk..", "kwwwwwwwk.", "kwwwwkkkkk", "kwwkwk....", "kwk.kwk...", "kk..kwk...", "k....kwk..", ".....kk..."],
      frame: [".wwwwwww.", "w.......w", "w.......w", "w.......w", "w.......w", "w.......w", "w.......w", "w.......w", ".wwwwwww."],
      inv: ["..g.....g..", "...g...g...", "..ggggggg..", ".gg.ggg.gg.", "ggggggggggg", "g.ggggggg.g", "g.g.....g.g", "...gg.gg..."],
      invB: ["..g.....g..", "g..g...g..g", "g.ggggggg.g", "ggg.ggg.ggg", "ggggggggggg", ".ggggggggg.", "..g.....g..", ".g.......g."],
      inv2: ["....pppp....", ".pppppppppp.", "pppppppppppp", "ppp..pp..ppp", "pppppppppppp", "...pp..pp...", "..pp.pp.pp..", "pp........pp"],
      inv2B: ["....pppp....", ".pppppppppp.", "pppppppppppp", "ppp..pp..ppp", "pppppppppppp", "..ppp..ppp..", ".pp..pp..pp.", "..pp....pp.."],
      boom: ["w...w...w", ".w..w..w.", "..w...w..", "ww.....ww", "..w...w..", ".w..w..w.", "w...w...w"],
      robotA: [".....kr.....", ".....kk.....", "..kkkkkkkk..", ".kwwwwwwwwk.", "kykwkwwkwkyk", "kykwwwwwwkyk", "kykwwrrwwkyk", ".kkwwwwwwkk.", "..kkkkkkkk..", "..kssssssk..", ".ksbssssbsk.", ".kssssssssk.", "..kssssssk..", "..ks....sk..", "..kk....kk.."],
      robotB: [".....kr.....", ".....kk.....", "..kkkkkkkk..", ".kwwwwwwwwk.", "kykwkwwkwkyk", "kykwwwwwwkyk", "kykwwrrwwkyk", ".kkwwwwwwkk.", "..kkkkkkkk..", "..kssssssk..", ".ksbssssbsk.", ".kssssssssk.", "..kssssssk..", "...ks..sk...", "...kk..kk..."],
      robotJ: [".....kr.....", ".....kk.....", "..kkkkkkkk..", ".kwwwwwwwwk.", "kykwkwwkwkyk", "kykwwwwwwkyk", "kykwwOOwwkyk", ".kkwwwwwwkk.", "..kkkkkkkk..", "..kssssssk..", ".ksbssssbsk.", ".kssssssssk.", ".kssk..kssk.", ".kk......kk.", "............"],
      note: ["...kkk.", "...kyk.", "...kykk", "...kyyk", "...kk..", "...k...", ".kkk...", "kyyk...", "kyyk...", ".kk...."],
      mic: ["...kkkk...", "..kssssk..", "..kswssk..", "..kswssk..", "..kssssk..", "..kssssk..", "k.kssssk.k", "k..kkkk..k", ".k......k.", "..kkkkkk..", "....kk....", "..kkkkkk.."],
      scroll: [".kkkkkkkk.", "kwwwwwwwwk", "kwkkkkkkwk", "kwwwwwwwwk", "kwkkkkwwwk", "kwwwwwwwwk", "kwkkkkkkwk", "kwwwwwwwwk", "kwkkkwwwwk", "kwwwwwwwwk", ".kkkkkkkk.", ".........."],
      gem: ["..........", "..kkkkkk..", ".kbwbbbbk.", "kbwbbbbbbk", "kkkkkkkkkk", ".kBbbbbBk.", "..kBbbBk..", "...kBBk...", "....kk....", ".........."],
      sword: ["........kk", ".......kwk", "......kwk.", ".....kwk..", "....kwk...", ".k.kwk....", "..kyk.....", "..kyk.....", ".kykk.....", "kyk.k.....", "kk........", ".........."],
      ship: ["......b......", ".....bbb.....", ".....bbb.....", ".bbbbbbbbbbb.", "bbbbbbbbbbbbb", "bbbbbbbbbbbbb", "bbbbbbbbbbbbb"]
    };
    function blob(w, h, discs, fill, shade) {
      var gr = [];
      for (var y = 0; y < h; y++) { gr[y] = []; for (var x = 0; x < w; x++) {
        var inside = discs.some(function (d) { return (x + .5 - d[0]) * (x + .5 - d[0]) / (d[2] * d[2]) + (y + .5 - d[1]) * (y + .5 - d[1]) / ((d[3] || d[2]) * (d[3] || d[2])) <= 1; });
        gr[y][x] = inside ? (y > h * .62 ? shade : fill) : null; } }
      return draw(w, h, 1, function (x, y) {
        if (gr[y][x]) return gr[y][x];
        return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { var X = x + d[0], Y = y + d[1]; return X >= 0 && Y >= 0 && X < w && Y < h && gr[Y][X]; }) ? "k" : null;
      });
    }
    function brick() { return draw(16, 16, 1, function (x, y) { var off = Math.floor(y / 4) % 2 ? 4 : 0; if (y % 4 === 3 || (x + off) % 8 === 7) return "k"; return y % 4 === 0 ? "O" : "o"; }); }
    function hill() { var w = 48, h = 20, cx = w / 2;
      function inn(x, y) { return (x + .5 - cx) * (x + .5 - cx) / ((cx - 1) * (cx - 1)) + (y + .5 - h) * (y + .5 - h) / ((h - 1) * (h - 1)) <= 1; }
      return draw(w, h, 1, function (x, y) { if (inn(x, y)) { if ((x === 18 || x === 19) && y > 8 && y < 13 || (x === 28 || x === 29) && y > 9 && y < 14 || (x === 23 || x === 24) && y > 4 && y < 8) return "d"; return "g"; }
        return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { return y + d[1] < h && inn(x + d[0], y + d[1]); }) ? "k" : null; }); }
    function grass() { return draw(16, 16, 1, function (x, y) { if ((x * 7 + y * 13) % 29 === 0 || (x * 5 + y * 3) % 31 === 0) return "d"; if ((x + y * 3) % 23 === 0) return "G"; return "g"; }); }
    function canopy() { return draw(16, 16, 1, function (x, y) { var top = 6 + Math.round(3 * Math.sin(x / 2.5)); if (y < top - 1) return null; if (y === top - 1) return "k"; if ((x * 3 + y) % 7 === 0) return "G"; return y > 12 ? "d" : "g"; }); }

    /* ── HUD ── */
    var hud = null, score = 0, hi = 0, credits = 0, best = 0, time = 400;
    try { hi = parseInt(localStorage.getItem("pxHi") || "20260", 10); } catch (e) { hi = 20260; }
    function pad(n, l) { return ("000000" + n).slice(-l); }
    function paint() {
      if (!hud) return;
      if (score > hi) { hi = score; try { localStorage.setItem("pxHi", hi); } catch (e) {} }
      hud.querySelector(".hud-1up b").textContent = pad(score, 6); hud.querySelector(".hud-hi b").textContent = pad(hi, 6);
      hud.querySelector(".hud-credits b").textContent = "×" + pad(credits, 2); hud.querySelector(".hud-time b").textContent = pad(time, 3);
    }
    function award(n) { score += n; paint(); }

    /* ── SIGNAL RUN ── */
    function runner(host) {
      var W = window.innerWidth < 700 ? 240 : 480, H = 104, GROUND = 88, c = el("canvas", "px-game"), g;
      c.width = W; c.height = H; c.tabIndex = 0; c.style.aspectRatio = W + " / " + H;
      c.setAttribute("role", "application"); c.setAttribute("aria-label", "Signal Run, a small endless runner. Press Space or Up to jump, or tap.");
      host.appendChild(c); nodes.push(c); g = c.getContext("2d"); g.imageSmoothingEnabled = false;
      var spr = { a: grid(S.robotA), b: grid(S.robotB), j: grid(S.robotJ), note: grid(S.note) };
      var state = "idle", t = 0, y = 0, vy = 0, speed = 1.6, dist = 0, pts = 0, obs = [], notes = [], next = 90, nextNote = 60, raf = 0, inView = true, flash = 0;
      var best = 0; try { best = parseInt(localStorage.getItem("pxRunBest") || "0", 10); } catch (e) {}
      function reset() { y = 0; vy = 0; speed = 1.6; dist = 0; pts = 0; obs = []; notes = []; next = 80; nextNote = 50; }
      function jump() {
        if (state === "idle" || state === "over") { reset(); state = "run"; loop(); return; }
        if (y === 0) vy = 4.3;
      }
      var ui = el("div", "px-game-ui", '<span class="ui-score"></span><span class="ui-best"></span><span class="ui-msg"><b></b><i></i><small>JUMP: SPACE · UP · W · TAP</small></span>');
      ui.setAttribute("aria-hidden", "true"); host.appendChild(ui); nodes.push(ui);
      var uiScore = ui.querySelector(".ui-score"), uiBest = ui.querySelector(".ui-best"), uiMsg = ui.querySelector(".ui-msg"), last = "";
      function hud2() {
        var key = state + "|" + pts + "|" + best;
        if (key === last) return; last = key;
        uiScore.textContent = state === "run" || pts ? "SCORE " + pad(pts, 5) : "";
        uiBest.textContent = "BEST " + pad(best, 5);
        uiMsg.hidden = state === "run";
        uiMsg.className = "ui-msg is-" + state;
        uiMsg.querySelector("b").textContent = state === "over" ? "GAME OVER" : "SIGNAL RUN";
        uiMsg.querySelector("i").textContent = state === "over" ? "SPACE OR TAP TO RETRY" : "PRESS SPACE OR TAP";
      }
      function scene() {
        g.clearRect(0, 0, W, H);
        for (var b = 0; b < 20; b++) { var bx = ((b * 34) - dist * .35) % (W + 40); if (bx < -34) bx += W + 40; var bh = 12 + (b * 17) % 22; g.fillStyle = "#1c1c3c"; g.fillRect(Math.floor(bx), GROUND - bh, 28, bh); g.fillStyle = "#fcbc3c"; for (var wy = GROUND - bh + 4; wy < GROUND - 4; wy += 6) for (var wx = 4; wx < 24; wx += 8) if ((b + wx + wy) % 3) g.fillRect(Math.floor(bx) + wx, wy, 2, 2); }
        g.fillStyle = "#00a800"; g.fillRect(0, GROUND, W, 2); g.fillStyle = "#005800"; g.fillRect(0, GROUND + 2, W, H - GROUND - 2);
        g.fillStyle = "#00a800"; for (var d = 0; d < W + 16; d += 16) g.fillRect(Math.floor(d - (dist % 16)), GROUND + 6, 6, 2);
      }
      function frame() {
        t++;
        if (state === "run") {
          dist += speed; speed = Math.min(4.2, 1.6 + dist / 2600);
          vy -= .26; y = Math.max(0, y + vy); if (y === 0) vy = Math.max(0, vy);
          if (--next <= 0) { var tall = Math.random() < .35; obs.push({ x: W + 4, w: tall ? 8 : 6, h: tall ? 18 : 11 }); next = 55 + Math.random() * 70 - speed * 6; }
          if (--nextNote <= 0) { notes.push({ x: W + 4, y: GROUND - 30 - Math.random() * 20 }); nextNote = 70 + Math.random() * 90; }
          obs.forEach(function (o) { o.x -= speed; }); notes.forEach(function (n) { n.x -= speed; });
          obs = obs.filter(function (o) { return o.x > -12; }); notes = notes.filter(function (n) { return n.x > -10 && !n.got; });
          var rx = 42, ry = GROUND - 15 - y;
          obs.forEach(function (o) { if (rx + 9 > o.x && rx + 3 < o.x + o.w && ry + 14 > GROUND - o.h) { state = "over"; flash = 8; if (pts > best) { best = pts; try { localStorage.setItem("pxRunBest", best); } catch (e) {} } } });
          notes.forEach(function (n) { if (Math.abs(rx + 6 - (n.x + 3)) < 9 && Math.abs(ry + 7 - (n.y + 5)) < 11) { n.got = true; pts += 50; award(50); } });
          if (t % 6 === 0) { pts += 1; if (t % 30 === 0) award(5); }
        }
        scene();
        obs.forEach(function (o) {
          for (var i = 0; i < o.w; i++) { var hh = o.h - ((i * 7 + t) % 4); g.fillStyle = (i + t) % 3 ? "#d82800" : "#fc7460"; g.fillRect(Math.floor(o.x) + i, GROUND - hh, 1, hh); }
          g.fillStyle = "#fcfcfc"; g.fillRect(Math.floor(o.x) + 1, GROUND - o.h + 2 + (t % 5), 2, 1);
        });
        notes.forEach(function (n) { g.drawImage(spr.note, Math.floor(n.x), Math.floor(n.y + Math.sin((t + n.x) / 8) * 2)); });
        var img = y > 0 ? spr.j : (Math.floor(t / 6) % 2 ? spr.a : spr.b);
        if (state !== "run") img = spr.a;
        if (!(flash > 0 && flash-- % 2)) g.drawImage(img, 40, Math.floor(GROUND - 15 - y));
        hud2();
      }
      function loop() { cancelAnimationFrame(raf); var go = function () { frame(); if (inView && !document.hidden && (state === "run" || (!reduce && state !== "run"))) raf = requestAnimationFrame(go); }; go(); }
      var keys = function (e) {
        var k = e.key;
        if (k !== " " && k !== "ArrowUp" && k !== "w" && k !== "W" && k !== "Enter") return;
        var focused = document.activeElement === c;
        if (!focused && !(state === "run" && inView)) return;
        if (k === "Enter" && state === "run") return;
        e.preventDefault(); jump();
      };
      var tap = function (e) { e.preventDefault(); c.focus({ preventScroll: true }); jump(); };
      window.addEventListener("keydown", keys); c.addEventListener("pointerdown", tap);
      var vis = new IntersectionObserver(function (es) { inView = es[0].isIntersecting; if (inView) loop(); else cancelAnimationFrame(raf); });
      vis.observe(c);
      var fontReady = document.fonts && document.fonts.load ? document.fonts.load('8px "Press Start 2P"') : Promise.resolve();
      fontReady.then(function () { loop(); }, function () { loop(); });
      cleanups.push(function () { cancelAnimationFrame(raf); window.removeEventListener("keydown", keys); vis.disconnect(); });
    }

    /* ── the Work battlefield: invaders, bombs and a ship on autopilot fill the section background; waves restart forever ── */
    function invaders(section) {
      var PX = 3, W = 0, H = 0, c = el("canvas", "px-shooter"), g;
      c.setAttribute("aria-hidden", "true");
      section.insertBefore(c, section.firstChild); nodes.push(c); g = c.getContext("2d");
      var badge = el("div", "px-wave-badge", '<span class="wb-wave">WAVE 1</span><span class="wb-mode">AUTOPILOT</span><span class="wb-msg" hidden></span>');
      badge.setAttribute("aria-hidden", "true"); section.appendChild(badge); nodes.push(badge);
      var bWave = badge.querySelector(".wb-wave"), bMsg = badge.querySelector(".wb-msg");
      var A = [grid(S.inv), grid(S.invB)], B = [grid(S.inv2), grid(S.inv2B)], ship = grid(S.ship), boom = grid(S.boom);
      var rows = 4, cols = 10, wave = 1, fx = 0, fy = 0, dir = 1, aliens = [], shots = [], bombs = [], sx = 0, cool = 0, state = "play", hold = 0, t = 0, raf = 0, inView = true, gapX = 24, gapY = 18, left = 0;
      function size() {
        var r = section.getBoundingClientRect();
        W = Math.max(120, Math.round(r.width / PX)); H = Math.max(120, Math.round(r.height / PX));
        c.width = W; c.height = H; g.imageSmoothingEnabled = false;
        gapX = Math.max(16, Math.min(28, Math.floor((W - 40) / cols))); left = Math.max(10, Math.floor((W - gapX * cols) / 2));
        if (!sx) sx = W / 2;
      }
      function spawn() { aliens = []; for (var r = 0; r < rows; r++) for (var q = 0; q < cols; q++) aliens.push({ r: r, q: q, alive: true, dead: 0 }); fx = 0; fy = 0; dir = 1; shots = []; bombs = []; state = "play"; bWave.textContent = "WAVE " + wave; bMsg.hidden = true; }
      function pos(a) { return { x: left + a.q * gapX + fx, y: 30 + a.r * gapY + fy }; }
      function step() {
        t++; cool--;
        if (state === "play") {
          var alive = aliens.filter(function (a) { return a.alive; });
          fx += dir * (0.22 + wave * 0.06) * (1 + (aliens.length - alive.length) / aliens.length);
          var xs = alive.map(function (a) { return pos(a).x; });
          if (alive.length && (Math.max.apply(0, xs) > W - 18 && dir > 0 || Math.min.apply(0, xs) < 6 && dir < 0)) { dir *= -1; fy += 6; }
          if (alive.length) {
            var tgt = alive.reduce(function (m, a) { var p = pos(a); return !m || Math.abs(p.x + 6 - sx) < Math.abs(m.x + 6 - sx) ? p : m; }, null);
            var tx = tgt.x + 6; sx += Math.max(-1.6, Math.min(1.6, tx - sx));
            if (Math.abs(tx - sx) < 4 && cool <= 0 && shots.length < 2) { shots.push({ x: sx, y: H - 18 }); cool = 16; }
          }
          if (t % 60 === 0 && alive.length) { var sp = pos(alive[(t * 7) % alive.length]); bombs.push({ x: sp.x + 6, y: sp.y + 8 }); }
          shots.forEach(function (b) { b.y -= 3.5; aliens.forEach(function (a) { if (!a.alive) return; var p = pos(a); if (b.x > p.x && b.x < p.x + 12 && b.y > p.y && b.y < p.y + 8) { a.alive = false; a.dead = 10; b.y = -10; award(a.r === 0 ? 30 : 20); } }); });
          bombs.forEach(function (b) { b.y += 1.6; });
          shots = shots.filter(function (b) { return b.y > 0; }); bombs = bombs.filter(function (b) { return b.y < H - 10; });
          if (!alive.length) { state = "clear"; hold = 130; award(500); bMsg.textContent = "WAVE " + wave + " CLEAR!"; bMsg.hidden = false; }
          else if (30 + rows * gapY + fy > H * .7) { state = "reset"; hold = 80; bMsg.textContent = "THEY LANDED · RETRY"; bMsg.hidden = false; }
        } else if (--hold <= 0) { if (state === "clear") wave++; spawn(); }
        g.clearRect(0, 0, W, H);
        aliens.forEach(function (a) { var p = pos(a); if (a.alive) g.drawImage((a.r === 0 ? B : A)[Math.floor(t / 30) % 2], Math.round(p.x), Math.round(p.y)); else if (a.dead > 0) { a.dead--; g.drawImage(boom, Math.round(p.x) + 1, Math.round(p.y)); } });
        g.fillStyle = "#fcfcfc"; shots.forEach(function (b) { g.fillRect(Math.round(b.x), Math.round(b.y), 1, 4); });
        g.fillStyle = "#f878f8"; bombs.forEach(function (b) { g.fillRect(Math.round(b.x), Math.round(b.y), 1, 3); });
        g.drawImage(ship, Math.round(sx - 6), H - 14);
        g.fillStyle = "#00a800"; g.fillRect(0, H - 4, W, 1);
      }
      function loop() { cancelAnimationFrame(raf); var go = function () { step(); if (inView && !document.hidden && !reduce) raf = requestAnimationFrame(go); }; go(); }
      var ro = new ResizeObserver(function () { size(); if (reduce) step(); }); ro.observe(section);
      var vis = new IntersectionObserver(function (es) { inView = es[0].isIntersecting; if (inView) loop(); else cancelAnimationFrame(raf); }); vis.observe(section);
      size(); spawn(); loop();
      cleanups.push(function () { cancelAnimationFrame(raf); ro.disconnect(); vis.disconnect(); });
    }

    function onNum() {}
    return {
      on: function () {
        var sp = { "--px-coin": url(grid(S.coin)), "--px-heart": url(grid(S.heart)), "--px-arrow": url(grid(S.arrow)), "--px-frame": url(grid(S.frame)),
          "--px-cursor": url(grid(S.cursor, 2)) + " 0 0", "--px-invader": url(grid(S.inv)), "--px-invader-b": url(grid(S.invB)), "--px-invader2": url(grid(S.inv2)),
          "--px-invader2-b": url(grid(S.inv2B)), "--px-boom": url(grid(S.boom)), "--px-grass": url(grass()), "--px-canopy": url(canopy()), "--px-brick": url(brick()), "--px-hill": url(hill()),
          "--px-cloud": url(blob(32, 16, [[9, 10, 6, 5], [16, 7, 7, 6], [24, 10, 6, 5], [16, 11, 10, 4]], "w", "c")), "--px-bush": url(blob(32, 12, [[8, 8, 6, 5], [16, 6, 7, 6], [24, 8, 6, 5], [16, 9, 12, 3]], "G", "g")),
          "--px-mic": url(grid(S.mic)), "--px-scroll": url(grid(S.scroll)), "--px-gem": url(grid(S.gem)), "--px-sword": url(grid(S.sword)) };
        Object.keys(sp).forEach(function (k) { root.style.setProperty(k, sp[k]); vars.push(k); });
        var nav = document.querySelector(".site-nav");
        if (nav) {
          hud = el("div", "px-hud", '<span class="hud-1up">1UP<b>000000</b></span><span class="hud-hi">HI-SCORE<b>000000</b></span><span class="hud-credits">CREDITS<b>×00</b></span><span class="hud-stage">STAGE<b>ATTRACT</b></span><span class="hud-time">TIME<b>400</b></span>');
          hud.setAttribute("aria-hidden", "true"); nav.appendChild(hud); nodes.push(hud);
        }
        var tb = document.querySelector(".title-block");
        if (tb) {
          var slot = el("button", "px-coinslot", "<span>INSERT COIN</span>"); slot.type = "button";
          slot.addEventListener("click", function () { credits = (credits + 1) % 100; award(100); var d = el("i", "px-drop"); slot.appendChild(d); setTimeout(function () { d.remove(); }, 600); slot.querySelector("span").textContent = "CREDIT " + credits; });
          tb.appendChild(slot); nodes.push(slot);
        }
        var art = document.querySelector(".art"), portrait = document.querySelector(".art .portrait");
        if (art && portrait) {
          var stats = el("div", "px-stats", '<div>LISTEN<i style="--v:96%;--c:#00d800"></i></div><div>REASON<i style="--v:82%;--c:#fcbc3c"></i></div><div>LANGS<i style="--v:70%;--c:#3cbcfc"></i></div><div>DUPLEX<i style="--v:88%;--c:#d82800"></i></div>');
          stats.setAttribute("aria-hidden", "true"); portrait.after(stats); nodes.push(stats);
          var sel = el("div", "px-select", "◀ PLAYER SELECT ▶"); sel.setAttribute("aria-hidden", "true"); stats.after(sel); nodes.push(sel);
        }
        var bar = document.querySelector(".wavebar");
        if (bar) runner(bar);
        var work = document.getElementById("work");
        if (work) invaders(work);
        var kicker = document.querySelector(".poster-kicker");
        if (kicker) { var p2 = el("span", "px-p2", "PLAYER 2 · PRESS START"); p2.setAttribute("aria-hidden", "true"); kicker.after(p2); nodes.push(p2); }
        var stages = { about: "1 RPG", research: "2 RUN&GUN", papers: "3 MAZE", skills: "4 PUZZLE", work: "5 SHOOTER", contact: "VS" };
        io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && hud) hud.querySelector(".hud-stage b").textContent = stages[e.target.id]; }); }, { rootMargin: "-40% 0px -55% 0px" });
        Object.keys(stages).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
        onScroll = function () { var d = Math.floor((window.scrollY || 0) / 100); if (d > best) { award((d - best) * 10); best = d; } };
        window.addEventListener("scroll", onScroll, { passive: true });
        if (!reduce) timers.push(setInterval(function () { time = time > 0 ? time - 1 : 400; paint(); }, 1000));
        paint();
      },
      off: function () {
        timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = [];
        cleanups.forEach(function (f) { f(); }); cleanups = [];
        if (io) io.disconnect(); io = null;
        if (onScroll) window.removeEventListener("scroll", onScroll);
        nodes.forEach(function (n) { n.remove(); }); nodes = []; hud = null;
        vars.forEach(function (k) { root.style.removeProperty(k); }); vars = [];
        score = 0; credits = 0; best = 0; time = 400;
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


  var current = null;
  function sync() {
    var id = root.getAttribute("data-style");
    if (id === current) return;
    if (current && fx[current]) fx[current].off();
    current = id;
    if (fx[id]) fx[id].on();
  }
  document.addEventListener("stylechange", sync);
  /* per-style effect files in assets/js/fx/ register themselves here */
  window.registerStyleFx = function (id, impl) { fx[id] = impl; if (current === id) impl.on(); };
  sync();
})();
