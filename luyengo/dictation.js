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
    st.textContent = '#nv-dict-play{position:fixed;inset:0;z-index:100070;background:#1B1F4B;display:flex;flex-direction:column}#nv-dict-play iframe{flex:1;border:0;width:100%}';
    document.head.appendChild(st);
  }
  function open(o) {
    var list = o.items || []; if (!list.length) return;
    return engine().then(function (E) {
      css();
      var items = list.map(function (x) { return { phrase: x.s, meaningVi: x.tag + (x.who ? ' · ' + x.who : ''), sentence: x.s, sentenceVi: '' }; });
      var html = E.build(o.title || 'Chép chính tả', items, 'blue').replace(/<script src="\/night-app\.js"[^>]*><\/script>/, '');
      var seg = {}; list.forEach(function (x) { if (x.t0 != null) seg[x.s] = [x.t0, x.t1]; });
      var useAudio = o.audio && Object.keys(seg).length;
      /* 1) mở thẳng màn gõ  2) phát đúng đoạn audio gốc thay cho giọng máy  3) báo câu sai ra ngoài */
      var js = '<script>(function(){var bad={},cur=-1;' +
        (useAudio ? 'var SEG=' + JSON.stringify(seg) + ',AU=new Audio(' + JSON.stringify(o.audio) + '),stop=0;AU.preload="auto";' +
          'function tick(){if(stop&&AU.currentTime>=stop){AU.pause();stop=0;return}if(stop)requestAnimationFrame(tick)}' +
          'var ORIG=window.speak;window.speak=function(t,r){var g=SEG[t];if(!g)return ORIG&&ORIG.apply(this,arguments);try{speechSynthesis.cancel()}catch(e){}try{parent.postMessage("nv-speak","*")}catch(e){}' +
          'AU.playbackRate=(r&&r<1)?0.75:1;try{AU.currentTime=g[0]}catch(e){}stop=g[1];var p=AU.play();if(p&&p.catch)p.catch(function(){});requestAnimationFrame(tick)};' : '') +
        'function w(n,f){var o=window[n];if(typeof o!=="function")return;window[n]=function(){f();return o.apply(this,arguments);};}' +
        'function i(){return typeof state!=="undefined"?state.practiceIndex:-1}' +
        'w("reveal",function(){bad[i()]=1;});w("giveHint",function(){bad[i()]=1;});' +
        'setInterval(function(){try{if(state.errorIndex>=0||state.hintActive)bad[i()]=1;var k=i();if(k!==cur){if(cur>=0)parent.postMessage({nvDict:{i:cur,bad:!!bad[cur],ok:!!state}},"*");cur=k;}}catch(e){}},150);' +
        'window.__nvDictFlush=function(){try{parent.postMessage({nvDict:{i:cur,bad:!!bad[cur],last:1}},"*")}catch(e){}};' +
        '(function go(){var a=document.getElementById("app");if(!a||!a.firstChild||typeof state==="undefined"||typeof render!=="function")return setTimeout(go,60);state.viewMode="type";state.practiceType="phrase";state.practiceIndex=0;state.input="";state.completed=false;state.revealed=false;render(0);setTimeout(function(){var h=document.getElementById("hiddenInput");if(h)h.focus();try{speak(current().audioText,1)}catch(e){}},400);})();' +
        '})();<\/script>';
      var skin = '<script>window.NV_SKIN=' + JSON.stringify({ lang: 'en', ac: '#6C70DC', img: ROOT + 'khoahoc/img/ira/', pkey: '', theme: 'night' }) + '<\/script><script src="' + ROOT + 'luyengo/skin.js?v=2"><\/script>';
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
    });
  }
  window.NVDict = { sentences: sentences, timing: timing, attach: attach, open: open, canUse: canUse, ROOT: ROOT };
})();
