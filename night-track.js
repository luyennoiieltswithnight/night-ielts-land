/*
 * NIGHT IELTS — night-track.js (dùng chung cho mọi đề Reading / Listening)
 * Nạp ở cuối mỗi file đề:
 *   <script src="https://luyennoiieltswithnight.github.io/night-ielts-land/night-track.js" defer></script>
 *
 * Khi học sinh (đã đăng nhập ở trang chủ) nộp cả đề hoặc chấm riêng 1 Passage / 1 Section:
 *  1. Tự đánh dấu HOÀN THÀNH các bài Thầy đã giao trùng đề này (kể cả khi học sinh mở đề từ
 *     thư viện thay vì bấm vào bài được giao) — để trang Tiến độ không còn báo "chưa làm".
 *  2. Gửi bản ghi bài làm sang Google Docs riêng của học sinh (thẻ Reading / Listening):
 *     ngày giờ, điểm, từng câu (bạn chọn / đáp án / đúng sai / giải thích câu sai), và bài đọc /
 *     transcript KÈM các chỗ học sinh đã tô màu, gạch chân, ghi chú.
 * Không đụng tới phần chấm điểm có sẵn của đề; lỗi ở đây không ảnh hưởng gì tới việc làm bài.
 */
(function () {
  if (window.__nightTrackLoaded) return;
  window.__nightTrackLoaded = true;

  var WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwsYqBxEnJsLOx4yQNyqWHqOiV3yfNSTOXav5JV15YN3grkXYeQxxyAsLiO-8l8lyJLAw/exec';
  var FB_CONFIG = {
    apiKey: 'AIzaSyCmeN49M4oI78ZPWDhMlbisDOLaMJp2mb8',
    authDomain: 'night-ielts-land.firebaseapp.com',
    projectId: 'night-ielts-land',
    storageBucket: 'night-ielts-land.firebasestorage.app',
    messagingSenderId: '408519436407',
    appId: '1:408519436407:web:a9f0b9ba23368b54427e72'
  };

  // ---- Đọc biến của đề (khai báo const/let ở script chính nên đọc trực tiếp theo tên) ----
  function g(name) { try { return (0, eval)(name); } catch (e) { return undefined; } }
  var isListening = typeof g('sectionRanges') !== 'undefined';
  var KIND = isListening ? 'listening' : 'reading';
  var TAB = isListening ? 'Listening' : 'Reading';
  var params = new URLSearchParams(location.search);
  var ASSIGN_ID = params.get('assignmentId');
  var ASSIGN_SCOPE = params.get('scope') || 'all';
  var PAGE = (function () {
    var p = decodeURIComponent(location.pathname);
    var m = p.match(/((?:reading|listening)\/[^?#]+\.html)$/i);
    return m ? m[1] : p.split('/').pop();
  })();

  function ranges() { return g(isListening ? 'sectionRanges' : 'passageRanges') || []; }
  function testData() { return g('testData') || {}; }

  // ---- Firebase (dùng chung phiên đăng nhập của trang chủ) ----
  var fbP = null;
  function fb() {
    if (fbP) return fbP;
    fbP = Promise.all([
      import('https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js')
    ]).then(function (m) {
      var app;
      try { app = m[0].getApp(); } catch (e) {
        try { app = m[0].initializeApp(FB_CONFIG); } catch (e2) { app = m[0].getApp(); }
      }
      var o = { fs: m[2], auth: m[1].getAuth(app), db: m[2].getFirestore(app) };
      return new Promise(function (res) {
        var un = m[1].onAuthStateChanged(o.auth, function (u) { un(); o.user = u; res(o); });
      });
    });
    return fbP;
  }
  setTimeout(function () { fb().catch(function () {}); }, 2000);

  // ---- Đọc câu trả lời / đúng sai ----
  function answerOf(q) {
    var els = document.getElementsByName('q' + q);
    if (!els.length) return '';
    if (els[0].type === 'radio') { for (var i = 0; i < els.length; i++) if (els[i].checked) return els[i].value; return ''; }
    if (els[0].type === 'checkbox') { var v = []; for (var j = 0; j < els.length; j++) if (els[j].checked) v.push(els[j].value); return v.join(', '); }
    return String(els[0].value || '').trim();
  }
  function isCorrect(q) {
    var fbBox = document.getElementById('fb-' + q);
    if (fbBox && /\bcorrect\b/.test(fbBox.className) && !/\bincorrect\b/.test(fbBox.className)) return true;
    if (fbBox && /\bincorrect\b/.test(fbBox.className)) return false;
    return null;
  }
  function correctOf(q) {
    var d = testData()[q] || {};
    var f = g('firstAnswerForm');
    try { if (typeof f === 'function') return String(f(d.answer || '')); } catch (e) {}
    return String(d.answer || '');
  }
  function plain(html) { var t = document.createElement('div'); t.innerHTML = html || ''; return (t.textContent || '').replace(/\s+/g, ' ').trim(); }
  function cleanText(el, target) {
    var c = el.cloneNode(true);
    if (target) { var t = c.querySelector('[data-nt-target]'); if (t) t.replaceWith(' \u27e6?\u27e7 '); }
    c.querySelectorAll('input[type=text], select, textarea').forEach(function (x) { x.replaceWith(' ____ '); });
    c.querySelectorAll('input, button, .feedback-box, .q-num, .explanation-text, .options-tf').forEach(function (x) { x.remove(); });
    return (c.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function questionText(q) {
    var el = document.getElementById('q-container-' + q);
    var inp = document.getElementsByName('q' + q)[0];
    if (!el && inp) el = inp.closest('li, tr, p, .question-item') || inp.parentElement;
    var txt = el ? cleanText(el) : '';
    if (txt.replace(/_/g, '').trim().length >= 4 || !inp || inp.type !== 'text') return txt.slice(0, 180);
    // ô trống trong bảng / ghi chú: lấy đoạn chữ ngay quanh ô trống ở khối bao ngoài
    var box = el;
    for (var k = 0; box && k < 4; k++) {
      box = box.parentElement; if (!box) break;
      inp.setAttribute('data-nt-target', '1');
      var full = cleanText(box, true);
      inp.removeAttribute('data-nt-target');
      var i = full.indexOf('\u27e6?\u27e7');
      if (i !== -1 && full.replace(/_|\u27e6\?\u27e7/g, '').trim().length >= 4) {
        return ((i > 70 ? '…' : '') + full.slice(Math.max(0, i - 70), i + 60) + (full.length > i + 60 ? '…' : '')).replace('\u27e6?\u27e7', '____');
      }
    }
    return txt.slice(0, 180);
  }
  function answeredCount(a, b) { var n = 0; for (var q = a; q <= b; q++) if (answerOf(q)) n++; return n; }

  // ---- Chuyển 1 đoạn chữ (có tô màu / gạch chân / ghi chú của học sinh) thành các "run" có định dạng ----
  function toHex(c) {
    var m = String(c || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return /^#/.test(c) ? c : null;
    if (m[4] !== undefined && parseFloat(m[4]) === 0) return null;
    return '#' + [m[1], m[2], m[3]].map(function (x) { return ('0' + Number(x).toString(16)).slice(-2); }).join('');
  }
  function styleOf(node, root) {
    var st = {};
    for (var el = node.parentElement; el && el !== root; el = el.parentElement) {
      var cl = el.classList;
      if (cl.contains('user-highlight') && !st.bg) st.bg = toHex(el.style.backgroundColor) || '#fff59d';
      var td = (el.style.textDecoration || el.style.textDecorationLine || '');
      if (/underline/.test(td)) st.u = true;
      if (/line-through/.test(td)) st.s = true;
      if (cl.contains('user-note-phrase') || el.tagName === 'B' || el.tagName === 'STRONG') st.b = true;
      if (cl.contains('reading-note')) { st.i = true; st.c = '#c62828'; st.b = true; }
    }
    return st;
  }
  var BLOCK = /^(P|LI|H1|H2|H3|H4|H5|H6|DIV|TR|BLOCKQUOTE|TABLE|UL|OL)$/;
  function paragraphsOf(root) {
    var paras = [], cur = [];
    function flush() { var txt = cur.map(function (r) { return r.t; }).join('').replace(/\s+/g, ' ').trim(); if (txt) paras.push(merge(cur)); cur = []; }
    function walk(n) {
      if (n.nodeType === 3) { if (n.data) { var s = styleOf(n, root); s.t = n.data.replace(/\s+/g, ' '); cur.push(s); } return; }
      if (n.nodeType !== 1) return;
      var tag = n.tagName;
      if (/^(SCRIPT|STYLE|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(tag)) return;
      if (n.classList && (n.classList.contains('note-pending-highlight') && false)) return;
      var block = BLOCK.test(tag);
      if (block) flush();
      if (tag === 'BR') { flush(); return; }
      for (var c = n.firstChild; c; c = c.nextSibling) walk(c);
      if (block) flush();
    }
    walk(root); flush();
    return paras;
  }
  function merge(runs) {
    var out = [];
    runs.forEach(function (r) {
      var last = out[out.length - 1];
      if (last && last.bg === r.bg && !!last.b === !!r.b && !!last.i === !!r.i && !!last.u === !!r.u && !!last.s === !!r.s && last.c === r.c) last.t += r.t;
      else out.push({ t: r.t, bg: r.bg || undefined, b: r.b || undefined, i: r.i || undefined, u: r.u || undefined, s: r.s || undefined, c: r.c || undefined });
    });
    if (out.length) { out[0].t = out[0].t.replace(/^\s+/, ''); out[out.length - 1].t = out[out.length - 1].t.replace(/\s+$/, ''); }
    return out.filter(function (r) { return r.t; });
  }
  function hasUserMarks(el) { return !!(el && el.querySelector('.user-annotation')); }

  // ---- Dựng nội dung gửi sang Google Docs ----
  function buildLog(range, label, score, total, band) {
    var blocks = [];
    var mode = g('appMode');
    blocks.push({ k: 'p', r: [{ t: label + ' · Đúng ' + score + '/' + total + (band ? ' · Band ước tính ' + band : '') + (mode === 'exam' ? ' · thi thử' : ''), b: true }] });

    // Bảng câu hỏi
    var rows = [['Câu', 'Câu hỏi', 'Bạn trả lời', 'Đáp án', '']];
    var marks = [null];
    var wrongs = [];
    for (var q = range[0]; q <= range[1]; q++) {
      var ok = isCorrect(q), mine = answerOf(q), right = correctOf(q);
      rows.push([String(q), questionText(q), mine || '(bỏ trống)', right, ok === true ? 'Đúng' : ok === false ? 'Sai' : '']);
      marks.push(ok === true ? '#e8f5e9' : ok === false ? '#fdecea' : null);
      if (ok === false) { var exp = plain((testData()[q] || {}).exp); if (exp) wrongs.push({ q: q, exp: exp.slice(0, 600) }); }
    }
    blocks.push({ k: 'h', t: 'Câu hỏi và đáp án' });
    blocks.push({ k: 'table', rows: rows, marks: marks });
    if (wrongs.length) {
      blocks.push({ k: 'h', t: 'Giải thích các câu sai' });
      wrongs.forEach(function (w) { blocks.push({ k: 'p', r: [{ t: 'Câu ' + w.q + ': ', b: true }, { t: w.exp }] }); });
    }

    // Ghi chú / tô màu trong phần câu hỏi
    var qBlocks = [];
    document.querySelectorAll('.user-annotation').forEach(function (a) {
      if (a.closest('[id^="passage-"][id$="-text"]')) return;
      var b = a.closest('.question-item, li, tr, p, .question-group');
      if (b && qBlocks.indexOf(b) === -1) qBlocks.push(b);
    });
    if (qBlocks.length) {
      blocks.push({ k: 'h', t: 'Ghi chú của bạn trong phần câu hỏi' });
      qBlocks.slice(0, 40).forEach(function (b) { paragraphsOf(b).forEach(function (r) { blocks.push({ k: 'p', r: r }); }); });
    }

    // Bài đọc / transcript có ghi chú (chỉ phần đang chấm, chỉ khi học sinh có đánh dấu)
    var rs = ranges();
    for (var p = 0; p < rs.length; p++) {
      if (!rs[p] || rs[p][1] < range[0] || rs[p][0] > range[1]) continue;
      var el = document.getElementById('passage-' + (p + 1) + '-text');
      if (!el || !hasUserMarks(el)) continue;
      var name = el.getAttribute('data-title') || '';
      blocks.push({ k: 'h', t: (isListening ? 'Transcript Section ' : 'Passage ') + (p + 1) + (name ? ' — ' + name : '') + ' (kèm ghi chú của bạn)' });
      paragraphsOf(el).forEach(function (r) { blocks.push({ k: 'p', r: r }); });
    }
    return blocks;
  }

  var sent = {};
  function sendDocLog(uid, title, blocks) {
    var body = JSON.stringify({ action: 'docLog', uid: uid, tab: TAB, title: title, at: Date.now(), blocks: blocks });
    var sig = title + '|' + body.length + '|' + JSON.stringify(blocks[0]);
    if (sent[sig]) return;
    sent[sig] = 1;
    try {
      fetch(WEBAPP_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body, keepalive: body.length < 60000 }).catch(function () {});
    } catch (e) {}
  }

  // ---- Bài được giao trùng đề này mà học sinh làm từ thư viện -> tự đánh dấu hoàn thành ----
  function completeMatching(o, partNo, score, total) {
    var fs = o.fs;
    return fs.getDocs(fs.query(fs.collection(o.db, 'assignments'), fs.where('studentId', '==', o.user.uid), fs.where('kind', '==', KIND))).then(function (snap) {
      snap.forEach(function (d) {
        if (d.id === ASSIGN_ID) return;
        var a = d.data();
        if (a.completed === true || !a.link) return;
        var link = decodeURIComponent(String(a.link));
        if (link.indexOf(PAGE) === -1) return;
        var sc = (link.match(/[?&]scope=([^&#]+)/) || [])[1] || 'all';
        var fits = partNo == null ? true : (sc === String(partNo));
        if (!fits) return;
        var now = Date.now();
        fs.updateDoc(d.ref, {
          completed: true, percent: total ? Math.round(score / total * 100) : 0,
          scoreText: score + '/' + total + ' câu đúng', submittedAt: now, completedAt: now, completedVia: 'practice'
        }).catch(function () {});
      });
    }).catch(function (e) { console.warn('Night track: không đối chiếu được bài giao', e); });
  }

  function onGraded(range, partNo, score, total, band) {
    var label = partNo == null
      ? (ASSIGN_SCOPE !== 'all' && /^[1-4]$/.test(ASSIGN_SCOPE) ? (isListening ? 'Section ' : 'Passage ') + ASSIGN_SCOPE : 'Cả đề')
      : (isListening ? 'Section ' : 'Passage ') + partNo;
    var blocks;
    try { blocks = buildLog(range, label, score, total, band); } catch (e) { console.warn('Night track:', e); return; }
    fb().then(function (o) {
      if (!o.user) return;
      var name = document.title + (isListening && !/cam|real|ielts/i.test(document.title) ? ' (' + PAGE.replace(/^listening\//, '').replace(/\.html$/, '') + ')' : '');
      sendDocLog(o.user.uid, name + ' — ' + label, blocks);
      completeMatching(o, partNo == null && /^[1-4]$/.test(ASSIGN_SCOPE) ? Number(ASSIGN_SCOPE) : partNo, score, total);
    }).catch(function () {});
  }

  // ---- Gắn vào các nút chấm có sẵn của đề ----
  function wrap(name, after) {
    var orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = function () {
      var out = orig.apply(this, arguments);
      try { after.apply(this, arguments); } catch (e) { console.warn('Night track:', e); }
      return out;
    };
  }
  function start() {
    // Nộp cả đề (hoặc đúng Passage/Section được giao)
    wrap('saveProgressRecord', function (score, total, band) {
      var rs = ranges(), all = [1, Number(g('TOTAL_QUESTIONS')) || (rs.length ? rs[rs.length - 1][1] : 1)];
      var r = /^[1-4]$/.test(ASSIGN_SCOPE) && rs[Number(ASSIGN_SCOPE) - 1] ? rs[Number(ASSIGN_SCOPE) - 1] : all;
      onGraded(r, null, score, total, band);
    });
    // Chấm riêng 1 Passage (Reading) / 1 Section (Listening)
    ['gradePart', 'openSectionReview'].forEach(function (fnName) {
      wrap(fnName, function (n) {
        n = Number(n);
        var r = ranges()[n - 1];
        if (!r || answeredCount(r[0], r[1]) === 0) return;
        var score = 0;
        for (var q = r[0]; q <= r[1]; q++) if (isCorrect(q) === true) score++;
        onGraded(r, n, score, r[1] - r[0] + 1, null);
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
