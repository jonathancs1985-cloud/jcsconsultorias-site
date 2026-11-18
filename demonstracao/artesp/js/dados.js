/* Dados de referencia e geracao deterministica de dados simulados (nada aqui e dado real da ARTESP). */
(function () {
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  window.RNG = rng;

  // Rodovias ficticias (esquematicas), uma por lote de demonstracao.
  window.RODOVIAS = [
    { cod: 'SP-A01', nome: 'Rodovia Demo A', lote: 'L01', km: 118, pts: [[-23.62, -46.95], [-23.55, -47.10], [-23.47, -47.22], [-23.40, -47.40]] },
    { cod: 'SP-B06', nome: 'Rodovia Demo B', lote: 'L06', km: 96, pts: [[-23.30, -46.80], [-23.22, -46.95], [-23.20, -47.12], [-23.10, -47.30]] },
    { cod: 'SP-C07', nome: 'Rodovia Demo C', lote: 'L07', km: 74, pts: [[-23.85, -46.70], [-23.78, -46.88], [-23.70, -47.00], [-23.66, -47.18]] },
    { cod: 'SP-D11', nome: 'Rodovia Demo D', lote: 'L11', km: 132, pts: [[-22.95, -47.00], [-22.90, -47.20], [-22.80, -47.35], [-22.72, -47.52]] }
  ];

  // Classes de demonstracao (subconjunto do Anexo II; o minimo da POC e 5 classes).
  window.CLASSES_DEMO = [
    { item: '1.1.1', grupo: 'pavimento', cor: '#c0392b' },
    { item: '2.1.1', grupo: 'vegetacao', cor: '#27ae60' },
    { item: '2.5.1', grupo: 'pichacao', cor: '#8e44ad' },
    { item: '2.7.1', grupo: 'vedo', cor: '#d35400' },
    { item: '3.1.4', grupo: 'drenagem', cor: '#2980b9' },
    { item: '2.1.3', grupo: 'residuos', cor: '#16a085' }
  ];
  window.taxItem = function (item) { return (window.TAXONOMIA || []).find(function (t) { return t.item === item; }) || { item: item, categoria: '', classe: '', situacao: item, acao: '' }; };

  window.CLASSES_ATIVOS = ['Placa de sinalização vertical', 'Defensa metálica', 'Poste de iluminação', 'Bueiro / passagem hidráulica', 'Passarela', 'Dispositivo de drenagem superficial'];

  // Requisitos minimos do TR (item 4.16) e onde o prototipo os demonstra.
  window.REQ_TR = [
    { id: '4.16.1', req: 'Imagens com resolução mínima 4K (2160p), original preservada sem compressão que comprometa a identificação', exig: '≥ 3840×2160', tela: '#/validacao', demo: 'parcial', nota: 'O protótipo renderiza e preserva a imagem em 3840×2160; a captura real depende do equipamento (POC).' },
    { id: '4.16.2', req: 'Coordenadas em SIRGAS2000 (EPSG:4674), graus decimais, ≥ 6 casas', exig: '6 casas decimais', tela: '#/validacao', demo: 'sim', nota: 'Todos os registros exibem EPSG:4674 com 6 casas.' },
    { id: '4.16.3', req: 'Acurácia posicional horizontal ≤ 5 m (RMS) e indicador de qualidade da posição por registro', exig: 'RMS ≤ 5 m', tela: '#/painel', demo: 'parcial', nota: 'Indicador de qualidade por registro e RMS agregado; a acurácia real é aferida na POC com pontos de controle.' },
    { id: '4.16.4', req: 'Acurácia de detecção ≥ 85% por classe, sobre registros dos equipamentos da contratada', exig: '≥ 85% por classe', tela: '#/validacao', demo: 'parcial', nota: 'A acurácia real por classe é medida na POC.' },
    { id: '4.16.5', req: 'Disponibilidade mínima de 98% mensal (24×7), web e aplicação móvel', exig: '≥ 98% / mês', tela: '#/disponibilidade', demo: 'sim', nota: 'Monitor com relatório extraível por período.' },
    { id: '4.16.6', req: 'Acesso restrito por perfis e permissões definidos pela ARTESP', exig: 'RBAC', tela: '#/integracoes', demo: 'sim', nota: 'Perfis ARTESP, EAF e Concessionária com visibilidade por concessão.' },
    { id: '4.16.7', req: 'Registros de auditoria dos acessos e operações', exig: 'Trilha de auditoria', tela: '#/integracoes', demo: 'sim', nota: 'Toda ação do protótipo gera registro de auditoria.' },
    { id: '4.16.8', req: 'Rotinas de backup (disponibilidade e integridade dos dados)', exig: 'Backup contínuo', tela: '#/disponibilidade', demo: 'parcial', nota: 'Painel exibe rotina e último backup simulados; implementação é de infraestrutura.' },
    { id: '4.16.9', req: 'Imagem original (sem marcações) e imagem anotada, com coordenadas estruturadas das marcações', exig: 'Original + anotada + JSON', tela: '#/validacao', demo: 'sim', nota: 'Visualização simultânea e exportação do JSON das marcações.' },
    { id: '4.16.10', req: 'Monitoramento da disponibilidade com registro auditável e relatórios extraíveis pela ARTESP', exig: 'Relatórios sob demanda', tela: '#/disponibilidade', demo: 'sim', nota: 'Extração CSV para qualquer período.' },
    { id: '4.16.11', req: 'Relatórios consolidados e painéis gerenciais, geração e extração ilimitadas pela ARTESP', exig: 'Ilimitado', tela: '#/relatorios', demo: 'sim', nota: 'Construtor de relatórios e painéis sem programação.' },
    { id: '4.16.12', req: 'Perfis diferenciados (ARTESP, EAF, Concessionárias), segregação por concessão e APIs documentadas', exig: 'RBAC + APIs', tela: '#/integracoes', demo: 'sim', nota: 'Catálogo de APIs com chamadas de teste.' },
    { id: '4.16.13', req: 'Anonimização automática de placas e rostos nas imagens compartilhadas; originais preservados', exig: 'Placas e rostos', tela: '#/validacao', demo: 'parcial', nota: 'Demonstrada com regiões simuladas; a detecção real de placas e rostos é componente de IA a comprovar.' },
    { id: '4.16.14', req: 'LGPD: ARTESP controladora, contratada operadora; vedado uso para outra finalidade', exig: 'Lei 13.709/2018', tela: '#/integracoes', demo: 'parcial', nota: 'Controles técnicos (perfis, anonimização, auditoria); a conformidade é contratual e organizacional.' },
    { id: '5.5.10', req: 'Vídeo integral do trecho disponível por no mínimo 45 dias, com preservação sob demanda', exig: '≥ 45 dias', tela: '#/disponibilidade', demo: 'sim', nota: 'Lista de vídeos com expiração em 45 dias e marcação de preservação.' },
    { id: '5.5.12', req: 'Distinguir constatação de retorno e evitar duplicidade de ocorrências pendentes', exig: 'Associação automática', tela: '#/ocorrencias', demo: 'sim', nota: 'Regra por classe, proximidade e sentido, com justificativa.' },
    { id: '5.5.13', req: 'Validação de ativos: identificar, comparar com o cadastro, apontar divergências; inventário inicial se não houver cadastro', exig: 'Todas as classes do cadastro', tela: '#/ativos', demo: 'parcial', nota: 'Fluxo demonstrado com seis classes; a detecção automática de todas as classes depende de IA a comprovar.' },
    { id: '5.5.14', req: 'Tolerância de posicionamento parametrizável pela ARTESP, por classe, maior que a acurácia exigida, com histórico', exig: 'Parâmetro > 5 m', tela: '#/ativos', demo: 'sim', nota: 'O protótipo bloqueia valores ≤ 5 m e guarda histórico.' },
    { id: '5.5.3', req: 'Registro manual de imagens e vídeos (celulares, tablets, drones) no mesmo fluxo, com origem identificada', exig: 'Mesmo fluxo', tela: '#/registro-manual', demo: 'sim', nota: 'Formulário de envio manual com origem e fluxo de validação.' }
  ];


  // Catalogo de APIs (demonstracao).
  window.API_CAT = [
    { m: 'GET', p: '/api/v1/registros', d: 'Lista registros processados (filtros: lote, classe, status, desde).', fn: 'registros' },
    { m: 'GET', p: '/api/v1/registros/{id}', d: 'Registro com marcações estruturadas, coordenadas (EPSG:4674) e qualidade da posição.', fn: 'registro' },
    { m: 'PATCH', p: '/api/v1/registros/{id}', d: 'Validar, rejeitar, reclassificar ou complementar (gera histórico).', fn: 'patch' },
    { m: 'GET', p: '/api/v1/ocorrencias/{id}/historico', d: 'Constatação e retornos vinculados à ocorrência.', fn: 'historico' },
    { m: 'GET', p: '/api/v1/ativos/divergencias', d: 'Ativos com divergência cadastral ou ainda não cadastrados.', fn: 'divergencias' },
    { m: 'POST', p: '/api/v1/integracoes/importacao', d: 'Importa dados de sistemas de terceiros (EAF, concessionárias).', fn: 'importacao' },
    { m: 'GET', p: '/api/v1/disponibilidade', d: 'Disponibilidade por componente e período.', fn: 'disp' },
    { m: 'GET', p: '/api/v1/exportacoes/estruturada', d: 'Exportação estruturada configurável (conjunto, atributos, período).', fn: 'exportacao' }
  ];

  window.COMPONENTES = ['Plataforma web', 'Aplicação móvel', 'API de integração', 'Processamento de imagens', 'Armazenamento de vídeos'];

  // Geracao do conjunto inicial de dados simulados.
  window.gerarDados = function () {
    var r = rng(20261015), now = Date.now(), DIA = 86400000, id = 0, occ = 0;
    var registros = [], ocorrencias = [];
    function pos(rod, km) {
      var t = Math.min(0.999, km / rod.km), n = rod.pts.length - 1, f = t * n, i = Math.floor(f), u = f - i;
      var a = rod.pts[i], b = rod.pts[i + 1];
      return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    }
    window.posicaoNaRodovia = pos;
    function bbox(grupo) {
      var m = { pavimento: [0.38, 0.62, 0.18, 0.12], vegetacao: [0.66, 0.40, 0.26, 0.30], pichacao: [0.06, 0.28, 0.28, 0.22], vedo: [0.60, 0.46, 0.34, 0.16], drenagem: [0.70, 0.64, 0.24, 0.12], residuos: [0.20, 0.66, 0.14, 0.10] }[grupo];
      var j = function () { return (r() - 0.5) * 0.04; };
      return { x: m[0] + j(), y: m[1] + j(), w: m[2], h: m[3] };
    }
    function novoRegistro(rod, km, cls, quando, tipo, ocId, estado, origem) {
      var p = pos(rod, km), rms = 1.2 + r() * 3.2;
      var reg = {
        id: 'R' + String(++id).padStart(4, '0'), seed: Math.floor(r() * 1e9), rodovia: rod.cod, lote: rod.lote, sentido: r() < 0.5 ? 'Crescente' : 'Decrescente',
        km: Math.round(km * 10) / 10, lat: p[0] + (r() - 0.5) * 0.0004, lon: p[1] + (r() - 0.5) * 0.0004, rms: Math.round(rms * 10) / 10,
        classe: cls.item, grupo: cls.grupo, conf: Math.round((0.72 + r() * 0.27) * 100) / 100, bbox: bbox(cls.grupo), ts: quando,
        origem: origem || ('Kit ' + String(1 + Math.floor(r() * 20)).padStart(2, '0') + ' (veicular)'), tipoVistoria: tipo, ocorrencia: ocId, estado: estado || 'presente',
        status: 'processado', capturaS: Math.round((2 + r() * 14 + (r() < 0.1 ? 20 : 0)) * 10) / 10, imagemS: Math.round((8 + r() * 40 + (r() < 0.08 ? 90 : 0)) * 10) / 10,
        sensivel: { placa: r() < 0.7, rosto: r() < 0.4 }, historico: [{ ts: quando, quem: 'Sistema (IA)', acao: 'Registro criado automaticamente', det: 'conf=' }], notas: ''
      };
      reg.historico[0].det += reg.conf;
      return reg;
    }
    for (var i = 0; i < 56; i++) {
      var rod = window.RODOVIAS[Math.floor(r() * 4)], km = 1 + r() * (rod.km - 2), cls = window.CLASSES_DEMO[Math.floor(r() * 6)];
      var t0 = now - (14 + r() * 2) * DIA, oid = 'O' + String(++occ).padStart(4, '0');
      var c = novoRegistro(rod, km, cls, t0, 'constatação', oid, 'presente');
      registros.push(c);
      var oc = { id: oid, classe: cls.item, rodovia: rod.cod, lote: rod.lote, sentido: c.sentido, km: c.km, lat: c.lat, lon: c.lon, aberta: t0, situacao: 'aberta', registros: [c.id], prazoDias: 15 };
      if (r() < 0.45) { // retorno
        var reg2 = r() < 0.55 ? 'regularizado' : 'presente';
        var t1 = now - r() * 3 * DIA;
        var ret = novoRegistro(rod, km, cls, t1, 'retorno', oid, reg2);
        ret.seed = c.seed; ret.sentido = c.sentido; ret.lat = c.lat + (r() - 0.5) * 0.00006; ret.lon = c.lon + (r() - 0.5) * 0.00006; ret.bbox = c.bbox; ret.sensivel = { placa: r() < 0.5, rosto: false };
        registros.push(ret); oc.registros.push(ret.id);
        if (reg2 === 'regularizado') { oc.situacao = 'encerrada'; oc.encerrada = t1; }
      }
      ocorrencias.push(oc);
    }
    // estados de validacao iniciais
    registros.forEach(function (g, k) { var q = r(); if (q < 0.45) { g.status = 'validado'; g.historico.push({ ts: g.ts + 3600000, quem: 'fiscal.artesp', acao: 'Validado', det: '' }); } else if (q < 0.52) { g.status = 'falso positivo'; g.historico.push({ ts: g.ts + 3600000, quem: 'fiscal.artesp', acao: 'Falso positivo', det: '' }); } });
    // alguns registros manuais
    ['Celular (fiscal)', 'Drone (EAF)'].forEach(function (o, k) { var rod = window.RODOVIAS[k], cls = window.CLASSES_DEMO[k * 2]; var g = novoRegistro(rod, 20 + k * 11, cls, now - (k + 1) * 2 * 3600000, 'constatação', 'O' + String(++occ).padStart(4, '0'), 'presente', o); registros.push(g); ocorrencias.push({ id: g.ocorrencia, classe: g.classe, rodovia: g.rodovia, lote: g.lote, sentido: g.sentido, km: g.km, lat: g.lat, lon: g.lon, aberta: g.ts, situacao: 'aberta', registros: [g.id], prazoDias: 15 }); });

    // ativos: cadastro x detectado
    var ativos = [], aid = 0;
    window.RODOVIAS.forEach(function (rod) {
      for (var k = 0; k < 9; k++) {
        var km2 = 3 + r() * (rod.km - 6), cl = window.CLASSES_ATIVOS[Math.floor(r() * 6)], p2 = pos(rod, km2), q = r();
        var a = { id: 'A' + String(++aid).padStart(4, '0'), classe: cl, rodovia: rod.cod, lote: rod.lote, km: Math.round(km2 * 10) / 10, cadLat: p2[0], cadLon: p2[1], detLat: null, detLon: null, cadastrado: true, status: '' };
        if (q < 0.62) { a.detLat = p2[0] + (r() - 0.5) * 0.00014; a.detLon = p2[1] + (r() - 0.5) * 0.00014; }
        else if (q < 0.80) { a.detLat = p2[0] + (r() - 0.5) * 0.0010; a.detLon = p2[1] + (r() - 0.5) * 0.0010; }
        else if (q < 0.90) { a.cadastrado = false; a.cadLat = null; a.cadLon = null; a.detLat = p2[0]; a.detLon = p2[1]; }
        ativos.push(a);
      }
    });
    // videos (retencao 45 dias)
    var videos = [];
    for (var d = 0; d < 60; d += 3) { for (var kt = 1; kt <= 3; kt++) videos.push({ id: 'V' + (d * 10 + kt), kit: 'Kit ' + String(kt * 6).padStart(2, '0'), cap: now - d * DIA, trecho: window.RODOVIAS[(d / 3 + kt) % 4].cod, preservar: false, gb: Math.round((38 + r() * 24) * 10) / 10 }); }
    // disponibilidade 30 dias
    var disp = {};
    window.COMPONENTES.forEach(function (c, ci) { disp[c] = []; for (var dd = 29; dd >= 0; dd--) { var down = r() < 0.07 ? Math.round((8 + r() * 70)) : 0; disp[c].push({ dia: now - dd * DIA, minIndisp: down }); } });
    return { registros: registros, ocorrencias: ocorrencias, ativos: ativos, videos: videos, disp: disp, audit: [], params: { tolPorClasse: window.CLASSES_ATIVOS.reduce(function (o, c) { o[c] = 15; return o; }, {}), histParams: [], janelaRetornoM: 30 }, perfil: 'ARTESP', rotinas: [] };
  };
})();
