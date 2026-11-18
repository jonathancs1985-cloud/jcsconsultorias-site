/* Visões: ativos, taxonomia, relatórios/painéis, registro manual e roteirização. */
(function () {
  var V = window.VIEWS;

  // ---------- validação de ativos ----------
  V.ativos = function () {
    var S = APP.S, perm = APP.perfil().homologa, as = S.ativos.filter(APP.visivel);
    function st(a) { var tol = S.params.tolPorClasse[a.classe]; if (!a.cadastrado) return ['Não cadastrado', 't-az']; if (a.detLat == null) return ['Não detectado', 't-ru']; var d = haversine(a.cadLat, a.cadLon, a.detLat, a.detLon); return d <= tol ? ['Conforme', 't-ok'] : ['Divergência de posição', 't-av']; }
    function dist(a) { return a.cadastrado && a.detLat != null ? haversine(a.cadLat, a.cadLon, a.detLat, a.detLon) : null; }
    var cont = {}; as.forEach(function (a) { var s = st(a)[0]; cont[s] = (cont[s] || 0) + 1; });
    var tol = window.CLASSES_ATIVOS.map(function (c) { return '<tr><td>' + esc(c) + '</td><td><input type="number" min="5.1" step="0.5" data-c="' + esc(c) + '" value="' + S.params.tolPorClasse[c] + '" style="width:80px" ' + (perm ? '' : 'disabled') + '> m</td></tr>'; }).join('');
    var linhas = as.map(function (a) { var s = st(a), d = dist(a); return '<tr><td>' + a.id + '</td><td>' + esc(a.classe) + '</td><td>' + a.rodovia + ' km ' + a.km + '</td><td>' + (d == null ? '—' : fmtN(d, 1) + ' m') + '</td><td><span class="tag ' + s[1] + '">' + s[0] + '</span></td></tr>'; }).join('');
    var hist = (S.params.histParams || []).slice().reverse().map(function (h) { return '<tr><td>' + fmtD(h.ts) + '</td><td>' + esc(h.quem) + '</td><td>' + esc(h.classe) + '</td><td>' + h.de + ' → ' + h.para + ' m</td></tr>'; }).join('');
    return {
      html: '<h1>Validação de ativos rodoviários</h1><p class="sub">Ativos identificados nas imagens são comparados com o cadastro da ARTESP. Divergências e ativos não cadastrados seguem para validação; sem cadastro, os detectados formam o inventário inicial após homologação.</p>' +
        '<div class="grid g4">' + ['Conforme', 'Divergência de posição', 'Não cadastrado', 'Não detectado'].map(function (k) { return '<div class="card kpi"><b>' + (cont[k] || 0) + '</b><span>' + k + '</span></div>'; }).join('') + '</div>' +
        '<div class="grid g2"><div class="card"><h2>Tolerância de posição por classe (TR 5.5.14)</h2><p class="nota">Parametrizada pela ARTESP, sem intervenção da contratada. Deve ser superior à acurácia posicional exigida (5 m); o histórico é preservado.</p><table>' + tol + '</table><h3>Histórico de parâmetros</h3><div class="tw" style="max-height:130px"><table><tr><th>Quando</th><th>Quem</th><th>Classe</th><th>Alteração</th></tr>' + hist + '</table></div></div>' +
        '<div class="card"><h2>Inventário inicial</h2><p class="nota">Ativos detectados sem correspondência no cadastro podem ser homologados pela ARTESP como base de referência para as verificações seguintes.</p><button class="vd" id="hom" ' + (perm ? '' : 'disabled') + '>Homologar ativos não cadastrados (' + (cont['Não cadastrado'] || 0) + ')</button>' + (perm ? '' : '<p class="nota">Somente o perfil ARTESP homologa.</p>') + '</div></div>' +
        '<div class="card"><h2>Comparação cadastro × campo</h2><div class="tw"><table><tr><th>ID</th><th>Classe</th><th>Local</th><th>Distância</th><th>Situação</th></tr>' + linhas + '</table></div></div>',
      after: function (m) {
        m.querySelectorAll('input[data-c]').forEach(function (i) {
          i.onchange = function () { var c = i.getAttribute('data-c'), v = +i.value, ant = S.params.tolPorClasse[c]; if (!(v > 5)) { toast('A tolerância deve ser superior à acurácia posicional exigida (5 m).'); i.value = ant; return; } S.params.tolPorClasse[c] = v; S.params.histParams.push({ ts: Date.now(), quem: 'fiscal.artesp', classe: c, de: ant, para: v }); APP.audit('Parâmetro de tolerância alterado', c, ant + ' → ' + v + ' m'); APP.salvar(); APP.rota(); };
        });
        var b = m.querySelector('#hom'); if (b) b.onclick = function () { var n = 0; S.ativos.forEach(function (a) { if (!a.cadastrado && a.detLat != null) { a.cadastrado = true; a.cadLat = a.detLat; a.cadLon = a.detLon; n++; } }); APP.audit('Inventário inicial homologado', '', n + ' ativos'); APP.salvar(); toast(n + ' ativos incluídos no inventário.'); APP.rota(); };
      }
    };
  };

  // ---------- taxonomia ----------
  V.taxonomia = function (q) {
    var S = APP.S; S.os = S.os || []; var T = window.TAXONOMIA, impl = CLASSES_DEMO.map(function (c) { return window.taxItem(c.item).classe; });
    var cats = Array.from(new Set(T.map(function (t) { return t.categoria; })));
    var classes = Array.from(new Set(T.map(function (t) { return t.classe; })));
    var fc = q.cat || '', ft = q.q || '';
    var lista = T.filter(function (t) { return (!fc || t.categoria === fc) && (!ft || (t.situacao + ' ' + t.acao + ' ' + t.classe + ' ' + t.item).toLowerCase().indexOf(ft.toLowerCase()) >= 0); });
    var osl = S.os.map(function (o) { return '<tr><td>' + o.id + '</td><td>' + esc(o.classe) + '</td><td>' + o.etapa + '</td><td>' + o.prazo + ' dias</td><td>' + (o.etapa !== 'homologada' ? '<button class="sec" data-o="' + o.id + '">Avançar etapa</button>' : '<span class="tag t-ok">remunerável</span>') + '</td></tr>'; }).join('');
    return {
      html: '<h1>Taxonomia operacional (ETP, Anexo II)</h1><p class="sub">' + T.length + ' situações não conformes em ' + classes.length + ' classes e ' + cats.length + ' categorias. A “classe” é a unidade de implantação e de remuneração (TR 5.5.21–5.5.22).</p>' +
        '<div class="grid g3"><div class="card kpi"><b>' + T.length + '</b><span>situações e ações</span></div><div class="card kpi"><b>' + classes.length + '</b><span>classes</span></div><div class="card kpi ok"><b>' + impl.length + '</b><span>classes implantadas neste protótipo (POC exige ≥ 5)</span></div></div>' +
        '<div class="card"><div class="mini"><label>Categoria<select id="fc"><option value="">Todas</option>' + opt(cats, fc) + '</select></label><label>Buscar<input id="ft" value="' + esc(ft) + '" style="width:260px"></label><span class="nota">' + lista.length + ' itens</span></div><div class="tw"><table><tr><th>Item</th><th>Categoria</th><th>Classe</th><th>Situação não conforme</th><th>Ação necessária</th><th></th></tr>' + lista.slice(0, 300).map(function (t) { return '<tr><td>' + t.item + '</td><td>' + esc(t.categoria) + '</td><td>' + esc(t.classe) + '</td><td>' + esc(t.situacao) + '</td><td>' + esc(t.acao) + '</td><td>' + (impl.indexOf(t.classe) >= 0 ? '<span class="tag t-ok">implantada</span>' : '') + '</td></tr>'; }).join('') + '</table></div></div>' +
        '<div class="card"><h2>Implantação de nova classe (ordem de serviço)</h2><p class="nota">Treinamento, validação e disponibilização do modelo com os mesmos requisitos de qualidade; remuneração só após homologação pela ARTESP. Novas situações em classes existentes não são nova classe (TR 5.5.22.1).</p><div class="mini"><label>Classe<select id="nc">' + opt(classes.filter(function (c) { return impl.indexOf(c) < 0; }), '') + '</select></label><label>Prazo de homologação (dias)<input id="np" type="number" value="45" style="width:90px"></label><button id="abre" ' + (APP.perfil().homologa ? '' : 'disabled') + '>Emitir ordem de serviço</button></div>' + (osl ? '<table><tr><th>OS</th><th>Classe</th><th>Etapa</th><th>Prazo</th><th></th></tr>' + osl + '</table>' : '') + '</div>',
      after: function (m) {
        function f() { location.hash = '#/taxonomia?cat=' + encodeURIComponent(m.querySelector('#fc').value) + '&q=' + encodeURIComponent(m.querySelector('#ft').value); }
        m.querySelector('#fc').onchange = f; m.querySelector('#ft').onchange = f;
        m.querySelector('#abre').onclick = function () { var c = m.querySelector('#nc').value; if (!c) return; var o = { id: 'OS-' + String(S.os.length + 1).padStart(3, '0'), classe: c, etapa: 'em treinamento', prazo: +m.querySelector('#np').value }; S.os.push(o); APP.audit('Ordem de serviço de nova classe', o.id, c); APP.salvar(); APP.rota(); };
        m.querySelectorAll('[data-o]').forEach(function (b) { b.onclick = function () { var o = S.os.find(function (x) { return x.id === b.getAttribute('data-o'); }); o.etapa = o.etapa === 'em treinamento' ? 'em homologação' : 'homologada'; APP.audit('Etapa da OS', o.id, o.etapa); APP.salvar(); APP.rota(); }; });
      }
    };
  };

  // ---------- relatórios, painéis e exportações ----------
  var DIM = { classe: ['Classe', function (r) { return window.taxItem(r.classe).classe; }], categoria: ['Categoria', function (r) { return window.taxItem(r.classe).categoria; }], rodovia: ['Rodovia', function (r) { return r.rodovia; }], lote: ['Concessão (lote)', function (r) { return r.lote; }], status: ['Situação', function (r) { return r.status; }], vistoria: ['Tipo de vistoria', function (r) { return r.tipoVistoria; }], origem: ['Origem', function (r) { return r.origem.replace(/\s\d+.*/, ''); }], mes: ['Mês', function (r) { return new Date(r.ts).toISOString().slice(0, 7); }] };
  var MED = { n: ['Quantidade', function (a) { return a.length; }], pv: ['% validados', function (a) { return 100 * a.filter(function (r) { return r.status === 'validado'; }).length / a.length; }], conf: ['Confiança média da IA (%)', function (a) { return 100 * a.reduce(function (s, r) { return s + r.conf; }, 0) / a.length; }], rms: ['RMS médio (m)', function (a) { return a.reduce(function (s, r) { return s + r.rms; }, 0) / a.length; }], cap: ['Mediana do tempo de captura (s)', function (a) { return mediana(a.map(function (r) { return r.capturaS; })); }] };
  function calc(cfg) {
    var regs = APP.regs().filter(function (r) { return (!cfg.status || r.status === cfg.status) && (!cfg.lote || r.lote === cfg.lote); }), g = {};
    regs.forEach(function (r) { var k = DIM[cfg.dim][1](r); (g[k] = g[k] || []).push(r); });
    return Object.keys(g).sort().map(function (k) { return [k, MED[cfg.med][1](g[k]), g[k].length]; });
  }
  function bloco(cfg) {
    var d = calc(cfg), mx = Math.max.apply(null, d.map(function (x) { return x[1]; }).concat([0.0001]));
    return '<table>' + d.map(function (x) { return '<tr><td>' + esc(x[0]) + '</td><td style="width:45%"><div class="bar"><i style="width:' + (100 * x[1] / mx) + '%"></i></div></td><td>' + fmtN(x[1], cfg.med === 'n' ? 0 : 1) + '</td></tr>'; }).join('') + '</table>';
  }
  V.relatorios = function () {
    var S = APP.S; S.paineis = S.paineis || []; S.rotinas = S.rotinas || [];
    var cols = { registros: ['id', 'classe', 'rodovia', 'lote', 'sentido', 'km', 'lat', 'lon', 'rms', 'conf', 'status', 'tipoVistoria', 'ocorrencia', 'origem', 'ts'], ocorrencias: ['id', 'classe', 'rodovia', 'lote', 'sentido', 'km', 'situacao', 'aberta', 'encerrada'], ativos: ['id', 'classe', 'rodovia', 'lote', 'km', 'cadastrado', 'cadLat', 'cadLon', 'detLat', 'detLon'] };
    var cfg0 = { dim: 'classe', med: 'n', status: '', lote: '' };
    return {
      html: '<h1>Relatórios, painéis e exportações</h1><p class="sub">Geração e extração ilimitadas pela ARTESP, sem programação.</p>' +
        '<div class="card"><h2>Construtor de relatório</h2><div class="mini"><label>Agrupar por<select id="d">' + opt(Object.keys(DIM), 'classe', function (k) { return [k, DIM[k][0]]; }) + '</select></label><label>Medida<select id="md">' + opt(Object.keys(MED), 'n', function (k) { return [k, MED[k][0]]; }) + '</select></label><label>Situação<select id="s"><option value="">Todas</option><option>processado</option><option>validado</option><option>falso positivo</option><option>rejeitado</option></select></label><label>Concessão<select id="l"><option value="">Todas</option>' + opt(Array.from(new Set(RODOVIAS.map(function (r) { return r.lote; }))), '') + '</select></label><button id="gera">Gerar</button><button class="sec" id="csvr">Exportar CSV</button><button class="sec" id="salvap">Salvar como painel</button></div><div id="res" style="margin-top:8px"></div></div>' +
        '<div class="card"><h2>Meus painéis (filtros combinados salvos)</h2><div id="paineis" class="grid g2"></div></div>' +
        '<div class="grid g2"><div class="card"><h2>Exportação estruturada configurável</h2><div class="mini"><label>Conjunto<select id="eds">' + opt(Object.keys(cols), 'registros') + '</select></label><label>Formato<select id="efm"><option>CSV</option><option>JSON</option></select></label><label>De<input type="date" id="ede"></label><label>Até<input type="date" id="eat"></label></div><div id="ecols" class="mini"></div><div class="mini"><button id="exe">Executar exportação</button></div></div>' +
        '<div class="card"><h2>Agendamento de exportações</h2><div class="mini"><label>Nome<input id="an" placeholder="Ex.: Registros validados" style="width:170px"></label><label>Conjunto<select id="ac">' + opt(Object.keys(cols), 'registros') + '</select></label><label>Frequência<select id="af"><option>diária</option><option>semanal</option><option>mensal</option></select></label><label>Destino<input id="ad" placeholder="sftp://… ou e-mail" style="width:170px"></label><button id="agenda">Agendar</button></div><table><tr><th>Rotina</th><th>Conjunto</th><th>Frequência</th><th>Destino</th></tr>' + S.rotinas.map(function (r) { return '<tr><td>' + esc(r.nome) + '</td><td>' + r.conjunto + '</td><td>' + r.freq + '</td><td>' + esc(r.destino) + '</td></tr>'; }).join('') + '</table></div></div>' +
        '<div class="card"><h2>Pacote auditável de evidências</h2><p class="nota">Exporta metadados, marcações e resumo criptográfico (SHA-256) das imagens dos registros validados, para instrução processual e aferição independente.</p><button id="pac">Gerar pacote (até 40 registros)</button></div>',
      after: function (m) {
        var last = cfg0;
        function lerCfg() { return { dim: m.querySelector('#d').value, med: m.querySelector('#md').value, status: m.querySelector('#s').value, lote: m.querySelector('#l').value }; }
        function gerar() { last = lerCfg(); var d = calc(last); m.querySelector('#res').innerHTML = d.length ? bloco(last) : '<p class="nota">Sem dados para o filtro.</p>'; APP.audit('Relatório gerado', DIM[last.dim][0], MED[last.med][0]); }
        function paineis() { m.querySelector('#paineis').innerHTML = S.paineis.length ? S.paineis.map(function (p, i) { return '<div class="card"><b>' + esc(DIM[p.dim][0]) + ' · ' + esc(MED[p.med][0]) + '</b><span class="nota"> ' + esc(p.status || 'todas') + ' / ' + esc(p.lote || 'todas as concessões') + '</span> <button class="sec" data-rm="' + i + '">remover</button>' + bloco(p) + '</div>'; }).join('') : '<p class="nota">Nenhum painel salvo.</p>'; m.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { S.paineis.splice(+b.getAttribute('data-rm'), 1); APP.salvar(); paineis(); }; }); }
        m.querySelector('#gera').onclick = gerar; gerar(); paineis();
        m.querySelector('#csvr').onclick = function () { var c = last, d = calc(c); baixar('relatorio.csv', csv([[DIM[c.dim][0], MED[c.med][0], 'Registros']].concat(d)), 'text/csv;charset=utf-8'); };
        m.querySelector('#salvap').onclick = function () { S.paineis.push(Object.assign({}, last)); APP.audit('Painel salvo', DIM[last.dim][0]); APP.salvar(); paineis(); toast('Painel salvo para o seu perfil.'); };
        function colsUI() { var ds = m.querySelector('#eds').value; m.querySelector('#ecols').innerHTML = cols[ds].map(function (c) { return '<label><input type="checkbox" data-col="' + c + '" checked> ' + c + '</label>'; }).join(''); }
        m.querySelector('#eds').onchange = colsUI; colsUI();
        m.querySelector('#exe').onclick = function () {
          var ds = m.querySelector('#eds').value, sel = Array.from(m.querySelectorAll('[data-col]')).filter(function (c) { return c.checked; }).map(function (c) { return c.getAttribute('data-col'); }), de = m.querySelector('#ede').value, at = m.querySelector('#eat').value;
          var base = ds === 'registros' ? APP.regs() : ds === 'ocorrencias' ? S.ocorrencias.filter(APP.visivel) : S.ativos.filter(APP.visivel);
          var tk = { registros: 'ts', ocorrencias: 'aberta', ativos: null }[ds];
          base = base.filter(function (x) { if (!tk) return true; var t = x[tk]; return (!de || t >= new Date(de).getTime()) && (!at || t <= new Date(at).getTime() + 86400000); });
          var rows = base.map(function (x) { return sel.map(function (c) { var v = x[c]; return (c === 'ts' || c === 'aberta' || c === 'encerrada') && v ? new Date(v).toISOString() : v; }); });
          if (m.querySelector('#efm').value === 'CSV') baixar(ds + '.csv', csv([sel].concat(rows)), 'text/csv;charset=utf-8'); else baixar(ds + '.json', JSON.stringify(base.map(function (x) { var o = {}; sel.forEach(function (c) { o[c] = x[c]; }); return o; }), null, 2), 'application/json');
          APP.audit('Exportação estruturada', ds, rows.length + ' linhas, ' + sel.length + ' atributos'); toast(rows.length + ' linhas exportadas.');
        };
        m.querySelector('#agenda').onclick = function () { var n = m.querySelector('#an').value.trim(); if (!n) { toast('Informe um nome.'); return; } S.rotinas.push({ nome: n, conjunto: m.querySelector('#ac').value, freq: m.querySelector('#af').value, destino: m.querySelector('#ad').value }); APP.audit('Exportação agendada', n); APP.salvar(); APP.rota(); };
        m.querySelector('#pac').onclick = function () {
          var lista = APP.regs().filter(function (r) { return r.status === 'validado'; }).slice(0, 40), man = [], i = 0; toast('Calculando resumos criptográficos…');
          (function prox() { if (i >= lista.length) { baixar('pacote_evidencias.json', JSON.stringify({ gerado_em: new Date().toISOString(), perfil: S.perfil, algoritmo: 'SHA-256', observacao: 'Resumos calculados sobre a imagem original renderizada pelo protótipo (1280x720, PNG).', registros: man }, null, 2), 'application/json'); APP.audit('Pacote de evidências', '', man.length + ' registros'); toast('Pacote com ' + man.length + ' registros.'); return; } var r = lista[i++], c = IMG.nova(1280, 720); IMG.cena(c, r, {}); IMG.sha256(c).then(function (h) { man.push({ id: r.id, classe: r.classe, rodovia: r.rodovia, km: r.km, sentido: r.sentido, epsg: 4674, lat: r.lat, lon: r.lon, rms_m: r.rms, capturado_em: new Date(r.ts).toISOString(), origem: r.origem, bbox: r.bbox, sha256_imagem_original: h, historico: r.historico.map(function (x) { return { ts: new Date(x.ts).toISOString(), quem: x.quem, acao: x.acao }; }) }); prox(); }); })();
        };
      }
    };
  };

  // ---------- registro manual ----------
  V['registro-manual'] = function () {
    var S = APP.S, perm = APP.perfil().acoes;
    return {
      html: '<h1>Registro manual de imagens e vídeos</h1><p class="sub">Registros de celulares, tablets, notebooks, câmeras portáteis e drones seguem o mesmo fluxo de validação, gestão e disponibilização, com origem identificada (TR 5.5.3).</p>' +
        '<div class="card ' + (perm ? '' : 'ro') + '"><div class="mini"><label>Origem<select id="o">' + opt(['Celular', 'Tablet', 'Notebook', 'Câmera portátil', 'Drone']) + '</select></label><label>Arquivo (imagem ou vídeo)<input type="file" id="f" accept="image/*,video/*"></label><label>Classe<select id="c">' + opt(CLASSES_DEMO, '', function (c) { return [c.item, classeNome(c.item).slice(0, 70)]; }) + '</select></label></div><div class="mini"><label>Rodovia<select id="r">' + opt(RODOVIAS, '', function (r) { return [r.cod, r.cod + ' (' + r.lote + ')']; }) + '</select></label><label>km<input id="k" type="number" step="0.1" value="12.5" style="width:90px"></label><label>Sentido<select id="s">' + opt(['Crescente', 'Decrescente']) + '</select></label><label>Latitude<input id="la" style="width:110px"></label><label>Longitude<input id="lo" style="width:110px"></label><button class="sec" id="gps">Usar localização do dispositivo</button></div><label style="display:block">Observações<textarea id="ob"></textarea></label><button id="env">Enviar para validação</button><div id="out"></div></div>',
      after: function (m) {
        m.querySelector('#gps').onclick = function () { if (!navigator.geolocation) { toast('Localização indisponível neste navegador.'); return; } navigator.geolocation.getCurrentPosition(function (p) { m.querySelector('#la').value = p.coords.latitude.toFixed(6); m.querySelector('#lo').value = p.coords.longitude.toFixed(6); }, function () { toast('Não foi possível obter a localização.'); }); };
        m.querySelector('#env').onclick = function () {
          var rod = RODOVIAS.find(function (r) { return r.cod === m.querySelector('#r').value; }), km = +m.querySelector('#k').value, p = posicaoNaRodovia(rod, km), cls = CLASSES_DEMO.find(function (c) { return c.item === m.querySelector('#c').value; });
          var la = parseFloat(m.querySelector('#la').value), lo = parseFloat(m.querySelector('#lo').value), r = RNG(Date.now() % 1e9);
          var b0 = { pavimento: [0.38, 0.62, 0.18, 0.12], vegetacao: [0.66, 0.40, 0.26, 0.30], pichacao: [0.06, 0.28, 0.28, 0.22], vedo: [0.60, 0.46, 0.34, 0.16], drenagem: [0.70, 0.64, 0.24, 0.12], residuos: [0.20, 0.66, 0.14, 0.10] }[cls.grupo];
          var n = { id: 'R' + String(S.registros.length + 1).padStart(4, '0'), seed: Math.floor(r() * 1e9), rodovia: rod.cod, lote: rod.lote, sentido: m.querySelector('#s').value, km: km, lat: isNaN(la) ? p[0] : la, lon: isNaN(lo) ? p[1] : lo, rms: isNaN(la) ? 3.8 : 6.5, classe: cls.item, grupo: cls.grupo, conf: 0, bbox: { x: b0[0], y: b0[1], w: b0[2], h: b0[3] }, ts: Date.now(), origem: m.querySelector('#o').value + ' (manual)', manual: true, estado: 'presente', status: 'processado', capturaS: 0, imagemS: 0, sensivel: { placa: false, rosto: false }, historico: [{ ts: Date.now(), quem: 'usuário autorizado', acao: 'Registro manual criado', det: m.querySelector('#f').value ? m.querySelector('#f').files[0].name : 'sem arquivo' }], notas: m.querySelector('#ob').value };
          S.registros.push(n); var res = associar(n); APP.audit('Registro manual', n.id, n.origem + ' → ' + res.decisao); APP.salvar();
          m.querySelector('#out').innerHTML = '<div class="aviso"><b>' + n.id + '</b> criado com origem <b>' + esc(n.origem) + '</b> e entrou no mesmo fluxo de validação. Decisão da associação: <b>' + res.decisao + '</b> (' + res.ocorrencia + ').<ul>' + res.log.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul><a class="btn" href="#/validacao?id=' + n.id + '">Abrir para validação</a></div>';
        };
      }
    };
  };

  // ---------- roteirização ----------
  V.roteirizacao = function (q) {
    var kits = +q.kits || 20, dias = +q.dias || 6, h = +q.h || 6, v = +q.v || 70, mal = +q.mal || 12650, vr = +q.vr || 2;
    var demanda = mal * 2 * vr, capKit = dias * h * v, cap = kits * capKit, cob = 100 * cap / demanda;
    var lotes = window.LOTES, seg = demanda / lotes.length, plano = [], dia = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    for (var k = 0; k < kits; k++) { var linha = []; for (var d = 0; d < Math.min(dias, 6); d++) { linha.push(lotes[(k * 3 + d) % lotes.length]); } plano.push(linha); }
    return {
      html: '<h1>Roteirização de vistorias</h1><p class="sub">Dimensionamento e programação semanal de levantamentos com os kits instalados em veículos da ARTESP (versão simplificada).</p>' +
        '<div class="card"><form id="fr" class="mini"><label>Malha (km)<input name="mal" value="' + mal + '" style="width:90px"></label><label>Varreduras/sem.<input name="vr" value="' + vr + '" style="width:70px"></label><label>Kits<input name="kits" value="' + kits + '" style="width:60px"></label><label>Dias/sem.<input name="dias" value="' + dias + '" style="width:60px"></label><label>Horas/dia<input name="h" value="' + h + '" style="width:60px"></label><label>km/h médio<input name="v" value="' + v + '" style="width:60px"></label><button>Recalcular</button></form></div>' +
        '<div class="grid g4"><div class="card kpi"><b>' + fmtN(demanda) + '</b><span>km por semana (demanda)</span></div><div class="card kpi"><b>' + fmtN(capKit) + '</b><span>km por kit e semana</span></div><div class="card kpi"><b>' + fmtN(demanda / capKit, 2) + '</b><span>kits necessários</span></div><div class="card kpi ' + (cob >= 100 ? 'ok' : 'ruim') + '"><b>' + fmtN(cob, 1) + '%</b><span>cobertura com ' + kits + ' kits</span></div></div>' +
        (cob < 100 ? '<div class="aviso">Com estes parâmetros a capacidade fica abaixo da demanda. No TR, 20 kits dão ≈ 50.400 km/semana (99,6%); a margem operacional do item 5.7.8 absorve a diferença.</div>' : '') +
        '<div class="card"><h2>Programação semanal (exemplo)</h2><div class="tw"><table><tr><th>Kit</th>' + dia.slice(0, Math.min(dias, 6)).map(function (d) { return '<th>' + d + '</th>'; }).join('') + '<th>km/sem</th></tr>' + plano.map(function (l, i) { return '<tr><td>Kit ' + String(i + 1).padStart(2, '0') + '</td>' + l.map(function (x) { return '<td>' + x + '</td>'; }).join('') + '<td>' + fmtN(capKit) + '</td></tr>'; }).join('') + '</table></div><p class="nota">Cada célula é um trecho de concessão (lote) de ≈ ' + fmtN(seg) + ' km/semana distribuído em rodízio; a programação real é definida pela ARTESP.</p><button class="sec" id="csvp">Exportar programação (CSV)</button></div>',
      after: function (m) {
        m.querySelector('#fr').onsubmit = function (e) { e.preventDefault(); var f = new FormData(e.target), p = []; f.forEach(function (v2, k2) { p.push(k2 + '=' + encodeURIComponent(v2)); }); location.hash = '#/roteirizacao?' + p.join('&'); };
        m.querySelector('#csvp').onclick = function () { baixar('programacao_semanal.csv', csv([['Kit'].concat(dia.slice(0, Math.min(dias, 6)))].concat(plano.map(function (l, i) { return ['Kit ' + (i + 1)].concat(l); }))), 'text/csv;charset=utf-8'); };
      }
    };
  };
})();
