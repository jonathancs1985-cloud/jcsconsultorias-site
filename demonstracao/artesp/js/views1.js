/* Visões: painel, mapa, pós-processamento (validação) e ocorrências. */
(function () {
  var V = window.VIEWS;

  // ---------- visualizador com zoom/pan (resolução preservada) ----------
  function viewer(div, canvas, shared) {
    var st = shared || { s: 1, x: 0, y: 0, fit: true }, ls = [];
    div.innerHTML = ''; div.appendChild(canvas);
    function local() { canvas.style.transform = 'translate(' + st.x + 'px,' + st.y + 'px) scale(' + st.s + ')'; }
    function aplica() { local(); ls.forEach(function (f) { f(); }); }
    function ajusta() { var k = Math.min(div.clientWidth / canvas.width, div.clientHeight / canvas.height); if (!shared || !shared.init) { st.s = k; st.x = (div.clientWidth - canvas.width * k) / 2; st.y = (div.clientHeight - canvas.height * k) / 2; if (shared) shared.init = true; } aplica(); }
    div.addEventListener('wheel', function (e) { e.preventDefault(); var r = div.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, k = e.deltaY < 0 ? 1.18 : 1 / 1.18, ns = Math.max(0.05, Math.min(12, st.s * k)); st.x = mx - (mx - st.x) * ns / st.s; st.y = my - (my - st.y) * ns / st.s; st.s = ns; aplica(); }, { passive: false });
    var drag = null;
    div.addEventListener('pointerdown', function (e) { drag = { x: e.clientX - st.x, y: e.clientY - st.y }; div.setPointerCapture(e.pointerId); div.style.cursor = 'grabbing'; });
    div.addEventListener('pointermove', function (e) { if (drag) { st.x = e.clientX - drag.x; st.y = e.clientY - drag.y; aplica(); } });
    div.addEventListener('pointerup', function () { drag = null; div.style.cursor = 'grab'; });
    setTimeout(ajusta, 0);
    return { st: st, onchange: function (f) { ls.push(f); }, redraw: local, zoom: function (k) { st.s = Math.max(0.05, Math.min(12, st.s * k)); aplica(); }, reset: function () { if (shared) shared.init = false; ajusta(); } };
  }
  window.criarViewer = viewer;

  function statusTag(s) { var c = { validado: 't-ok', 'falso positivo': 't-ru', rejeitado: 't-ru', processado: 't-av' }[s] || ''; return '<span class="tag ' + c + '">' + esc(s) + '</span>'; }

  // ---------- painel ----------
  V.painel = function () {
    var S = APP.S, regs = APP.regs(), occ = S.ocorrencias.filter(APP.visivel);
    var cap = mediana(regs.map(function (r) { return r.capturaS; })), img = mediana(regs.map(function (r) { return r.imagemS; }));
    var rms = Math.sqrt(regs.reduce(function (a, r) { return a + r.rms * r.rms; }, 0) / Math.max(1, regs.length));
    var capP = cap <= 10 ? 15 : cap <= 30 ? 10 : cap <= 60 ? 5 : 0, imgP = img <= 30 ? 10 : img <= 120 ? 7 : img <= 300 ? 3 : 0;
    var disp = window.COMPONENTES.map(function (c) { var m = S.disp[c].reduce(function (a, d) { return a + d.minIndisp; }, 0); return { c: c, p: 100 * (1 - m / (30 * 1440)), m: m }; });
    var porGrupo = {}; regs.forEach(function (r) { porGrupo[r.classe] = (porGrupo[r.classe] || 0) + 1; });
    var maxG = Math.max.apply(null, Object.keys(porGrupo).map(function (k) { return porGrupo[k]; }).concat([1]));
    var barras = Object.keys(porGrupo).sort().map(function (k) { return '<tr><td>' + esc(classeNome(k)) + '</td><td style="width:42%"><div class="bar"><i style="width:' + (100 * porGrupo[k] / maxG) + '%"></i></div></td><td>' + porGrupo[k] + '</td></tr>'; }).join('');
    var ext = window.REAL ? window.REAL.total_km : 12650, dois = ext * 2, sem = dois * 2, porKit = 6 * 6 * 70, kits = sem / porKit;
    return '<h1>Painel gerencial</h1><p class="sub">Visão do perfil <b>' + esc(S.perfil) + '</b>. Todos os dados são simulados e servem para demonstrar o fluxo exigido no Termo de Referência.</p>' +
      '<div class="grid g4"><div class="card kpi"><b>' + regs.length + '</b><span>registros processados</span></div><div class="card kpi"><b>' + occ.filter(function (o) { return o.situacao === 'aberta'; }).length + '</b><span>ocorrências abertas (' + occ.length + ' no total)</span></div>' +
      '<div class="card kpi ' + (regs.filter(function (r) { return r.status === 'processado'; }).length ? 'ruim' : 'ok') + '"><b>' + regs.filter(function (r) { return r.status === 'processado'; }).length + '</b><span>aguardando validação humana</span></div><div class="card kpi ok"><b>' + fmtN(regs.filter(function (r) { return r.status === 'validado'; }).length) + '</b><span>validados</span></div></div>' +
      '<div class="grid g3"><div class="card"><h2>Níveis de serviço (TR 8.25.14)</h2><table><tr><th>Indicador</th><th>Exigência</th><th>Apurado</th></tr>' +
      '<tr><td>Reconhecimento e captura (mediana)</td><td>≤ 10 s → 15 pts</td><td>' + fmtN(cap, 1) + ' s <span class="tag ' + (capP === 15 ? 't-ok' : 't-av') + '">' + capP + ' pts</span></td></tr>' +
      '<tr><td>Imagem disponível (mediana)</td><td>≤ 30 s → 10 pts</td><td>' + fmtN(img, 1) + ' s <span class="tag ' + (imgP === 10 ? 't-ok' : 't-av') + '">' + imgP + ' pts</span></td></tr>' +
      '<tr><td>Acurácia posicional (RMS)</td><td>≤ 5 m (≤ 2 m → 3 pts)</td><td>' + fmtN(rms, 2) + ' m <span class="tag ' + (rms <= 5 ? 't-ok' : 't-ru') + '">' + (rms <= 5 ? 'atende' : 'não atende') + '</span></td></tr>' +
      '<tr><td>Armazenamento de vídeos</td><td>≥ 45 dias</td><td>45 dias <span class="tag t-ok">configurado</span></td></tr></table><p class="nota">Valores medidos sobre os registros simulados; na POC serão medidos com equipamento real e conjunto de referência da ARTESP.</p></div>' +
      '<div class="card"><h2>Disponibilidade (30 dias)</h2>' + disp.map(function (d) { return '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between"><span>' + d.c + '</span><b>' + fmtN(d.p, 2) + '%</b></div><div class="bar ' + (d.p >= 98 ? 'vd' : 'ver') + '"><i style="width:' + d.p + '%"></i></div></div>'; }).join('') + '<p class="nota">Meta mínima: 98% mensal, 24×7.</p></div>' +
      '<div class="card"><h2>Dimensionamento (TR 5.7)</h2><table><tr><td>Extensão concedida</td><td>' + fmtN(ext) + ' km</td></tr><tr><td>Ambos os sentidos</td><td>' + fmtN(dois) + ' km</td></tr><tr><td>Duas varreduras semanais</td><td><b>' + fmtN(sem) + ' km/semana</b></td></tr><tr><td>Capacidade por kit</td><td>6 dias × 6 h × 70 km/h = ' + fmtN(porKit) + ' km/sem (TR: ≈ 2.530)</td></tr><tr><td>Kits necessários</td><td>' + fmtN(kits, 2) + ' → <b>20 kits</b></td></tr><tr><td>Cobertura com 20 kits</td><td>' + fmtN(100 * 20 * porKit / sem, 1) + '% (margem do TR 5.7.8)</td></tr></table></div></div>' +
      '<div class="card"><h2>Registros por classe</h2><table>' + barras + '</table></div>';
  };

  // ---------- mapa ----------
  V.mapa = function () {
    var S = APP.S, W = 900, H = 520, pad = 40, lats = [], lons = [];
    RODOVIAS.forEach(function (r) { r.pts.forEach(function (p) { lats.push(p[0]); lons.push(p[1]); }); });
    var a0 = Math.min.apply(null, lats), a1 = Math.max.apply(null, lats), o0 = Math.min.apply(null, lons), o1 = Math.max.apply(null, lons);
    function pj(lat, lon) { return [pad + (lon - o0) / (o1 - o0) * (W - 2 * pad), H - pad - (lat - a0) / (a1 - a0) * (H - 2 * pad)]; }
    var cor = { 'validado': '#0a7d4f', 'processado': '#f2b705', 'falso positivo': '#9aa3b5', 'rejeitado': '#9aa3b5' };
    var html = '<h1>Mapa dos registros</h1><p class="sub">Visualização cartográfica esquemática. Clique em um ponto para ver o registro.</p><div class="card"><div class="mini"><label>Rodovia<select id="fr"><option value="">Todas</option>' + opt(RODOVIAS, '', function (r) { return [r.cod, r.cod + ' (' + r.lote + ')']; }) + '</select></label><label>Situação<select id="fs"><option value="">Todas</option><option>processado</option><option>validado</option><option>falso positivo</option></select></label><label>Classe<select id="fc"><option value="">Todas</option>' + opt(CLASSES_DEMO, '', function (c) { return [c.item, classeNome(c.item).slice(0, 60)]; }) + '</select></label><label><input type="checkbox" id="fa"> Ativos</label></div>' +
      '<div class="grid" style="grid-template-columns:minmax(0,3fr) minmax(0,1.1fr)"><div><svg id="svgm" viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;background:#eaf1e6;border-radius:6px"></svg><div class="leg"><span><i style="background:#f2b705"></i>aguardando validação</span><span><i style="background:#0a7d4f"></i>validado</span><span><i style="background:#9aa3b5"></i>falso positivo/rejeitado</span><span><i style="background:#0b3d91;border-radius:2px"></i>ativo</span></div></div><div id="detm"><p class="nota">Selecione um ponto no mapa.</p></div></div></div>';
    return {
      html: html, after: function (m) {
        function desenha() {
          var fr = m.querySelector('#fr').value, fs = m.querySelector('#fs').value, fc = m.querySelector('#fc').value, fa = m.querySelector('#fa').checked, s = '';
          RODOVIAS.forEach(function (r) { if (fr && fr !== r.cod) return; if (!APP.visivel(r)) return; var d = r.pts.map(function (p, i) { var q = pj(p[0], p[1]); return (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(''); s += '<path d="' + d + '" fill="none" stroke="#7b8398" stroke-width="7" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="8 7"/>'; for (var k = 0; k <= r.km; k += 20) { var pp = posicaoNaRodovia(r, k), q = pj(pp[0], pp[1]); s += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="2.5" fill="#333"/><text x="' + (q[0] + 5) + '" y="' + (q[1] - 5) + '" font-size="9" fill="#333">km ' + k + '</text>'; } var q0 = pj(r.pts[0][0], r.pts[0][1]); s += '<text x="' + q0[0] + '" y="' + (q0[1] + 18) + '" font-size="12" font-weight="bold" fill="#0b3d91">' + r.cod + ' · ' + r.lote + '</text>'; });
          APP.regs().forEach(function (r) { if ((fr && r.rodovia !== fr) || (fs && r.status !== fs) || (fc && r.classe !== fc)) return; var q = pj(r.lat, r.lon); s += '<circle class="pt" data-id="' + r.id + '" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="6" fill="' + (cor[r.status] || '#999') + '" stroke="#fff" stroke-width="1.5" style="cursor:pointer"/>'; });
          if (fa) S.ativos.filter(APP.visivel).forEach(function (a) { var la = a.detLat != null ? a.detLat : a.cadLat, lo = a.detLon != null ? a.detLon : a.cadLon, q = pj(la, lo); s += '<rect x="' + (q[0] - 4) + '" y="' + (q[1] - 4) + '" width="8" height="8" fill="#0b3d91" opacity=".75"><title>' + esc(a.classe) + '</title></rect>'; });
          m.querySelector('#svgm').innerHTML = s;
        }
        ['#fr', '#fs', '#fc', '#fa'].forEach(function (id) { m.querySelector(id).addEventListener('change', desenha); });
        m.querySelector('#svgm').addEventListener('click', function (e) {
          var t = e.target.closest('.pt'); if (!t) return; var r = S.registros.find(function (x) { return x.id === t.getAttribute('data-id'); }), c = IMG.nova(320, 180);
          IMG.cena(c, r, { anotada: true, anonimizar: APP.perfil().anon });
          m.querySelector('#detm').innerHTML = '<div class="card"><b>' + r.id + '</b> ' + statusTag(r.status) + '<br>' + esc(classeNome(r.classe)) + '<br>' + r.rodovia + ' km ' + r.km + ' · ' + r.sentido + '<br><span class="nota">' + r.lat.toFixed(6) + ', ' + r.lon.toFixed(6) + ' (EPSG:4674) · RMS ' + r.rms + ' m · ' + fmtD(r.ts) + '</span><div id="mc" style="margin:8px 0"></div><a class="btn" href="#/validacao?id=' + r.id + '">Abrir no pós-processamento</a></div>';
          m.querySelector('#mc').appendChild(c); c.style.width = '100%';
        });
        desenha();
      }
    };
  };

  // ---------- pós-processamento ----------
  V.validacao = function (q) {
    var S = APP.S, regs = APP.regs().slice().sort(function (a, b) { return b.ts - a.ts; });
    var cur = regs.find(function (r) { return r.id === q.id; }) || regs[0];
    if (!cur) return '<h1>Pós-processamento</h1><p>Sem registros visíveis para este perfil.</p>';
    var perm = APP.perfil().acoes, anon = APP.perfil().anon;
    var lista = regs.slice(0, 120).map(function (r) { return '<tr class="link ' + (r.id === cur.id ? 'sel' : '') + '" data-id="' + r.id + '"><td>' + r.id + '</td><td>' + esc(window.taxItem(r.classe).classe) + '</td><td>' + r.rodovia + ' ' + r.km + '</td><td>' + statusTag(r.status) + '</td></tr>'; }).join('');
    var t = window.taxItem(cur.classe);
    var html = '<h1>Pós-processamento e validação</h1><p class="sub">Validar, rejeitar, reclassificar, complementar e confirmar falsos positivos, com histórico. Imagem original e anotada preservadas.</p>' +
      '<div class="grid g32"><div class="card"><div class="mini"><label>Situação<select id="fs"><option value="">Todas</option><option>processado</option><option>validado</option><option>falso positivo</option><option>rejeitado</option></select></label></div><div class="tw" style="max-height:560px"><table id="tl"><tr><th>ID</th><th>Classe</th><th>Local</th><th>Situação</th></tr>' + lista + '</table></div></div>' +
      '<div><div class="card"><div class="mini"><button class="sec" data-m="orig">Original</button><button class="sec" data-m="anot">Anotada</button><button class="sec" data-m="lado">Lado a lado</button><button class="sec" data-m="anon">Anonimizada</button><span style="flex:1"></span><button class="sec" id="zi">＋</button><button class="sec" id="zo">－</button><button class="sec" id="zr">Ajustar</button><button class="sec" id="crop">Recortar (resolução nativa)</button></div>' +
      '<div id="vw" class="vw" style="height:380px;margin-top:8px"></div><div id="vw2" class="vw" style="height:380px;margin-top:8px;display:none"></div><p class="nota" id="vinfo"></p>' + (anon ? '<div class="aviso">Perfil com compartilhamento restrito: placas e rostos são ocultados automaticamente. O original permanece preservado para a ARTESP.</div>' : '') + '</div>' +
      '<div class="grid g2"><div class="card"><h2>' + esc(cur.id) + ' ' + statusTag(cur.status) + '</h2><b>' + esc(t.classe) + '</b><br>' + esc(t.situacao) + '<br><span class="nota">Ação necessária: ' + esc(t.acao) + '</span><table style="margin-top:8px"><tr><td>Local</td><td>' + cur.rodovia + ' km ' + cur.km + ' · ' + cur.sentido + '</td></tr><tr><td>Coordenadas</td><td>' + cur.lat.toFixed(6) + ', ' + cur.lon.toFixed(6) + ' (EPSG:4674)</td></tr><tr><td>Qualidade da posição</td><td>RMS ' + cur.rms + ' m <span class="tag ' + (cur.rms <= 5 ? 't-ok' : 't-ru') + '">' + (cur.rms <= 5 ? '≤ 5 m' : '> 5 m') + '</span></td></tr><tr><td>Captura</td><td>' + fmtD(cur.ts) + '</td></tr><tr><td>Origem</td><td>' + esc(cur.origem) + '</td></tr><tr><td>Confiança da IA</td><td>' + Math.round(cur.conf * 100) + '%</td></tr><tr><td>Tempos</td><td>registro em ' + cur.capturaS + ' s · imagem em ' + cur.imagemS + ' s</td></tr><tr><td>Vistoria</td><td>' + esc(cur.tipoVistoria) + ' · ocorrência ' + esc(cur.ocorrencia) + '</td></tr><tr><td>Integridade (SHA-256)</td><td><code id="hash" style="font-size:11px;word-break:break-all">calculando…</code></td></tr></table><div class="mini" style="margin-top:6px"><button class="sec" id="verhash">Verificar integridade</button><button class="sec" id="json">Marcações (JSON)</button></div></div>' +
      '<div class="card ' + (perm ? '' : 'ro') + '"><h2>Ações do usuário</h2><div class="mini"><button class="vd" data-a="validar">Validar</button><button class="ver" data-a="rejeitar">Rejeitar</button><button class="sec" data-a="fp">Confirmar falso positivo</button></div><div class="mini" style="margin-top:8px"><label>Reclassificar / nova classe<select id="rc">' + opt(window.TAXONOMIA, cur.classe, function (x) { return [x.item, x.item + ' · ' + x.situacao.slice(0, 70)]; }) + '</select></label><button class="sec" data-a="reclass">Aplicar</button></div><div class="mini"><label>Alterar atributos (km)<input id="km" type="number" step="0.1" value="' + cur.km + '" style="width:90px"></label><label>Sentido<select id="sent">' + opt(['Crescente', 'Decrescente'], cur.sentido) + '</select></label><button class="sec" data-a="attr">Salvar</button></div><label style="display:block">Complementar informações<textarea id="nt">' + esc(cur.notas) + '</textarea></label><div class="mini"><button class="sec" data-a="nota">Salvar complemento</button><label><input type="checkbox" id="rt" ' + (cur.retreino ? 'checked' : '') + '> usar para retreinamento</label></div></div></div>' +
      '<div class="card"><h2>Histórico de alterações</h2><table><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Detalhe</th></tr>' + cur.historico.slice().reverse().map(function (h) { return '<tr><td>' + fmtD(h.ts) + '</td><td>' + esc(h.quem) + '</td><td>' + esc(h.acao) + '</td><td>' + esc(h.det) + '</td></tr>'; }).join('') + '</table></div></div></div>';
    return {
      html: html, after: function (m) {
        var modo = anon ? 'anon' : 'orig', base = IMG.nova(1280, 720), vw, vw2;
        function quem() { return S.perfil === 'ARTESP' ? 'fiscal.artesp' : S.perfil.split(' ')[0].toLowerCase(); }
        function mostra() {
          var d1 = m.querySelector('#vw'), d2 = m.querySelector('#vw2'), c = IMG.nova(1280, 720), lado = modo === 'lado';
          if (anon && (modo === 'orig' || modo === 'lado')) modo = lado ? 'lado' : 'anon';
          IMG.cena(c, cur, { anotada: modo === 'anot', anonimizar: modo === 'anon' || (anon && modo !== 'orig') });
          var sh = { s: 1, x: 0, y: 0 }; vw = criarViewer(d1, c, sh);
          d2.style.display = lado ? 'block' : 'none';
          if (lado) { var c2 = IMG.nova(1280, 720); IMG.cena(c2, cur, { anotada: true, anonimizar: anon }); vw2 = criarViewer(d2, c2, sh); vw.onchange(function () { vw2.redraw(); }); d1.style.height = '250px'; d2.style.height = '250px'; } else d1.style.height = '380px';
          m.querySelector('#vinfo').textContent = 'Original preservado em 3840×2160 (4K); exibição em 1280×720. Use a roda do mouse para zoom e arraste para deslocar.' + (lado ? ' Esquerda: captada · direita: anotada.' : '');
        }
        mostra();
        var cv = IMG.nova(1280, 720); IMG.cena(cv, cur, {}); var h0 = null; IMG.sha256(cv).then(function (h) { h0 = h; m.querySelector('#hash').textContent = h; });
        m.querySelector('#verhash').onclick = function () { var c2 = IMG.nova(1280, 720); IMG.cena(c2, cur, {}); IMG.sha256(c2).then(function (h) { toast(h === h0 ? 'Integridade confirmada: o resumo criptográfico confere.' : 'ATENÇÃO: o resumo não confere.'); APP.audit('Verificação de integridade', cur.id, h === h0 ? 'ok' : 'divergente'); }); };
        m.querySelector('#json').onclick = function () { baixar(cur.id + '_marcacoes.json', JSON.stringify({ id: cur.id, classe: cur.classe, bbox_normalizada: cur.bbox, resolucao_original: [3840, 2160], bbox_pixels: { x: Math.round(cur.bbox.x * 3840), y: Math.round(cur.bbox.y * 2160), w: Math.round(cur.bbox.w * 3840), h: Math.round(cur.bbox.h * 2160) }, confianca: cur.conf, epsg: 4674, lat: cur.lat, lon: cur.lon, qualidade_posicao_rms_m: cur.rms }, null, 2), 'application/json'); };
        m.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { modo = b.getAttribute('data-m'); mostra(); }; });
        m.querySelector('#zi').onclick = function () { vw.zoom(1.3); }; m.querySelector('#zo').onclick = function () { vw.zoom(1 / 1.3); }; m.querySelector('#zr').onclick = function () { mostra(); };
        m.querySelector('#crop').onclick = function () { var c = IMG.nova(3840, 2160); IMG.cena(c, cur, { anonimizar: anon }); var b = cur.bbox, mg = 0.04, x = Math.max(0, (b.x - mg) * 3840) | 0, y = Math.max(0, (b.y - mg) * 2160) | 0, w = Math.min(3840 - x, (b.w + 2 * mg) * 3840) | 0, h = Math.min(2160 - y, (b.h + 2 * mg) * 2160) | 0, o = IMG.nova(w, h); o.getContext('2d').drawImage(c, x, y, w, h, 0, 0, w, h); o.toBlob(function (bl) { var a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = cur.id + '_recorte_' + w + 'x' + h + '.png'; a.click(); }); APP.audit('Recorte na resolução nativa', cur.id, w + 'x' + h); toast('Recorte gerado em ' + w + '×' + h + ' px (resolução nativa).'); };
        m.querySelectorAll('#tl tr.link').forEach(function (tr) { tr.onclick = function () { location.hash = '#/validacao?id=' + tr.getAttribute('data-id'); }; });
        m.querySelector('#fs').onchange = function (e) { m.querySelectorAll('#tl tr.link').forEach(function (tr) { var r = S.registros.find(function (x) { return x.id === tr.getAttribute('data-id'); }); tr.style.display = !e.target.value || r.status === e.target.value ? '' : 'none'; }); };
        function reg(acao, det, extra) { cur.historico.push({ ts: Date.now(), quem: quem(), acao: acao, det: det || '' }); if (extra) extra(); APP.audit(acao, cur.id, det); APP.salvar(); APP.rota(); }
        m.querySelectorAll('[data-a]').forEach(function (b) {
          b.onclick = function () {
            var a = b.getAttribute('data-a');
            if (a === 'validar') reg('Validado', '', function () { cur.status = 'validado'; });
            else if (a === 'rejeitar') reg('Rejeitado', '', function () { cur.status = 'rejeitado'; });
            else if (a === 'fp') reg('Falso positivo confirmado', 'candidato a reforço negativo', function () { cur.status = 'falso positivo'; });
            else if (a === 'reclass') { var n = m.querySelector('#rc').value; if (n !== cur.classe) reg('Reclassificado', cur.classe + ' → ' + n, function () { cur.classe = n; cur.status = 'validado'; }); }
            else if (a === 'attr') reg('Atributos alterados', 'km ' + cur.km + ' → ' + m.querySelector('#km').value + '; sentido ' + cur.sentido + ' → ' + m.querySelector('#sent').value, function () { cur.km = +m.querySelector('#km').value; cur.sentido = m.querySelector('#sent').value; });
            else if (a === 'nota') reg('Informação complementada', m.querySelector('#nt').value.slice(0, 80), function () { cur.notas = m.querySelector('#nt').value; });
          };
        });
        m.querySelector('#rt').onchange = function (e) { cur.retreino = e.target.checked; APP.audit('Marcação para retreinamento', cur.id, String(e.target.checked)); APP.salvar(); toast(e.target.checked ? 'Registro será usado no retreinamento dos modelos.' : 'Registro removido do retreinamento.'); };
      }
    };
  };

  // ---------- ocorrências ----------
  V.ocorrencias = function (q) {
    var S = APP.S, occ = S.ocorrencias.filter(APP.visivel).sort(function (a, b) { return b.aberta - a.aberta; });
    var cur = occ.find(function (o) { return o.id === q.id; }) || occ[0], perm = APP.perfil().acoes;
    if (!cur) return '<h1>Ocorrências</h1><p>Sem ocorrências visíveis.</p>';
    var regs = cur.registros.map(function (id) { return S.registros.find(function (r) { return r.id === id; }); }).filter(Boolean).sort(function (a, b) { return a.ts - b.ts; });
    var dups = (S.duplicidades || []).filter(function (d) { return d.aberto; });
    var linhas = occ.slice(0, 150).map(function (o) { var dias = Math.max(0, o.prazoDias - Math.floor((Date.now() - o.aberta) / 86400000)); return '<tr class="link ' + (o.id === cur.id ? 'sel' : '') + '" data-id="' + o.id + '"><td>' + o.id + '</td><td>' + esc(window.taxItem(o.classe).classe) + '</td><td>' + o.rodovia + ' ' + o.km + '</td><td><span class="tag ' + (o.situacao === 'aberta' ? 't-av' : 't-ok') + '">' + o.situacao + '</span></td><td>' + o.registros.length + '</td><td>' + (o.situacao === 'aberta' ? dias + ' d' : '—') + '</td></tr>'; }).join('');
    var tl = regs.map(function (r) { return '<tr><td>' + fmtD(r.ts) + '</td><td><span class="tag ' + (r.tipoVistoria === 'retorno' ? 't-az' : r.tipoVistoria.indexOf('duplic') >= 0 ? 't-av' : '') + '">' + esc(r.tipoVistoria) + '</span></td><td>' + r.id + '</td><td>' + esc(r.origem) + '</td><td>' + (r.estado === 'regularizado' ? '<span class="tag t-ok">regularizado</span>' : '<span class="tag t-av">persiste</span>') + '</td></tr>'; }).join('');
    var opts = regs.map(function (r) { return [r.id, r.id + ' · ' + r.tipoVistoria + ' · ' + fmtD(r.ts)]; });
    var html = '<h1>Gestão de ocorrências</h1><p class="sub">Constatação e retornos ficam vinculados à mesma ocorrência; novas passagens são associadas automaticamente, sem duplicar enquanto a situação perdurar.</p>' +
      '<div class="grid g32"><div class="card"><div class="tw" style="max-height:520px"><table id="to"><tr><th>ID</th><th>Classe</th><th>Local</th><th>Situação</th><th>Reg.</th><th>Prazo</th></tr>' + linhas + '</table></div></div>' +
      '<div><div class="card"><h2>' + cur.id + ' · ' + esc(window.taxItem(cur.classe).classe) + '</h2><table><tr><th>Quando</th><th>Vistoria</th><th>Registro</th><th>Origem</th><th>Situação</th></tr>' + tl + '</table>' +
      '<div class="mini" style="margin-top:8px"><button class="vd" id="sret" ' + (perm ? '' : 'disabled') + '>Simular passagem de retorno</button><button class="sec" id="sreg" ' + (perm ? '' : 'disabled') + '>Simular retorno regularizado</button><button class="sec" id="sdup" ' + (perm ? '' : 'disabled') + '>Simular outro levantamento (duplicidade)</button><button class="sec" id="snov" ' + (perm ? '' : 'disabled') + '>Simular nova situação</button></div><div id="alog"></div></div>' +
      '<div class="card"><h2>Comparação entre vistorias</h2><div class="mini"><label>Esquerda<select id="ca">' + opt(opts, regs[0].id, function (x) { return x; }) + '</select></label><label>Direita<select id="cb">' + opt(opts, regs[regs.length - 1].id, function (x) { return x; }) + '</select></label><label><input type="checkbox" id="cd"> mostrar diferenças</label></div><div class="grid g2"><div id="v1" class="vw" style="height:230px"></div><div id="v2" class="vw" style="height:230px"></div></div><p class="nota" id="cinfo"></p></div>' +
      '<div class="card"><h2>Possíveis duplicidades entre levantamentos' + (dups.length ? ' <span class="tag t-av">' + dups.length + '</span>' : '') + '</h2>' + (dups.length ? '<table><tr><th>Registro</th><th>Ocorrência existente</th><th>Distância</th><th>Intervalo</th><th></th></tr>' + dups.map(function (d) { return '<tr><td>' + d.registro + '</td><td>' + d.ocorrencia + '</td><td>' + d.dist + ' m</td><td>' + d.horas + ' h</td><td>' + (perm ? '<button class="vd" data-d="' + d.id + '" data-x="c">Consolidar</button> <button class="sec" data-d="' + d.id + '" data-x="m">Manter separado</button>' : '') + '</td></tr>'; }).join('') + '</table>' : '<p class="nota">Nenhuma pendência. Use “Simular outro levantamento” para ver a detecção.</p>') + '</div>' +
      (cur.situacao === 'aberta' ? '<div class="card ' + (perm ? '' : 'ro') + '"><button class="ver" id="enc">Encerrar ocorrência após regularização</button></div>' : '') + '</div></div>';
    return {
      html: html, after: function (m) {
        m.querySelectorAll('#to tr.link').forEach(function (tr) { tr.onclick = function () { location.hash = '#/ocorrencias?id=' + tr.getAttribute('data-id'); }; });
        var anon = APP.perfil().anon, sh = { s: 1, x: 0, y: 0 }, v1, v2;
        function comp() {
          var a = S.registros.find(function (r) { return r.id === m.querySelector('#ca').value; }), b = S.registros.find(function (r) { return r.id === m.querySelector('#cb').value; });
          var ca = IMG.nova(960, 540), cb = IMG.nova(960, 540); IMG.cena(ca, a, { anotada: true, anonimizar: anon }); IMG.cena(cb, b, { anotada: true, anonimizar: anon });
          var info = 'Mesma localização sincronizada (zoom e deslocamento acompanham). ';
          var shd = { s: 1, x: 0, y: 0 }; v1 = criarViewer(m.querySelector('#v1'), ca, shd);
          if (m.querySelector('#cd').checked) { var A = IMG.nova(960, 540), B = IMG.nova(960, 540); IMG.cena(A, a, {}); IMG.cena(B, b, {}); var d = IMG.diff(A, B); v2 = criarViewer(m.querySelector('#v2'), d.canvas, shd); info += 'Diferença entre as imagens: ' + d.pct + '% dos pixels (vermelho).'; }
          else v2 = criarViewer(m.querySelector('#v2'), cb, shd);
          v1.onchange(function () { v2.redraw(); }); v2.onchange(function () { v1.redraw(); });
          info += ' Evolução: ' + (a.estado === 'presente' && b.estado === 'regularizado' ? 'situação REGULARIZADA entre as vistorias.' : a.estado === b.estado ? 'situação persiste (' + b.estado + ').' : 'alteração de estado de ' + a.estado + ' para ' + b.estado + '.');
          m.querySelector('#cinfo').textContent = info;
        }
        ['#ca', '#cb', '#cd'].forEach(function (id) { m.querySelector(id).onchange = comp; }); comp();
        function sim(regularizado, tipo) {
          var base = regs[0], p = posicaoNaRodovia(RODOVIAS.find(function (r) { return r.cod === cur.rodovia; }), cur.km);
          var cls = CLASSES_DEMO.find(function (c) { return c.item === cur.classe; }) || CLASSES_DEMO[0], r = RNG(Date.now() % 1e9);
          var novo = { id: 'R' + String(S.registros.length + 1).padStart(4, '0'), seed: base.seed, rodovia: cur.rodovia, lote: cur.lote, sentido: cur.sentido, km: cur.km, lat: cur.lat + (r() - 0.5) * 0.00008, lon: cur.lon + (r() - 0.5) * 0.00008, rms: Math.round((1.2 + r() * 2.5) * 10) / 10, classe: cur.classe, grupo: cls.grupo, conf: Math.round((0.8 + r() * 0.19) * 100) / 100, bbox: base.bbox, ts: Date.now() + (tipo === 'dup' ? 0 : 36 * 3600000), origem: tipo === 'dup' ? 'Celular (EAF)' : base.origem, estado: regularizado ? 'regularizado' : 'presente', status: 'processado', capturaS: Math.round((3 + r() * 6) * 10) / 10, imagemS: Math.round((10 + r() * 20) * 10) / 10, sensivel: { placa: false, rosto: false }, historico: [{ ts: Date.now(), quem: 'Sistema (IA)', acao: 'Registro criado automaticamente', det: '' }], notas: '' };
          if (tipo === 'dup') novo.ts = regs[regs.length - 1].ts + 2 * 3600000;
          S.registros.push(novo); var res = associar(novo); APP.audit('Associação automática', novo.id, res.decisao + ' → ' + res.ocorrencia); APP.salvar();
          m.querySelector('#alog').innerHTML = '<div class="aviso"><b>Decisão: ' + res.decisao.toUpperCase() + '</b> (' + novo.id + ')<ul>' + res.log.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></div>';
          toast('Registro ' + novo.id + ': ' + res.decisao + '.'); setTimeout(function () { var al = m.querySelector('#alog').innerHTML; APP.rota(); document.getElementById('main').querySelector('#alog').innerHTML = al; }, 600);
        }
        function bind(id, f) { var b = m.querySelector(id); if (b) b.onclick = f; }
        bind('#sret', function () { sim(false, 'ret'); }); bind('#sreg', function () { sim(true, 'ret'); }); bind('#sdup', function () { sim(false, 'dup'); });
        bind('#snov', function () { var r = RNG(Date.now() % 1e9), rod = RODOVIAS[Math.floor(r() * 4)], cls = CLASSES_DEMO[Math.floor(r() * 6)], km = 2 + r() * (rod.km - 4), p = posicaoNaRodovia(rod, km); var n = { id: 'R' + String(S.registros.length + 1).padStart(4, '0'), seed: Math.floor(r() * 1e9), rodovia: rod.cod, lote: rod.lote, sentido: 'Crescente', km: Math.round(km * 10) / 10, lat: p[0], lon: p[1], rms: 2.4, classe: cls.item, grupo: cls.grupo, conf: 0.9, bbox: { x: 0.4, y: 0.5, w: 0.2, h: 0.15 }, ts: Date.now(), origem: 'Kit 03 (veicular)', estado: 'presente', status: 'processado', capturaS: 5.2, imagemS: 14, sensivel: { placa: true, rosto: false }, historico: [{ ts: Date.now(), quem: 'Sistema (IA)', acao: 'Registro criado automaticamente', det: '' }], notas: '' }; var b0 = { pavimento: [0.38, 0.62, 0.18, 0.12], vegetacao: [0.66, 0.40, 0.26, 0.30], pichacao: [0.06, 0.28, 0.28, 0.22], vedo: [0.60, 0.46, 0.34, 0.16], drenagem: [0.70, 0.64, 0.24, 0.12], residuos: [0.20, 0.66, 0.14, 0.10] }[cls.grupo]; n.bbox = { x: b0[0], y: b0[1], w: b0[2], h: b0[3] }; S.registros.push(n); var res = associar(n); APP.audit('Associação automática', n.id, res.decisao + ' → ' + res.ocorrencia); APP.salvar(); toast(n.id + ': ' + res.decisao + ' (' + res.ocorrencia + ')'); location.hash = '#/ocorrencias?id=' + res.ocorrencia; });
        bind('#enc', function () { cur.situacao = 'encerrada'; cur.encerrada = Date.now(); APP.audit('Ocorrência encerrada', cur.id, 'após regularização'); APP.salvar(); APP.rota(); });
        m.querySelectorAll('[data-d]').forEach(function (b) { b.onclick = function () { var d = S.duplicidades.find(function (x) { return x.id === b.getAttribute('data-d'); }), r = S.registros.find(function (x) { return x.id === d.registro; }), o = S.ocorrencias.find(function (x) { return x.id === d.ocorrencia; }); d.aberto = false; if (b.getAttribute('data-x') === 'c') { r.tipoVistoria = 'consolidado'; if (o.registros.indexOf(r.id) < 0) o.registros.push(r.id); APP.audit('Duplicidade consolidada', r.id, '→ ' + o.id); } else { r.tipoVistoria = 'constatação'; var oid = 'O' + String(S.ocorrencias.length + 1).padStart(4, '0'); r.ocorrencia = oid; o.registros = o.registros.filter(function (x) { return x !== r.id; }); S.ocorrencias.push({ id: oid, classe: r.classe, rodovia: r.rodovia, lote: r.lote, sentido: r.sentido, km: r.km, lat: r.lat, lon: r.lon, aberta: r.ts, situacao: 'aberta', registros: [r.id], prazoDias: 15 }); APP.audit('Duplicidade rejeitada', r.id, 'nova ocorrência ' + oid); } APP.salvar(); APP.rota(); }; });
      }
    };
  };
})();
