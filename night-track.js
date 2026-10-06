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

  var toasted = false;
  function ntToast(msg) {
    if (toasted) return; toasted = true;
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;max-width:440px;width:calc(100% - 32px);background:#b42318;color:#fff;padding:12px 16px;border-radius:12px;font:600 14px/1.5 system-ui,-apple-system,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25);cursor:pointer;';
    t.textContent = msg;
    t.onclick = function () { t.remove(); };
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.remove(); }, 12000);
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

  // ---- Bài ĐƯỢC GIAO (mở từ link có ?assignmentId=): ghi luôn 1 dòng vào progressLog để bảng
  //      "Hoạt động 3 tháng" sáng ô hôm nay ngay, không phải chờ học sinh mở lại trang chủ.
  //      Dùng đúng id trang chủ dùng (uid_assignmentId) nên không bao giờ bị đếm trùng.
  function logAssigned(o, partNo, score, total, band) {
    if (!ASSIGN_ID) return;
    var sc = /^[1-4]$/.test(ASSIGN_SCOPE) ? Number(ASSIGN_SCOPE) : null;
    if (partNo != null && partNo !== sc) return; // chấm thử 1 phần khác phần được giao -> chưa tính
    var fs = o.fs, now = Date.now();
    var ref = fs.doc(o.db, 'progressLog', o.user.uid + '_' + ASSIGN_ID);
    fs.getDoc(fs.doc(o.db, 'assignments', ASSIGN_ID)).then(function (s) { return s.exists() ? s.data() : {}; }).catch(function () { return {}; }).then(function (a) {
      return fs.setDoc(ref, {
        studentId: o.user.uid, assignmentId: ASSIGN_ID, kind: KIND,
        title: a.title || (document.title + (sc ? (isListening ? ' — Section ' : ' — Passage ') + sc : '')),
        resultText: score + '/' + total + ' câu đúng' + (band ? ' (Band ' + band + ')' : ''),
        completedAt: now, expiresAt: now + 365 * 24 * 60 * 60 * 1000
      });
    }).catch(function (e) { console.warn('Night track: không ghi được tiến độ bài giao', e); });
  }

  function onGraded(range, partNo, score, total, band) {
    var label = partNo == null
      ? (ASSIGN_SCOPE !== 'all' && /^[1-4]$/.test(ASSIGN_SCOPE) ? (isListening ? 'Section ' : 'Passage ') + ASSIGN_SCOPE : 'Cả đề')
      : (isListening ? 'Section ' : 'Passage ') + partNo;
    var blocks;
    try { blocks = buildLog(range, label, score, total, band); } catch (e) { console.warn('Night track:', e); return; }
    fb().then(function (o) {
      if (!o.user) { ntToast('Bạn chưa đăng nhập Gmail ở trang chủ Night IELTS nên kết quả lần này KHÔNG được lưu vào Tiến độ và Sổ bài làm. Đăng nhập ở trang chủ rồi làm lại nhé.'); return; }
      var name = document.title + (isListening && !/cam|real|ielts/i.test(document.title) ? ' (' + PAGE.replace(/^listening\//, '').replace(/\.html$/, '') + ')' : '');
      sendDocLog(o.user.uid, name + ' — ' + label, blocks);
      logAssigned(o, partNo, score, total, band);
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

  // =====================================================================
  // LÀM CHUNG: nhập biệt danh + hiện tên người vừa nhập ngay cạnh từng đáp án
  // Chạy song song với bộ "Làm chung" có sẵn trong đề (không sửa gì bộ đó): ghi thêm
  // liveSessions/{phiên}/who/{câu} = { n: biệt danh, c: máy, t: lúc } và names/{máy} = biệt danh.
  // =====================================================================
  var LIVE = { sid: null, nick: '', cid: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), db: null, mod: null, who: {}, lastSent: {} };
  var NICK_KEY = 'nightLiveNick';
  try { LIVE.nick = localStorage.getItem(NICK_KEY) || ''; } catch (e) {}

  function liveDb() {
    if (LIVE.dbP) return LIVE.dbP;
    LIVE.dbP = Promise.all([
      import('https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js')
    ]).then(function (m) {
      var cfg = Object.assign({ databaseURL: 'https://night-ielts-land-default-rtdb.firebaseio.com' }, FB_CONFIG);
      var app = m[0].initializeApp(cfg, 'night-live-names-' + Date.now());
      LIVE.mod = m[1]; LIVE.db = m[1].getDatabase(app);
      return LIVE;
    });
    return LIVE.dbP;
  }
  function nickColor(name) {
    var h = 0; name = String(name || ''); for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    var hues = [210, 340, 145, 28, 265, 190, 0, 95, 300, 50];
    return 'hsl(' + hues[Math.abs(h) % hues.length] + ', 65%, 42%)';
  }
  function injectLiveCss() {
    if (document.getElementById('nt-live-css')) return;
    var st = document.createElement('style'); st.id = 'nt-live-css';
    st.textContent =
      '.nt-who{display:inline-flex;align-items:center;gap:3px;margin-left:6px;padding:1px 7px;border-radius:999px;font:600 11px/1.6 system-ui,-apple-system,sans-serif;color:#fff;vertical-align:middle;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;pointer-events:none;animation:ntPop .25s ease;}' +
      '.nt-who.mine{opacity:.75;}' +
      '.nt-who-host{position:relative;}' +
      '.nt-who.corner{position:absolute;top:6px;right:8px;margin:0;}' +
      '.options-tf .nt-who,.mcq-options .nt-who{align-self:center;}' +
      '@keyframes ntPop{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}' +
      '#nt-nick-overlay{position:fixed;inset:0;background:rgba(20,20,30,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,sans-serif;}' +
      '#nt-nick-box{background:#fff;border-radius:16px;padding:22px 22px 18px;max-width:360px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.25);}' +
      '#nt-nick-box h3{margin:0 0 6px;font-size:18px;color:#222;}' +
      '#nt-nick-box p{margin:0 0 14px;font-size:13.5px;color:#666;line-height:1.5;}' +
      '#nt-nick-box input{width:100%;box-sizing:border-box;padding:10px 12px;border:2px solid #ddd;border-radius:10px;font-size:15px;outline:none;}' +
      '#nt-nick-box input:focus{border-color:#7c6be6;}' +
      '#nt-nick-box button{margin-top:12px;width:100%;padding:11px;border:0;border-radius:10px;background:#7c6be6;color:#fff;font-weight:700;font-size:15px;cursor:pointer;}' +
      '#nt-live-names{font:inherit;margin-left:4px;}' +
      '#nt-people-pop{display:none;position:fixed;z-index:99998;min-width:220px;max-width:300px;background:#fff;border:1px solid #e3e3e8;border-radius:12px;box-shadow:0 14px 34px rgba(0,0,0,.2);padding:10px 12px;font:14px/1.45 system-ui,-apple-system,sans-serif;color:#222;}' +
      '.nt-pp-h{font-weight:700;margin-bottom:6px;}' +
      '.nt-pp-row{display:flex;align-items:center;gap:8px;padding:5px 0;border-top:1px solid #f0f0f3;}' +
      '.nt-pp-dot{width:10px;height:10px;border-radius:999px;flex-shrink:0;}' +
      '.nt-pp-n{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.nt-pp-n i{font-weight:400;color:#888;}' +
      '.nt-pp-c{font-size:12px;color:#777;}' +
      '.nt-pp-f{font-size:11.5px;color:#999;margin-top:6px;}';
    document.head.appendChild(st);
  }
  function askNick(cb) {
    injectLiveCss();
    if (document.getElementById('nt-nick-overlay')) return;
    var ov = document.createElement('div'); ov.id = 'nt-nick-overlay';
    ov.innerHTML = '<div id="nt-nick-box"><h3>👥 Làm bài chung</h3><p>Nhập tên hiển thị của bạn. Khi bạn chọn hoặc gõ đáp án, tên này hiện nhỏ cạnh câu đó để mọi người biết ai đã làm.</p>' +
      '<input id="nt-nick-input" maxlength="20" placeholder="Ví dụ: Minh Anh" autocomplete="off"><button type="button" id="nt-nick-ok">Vào làm bài</button></div>';
    document.body.appendChild(ov);
    var inp = document.getElementById('nt-nick-input');
    inp.value = LIVE.nick || '';
    setTimeout(function () { inp.focus(); inp.select(); }, 50);
    function done() {
      var v = inp.value.replace(/\s+/g, ' ').trim().slice(0, 20);
      if (!v) { inp.focus(); inp.style.borderColor = '#e53935'; return; }
      LIVE.nick = v;
      try { localStorage.setItem(NICK_KEY, v); } catch (e) {}
      ov.remove();
      cb && cb();
    }
    document.getElementById('nt-nick-ok').addEventListener('click', done);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') done(); });
  }

  // Chỗ đặt nhãn tên: ngay sau ô điền / ô thả (kéo-thả) / danh sách chọn; câu trắc nghiệm thì ở góc khung câu
  function hostFor(key) {
    if (key.indexOf('g_') === 0) {
      var grp = document.querySelector('.multi-group[data-multi-group="' + key.slice(2) + '"]');
      return grp ? { el: grp, corner: true } : null;
    }
    var slot = document.getElementById('slot-' + key);
    if (slot) return { el: slot, after: true };
    var inp = document.getElementsByName('q' + key)[0];
    if (!inp) return null;
    if (inp.type === 'radio') {
      var opts = inp.closest('.options-tf, .mcq-options');
      if (opts) return { el: opts, inside: true };
    }
    if (inp.type === 'radio' || inp.type === 'checkbox' || inp.type === 'hidden') {
      var box = document.getElementById('q-container-' + key) || inp.closest('.question-item, li, tr');
      return box ? { el: box, corner: true } : { el: inp, after: true };
    }
    return { el: inp, after: true };
  }
  function renderWho(key) {
    var old = document.querySelector('.nt-who[data-k="' + key + '"]');
    var w = LIVE.who[key];
    if (!w || !w.n) { if (old) old.remove(); return; }
    var h = hostFor(key);
    if (!h) { if (old) old.remove(); return; }
    var b = old || document.createElement('span');
    b.className = 'nt-who' + (h.corner ? ' corner' : '') + (w.c === LIVE.cid ? ' mine' : '');
    b.setAttribute('data-k', key);
    b.style.background = nickColor(w.n);
    b.textContent = w.n;
    b.title = w.n + ' đã nhập câu này';
    if (h.inside) { if (b.parentNode !== h.el) h.el.appendChild(b); }
    else if (h.corner) { h.el.classList.add('nt-who-host'); if (b.parentNode !== h.el) h.el.appendChild(b); }
    else if (b.previousSibling !== h.el) h.el.parentNode.insertBefore(b, h.el.nextSibling);
  }
  function renderAllWho() { Object.keys(LIVE.who).forEach(renderWho); document.querySelectorAll('.nt-who').forEach(function (b) { if (!LIVE.who[b.getAttribute('data-k')]) b.remove(); }); }

  function sendWho(key, hasValue) {
    if (!LIVE.sid || !LIVE.nick) return;
    var now = Date.now();
    var last = LIVE.lastSent[key];
    if (hasValue && last && last.on && now - last.t < 2500) return;   // gõ liên tục: không ghi mỗi phím
    LIVE.lastSent[key] = { t: now, on: hasValue };
    liveDb().then(function (L) {
      var r = L.mod.ref(L.db, 'liveSessions/' + LIVE.sid + '/who/' + key);
      if (hasValue) L.mod.set(r, { n: LIVE.nick, c: LIVE.cid, t: now }).catch(function () {});
      else L.mod.remove(r).catch(function () {});
    });
    LIVE.who[key] = hasValue ? { n: LIVE.nick, c: LIVE.cid, t: now } : null;
    if (!hasValue) delete LIVE.who[key];
    renderWho(key);
  }
  function valueOfQ(name) {
    var els = document.getElementsByName(name);
    if (!els.length) return '';
    if (els[0].type === 'radio') { for (var i = 0; i < els.length; i++) if (els[i].checked) return els[i].value; return ''; }
    return String(els[0].value || '').trim();
  }
  var lastGesture = 0;
  function onUserEdit(e) {
    if (!e.isTrusted || !LIVE.sid) return;     // thay đổi do đồng bộ từ người khác thì bỏ qua
    var t = e.target;
    if (!t || !t.name) return;
    if (t.classList && t.classList.contains('multi-check')) {
      var grp = t.closest('.multi-group');
      if (grp) sendWho('g_' + grp.getAttribute('data-multi-group'), !!grp.querySelector('.multi-check:checked'));
      return;
    }
    var m = String(t.name).match(/^q(\d+)$/);
    if (m) sendWho(m[1], !!valueOfQ(t.name));
  }
  ['pointerdown', 'pointerup', 'keydown', 'touchend', 'click'].forEach(function (ev) { document.addEventListener(ev, function (e) { if (e.isTrusted) lastGesture = Date.now(); }, true); });
  // Kéo-thả (Matching/Heading): ô ẩn đổi giá trị bằng code nên bắt qua fillSlot/clearSlot ngay sau thao tác thật
  function wrapSlots() {
    ['fillSlot', 'clearSlot'].forEach(function (fn) {
      var orig = window[fn];
      if (typeof orig !== 'function' || orig.__nt) return;
      var w = function (slotEl) {
        var out = orig.apply(this, arguments);
        try {
          if (LIVE.sid && Date.now() - lastGesture < 900 && slotEl && /^slot-\d+$/.test(slotEl.id || '')) {
            var q = slotEl.id.slice(5);
            setTimeout(function () { sendWho(q, !!valueOfQ('q' + q)); }, 0);
          }
        } catch (e) {}
        return out;
      };
      w.__nt = true;
      window[fn] = w;
    });
  }

  function activePeople() {
    var now = Date.now(), out = [];
    Object.keys(LIVE.people || {}).forEach(function (cid) {
      var v = LIVE.people[cid];
      var n = typeof v === 'string' ? v : (v && v.n);
      var t = typeof v === 'string' ? now : (v && v.t) || 0;
      if (n && now - t < 75000) out.push({ cid: cid, n: n, me: cid === LIVE.cid });
    });
    if (LIVE.nick && !out.some(function (p) { return p.me; })) out.push({ cid: LIVE.cid, n: LIVE.nick, me: true });
    var count = {};
    Object.keys(LIVE.who || {}).forEach(function (k) { var w = LIVE.who[k]; if (w && w.c) count[w.c] = (count[w.c] || 0) + 1; });
    out.forEach(function (p) { p.answers = count[p.cid] || 0; });
    out.sort(function (a, b) { return (b.me - a.me) || a.n.localeCompare(b.n); });
    return out;
  }
  function renderPeople() {
    var badge = document.getElementById('live-participant-badge');
    if (!badge || !LIVE.sid) return;
    var list = activePeople();
    badge.style.display = '';
    badge.style.cursor = 'pointer';
    badge.title = 'Bấm để xem ai đang làm chung';
    var orig = document.getElementById('live-participant-count');
    if (orig) orig.style.display = 'none';                 // số cũ (đếm theo kết nối) hay thiếu -> dùng số mới
    var el = document.getElementById('nt-live-names');
    if (!el) { el = document.createElement('span'); el.id = 'nt-live-names'; badge.appendChild(el); }
    el.textContent = list.length + ' người';
    if (!badge.__ntClick) {
      badge.__ntClick = true;
      badge.addEventListener('click', function (e) { e.stopPropagation(); togglePeoplePop(); });
    }
    var pop = document.getElementById('nt-people-pop');
    if (pop && pop.style.display === 'block') fillPeoplePop(pop, list);
  }
  function fillPeoplePop(pop, list) {
    pop.innerHTML = '<div class="nt-pp-h">👥 Đang làm chung (' + list.length + ')</div>' +
      list.map(function (p) {
        return '<div class="nt-pp-row"><span class="nt-pp-dot" style="background:' + nickColor(p.n) + '"></span><span class="nt-pp-n">' +
          p.n.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }) + (p.me ? ' <i>(bạn)</i>' : '') +
          '</span><span class="nt-pp-c">' + p.answers + ' câu</span></div>';
      }).join('') +
      '<div class="nt-pp-f">Số câu = số câu người đó đang là người nhập gần nhất. Ai thoát hoặc mất mạng quá 1 phút sẽ tự rời danh sách.</div>';
  }
  function togglePeoplePop() {
    var pop = document.getElementById('nt-people-pop');
    if (!pop) {
      pop = document.createElement('div'); pop.id = 'nt-people-pop';
      document.body.appendChild(pop);
      document.addEventListener('click', function (e) { if (pop.style.display === 'block' && !pop.contains(e.target)) pop.style.display = 'none'; });
    }
    if (pop.style.display === 'block') { pop.style.display = 'none'; return; }
    fillPeoplePop(pop, activePeople());
    var r = document.getElementById('live-participant-badge').getBoundingClientRect();
    pop.style.display = 'block';
    pop.style.top = (r.bottom + 8) + 'px';
    pop.style.left = Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8)) + 'px';
  }

  function startLive(sid) {
    if (LIVE.sid === sid) return;
    LIVE.sid = sid;
    injectLiveCss();
    document.addEventListener('input', onUserEdit, true);
    document.addEventListener('change', onUserEdit, true);
    wrapSlots();
    liveDb().then(function (L) {
      var base = 'liveSessions/' + sid;
      var nameRef = L.mod.ref(L.db, base + '/names/' + LIVE.cid);
      // Danh sách người tham gia: mỗi máy tự ghi tên + "nhịp tim" 25 giây/lần; mất kết nối thì tự xoá.
      // Ai im quá 75 giây (tắt máy, mất mạng) thì không tính nữa -> số người luôn khớp thực tế.
      function beat() { if (LIVE.nick) L.mod.set(nameRef, { n: LIVE.nick, t: Date.now() }).catch(function () {}); }
      L.mod.onValue(L.mod.ref(L.db, '.info/connected'), function (sn) {
        if (sn.val() === true) { L.mod.onDisconnect(nameRef).remove(); beat(); }
      });
      setInterval(beat, 25000);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) beat(); });
      L.mod.onValue(L.mod.ref(L.db, base + '/who'), function (sn) {
        LIVE.who = sn.val() || {};
        renderAllWho();
        renderPeople();
      });
      L.mod.onValue(L.mod.ref(L.db, base + '/names'), function (sn) {
        LIVE.people = sn.val() || {};
        renderPeople();
      });
      setInterval(renderPeople, 15000);
    }).catch(function (e) { console.warn('Night live names:', e); });
    // Giao diện câu hỏi dựng xong / đổi passage thì vẽ lại nhãn
    var origStart = window.startTest;
    if (typeof origStart === 'function' && !origStart.__nt) {
      var ws = function () { var o = origStart.apply(this, arguments); setTimeout(function () { wrapSlots(); renderAllWho(); }, 50); return o; };
      ws.__nt = true; window.startTest = ws;
    }
  }
  function sidFromUrl() { return new URLSearchParams(location.search).get('liveSession'); }
  function beginLive(sid) {
    if (!sid) return;
    if (LIVE.nick && LIVE.askedFor === sid) { startLive(sid); return; }
    LIVE.askedFor = sid;
    askNick(function () { startLive(sid); liveDb().then(function (L) { L.mod.set(L.mod.ref(L.db, 'liveSessions/' + sid + '/names/' + LIVE.cid), { n: LIVE.nick, t: Date.now() }).catch(function () {}); renderPeople(); }); });
  }
  // Người mở link làm chung: hỏi tên ngay. Thầy bấm "Tạo link làm chung": bộ có sẵn đổi URL -> bắt lúc đó.
  var origReplace = history.replaceState;
  history.replaceState = function () {
    var out = origReplace.apply(this, arguments);
    try { var sid = sidFromUrl(); if (sid && sid !== LIVE.sid && sid !== LIVE.askedFor) beginLive(sid); } catch (e) {}
    return out;
  };
  function initLive() { var sid = sidFromUrl(); if (sid) beginLive(sid); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLive); else initLive();
})();
