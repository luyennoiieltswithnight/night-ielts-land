/* Night IELTS — CHÉP CHÍNH TẢ đề Listening (dùng chung cho trang đề và trang chinhta.html)
   NVDict.sentences(root, n)        -> các câu của transcript Section n (kèm vị trí từ để tra mốc thời gian)
   NVDict.timing(alignUrl)          -> Promise mốc thời gian từng từ (file testN-align.json, dò sẵn từ audio gốc)
   NVDict.open({ title, items, audio, onResult }) -> mở khung Nghe – Gõ toàn màn hình.
     items: [{ s, who, tag, t0, t1 }] — có t0/t1 thì phát đúng đoạn trong AUDIO GỐC, không có thì đọc bằng giọng máy.
   NVDict.canUse() -> Promise<boolean>: gói Astra, Học sinh, thầy (người khác bấm sẽ hiện bảng nâng cấp). */
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
    planP = new Promise(function (res, rej) { var s = document.createElement('script'); s.src = ROOT + 'night-plan.js?v=20261113a'; s.onload = function () { res(window.NightPlan); }; s.onerror = rej; document.head.appendChild(s); });
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
  function css() {
    if (document.getElementById('nv-dictp-css')) return;
    var st = document.createElement('style'); st.id = 'nv-dictp-css';
    st.textContent = '#nv-dict-play{position:fixed;inset:0;z-index:100070;background:#FFF8EE;display:flex;flex-direction:column}#nv-dict-play iframe{flex:1;border:0;width:100%}';
    document.head.appendChild(st);
  }
  function open(o) {
    var list = o.items || []; if (!list.length) return;
    css();
    var wait = document.createElement('div'); wait.id = 'nv-dict-wait';
    wait.style.cssText = 'position:fixed;inset:0;z-index:100071;display:grid;place-items:center;background:rgba(36,36,42,.55);backdrop-filter:blur(6px);font:700 15px/1.5 "Plus Jakarta Sans",system-ui,sans-serif;color:#fff;text-align:center';
    wait.innerHTML = '<div><div style="width:34px;height:34px;margin:0 auto 12px;border:4px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:nvdsp 1s linear infinite"></div>Đang chuẩn bị bài và nghĩa tiếng Việt...</div><style>@keyframes nvdsp{to{transform:rotate(360deg)}}</style>';
    document.body.appendChild(wait);
    return Promise.all([engine(), o.noVi ? null : translate(list, o.viKey)]).then(function (res) {
      var E = res[0]; wait.remove();
      var items = list.map(function (x) { return { phrase: x.s, meaningVi: x.vi || (x.tag + (x.who ? ' · ' + x.who : '')), sentence: x.s, sentenceVi: x.vi || '' }; });
      var html = E.build(o.title || 'Chép chính tả', items, 'blue').replace(/<script src="\/night-app\.js"[^>]*><\/script>/, '');
      var seg = {}; list.forEach(function (x) { if (x.t0 != null) seg[x.s] = [x.t0, x.t1]; });
      var useAudio = o.audio && Object.keys(seg).length;
      /* 1) mở thẳng màn gõ  2) phát đúng đoạn audio gốc thay cho giọng máy  3) báo câu sai ra ngoài */
      var js = '<style>' + DCSS + '</style><script>(function(){var bad={},cur=-1,PAL=' + PAL + ';function paint(k){var c=PAL[(k<0?0:k)%PAL.length],r=document.documentElement.style;r.setProperty("--dc",c[0]);r.setProperty("--d2",c[1]);r.setProperty("--dl",c[2]);r.setProperty("--dd",c[3]);}paint(0);' +
        (useAudio ? 'var SEG=' + JSON.stringify(seg) + ',AU=new Audio(' + JSON.stringify(o.audio) + '),stop=0;AU.preload="auto";' +
          'function tick(){if(stop&&AU.currentTime>=stop){AU.pause();stop=0;return}if(stop)requestAnimationFrame(tick)}' +
          'var ORIG=window.speak;window.speak=function(t,r){var g=SEG[t];if(!g)return ORIG&&ORIG.apply(this,arguments);try{speechSynthesis.cancel()}catch(e){}try{parent.postMessage("nv-speak","*")}catch(e){}' +
          'AU.playbackRate=(r&&r<1)?0.75:1;try{AU.currentTime=g[0]}catch(e){}stop=g[1];var p=AU.play();if(p&&p.catch)p.catch(function(){});requestAnimationFrame(tick)};' : '') +
        'function w(n,f){var o=window[n];if(typeof o!=="function")return;window[n]=function(){f();return o.apply(this,arguments);};}' +
        'function i(){return typeof state!=="undefined"?state.practiceIndex:-1}' +
        'w("reveal",function(){bad[i()]=1;});w("giveHint",function(){bad[i()]=1;});' +
        'setInterval(function(){try{if(state.errorIndex>=0||state.hintActive)bad[i()]=1;var k=i();if(k!==cur){paint(k);if(cur>=0)parent.postMessage({nvDict:{i:cur,bad:!!bad[cur],ok:!!state}},"*");cur=k;}}catch(e){}},150);' +
        'window.__nvDictFlush=function(){try{parent.postMessage({nvDict:{i:cur,bad:!!bad[cur],last:1}},"*")}catch(e){}};' +
        '(function go(){var a=document.getElementById("app");if(!a||!a.firstChild||typeof state==="undefined"||typeof render!=="function")return setTimeout(go,60);state.viewMode="type";state.practiceType="phrase";state.practiceIndex=0;state.input="";state.completed=false;state.revealed=false;render(0);setTimeout(function(){var h=document.getElementById("hiddenInput");if(h)h.focus();try{speak(current().audioText,1)}catch(e){}},400);})();' +
        '})();<\/script>';
      var skin = '<script>window.NV_SKIN=' + JSON.stringify({ lang: 'en', ac: '#6C70DC', img: ROOT + 'khoahoc/img/ira/', pkey: '', theme: 'dict' }) + '<\/script><script src="' + ROOT + 'luyengo/skin.js?v=2"><\/script>';
      html = html.replace(/<\/body>\s*<\/html>\s*$/, skin + js + '</body></html>');
      var wrap = document.createElement('div'); wrap.id = 'nv-dict-play';
      var fr = document.createElement('iframe'); fr.setAttribute('allow', 'autoplay'); wrap.appendChild(fr); document.body.appendChild(wrap);
      var ov = document.body.style.overflow; document.body.style.overflow = 'hidden';
      fr.srcdoc = html;
      var onMsg = function (e) {
        if (e.source !== fr.contentWindow) return;
        if (e.data && e.data.nvDict) { var it = list[e.data.nvDict.i]; if (it && o.onResult) o.onResult(it, !!e.data.nvDict.bad); }
        if (e.data === 'nv-close') close();
      };
      var close = function () { try { fr.contentWindow.__nvDictFlush && fr.contentWindow.__nvDictFlush(); } catch (e) {} setTimeout(function () { window.removeEventListener('message', onMsg); wrap.remove(); document.body.style.overflow = ov; if (o.onClose) o.onClose(); }, 60); };
      window.addEventListener('message', onMsg);
      return useAudio;
    }).catch(function (e) { wait.remove(); alert('Chưa mở được bài — kiểm tra mạng rồi thử lại nhé.'); });
  }
  window.NVDict = { sentences: sentences, timing: timing, attach: attach, open: open, canUse: canUse, ROOT: ROOT };
})();
