/* Mapa geral interativo das concessionárias (traçados dos KMZ da ARTESP), com legenda, zoom, seleção e camadas. */
(function () {
  var V = window.VIEWS;
  if (!V || !window.MAPA_KMZ || !window.REAL) return;
  var COR = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#0f766e', '#b45309',
    '#4338ca', '#be123c', '#0369a1', '#65a30d', '#a21caf', '#0e7490', '#ca8a04', '#475569', '#16a34a', '#dc2626', '#7c3aed'];
  var DISC = { 'ITS / Monitoramento': '#0b3d91', 'Sinalização': '#f2b705', 'Segurança viária': '#c0392b', 'OAE': '#16a085', 'Praça de pedágio / Operação': '#8e44ad', 'Telecomunicações': '#2980b9', 'Edificações': '#7f6a4f', 'Operação': '#d35400', 'Frota': '#7f8c8d' };

  V['mapa-geral'] = function () {
    var R = window.REAL, W = 1000, H = 700, K = Math.cos(23.3 * Math.PI / 180), lo = [1e9, -1e9], la = [1e9, -1e9];
    var ids = R.lotes.map(function (l) { return String(l.lote); });
    ids.forEach(function (l) { (window.MAPA_KMZ[l] || []).forEach(function (ln) { ln.forEach(function (p) { lo[0] = Math.min(lo[0], p[0]); lo[1] = Math.max(lo[1], p[0]); la[0] = Math.min(la[0], p[1]); la[1] = Math.max(la[1], p[1]); }); }); });
    var s = Math.min((W - 40) / ((lo[1] - lo[0]) * K), (H - 40) / (la[1] - la[0])), ox = (W - (lo[1] - lo[0]) * K * s) / 2, oy = (H - (la[1] - la[0]) * s) / 2;
    function pj(lon, lat) { return [ox + (lon - lo[0]) * K * s, H - oy - (lat - la[0]) * s]; }
    var cor = {}; R.lotes.forEach(function (l, i) { cor[l.lote] = COR[i % COR.length]; });
    var sedes = {}; ((R.rota && R.rota.sedes) || []).forEach(function (x) { sedes[x.lote] = x; });
    var paths = '', bbox = {};
    ids.forEach(function (l) {
      var mn = [1e9, 1e9], mx = [-1e9, -1e9];
      var d = (window.MAPA_KMZ[l] || []).map(function (ln) { return 'M' + ln.map(function (p) { var q = pj(p[0], p[1]); mn = [Math.min(mn[0], q[0]), Math.min(mn[1], q[1])]; mx = [Math.max(mx[0], q[0]), Math.max(mx[1], q[1])]; return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L'); }).join('');
      bbox[l] = [mn[0], mn[1], mx[0], mx[1]];
      paths += '<path class="lt" data-l="' + l + '" d="' + d + '" fill="none" stroke="' + cor[l] + '" stroke-width="2.4" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"></path>';
    });
    var grade = ''; for (var i = 1; i < 5; i++) grade += '<line x1="' + (W * i / 5) + '" y1="0" x2="' + (W * i / 5) + '" y2="' + H + '" stroke="#dfe6f0" vector-effect="non-scaling-stroke"/><line x1="0" y1="' + (H * i / 5) + '" x2="' + W + '" y2="' + (H * i / 5) + '" stroke="#dfe6f0" vector-effect="non-scaling-stroke"/>';
    var marc = '', ronda = '';
    R.lotes.forEach(function (l) { var sd = sedes[l.lote]; if (!sd || sd.lat == null) return; var q = pj(sd.lon, sd.lat); marc += '<g class="mk" data-l="' + l.lote + '" transform="translate(' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')"><circle r="7" fill="' + cor[l.lote] + '" stroke="#fff" stroke-width="1.5"></circle><text y="3.5" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">' + l.lote + '</text></g>'; });
    if (R.rota) {
      var hub = pj(-46.6333, -23.5505), seq = [hub].concat(R.rota.ordem.map(function (o) { return pj(o.lon, o.lat); })).concat([hub]);
      ronda = '<path d="M' + seq.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L') + '" fill="none" stroke="#111" stroke-dasharray="6 5" stroke-width="1.3" vector-effect="non-scaling-stroke" opacity=".7"></path><circle cx="' + hub[0].toFixed(1) + '" cy="' + hub[1].toFixed(1) + '" r="8" fill="#c0392b" stroke="#fff" stroke-width="2"></circle><text x="' + (hub[0] + 11).toFixed(1) + '" y="' + (hub[1] + 4).toFixed(1) + '" font-size="12" font-weight="700" fill="#a11">São Paulo (ARTESP)</text>';
    }
    var ativos = (R.pontos || []).map(function (p) { var q = pj(p[6], p[5]); return '<circle class="at" data-l="' + p[0] + '" data-d="' + esc(p[1]) + '" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="2.6" fill="' + (DISC[p[1]] || '#333') + '" stroke="#fff" stroke-width=".5"><title>' + esc(p[2] + ' · ' + p[3] + ' ' + p[4] + ' (L' + p[0] + ')') + '</title></circle>'; }).join('');
    var leg = R.lotes.map(function (l) {
      var n = Object.keys(l.ativos || {}).reduce(function (a, k) { return a + l.ativos[k]; }, 0);
      return '<div class="lg" data-l="' + l.lote + '"><i style="background:' + cor[l.lote] + '"></i><div><b>' + String(l.lote).padStart(2, '0') + '. ' + esc(l.nome) + '</b><small>' + fmtN(l.ext, 1) + ' km · ' + l.rodovias + ' rodovias · ' + fmtN(n) + ' ativos</small></div></div>';
    }).join('');
    var camadas = '<label><input type="checkbox" id="c-at"> Ativos (amostra)</label> <label><input type="checkbox" id="c-ro"> Ronda de coleta</label> <label><input type="checkbox" id="c-mk" checked> Sedes numeradas</label>';
    var html = '<h1>Mapa geral das concessionárias</h1><p class="sub">Traçados extraídos dos arquivos KMZ da ARTESP (' + R.lotes.length + ' lotes, ' + fmtN(R.total_km, 1) + ' km). Arraste para mover, use a roda do mouse para ampliar e clique em um lote para detalhar.</p>' +
      '<style>.mg{display:grid;grid-template-columns:minmax(0,3fr) minmax(250px,1fr);gap:14px}.mg .lg{display:flex;gap:9px;padding:6px 8px;border-radius:6px;cursor:pointer;align-items:flex-start}.mg .lg:hover,.mg .lg.on{background:#e8f0fb}.mg .lg i{width:22px;height:12px;border-radius:2px;margin-top:3px;flex:none}.mg .lg small{display:block;color:#5a6577;font-size:11.5px}.mg #mgsvg{width:100%;height:640px;background:#f8fafc;border:1px solid #cfd8e6;border-radius:8px;cursor:grab;touch-action:none}.mg #mgleg{max-height:640px;overflow:auto}.mg .ctl{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;align-items:center}.mg .ctl button{padding:4px 10px}#mgtip{position:fixed;pointer-events:none;background:#0b2a5b;color:#fff;font-size:12px;padding:5px 8px;border-radius:5px;display:none;z-index:50;max-width:260px}</style>' +
      '<div class="mg"><div class="card"><div class="ctl"><button id="mz-in">＋</button><button id="mz-out">－</button><button id="mz-rs">Enquadrar tudo</button>' + camadas + '</div>' +
      '<svg id="mgsvg" viewBox="0 0 ' + W + ' ' + H + '"><g id="mgg">' + grade + '<g id="g-lt">' + paths + '</g><g id="g-ro" style="display:none">' + ronda + '</g><g id="g-at" style="display:none">' + ativos + '</g><g id="g-mk">' + marc + '</g></g></svg>' +
      '<p class="nota">Mapa esquemático em lon/lat, sem base cartográfica. Traçados simplificados para estimativa comercial.</p></div>' +
      '<div class="card"><h2>Legenda</h2><div id="mgleg">' + leg + '</div><div id="mgdet"></div></div></div><div id="mgtip"></div>';
    return {
      html: html, after: function (root) {
        var svg = root.querySelector('#mgsvg'), g = root.querySelector('#mgg'), tip = root.querySelector('#mgtip'), det = root.querySelector('#mgdet');
        var vb = [0, 0, W, H], sel = null, drag = null;
        function setvb() { svg.setAttribute('viewBox', vb.map(function (n) { return n.toFixed(1); }).join(' ')); var z = W / vb[2]; g.querySelectorAll('.mk circle').forEach(function (c) { c.setAttribute('r', (7 / Math.sqrt(z)).toFixed(2)); }); g.querySelectorAll('.mk text').forEach(function (t) { t.setAttribute('font-size', (9 / Math.sqrt(z)).toFixed(2)); t.setAttribute('y', (3.5 / Math.sqrt(z)).toFixed(2)); }); g.querySelectorAll('.at').forEach(function (c) { c.setAttribute('r', (2.6 / Math.sqrt(z)).toFixed(2)); }); }
        function zoom(f, cx, cy) { var w = vb[2] / f, h = vb[3] / f; vb = [cx - (cx - vb[0]) / f, cy - (cy - vb[1]) / f, w, h]; setvb(); }
        function pt(e) { var r = svg.getBoundingClientRect(); return [vb[0] + (e.clientX - r.left) / r.width * vb[2], vb[1] + (e.clientY - r.top) / r.height * vb[3]]; }
        function fit(b) { var pad = 30, w = b[2] - b[0] + 2 * pad, h = b[3] - b[1] + 2 * pad, k = Math.max(w / W, h / H), nw = W * k, nh = H * k, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2; vb = [cx - nw / 2, cy - nh / 2, nw, nh]; setvb(); }
        function destaque(l) {
          root.querySelectorAll('.lt').forEach(function (p) { var on = !l || p.getAttribute('data-l') === String(l); p.setAttribute('opacity', on ? 1 : .12); p.setAttribute('stroke-width', on && l ? 3.4 : 2.4); });
          root.querySelectorAll('.mk').forEach(function (m) { m.style.opacity = !l || m.getAttribute('data-l') === String(l) ? 1 : .25; });
          root.querySelectorAll('.at').forEach(function (a) { a.style.display = !l || a.getAttribute('data-l') === String(l) ? '' : 'none'; });
          root.querySelectorAll('.lg').forEach(function (e) { e.classList.toggle('on', !!l && e.getAttribute('data-l') === String(l)); });
        }
        function detalhe(l) {
          if (!l) { det.innerHTML = ''; return; }
          var d = R.lotes.filter(function (x) { return String(x.lote) === String(l); })[0], tp = Object.keys(d.tipos).map(function (k) { return '<tr><td>' + esc(k) + '</td><td style="text-align:right">' + fmtN(d.tipos[k], 1) + ' km</td></tr>'; }).join(''), at = Object.keys(d.ativos || {}).map(function (k) { return '<tr><td>' + esc(k) + '</td><td style="text-align:right">' + fmtN(d.ativos[k]) + '</td></tr>'; }).join(''), sd = sedes[d.lote];
          det.innerHTML = '<h2 style="margin-top:14px">' + String(d.lote).padStart(2, '0') + ' · ' + esc(d.nome) + '</h2><table><tr><td>Extensão</td><td style="text-align:right"><b>' + fmtN(d.ext, 1) + ' km</b></td></tr><tr><td>Eixo troncal</td><td style="text-align:right">' + fmtN(d.eixo, 1) + ' km</td></tr><tr><td>Trechos / rodovias</td><td style="text-align:right">' + d.trechos + ' / ' + d.rodovias + '</td></tr>' + (sd ? '<tr><td>Sede/CCO</td><td style="text-align:right">' + esc(sd.fonte) + '</td></tr>' : '') + '</table><p class="nota"><b>Tipos de pista</b></p><table>' + tp + '</table>' + (at ? '<p class="nota"><b>Ativos cadastrados</b></p><table>' + at + '</table>' : '');
        }
        function escolher(l) { sel = (sel && String(sel) === String(l)) ? null : l; destaque(sel); detalhe(sel); if (sel) fit(bbox[sel]); else { vb = [0, 0, W, H]; setvb(); } }
        svg.addEventListener('wheel', function (e) { e.preventDefault(); var p = pt(e); zoom(e.deltaY < 0 ? 1.25 : 0.8, p[0], p[1]); }, { passive: false });
        svg.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, vb: vb.slice(), moved: false }; svg.setPointerCapture(e.pointerId); svg.style.cursor = 'grabbing'; });
        svg.addEventListener('pointermove', function (e) {
          if (drag) { var r = svg.getBoundingClientRect(), dx = (e.clientX - drag.x) / r.width * drag.vb[2], dy = (e.clientY - drag.y) / r.height * drag.vb[3]; if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 3) drag.moved = true; vb = [drag.vb[0] - dx, drag.vb[1] - dy, drag.vb[2], drag.vb[3]]; setvb(); tip.style.display = 'none'; return; }
          var t = e.target, l = t.getAttribute && t.getAttribute('data-l') || (t.parentNode && t.parentNode.getAttribute && t.parentNode.getAttribute('data-l'));
          if (l) { var d = R.lotes.filter(function (x) { return String(x.lote) === String(l); })[0]; tip.innerHTML = '<b>' + String(d.lote).padStart(2, '0') + '. ' + esc(d.nome) + '</b><br>' + fmtN(d.ext, 1) + ' km · ' + d.rodovias + ' rodovias'; tip.style.left = (e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 14) + 'px'; tip.style.display = 'block'; } else tip.style.display = 'none';
        });
        svg.addEventListener('pointerup', function (e) { var moved = drag && drag.moved; drag = null; svg.style.cursor = 'grab'; if (moved) return; var t = e.target, l = t.getAttribute && t.getAttribute('data-l') || (t.parentNode && t.parentNode.getAttribute && t.parentNode.getAttribute('data-l')); if (l && !t.classList.contains('at')) escolher(l); });
        svg.addEventListener('pointerleave', function () { tip.style.display = 'none'; });
        root.querySelectorAll('.lg').forEach(function (e) { e.addEventListener('click', function () { escolher(e.getAttribute('data-l')); }); e.addEventListener('mouseenter', function () { if (!sel) destaque(e.getAttribute('data-l')); }); e.addEventListener('mouseleave', function () { if (!sel) destaque(null); }); });
        root.querySelector('#mz-in').onclick = function () { zoom(1.4, vb[0] + vb[2] / 2, vb[1] + vb[3] / 2); };
        root.querySelector('#mz-out').onclick = function () { zoom(1 / 1.4, vb[0] + vb[2] / 2, vb[1] + vb[3] / 2); };
        root.querySelector('#mz-rs').onclick = function () { sel = null; destaque(null); detalhe(null); vb = [0, 0, W, H]; setvb(); };
        root.querySelector('#c-at').onchange = function (e) { root.querySelector('#g-at').style.display = e.target.checked ? '' : 'none'; };
        root.querySelector('#c-ro').onchange = function (e) { root.querySelector('#g-ro').style.display = e.target.checked ? '' : 'none'; };
        root.querySelector('#c-mk').onchange = function (e) { root.querySelector('#g-mk').style.display = e.target.checked ? '' : 'none'; };
        setvb();
      }
    };
  };
})();
