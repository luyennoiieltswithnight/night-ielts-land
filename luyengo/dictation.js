/* Night IELTS — CHÉP CHÍNH TẢ đề Listening (dùng chung cho trang đề và trang chinhta.html)
   NVDict.sentences(root, n)        -> các câu của transcript Section n (kèm vị trí từ để tra mốc thời gian)
   NVDict.timing(alignUrl)          -> Promise mốc thời gian từng từ (file testN-align.json, dò sẵn từ audio gốc)
   NVDict.open({ title, items, audio, onResult }) -> mở khung Nghe – Gõ toàn màn hình.
     items: [{ s, who, tag, t0, t1 }] — có t0/t1 thì phát đúng đoạn trong AUDIO GỐC, không có thì đọc bằng giọng máy.
   NVDict.canUse() -> Promise<boolean>: gói Astra, Học sinh, giáo viên (người khác bấm sẽ hiện bảng nâng cấp). */
(function () {
  var ROOT = (function () { try { var s = document.currentScript && document.currentScript.src; if (s) return s.replace(/luyengo\/dictation\.js.*$/, ''); } catch (e) {} return location.origin + '/'; })();
  var PFX = /^([A-Z][A-Z .'’-]{1,30}):\s*/;
  var norm = function (t) { return String(t).toLowerCase().replace(/[^a-z0-9]/g, ''); };

  function sentences(root, n) {
    var box = (root || document).querySelector('#passage-' + n + '-text'); if (!box) return [];
    var out = [], tok = 0;
    box.querySelectorAll('p').forEach(function (p) {
      var raw = (p.textContent || '').replace(/\s+/g, ' ').trim(), who = '';
      var m = raw.match(PFX); if (m) { who = m[1].trim(); raw = raw.slice(m[0].length); }
      else {
        /* Tên người nói viết thường kiểu "Official: ...", "Man: ..." — bỏ khỏi câu nhưng VẪN đếm từ để khớp mốc thời gian (file mốc đã tính các từ này) */
        var m2 = raw.match(/^([A-Z][A-Za-z.'’-]*(?: [A-Za-z.'’-]+){0,2}):\s+/);
        if (m2) { who = m2[1].trim(); tok += m2[1].split(' ').filter(function (w) { return norm(w); }).length; raw = raw.slice(m2[0].length); }
      }
      raw.split(/(?<=[.?!])\s+(?=["'“‘(]?[A-Z0-9])/).forEach(function (s) {
        s = s.trim();
        var cnt = s.split(' ').filter(function (w) { return norm(w); }).length, a = tok; tok += cnt;
        var w = s.split(/\s+/).length;
        if (w < 3 || !/[a-zA-Z]/.test(s)) return;
        if (w > 26) {
          var mid = s.indexOf(', ', Math.floor(s.length / 2) - 20);
          if (mid > 0) {
            var s1 = s.slice(0, mid + 1), s2 = s.slice(mid + 2), c1 = s1.split(' ').filter(function (x) { return norm(x); }).length;
            out.push({ s: s1, who: who, a: a, b: a + c1 - 1 }); out.push({ s: s2, who: who, a: a + c1, b: a + cnt - 1 }); return;
          }
        }
        out.push({ s: s, who: who, a: a, b: a + cnt - 1 });
      });
    });
    return out;
  }
  var TCACHE = {};
  function timing(url) {
    if (!url) return Promise.resolve(null);
    if (!TCACHE[url]) TCACHE[url] = fetch(url, { cache: 'force-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    return TCACHE[url];
  }
  /* gắn mốc thời gian (giây) cho từng câu của Section n */
  function attach(list, T, n) {
    var arr = T && T.s && T.s[n], cov = T && T.cov && T.cov[n];
    if (!arr || (cov != null && cov < 0.25)) return list;
    list.forEach(function (x) {
      if (x.a == null || arr[x.a] == null) return;
      var t0 = Math.max(0, arr[x.a] - 0.3), nx = arr[x.b + 1], t1 = (nx != null ? nx : arr[x.b] + 0.9) + 0.25;
      if (t1 - t0 > 0.6 && t1 - t0 < 30) { x.t0 = +t0.toFixed(2); x.t1 = +t1.toFixed(2); }
    });
    return list;
  }

  var DCSS = "html{background:#FFF8EE!important}body,body.paper-texture{background:radial-gradient(60% 50% at 0% 0%,#FFE3EC 0%,transparent 70%),radial-gradient(55% 50% at 100% 0%,#DDF4FF 0%,transparent 70%),radial-gradient(60% 55% at 100% 100%,#E3FBEF 0%,transparent 70%),radial-gradient(60% 55% at 0% 100%,#FFF3C9 0%,transparent 70%),#FFF8EE!important;background-image:radial-gradient(60% 50% at 0% 0%,#FFE3EC 0%,transparent 70%),radial-gradient(55% 50% at 100% 0%,#DDF4FF 0%,transparent 70%),radial-gradient(60% 55% at 100% 100%,#E3FBEF 0%,transparent 70%),radial-gradient(60% 55% at 0% 100%,#FFF3C9 0%,transparent 70%)!important}body:before{content:\"\";position:fixed;inset:0;pointer-events:none;z-index:0;background-image:radial-gradient(5px 5px at 8% 20%,#FF6B8B 50%,transparent 52%),radial-gradient(4px 4px at 22% 82%,#FECA57 50%,transparent 52%),radial-gradient(6px 6px at 91% 16%,#48C6EF 50%,transparent 52%),radial-gradient(4px 4px at 86% 74%,#1DD1A1 50%,transparent 52%),radial-gradient(5px 5px at 52% 6%,#A78BFA 50%,transparent 52%),radial-gradient(4px 4px at 4% 58%,#FF9F43 50%,transparent 52%),radial-gradient(5px 5px at 97% 46%,#FF6FB5 50%,transparent 52%)}#app>div.min-h-screen{background:rgba(255,255,255,.55)!important;backdrop-filter:blur(6px);border:2px solid #fff!important;box-shadow:0 30px 70px -30px rgba(255,107,139,.45)!important;position:relative}#app main{background:transparent!important}#app header.sticky{background:#fff!important;border-radius:22px;border:0!important;box-shadow:0 10px 26px -18px rgba(80,60,160,.5)}#app header.sticky:after{content:\"\";position:absolute;left:18px;right:18px;bottom:0;height:4px;border-radius:9px;background:linear-gradient(90deg,#FF6B8B,#FF9F43,#FECA57,#1DD1A1,#48C6EF,#A78BFA)}#app header.sticky h1{color:#2A2350!important}#app header.sticky div[class*=\"tracking-widest\"],#app header.sticky span{color:#8B84B8!important}#app header.sticky select{background:#F3F0FF!important;color:#2A2350!important}#app header.sticky button{background:linear-gradient(135deg,#A78BFA,#48C6EF)!important;color:#fff!important}.nv-exit{background:linear-gradient(135deg,#FF6B8B,#FF9F43)!important}#app .nv-type section.bg-white{position:relative;overflow:hidden;background:#fff!important;border:0!important;border-radius:30px!important;box-shadow:0 0 0 3px var(--dl),0 30px 60px -28px var(--dc)!important;transition:box-shadow .4s}#app .nv-type section.bg-white:before{content:\"\";position:absolute;left:0;right:0;top:0;height:8px;background:linear-gradient(90deg,#FF6B8B,#FF9F43,#FECA57,#1DD1A1,#48C6EF,#A78BFA,#FF6FB5)}#app .nv-type section.bg-white:after{content:\"\";position:absolute;right:-70px;bottom:-80px;width:240px;height:240px;border-radius:999px;background:var(--dl);opacity:.7;pointer-events:none;transition:background .4s}#app .nv-type section>div.border-b{background:transparent!important;border:0!important;position:relative;z-index:1}#app .nv-count{color:var(--dc)}#app .nv-count small{color:#9A93C2}#app .nv-prog{background:#F1EEFA}#app .nv-prog i{background:linear-gradient(90deg,#FF6B8B,#FF9F43,#FECA57,#1DD1A1,#48C6EF,#A78BFA)!important}#app .nv-type section>div.border-b>span:last-child{background:var(--dl)!important;color:var(--dd)!important}#app .nv-stage{background:transparent!important;position:relative;z-index:1}#app .nv-stage [class*=\"tracking-widest\"]{color:var(--dc)!important}#app .nv-stage>div:nth-child(2)>div:last-child{background:var(--dl)!important;border:0!important;color:var(--dd)!important;box-shadow:none!important;font-weight:800}#app .nv-type button[aria-label=\"Nghe\"]{background:linear-gradient(135deg,var(--dc),var(--d2))!important;color:#fff!important;box-shadow:0 0 0 10px var(--dl),0 18px 36px -12px var(--dc)!important}#app .nv-type button[aria-label=\"Nghe\"] *{color:#fff!important}#app .nv-type button[aria-label=\"Nghe\"]:before,#app .nv-type button[aria-label=\"Nghe\"]:after{border-color:var(--dc)!important}#app .nv-type #inputWrapper{background:#FFFDF8!important;border:2.5px dashed var(--dc)!important}#app .nv-type #inputWrapper:focus-within{border-style:solid!important;background:#fff!important;box-shadow:0 0 0 5px var(--dl)!important}#app .nv-stage .char-typed{color:var(--dd)!important;border-bottom-color:var(--dc)!important}#app .nv-stage .char-error{color:#E11D48!important;border-bottom-color:#E11D48!important;background:#FFE4E6}#app .nv-stage .char-hint{color:#D97706!important}#app .nv-stage .char-box:not(.char-typed):not(.char-error):not(.char-hint){color:#C9C3E3!important;border-bottom-color:#E4DFF5!important}#app .nv-type #typingFeedback{color:#10B981}#app .nv-type section>div.border-t{background:#FBF9FF!important;border-top:0!important;position:relative;z-index:1}#app .nv-type section>div.border-t>div{background:transparent!important;gap:6px}#app .nv-type section>div.border-t>div>button{border-radius:999px!important;font-weight:800!important}#app .nv-type section>div.border-t>div>button:nth-child(1){background:#E0F2FE!important;color:#0369A1!important}#app .nv-type section>div.border-t>div>button:nth-child(2){background:#DCFCE7!important;color:#15803D!important}#app .nv-type section>div.border-t>div>button:nth-child(3){background:#EDE9FE!important;color:#6D28D9!important}#app .nv-type section>div.border-t>div>button:nth-child(4){background:#FEF3C7!important;color:#B45309!important}#app .nv-type section>div.border-t>div>button:nth-child(5){background:#FFE4EF!important;color:#BE185D!important}#app .nv-type section>div.border-t>div>button *{color:inherit!important}#app .nv-type section>div.border-t>button:last-child{background:linear-gradient(135deg,var(--dc),var(--d2))!important;color:#fff!important;box-shadow:0 12px 24px -12px var(--dc)!important}#app .nv-type section>div.border-t>button:last-child *{color:#fff!important}#app .nv-type section>div.border-t>button:first-child{background:#fff!important;border:2px solid #EEE9FB!important;color:#5B5394!important}#app div:has(>button[onclick=\"setPhraseMode()\"]){display:none!important}#purpleProgressBar{background:linear-gradient(90deg,#FF6B8B,#FECA57,#1DD1A1,#48C6EF)!important}.nv-side{filter:drop-shadow(0 8px 14px rgba(120,90,200,.25))}";
  var PAL = '[["#FF6B8B","#FF9F43","#FFE4EA","#BE123C"],["#FF9F43","#FECA57","#FFEDD5","#C2410C"],["#10B981","#48C6EF","#D1FAE5","#047857"],["#3B82F6","#48C6EF","#DBEAFE","#1D4ED8"],["#8B5CF6","#FF6FB5","#EDE9FE","#6D28D9"],["#EC4899","#A78BFA","#FCE7F3","#BE185D"]]';
  /* Nghĩa tiếng Việt cho từng câu (AI dịch 1 lần / phần, lưu trên máy) */
  function translate(list, key) {
    var K = 'nv-dict-vi:' + (key || ''), cache = null;
    try { cache = JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) {}
    var src = list.map(function (x) { return x.s; });
    if (cache && cache.length === src.length) { list.forEach(function (x, i) { x.vi = cache[i]; }); return Promise.resolve(); }
    return plan().then(function (P) {
      if (!P || !P.groqFetch) return;
      var body = { model: 'openai/gpt-oss-20b', temperature: 0.2, max_tokens: 6000, reasoning_effort: 'low', response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: 'Translate each English sentence (lines from an IELTS Listening conversation or talk) into short, natural Vietnamese that a learner can use as a hint. Keep names and numbers. Respond with JSON only: {"vi": ["...", ...]} with exactly the same number of items, in the same order.' },
          { role: 'user', content: JSON.stringify(src) }] };
      var go = P.groqFetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, 'speaking')
        .then(function (r) { return r.json(); }).then(function (j) {
          var t = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content, o = JSON.parse(t || '{}');
          if (o && Array.isArray(o.vi) && o.vi.length === src.length) { list.forEach(function (x, i) { x.vi = String(o.vi[i] || ''); }); if (key) try { localStorage.setItem(K, JSON.stringify(o.vi)); } catch (e) {} }
        });
      return Promise.race([go, new Promise(function (r) { setTimeout(r, 20000); })]);
    }).catch(function (e) { console.warn('Chưa dịch được nghĩa:', e); });
  }
  var planP = null;
  function plan() {
    if (window.NightPlan) return Promise.resolve(window.NightPlan);
    if (planP) return planP;
    planP = new Promise(function (res, rej) { var s = document.createElement('script'); s.src = ROOT + 'night-plan.js?v=20261123a'; s.onload = function () { res(window.NightPlan); }; s.onerror = rej; document.head.appendChild(s); });
    return planP;
  }
  function canUse(silent) {
    return plan().then(function (P) { return P.init().then(function () { return P; }); }).then(function (P) {
      var r = P.role(), ok = r === 'admin' || r === 'student' || (r === 'pro' && P.tierOf(P.me()) === 'astra');
      if (!ok && !silent) P.openUpgrade('Chép chính tả bằng audio gốc của đề Listening là tính năng của gói 🌟 Astra.', 'astra');
      return ok;
    }).catch(function () { if (!silent) alert('Bạn đăng nhập rồi thử lại nhé.'); return false; });
  }

  var engP = null;
  function engine() {
    if (window.LTG_EN) return Promise.resolve(window.LTG_EN);
    if (engP) return engP;
    engP = new Promise(function (res, rej) { var s = document.createElement('script'); s.src = ROOT + 'luyengo/engine-en.js?v=20261110'; s.onload = function () { res(window.LTG_EN); }; s.onerror = rej; document.head.appendChild(s); });
    return engP;
  }
  /* ===== V3: giao diện TỐI GIẢN (kiểu "nghe – gõ" nền giấy): nghĩa tiếng Việt to ở giữa, câu tiếng Anh là các ô từ
     có gạch chân, chữ gõ đúng hiện màu xanh; câu trước hiện mờ phía trên; thống kê + nút gọn phía dưới. Không dùng iframe. ===== */
  function css() {
    if (document.getElementById('nvd-css')) return;
    var f = document.createElement('link'); f.rel = 'stylesheet'; f.href = 'https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600;700&display=swap'; document.head.appendChild(f);
    var st = document.createElement('style'); st.id = 'nvd-css';
    st.textContent = [
      '#nvd{position:fixed;inset:0;z-index:100070;background:#FAF8F4;color:#2B2B2B;display:flex;flex-direction:column;font-family:"Plus Jakarta Sans",system-ui,sans-serif;-webkit-font-smoothing:antialiased}',
      '#nvd .top{display:flex;align-items:center;gap:12px;padding:14px 20px 0}',
      '#nvd .x{border:0;background:transparent;font-size:22px;line-height:1;color:#9a958c;cursor:pointer;padding:6px 8px;border-radius:10px}#nvd .x:hover{background:#EFECE6;color:#2B2B2B}',
      '#nvd .ttl{flex:1;min-width:0;font-size:13px;color:#9a958c;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#nvd .cnt{font-size:13px;color:#9a958c;font-weight:700;font-variant-numeric:tabular-nums}',
      '#nvd .bar{height:3px;background:#ECE8E1;margin:12px 20px 0;border-radius:3px;overflow:hidden}#nvd .bar i{display:block;height:100%;background:#5DBB7E;transition:width .3s}',
      '#nvd .prev{min-height:22px;text-align:center;font-size:12.5px;color:#a8a39a;margin:22px 16px 0;display:flex;justify-content:center;gap:14px;flex-wrap:wrap}#nvd .prev b{color:#7d786f;font-weight:600}#nvd .prev .ok{color:#5DBB7E}',
      '#nvd .mid{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 18px 0;min-height:0;overflow:auto}',
      '#nvd .vi{font-size:clamp(22px,3.6vw,38px);font-weight:700;color:#3a3833;text-align:center;max-width:900px;line-height:1.35;letter-spacing:.01em}',
      '#nvd .who{margin-top:8px;font-size:11.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#b9b3a8}',
      '#nvd .words{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 18px;margin:38px 0 6px;max-width:1000px;cursor:text}',
      '#nvd .w{display:flex;flex-direction:column;align-items:center}',
      '#nvd .w .t{font-family:"Source Serif 4",Georgia,serif;font-weight:700;font-size:clamp(24px,3.4vw,40px);line-height:1.15;color:#5DBB7E;white-space:pre;min-height:1.15em}',
      '#nvd .w .t .g{color:transparent}#nvd .w .t .bad{color:#E0675A;animation:nvdShake .25s}#nvd .w .t .hint{color:#E3A33B}#nvd .w .t .rv{color:#9E9AA8}',
      '#nvd .w .u{height:2px;width:100%;background:#D9D4CA;margin-top:4px;border-radius:2px}#nvd .w.cur .u{background:#5DBB7E;height:3px}#nvd .w.done .u{background:#BFE3CB}',
      '#nvd .p{font-family:"Source Serif 4",Georgia,serif;font-weight:700;font-size:clamp(24px,3.4vw,40px);color:#C9C3B8;align-self:flex-start}',
      '@keyframes nvdShake{25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}',
      '#nvd .play{margin-top:18px;border:0;background:#fff;box-shadow:0 0 0 1px #E6E1D8;width:46px;height:46px;border-radius:50%;cursor:pointer;color:#5DBB7E;font-size:17px;display:grid;place-items:center}#nvd .play:hover{box-shadow:0 0 0 2px #5DBB7E}#nvd .play.on{background:#5DBB7E;color:#fff}',
      '#nvd .msg{min-height:20px;margin-top:12px;font-size:13px;color:#5DBB7E;font-weight:700}',
      '#nvd .stats{display:flex;justify-content:center;gap:0;margin:8px auto 0;font-size:12.5px;color:#9a958c}#nvd .stats span{padding:4px 14px;border-left:1px solid #E6E1D8}#nvd .stats span:first-child{border-left:0}#nvd .stats b{color:#5DBB7E;margin-left:5px}#nvd .stats .e{color:#E0675A}#nvd .stats .r{color:#6C70DC}',
      '#nvd .acts{display:flex;justify-content:center;flex-wrap:wrap;gap:8px;padding:14px 16px max(18px,env(safe-area-inset-bottom))}',
      '#nvd .acts button{border:0;background:#fff;box-shadow:0 0 0 1px #E6E1D8;border-radius:10px;padding:9px 14px;font:700 13px inherit;color:#5d5850;cursor:pointer;display:inline-flex;align-items:center;gap:7px}#nvd .acts button:hover{box-shadow:0 0 0 1.5px #bdb6aa}',
      '#nvd .acts kbd{font:600 10.5px inherit;color:#aaa49a;background:#F3F0EA;border-radius:5px;padding:1px 5px}',
      '#nvd .acts .go{background:#5DBB7E;color:#fff;box-shadow:none}#nvd .acts .go kbd{background:rgba(255,255,255,.25);color:#fff}#nvd .acts .go:hover{background:#4FAA6F;box-shadow:none}',
      '#nvd .acts .slow.on{background:#EEF7F1;box-shadow:0 0 0 1.5px #5DBB7E;color:#3E8E5A}',
      '#nvd .hid{position:absolute;opacity:0;left:-9999px;top:0;width:1px;height:1px}',
      '@media(max-width:640px){#nvd .acts kbd{display:none}#nvd .words{gap:8px 12px;margin-top:26px}#nvd .acts button{padding:9px 11px}}'
    ].join('\n');
    document.head.appendChild(st);
  }
  function open(o) {
    var list = o.items || []; if (!list.length) return;
    css();
    var wait = document.createElement('div'); wait.id = 'nv-dict-wait';
    wait.style.cssText = 'position:fixed;inset:0;z-index:100071;display:grid;place-items:center;background:rgba(250,248,244,.92);font:700 15px/1.5 "Plus Jakarta Sans",system-ui,sans-serif;color:#7d786f;text-align:center';
    wait.innerHTML = '<div><div style="width:30px;height:30px;margin:0 auto 12px;border:3px solid #E6E1D8;border-top-color:#5DBB7E;border-radius:50%;animation:nvdsp 1s linear infinite"></div>Đang chuẩn bị bài và nghĩa tiếng Việt...</div><style>@keyframes nvdsp{to{transform:rotate(360deg)}}</style>';
    document.body.appendChild(wait);
    return Promise.resolve(o.noVi ? null : translate(list, o.viKey)).then(function () {
      wait.remove();
      var hasSeg = list.some(function (x) { return x.t0 != null; }), AU = o.audio && hasSeg ? new Audio(o.audio) : null, stopAt = 0, slow = false;
      if (AU) AU.preload = 'auto';
      var W = document.createElement('div'); W.id = 'nvd';
      W.innerHTML = '<div class="top"><button class="x" title="Đóng (Esc)">✕</button><div class="ttl"></div><div class="cnt"></div></div><div class="bar"><i></i></div>' +
        '<div class="prev"></div><div class="mid"><div class="vi"></div><div class="who"></div><div class="words"></div><button class="play" title="Nghe lại">▶</button><div class="msg"></div></div>' +
        '<div class="stats"><span>Đã đúng<b class="c">0</b></span><span>Đã sai<b class="e">0</b></span><span>Tỉ lệ đúng<b class="r">–</b></span></div>' +
        '<div class="acts"><button data-a="prev">← Câu trước</button><button data-a="play">🔊 Nghe lại <kbd>⌘⇧</kbd></button><button data-a="slow" class="slow">🐢 Chậm</button><button data-a="hint">💡 Gợi ý <kbd>Tab</kbd></button><button data-a="show">👁 Xem đáp án</button><button data-a="next" class="go">Tiếp <kbd>Enter</kbd></button></div>' +
        '<input class="hid" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">';
      document.body.appendChild(W);
      var ovf = document.body.style.overflow; document.body.style.overflow = 'hidden';
      var $ = function (q) { return W.querySelector(q); }, inp = $('.hid');
      $('.ttl').textContent = o.title || 'Chép chính tả';
      var norm1 = function (c) { return String(c).toLowerCase().replace(/[’‘`]/g, "'"); };
      var isL = function (c) { return /[A-Za-z0-9]/.test(c); };
      var idx = 0, S = null, ok = 0, bad = 0, done = {};
      function build(k) {
        var x = list[k], words = x.s.split(/\s+/).filter(Boolean);
        S = { k: k, words: words.map(function (w) { return { raw: w, chars: w.split(''), got: w.split('').map(function (c) { return isL(c) ? null : c; }) }; }), bad: false, finished: false, flag: {} };
        render();
      }
      function cursor() { for (var i = 0; i < S.words.length; i++) for (var j = 0; j < S.words[i].chars.length; j++) if (S.words[i].got[j] == null) return [i, j]; return null; }
      function render() {
        var x = list[S.k], cur = cursor();
        $('.cnt').textContent = (S.k + 1) + ' / ' + list.length;
        $('.bar i').style.width = (Object.keys(done).length / list.length * 100) + '%';
        $('.vi').textContent = x.vi || x.tag || '';
        $('.who').textContent = x.who || '';
        var pv = list[S.k - 1];
        $('.prev').innerHTML = pv ? '<span>Câu trước</span><b>' + esc(pv.s) + '</b>' + (done[S.k - 1] === 'ok' ? '<span class="ok">✓</span>' : '') + (pv.vi ? '<span>' + esc(pv.vi) + '</span>' : '') : '';
        $('.words').innerHTML = S.words.map(function (w, i) {
          var letters = w.chars.map(function (c, j) {
            var g = w.got[j]; if (!isL(c)) return /[.,!?;:"”“()]/.test(c) ? '' : '<span>' + esc(c) + '</span>';
            var fl = S.flag[i + ':' + j];
            return g == null ? '<span class="g">' + esc(c) + '</span>' : '<span class="' + (fl || '') + '">' + esc(c) + '</span>';
          }).join('');
          var punct = w.chars.filter(function (c) { return /[.,!?;:"”“()]/.test(c); }).join('');
          var cls = 'w' + (cur && cur[0] === i ? ' cur' : '') + (w.got.every(function (g) { return g != null; }) ? ' done' : '');
          return '<span class="' + cls + '"><span class="t">' + letters + '</span><span class="u"></span></span>' + (punct ? '<span class="p">' + esc(punct) + '</span>' : '');
        }).join('');
        $('.msg').textContent = S.finished ? (S.bad ? 'Xong câu này — nhấn Enter để sang câu tiếp' : 'Chính xác! Nhấn Enter để sang câu tiếp') : '';
        var tot = ok + bad; $('.stats .c').textContent = ok; $('.stats .e').textContent = bad; $('.stats .r').textContent = tot ? Math.round(ok / tot * 100) + '%' : '–';
      }
      function finish() {
        if (S.finished) return; S.finished = true;
        if (done[S.k] == null) { if (S.bad) bad++; else ok++; done[S.k] = S.bad ? 'bad' : 'ok'; if (o.onResult) try { o.onResult(list[S.k], S.bad); } catch (e) {} }
        render();
      }
      function typeChar(c) {
        if (S.finished) return; var cur = cursor(); if (!cur) return finish();
        var want = S.words[cur[0]].chars[cur[1]];
        if (norm1(c) === norm1(want)) { S.words[cur[0]].got[cur[1]] = want; delete S.flag[cur[0] + ':' + cur[1]]; if (!cursor()) finish(); else render(); }
        else { S.bad = true; var el = $('.w.cur .t .g'); if (el) { el.textContent = c; el.className = 'bad'; setTimeout(render, 260); } }
      }
      function back() { if (S.finished) return; var last = null; S.words.forEach(function (w, i) { w.chars.forEach(function (c, j) { if (isL(c) && w.got[j] != null) last = [i, j]; }); }); if (last) { S.words[last[0]].got[last[1]] = null; render(); } }
      function hint() { var cur = cursor(); if (!cur) return; S.bad = true; var w = S.words[cur[0]]; for (var j = cur[1]; j < w.chars.length; j++) if (isL(w.chars[j])) { w.got[j] = w.chars[j]; S.flag[cur[0] + ':' + j] = 'hint'; } if (!cursor()) finish(); else render(); }
      function reveal() { S.bad = true; S.words.forEach(function (w, i) { w.chars.forEach(function (c, j) { if (w.got[j] == null) { w.got[j] = c; S.flag[i + ':' + j] = 'rv'; } }); }); finish(); }
      function play() {
        var x = list[S.k]; try { speechSynthesis.cancel(); } catch (e) {}
        if (AU && x.t0 != null) { AU.playbackRate = slow ? 0.75 : 1; try { AU.currentTime = x.t0; } catch (e) {} stopAt = x.t1; var pr = AU.play(); if (pr && pr.catch) pr.catch(function () {}); $('.play').classList.add('on'); tick(); return; }
        try { var u = new SpeechSynthesisUtterance(x.s); u.lang = 'en-GB'; u.rate = slow ? 0.7 : 0.95; speechSynthesis.speak(u); } catch (e) {}
      }
      function tick() { if (!AU) return; if (stopAt && AU.currentTime >= stopAt) { AU.pause(); stopAt = 0; $('.play').classList.remove('on'); return; } if (stopAt) requestAnimationFrame(tick); }
      function go(k) { if (k < 0 || k >= list.length) { if (k >= list.length) close(); return; } if (AU) AU.pause(); build(k); setTimeout(play, 150); focus(); }
      function next() { if (!S.finished) { if (!cursor()) finish(); else { S.bad = true; if (done[S.k] == null) { bad++; done[S.k] = 'bad'; if (o.onResult) try { o.onResult(list[S.k], true); } catch (e) {} } } } go(S.k + 1); }
      function focus() { try { inp.focus({ preventScroll: true }); } catch (e) {} }
      function close() { if (AU) AU.pause(); try { speechSynthesis.cancel(); } catch (e) {} document.removeEventListener('keydown', onKey, true); W.remove(); document.body.style.overflow = ovf; if (o.onClose) o.onClose(); }
      var shiftOnly = false;
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'Shift' || e.key === 'Meta' || e.key === 'Control')) { shiftOnly = true; return; }
        shiftOnly = false;
        if (e.key === 'Enter') { e.preventDefault(); if (S.finished) next(); else if (!cursor()) finish(); return; }
        if (e.key === 'Tab') { e.preventDefault(); hint(); return; }
        if (e.key === 'Backspace') { e.preventDefault(); back(); return; }
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.key && e.key.length === 1 && e.key !== ' ') { e.preventDefault(); typeChar(e.key); }
        else if (e.key === ' ') e.preventDefault();
      }
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('keyup', function (e) { if (shiftOnly && (e.key === 'Shift' || e.key === 'Meta' || e.key === 'Control')) { shiftOnly = false; play(); } }, true);
      /* điện thoại: gõ qua ô ẩn */
      inp.addEventListener('input', function () { var v = inp.value; inp.value = ''; for (var i = 0; i < v.length; i++) if (v[i] !== ' ') typeChar(v[i]); });
      W.addEventListener('click', function (e) {
        var b = e.target.closest('button'); focus(); if (!b) return;
        if (b.classList.contains('x')) return close();
        if (b.classList.contains('play')) return play();
        var a = b.dataset.a;
        if (a === 'prev') go(S.k - 1); else if (a === 'play') play(); else if (a === 'slow') { slow = !slow; b.classList.toggle('on', slow); play(); }
        else if (a === 'hint') hint(); else if (a === 'show') reveal(); else if (a === 'next') next();
      });
      build(0); setTimeout(function () { play(); focus(); }, 300);
      return !!AU;
    }).catch(function (e) { wait.remove(); console.warn(e); alert('Chưa mở được bài — kiểm tra mạng rồi thử lại nhé.'); });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  window.NVDict = { sentences: sentences, timing: timing, attach: attach, open: open, canUse: canUse, ROOT: ROOT };
})();
