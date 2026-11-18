(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // topo: fundo ao rolar e menu móvel
  const topo = $('#topo');
  const marcarTopo = () => topo.classList.toggle('rolado', scrollY > 24);
  addEventListener('scroll', marcarTopo, { passive: true });
  marcarTopo();
  const menu = $('#menu'), botao = $('#menuBotao');
  botao.addEventListener('click', () => {
    const aberto = menu.classList.toggle('aberto');
    botao.setAttribute('aria-expanded', String(aberto));
  });
  $$('a', menu).forEach(a => a.addEventListener('click', () => {
    menu.classList.remove('aberto');
    botao.setAttribute('aria-expanded', 'false');
  }));

  // seção atual no menu
  const links = new Map($$('a[href^="#"]', menu).map(a => [a.getAttribute('href').slice(1), a]));
  const observador = new IntersectionObserver(entradas => {
    entradas.forEach(e => {
      const a = links.get(e.target.id);
      if (a && e.isIntersecting) {
        links.forEach(l => l.removeAttribute('aria-current'));
        a.setAttribute('aria-current', 'true');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => { const s = document.getElementById(id); if (s) observador.observe(s); });

  // diagrama linear: régua de km, ativos e cursor de leitura
  const ATIVOS = [
    ['SV', 'Placa de regulamentação'], ['DF', 'Defensa metálica'], ['DR', 'Sarjeta e descida d’água'],
    ['OAE', 'Ponte · 8 unidades'], ['SH', 'Faixa de bordo'], ['IL', 'Poste de iluminação'],
    ['PV', 'Trinca no pavimento'], ['FD', 'Cerca da faixa de domínio'], ['TE', 'Talude de corte'],
    ['DR', 'Bueiro tubular'], ['SV', 'Placa de indicação'], ['ED', 'Posto de pesagem']
  ];
  const KM0 = 214, EXT = 12;
  const regua = $('#sldRegua'), ativos = $('#sldAtivos'), cursor = $('#sldCursor'), leitura = $('#sldLeitura');
  if (regua && ativos && cursor) {
    for (let k = 0; k <= EXT * 2; k++) {
      const pct = k / (EXT * 2) * 100, i = document.createElement('i');
      i.style.left = pct + '%';
      if (k % 2 === 0) {
        i.className = 'maior';
        const s = document.createElement('span');
        s.style.left = pct + '%';
        s.textContent = 'km ' + (KM0 + k / 2);
        if (k !== 0 && k !== EXT * 2) regua.append(s);
      }
      regua.append(i);
    }
    const pos = ATIVOS.map((a, n) => (n + 0.5) / ATIVOS.length * 100 + (n % 2 ? 1.2 : -1.2));
    const els = ATIVOS.map(([sigla, nome], n) => {
      const d = document.createElement('div');
      d.className = 'sld-ativo';
      d.style.left = pos[n] + '%';
      d.innerHTML = `<b>${sigla}</b><span>${nome}</span>`;
      ativos.append(d);
      return d;
    });
    const larguraEstreita = () => innerWidth < 900;
    const ajustarRotulos = () => els.forEach((d, n) => { d.querySelector('span').hidden = larguraEstreita() && n % 2 === 1; });
    ajustarRotulos();
    addEventListener('resize', ajustarRotulos);
    const fmtKm = p => {
      const m = Math.round((KM0 + p / 100 * EXT) * 1000);
      return `km ${Math.floor(m / 1000)}+${String(m % 1000).padStart(3, '0')}`;
    };
    let ultimo = '';
    const DUR = 16000;
    const quadro = t => {
      const p = (t % DUR) / DUR * 100;
      cursor.style.transform = `translateX(${p / 100 * cursor.parentElement.clientWidth}px)`;
      let atual = -1;
      els.forEach((d, n) => {
        const lido = pos[n] <= p;
        d.classList.toggle('lido', lido);
        if (lido) atual = n;
      });
      const texto = fmtKm(p) + (atual >= 0 && p - pos[atual] < 3.5 ? ' · ' + ATIVOS[atual][1] + ' · validado' : '');
      if (texto !== ultimo) { leitura.textContent = texto; ultimo = texto; }
      requestAnimationFrame(quadro);
    };
    if (reduz) {
      els.forEach(d => d.classList.add('lido'));
      cursor.style.transform = `translateX(${cursor.parentElement.clientWidth * .62}px)`;
      leitura.textContent = 'km 221+440 · leitura concluída';
    } else requestAnimationFrame(quadro);
  }

  // galerias com abas
  $$('[data-galeria]').forEach(g => {
    const img = $('.galeria-palco img', g), leg = $('.galeria-palco figcaption', g), abas = $$('[role="tab"]', g);
    const ativar = b => {
      abas.forEach(x => { x.setAttribute('aria-selected', String(x === b)); x.tabIndex = x === b ? 0 : -1; });
      if (img.getAttribute('src') === b.dataset.src) return;
      img.classList.add('trocando');
      const pre = new Image();
      pre.onload = () => { img.src = b.dataset.src; img.alt = b.textContent + ' · tela real'; leg.textContent = b.dataset.legenda; requestAnimationFrame(() => img.classList.remove('trocando')); };
      pre.src = b.dataset.src;
    };
    abas.forEach((b, n) => {
      b.tabIndex = n === 0 ? 0 : -1;
      b.addEventListener('click', () => ativar(b));
      b.addEventListener('keydown', e => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        const prox = abas[(n + d + abas.length) % abas.length];
        prox.focus(); ativar(prox);
      });
    });
  });

  // vídeos em loop só tocam quando visíveis
  const vids = $$('video[data-auto], .hero-video video');
  const ovid = new IntersectionObserver(es => es.forEach(e => {
    if (reduz) { e.target.pause(); return; }
    if (e.isIntersecting) { if (e.target.preload === 'none') e.target.preload = 'auto'; e.target.play().catch(() => {}); }
    else e.target.pause();
  }), { threshold: .25 });
  vids.forEach(v => ovid.observe(v));

  // demonstrações interativas: carregam sob demanda
  const demos = $('[data-demos]');
  if (demos) {
    const abas = $$('[role="tab"]', demos), palco = $('#demoPalco');
    const mostrar = id => {
      abas.forEach(a => a.setAttribute('aria-selected', String(a.dataset.demoId === id)));
      $$('.demo-capa', palco).forEach(c => { c.hidden = c.dataset.capa !== id; });
      const f = $('iframe', palco); if (f) f.remove();
    };
    abas.forEach(a => a.addEventListener('click', () => mostrar(a.dataset.demoId)));
    $$('[data-carregar]', palco).forEach(b => b.addEventListener('click', () => {
      const capa = b.closest('.demo-capa');
      const aviso = document.createElement('div');
      aviso.className = 'demo-carregando'; aviso.textContent = 'Carregando a demonstração…';
      capa.hidden = true; palco.append(aviso);
      const f = document.createElement('iframe');
      f.src = b.dataset.carregar; f.title = capa.querySelector('h3').textContent; f.loading = 'eager'; f.allowFullscreen = true;
      f.addEventListener('load', () => aviso.remove());
      palco.append(f);
    }));
    $$('[data-demo]').forEach(a => a.addEventListener('click', () => mostrar(a.dataset.demo)));
  }

  // formulário de contato: abre e-mail ou WhatsApp
  const form = $('#formContato');
  if (form) {
    const erro = $('#formErro');
    const validar = () => {
      const faltas = [];
      [['fNome', 'nome'], ['fEmail', 'e-mail'], ['fMensagem', 'mensagem']].forEach(([id, rot]) => {
        const c = document.getElementById(id), ok = c.value.trim() && (id !== 'fEmail' || c.checkValidity());
        c.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok) faltas.push(rot);
      });
      if (faltas.length) { erro.hidden = false; erro.textContent = 'Revise: ' + faltas.join(', ') + '. O e-mail precisa ter o formato nome@empresa.com.'; return null; }
      erro.hidden = true;
      const v = id => document.getElementById(id).value.trim();
      return { assunto: v('fAssunto'), texto: `Nome: ${v('fNome')}\nEmpresa: ${v('fEmpresa') || '—'}\nE-mail: ${v('fEmail')}\n\n${v('fMensagem')}` };
    };
    form.addEventListener('submit', e => {
      e.preventDefault();
      const d = validar(); if (!d) return;
      location.href = `mailto:jonathan@jcsconsultorias.com?subject=${encodeURIComponent('Site JCS · ' + d.assunto)}&body=${encodeURIComponent(d.texto)}`;
    });
    $('#formWhats').addEventListener('click', () => {
      const d = validar(); if (!d) return;
      open(`https://wa.me/5561981858578?text=${encodeURIComponent('Site JCS · ' + d.assunto + '\n' + d.texto)}`, '_blank', 'noopener');
    });
  }
})();
