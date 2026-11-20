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

  // ---- Sección activa en la navegación (secciones y subsecciones) ----
  var links = [].slice.call(document.querySelectorAll('nav.toc a, [data-nav] a'));
  if (links.length) {
    var byId = {};
    links.forEach(function (a) { var id = (a.getAttribute('href') || '').slice(1); if (id) byId[id] = a; });
    var targets = Object.keys(byId).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var ticking = false;
    function spy() {
      ticking = false;
      var offset = 140, cur = null;
      targets.forEach(function (el) { if (el.getBoundingClientRect().top - offset <= 0) cur = el; });
      if (!cur) cur = targets[0];
      var a = byId[cur.id], top = a;
      var li = a.closest('ul.sub') ? a.closest('ul.sub').parentElement : null;
      if (li) top = li.querySelector('a');
      links.forEach(function (l) { l.classList.toggle('on', l === a || l === top); });
      document.querySelectorAll('[data-nav] li.open').forEach(function (o) { o.classList.remove('open'); });
      var parentLi = top && top.parentElement;
      if (parentLi && parentLi.querySelector('ul.sub')) parentLi.classList.add('open');
      // en móvil, mantener visible la pestaña activa
      if (top && window.matchMedia('(max-width:960px)').matches) {
        var bar = top.closest('[data-nav]');
        if (bar) { var l = top.offsetLeft - bar.offsetLeft, r = l + top.offsetWidth;
          if (l < bar.scrollLeft + 16) bar.scrollLeft = l - 16;
          else if (r > bar.scrollLeft + bar.clientWidth - 16) bar.scrollLeft = r - bar.clientWidth + 16; }
      }
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
    window.addEventListener('resize', spy);
    spy();
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
      h += '<div class="g-row' + (r.points ? ' meet-row' : '') + '"><div class="lbl">' + esc(r.label) + (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</div><div class="g-track">';
      (r.bars || []).forEach(function (b) {
        var a = parse(b.from), z = parse(b.to) + DAY;
        h += '<div class="g-bar' + (b.kind ? ' ' + b.kind : '') + '" style="left:' + P(a) + ';width:' + W(a, z) + '" title="' + fmt(a) + ' – ' + fmt(z - DAY) + '"></div>';
      });
      (r.points || []).forEach(function (d) {
        var x = P(parse(d) + DAY / 2);
        h += '<div class="g-pt" style="left:' + x + '" title="Reunión · ' + fmt(parse(d)) + '"></div>';
        h += '<div class="g-pt-l" style="left:' + x + '">' + fmt(parse(d)) + '</div>';
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
