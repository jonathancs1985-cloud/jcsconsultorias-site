/* Gerador procedural de cenas rodoviarias sinteticas (imagem captada, anotada e anonimizada).
   Nenhuma imagem real e usada: serve apenas para demonstrar o fluxo. */
(function () {
  var COR = { pavimento: '#c0392b', vegetacao: '#27ae60', pichacao: '#8e44ad', vedo: '#d35400', drenagem: '#2980b9', residuos: '#16a085' };
  var PLACA = { x: 0.4875, y: 0.5755, w: 0.034, h: 0.017 };
  var ROSTO = { cx: 0.865, cy: 0.545, r: 0.016 };

  function halfWidth(y, y0) { return 0.05 + 0.40 * Math.max(0, (y - y0) / (1 - y0)); }

  function cena(c, rec, opt) {
    opt = opt || {};
    var w = c.width, h = c.height, g = c.getContext('2d'), R = window.RNG(rec.seed || 1), y0 = 0.40;
    g.clearRect(0, 0, w, h);
    var sky = g.createLinearGradient(0, 0, 0, h * y0); sky.addColorStop(0, '#8fc7f0'); sky.addColorStop(1, '#e4f1fb'); g.fillStyle = sky; g.fillRect(0, 0, w, h * y0 + 1);
    g.fillStyle = '#5f8f4a'; g.fillRect(0, h * y0, w, h * (1 - y0));
    for (var i = 0; i < 7; i++) { g.fillStyle = 'rgba(' + (60 + R() * 30 | 0) + ',' + (110 + R() * 30 | 0) + ',' + (70 + R() * 20 | 0) + ',0.9)'; g.beginPath(); g.ellipse(R() * w, h * y0, w * (0.10 + R() * 0.12), h * (0.04 + R() * 0.05), 0, Math.PI, 0); g.fill(); }
    // gramado com variacao
    for (i = 0; i < 260; i++) { var yy = y0 + R() * (1 - y0), xx = R() * w; g.fillStyle = 'rgba(' + (70 + R() * 40 | 0) + ',' + (120 + R() * 50 | 0) + ',60,0.35)'; g.fillRect(xx, yy * h, w * 0.012, h * 0.006); }
    // pista
    function trap(yTop, yBot, fn, col) { g.fillStyle = col; g.beginPath(); g.moveTo(w * (0.5 - fn(yTop)), h * yTop); g.lineTo(w * (0.5 + fn(yTop)), h * yTop); g.lineTo(w * (0.5 + fn(yBot)), h * yBot); g.lineTo(w * (0.5 - fn(yBot)), h * yBot); g.closePath(); g.fill(); }
    trap(y0, 1, function (y) { return halfWidth(y, y0) * 1.16; }, '#8a8f78');
    trap(y0, 1, function (y) { return halfWidth(y, y0); }, '#4b4b50');
    for (i = 0; i < 90; i++) { g.fillStyle = 'rgba(0,0,0,' + (0.04 + R() * 0.06) + ')'; var py = y0 + R() * (1 - y0); g.fillRect(w * (0.5 - halfWidth(py, y0) + R() * 2 * halfWidth(py, y0)), py * h, w * 0.01, h * 0.003); }
    // marcas
    g.strokeStyle = '#f4f4f4'; g.lineWidth = Math.max(1, w * 0.004);
    [-1, 1].forEach(function (s) { g.beginPath(); g.moveTo(w * (0.5 + s * (halfWidth(y0, y0) * 0.92)), h * y0); g.lineTo(w * (0.5 + s * (halfWidth(1, y0) * 0.92)), h); g.stroke(); });
    g.strokeStyle = '#f2c230'; for (i = 0; i < 12; i++) { var a = y0 + (1 - y0) * Math.pow(i / 12, 1.6), b = y0 + (1 - y0) * Math.pow((i + 0.55) / 12, 1.6); g.lineWidth = Math.max(1, w * (0.002 + 0.006 * (a - y0))); g.beginPath(); g.moveTo(w * 0.5, h * a); g.lineTo(w * 0.5, h * b); g.stroke(); }
    // arvores e placa
    for (i = 0; i < 9; i++) { var ty = y0 + 0.02 + R() * 0.12, side = R() < 0.5 ? -1 : 1, tx = 0.5 + side * (halfWidth(ty, y0) * 1.3 + R() * 0.3), s = 0.02 + (ty - y0) * 0.35; g.fillStyle = '#4a3a2a'; g.fillRect(w * tx - w * s * 0.08, h * ty - h * s * 0.2, w * s * 0.16, h * s * 0.7); g.fillStyle = 'rgba(' + (30 + R() * 30 | 0) + ',' + (100 + R() * 40 | 0) + ',50,0.95)'; g.beginPath(); g.arc(w * tx, h * ty - h * s * 0.4, h * s * 0.9, 0, 7); g.fill(); }
    g.fillStyle = '#7d7d7d'; g.fillRect(w * 0.705, h * 0.42, w * 0.004, h * 0.12); g.fillStyle = '#1f6fb2'; g.fillRect(w * 0.69, h * 0.39, w * 0.035, h * 0.04);
    // defeito conforme o grupo e o estado
    var b = rec.bbox, ok = rec.estado === 'regularizado', gp = rec.grupo;
    var bx = w * b.x, by = h * b.y, bw = w * b.w, bh = h * b.h;
    if (gp === 'pavimento') {
      if (ok) { g.fillStyle = '#34343a'; g.fillRect(bx + bw * 0.1, by + bh * 0.1, bw * 0.8, bh * 0.8); g.strokeStyle = '#555'; g.strokeRect(bx + bw * 0.1, by + bh * 0.1, bw * 0.8, bh * 0.8); }
      else { g.fillStyle = '#1b1b1d'; g.beginPath(); g.ellipse(bx + bw / 2, by + bh / 2, bw * 0.42, bh * 0.38, 0, 0, 7); g.fill(); g.strokeStyle = '#222'; g.lineWidth = Math.max(1, w * 0.002); for (i = 0; i < 7; i++) { g.beginPath(); g.moveTo(bx + bw / 2, by + bh / 2); g.lineTo(bx + bw / 2 + (R() - 0.5) * bw * 1.4, by + bh / 2 + (R() - 0.5) * bh * 1.6); g.stroke(); } }
    } else if (gp === 'vegetacao') {
      var n = ok ? 25 : 360; for (i = 0; i < n; i++) { var gx = bx + R() * bw, gy = by + bh * (ok ? 0.8 + R() * 0.2 : 0.2 + R() * 0.8), hh = bh * (ok ? 0.05 : 0.25 + R() * 0.45); g.strokeStyle = 'rgba(' + (30 + R() * 40 | 0) + ',' + (120 + R() * 70 | 0) + ',40,0.9)'; g.lineWidth = Math.max(1, w * 0.0025); g.beginPath(); g.moveTo(gx, gy); g.quadraticCurveTo(gx + (R() - 0.5) * bw * 0.15, gy - hh * 0.5, gx + (R() - 0.5) * bw * 0.2, gy - hh); g.stroke(); }
    } else if (gp === 'pichacao') {
      g.fillStyle = '#b8b6b0'; g.fillRect(bx - bw * 0.1, by - bh * 0.2, bw * 1.2, bh * 1.6); g.strokeStyle = 'rgba(0,0,0,0.18)'; for (i = 0; i < 5; i++) { g.beginPath(); g.moveTo(bx - bw * 0.1, by - bh * 0.2 + i * bh * 0.32); g.lineTo(bx + bw * 1.1, by - bh * 0.2 + i * bh * 0.32); g.stroke(); }
      if (!ok) { var cols = ['#7d2ae8', '#1b1b1b', '#e8412a', '#2a9fe8']; for (i = 0; i < 9; i++) { g.strokeStyle = cols[i % 4]; g.lineWidth = Math.max(2, w * 0.006); g.beginPath(); var sx = bx + R() * bw, sy = by + R() * bh; g.moveTo(sx, sy); for (var k = 0; k < 4; k++) g.lineTo(sx + (R() - 0.3) * bw * 0.4, sy + (R() - 0.5) * bh * 0.8); g.stroke(); } }
    } else if (gp === 'vedo') {
      g.strokeStyle = '#6a6a6a'; g.lineWidth = Math.max(1, w * 0.0018); for (i = 0; i <= 6; i++) { var px = bx + bw * i / 6; g.fillStyle = '#5b4632'; g.fillRect(px - w * 0.003, by, w * 0.006, bh); }
      [0.25, 0.5, 0.75].forEach(function (f) { g.beginPath(); g.moveTo(bx, by + bh * f); g.lineTo(bx + bw * (ok ? 1 : 0.42), by + bh * f); g.stroke(); if (!ok) { g.beginPath(); g.moveTo(bx + bw * 0.66, by + bh * f); g.lineTo(bx + bw, by + bh * f); g.stroke(); g.beginPath(); g.moveTo(bx + bw * 0.42, by + bh * f); g.lineTo(bx + bw * 0.5, by + bh * (f + 0.35)); g.stroke(); } });
    } else if (gp === 'drenagem') {
      g.fillStyle = '#7c7c80'; g.fillRect(bx, by, bw, bh); g.fillStyle = '#4a4a4d'; g.fillRect(bx + bw * 0.04, by + bh * 0.2, bw * 0.92, bh * 0.6);
      if (!ok) { for (i = 0; i < 26; i++) { g.fillStyle = ['#6b5a3a', '#3d6b32', '#8a7a55'][i % 3]; g.beginPath(); g.ellipse(bx + R() * bw, by + bh * (0.3 + R() * 0.5), bw * 0.05, bh * 0.14, 0, 0, 7); g.fill(); } }
    } else { // residuos
      var m = ok ? 0 : 9; for (i = 0; i < m; i++) { g.fillStyle = ['#7a5a2a', '#3d7a32', '#6a6a6a'][i % 3]; g.fillRect(bx + R() * bw * 0.9, by + R() * bh * 0.8, bw * 0.12, bh * 0.2); }
    }
    // veiculo a frente (placa) e pedestre (rosto)
    if (rec.sensivel && rec.sensivel.placa) { g.fillStyle = '#2d4a7a'; g.fillRect(w * 0.47, h * 0.5, w * 0.08, h * 0.08); g.fillStyle = '#9ac'; g.fillRect(w * 0.48, h * 0.51, w * 0.06, h * 0.02); g.fillStyle = '#111'; g.fillRect(w * 0.465, h * 0.565, w * 0.012, h * 0.016); g.fillRect(w * 0.543, h * 0.565, w * 0.012, h * 0.016); g.fillStyle = '#f2f2f2'; g.fillRect(w * PLACA.x, h * PLACA.y, w * PLACA.w, h * PLACA.h); g.fillStyle = '#222'; g.font = Math.max(6, h * 0.014) + 'px monospace'; g.fillText('ABC1D23', w * PLACA.x + w * 0.001, h * (PLACA.y + 0.0135)); }
    if (rec.sensivel && rec.sensivel.rosto) { g.fillStyle = '#2f6f4f'; g.fillRect(w * (ROSTO.cx - 0.012), h * (ROSTO.cy + 0.016), w * 0.024, h * 0.06); g.fillStyle = '#d9a98a'; g.beginPath(); g.arc(w * ROSTO.cx, h * ROSTO.cy, h * ROSTO.r, 0, 7); g.fill(); g.fillStyle = '#222'; g.fillRect(w * (ROSTO.cx - 0.005), h * (ROSTO.cy - 0.003), w * 0.003, h * 0.003); g.fillRect(w * (ROSTO.cx + 0.003), h * (ROSTO.cy - 0.003), w * 0.003, h * 0.003); }
    if (opt.anonimizar) anonimizar(c, rec);
    if (opt.anotada) anotar(c, rec);
    return c;
  }

  function pixelar(g, c, x, y, ww, hh) {
    x = Math.max(0, x | 0); y = Math.max(0, y | 0); ww = Math.max(2, ww | 0); hh = Math.max(2, hh | 0);
    var t = document.createElement('canvas'); t.width = Math.max(2, ww / 6 | 0); t.height = Math.max(2, hh / 6 | 0);
    var tg = t.getContext('2d'); tg.imageSmoothingEnabled = false; tg.drawImage(c, x, y, ww, hh, 0, 0, t.width, t.height);
    g.imageSmoothingEnabled = false; g.drawImage(t, 0, 0, t.width, t.height, x, y, ww, hh);
  }
  function anonimizar(c, rec) {
    var g = c.getContext('2d'), w = c.width, h = c.height;
    if (rec.sensivel && rec.sensivel.placa) pixelar(g, c, w * (PLACA.x - 0.004), h * (PLACA.y - 0.006), w * (PLACA.w + 0.008), h * (PLACA.h + 0.012));
    if (rec.sensivel && rec.sensivel.rosto) pixelar(g, c, w * ROSTO.cx - h * ROSTO.r * 1.3, h * ROSTO.cy - h * ROSTO.r * 1.3, h * ROSTO.r * 2.6, h * ROSTO.r * 2.6);
  }
  function anotar(c, rec) {
    var g = c.getContext('2d'), w = c.width, h = c.height, b = rec.bbox, col = COR[rec.grupo] || '#e91e63';
    g.lineWidth = Math.max(2, w * 0.003); g.strokeStyle = col; g.strokeRect(w * b.x, h * b.y, w * b.w, h * b.h);
    var tx = (window.taxItem ? window.taxItem(rec.classe).classe : rec.classe) + ' ' + Math.round(rec.conf * 100) + '%';
    g.font = 'bold ' + Math.max(10, h * 0.022) + 'px sans-serif'; var tw = g.measureText(tx).width + 10;
    g.fillStyle = col; g.fillRect(w * b.x, h * b.y - h * 0.034, tw, h * 0.034); g.fillStyle = '#fff'; g.fillText(tx, w * b.x + 5, h * b.y - h * 0.01);
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, h * 0.955, w, h * 0.045); g.fillStyle = '#fff'; g.font = Math.max(9, h * 0.02) + 'px monospace';
    g.fillText(rec.id + '  ' + rec.rodovia + ' km ' + rec.km + ' ' + rec.sentido + '  ' + rec.lat.toFixed(6) + ', ' + rec.lon.toFixed(6) + ' (EPSG:4674)  ' + new Date(rec.ts).toISOString().replace('T', ' ').slice(0, 19) + 'Z', 8, h * 0.985);
  }

  function nova(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sha256Canvas(c) {
    return new Promise(function (ok, err) {
      c.toBlob(function (b) { b.arrayBuffer().then(function (buf) { return crypto.subtle.digest('SHA-256', buf); }).then(function (d) { ok(Array.prototype.map.call(new Uint8Array(d), function (x) { return x.toString(16).padStart(2, '0'); }).join('')); }, err); }, 'image/png');
    });
  }
  function diff(a, b) { // diferenca visual entre duas capturas do mesmo ponto
    var w = a.width, h = a.height, o = nova(w, h), ga = a.getContext('2d').getImageData(0, 0, w, h), gb = b.getContext('2d').getImageData(0, 0, w, h), og = o.getContext('2d'), od = og.createImageData(w, h), n = 0;
    for (var i = 0; i < ga.data.length; i += 4) { var d = Math.abs(ga.data[i] - gb.data[i]) + Math.abs(ga.data[i + 1] - gb.data[i + 1]) + Math.abs(ga.data[i + 2] - gb.data[i + 2]); var on = d > 60; if (on) n++; od.data[i] = on ? 255 : 20; od.data[i + 1] = on ? 40 : 20; od.data[i + 2] = on ? 40 : 24; od.data[i + 3] = 255; }
    og.putImageData(od, 0, 0); return { canvas: o, pct: Math.round(1000 * n / (w * h)) / 10 };
  }
  window.IMG = { cena: cena, nova: nova, sha256: sha256Canvas, diff: diff, COR: COR };
})();
