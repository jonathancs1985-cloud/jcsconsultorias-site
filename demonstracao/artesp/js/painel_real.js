/* Painel: mapa ilustrativo (KMZ da ARTESP) e dados reais da malha e dos ativos. */
(function () {
  var V = window.VIEWS;
  if (!V || !V.painel || !window.MAPA_KMZ) return;
  var orig = V.painel;
  var PAL = ['#1f77b4', '#d62728', '#2ca02c', '#9467bd', '#ff7f0e', '#17becf', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22'];
  var DISC = { 'ITS / Monitoramento': '#0b3d91', 'Sinalização': '#f2b705', 'Segurança viária': '#c0392b', 'OAE': '#16a085', 'Praça de pedágio / Operação': '#8e44ad', 'Telecomunicações': '#2980b9', 'Edificações': '#7f6a4f', 'Operação': '#d35400', 'Frota': '#7f8c8d' };

  function mapaSvg(sel) {
    var R0 = window.REAL;
    var W = 980, H = 620, pad = 14, k = Math.cos(23.3 * Math.PI / 180), lo = [1e9, -1e9], la = [1e9, -1e9];
    var lotes = Object.keys(window.MAPA_KMZ);
    lotes.forEach(function (l) { window.MAPA_KMZ[l].forEach(function (ln) { ln.forEach(function (p) { if (p[0] < lo[0]) lo[0] = p[0]; if (p[0] > lo[1]) lo[1] = p[0]; if (p[1] < la[0]) la[0] = p[1]; if (p[1] > la[1]) la[1] = p[1]; }); }); });
    var sx = (W - 2 * pad) / ((lo[1] - lo[0]) * k), sy = (H - 2 * pad) / (la[1] - la[0]), s = Math.min(sx, sy);
    var ox = (W - (lo[1] - lo[0]) * k * s) / 2, oy = (H - (la[1] - la[0]) * s) / 2;
    function pj(lon, lat) { return [ox + (lon - lo[0]) * k * s, H - oy - (lat - la[0]) * s]; }
    var g = '';
    lotes.forEach(function (l, i) {
      if (sel && String(sel) !== l) return;
      var cor = PAL[i % PAL.length];
      var d = window.MAPA_KMZ[l].map(function (ln) { return 'M' + ln.map(function (p) { var q = pj(p[0], p[1]); return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L'); }).join('');
      g += '<path d="' + d + '" fill="none" stroke="' + cor + '" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity=".85"><title>Lote ' + l + '</title></path>';
    });
    var pts = (window.REAL && window.REAL.pontos) || [];
    pts.forEach(function (p) {
      if (sel && String(sel) !== String(p[0])) return;
      var q = pj(p[6], p[5]);
      if (q[0] < 0 || q[0] > W || q[1] < 0 || q[1] > H) return;
      g += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="2.2" fill="' + (DISC[p[1]] || '#333') + '" stroke="#fff" stroke-width=".4"><title>' + esc(p[2] + ' · ' + p[3] + ' ' + p[4] + ' (L' + p[0] + ')') + '</title></circle>';
    });
    var ro = R0 && R0.rota;
    if (ro && !sel) {
      var hub = pj(-46.6333, -23.5505), seq = [hub].concat(ro.ordem.map(function (o) { return pj(o.lon, o.lat); })).concat([hub]);
      g += '<path d="M' + seq.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L') + '" fill="none" stroke="#111" stroke-width="1.2" stroke-dasharray="5 4" opacity=".7"><title>Ronda semanal de coleta dos cartões</title></path>';
      ro.ordem.forEach(function (o) { var q = pj(o.lon, o.lat); g += '<rect x="' + (q[0] - 5).toFixed(1) + '" y="' + (q[1] - 5).toFixed(1) + '" width="10" height="10" fill="#111" stroke="#fff"><title>' + esc(o.seq + '. ' + o.nome + ' (L' + o.lote + ') · ' + o.fonte) + '</title></rect><text x="' + (q[0] + 7).toFixed(1) + '" y="' + (q[1] + 4).toFixed(1) + '" font-size="10" fill="#111">' + o.seq + '</text>'; });
      g += '<circle cx="' + hub[0].toFixed(1) + '" cy="' + hub[1].toFixed(1) + '" r="7" fill="#c0392b" stroke="#fff"><title>São Paulo (ARTESP) · partida e retorno</title></circle>';
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;background:#eef3f9;border-radius:8px">' + g + '</svg>';
  }

  V.painel = function () {
    var R = window.REAL, html = orig.apply(this, arguments);
    if (!R) return html;
    var leg = Object.keys(DISC).map(function (d) { return '<span style="display:inline-flex;align-items:center;margin-right:12px"><i style="width:10px;height:10px;border-radius:50%;background:' + DISC[d] + ';display:inline-block;margin-right:4px"></i>' + esc(d) + '</span>'; }).join('');
    var linhas = R.lotes.map(function (l) {
      var n = Object.keys(l.ativos || {}).reduce(function (a, k) { return a + l.ativos[k]; }, 0);
      return '<tr><td>' + String(l.lote).padStart(2, '0') + ' · ' + esc(l.nome) + '</td><td style="text-align:right">' + fmtN(l.ext, 1) + '</td><td style="text-align:right">' + fmtN(l.eixo, 1) + '</td><td style="text-align:right">' + fmtN(n) + '</td></tr>';
    }).join('');
    var grp = R.ativos_grupos.slice().sort(function (a, b) { return b.n - a.n; }), mx = grp[0].n;
    var barras = grp.map(function (g) { return '<tr><td>' + esc(g.disciplina) + ' · ' + esc(g.grupo) + '</td><td style="width:38%"><div class="bar"><i style="width:' + (100 * g.n / mx) + '%"></i></div></td><td style="text-align:right">' + fmtN(g.n) + '</td></tr>'; }).join('');
    var dim = R.dimensionamento;
    return html + '<div class="card"><h2>Mapa ilustrativo da malha concedida (traçados dos KMZ da ARTESP)</h2>' +
      '<p class="nota">23 lotes, traçados simplificados para ilustração e sem base cartográfica; pontos são uma amostra dos ativos georreferenciados do cadastro. Os quadrados numerados são as sedes/CCO na ordem da ronda semanal de coleta dos cartões (linha tracejada, saindo de São Paulo). L37 sem dados.</p>' +
      mapaSvg() + '<p class="nota" style="margin-top:8px">' + leg + '</p></div>' +
      '<div class="grid g3"><div class="card"><h2>Malha por concessionária (km)</h2><table><tr><th>Lote</th><th>Extensão</th><th>Eixo troncal</th><th>Ativos</th></tr>' + linhas +
      '<tr><td><b>Total</b></td><td style="text-align:right"><b>' + fmtN(R.total_km, 1) + '</b></td><td></td><td style="text-align:right"><b>' + fmtN(R.ativos_total) + '</b></td></tr></table><p class="nota">Fonte: ' + esc(R.fonte) + '.</p></div>' +
      '<div class="card"><h2>Ativos cadastrados por disciplina</h2><table>' + barras + '</table><p class="nota">O cadastro público não traz pavimento, drenagem ou sinalização horizontal/vertical; essas disciplinas virão da análise das imagens.</p></div>' +
      '<div class="card"><h2>Vídeo e coleta</h2><table><tr><td>Equipamento</td><td>' + esc(dim.resolucao) + ' · ' + dim.fps + ' fps · ' + dim.mbps_canal + ' Mbps/canal</td></tr><tr><td>Vídeo por dia</td><td>' + fmtN(dim.gb_dia_frota) + ' GB (frota)</td></tr><tr><td>Retenção 45 dias</td><td>' + fmtN(dim.tb_retidos_45d, 1) + ' TB</td></tr><tr><td>Cartões</td><td>' + dim.cartoes + ' × ' + dim.cartao_gb + ' GB</td></tr><tr><td>Ronda de coleta</td><td>' + fmtN(dim.ronda_km) + ' km · ' + dim.ronda_dias + ' dias · 23 paradas</td></tr></table></div></div>';
  };
})();
