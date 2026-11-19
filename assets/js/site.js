/* The Brand Ind. · comportamiento compartido: tema, navegación y Gantt.
   No contiene información del proyecto: los datos viven en cada página (cifrada). */
(function () {
  var KEY = 'bi-theme';
  var root = document.documentElement;

  // ---- Tema claro / oscuro ----
  function current() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function apply(t) {
    root.setAttribute('data-theme', t);
    document.querySelectorAll('.theme-toggle').forEach(function (b) {
      b.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
      var l = b.querySelector('.label'); if (l) l.textContent = t === 'dark' ? 'Tema claro' : 'Tema oscuro';
    });
  }
  apply(current());
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.theme-toggle');
    if (!b) return;
    var next = current() === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem(KEY, next); } catch (_) {}
  });

  // ---- Sección activa en la navegación ----
  var links = [].slice.call(document.querySelectorAll('nav.toc a'));
  if (links.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { io.observe(s); });
  }

  // ---- Gantt: <div class="gantt" data-src="id-del-json"> ----
  var MON = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  var DAY = 864e5;
  function parse(s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function fmt(t) { var d = new Date(t); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  document.querySelectorAll('.gantt[data-src]').forEach(function (g) {
    var node = document.getElementById(g.getAttribute('data-src'));
    if (!node) return;
    var cfg = JSON.parse(node.textContent);
    var START = parse(cfg.start), END = parse(cfg.end) + DAY * (cfg.padDays || 0) + DAY, SPAN = END - START;
    var P = function (t) { return ((t - START) / SPAN * 100).toFixed(3) + '%'; };
    var W = function (a, b) { return ((b - a) / SPAN * 100).toFixed(3) + '%'; };

    var h = '<div class="g-head"><div class="lbl">Actividad</div><div class="g-weeks">';
    for (var w = 0; w < cfg.weeks; w++) {
      var t = START + w * 7 * DAY;
      h += '<div class="g-week" style="left:' + P(t) + '"><b>S' + (w + 1) + '</b>' + fmt(t) + '</div>';
    }
    h += '</div></div>';

    cfg.rows.forEach(function (r) {
      h += '<div class="g-row"><div class="lbl">' + esc(r.label) + (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</div><div class="g-track">';
      (r.bars || []).forEach(function (b) {
        var a = parse(b.from), z = parse(b.to) + DAY;
        h += '<div class="g-bar' + (b.kind ? ' ' + b.kind : '') + '" style="left:' + P(a) + ';width:' + W(a, z) + '" title="' + fmt(a) + ' – ' + fmt(z - DAY) + '"></div>';
      });
      (r.milestones || []).forEach(function (m) {
        var x = (parse(m.date) + DAY - START) / SPAN * 100;
        h += '<div class="g-ms" style="left:' + x.toFixed(3) + '%" title="' + esc(m.label) + ' · ' + fmt(parse(m.date)) + '"></div>';
        h += '<div class="g-ms-l" style="left:calc(' + x.toFixed(3) + '% + 10px)">' + esc(m.label) + (x > 84 ? '' : ' · ' + fmt(parse(m.date))) + '</div>';
      });
      h += '</div></div>';
    });

    h += '<div class="g-overlay">';
    (cfg.holidays || []).forEach(function (o) {
      var a = parse(o.from), z = parse(o.to) + DAY;
      h += '<div class="g-hol" style="left:' + P(a) + ';width:' + W(a, z) + '"><span>' + esc(o.label) + '</span></div>';
    });
    (cfg.meetings || []).forEach(function (m) {
      h += '<div class="g-meet" style="left:' + P(parse(m) + DAY / 2) + '" title="Reunión ' + fmt(parse(m)) + '"></div>';
    });
    h += '</div>';
    g.innerHTML = h;
  });
})();
