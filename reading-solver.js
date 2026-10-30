/* Night IELTS — "Giải đề" Reading (chỉ tài khoản admin/thầy thấy nút).
   Mô phỏng cách thầy làm bài: Pre-reading (nhóm A đọc hết, nhóm B chỉ đọc câu đầu, Headings để sau),
   đọc từng đoạn → giải câu nào thông tin xuất hiện, câu chưa thấy thì để lại → cuối bài rà soát.
   Dùng chung cho MỌI đề reading/<set>/testN.html: chỉ đọc questionsData + <span id="loc-N"> trong bài.
   Không gọi AI, không tốn token. */
(function () {
  if (window.ReadingSolver) return;
  var FB_CONFIG = {
    apiKey: 'AIzaSyCmeN49M4oI78ZPWDhMlbisDOLaMJp2mb8',
    authDomain: 'night-ielts-land.firebaseapp.com',
    projectId: 'night-ielts-land',
    storageBucket: 'night-ielts-land.firebasestorage.app',
    messagingSenderId: '408519436407',
    appId: '1:408519436407:web:a9f0b9ba23368b54427e72'
  };
  var V = '10.8.1', CK = 'nrs_admin_uid';
  var A_TYPES = { list_match: 1, grid: 1, matching: 1, multi: 1 };
  var COLORS = ['#2563eb', '#d97706', '#059669', '#db2777', '#7c3aed', '#0891b2', '#dc2626', '#65a30d'];

  function data() { try { return (typeof questionsData !== 'undefined') ? questionsData : null; } catch (e) { return null; } }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function plain(h) { var d = document.createElement('div'); d.innerHTML = h || ''; return (d.textContent || '').replace(/\s+/g, ' ').trim(); }
  function short(h, n) { var t = plain(h); return t.length > n ? t.slice(0, n - 1) + '…' : t; }
  function isNG(a) { return /^\s*(not\s*given|ng)\s*$/i.test(String(a || '')); }

  /* ---------- Phân tích đề ---------- */
  function paragraphs(p) {
    var w = $('#passage-' + p + '-text'); if (!w) return [];
    var out = [], carry = null;
    $$(':scope > p, :scope > ul, :scope > ol, :scope > table, :scope > div, :scope > blockquote, :scope > h3, :scope > h4', w).forEach(function (el, i) {
      var t = (el.textContent || '').trim();
      if (!t && !el.querySelector('[id^="loc-"],.heading-gap,img')) return;
      if (/^READING PASSAGE\s*\d/i.test(t)) return;
      if (/^(H3|H4)$/.test(el.tagName) && !el.querySelector('[id^="loc-"]')) return;
      // Chữ cái đoạn đứng riêng ("A", "B"...) → gộp vào đoạn sau
      if (t.length <= 3 && !el.querySelector('[id^="loc-"]')) { carry = carry || []; carry.push(el); return; }
      out.push({ el: el, extra: carry || [] }); carry = null;
    });
    return out;
  }
  function paraText(el) { var c = el.cloneNode(true); $$('.heading-gap,.rs-badge', c).forEach(function (g) { g.remove(); }); return c.textContent; }
  function paraIndexOf(node, paras) {
    if (!node) return -1;
    for (var i = 0; i < paras.length; i++) if (paras[i].el === node || paras[i].el.contains(node)) return i;
    return -1;
  }
  function analyse() {
    var qd = data(); if (!qd) return null;
    var n = 0, res = [];
    qd.forEach(function (groups, pi) {
      var p = pi + 1, paras = paragraphs(p), gs = [];
      (groups || []).forEach(function (g, gi) {
        var kind = g.type === 'heading' ? 'H' : (A_TYPES[g.type] ? 'A' : 'B');
        var qs = (g.questions || []).map(function (q) {
          n++;
          var num = q.qNum || n;
          var locEl = q.loc ? document.getElementById(q.loc) : null;
          var para = paraIndexOf(locEl, paras);
          if (kind === 'H') {
            var gap = $('.heading-gap[data-qnum="' + num + '"]');
            var hp = paraIndexOf(gap, paras);
            if (hp < 0) { var m = /(\d+)|\b([A-Z])\b/.exec(plain(q.text)); if (m) hp = m[1] ? (+m[1] - 1) : (m[2].charCodeAt(0) - 65); }
            if (hp >= 0 && hp < paras.length) para = hp;
          }
          return { num: num, q: q, locEl: locEl, para: para, ng: isNG(q.answer), group: null };
        });
        var G = { idx: gi, kind: kind, type: g.type, g: g, qs: qs, color: COLORS[(gs.length) % COLORS.length] };
        qs.forEach(function (x) { x.group = G; });
        gs.push(G);
      });
      res.push({ p: p, paras: paras, groups: gs, steps: simulate(paras, gs) });
    });
    return res;
  }
  /* Mô phỏng: trả về danh sách bước. Mỗi bước: {kind:'pre'|'para'|'review', para, solved:[], waiting:[], heading:[], sandwich:[]} */
  function simulate(paras, gs) {
    var steps = [{ kind: 'pre', solved: [], waiting: [], heading: [], sandwich: [] }];
    var ptr = gs.map(function () { return 0; });
    var done = {};
    for (var k = 0; k < paras.length; k++) {
      var st = { kind: 'para', para: k, solved: [], waiting: [], heading: [], sandwich: [], watch: [] };
      gs.forEach(function (G, gi) {
        if (G.kind === 'H') {
          G.qs.forEach(function (x) { if (x.para === k && !done[x.num]) { st.heading.push(x); done[x.num] = 1; } });
        } else if (G.kind === 'A') {
          G.qs.forEach(function (x) { if (x.para === k && !done[x.num]) { st.solved.push(x); done[x.num] = 1; } });
        } else {
          var i = ptr[gi];
          while (i < G.qs.length) {
            var x = G.qs[i];
            if (x.para >= 0 && x.para <= k) { st.solved.push(x); done[x.num] = 1; i++; continue; }
            if (x.para < 0) {
              var j = i + 1; while (j < G.qs.length && G.qs[j].para < 0) j++;
              if (j < G.qs.length && G.qs[j].para <= k) { st.sandwich.push(x); done[x.num] = 1; i++; continue; }
            }
            break;
          }
          ptr[gi] = i;
          if (i < G.qs.length) st.watch.push(G.qs[i]);
        }
      });
      gs.forEach(function (G) { G.qs.forEach(function (x) { if (!done[x.num] && G.kind !== 'H') { var seen = G.kind === 'A' || st.watch.indexOf(x) >= 0; if (seen) st.waiting.push(x); } }); });
      steps.push(st);
    }
    var rest = [];
    gs.forEach(function (G) { G.qs.forEach(function (x) { if (!done[x.num]) rest.push(x); }); });
    steps.push({ kind: 'review', solved: [], waiting: rest, heading: [], sandwich: [] });
    return steps;
  }

  /* ---------- Giao diện ---------- */
  var S = null; // {an, p, step, showAns}
  var CSS = '' +
    'body.rs-on #panel-passage .content-wrapper.active > *{transition:opacity .25s}' +
    'body.rs-on.rs-dim #panel-passage .content-wrapper.active > *:not(.rs-cur):not(h2){opacity:.28}' +
    '.rs-cur{outline:3px solid #f59e0b;outline-offset:6px;border-radius:6px;background:#fffbeb}' +
    '.rs-loc{border-radius:4px;padding:0 2px;box-shadow:0 0 0 2px var(--rsc);background:color-mix(in srgb,var(--rsc) 18%,transparent)}' +
    '.rs-badge{display:inline-block;min-width:20px;padding:0 5px;margin-right:3px;border-radius:10px;background:var(--rsc);color:#fff;font:700 11px/18px system-ui;text-align:center;vertical-align:1px}' +
    '.rs-qhit{outline:3px solid var(--rsc)!important;outline-offset:2px;border-radius:8px;background:color-mix(in srgb,var(--rsc) 8%,transparent)}' +
    '.rs-qdone{opacity:.55}' +
    '.rs-qwatch{outline:2px dashed #f59e0b!important;outline-offset:2px;border-radius:8px}' +
    '.rs-qread{outline:2px solid var(--rsc)!important;outline-offset:2px;border-radius:8px}' +
    '#rs-btn{background:#1f2937;color:#fde68a;border:0;border-radius:8px;padding:7px 12px;font-weight:700;cursor:pointer;margin-right:6px}' +
    '#rs-bar{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:9999;width:min(980px,calc(100vw - 20px));background:#111827;color:#f9fafb;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.35);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;flex-direction:column;max-height:46vh}' +
    '#rs-bar .rs-top{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #374151;flex-wrap:wrap}' +
    '#rs-bar .rs-title{font-weight:800;color:#fde68a;margin-right:4px}' +
    '#rs-bar button{font:inherit;cursor:pointer;border:0;border-radius:8px;padding:5px 10px;background:#374151;color:#f9fafb}' +
    '#rs-bar button.on{background:#f59e0b;color:#111827;font-weight:700}' +
    '#rs-bar .rs-steps{display:flex;gap:4px;overflow-x:auto;flex:1;min-width:120px;scrollbar-width:thin}' +
    '#rs-bar .rs-steps button{padding:4px 9px;white-space:nowrap;font-size:13px}' +
    '#rs-bar .rs-steps button.has{box-shadow:inset 0 -3px 0 #34d399}' +
    '#rs-bar .rs-body{padding:10px 14px 12px;overflow:auto}' +
    '#rs-bar.mini .rs-body{display:none}' +
    'body.rs-on .panel-content{padding-bottom:40vh!important}' +
    '#rs-bar .rs-h{font-weight:800;font-size:15px;margin-bottom:6px}' +
    '#rs-bar .rs-sec{margin:8px 0 4px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#9ca3af;font-weight:700}' +
    '#rs-bar .rs-it{display:flex;gap:8px;align-items:flex-start;padding:6px 8px;border-radius:10px;background:#1f2937;margin:4px 0;cursor:pointer}' +
    '#rs-bar .rs-it:hover{background:#273244}' +
    '#rs-bar .rs-n{flex:none;min-width:26px;height:22px;border-radius:11px;background:var(--rsc);color:#fff;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center}' +
    '#rs-bar .rs-t{flex:1;min-width:0}' +
    '#rs-bar .rs-ans{color:#86efac;font-weight:700}' +
    '#rs-bar .rs-exp{color:#d1d5db;font-size:13px;margin-top:3px;display:none}' +
    '#rs-bar .rs-it.open .rs-exp{display:block}' +
    '#rs-bar .rs-tag{display:inline-block;font-size:11px;font-weight:700;padding:1px 7px;border-radius:9px;margin-right:6px;background:#374151;color:#e5e7eb}' +
    '#rs-bar .rs-muted{color:#9ca3af}' +
    '#rs-bar .rs-hide .rs-ans{filter:blur(6px)}' +
    '@media (max-width:640px){#rs-bar{bottom:0;border-radius:14px 14px 0 0;width:100vw;max-height:55vh}}';

  function groupLabel(G) {
    var nums = G.qs.map(function (x) { return x.num; });
    var r = nums.length > 1 ? 'Câu ' + nums[0] + '–' + nums[nums.length - 1] : 'Câu ' + nums[0];
    var name = { tfng: 'True/False/Not Given', text: 'Điền từ', table: 'Điền bảng', wordbank: 'Summary chọn từ', mcq: 'Trắc nghiệm', inline: 'Điền tóm tắt', list_match: 'Nối thông tin', grid: 'Matching (bảng)', matching: 'Matching', multi: 'Chọn nhiều đáp án', heading: 'Matching Headings' }[G.type] || G.type;
    return r + ' · ' + name;
  }
  function qBox(num) {
    var el = document.getElementById('q-container-' + num);
    if (el) return el;
    var inp = document.querySelector('[name="q' + num + '"]');
    if (inp) return inp.closest('.question-item,.question-group,tr') || inp;
    return document.getElementById('fb-' + num);
  }
  function clearMarks() {
    $$('.rs-badge').forEach(function (b) { b.remove(); });
    $$('.rs-loc').forEach(function (e) { e.classList.remove('rs-loc'); e.style.removeProperty('--rsc'); });
    $$('.rs-cur').forEach(function (e) { e.classList.remove('rs-cur'); });
    $$('.rs-qhit,.rs-qdone,.rs-qwatch,.rs-qread').forEach(function (e) { e.classList.remove('rs-qhit', 'rs-qdone', 'rs-qwatch', 'rs-qread'); e.style.removeProperty('--rsc'); });
  }
  function markLoc(x) {
    if (!x.locEl) return;
    x.locEl.classList.add('rs-loc'); x.locEl.style.setProperty('--rsc', x.group.color);
    var b = document.createElement('span'); b.className = 'rs-badge'; b.textContent = x.num; b.style.setProperty('--rsc', x.group.color);
    x.locEl.insertBefore(b, x.locEl.firstChild);
  }
  function markQ(x, cls) { var el = qBox(x.num); if (el) { el.classList.add(cls); el.style.setProperty('--rsc', x.group.color); } }

  function itemHtml(x, note) {
    var a = x.q.answer, ans = Array.isArray(a) ? a.join(' / ') : a;
    if (x.group.kind === 'H' && x.group.g.options) { var o = x.group.g.options.filter(function (t) { return new RegExp('^\\s*' + String(ans).trim() + '[.)\\s]', 'i').test(plain(t)); })[0]; if (o) ans = plain(o); }
    return '<div class="rs-it" data-q="' + x.num + '" style="--rsc:' + x.group.color + '"><div class="rs-n">' + x.num + '</div><div class="rs-t">' +
      (note ? '<span class="rs-tag">' + note + '</span>' : '') +
      '<span>' + esc(short(x.q.text, 110) || ('Câu ' + x.num)) + '</span>' +
      (ans != null && ans !== '' ? ' → <span class="rs-ans">' + esc(ans) + '</span>' : '') +
      (x.q.exp ? '<div class="rs-exp">' + esc(plain(x.q.exp)) + '</div>' : '') +
      '</div></div>';
  }

  function render() {
    if (!S) return;
    var P = S.an[S.p - 1]; if (!P) return;
    var st = P.steps[S.step];
    clearMarks();
    document.body.classList.toggle('rs-dim', st.kind === 'para');
    var html = '', i;
    var doneSet = {};
    for (i = 1; i < S.step; i++) P.steps[i].solved.concat(P.steps[i].heading, P.steps[i].sandwich).forEach(function (x) { doneSet[x.num] = 1; });

    if (st.kind === 'pre') {
      html += '<div class="rs-h">Bước 0 · Pre-reading — đọc câu hỏi trước khi đọc bài</div>';
      P.groups.forEach(function (G) {
        var how, show = [];
        if (G.kind === 'A') { how = 'Nhóm A · matching → đọc HẾT các câu, gạch keyword, rồi canh suốt bài'; show = G.qs; }
        else if (G.kind === 'B') { how = 'Nhóm B · theo thứ tự → chỉ đọc câu ĐẦU (' + G.qs[0].num + '), giải xong mới đọc câu tiếp'; show = [G.qs[0]]; }
        else { how = 'Headings → chưa đọc list; đọc xong MỖI đoạn mới chọn heading cho đoạn đó'; }
        html += '<div class="rs-it" style="--rsc:' + G.color + ';cursor:default"><div class="rs-n">' + (G.kind) + '</div><div class="rs-t"><b>' + esc(groupLabel(G)) + '</b><br><span class="rs-muted">' + how + '</span></div></div>';
        show.forEach(function (x) { markQ(x, 'rs-qread'); });
      });
      var anyH = P.groups.some(function (G) { return G.kind === 'H'; });
      html += '<div class="rs-muted" style="margin-top:6px">Có ' + P.paras.length + ' đoạn. ' + (anyH ? 'Đề có Headings → đọc từng đoạn, chốt heading ngay sau đoạn đó.' : 'Đọc lần lượt từng đoạn, câu nào thấy thông tin thì giải.') + '</div>';
      var first = P.groups.filter(function (G) { return G.kind !== 'H'; })[0];
      if (first) { var el = qBox(first.qs[0].num); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    } else if (st.kind === 'para') {
      var para = P.paras[st.para];
      para.el.classList.add('rs-cur'); para.extra.forEach(function (e) { e.classList.add('rs-cur'); });
      try { (para.extra[0] || para.el).scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {}
      html += '<div class="rs-h">Đoạn ' + (st.para + 1) + '/' + P.paras.length + ' <span class="rs-muted" style="font-weight:400">— ' + esc(short(paraText(para.el), 70)) + '</span></div>';
      if (st.heading.length) { html += '<div class="rs-sec">Chọn heading cho đoạn này</div>'; st.heading.forEach(function (x) { html += itemHtml(x, 'Heading'); var g = $('.heading-gap[data-qnum="' + x.num + '"]'); if (g) { g.classList.add('rs-qhit'); g.style.setProperty('--rsc', x.group.color); } markQ(x, 'rs-qhit'); }); }
      if (st.solved.length) { html += '<div class="rs-sec">Giải được ngay trong đoạn này</div>'; st.solved.forEach(function (x) { html += itemHtml(x, x.group.kind === 'A' ? 'Nhóm A' : 'Nhóm B'); markLoc(x); markQ(x, 'rs-qhit'); }); }
      if (st.sandwich.length) { html += '<div class="rs-sec">Bị “kẹp giữa” — câu sau đã thấy mà câu này không có → nghiêng NOT GIVEN / kiểm lại</div>'; st.sandwich.forEach(function (x) { html += itemHtml(x, 'Kẹp giữa'); markQ(x, 'rs-qhit'); }); }
      if (!st.heading.length && !st.solved.length && !st.sandwich.length) html += '<div class="rs-muted">Đoạn này không chứa đáp án nào → đọc lướt, nắm ý rồi đi tiếp.</div>';
      if (st.watch.length || st.waiting.length) {
        var w = st.watch.map(function (x) { return x.num; });
        var waitA = st.waiting.filter(function (x) { return x.group.kind === 'A'; }).map(function (x) { return x.num; });
        html += '<div class="rs-sec">Để lại · mang sang đoạn sau</div><div class="rs-muted">' +
          (w.length ? 'Đang canh (nhóm B): <b style="color:#fde68a">' + w.join(', ') + '</b>. ' : '') +
          (waitA.length ? 'Nhóm A chưa thấy: ' + waitA.join(', ') + '.' : '') + '</div>';
        st.watch.forEach(function (x) { markQ(x, 'rs-qwatch'); });
      }
    } else {
      html += '<div class="rs-h">Rà soát cuối bài</div>';
      if (!st.waiting.length) html += '<div class="rs-muted">Không còn câu nào để lại. Kiểm tra chính tả, số từ (NO MORE THAN…), số ít/số nhiều.</div>';
      else {
        html += '<div class="rs-muted" style="margin-bottom:4px">Các câu chưa tìm thấy chỗ trong bài → thường là NOT GIVEN, hoặc phải suy luận cả bài.</div>';
        st.waiting.forEach(function (x) { html += itemHtml(x, x.ng ? 'Not Given' : 'Còn lại'); markQ(x, 'rs-qwatch'); });
      }
    }
    Object.keys(doneSet).forEach(function (n) { var el = qBox(n); if (el && !el.classList.contains('rs-qhit')) el.classList.add('rs-qdone'); });

    var bar = $('#rs-bar');
    var tabs = S.an.map(function (x) { return '<button data-p="' + x.p + '" class="' + (x.p === S.p ? 'on' : '') + '">P' + x.p + '</button>'; }).join('');
    var steps = P.steps.map(function (s, j) {
      var lab = s.kind === 'pre' ? 'Pre' : s.kind === 'review' ? 'Rà soát' : 'Đ' + (s.para + 1);
      var has = (s.solved.length + s.heading.length + s.sandwich.length) > 0;
      return '<button data-s="' + j + '" class="' + (j === S.step ? 'on ' : '') + (has ? 'has' : '') + '">' + lab + '</button>';
    }).join('');
    bar.innerHTML = '<div class="rs-top"><span class="rs-title">Giải đề</span>' + tabs +
      '<button data-k="prev" title="Phím ←">‹</button><div class="rs-steps">' + steps + '</div><button data-k="next" title="Phím →">›</button>' +
      '<button data-k="ans" class="' + (S.showAns ? 'on' : '') + '" title="Phím A">' + (S.showAns ? 'Đáp án: hiện' : 'Đáp án: che') + '</button>' +
      '<button data-k="mini" title="Thu gọn (M)">' + (bar.classList.contains('mini') ? '▴' : '▾') + '</button><button data-k="close" title="Esc">✕</button></div><div class="rs-body ' + (S.showAns ? '' : 'rs-hide') + '">' + html + '</div>';
    var on = bar.querySelector('.rs-steps .on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  function go(p, step) {
    if (!S) return;
    if (p !== S.p) { S.p = p; try { window.switchPassage && window.switchPassage(p); } catch (e) {} }
    var n = S.an[S.p - 1].steps.length;
    S.step = Math.max(0, Math.min(n - 1, step));
    render();
  }
  function onBar(e) {
    var b = e.target.closest('button'), it = e.target.closest('.rs-it[data-q]');
    if (b) {
      if (b.dataset.p) return go(+b.dataset.p, 0);
      if (b.dataset.s) return go(S.p, +b.dataset.s);
      var k = b.dataset.k;
      if (k === 'prev') return step(-1);
      if (k === 'next') return step(1);
      if (k === 'ans') { S.showAns = !S.showAns; return render(); }
      if (k === 'close') return close();
      if (k === 'mini') { $('#rs-bar').classList.toggle('mini'); return render(); }
    } else if (it) {
      it.classList.toggle('open');
      var n = it.dataset.q, el = qBox(n);
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      var loc = document.querySelector('.rs-loc .rs-badge') && Array.prototype.find.call(document.querySelectorAll('.rs-badge'), function (x) { return x.textContent == n; });
      if (loc) loc.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }
  function step(d) {
    var n = S.an[S.p - 1].steps.length, s = S.step + d;
    if (s >= n && S.p < S.an.length) return go(S.p + 1, 0);
    if (s < 0 && S.p > 1) return go(S.p - 1, S.an[S.p - 2].steps.length - 1);
    go(S.p, s);
  }
  function onKey(e) {
    if (!S) return;
    var t = e.target; if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'a' || e.key === 'A') { S.showAns = !S.showAns; render(); }
    else if (e.key === 'm' || e.key === 'M') { $('#rs-bar').classList.toggle('mini'); render(); }
    else if (e.key === 'Escape') close();
  }
  function curPassage() {
    for (var p = 1; p <= 3; p++) { var w = $('#passage-' + p + '-text'); if (w && w.classList.contains('active')) return p; }
    return 1;
  }
  function open() {
    var setup = $('#setup-screen');
    if (setup && getComputedStyle(setup).display !== 'none') {
      try { if (window.selectMode) window.selectMode('practice'); if (window.startTest) window.startTest(); } catch (e) {}
    }
    var an = analyse(); if (!an || !an.length) return;
    S = { an: an, p: curPassage(), step: 0, showAns: true };
    if (!$('#rs-css')) { var st = document.createElement('style'); st.id = 'rs-css'; st.textContent = CSS; document.head.appendChild(st); }
    var bar = $('#rs-bar'); if (!bar) { bar = document.createElement('div'); bar.id = 'rs-bar'; document.body.appendChild(bar); bar.addEventListener('click', onBar); }
    bar.style.display = '';
    document.body.classList.add('rs-on');
    render();
  }
  function close() {
    clearMarks(); S = null;
    document.body.classList.remove('rs-on', 'rs-dim');
    var bar = $('#rs-bar'); if (bar) bar.style.display = 'none';
  }
  document.addEventListener('keydown', onKey);

  /* ---------- Nút chỉ cho admin ---------- */
  function addBtn() {
    if ($('#rs-btn') || !data()) return;
    var host = $('.header-right'); if (!host) return;
    if (!$('#rs-css')) { var st = document.createElement('style'); st.id = 'rs-css'; st.textContent = CSS; document.head.appendChild(st); }
    var b = document.createElement('button'); b.id = 'rs-btn'; b.type = 'button'; b.textContent = 'Giải đề'; b.title = 'Chế độ giải đề theo phương pháp của thầy (chỉ thầy thấy)';
    b.onclick = function () { S ? close() : open(); };
    host.insertBefore(b, host.firstChild);
    var box = $('#setup-screen .modal-box');
    if (box && !$('#rs-btn2')) {
      var b2 = document.createElement('button'); b2.id = 'rs-btn2'; b2.type = 'button'; b2.textContent = 'Giải đề cùng thầy';
      b2.style.cssText = 'display:block;margin:12px auto 0;background:#1f2937;color:#fde68a;border:0;border-radius:10px;padding:10px 18px;font-weight:700;cursor:pointer';
      b2.onclick = open; box.appendChild(b2);
    }
  }
  function removeBtn() { ['#rs-btn', '#rs-btn2'].forEach(function (k) { var b = $(k); if (b) b.remove(); }); close(); }
  function checkAdmin() {
    try { if (localStorage.getItem(CK)) addBtn(); } catch (e) {}
    Promise.all([
      import('https://www.gstatic.com/firebasejs/' + V + '/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/' + V + '/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/' + V + '/firebase-firestore.js')
    ]).then(function (m) {
      var t0 = Date.now();
      (function wait() {
        var app = m[0].getApps().length ? m[0].getApp() : (Date.now() - t0 > 6000 ? m[0].initializeApp(FB_CONFIG) : null);
        if (!app) return setTimeout(wait, 200);
        m[1].onAuthStateChanged(m[1].getAuth(app), function (u) {
          if (!u) { try { localStorage.removeItem(CK); } catch (e) {} return removeBtn(); }
          m[2].getDoc(m[2].doc(m[2].getFirestore(app), 'users', u.uid)).then(function (d) {
            var ok = d.exists() && d.data().role === 'admin';
            try { ok ? localStorage.setItem(CK, u.uid) : localStorage.removeItem(CK); } catch (e) {}
            ok ? addBtn() : removeBtn();
          }).catch(function () {});
        });
      })();
    }).catch(function () {});
  }

  window.ReadingSolver = { open: open, close: close, analyse: analyse, _enable: addBtn };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', checkAdmin); else checkAdmin();
})();
