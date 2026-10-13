/* Cyberpunk effects, registered with style-fx.js */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  window.registerStyleFx("cyberpunk", { on: function () {}, off: function () {} });
})();
