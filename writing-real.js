/* Night IELTS — Writing: kho ĐỀ THI THẬT 2026 + THI THỬ 60 PHÚT
   Cần: writing-real-data.js (window.WR_REAL_DATA). Trang writing.html gọi:
     NVWR.item(itemId)                 -> mục đề {id,title,promptHtml,task,type,sourceBankId}
     NVWR.paintHub(el, ctx)            -> vẽ kho đề kiểu trang Speaking. ctx = { docs(), open(itemId), mock(entryId) }
     NVWR.openMock(entryId, ctx)       -> màn thi thử Task 1 + Task 2 (60 phút). ctx.grade(item, html, text, onStep, extra) -> Promise<{id, band}>
   Biểu đồ vẽ bằng SVG từ số liệu -> ảnh nhúng sẵn trong đề + bản chữ số liệu ẩn (AI đọc được, không cần đọc ảnh). */
(function () {
  var RAW = window.WR_REAL_DATA || [];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var COL = ['#6C70DC', '#FF9E5E', '#2BB6A3', '#E8576F', '#E3B341', '#4A90D9', '#9B6BD3'];
  var T1TYPE = { line: 'line_graph', bar: 'bar_chart', pie: 'pie_chart', table: 'table', proc: 'process', map: 'map', multi: 'mixed' };
  var T1VI = { line: 'Line graph', bar: 'Bar chart', pie: 'Pie chart', table: 'Table', proc: 'Process', map: 'Map', multi: 'Mixed' };
  var T2TYPE = { o: 'opinion', d: 'discussion', a: 'adv_dis', p: 'problem_solution', b: 'two_part', q: 'two_part' };
  var T2VI = { o: 'Agree / Disagree', d: 'Discuss both views', a: 'Advantages & Disadvantages', p: 'Problem & Solution', b: 'Positive / Negative', q: 'Two-part question' };
  var T2TAIL = { o: 'To what extent do you agree or disagree?', d: 'Discuss both these views and give your own opinion.', a: 'Do the advantages of this outweigh the disadvantages?', b: 'Is this a positive or negative development?', p: '', q: '' };

  /* ---------- dữ liệu ---------- */
  var BY = {}; RAW.forEach(function (r) { BY[r[0]] = r; });
  function t1Of(r, n) { var x = r[2]; n = n || 0; if (typeof x === 'string' && n < 5) { var o = BY[x.split(':')[1]]; return o ? t1Of(o, n + 1) : null; } return x || null; }
  function t2Of(r, n) { var x = r[3]; n = n || 0; if (typeof x === 'string' && n < 5) { var o = BY[x.split(':')[1]]; return o ? t2Of(o, n + 1) : null; } return x || null; }
  var ENT = RAW.map(function (r) { return { id: r[0], date: r[1], t1: t1Of(r), t2: t2Of(r) }; }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  var fmtD = function (d) { var p = d.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };

  /* ---------- vẽ SVG ---------- */
  var F = 'font-family="Arial,Helvetica,sans-serif"';
  function nice(max) { if (max <= 0) return 1; var e = Math.pow(10, Math.floor(Math.log10(max))), m = max / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e; }
  function num(v) { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, '')) || 0; }
  function fmtN(v) { return Math.abs(v) >= 1000 ? v.toLocaleString('en-US') : String(+v.toFixed(2)); }
  function legend(names, x, y, w) {
    var out = '', cx = x, cy = y;
    names.forEach(function (n, i) { var tw = 22 + n.length * 6.6; if (cx + tw > x + w) { cx = x; cy += 18; } out += '<rect x="' + cx + '" y="' + (cy - 9) + '" width="12" height="12" rx="3" fill="' + COL[i % COL.length] + '"/><text x="' + (cx + 17) + '" y="' + (cy + 1) + '" font-size="12" fill="#333" ' + F + '>' + esc(n) + '</text>'; cx += tw + 10; });
    return { svg: out, h: cy - y + 18 };
  }
  function axes(c, W, H, yMax, unit, top) {
    var L = 58, R = 18, B = 46, T = top, ph = H - T - B, out = '', st = 5;
    for (var i = 0; i <= st; i++) { var v = yMax * i / st, y = T + ph - ph * i / st; out += '<line x1="' + L + '" y1="' + y + '" x2="' + (W - R) + '" y2="' + y + '" stroke="' + (i ? '#E6E7F0' : '#888') + '"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" font-size="11" text-anchor="end" fill="#555" ' + F + '>' + fmtN(v) + '</text>'; }
    if (unit) out += '<text transform="translate(14,' + (T + ph / 2) + ') rotate(-90)" font-size="11.5" text-anchor="middle" fill="#555" ' + F + '>' + esc(unit) + '</text>';
    return { svg: out, L: L, R: R, T: T, ph: ph, pw: W - L - R };
  }
  function xLabels(x, a, W, H, B, slot) {
    var out = '', step = x.length > 12 ? 2 : 1;
    x.forEach(function (lab, i) { if (i % step) return; var cx = a.L + slot * i + slot / 2; out += '<text x="' + cx + '" y="' + (H - B + 18) + '" font-size="11" text-anchor="middle" fill="#444" ' + F + '>' + esc(lab) + '</text>'; });
    return out;
  }
  function svgWrap(W, H, inner) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '"><rect width="' + W + '" height="' + H + '" fill="#fff"/>' + inner + '</svg>'; }
  function lineBar(c) {
    var W = 680, H = 400, lg = legend(c.s.map(function (s) { return s[0]; }), 58, 22, W - 80);
    var max = 0; c.s.forEach(function (s) { s[1].forEach(function (v) { max = Math.max(max, num(v)); }); });
    var a = axes(c, W, H, nice(max * 1.08), c.u, 22 + lg.h + 6), yMax = nice(max * 1.08), n = c.x.length, slot = a.pw / n, out = lg.svg + a.svg;
    var Y = function (v) { return a.T + a.ph - a.ph * num(v) / yMax; };
    if (c.k === 'line') {
      c.s.forEach(function (s, si) {
        var pts = s[1].map(function (v, i) { return (a.L + slot * i + slot / 2).toFixed(1) + ',' + Y(v).toFixed(1); });
        out += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + COL[si % COL.length] + '" stroke-width="2.6" stroke-linejoin="round"/>';
        pts.forEach(function (p) { var q = p.split(','); out += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="3.6" fill="#fff" stroke="' + COL[si % COL.length] + '" stroke-width="2"/>'; });
      });
    } else {
      var k = c.s.length, gw = slot * 0.78, bw = gw / k;
      c.s.forEach(function (s, si) { s[1].forEach(function (v, i) { var x = a.L + slot * i + (slot - gw) / 2 + bw * si, y = Y(v); out += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(2, bw - 2).toFixed(1) + '" height="' + (a.T + a.ph - y).toFixed(1) + '" rx="2" fill="' + COL[si % COL.length] + '"/>'; }); });
    }
    return svgWrap(W, H, out + xLabels(c.x, a, W, H, 46, slot));
  }
  function pie(c) {
    var n = c.pies.length, R = 92, W = Math.max(420, n * 230 + 20), labels = [], out = '';
    c.pies.forEach(function (p) { p[1].forEach(function (s) { if (labels.indexOf(s[0]) === -1) labels.push(s[0]); }); });
    c.pies.forEach(function (p, pi) {
      var cx = 20 + pi * 230 + 115, cy = 150, ang = -Math.PI / 2, tot = p[1].reduce(function (t, s) { return t + num(s[1]); }, 0) || 1;
      out += '<text x="' + cx + '" y="34" font-size="14" font-weight="700" text-anchor="middle" fill="#222" ' + F + '>' + esc(p[0]) + '</text>';
      p[1].forEach(function (s) {
        var fr = num(s[1]) / tot, a2 = ang + fr * Math.PI * 2, large = fr > 0.5 ? 1 : 0, col = COL[labels.indexOf(s[0]) % COL.length];
        out += '<path d="M' + cx + ',' + cy + ' L' + (cx + R * Math.cos(ang)).toFixed(1) + ',' + (cy + R * Math.sin(ang)).toFixed(1) + ' A' + R + ',' + R + ' 0 ' + large + ' 1 ' + (cx + R * Math.cos(a2)).toFixed(1) + ',' + (cy + R * Math.sin(a2)).toFixed(1) + ' Z" fill="' + col + '" stroke="#fff" stroke-width="2"/>';
        var m = (ang + a2) / 2; if (fr >= 0.05) out += '<text x="' + (cx + R * 0.66 * Math.cos(m)).toFixed(1) + '" y="' + (cy + R * 0.66 * Math.sin(m) + 4).toFixed(1) + '" font-size="12" font-weight="700" text-anchor="middle" fill="#fff" ' + F + '>' + s[1] + '%</text>';
        ang = a2;
      });
    });
    var lg = legend(labels, 20, 270, W - 40);
    return svgWrap(W, 270 + lg.h + 6, out + lg.svg);
  }
  function table(c) {
    var cols = c.h.length, cw = [], W = 0;
    c.h.forEach(function (h, i) { var m = String(h).length; c.r.forEach(function (r) { m = Math.max(m, String(r[i]).length); }); cw[i] = Math.max(70, m * 7.4 + 24); W += cw[i]; });
    W = Math.max(W, 360); var rh = 32, H = rh * (c.r.length + 1) + 2, out = '';
    out += '<rect x="1" y="1" width="' + (W - 2) + '" height="' + rh + '" fill="#6C70DC"/>';
    var x = 1;
    c.h.forEach(function (h, i) { out += '<text x="' + (x + 10) + '" y="21" font-size="12.5" font-weight="700" fill="#fff" ' + F + '>' + esc(h) + '</text>'; x += cw[i]; });
    c.r.forEach(function (r, ri) {
      var y = rh * (ri + 1) + 1; if (ri % 2) out += '<rect x="1" y="' + y + '" width="' + (W - 2) + '" height="' + rh + '" fill="#F4F4FB"/>';
      x = 1; r.forEach(function (v, i) { out += '<text x="' + (i ? x + cw[i] - 12 : x + 10) + '" y="' + (y + 21) + '" font-size="12.5" ' + (i ? 'text-anchor="end"' : 'font-weight="700"') + ' fill="#222" ' + F + '>' + esc(v) + '</text>'; x += cw[i]; });
    });
    out += '<rect x="1" y="1" width="' + (W - 2) + '" height="' + (H - 2) + '" fill="none" stroke="#B9BCF4" stroke-width="1.5"/>';
    return svgWrap(Math.ceil(W), H, out);
  }
  function wrapTxt(t, max) { var w = String(t).split(' '), lines = [], cur = ''; w.forEach(function (x) { if ((cur + ' ' + x).trim().length > max) { lines.push(cur.trim()); cur = x; } else cur += ' ' + x; }); if (cur.trim()) lines.push(cur.trim()); return lines; }
  function proc(c) {
    var per = 3, bw = 190, bh = 92, gx = 44, gy = 40, n = c.st.length, rows = Math.ceil(n / per), W = per * bw + (per - 1) * gx + 40, H = rows * bh + (rows - 1) * gy + 40, out = '';
    out += '<defs><marker id="ar" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#FF9E5E"/></marker></defs>';
    var pos = c.st.map(function (s, i) { var r = Math.floor(i / per), k = i % per; if (r % 2) k = per - 1 - k; return { x: 20 + k * (bw + gx), y: 20 + r * (bh + gy) }; });
    pos.forEach(function (p, i) {
      if (i < n - 1) { var q = pos[i + 1]; var x1, y1, x2, y2; if (q.y === p.y) { var dir = q.x > p.x ? 1 : -1; x1 = p.x + (dir > 0 ? bw : 0); x2 = q.x + (dir > 0 ? 0 : bw); y1 = y2 = p.y + bh / 2; x2 -= dir * 6; } else { x1 = x2 = p.x + bw / 2; y1 = p.y + bh; y2 = q.y - 6; } out += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#FF9E5E" stroke-width="3" marker-end="url(#ar)"/>'; }
      out += '<rect x="' + p.x + '" y="' + p.y + '" width="' + bw + '" height="' + bh + '" rx="16" fill="#F4F4FB" stroke="#B9BCF4" stroke-width="1.5"/>';
      out += '<circle cx="' + (p.x + 18) + '" cy="' + (p.y + 18) + '" r="12" fill="#6C70DC"/><text x="' + (p.x + 18) + '" y="' + (p.y + 22.5) + '" font-size="12" font-weight="700" text-anchor="middle" fill="#fff" ' + F + '>' + (i + 1) + '</text>';
      wrapTxt(c.st[i], 26).slice(0, 4).forEach(function (l, li) { out += '<text x="' + (p.x + 12) + '" y="' + (p.y + 46 + li * 15) + '" font-size="12" fill="#222" ' + F + '>' + esc(l) + '</text>'; });
    });
    return svgWrap(W, H, out);
  }
  function mapCol(lab) {
    var l = lab.toLowerCase();
    if (/river|lake|sea|canal|reservoir|water|marsh/.test(l)) return ['#CFE6FB', '#4A90D9'];
    if (/park|tree|wood|forest|field|farm|garden|grass|golf|dune|habitat|green|picnic|nature/.test(l)) return ['#D9F2DE', '#2E9B57'];
    if (/road|railway|rail|track|path|motorway|corridor|car park|lorry|bridge|cycle/.test(l)) return ['#E9E9EF', '#8A8A99'];
    if (/beach|sand|lava|waste/.test(l)) return ['#FBEFD3', '#C99A2E'];
    return ['#FFE6D3', '#E9782F'];
  }
  function mapPanel(title, feats, ox) {
    var cw = 52, ch = 52, out = '<text x="' + (ox + 156) + '" y="22" font-size="14" font-weight="700" text-anchor="middle" fill="#222" ' + F + '>' + esc(title) + '</text>';
    out += '<rect x="' + ox + '" y="32" width="312" height="208" rx="10" fill="#FAFAFC" stroke="#C9CBE0"/>';
    feats.forEach(function (f) {
      var m = String(f).match(/^(.*)@(\d+),(\d+),(\d+),(\d+)$/); if (!m) return;
      var x = ox + 3 + m[2] * cw, y = 35 + m[3] * ch, w = m[4] * cw - 6, h = m[5] * ch - 6, c = mapCol(m[1]);
      out += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="7" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="1.4"/>';
      var lines = wrapTxt(m[1], Math.max(6, Math.floor(w / 6.6))).slice(0, 3);
      lines.forEach(function (l, li) { out += '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 4 + (li - (lines.length - 1) / 2) * 13) + '" font-size="11" font-weight="600" text-anchor="middle" fill="#333" ' + F + '>' + esc(l) + '</text>'; });
    });
    return out;
  }
  function map(c) {
    var out = mapPanel(c.y[0], c.A, 10) + mapPanel(c.y[1], c.B, 344);
    out += '<g transform="translate(668,52)"><path d="M0,-14 L6,6 L0,2 L-6,6 Z" fill="#24242A"/><text x="0" y="20" font-size="11" font-weight="700" text-anchor="middle" fill="#24242A" ' + F + '>N</text></g>';
    return svgWrap(690, 250, out);
  }
  function svgOf(c) { return c.k === 'line' || c.k === 'bar' ? lineBar(c) : c.k === 'pie' ? pie(c) : c.k === 'table' ? table(c) : c.k === 'proc' ? proc(c) : c.k === 'map' ? map(c) : ''; }
  function uri(svg) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
  function parts(t1) { return t1.k === 'multi' ? t1.c : [t1]; }

  /* ---------- bản chữ số liệu (cho AI) ---------- */
  function visText(c) {
    if (c.k === 'line' || c.k === 'bar') return (c.k === 'line' ? 'Line graph' : 'Bar chart') + (c.u ? ' (unit: ' + c.u + ')' : '') + '. ' + c.s.map(function (s) { return s[0] + ': ' + c.x.map(function (x, i) { return x + ' = ' + s[1][i]; }).join(', '); }).join('. ') + '.';
    if (c.k === 'pie') return 'Pie chart(s). ' + c.pies.map(function (p) { return p[0] + ': ' + p[1].map(function (s) { return s[0] + ' ' + s[1] + '%'; }).join(', '); }).join('. ') + '.';
    if (c.k === 'table') return 'Table. Columns: ' + c.h.join(' | ') + '. Rows: ' + c.r.map(function (r) { return r.join(' | '); }).join('; ') + '.';
    if (c.k === 'proc') return 'Process / diagram with ' + c.st.length + ' stages: ' + c.st.map(function (s, i) { return (i + 1) + ') ' + s; }).join('; ') + '.';
    if (c.k === 'map') { var f = function (a) { return a.map(function (x) { var m = String(x).match(/^(.*)@(\d+),(\d+)/); return m ? m[1] + ' (' + (m[3] < 2 ? 'north' : 'south') + '-' + (m[2] < 2 ? 'west' : m[2] < 4 ? 'centre' : 'east') + ')' : x; }).join(', '); }; return 'Two maps. ' + c.y[0] + ': ' + f(c.A) + '. ' + c.y[1] + ': ' + f(c.B) + '.'; }
    return '';
  }

  /* ---------- mục đề cho trang Writing ---------- */
  var CACHE = {};
  function item(itemId) {
    if (CACHE[itemId]) return CACHE[itemId];
    var m = String(itemId).match(/^real_(.+)_(t[12])$/); if (!m) return null;
    var e = ENT.filter(function (x) { return x.id === m[1]; })[0]; if (!e) return null;
    var it;
    if (m[2] === 't1') {
      if (!e.t1) return null;
      var t = e.t1, imgs = parts(t).map(function (c) { return '<p style="text-align:center"><img src="' + uri(svgOf(c)) + '" alt="' + esc(T1VI[c.k] || 'chart') + '" style="max-width:100%;border-radius:12px;background:#fff"></p>'; }).join('');
      it = { id: itemId, task: 'task1', type: T1TYPE[t.k], kind: t.k, date: e.date, entry: e.id, title: 'Task 1 · ' + fmtD(e.date) + ' · ' + (T1VI[t.k] || ''), text: t.p,
        promptHtml: '<p><b>You should spend about 20 minutes on this task.</b></p><p>' + esc(t.p) + '</p><p>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</p><p><b>Write at least 150 words.</b></p>' + imgs +
          '<div hidden data-nv-vis>' + esc(parts(t).map(visText).join(' ')) + '</div>' };
    } else {
      if (!e.t2) return null;
      var k = e.t2[0], tail = T2TAIL[k] || '';
      it = { id: itemId, task: 'task2', type: T2TYPE[k], kind: k, date: e.date, entry: e.id, title: 'Task 2 · ' + fmtD(e.date) + ' · ' + T2VI[k], text: e.t2[1],
        promptHtml: '<p><b>You should spend about 40 minutes on this task.</b></p><p>Write about the following topic:</p><blockquote style="margin:10px 0;padding:12px 16px;border-left:4px solid #6C70DC;background:#F4F4FB;border-radius:10px"><p style="margin:0"><i>' + esc(e.t2[1]) + '</i></p>' + (tail ? '<p style="margin:8px 0 0"><i>' + esc(tail) + '</i></p>' : '') + '</blockquote><p>Give reasons for your answer and include any relevant examples from your own knowledge or experience.</p><p><b>Write at least 250 words.</b></p>' };
    }
    it.sourceBankId = itemId;
    CACHE[itemId] = it;
    return it;
  }

  /* ---------- CSS ---------- */
  function css() {
    if (document.getElementById('nvwr-css')) return;
    var st = document.createElement('style'); st.id = 'nvwr-css';
    st.textContent = [
      '.wr-hero{position:relative;overflow:hidden;display:grid;grid-template-columns:1.5fr 1fr;gap:18px;padding:24px;border-radius:28px;color:#fff;background:radial-gradient(120% 90% at 100% 0%,#4C3FA8 0%,#26215F 45%,#191641 100%);box-shadow:0 24px 50px -28px rgba(25,22,65,.9);margin-bottom:16px}',
      '.wr-hero:before{content:"";position:absolute;right:-90px;top:-110px;width:320px;height:320px;border-radius:999px;border:46px solid rgba(255,255,255,.05)}',
      '.wr-badge{display:inline-flex;align-items:center;gap:7px;background:rgba(255,184,107,.18);color:#FFC98F;font-weight:800;font-size:12px;letter-spacing:.04em;padding:6px 12px;border-radius:999px}',
      '.wr-hero h2{margin:12px 0 6px;font-size:clamp(24px,3.2vw,34px);font-weight:900;letter-spacing:-.02em;line-height:1.15}',
      '.wr-hero p{margin:0;color:#D9D6FF;font-size:14px;line-height:1.6;max-width:560px}',
      '.wr-cta{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.wr-cta button{border:0;border-radius:999px;padding:12px 18px;font-weight:800;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;font-family:inherit}',
      '.wr-go{background:linear-gradient(135deg,#FFB86B,#FF6B9A);color:#2B1236;box-shadow:0 10px 24px -10px rgba(255,107,154,.9)}.wr-go2{background:rgba(255,255,255,.12);color:#fff}',
      '.wr-r{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}.wr-ring{width:140px;height:140px}',
      '.wr-mini{width:100%;max-width:260px}.wr-mini>div{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;color:#D9D6FF;margin-bottom:5px}.wr-mini b{color:#fff}',
      '.wr-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:4px 0 12px}',
      '.wr-tabs{display:inline-flex;gap:4px;padding:5px;background:#F4F4F7;border-radius:999px}.wr-tabs button,.wr-chips button{border:0;border-radius:999px;padding:9px 16px;font-weight:800;font-size:13.5px;cursor:pointer;background:transparent;color:#55555f;font-family:inherit}.wr-tabs .on{background:#24242A;color:#fff}',
      '.wr-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}.wr-chips button{background:#F4F4F7;padding:7px 12px;font-size:12.5px}.wr-chips .on{background:#6C70DC;color:#fff}',
      '.wr-search{flex:1;min-width:200px;display:flex;align-items:center;gap:8px;background:#F4F4F7;border-radius:999px;padding:10px 14px;color:#8f90a0}.wr-search input{border:0;outline:0;flex:1;font:inherit;background:transparent;color:#24242A}',
      '.wr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}',
      '.wr-card{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;border-radius:22px;background:#F4F4F7;overflow:hidden;transition:transform .15s,box-shadow .15s;min-height:170px}',
      '.wr-card:hover{transform:translateY(-3px);box-shadow:0 16px 30px -20px rgba(36,36,42,.5);background:#EDEEFD}',
      '.wr-thumb{height:132px;background:#fff;display:grid;place-items:center;overflow:hidden;border-bottom:1px solid #E6E7F0}.wr-thumb img{max-width:100%;max-height:132px;object-fit:contain}',
      '.wr-body{padding:12px 14px 14px;display:flex;flex-direction:column;gap:7px;flex:1}',
      '.wr-meta{display:flex;flex-wrap:wrap;gap:5px}.wr-meta span{font-size:11px;font-weight:800;padding:4px 9px;border-radius:999px;background:#fff;color:#55555f}.wr-meta .ty{background:#EDEEFD;color:#5458C4}.wr-meta .t2{background:#FFF1E7;color:#C2410C}',
      '.wr-txt{font-size:13.5px;line-height:1.5;color:#24242A;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}',
      '.wr-q{font-family:"Source Serif 4",Georgia,serif;font-size:15px;font-style:italic}',
      '.wr-st{margin-top:auto;display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:800;color:#8f90a0}.wr-st .ok{color:#15803D}.wr-st .bd{background:#24242A;color:#FFD66B;border-radius:9px;padding:3px 8px}',
      '.wr-empty{grid-column:1/-1;text-align:center;padding:30px;color:#8f90a0;font-weight:700}',
      '.wr-more{display:block;margin:16px auto 0;border:0;border-radius:999px;padding:11px 22px;font-weight:800;background:#24242A;color:#fff;cursor:pointer;font-family:inherit}',
      '.wr-mk{all:unset;box-sizing:border-box;cursor:pointer;display:flex;gap:12px;align-items:center;padding:14px;border-radius:20px;background:#F4F4F7;transition:background .15s}.wr-mk:hover{background:#EDEEFD}',
      '.wr-mk .d{width:56px;height:56px;border-radius:16px;background:#24242A;color:#fff;display:grid;place-items:center;text-align:center;font-weight:900;font-size:18px;line-height:1;flex:none}.wr-mk .d small{display:block;font-size:10px;font-weight:700;color:#B9BCF4;margin-top:2px}',
      '.wr-mk b{display:block;font-size:14px}.wr-mk .s{font-size:12.5px;color:#55555f;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.wr-mk .sc{margin-left:auto;flex:none;font-weight:900;font-size:13px;color:#5458C4}',
      '@media(max-width:760px){.wr-hero{grid-template-columns:1fr;padding:18px}.wr-r{flex-direction:row;flex-wrap:wrap}.wr-ring{width:110px;height:110px}.wr-mini{flex:1;min-width:170px}.wr-grid{grid-template-columns:1fr}}',
      /* thi thử */
      '#wr-mock{position:fixed;inset:0;z-index:2147483000;padding-top:max(8px,env(safe-area-inset-top));background:#24242A;display:flex;flex-direction:column;padding:8px;font-family:"Plus Jakarta Sans",system-ui,sans-serif}',
      '.wm-top{display:flex;align-items:center;gap:10px;color:#fff;padding:6px 8px 12px}.wm-top h3{margin:0;font-size:15px;font-weight:800;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.wm-btn{border:0;border-radius:999px;padding:9px 15px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:7px}.wm-ghost{background:rgba(255,255,255,.1);color:#fff}.wm-sub{background:linear-gradient(135deg,#FFB86B,#FF6B9A);color:#2B1236}',
      '.wm-time{font-variant-numeric:tabular-nums;font-weight:900;font-size:17px;background:rgba(255,255,255,.1);color:#fff;border-radius:999px;padding:7px 14px}.wm-time.low{background:#E8576F}',
      '.wm-tabs{display:flex;gap:6px;padding:0 8px 10px}.wm-tabs button{border:0;border-radius:999px;padding:8px 16px;font-weight:800;font-size:13px;cursor:pointer;background:rgba(255,255,255,.1);color:#fff;font-family:inherit}.wm-tabs .on{background:#fff;color:#24242A}.wm-tabs small{font-weight:700;opacity:.7;margin-left:6px}',
      '.wm-main{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:8px}',
      '.wm-pane{background:#fff;border-radius:22px;overflow:auto;padding:18px 20px}.wm-pane img{max-width:100%}.wm-prompt{font-size:15px;line-height:1.65;color:#24242A}',
      '.wm-ed{display:flex;flex-direction:column;background:#fff;border-radius:22px;overflow:hidden}.wm-ed textarea{flex:1;border:0;outline:0;resize:none;padding:20px 22px;font:17px/1.75 "Source Serif 4",Georgia,serif;color:#1e2532}',
      '.wm-foot{display:flex;align-items:center;gap:10px;padding:10px 16px;border-top:1px solid #E6E7F0;font-size:13px;color:#55555f;font-weight:700}.wm-foot .wc{margin-left:auto;background:#F4F4F7;border-radius:999px;padding:5px 12px}.wm-foot .wc.ok{background:#E3F6EA;color:#15803D}',
      '.wm-res{max-width:640px;margin:auto;background:#fff;border-radius:28px;padding:26px;text-align:center;width:100%}.wm-res h2{margin:0 0 6px;font-size:24px}.wm-band{font-size:56px;font-weight:900;color:#24242A;line-height:1}',
      '.wm-two{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}.wm-two a{display:block;text-decoration:none;color:#24242A;background:#F4F4F7;border-radius:18px;padding:14px}.wm-two b{display:block;font-size:28px}.wm-prog{color:#55555f;font-weight:700;margin:14px 0}',
      '@media(max-width:820px){.wm-main{grid-template-columns:1fr;grid-template-rows:minmax(150px,38%) 1fr}.wm-top h3{font-size:13px}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ---------- KHO ĐỀ ---------- */
  var S = { tab: 't1', month: '', type: '', q: '', shown: 24 };
  try { var sv = JSON.parse(localStorage.getItem('nvwr-hub') || '{}'); if (sv.tab) S.tab = sv.tab; } catch (e) {}
  var MONTHS = (function () { var m = []; ENT.forEach(function (e) { var k = e.date.slice(0, 7); if (m.indexOf(k) === -1) m.push(k); }); return m; })();
  function doneMap(ctx) {
    var d = {}; (ctx.docs ? ctx.docs() : []).forEach(function (a) { var k = a.sourceBankId; if (!k || k.indexOf('real_') !== 0 || !a.submittedAt) return; var o = d[k] || (d[k] = { n: 0, best: 0 }); o.n++; if (a.ai && a.ai.overall) o.best = Math.max(o.best, a.ai.overall); });
    return d;
  }
  function allItems(task) { var out = []; ENT.forEach(function (e) { var it = (task === 't1' ? e.t1 : e.t2) ? item('real_' + e.id + '_' + task) : null; if (it) out.push(it); }); return out; }
  function ring(pct) {
    var r = 52, c = 2 * Math.PI * r;
    return '<svg class="wr-ring" viewBox="0 0 140 140"><circle cx="70" cy="70" r="' + r + '" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="14"/><circle cx="70" cy="70" r="' + r + '" fill="none" stroke="url(#wrg)" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + (c * pct / 100).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 70 70)"/><defs><linearGradient id="wrg"><stop offset="0" stop-color="#FFB86B"/><stop offset="1" stop-color="#FF6B9A"/></linearGradient></defs><text x="70" y="74" text-anchor="middle" font-size="28" font-weight="900" fill="#fff" font-family="inherit">' + pct + '%</text><text x="70" y="94" text-anchor="middle" font-size="11" font-weight="700" fill="#C9C4FF" font-family="inherit">đã luyện</text></svg>';
  }
  function fmtB(b) { return (Math.round(b * 2) / 2).toFixed(1); }
  function paintHub(el, ctx) {
    css(); if (!el) return;
    var dm = doneMap(ctx), t1 = allItems('t1'), t2 = allItems('t2');
    var d1 = t1.filter(function (i) { return dm[i.id]; }).length, d2 = t2.filter(function (i) { return dm[i.id]; }).length;
    var bands = []; Object.keys(dm).forEach(function (k) { if (dm[k].best) bands.push(dm[k].best); });
    var avg = bands.length ? bands.reduce(function (a, b) { return a + b; }, 0) / bands.length : 0;
    var pct = Math.round((d1 + d2) / Math.max(1, t1.length + t2.length) * 100);
    var h = '<div class="wr-hero"><div style="position:relative">' +
      '<span class="wr-badge"><i class="fa-solid fa-fire"></i> ĐỀ THI THẬT 2026 · ' + ENT.length + ' NGÀY THI</span>' +
      '<h2>Viết đúng đề đã thi,<br>chấm ngay 4 tiêu chí</h2>' +
      '<p>' + t1.length + ' đề Task 1 có biểu đồ vẽ sẵn và ' + t2.length + ' đề Task 2, xếp theo ngày thi từ tháng 1 đến tháng 10/2026. Đề được biên soạn lại theo đúng chủ đề và format đề thật.</p>' +
      '<div class="wr-cta"><button class="wr-go" data-act="mock"><i class="fa-solid fa-stopwatch"></i> Thi thử 60 phút</button><button class="wr-go2" data-act="rand"><i class="fa-solid fa-shuffle"></i> Đề ngẫu nhiên</button></div></div>' +
      '<div class="wr-r">' + ring(pct) + '<div class="wr-mini"><div><span>Task 1 đã viết</span><b>' + d1 + ' / ' + t1.length + '</b></div><div><span>Task 2 đã viết</span><b>' + d2 + ' / ' + t2.length + '</b></div><div><span>Band trung bình</span><b>' + (avg ? fmtB(avg) : '–') + '</b></div></div></div></div>';
    h += '<div class="wr-bar"><div class="wr-tabs">' + [['t1', 'Task 1'], ['t2', 'Task 2'], ['mock', 'Thi thử']].map(function (t) { return '<button data-tab="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<label class="wr-search"><i class="fa-solid fa-magnifying-glass"></i><input id="wrQ" placeholder="Tìm chủ đề: education, tourism, map..." value="' + esc(S.q) + '"></label></div>';
    var types = S.tab === 't1' ? Object.keys(T1VI) : S.tab === 't2' ? ['o', 'd', 'a', 'p', 'b', 'q'] : [];
    h += '<div class="wr-chips"><button data-m="" class="' + (!S.month ? 'on' : '') + '">Tất cả tháng</button>' + MONTHS.map(function (m) { return '<button data-m="' + m + '" class="' + (S.month === m ? 'on' : '') + '">Th ' + (+m.slice(5)) + '</button>'; }).join('') + '</div>';
    if (types.length) h += '<div class="wr-chips"><button data-ty="" class="' + (!S.type ? 'on' : '') + '">Mọi dạng</button>' + types.map(function (t) { return '<button data-ty="' + t + '" class="' + (S.type === t ? 'on' : '') + '">' + (S.tab === 't1' ? T1VI[t] : T2VI[t]) + '</button>'; }).join('') + '</div>';
    h += '<div id="wrList"></div>';
    el.innerHTML = h;
    var list = el.querySelector('#wrList');
    function paintList() {
      var q = S.q.trim().toLowerCase(), out = '';
      if (S.tab === 'mock') {
        var mocks = mockHistory(ctx);
        var ents = ENT.filter(function (e) { return e.t1 && e.t2 && (!S.month || e.date.indexOf(S.month) === 0) && (!q || (e.t1.p + ' ' + e.t2[1]).toLowerCase().indexOf(q) !== -1); });
        out = '<div class="wr-grid">' + ents.slice(0, S.shown).map(function (e) {
          var mk = mocks[e.id];
          return '<button class="wr-mk" data-mock="' + e.id + '"><span class="d">' + e.date.slice(8) + '<small>Th ' + (+e.date.slice(5, 7)) + '</small></span><span style="min-width:0"><b>Đề thi ' + fmtD(e.date) + '</b><span class="s">Task 1: ' + esc(T1VI[e.t1.k]) + ' · Task 2: ' + esc(T2VI[e.t2[0]]) + ' — ' + esc(e.t2[1]) + '</span></span>' + (mk ? '<span class="sc">' + (mk.band ? 'Band ' + fmtB(mk.band) : 'Đã thi') + '</span>' : '<span class="sc"><i class="fa-solid fa-play"></i></span>') + '</button>';
        }).join('') + (ents.length ? '' : '<p class="wr-empty">Không có đề phù hợp.</p>') + '</div>';
        if (ents.length > S.shown) out += '<button class="wr-more" data-more="1">Xem thêm ' + Math.min(24, ents.length - S.shown) + ' đề</button>';
        list.innerHTML = out; return;
      }
      var items = allItems(S.tab).filter(function (i) { return (!S.month || i.date.indexOf(S.month) === 0) && (!S.type || i.kind === S.type) && (!q || (i.text + ' ' + i.title).toLowerCase().indexOf(q) !== -1); });
      out = '<div class="wr-grid">' + items.slice(0, S.shown).map(function (i) {
        var d = dm[i.id], img = i.task === 'task1' ? (i.promptHtml.match(/<img src="([^"]+)"/) || [])[1] : '';
        return '<button class="wr-card" data-open="' + i.id + '">' + (img ? '<span class="wr-thumb"><img src="' + img + '" alt="" loading="lazy"></span>' : '') +
          '<span class="wr-body"><span class="wr-meta"><span>' + fmtD(i.date) + '</span><span class="' + (i.task === 'task1' ? 'ty' : 't2') + '">' + esc(i.task === 'task1' ? T1VI[i.kind] : T2VI[i.kind]) + '</span></span>' +
          '<span class="wr-txt' + (i.task === 'task2' ? ' wr-q' : '') + '">' + esc(i.text) + '</span>' +
          '<span class="wr-st">' + (d ? '<span class="ok"><i class="fa-solid fa-check"></i> Đã viết ' + d.n + ' lần</span>' + (d.best ? '<span class="bd">' + fmtB(d.best) + '</span>' : '') : '<span>Chưa viết</span><i class="fa-solid fa-arrow-right"></i>') + '</span></span></button>';
      }).join('') + (items.length ? '' : '<p class="wr-empty">Không có đề phù hợp.</p>') + '</div>';
      if (items.length > S.shown) out += '<button class="wr-more" data-more="1">Xem thêm ' + Math.min(24, items.length - S.shown) + ' đề</button>';
      list.innerHTML = out;
    }
    paintList();
    var save = function () { try { localStorage.setItem('nvwr-hub', JSON.stringify({ tab: S.tab })); } catch (e) {} };
    el.onclick = function (ev) {
      var b = ev.target.closest('button'); if (!b || !el.contains(b)) return;
      if (b.dataset.tab) { S.tab = b.dataset.tab; S.type = ''; S.shown = 24; save(); paintHub(el, ctx); return; }
      if (b.dataset.m != null) { S.month = b.dataset.m; S.shown = 24; paintHub(el, ctx); return; }
      if (b.dataset.ty != null) { S.type = b.dataset.ty; S.shown = 24; paintHub(el, ctx); return; }
      if (b.dataset.more) { S.shown += 24; paintList(); return; }
      if (b.dataset.open) { ctx.open(b.dataset.open); return; }
      if (b.dataset.mock) { ctx.mock(b.dataset.mock); return; }
      if (b.dataset.act === 'mock') { if (S.tab !== 'mock') { S.tab = 'mock'; save(); paintHub(el, ctx); } var mk = ENT.filter(function (e) { return e.t1 && e.t2; }); ctx.mock(mk[Math.floor(Math.random() * Math.min(20, mk.length))].id); return; }
      if (b.dataset.act === 'rand') { var pool = allItems(S.tab === 't2' ? 't2' : 't1').filter(function (i) { return !dm[i.id]; }); if (!pool.length) pool = allItems('t1'); ctx.open(pool[Math.floor(Math.random() * pool.length)].id); }
    };
    var qi = el.querySelector('#wrQ'), tm = null;
    qi.oninput = function () { clearTimeout(tm); tm = setTimeout(function () { S.q = qi.value; S.shown = 24; paintList(); }, 200); };
  }
  function mockHistory(ctx) {
    var out = {}, MK = {}; try { MK = JSON.parse(localStorage.getItem('nvwr-mocks') || '{}'); } catch (e) {}
    (ctx.docs ? ctx.docs() : []).forEach(function (a) {
      if (!MK[a.id] || !a.submittedAt) return; var e = String(a.sourceBankId || '').replace(/^real_/, '').replace(/_t[12]$/, ''); var o = out[e] || (out[e] = {});
      o[a.task] = a.ai && a.ai.overall ? a.ai.overall : o[a.task] || 0;
      if (o.task1 && o.task2) o.band = overall(o.task1, o.task2);
    });
    return out;
  }
  function overall(b1, b2) { return Math.round(((b1 + 2 * b2) / 3) * 2) / 2; }

  /* ---------- THI THỬ ---------- */
  function openMock(entryId, ctx) {
    css();
    var e = ENT.filter(function (x) { return x.id === entryId; })[0]; if (!e || !e.t1 || !e.t2) return;
    var I1 = item('real_' + e.id + '_t1'), I2 = item('real_' + e.id + '_t2'), KEY = 'nvwr-mock:' + e.id, st = {};
    try { st = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (x) {}
    if (!st.end || st.end < Date.now() - 6 * 3600e3) st = { end: Date.now() + 60 * 60e3, a: '', b: '' };
    var cur = 't1', done = false;
    var wrap = document.createElement('div'); wrap.id = 'wr-mock';
    wrap.innerHTML = '<div class="wm-top"><button class="wm-btn wm-ghost" data-x="1"><i class="fa-solid fa-xmark"></i> Thoát</button><h3>Thi thử Writing · đề ' + fmtD(e.date) + '</h3><span class="wm-time" id="wmT">60:00</span><button class="wm-btn wm-sub" data-s="1"><i class="fa-solid fa-paper-plane"></i> Nộp bài</button></div>' +
      '<div class="wm-tabs"><button data-t="t1" class="on">Task 1<small id="wmC1">0 từ</small></button><button data-t="t2">Task 2<small id="wmC2">0 từ</small></button></div>' +
      '<div class="wm-main"><div class="wm-pane"><div class="wm-prompt" id="wmP"></div></div><div class="wm-ed"><textarea id="wmE" spellcheck="false" placeholder="Viết bài ở đây. Mỗi đoạn cách nhau 1 dòng trống."></textarea><div class="wm-foot"><span id="wmHint"></span><span class="wc" id="wmW">0 từ</span></div></div></div>';
    document.body.appendChild(wrap); var ov = document.body.style.overflow; document.body.style.overflow = 'hidden';
    var $ = function (s) { return wrap.querySelector(s); }, ed = $('#wmE');
    var wc = function (t) { return (String(t).trim().match(/[A-Za-z0-9’'-]+/g) || []).length; };
    function persist() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (x) {} }
    function counts() {
      var n1 = wc(st.a), n2 = wc(st.b), n = cur === 't1' ? n1 : n2, min = cur === 't1' ? 150 : 250;
      $('#wmC1').textContent = n1 + ' từ'; $('#wmC2').textContent = n2 + ' từ';
      var w = $('#wmW'); w.textContent = n + ' / ' + min + ' từ'; w.classList.toggle('ok', n >= min);
    }
    function show(t) {
      cur = t; wrap.querySelectorAll('.wm-tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); });
      $('#wmP').innerHTML = (t === 't1' ? I1 : I2).promptHtml; ed.value = t === 't1' ? st.a : st.b;
      $('#wmHint').textContent = t === 't1' ? 'Nên dành khoảng 20 phút' : 'Nên dành khoảng 40 phút'; counts(); ed.focus();
    }
    ed.oninput = function () { if (cur === 't1') st.a = ed.value; else st.b = ed.value; persist(); counts(); };
    var timer = setInterval(tick, 500);
    function tick() {
      var left = Math.max(0, st.end - Date.now()), m = Math.floor(left / 60000), s = Math.floor(left / 1000) % 60, T = $('#wmT');
      if (!T) return; T.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); T.classList.toggle('low', left < 5 * 60e3);
      if (!left && !done) submit(true);
    }
    function close() { clearInterval(timer); wrap.remove(); document.body.style.overflow = ov; if (ctx.onClose) ctx.onClose(); }
    function html(t) { return t.split(/\n\s*\n/).map(function (p) { return p.trim() ? '<p>' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>' : ''; }).join(''); }
    function submit(auto) {
      var n1 = wc(st.a), n2 = wc(st.b);
      if (!auto) {
        if (n1 < 20 && n2 < 20) { alert('Bạn chưa viết bài nào.'); return; }
        if (!confirm('Nộp bài thi thử?\nTask 1: ' + n1 + ' từ · Task 2: ' + n2 + ' từ\nAI sẽ chấm cả hai bài.')) return;
      }
      done = true; clearInterval(timer);
      var main = $('.wm-main'); $('.wm-tabs').style.display = 'none'; wrap.querySelector('[data-s]').style.display = 'none'; $('#wmT').style.display = 'none';
      main.style.display = 'flex';
      main.innerHTML = '<div class="wm-res"><h2>' + (auto ? 'Hết giờ — bài đã tự nộp' : 'Đã nộp bài') + '</h2><p class="wm-prog" id="wmS">Đang lưu bài...</p><div class="wm-two"><a id="wm1"><small>Task 1</small><b>…</b></a><a id="wm2"><small>Task 2</small><b>…</b></a></div><div id="wmO"></div></div>';
      var mockId = e.id + '_' + Date.now(), res = {};
      var run = function (I, txt, key, el) {
        if (wc(txt) < 20) { $(el).querySelector('b').textContent = '—'; $(el).insertAdjacentHTML('beforeend', '<small>Bỏ trống</small>'); return Promise.resolve(); }
        return ctx.grade(I, html(txt), txt, function (s) { var x = $('#wmS'); if (x) x.textContent = (key === 'task1' ? 'Task 1: ' : 'Task 2: ') + s; }, { mockId: mockId })
          .then(function (r) { res[key] = r; try { var MK = JSON.parse(localStorage.getItem('nvwr-mocks') || '{}'); MK[r.id] = mockId; localStorage.setItem('nvwr-mocks', JSON.stringify(MK)); } catch (x) {} var a = $(el); a.href = 'writing.html?id=' + r.id; a.querySelector('b').textContent = r.band ? fmtB(r.band) : 'Đã lưu'; a.insertAdjacentHTML('beforeend', '<small>' + (r.band ? 'Xem bài chữa →' : 'AI chưa chấm được — mở bài để chấm lại →') + '</small>'); })
          .catch(function (err) { $(el).querySelector('b').textContent = '!'; $(el).insertAdjacentHTML('beforeend', '<small>' + esc(err && err.message || 'Lỗi chấm') + '</small>'); });
      };
      run(I1, st.a, 'task1', '#wm1').then(function () { return run(I2, st.b, 'task2', '#wm2'); }).then(function () {
        try { localStorage.removeItem(KEY); } catch (x) {}
        var b1 = res.task1 && res.task1.band, b2 = res.task2 && res.task2.band;
        $('#wmS').textContent = b1 || b2 ? 'Chấm xong.' : 'Bài đã lưu. AI đang bận, bạn mở từng bài để chấm lại sau khoảng 1 phút.';
        $('#wmO').innerHTML = (b1 && b2 ? '<p style="margin:0;color:#55555f;font-weight:700">Band Writing ước tính (Task 2 tính hệ số 2)</p><div class="wm-band">' + fmtB(overall(b1, b2)) + '</div>' : '') + '<button class="wm-btn wm-sub" style="margin-top:16px" data-x="1">Về kho đề</button>';
      });
    }
    wrap.onclick = function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.t) show(b.dataset.t);
      if (b.dataset.s) submit(false);
      if (b.dataset.x) { if (!done && (wc(st.a) || wc(st.b)) && !confirm('Thoát thi thử? Bài đang viết vẫn được lưu trên máy, mở lại đề này để viết tiếp (đồng hồ vẫn chạy).')) return; close(); }
    };
    persist(); show('t1'); tick();
  }

  window.NVWR = { item: item, paintHub: paintHub, openMock: openMock, entries: ENT, svgOf: svgOf };
})();
