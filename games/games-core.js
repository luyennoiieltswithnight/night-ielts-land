/* Night IELTS — games-core.js: phần dùng chung cho các game học tập (/games/*.html)
   - Tài khoản + quyền: buổi 1–3 của mỗi khoá ai cũng chơi; toàn bộ khoá cho Astra / người mua khoá / học sinh khoá đó / giáo viên
   - Nguồn kiến thức: từ vựng + trắc nghiệm các khoá (games/data-<khoá>.json, sinh bằng tools/build-games-data.js), từ trong Vườn của tôi (srs/{uid})
   - Khung giao diện, chọn nguồn, đọc mẫu, điểm cao, ảnh Irasutoya
   NG.boot({ title, sub, need: 'words' | 'mcq' | 'sentences', min, onStart(items, src) }) */
(function () {
  var FB = { apiKey: 'AIzaSyCmeN49M4oI78ZPWDhMlbisDOLaMJp2mb8', authDomain: 'night-ielts-land.firebaseapp.com', projectId: 'night-ielts-land', storageBucket: 'night-ielts-land.firebasestorage.app', messagingSenderId: '408519436407', appId: '1:408519436407:web:a9f0b9ba23368b54427e72' };
  var FREE_N = 3;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ls = function (k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
  var shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  var ME = { user: null, doc: null, garden: [] }, INDEX = null, DATA = {};

  /* ---------- tài khoản ---------- */
  var authP = null;
  function auth() {
    return authP || (authP = Promise.all([import('https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js'), import('https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js'), import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js')]).then(function (m) {
      var app = m[0].getApps()[0] || m[0].initializeApp(FB), au = m[1].getAuth(app), db = m[2].getFirestore(app);
      return new Promise(function (res) { var un = m[1].onAuthStateChanged(au, function (u) { un(); res(u); }); }).then(function (u) {
        ME.user = u; if (!u) return ME;
        return m[2].getDoc(m[2].doc(db, 'users', u.uid)).then(function (s) { ME.doc = s.exists() ? s.data() : { role: 'user' }; })
          .then(function () { return m[2].getDoc(m[2].doc(db, 'srs', u.uid)).then(function (s) { var w = s.exists() ? (s.data().w || {}) : {}; ME.garden = Object.keys(w).map(function (k) { return w[k]; }).filter(function (x) { return x && x.t && x.m && (x.l || 'en') === 'en'; }); }).catch(function () {}); })
          .then(function () { return ME; });
      });
    }).catch(function (e) { console.warn('Game: chưa đăng nhập được', e); return ME; }));
  }
  function role(u) { u = u || {}; var r = u.role || 'student'; if (r === 'pro' && !(Number(u.proUntil) > Date.now())) r = 'user'; return r; }
  function open(key, n) {
    if (n <= FREE_N) return true; var u = ME.doc; if (!u) return false; var r = role(u);
    if (r === 'admin' || (r === 'pro' && u.tier !== 'pro')) return true;
    var c = u.courses || []; if (r === 'student' && (Array.isArray(c) ? c.indexOf(key) >= 0 : c[key])) return true;
    return !!(u.buys && Number(u.buys[key]) > Date.now());
  }
  function data(key) { return DATA[key] || (DATA[key] = fetch('data-' + key + '.json', { cache: 'no-cache' }).then(function (r) { return r.json(); })); }

  /* ---------- giọng đọc ---------- */
  var voice = null;
  function pickVoice() { try { var v = speechSynthesis.getVoices().filter(function (x) { return /^en[-_](US|GB)/i.test(x.lang); }); voice = v.filter(function (x) { return /Samantha|Google US|Google UK|Aria|Jenny|Natural|Daniel/i.test(x.name); })[0] || v[0] || null; } catch (e) {} }
  try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {}
  var viVoice = null, VI = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i, tok = 0, curAudio = null;
  function pickVi() { try { var v = speechSynthesis.getVoices().filter(function (x) { return /^vi/i.test(x.lang); }); viVoice = v.filter(function (x) { return /Google|Linh|An|HoaiMy|Natural/i.test(x.name); })[0] || v[0] || null; } catch (e) {} }
  try { pickVi(); speechSynthesis.addEventListener('voiceschanged', pickVi); } catch (e) {}
  function clean(t) { return String(t || '').replace(/\*/g, '').replace(/_{2,}|…|\.{3}/g, ' ... ').replace(/\s+/g, ' ').trim(); }
  function stopTalk() { tok++; try { speechSynthesis.cancel(); } catch (e) {} if (curAudio) { try { curAudio.pause(); } catch (e) {} curAudio = null; } }
  function say1(t, lang, rate, my) {
    return new Promise(function (res) {
      if (my !== tok || !t) return res();
      lang = lang || (VI.test(t) ? 'vi' : 'en'); var done = false, fin = function () { if (!done) { done = true; res(); } };
      if (lang === 'vi' && !viVoice) {   // máy chưa có giọng Việt → giọng Google
        var a = new Audio('https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=vi&ttsspeed=' + (rate && rate < .8 ? '0.6' : '1') + '&q=' + encodeURIComponent(t.slice(0, 190)));
        curAudio = a; a.onended = a.onerror = fin; a.play().catch(fin); setTimeout(fin, 9000); return;
      }
      try { var u = new SpeechSynthesisUtterance(t); u.lang = lang === 'vi' ? 'vi-VN' : 'en-US'; u.rate = rate || (lang === 'vi' ? 1 : .9); var vv = lang === 'vi' ? viVoice : voice; if (vv) u.voice = vv; u.onend = u.onerror = fin; speechSynthesis.speak(u); setTimeout(fin, 1500 + t.length * 110); } catch (e) { fin(); }
    });
  }
  /* say([[chữ, 'vi'|'en', tốc độ], …]) đọc lần lượt; gọi lại thì dừng lượt cũ */
  function say(list) { stopTalk(); var my = tok; return list.reduce(function (p, x) { return p.then(function () { return say1(clean(x[0]), x[1], x[2], my); }); }, Promise.resolve()); }
  function speak(t, rate) { return say([[t, 'en', rate || .9]]); }

  /* ---------- âm thanh 8-bit ---------- */
  var actx = null, muted = !!ls('ng-mute');
  function beep(f1, f2, dur, type) {
    if (muted) return;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
      o.type = type || 'square'; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
      g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur); } catch (e) {}
  }
  var SFX = { ok: function () { beep(660, 1320, .15, 'triangle'); }, bad: function () { beep(300, 80, .3, 'sawtooth'); }, tap: function () { beep(500, 700, .06); }, win: function () { beep(523, 1046, .12, 'triangle'); setTimeout(function () { beep(784, 1568, .2, 'triangle'); }, 120); } };

  /* ---------- khung trang ---------- */
  function css() {
    if (document.getElementById('ng-css')) return;
    var s = document.createElement('style'); s.id = 'ng-css';
    s.textContent = [
      ':root{--ink:#24242A;--mut:#6B6B78;--line:#EEEEF3;--panel:#F4F4F7;--pri:#6C70DC;--ok:#16A34A;--bad:#DC2626}',
      '*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}html,body{margin:0;background:#E9E9EF;color:var(--ink);font-family:"Plus Jakarta Sans",system-ui,sans-serif}',
      'body{padding:10px 10px calc(24px + env(safe-area-inset-bottom))}button,input,select{font-family:inherit}',
      '.ng-frame{max-width:64rem;margin:0 auto;background:var(--ink);border-radius:28px;padding:6px}',
      '.ng-hd{display:flex;align-items:center;gap:10px;color:#fff;padding:8px 10px 12px;flex-wrap:wrap}',
      '.ng-hd a{text-decoration:none;color:var(--ink);background:#fff;border-radius:999px;padding:8px 13px;font-weight:800;font-size:13px}',
      '.ng-hd h1{margin:0;font:21px/1.15 "VT323",monospace}.ng-hd h1 small{display:block;font:600 11px "Plus Jakarta Sans",sans-serif;color:#A9A9B8;margin-top:2px}',
      '.ng-hd .r{margin-left:auto;display:flex;gap:6px}.ng-hd .r button{border:0;border-radius:999px;padding:8px 12px;font-weight:700;font-size:12.5px;background:rgba(255,255,255,.12);color:#fff;cursor:pointer}',
      '.ng-body{background:#FFFDF7;border-radius:24px;padding:18px;min-height:420px;position:relative;overflow:hidden}',
      '.ng-lbl{font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin:0 0 8px}',
      '.ng-srcs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}',
      '.ng-chip{border:0;border-radius:999px;padding:9px 14px;font-weight:800;font-size:13px;cursor:pointer;background:var(--panel);color:var(--ink)}.ng-chip.on{background:var(--ink);color:#fff}',
      '.ng-les{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px;max-height:330px;overflow:auto;padding:2px}',
      '.ng-l{display:flex;align-items:center;gap:8px;border:2px solid transparent;border-radius:14px;background:var(--panel);padding:9px 10px;cursor:pointer;text-align:left;font-size:13px;font-weight:600}',
      '.ng-l.on{border-color:var(--pri);background:#EEEFFD}.ng-l.lock{opacity:.55}.ng-l small{display:block;color:var(--mut);font-size:11px;font-weight:600}',
      '.ng-l .ck{width:18px;height:18px;border-radius:6px;border:2px solid #C9C9D6;flex:none;display:grid;place-items:center;font-size:11px;color:#fff}.ng-l.on .ck{background:var(--pri);border-color:var(--pri)}',
      '.ng-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:14px}',
      '.ng-btn{border:0;border-radius:14px;padding:12px 18px;font-weight:800;font-size:14.5px;cursor:pointer;background:var(--ink);color:#fff;box-shadow:0 4px 0 #000}',
      '.ng-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #000}.ng-btn.go{background:var(--ok);box-shadow:0 4px 0 #14532D}.ng-btn.ghost{background:#EFEBE2;color:var(--ink);box-shadow:0 4px 0 #CFC8B8}',
      '.ng-btn:disabled{opacity:.4;cursor:default;transform:none}',
      '.ng-note{font-size:13px;color:var(--mut);line-height:1.5}',
      '.ng-lv{display:flex;gap:6px}.ng-lv button{border:0;border-radius:12px;padding:9px 14px;font-weight:800;font-size:13px;background:var(--panel);cursor:pointer}.ng-lv button.on{background:#FFD66B}',
      '.ng-over{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(255,253,247,.94);z-index:20;text-align:center;padding:20px}',
      '.ng-over.on{display:flex}.ng-over h2{font:28px/1.15 "VT323",monospace;margin:0 0 10px}.ng-over .big{font-size:44px;font-weight:900;margin:6px 0}',
      '.ng-review{max-height:180px;overflow:auto;text-align:left;margin:10px auto;max-width:460px;font-size:13.5px;background:var(--panel);border-radius:14px;padding:10px 12px}',
      '.ng-review div{padding:3px 0;border-bottom:1px dashed #E2E2EA}.ng-review b{color:var(--bad)}',
      '.ng-hd .r button{display:flex;align-items:center}.ng-chip,.ng-lv button,.ng-btn{display:inline-flex;align-items:center;gap:6px}',
      '.ng-q{display:flex;align-items:center;gap:12px;background:#fff;border-radius:8px;box-shadow:0 0 0 4px #24242A,0 8px 0 4px #24242A;padding:14px 16px;margin:4px 4px 18px;min-height:96px}',
      '.ng-q.pop{animation:ngq .35s}@keyframes ngq{0%{transform:scale(.97);background:#FFF6CF}100%{transform:none}}',
      '.ng-q-in{flex:1;min-width:0;text-align:center}',
      '.ng-q-l{display:block;font:18px/1.15 "VT323",monospace;color:#6C70DC;margin-bottom:4px}',
      '.ng-q-m{font-size:clamp(22px,4.2vw,34px);font-weight:900;line-height:1.25;color:#24242A;word-break:break-word}',
      '.ng-q-s{font-size:clamp(14px,2.2vw,17px);font-weight:600;color:#4A4A57;line-height:1.5;margin-top:6px}.ng-q-s:empty{display:none}',
      '.ng-q .bl{display:inline-block;min-width:2.4em;height:.9em;border-bottom:4px solid #6C70DC;margin:0 .2em;vertical-align:baseline}',
      '.ng-q-s .gt{display:inline-flex;align-items:center;gap:6px;border-radius:6px;padding:5px 10px;margin:3px 4px;font-weight:800;color:#24242A}',
      '.ng-q-s .gt.up{background:#DBEAFE;box-shadow:inset 0 0 0 2px #3B82F6}.ng-q-s .gt.dn{background:#FCE7F3;box-shadow:inset 0 0 0 2px #EC4899}',
      '.ng-q-say{flex:none;border:0;border-radius:8px;background:#FFD66B;box-shadow:0 4px 0 #B45309;padding:10px 12px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;font:800 12px "Plus Jakarta Sans",sans-serif;color:#24242A}',
      '.ng-q-say:active{transform:translateY(3px);box-shadow:0 1px 0 #B45309}',
      '.pxh{margin-left:3px}',
      '@media(max-width:640px){.ng-hd h1{font-size:18px}.ng-body{padding:14px}.ng-q{padding:12px;min-height:84px}}'
    ].join('\n');
    document.head.appendChild(s);
    var f = document.createElement('link'); f.rel = 'stylesheet'; f.href = 'https://fonts.googleapis.com/css2?family=VT323&family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap'; document.head.appendChild(f);
  }
  function ic(n, h, o) { return window.PXI ? PXI.html(n, h, o) : ''; }
  function hearts(n, max) { return window.PXI ? PXI.hearts(n, max || 3, 20) : new Array(n + 1).join('♥'); }
  /* Khung câu hỏi lớn, đặt giữa phía trên khu chơi */
  function qbar(id) { return '<div class="ng-q" id="' + (id || 'ngQ') + '"><div class="ng-q-in"><small class="ng-q-l"></small><div class="ng-q-m"></div><div class="ng-q-s"></div></div><button class="ng-q-say" type="button" aria-label="Đọc to">' + ic('spk', 22, { q: '#24242A', y: '#6C70DC' }) + '<span>Đọc</span></button></div>'; }
  function setQ(o, id) {
    var el = document.getElementById(id || 'ngQ'); if (!el) return;
    el.querySelector('.ng-q-l').innerHTML = o.label || ''; el.querySelector('.ng-q-m').innerHTML = o.main || ''; el.querySelector('.ng-q-s').innerHTML = o.sub || '';
    el.querySelector('.ng-q-m').style.fontSize = o.size || ''; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    var b = el.querySelector('.ng-q-say'); b.style.display = o.read ? '' : 'none'; b.onclick = function () { if (o.read) say(o.read); };
    if (o.read && o.auto !== false) say(o.read);
  }
  function frame(title, sub) {
    css();
    document.body.innerHTML = '<div class="ng-frame"><header class="ng-hd"><a href="index.html">← Game</a><h1>' + esc(title) + '<small>' + esc(sub || '') + '</small></h1>' +
      '<div class="r"><button id="ngMute" aria-label="Âm thanh">' + ic(muted ? 'mute' : 'spk', 18) + '</button></div></header><div class="ng-body" id="ngBody"></div></div>';
    document.getElementById('ngMute').onclick = function () { muted = !muted; ls('ng-mute', muted); this.innerHTML = ic(muted ? 'mute' : 'spk', 18); this.blur(); };
    return document.getElementById('ngBody');
  }

  /* ---------- chọn nguồn kiến thức ---------- */
  function picker(body, o) {
    var need = o.need || 'words', min = o.min || 6;
    var st = ls('ng-src:' + need) || { src: 'giaotiep', les: [] }, lv = ls('ng-lv:' + o.id) || 'easy';
    body.innerHTML = '<p class="ng-lbl">Chọn kiến thức để chơi</p><div class="ng-srcs" id="ngSrc"></div><div id="ngLes"></div>' +
      (o.levels ? '<p class="ng-lbl" style="margin-top:14px">Độ khó</p><div class="ng-lv" id="ngLv">' + o.levels.map(function (l) { return '<button data-lv="' + l[0] + '"' + (l[0] === lv ? ' class="on"' : '') + '>' + (l[2] ? ic(l[2], 16) + ' ' : '') + l[1] + '</button>'; }).join('') + '</div>' : '') +
      '<div class="ng-row"><button class="ng-btn go" id="ngGo">' + ic('play', 16, { k: '#14532D', g: '#fff' }) + ' Bắt đầu</button><span class="ng-note" id="ngCnt"></span></div>' +
      (o.help ? '<p class="ng-note" style="margin-top:12px">' + o.help + '</p>' : '');
    var srcs = (need === 'mcq' ? [['chuyende', '25 Chuyên đề'], ['giaotiep', 'Giao tiếp'], ['writing', 'Writing'], ['speaking6', 'Speaking 6.0']] : [['giaotiep', 'Giao tiếp'], ['speaking6', 'Speaking 6.0'], ['writing', 'Writing']]);
    if (need !== 'mcq') srcs.push(['garden', 'Từ trong Vườn của tôi', 'sprout']);
    if (o.extra) srcs = o.extra.concat(srcs);
    if (!srcs.some(function (x) { return x[0] === st.src; })) st.src = srcs[0][0];
    var D = null, pool = [];
    function count() {
      var c = document.getElementById('ngCnt'), g = document.getElementById('ngGo');
      pool = collect(); c.textContent = pool.length ? pool.length + (need === 'mcq' ? ' câu hỏi' : need === 'sentences' ? ' câu' : ' từ') + ' sẵn sàng' : 'Chưa đủ dữ liệu, chọn thêm buổi nhé';
      g.disabled = pool.length < min;
    }
    function collect() {
      if (o.extra && o.extra.some(function (x) { return x[0] === st.src; })) return o.extraItems(st.src);
      if (st.src === 'garden') return need === 'sentences' ? ME.garden.filter(function (w) { return w.s && w.s.split(' ').length >= 4 && w.s.split(' ').length <= 12; }).map(function (w) { return { s: w.s, vi: w.m, w: w.t }; }) : ME.garden.map(function (w) { return { w: w.t, m: w.m, ex: w.s || '' }; });
      if (!D) return [];
      var out = [];
      D.lessons.forEach(function (l) {
        if (st.les.indexOf(l.n) < 0 || !open(st.src, l.n)) return;
        if (need === 'mcq') l.mcq.forEach(function (q) { out.push({ q: q[0], opts: q[1], a: q[2], ex: q[3], n: l.n }); });
        else if (need === 'sentences') l.words.forEach(function (w) { var n = w[3] ? w[3].split(/\s+/).length : 0; if (n >= 4 && n <= 12) out.push({ s: w[3], vi: w[2], w: w[0] }); });
        else l.words.forEach(function (w) { out.push({ w: w[0], ph: w[1], m: w[2], ex: w[3], ira: w[4] }); });
      });
      return out;
    }
    function paintSrc() {
      document.getElementById('ngSrc').innerHTML = srcs.map(function (x) { return '<button class="ng-chip' + (x[0] === st.src ? ' on' : '') + '" data-s="' + x[0] + '">' + (x[2] ? ic(x[2], 16) + ' ' : '') + esc(x[1]) + '</button>'; }).join('');
      var L = document.getElementById('ngLes');
      if (o.extra && o.extra.some(function (x) { return x[0] === st.src; })) { L.innerHTML = '<p class="ng-note">' + (o.extraNote || '') + '</p>'; D = null; count(); return; }
      if (st.src === 'garden') {
        L.innerHTML = '<p class="ng-note">' + (!ME.user ? 'Đăng nhập ở trang chủ để chơi bằng từ trong Vườn của bạn.' : ME.garden.length ? 'Chơi bằng ' + ME.garden.length + ' từ bạn đã gieo trong Vườn từ vựng.' : 'Vườn của bạn chưa có từ. Vào <a href="../vuon.html">Vườn từ vựng</a> để gieo hạt nhé.') + '</p>';
        D = null; count(); return;
      }
      L.innerHTML = '<p class="ng-note">Đang tải…</p>';
      data(st.src).then(function (d) {
        D = d; var avail = d.lessons.filter(function (l) { return need === 'mcq' ? l.mcq.length : l.words.length; });
        if (!st.les.length || !avail.some(function (l) { return st.les.indexOf(l.n) >= 0; })) st.les = avail.filter(function (l) { return open(st.src, l.n); }).slice(0, 3).map(function (l) { return l.n; });
        L.innerHTML = '<div class="ng-row" style="margin:0 0 8px"><button class="ng-chip" id="ngAll">Chọn tất cả buổi đã mở</button><button class="ng-chip" id="ngNone">Bỏ chọn</button></div><div class="ng-les">' + avail.map(function (l) {
          var ok = open(st.src, l.n), on = ok && st.les.indexOf(l.n) >= 0;
          return '<button class="ng-l' + (on ? ' on' : '') + (ok ? '' : ' lock') + '" data-n="' + l.n + '"><span class="ck">' + (ok ? (on ? '✓' : '') : ic('lock', 14)) + '</span><span>' + esc(l.title.replace(/^Buổi\s*0?/, 'Buổi ')) + '<small>' + (need === 'mcq' ? l.mcq.length + ' câu' : l.words.length + ' từ') + (ok ? '' : ' · mở khoá để chơi') + '</small></span></button>';
        }).join('') + '</div>';
        L.querySelectorAll('.ng-l').forEach(function (b) {
          b.onclick = function () {
            var n = +b.dataset.n;
            if (!open(st.src, n)) { if (window.NightPlan && NightPlan.openCourseBuy) NightPlan.openCourseBuy(st.src); else alert('Buổi này cần mở khoá học hoặc gói Astra.'); return; }
            var i = st.les.indexOf(n); if (i >= 0) st.les.splice(i, 1); else st.les.push(n);
            b.classList.toggle('on', i < 0); b.querySelector('.ck').textContent = i < 0 ? '✓' : ''; ls('ng-src:' + need, st); count();
          };
        });
        document.getElementById('ngAll').onclick = function () { st.les = avail.filter(function (l) { return open(st.src, l.n); }).map(function (l) { return l.n; }); ls('ng-src:' + need, st); paintSrc(); };
        document.getElementById('ngNone').onclick = function () { st.les = []; ls('ng-src:' + need, st); paintSrc(); };
        count();
      }).catch(function () { L.innerHTML = '<p class="ng-note">Chưa tải được dữ liệu khoá này.</p>'; });
    }
    document.getElementById('ngSrc').onclick = function (e) { var b = e.target.closest('[data-s]'); if (!b) return; st = { src: b.dataset.s, les: [] }; ls('ng-src:' + need, st); paintSrc(); };
    var lvEl = document.getElementById('ngLv'); if (lvEl) lvEl.onclick = function (e) { var b = e.target.closest('[data-lv]'); if (!b) return; lv = b.dataset.lv; ls('ng-lv:' + o.id, lv); lvEl.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); };
    document.getElementById('ngGo').onclick = function () { if (pool.length >= min) o.onStart(shuffle(pool), { src: st.src, level: lv }); };
    paintSrc();
  }

  function boot(o) {
    var body = frame(o.title, o.sub);
    body.innerHTML = '<p class="ng-note">Đang tải…</p>';
    if (!document.querySelector('script[src*="night-plan.js"]')) { var p = document.createElement('script'); p.src = '../night-plan.js?v=20261123a'; document.head.appendChild(p); }
    auth().then(function () { picker(body, o); });
    return body;
  }
  function best(id, sc) { var k = 'ng-hi:' + id, h = ls(k) || 0; if (sc != null && sc > h) { ls(k, sc); return { hi: sc, isNew: true }; } return { hi: h, isNew: false }; }
  function over(body, o) {
    var el = body.querySelector('.ng-over') || (function () { var d = document.createElement('div'); d.className = 'ng-over'; body.appendChild(d); return d; })();
    var b = best(o.id, o.score);
    el.innerHTML = '<div><h2>' + esc(o.title || 'HẾT VÁN') + '</h2><div class="big">' + o.score + '</div><p class="ng-note">' + (b.isNew ? ic('trophy', 18) + ' Kỷ lục mới!' : 'Kỷ lục: ' + b.hi) + (o.line ? ' · ' + o.line : '') + '</p>' +
      (o.review && o.review.length ? '<div class="ng-review"><p class="ng-lbl" style="margin:0 0 4px">Ôn lại câu sai</p>' + o.review.slice(0, 20).map(function (r) { return '<div>' + r + '</div>'; }).join('') + '</div>' : '') +
      '<div class="ng-row" style="justify-content:center"><button class="ng-btn go" data-again>Chơi lại</button><button class="ng-btn ghost" data-menu>Đổi bài</button></div></div>';
    el.classList.add('on');
    el.querySelector('[data-again]').onclick = function () { el.classList.remove('on'); o.again(); };
    el.querySelector('[data-menu]').onclick = function () { location.reload(); };
  }
  window.NG = { boot: boot, speak: speak, say: say, stop: stopTalk, qbar: qbar, setQ: setQ, ic: ic, hearts: hearts, beep: beep, SFX: SFX, shuffle: shuffle, esc: esc, ls: ls, best: best, over: over, img: function (ira) { return ira ? '../khoahoc/img/ira/' + ira : ''; }, me: function () { return ME; } };
})();
