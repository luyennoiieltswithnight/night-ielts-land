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
      res.push({ p: p, paras: paras, groups: gs });
    });
    return res;
  }
  /* ---------- Kịch bản từng bước nhỏ ---------- */
  var TYPE_NAME = { tfng: 'True / False / Not Given', text: 'Điền từ', table: 'Điền bảng', wordbank: 'Summary chọn từ', mcq: 'Trắc nghiệm', inline: 'Điền tóm tắt', list_match: 'Nối thông tin', grid: 'Matching', matching: 'Matching', multi: 'Chọn nhiều đáp án', heading: 'Matching Headings' };
  function range(G) { var a = G.qs[0].num, b = G.qs[G.qs.length - 1].num; return a === b ? 'Câu ' + a : 'Câu ' + a + '–' + b; }
  function gName(G) { return range(G) + ' · ' + (TYPE_NAME[G.type] || G.type); }
  function firstSentence(t) { t = (t || '').replace(/\s+/g, ' ').trim(); var m = /^.{20,}?[.!?](\s|$)/.exec(t); return (m ? m[0] : t.slice(0, 160)).trim(); }
  function nums(a) { return a.map(function (x) { return x.num; }).join(', '); }

  function script(P) {
    var paras = P.paras, gs = P.groups, out = [], done = {}, ptr = gs.map(function () { return 0; });
    var nonH = gs.filter(function (G) { return G.kind !== 'H'; });
    var hasH = gs.some(function (G) { return G.kind === 'H'; });
    function add(o) { o.sec = o.sec == null ? -1 : o.sec; out.push(o); }

    /* Pre-reading */
    add({ sec: 'pre', st: 'book_2458', title: 'Pre-reading: đọc câu hỏi trước', html: 'Chưa đọc bài vội. Nhìn qua <b>' + gs.length + ' nhóm câu hỏi</b> để biết cần tìm gì.' + (hasH ? ' Đề có <b>Headings</b> → đọc từng đoạn xong mới chọn heading.' : '') });
    gs.forEach(function (G) {
      var o = { sec: 'pre', color: G.color, title: gName(G) };
      if (G.kind === 'A') { o.st = 'magnifier6_girl'; o.html = '<b>Nhóm A – Matching:</b> thông tin rải khắp bài, không theo thứ tự → đọc <b>HẾT</b> các câu, gạch keyword, rồi canh suốt bài.'; o.read = G.qs; }
      else if (G.kind === 'B') {
        o.st = 'pose_yubisashi_kakunin_businessman'; o.html = '<b>Nhóm B – theo thứ tự:</b> chỉ đọc <b>câu ' + G.qs[0].num + '</b>, gạch keyword. Giải xong câu nào mới đọc câu kế tiếp.'; o.read = [G.qs[0]];
        var bad = [], mx = -1; G.qs.forEach(function (x) { if (x.para >= 0) { if (x.para < mx) bad.push(x.num); mx = Math.max(mx, x.para); } });
        if (bad.length) o.warn = 'Nhóm này có câu <b>không theo thứ tự</b> (câu ' + bad.join(', ') + ' nằm trước câu liền trước nó) → khi thấy câu sau mà chưa thấy câu này thì nhớ quay lại đoạn trước.';
      } else { o.st = 'pose_puzzle_kumiawaseru'; o.html = '<b>Headings:</b> chưa cần đọc list. Đọc xong <b>mỗi đoạn</b> → tóm ý → chọn heading cho đoạn đó.'; }
      add(o);
    });

    /* Từng đoạn */
    for (var k = 0; k < paras.length; k++) {
      var pt = paraText(paras[k].el);
      add({ sec: k, para: k, st: 'book_inu_yomu_0009', title: 'Đọc đoạn ' + (k + 1) + ' – lấy ý chính (gist)', html: 'Đọc lướt cả đoạn, tự hỏi: <b>đoạn này nói về gì?</b>', quote: firstSentence(pt) });
      gs.forEach(function (G) {
        if (G.kind !== 'H') return;
        G.qs.forEach(function (x) { if (x.para === k && !done[x.num]) { done[x.num] = 1; add({ sec: k, para: k, color: G.color, st: 'pose_puzzle_kumiawaseru', title: 'Chọn heading cho đoạn ' + (k + 1), html: 'Dựa vào ý chính vừa đọc, chọn heading khớp nhất (cẩn thận heading chỉ khớp 1 chi tiết nhỏ).', reveal: x, gap: x }); } });
      });
      nonH.forEach(function (G) {
        var gi = gs.indexOf(G);
        if (G.kind === 'A') {
          var left = G.qs.filter(function (x) { return !done[x.num]; });
          if (!left.length) return;
          var hit = left.filter(function (x) { return x.para === k; });
          if (!hit.length) { add({ sec: k, para: k, color: G.color, st: 'pose_iraira_matsu_3103', title: gName(G), html: 'Rà keyword các câu còn lại (<b>' + nums(left) + '</b>) → đoạn này <b>không nhắc</b> → bỏ qua.', watch: left, no: 1 }); return; }
          hit.forEach(function (x) { done[x.num] = 1; add({ sec: k, para: k, color: G.color, st: 'denkyuu_on', title: 'Có! Câu ' + x.num + ' nằm ở đoạn này', html: 'Keyword của câu ' + x.num + ' xuất hiện ở đây → đối chiếu kỹ rồi chọn.', reveal: x }); });
          return;
        }
        var i = ptr[gi]; if (i >= G.qs.length) return;
        var any = false;
        while (i < G.qs.length) {
          var x = G.qs[i], nx = G.qs[i + 1];
          var tail = nx ? 'Xong → <b>đọc tiếp câu ' + nx.num + '</b>, xét luôn đoạn này.' : 'Xong nhóm ' + range(G) + '.';
          if (x.para >= 0 && x.para <= k) {
            done[x.num] = 1; any = true;
            add({ sec: k, para: k, color: G.color, st: 'denkyuu_on', title: 'Câu ' + x.num + (x.ng ? ': tìm thấy vùng liên quan' : ': có thông tin!'), html: x.ng ? 'Đoạn này nhắc tới chủ đề của câu ' + x.num + ' → so kỹ từng ý: bài <b>không nói</b> tới điểm cụ thể trong câu → NOT GIVEN.' : (x.para < k ? '' : 'Đoạn này chứa thông tin của câu ' + x.num + '.'), warn: x.para < k ? 'Đáp án <b>không theo thứ tự</b>: thông tin câu ' + x.num + ' nằm ở <b>đoạn ' + (x.para + 1) + '</b> phía trước → quay lại đọc.' : '', reveal: x, after: tail, backPara: x.para < k ? x.para : null });
            i++; continue;
          }
          if (x.para < 0) {
            var j = i + 1; while (j < G.qs.length && G.qs[j].para < 0) j++;
            if (j < G.qs.length && G.qs[j].para <= k) {
              done[x.num] = 1; any = true;
              add({ sec: k, para: k, color: G.color, st: 'pose_sagasu_kyorokyoro_woman_0851', title: 'Câu ' + x.num + ': bị “kẹp giữa”', html: 'Thông tin của câu ' + G.qs[j].num + ' đã xuất hiện mà vẫn không thấy câu ' + x.num + ' → nhiều khả năng <b>NOT GIVEN</b> (hoặc đọc lại kỹ đoạn giữa).', reveal: x, after: tail });
              i++; continue;
            }
          }
          add({ sec: k, para: k, color: G.color, st: 'pose_iraira_matsu_3103', title: gName(G), html: 'Đang canh <b>câu ' + x.num + '</b> → đoạn này ' + (any ? 'không còn' : 'chưa có') + ' thông tin → <b>để lại</b>, sang ' + (gi < gs.length - 1 ? 'nhóm tiếp theo' : 'đoạn sau') + '.', watch: [x], no: 1 });
          break;
        }
        ptr[gi] = i;
      });
    }

    /* Rà soát */
    var rest = [];
    gs.forEach(function (G) { G.qs.forEach(function (x) { if (!done[x.num]) rest.push(x); }); });
    add({ sec: 'rev', st: 'pose_yubisashi_kakunin_businessman', title: 'Rà soát cuối bài', html: rest.length ? 'Còn <b>' + rest.length + ' câu</b> chưa tìm thấy chỗ (' + nums(rest) + '). Lần lượt xử lý từng câu.' : 'Không còn câu nào để lại. Kiểm tra chính tả, giới hạn số từ, số ít / số nhiều.' });
    rest.forEach(function (x) { add({ sec: 'rev', color: x.group.color, st: 'pose_sagasu_kyorokyoro_woman_0851', title: 'Câu ' + x.num + ' (để lại)', html: x.ng ? 'Đọc lại cả bài vẫn không có thông tin → <b>NOT GIVEN</b>.' : 'Câu này cần suy luận từ nhiều chỗ / cả bài → đọc lại các đoạn liên quan.', reveal: x }); });
    add({ sec: 'rev', st: 'pose_doyagao_woman_0170', title: 'Xong Passage ' + P.p + '!', html: 'Đã đi hết ' + paras.length + ' đoạn. Bấm <b>Tiếp</b> để sang passage sau.' });
    return out;
  }

  /* ---------- Giao diện ---------- */
  var S = null; // {an, p, i, rev:{}}
  var IRA = (function () { try { return new URL('khoahoc/img/ira/', document.currentScript.src).href; } catch (e) { return '/khoahoc/img/ira/'; } })();
  var CSS = '' +
    'body.rs-on #panel-passage .content-wrapper.active > *{transition:opacity .25s,background .25s}' +
    'body.rs-on.rs-dim #panel-passage .content-wrapper.active > *:not(.rs-cur):not(h2){opacity:.32}' +
    '.rs-cur{background:#fff8e1;box-shadow:-10px 0 0 #fff8e1,10px 0 0 #fff8e1,-14px 0 0 #fbbf24;border-radius:2px}' +
    '.rs-back{background:#fff1f2;box-shadow:-10px 0 0 #fff1f2,10px 0 0 #fff1f2,-14px 0 0 #fb7185;opacity:1!important}' +
    '.rs-loc{border-radius:4px;padding:1px 2px;background:color-mix(in srgb,var(--rsc) 20%,transparent);box-shadow:inset 0 -2px 0 var(--rsc)}' +
    '.rs-badge{display:inline-block;min-width:20px;padding:0 6px;margin-right:4px;border-radius:10px;background:var(--rsc);color:#fff;font:700 11px/18px system-ui;text-align:center;vertical-align:1px}' +
    '.rs-qhit{outline:2.5px solid var(--rsc)!important;outline-offset:3px;border-radius:10px}' +
    '.rs-qwatch{outline:2px dashed var(--rsc)!important;outline-offset:3px;border-radius:10px}' +
    '.rs-qdone{opacity:.5}' +
    'body.rs-on .panel-content{padding-bottom:380px!important}' +
    '#rs-btn{background:#fff7d6;color:#7a5200;border:0;border-radius:999px;padding:7px 14px;font-weight:700;cursor:pointer;margin-right:6px}' +
    '#rs-card{position:fixed;left:50%;transform:translateX(-50%);bottom:14px;z-index:9999;width:min(1040px,calc(100vw - 24px));background:#fff;color:#1f2340;border-radius:20px;box-shadow:0 14px 40px rgba(60,40,140,.22),0 2px 6px rgba(0,0,0,.06);font:14px/1.5 "Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif;overflow:hidden;border-top:5px solid var(--rsc,#7c6cf0)}' +
    '#rs-card .rh{display:flex;align-items:center;gap:6px;padding:10px 12px 0}' +
    '#rs-card .rh .lb{font-size:12px;font-weight:700;color:#8a86a8;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#rs-card .pt{border:0;background:#f1effb;color:#5b51c9;font:700 12px system-ui;border-radius:999px;padding:3px 9px;cursor:pointer}' +
    '#rs-card .pt.on{background:#6d5dfc;color:#fff}' +
    '#rs-card .ic{border:0;background:transparent;color:#a3a0bd;font-size:16px;cursor:pointer;padding:2px 6px;border-radius:8px}' +
    '#rs-card .ic:hover{background:#f3f2fa}' +
    '#rs-card .dots{display:flex;gap:4px;padding:8px 14px 0;overflow-x:auto;scrollbar-width:none}' +
    '#rs-card .dots i{font-style:normal;flex:none;font:600 12px system-ui;padding:3px 9px;border-radius:999px;background:#f3f2fa;color:#8a86a8;cursor:pointer}' +
    '#rs-card .dots i.d{background:#e6e2fd;color:#6d5dfc}#rs-card .dots i.on{background:#6d5dfc;color:#fff;font-weight:800}' +
    '#rs-card .steps{display:flex;gap:6px;padding:10px 14px 2px;overflow-x:auto;scrollbar-width:thin;align-items:center}' +
    '#rs-card .steps b{flex:none;font:600 13px/1 system-ui;padding:8px 12px;border-radius:12px;border:1.5px solid #e4e1f3;color:#9a96b5;background:#fff;cursor:pointer;white-space:nowrap}' +
    '#rs-card .steps b.d{border-color:#d9d3fd;background:#f5f3ff;color:#6d5dfc}' +
    '#rs-card .steps b.on{border-color:var(--rsc,#6d5dfc);background:var(--rsc,#6d5dfc);color:#fff;font-weight:800;box-shadow:0 4px 12px color-mix(in srgb,var(--rsc,#6d5dfc) 40%,transparent);transform:scale(1.06)}' +
    '#rs-card .steps .ar{color:#c9c5dd;flex:none}' +
    '#rs-card .main{display:flex;gap:6px;align-items:stretch}' +
    '#rs-card .main > .rb{flex:1 1 44%}#rs-card .side{flex:1 1 56%;padding-top:6px;min-width:0}' +
    '#rs-card .rb{display:flex;gap:14px;padding:14px 16px 4px;align-items:flex-start;font-size:15px}' +
    '#rs-card .rb img{width:84px;height:84px;object-fit:contain;flex:none}' +
    '#rs-card .tt{font-weight:800;font-size:19px;line-height:1.3;margin-bottom:3px;color:#1f2340}' +
    '#rs-card .tx{color:#4a4e6a}' +
    '#rs-card .qt{margin:8px 14px 0;padding:8px 11px;border-radius:12px;background:#f7f6fd;color:#3d4060;font-size:13.5px}' +
    '#rs-card .qt b.n{display:inline-block;min-width:22px;text-align:center;border-radius:9px;background:var(--rsc);color:#fff;font-size:12px;margin-right:6px}' +
    '#rs-card .quote{margin:8px 14px 0;padding:8px 11px;border-left:3px solid #fbbf24;background:#fffbeb;border-radius:0 10px 10px 0;font-style:italic;color:#5c4a12;font-size:13.5px}' +
    '#rs-card .warn{margin:8px 14px 0;padding:8px 11px;border-radius:12px;background:#fff1f2;color:#9f1239;font-size:13.5px}' +
    '#rs-card .ans{margin:8px 14px 0;padding:9px 11px;border-radius:12px;background:#ecfdf3;color:#14532d}' +
    '#rs-card .ans .a{font-weight:800;font-size:15px}' +
    '#rs-card .ans .e{font-size:12.5px;color:#3f6b4f;margin-top:4px;max-height:96px;overflow:auto}' +
    '#rs-card .show{margin:8px 14px 0;width:calc(100% - 28px);border:1.5px dashed #9ee2b8;background:#f6fef9;color:#15803d;font-weight:700;border-radius:12px;padding:8px;cursor:pointer}' +
    '#rs-card .after{margin:8px 14px 0;font-size:13px;color:#5b51c9;font-weight:600}' +
    '#rs-card .rf{display:flex;gap:8px;padding:12px 14px 14px;align-items:center}' +
    '#rs-card .rf .k{font-size:11.5px;color:#a3a0bd;flex:1}' +
    '#rs-card .bk{border:0;background:#f1effb;color:#5b51c9;font-weight:700;border-radius:12px;padding:9px 14px;cursor:pointer}' +
    '#rs-card .nx{border:0;background:#6d5dfc;color:#fff;font-weight:800;border-radius:12px;padding:9px 20px;cursor:pointer;box-shadow:0 4px 12px rgba(109,93,252,.35)}' +
    '#rs-card.mini .rb,#rs-card.mini .qt,#rs-card.mini .quote,#rs-card.mini .warn,#rs-card.mini .ans,#rs-card.mini .show,#rs-card.mini .after,#rs-card.mini .dots{display:none}' +
    '#rs-card.mini .rf{padding-top:8px}' +
    '@media (max-width:760px){#rs-card .main{display:block}#rs-card .steps b{padding:6px 9px;font-size:12px}#rs-card .tt{font-size:16px}#rs-card .rb img{width:56px!important;height:56px!important}#rs-card .rf .k{visibility:hidden}#rs-card{right:8px;bottom:8px;width:auto;left:8px;transform:none;max-height:62vh;overflow:auto}#rs-card .rb img{width:48px;height:48px}}';

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
    $$('.rs-cur,.rs-back').forEach(function (e) { e.classList.remove('rs-cur', 'rs-back'); });
    $$('.rs-qhit,.rs-qdone,.rs-qwatch').forEach(function (e) { e.classList.remove('rs-qhit', 'rs-qdone', 'rs-qwatch'); e.style.removeProperty('--rsc'); });
  }
  function markLoc(x) {
    if (!x.locEl) return;
    x.locEl.classList.add('rs-loc'); x.locEl.style.setProperty('--rsc', x.group.color);
    var b = document.createElement('span'); b.className = 'rs-badge'; b.textContent = x.num; b.style.setProperty('--rsc', x.group.color);
    x.locEl.insertBefore(b, x.locEl.firstChild);
  }
  function markQ(x, cls) { var el = qBox(x.num); if (el) { el.classList.add(cls); el.style.setProperty('--rsc', x.group.color); } return el; }
  function ansOf(x) {
    var a = x.q.answer, ans = Array.isArray(a) ? a.join(' / ') : a;
    if (x.group.kind === 'H' && x.group.g.options) { var o = x.group.g.options.filter(function (t) { return new RegExp('^\\s*' + String(ans).trim() + '[.)\\s]', 'i').test(plain(t)); })[0]; if (o) ans = plain(o); }
    return ans;
  }
  function hl(el, cls) { if (el) el.classList.add(cls); }
  function scrollIn(el, block) { try { el && el.scrollIntoView({ block: block || 'center', behavior: 'smooth' }); } catch (e) {} }

  function render() {
    if (!S) return;
    var P = S.an[S.p - 1], L = P.script, o = L[S.i];
    clearMarks();
    var isPara = typeof o.sec === 'number';
    document.body.classList.toggle('rs-dim', isPara);
    // câu đã giải trước bước này → mờ
    for (var j = 0; j < S.i; j++) if (L[j].reveal && !(o.reveal && o.reveal.num === L[j].reveal.num)) { var e = qBox(L[j].reveal.num); if (e) e.classList.add('rs-qdone'); }
    var revealed = o.reveal && S.rev[S.p + ':' + S.i];
    if (isPara) {
      var pa = P.paras[o.para]; hl(pa.el, 'rs-cur'); pa.extra.forEach(function (e) { hl(e, 'rs-cur'); });
      if (o.backPara != null) { var bp = P.paras[o.backPara]; hl(bp.el, 'rs-back'); }
    }
    var focusQ = null, focusP = isPara ? (o.backPara != null ? P.paras[o.backPara].el : (P.paras[o.para].extra[0] || P.paras[o.para].el)) : null;
    (o.read || []).forEach(function (x) { var e = markQ(x, 'rs-qhit'); focusQ = focusQ || e; });
    (o.watch || []).forEach(function (x) { var e = markQ(x, 'rs-qwatch'); focusQ = focusQ || e; });
    if (o.reveal) {
      focusQ = markQ(o.reveal, 'rs-qhit');
      if (o.gap) { var g = $('.heading-gap[data-qnum="' + o.gap.num + '"]'); if (g) { g.classList.add('rs-qhit'); g.style.setProperty('--rsc', o.gap.group.color); } }
      if (revealed) { markLoc(o.reveal); if (o.reveal.locEl) focusP = o.reveal.locEl; }
    }
    if (focusP) scrollIn(focusP, revealed ? 'center' : 'start');
    if (focusQ) scrollIn(focusQ, 'start');

    // nhãn vị trí
    var lab = o.sec === 'pre' ? 'Pre-reading' : o.sec === 'rev' ? 'Rà soát' : 'Đoạn ' + (o.sec + 1) + '/' + P.paras.length;
    var inSec = L.filter(function (z) { return z.sec === o.sec; }), pos = inSec.indexOf(o) + 1;
    lab += ' · bước ' + pos + '/' + inSec.length;
    var secs = ['pre'].concat(P.paras.map(function (_, k) { return k; }), ['rev']);
    var curIdx = secs.indexOf(o.sec);
    var dots = secs.map(function (s, k) { var t = s === 'pre' ? 'Pre-reading' : s === 'rev' ? 'Rà soát' : 'Đoạn ' + (s + 1); return '<i data-sec="' + k + '" title="' + t + '" class="' + (k === curIdx ? 'on' : k < curIdx ? 'd' : '') + '">' + (s === 'pre' ? 'Pre' : s === 'rev' ? 'Rà soát' : 'Đ' + (s + 1)) + '</i>'; }).join('');
    var tabs = S.an.map(function (x) { return '<button class="pt' + (x.p === S.p ? ' on' : '') + '" data-p="' + x.p + '">P' + x.p + '</button>'; }).join('');

    function slab(z) {
      if (z.st === 'book_inu_yomu_0009') return 'Đọc gist';
      if (z.gap) return 'Heading';
      if (z.reveal) return 'Câu ' + z.reveal.num;
      if (z.no) { var G = z.watch[0].group; return range(G).replace('Câu ', 'C') + ' · để lại'; }
      if (z.sec === 'pre') return /·/.test(z.title) ? z.title.split(' · ')[0] : 'Tổng quan';
      return z.sec === 'rev' && /^Xong/.test(z.title) ? 'Xong' : 'Tổng quan';
    }
    var chips = inSec.map(function (z) { var ix = L.indexOf(z); return '<b data-i="' + ix + '" class="' + (z === o ? 'on' : ix < S.i ? 'd' : '') + '">' + slab(z) + '</b>'; }).join('<span class="ar">›</span>');
    var h = '<div class="rh">' + tabs + '<span class="lb">' + lab + '</span><button class="ic" data-k="mini" title="Thu gọn (M)">' + (S.mini ? '▴' : '▾') + '</button><button class="ic" data-k="close" title="Tắt (Esc)">✕</button></div>' +
      '<div class="dots">' + dots + '</div><div class="steps">' + chips + '</div><div class="main">' +
      '<div class="rb"><img src="' + IRA + (o.st || 'book_2458') + '.webp" alt=""><div><div class="tt">' + o.title + '</div><div class="tx">' + (o.html || '') + '</div></div></div>';
    h += '<div class="side">';
    if (o.quote) h += '<div class="quote">Câu chủ đề: ' + esc(o.quote) + '</div>';
    if (o.warn) h += '<div class="warn">' + o.warn + '</div>';
    if (o.reveal) {
      var x = o.reveal;
      h += '<div class="qt"><b class="n">' + x.num + '</b>' + esc(short(x.q.text, 140) || 'Câu ' + x.num) + '</div>';
      if (revealed) h += '<div class="ans"><div class="a">Đáp án: ' + esc(ansOf(x)) + '</div>' + (x.q.exp ? '<div class="e">' + esc(plain(x.q.exp)) + '</div>' : '') + '</div>' + (o.after ? '<div class="after">' + o.after + '</div>' : '');
      else h += '<button class="show" data-k="show">Hiện đáp án + chỗ có thông tin (Space)</button>';
    }
    h += '</div></div>';
    h += '<div class="rf"><span class="k">← → chuyển bước · Space hiện đáp án</span><button class="bk" data-k="prev">‹</button><button class="nx" data-k="next">' + (o.reveal && !revealed ? 'Hiện đáp án' : 'Tiếp ›') + '</button></div>';
    var card = $('#rs-card'); card.innerHTML = h; card.classList.toggle('mini', !!S.mini);
    card.style.setProperty('--rsc', o.color || '#7c6cf0');
    ['.steps .on', '.dots .on'].forEach(function (q) { var c = card.querySelector(q); if (c) try { c.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) {} });
  }

  function go(p, i) {
    if (!S) return;
    if (p !== S.p) { S.p = p; try { window.switchPassage && window.switchPassage(p); } catch (e) {} }
    S.i = Math.max(0, Math.min(S.an[S.p - 1].script.length - 1, i));
    render();
  }
  function next() {
    var L = S.an[S.p - 1].script, o = L[S.i];
    if (o.reveal && !S.rev[S.p + ':' + S.i]) { S.rev[S.p + ':' + S.i] = 1; return render(); }
    if (S.i + 1 < L.length) return go(S.p, S.i + 1);
    if (S.p < S.an.length) go(S.p + 1, 0);
  }
  function prev() {
    if (S.i > 0) return go(S.p, S.i - 1);
    if (S.p > 1) go(S.p - 1, S.an[S.p - 2].script.length - 1);
  }
  function onCard(e) {
    var b = e.target.closest('button,i[data-sec],b[data-i]'); if (!b) return;
    if (b.dataset.i != null) return go(S.p, +b.dataset.i);
    if (b.dataset.p) return go(+b.dataset.p, 0);
    if (b.dataset.sec != null) {
      var P = S.an[S.p - 1], secs = ['pre'].concat(P.paras.map(function (_, k) { return k; }), ['rev']), want = secs[+b.dataset.sec];
      for (var i = 0; i < P.script.length; i++) if (P.script[i].sec === want) return go(S.p, i);
      return;
    }
    var k = b.dataset.k;
    if (k === 'next') next(); else if (k === 'prev') prev();
    else if (k === 'show') { S.rev[S.p + ':' + S.i] = 1; render(); }
    else if (k === 'mini') { S.mini = !S.mini; render(); }
    else if (k === 'close') close();
  }
  function onKey(e) {
    if (!S) return;
    var t = e.target; if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    else if (e.key === ' ') { e.preventDefault(); S.rev[S.p + ':' + S.i] = 1; render(); }
    else if (e.key === 'm' || e.key === 'M') { S.mini = !S.mini; render(); }
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
    an.forEach(function (P) { P.script = script(P); });
    S = { an: an, p: curPassage(), i: 0, rev: {} };
    if (!$('#rs-css')) { var st = document.createElement('style'); st.id = 'rs-css'; st.textContent = CSS; document.head.appendChild(st); }
    var card = $('#rs-card'); if (!card) { card = document.createElement('div'); card.id = 'rs-card'; document.body.appendChild(card); card.addEventListener('click', onCard); }
    card.style.display = '';
    document.body.classList.add('rs-on');
    render();
  }
  function close() {
    clearMarks(); S = null;
    document.body.classList.remove('rs-on', 'rs-dim');
    var c = $('#rs-card'); if (c) c.style.display = 'none';
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
