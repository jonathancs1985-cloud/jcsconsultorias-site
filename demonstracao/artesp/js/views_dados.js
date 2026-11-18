/* Telas de dados reais (malha, ativos, ronda de coleta) para o site público. */
(function () {
  var V = window.VIEWS;
  if (!V || !window.PBI) return;
  var P = window.PBI, TAM = 100;

  function csv(nome, cab, linhas) {
    var esc2 = function (v) { var s = String(v == null ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var txt = '\ufeff' + [cab].concat(linhas).map(function (l) { return l.map(esc2).join(';'); }).join('\r\n');
    var url = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }
  function opcoes(lista, todos) { return '<option value="">' + todos + '</option>' + lista.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join(''); }
  function opcoesLote() { return '<option value="">Todos</option>' + Object.keys(P.lotes).map(function (k) { return '<option value="' + k + '">' + String(k).padStart(2, '0') + ' · ' + esc(P.lotes[k]) + '</option>'; }).join(''); }
  var CSS = '<style>.dd .f{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px}.dd .f label{display:flex;flex-direction:column;font-size:12px;gap:2px}.dd .f select,.dd .f input{padding:5px 8px;border:1px solid #c5d0e3;border-radius:6px;min-width:150px}.dd .sc{max-height:560px;overflow:auto;border:1px solid #e1e8f3;border-radius:8px}.dd table{width:100%;border-collapse:collapse;font-size:12.5px}.dd th{background:#eef3fa;text-align:left;padding:5px 7px;position:sticky;top:0}.dd td{padding:4px 7px;border-bottom:1px solid #eef1f6}.dd .r{text-align:right}.dd .pg{display:flex;gap:8px;align-items:center;margin-top:8px;font-size:12.5px}</style>';

  function tabela(cab, linhas, dirs) {
    return '<div class="sc"><table><thead><tr>' + cab.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      linhas.map(function (l) { return '<tr>' + l.map(function (v, j) { return '<td class="' + (dirs && dirs.indexOf(j) >= 0 ? 'r' : '') + '">' + esc(v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }

  function paginada(id, getLinhas, cab, dirs, arquivo, extra) {
    return function (root) {
      var pag = 1, lin = [];
      function aplicar() {
        lin = getLinhas(root); pag = Math.min(pag, Math.max(1, Math.ceil(lin.length / TAM)));
        var n = Math.max(1, Math.ceil(lin.length / TAM));
        root.querySelector('#dd-tab').innerHTML = tabela(cab, lin.slice((pag - 1) * TAM, pag * TAM), dirs);
        root.querySelector('#dd-pg').textContent = 'Página ' + pag + ' de ' + fmtN(n) + ' · ' + fmtN(lin.length) + ' registros';
        root.querySelector('#dd-ant').disabled = pag <= 1; root.querySelector('#dd-prox').disabled = pag >= n;
        if (extra) root.querySelector('#dd-resumo').textContent = extra(lin);
      }
      root.querySelectorAll('.dd .f select,.dd .f input').forEach(function (el) { el.addEventListener('input', function () { pag = 1; aplicar(); }); });
      root.querySelector('#dd-ant').onclick = function () { pag--; aplicar(); };
      root.querySelector('#dd-prox').onclick = function () { pag++; aplicar(); };
      root.querySelector('#dd-csv').onclick = function () { csv(arquivo, cab, lin); };
      aplicar();
    };
  }

  V['dados-malha'] = function () {
    var D = P.dic_malha;
    var cab = ['Lote', 'Concessionária', 'Rodovia', 'Tipo de pista', 'Sentido', 'Denominação', 'Município', 'Km inicial', 'Km final', 'Extensão (km)', 'Situação', 'Região administrativa'];
    var html = CSS + '<h1>Malha rodoviária — trechos</h1><p class="sub">Trechos sob fiscalização da ARTESP (Portal de Dados Abertos, malha_rodoviaria_sp.xlsx). Filtre e exporte em CSV para o Power BI.</p><div class="card dd">' +
      '<div class="f"><label>Lote<select id="f-lote">' + opcoesLote() + '</select></label><label>Tipo de pista<select id="f-tipo">' + opcoes(D.TIPO_PISTA, 'Todos') + '</select></label><label>Busca (rodovia, denominação, município)<input id="f-busca" placeholder="ex.: SP 330"></label><button id="dd-csv">Exportar CSV (Power BI)</button></div>' +
      '<p class="nota" id="dd-resumo"></p><div id="dd-tab"></div><div class="pg"><button class="sec" id="dd-ant">Anterior</button><span id="dd-pg"></span><button class="sec" id="dd-prox">Próxima</button></div></div>';
    return {
      html: html, after: function (root) {
        function get(r) {
          var l = r.querySelector('#f-lote').value, t = r.querySelector('#f-tipo').value, b = r.querySelector('#f-busca').value.trim().toLowerCase();
          return P.malha.filter(function (x) { return (!l || x[0] === Number(l)) && (!t || D.TIPO_PISTA[x[2]] === t) && (!b || (D.RODOVIA[x[1]] + ' ' + D.DENOMINACAO[x[4]] + ' ' + D.MUNICIPIO[x[5]]).toLowerCase().indexOf(b) >= 0); })
            .map(function (x) { return [x[0], P.lotes[x[0]] || '', D.RODOVIA[x[1]], D.TIPO_PISTA[x[2]], D.SENTIDO[x[3]], D.DENOMINACAO[x[4]], D.MUNICIPIO[x[5]], x[6], x[7], x[8], D.PISTA_ATUAL[x[9]], D.REG_ADM_SP[x[10]]]; });
        }
        paginada('m', get, cab, [7, 8, 9], 'artesp_malha.csv', function (lin) { return fmtN(lin.length) + ' trechos · ' + fmtN(lin.reduce(function (a, r) { return a + r[9]; }, 0), 1) + ' km'; })(root);
      }
    };
  };

  V['dados-ativos'] = function () {
    var D = P.dic_ativos;
    var cab = ['Lote', 'Concessionária', 'Disciplina', 'Grupo', 'Componente', 'Rodovia', 'Localização', 'Município', 'Status', 'Latitude', 'Longitude', 'Cód. registro ARTESP'];
    var html = CSS + '<h1>Ativos cadastrados</h1><p class="sub">Ativos do cadastro público da ARTESP (Recursos Operacionais e Passarelas), por lote e disciplina. O cadastro não traz pavimento, drenagem nem sinalização horizontal/vertical; essas disciplinas vêm da análise das imagens.</p><div class="card dd">' +
      '<div class="f"><label>Lote<select id="f-lote">' + opcoesLote() + '</select></label><label>Disciplina<select id="f-disc">' + opcoes(D.disciplina, 'Todas') + '</select></label><label>Status<select id="f-status">' + opcoes(D.status, 'Todos') + '</select></label><label>Busca (componente, rodovia, município)<input id="f-busca" placeholder="ex.: CFTV"></label><button id="dd-csv">Exportar CSV (Power BI)</button></div>' +
      '<p class="nota" id="dd-resumo"></p><div id="dd-tab"></div><div class="pg"><button class="sec" id="dd-ant">Anterior</button><span id="dd-pg"></span><button class="sec" id="dd-prox">Próxima</button></div></div>';
    return {
      html: html, after: function (root) {
        function get(r) {
          var l = r.querySelector('#f-lote').value, d = r.querySelector('#f-disc').value, s = r.querySelector('#f-status').value, b = r.querySelector('#f-busca').value.trim().toLowerCase();
          return P.ativos.filter(function (x) { return (!l || x[0] === Number(l)) && (!d || D.disciplina[x[1]] === d) && (!s || D.status[x[6]] === s) && (!b || (D.componente[x[3]] + ' ' + D.rodovia[x[4]] + ' ' + D.municipio[x[7]] + ' ' + x[5]).toLowerCase().indexOf(b) >= 0); })
            .map(function (x) { return [x[0], P.lotes[x[0]] || '', D.disciplina[x[1]], D.grupo[x[2]], D.componente[x[3]], D.rodovia[x[4]], x[5], D.municipio[x[7]], D.status[x[6]], x[8] == null ? '' : x[8], x[9] == null ? '' : x[9], String(x[10] || '').replace(/\.0$/, '')]; });
        }
        paginada('a', get, cab, [], 'artesp_ativos.csv', function (lin) { var o = {}; lin.forEach(function (r) { o[r[2]] = (o[r[2]] || 0) + 1; }); return fmtN(lin.length) + ' ativos · ' + Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }).map(function (k) { return k + ': ' + fmtN(o[k]); }).join(' · '); })(root);
      }
    };
  };

  V['dados-ronda'] = function () {
    var R = P.rondas;
    var html = CSS + '<h1>Ronda de coleta</h1><p class="sub">Coleta semanal dos cartões de memória nas sedes/CCO das 23 concessionárias, com distâncias por estrada (OSRM/OpenStreetMap).</p>' +
      '<div class="card dd"><h2>Paradas das rondas (' + fmtN(P.resumo_rotas.km_total) + ' km por semana)</h2>' + tabela(['Ronda', 'Ordem', 'Lote', 'Concessionária', 'Latitude', 'Longitude', 'Km da ronda', 'Horas de direção', 'Dias', 'Pernoites'], R, [6, 7, 8, 9]) + '</div>';
    return html;
  };
})();
