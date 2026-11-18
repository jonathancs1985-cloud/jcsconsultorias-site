/* Nucleo do protótipo: estado, auditoria, perfis, utilitários e roteador. */
(function () {
  var KEY = 'artesp_proto_v1', S, listeners = [];
  function carregar() { try { var x = JSON.parse(localStorage.getItem(KEY)); if (x && x.registros && x.ocorrencias) return x; } catch (e) { } return window.gerarDados(); }
  window.APP = {
    get S() { return S; },
    iniciar: function () { S = carregar(); window.gerarDados(); /* garante posicaoNaRodovia */ },
    salvar: function () { try { localStorage.setItem(KEY, JSON.stringify(S, function (k, v) { return k === 'img' ? undefined : v; })); } catch (e) { } },
    reiniciar: function () { localStorage.removeItem(KEY); S = window.gerarDados(); APP.salvar(); APP.rota(); },
    PERFIS: {
      'ARTESP': { lotes: null, anon: false, acoes: true, homologa: true, desc: 'Visão integral, imagens originais, homologações.' },
      'EAF (Empresa de Apoio à Fiscalização)': { lotes: ['L01', 'L06'], anon: true, acoes: true, homologa: false, desc: 'Concessões atribuídas (L01 e L06), imagens anonimizadas, sem homologações.' },
      'Concessionária (L01)': { lotes: ['L01'], anon: true, acoes: false, homologa: false, desc: 'Apenas a própria concessão (L01), imagens anonimizadas, somente consulta.' }
    },
    perfil: function () { return APP.PERFIS[S.perfil] || APP.PERFIS['ARTESP']; },
    visivel: function (x) { var p = APP.perfil(); return !p.lotes || p.lotes.indexOf(x.lote) >= 0; },
    regs: function () { return S.registros.filter(APP.visivel); },
    audit: function (acao, alvo, det) { S.audit.unshift({ ts: Date.now(), usuario: S.perfil === 'ARTESP' ? 'fiscal.artesp' : S.perfil.split(' ')[0].toLowerCase(), perfil: S.perfil, acao: acao, alvo: alvo || '', det: det || '' }); S.audit = S.audit.slice(0, 500); APP.salvar(); },
    rota: function () { route(); }
  };

  window.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  window.fmtD = function (t) { return new Date(t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); };
  window.fmtN = function (n, d) { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d || 0, maximumFractionDigits: d == null ? 0 : d }); };
  window.mediana = function (a) { if (!a.length) return 0; var b = a.slice().sort(function (x, y) { return x - y; }), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  window.haversine = function (a1, o1, a2, o2) { var R = 6371000, r = Math.PI / 180, dA = (a2 - a1) * r, dO = (o2 - o1) * r, x = Math.sin(dA / 2) * Math.sin(dA / 2) + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(dO / 2) * Math.sin(dO / 2); return 2 * R * Math.asin(Math.sqrt(x)); };
  window.baixar = function (nome, texto, tipo) { var b = new Blob([texto], { type: tipo || 'text/plain;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  window.csv = function (linhas) { return '\ufeff' + linhas.map(function (l) { return l.map(function (c) { c = c == null ? '' : String(c); return /[";\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(';'); }).join('\n'); };
  window.opt = function (arr, sel, fn) { return arr.map(function (v) { var k = fn ? fn(v) : [v, v]; return '<option value="' + esc(k[0]) + '"' + (String(k[0]) === String(sel) ? ' selected' : '') + '>' + esc(k[1]) + '</option>'; }).join(''); };
  window.classeNome = function (item) { var t = window.taxItem(item); return t.item + ' · ' + t.situacao; };
  window.toast = function (msg) { var t = document.getElementById('toast'); t.textContent = msg; t.className = 'on'; clearTimeout(window._tt); window._tt = setTimeout(function () { t.className = ''; }, 3200); };

  // Haversine entre registro e ocorrencia, associacao de retorno e deteccao de duplicidade.
  window.associar = function (rec, ctx) {
    ctx = ctx || {};
    var S = APP.S, janela = S.params.janelaRetornoM, log = [], cand = null, dmin = 1e9;
    S.ocorrencias.forEach(function (o) {
      if (o.situacao !== 'aberta' || o.rodovia !== rec.rodovia || o.sentido !== rec.sentido) return;
      var reg0 = S.registros.find(function (x) { return x.id === o.registros[0]; });
      if (!reg0 || reg0.grupo !== rec.grupo) return;
      var d = haversine(o.lat, o.lon, rec.lat, rec.lon); if (d <= janela && d < dmin) { dmin = d; cand = o; }
    });
    if (!cand) { var oid = 'O' + String(S.ocorrencias.length + 1).padStart(4, '0'); rec.ocorrencia = oid; rec.tipoVistoria = 'constatação'; S.ocorrencias.push({ id: oid, classe: rec.classe, rodovia: rec.rodovia, lote: rec.lote, sentido: rec.sentido, km: rec.km, lat: rec.lat, lon: rec.lon, aberta: rec.ts, situacao: 'aberta', registros: [rec.id], prazoDias: 15 }); log.push('Nenhuma ocorrência aberta da mesma classe, rodovia e sentido a ≤ ' + janela + ' m → nova ocorrência ' + oid + ' (constatação).'); return { decisao: 'nova', ocorrencia: oid, log: log }; }
    var ult = S.registros.find(function (x) { return x.id === cand.registros[cand.registros.length - 1]; });
    var horas = (rec.ts - ult.ts) / 3600000, mesmaOrigem = ult.origem === rec.origem;
    log.push('Ocorrência ' + cand.id + ' aberta, mesma classe, rodovia e sentido, a ' + fmtN(dmin, 1) + ' m (limite ' + janela + ' m).');
    log.push('Último registro há ' + fmtN(horas, 1) + ' h, origem ' + (mesmaOrigem ? 'igual' : 'diferente') + '.');
    if (horas < 24 && !mesmaOrigem && !ctx.forcarRetorno) { S.duplicidades = S.duplicidades || []; S.duplicidades.push({ id: 'D' + (S.duplicidades.length + 1), registro: rec.id, ocorrencia: cand.id, dist: Math.round(dmin * 10) / 10, horas: Math.round(horas * 10) / 10, aberto: true }); rec.ocorrencia = cand.id; rec.tipoVistoria = 'possível duplicidade'; log.push('Levantamento distinto em menos de 24 h → sinalizado como POSSÍVEL DUPLICIDADE para análise e consolidação (nenhuma nova ocorrência criada).'); return { decisao: 'duplicidade', ocorrencia: cand.id, log: log }; }
    rec.ocorrencia = cand.id; rec.tipoVistoria = 'retorno'; cand.registros.push(rec.id); log.push('Passagem posterior → associado como RETORNO da ocorrência ' + cand.id + ' (sem criar nova ocorrência).');
    if (rec.estado === 'regularizado') { cand.situacao = 'encerrada'; cand.encerrada = rec.ts; log.push('Imagem de retorno sem a situação não conforme → ocorrência encerrada após regularização.'); }
    return { decisao: 'retorno', ocorrencia: cand.id, log: log };
  };

  var NAV = [
    ['Visão geral', [['painel', 'Painel'], ['mapa-geral', 'Mapa geral da malha'], ['mapa', 'Mapa dos registros']]],
    ['Dados reais', [['dados-malha', 'Malha (trechos)'], ['dados-ativos', 'Ativos cadastrados'], ['dados-ronda', 'Ronda de coleta']]],
    ['Fiscalização', [['validacao', 'Pós-processamento'], ['ocorrencias', 'Ocorrências'], ['ativos', 'Validação de ativos'], ['registro-manual', 'Registro manual'], ['roteirizacao', 'Roteirização']]],
    ['Gestão', [['taxonomia', 'Taxonomia (Anexo II)'], ['relatorios', 'Relatórios e painéis'], ['disponibilidade', 'Disponibilidade e vídeos'], ['integracoes', 'Perfis, APIs e auditoria']]]
  ];
  window.VIEWS = {};

  function parseHash() { var h = location.hash.replace(/^#\/?/, '') || 'painel', i = h.indexOf('?'), nome = i < 0 ? h : h.slice(0, i), q = {}; if (i >= 0) h.slice(i + 1).split('&').forEach(function (p) { var a = p.split('='); q[a[0]] = decodeURIComponent(a[1] || ''); }); return { nome: nome, q: q }; }
  function shell() {
    var h = parseHash(), nav = NAV.map(function (g) { return '<div class="ng">' + g[0] + '</div>' + g[1].map(function (i) { return '<a href="#/' + i[0] + '" class="' + (i[0] === h.nome ? 'on' : '') + '">' + i[1] + '</a>'; }).join(''); }).join('');
    document.getElementById('nav').innerHTML = nav;
    document.getElementById('perfil').innerHTML = opt(Object.keys(APP.PERFIS), APP.S.perfil);
    document.getElementById('perfil-desc').textContent = APP.perfil().desc;
  }
  function route() {
    var h = parseHash(), v = window.VIEWS[h.nome] || window.VIEWS.painel;
    shell();
    var main = document.getElementById('main'); main.scrollTop = 0;
    var r = v(h.q); if (typeof r === 'string') main.innerHTML = r; else { main.innerHTML = r.html; if (r.after) r.after(main); }
  }
  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', function () {
    APP.iniciar();
    document.getElementById('perfil').addEventListener('change', function (e) { APP.S.perfil = e.target.value; APP.audit('Troca de perfil', e.target.value); route(); });
    document.getElementById('reset').addEventListener('click', function () { if (confirm('Restaurar os dados simulados iniciais?')) APP.reiniciar(); });
    route();
  });
})();
