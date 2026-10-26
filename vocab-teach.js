/*
 * NIGHT IELTS — vocab-teach.js (dùng chung cho cả web)
 * Bôi đen 1 từ / cụm từ ngắn → nút "🎀 Giảng vocab" → thẻ to, dễ thương cho cả lớp nhìn:
 *   - Từ to + đọc mẫu (tự nhận tiếng Anh / tiếng Trung), phiên âm, từ loại
 *   - Ô nghĩa thầy tự gõ, hoặc ✨ AI dịch (có key Groq → dịch theo đúng câu trong bài; không có → Google Dịch)
 *   - Ảnh: 🎨 Irasutoya (dịch sang tiếng Nhật rồi tìm) · 📷 ảnh thật (Openverse / Wikimedia)
 *     · dán ảnh Ctrl+V / kéo thả / dán link · nút 🔎 Google mở Google Ảnh
 *   - Nghĩa + ảnh lưu theo từ trên máy (localStorage), lần sau mở lại có sẵn
 * Nạp ở cuối trang:
 *   <script src="https://nightielts.id.vn/vocab-teach.js" defer></script>
 * Trang dùng night-engine.js: nút nằm sẵn trong thanh bôi đen của engine (engine gọi NightVocabTeach.open).
 */
(function () {
  if (window.NightVocabTeach) return;
  var KEY = 'night-vocab-teach-v1:';
  var hasEngine = function () { return !!document.querySelector('script[src*="night-engine.js"]'); };

  /* ---------- tiện ích ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function load(w) { try { return JSON.parse(localStorage.getItem(KEY + w.toLowerCase()) || 'null'); } catch (e) { return null; } }
  function save(w, d) { try { localStorage.setItem(KEY + w.toLowerCase(), JSON.stringify(d)); } catch (e) { try { var c = Object.assign({}, d, { img: null }); localStorage.setItem(KEY + w.toLowerCase(), JSON.stringify(c)); } catch (e2) {} } }
  var isCJK = function (s) { return /[㐀-鿿]/.test(s); };
  function timeout(p, ms, v) { return Promise.race([p, new Promise(function (r) { setTimeout(function () { r(v); }, ms); })]); }
  /* ---- Giọng đọc: (1) bản ghi âm người thật của từ điển (từ đơn, ưu tiên giọng Anh)
     → (2) giọng Google Dịch → (3) giọng máy TỐT NHẤT có trên thiết bị (Natural/Online/Google/Siri…) ---- */
  var curAudio = null, dictCache = {};
  function stopAll() { try { speechSynthesis.cancel(); } catch (e) {} if (curAudio) { try { curAudio.pause(); } catch (e) {} curAudio = null; } }
  function playUrl(u, rate) {
    return new Promise(function (res, rej) {
      var a = new Audio(); curAudio = a;
      var t = setTimeout(function () { rej(new Error('timeout')); }, 4000);
      a.onerror = function () { clearTimeout(t); rej(new Error('audio')); };
      a.onplaying = function () { clearTimeout(t); res(); };
      a.playbackRate = rate || 1; a.src = u;
      var p = a.play(); if (p && p.catch) p.catch(function (e) { clearTimeout(t); rej(e); });
    });
  }
  var BAD_VOICE = /compact|espeak|fred|albert|zarvox|bad news|bells|bubbles|cellos|jester|organ|trinoids|whisper|wobble|boing|good news|superstar|junior|ralph|kathy|bahh|grandma|grandpa|rocko|shelley|sandy|eddy|flo|reed/i;
  function bestVoice(lang) {
    var vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    var base = lang.slice(0, 2), best = null, top = -1e9;
    vs.forEach(function (v) {
      var l = (v.lang || '').replace('_', '-');
      if (l.indexOf(base) !== 0) return;
      var n = v.name || '', sc = 0;
      if (l === lang) sc += 15;
      if (/natural|neural/i.test(n)) sc += 120;
      if (/online/i.test(n)) sc += 60;
      if (/google/i.test(n)) sc += 80;
      if (/premium|enhanced|siri/i.test(n)) sc += 70;
      if (/libby|sonia|maisie|ryan|thomas|serena|kate|daniel|samantha|ava|allison|jenny|aria|guy|xiaoxiao|tingting|yunxi/i.test(n)) sc += 40;
      if (BAD_VOICE.test(n)) sc -= 500;
      if (v.localService === false) sc += 5;
      if (sc > top) { top = sc; best = v; }
    });
    return best;
  }
  function synth(text, rate, lang) {
    if (!window.speechSynthesis) return;
    var u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = rate || 0.9; u.pitch = 1;
    var v = bestVoice(lang); if (v) u.voice = v;
    speechSynthesis.speak(u);
  }
  function speak(text, rate) {
    text = String(text || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    stopAll();
    var cjk = isCJK(text), lang = cjk ? 'zh-CN' : 'en-GB';
    var single = !cjk && !/\s/.test(text) && text.length < 40;
    var human = single ? Promise.resolve(dictCache[text.toLowerCase()] || dict(text)).then(function (d) { if (d && d.audio) return playUrl(d.audio, 1); throw 0; }) : Promise.reject(0);
    human.catch(function () {
      if (text.length > 190) throw 0;
      return playUrl('https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' + (cjk ? 'zh-CN' : 'en-GB') + '&q=' + encodeURIComponent(text), rate && rate < 0.9 ? 0.92 : 1);
    }).catch(function () { synth(text, rate, lang); });
  }
  try { if (window.speechSynthesis) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = function () {}; } } catch (e) {}
  function translate(text, sl, tl) {
    var g = fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + sl + '&tl=' + tl + '&dt=t&q=' + encodeURIComponent(text))
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { var o = d && d[0] ? d[0].map(function (c) { return c[0] || ''; }).join('') : ''; if (!o) throw 0; return o; });
    return g.catch(function () {
      return fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=' + (sl === 'auto' ? (isCJK(text) ? 'zh-CN' : 'en') : sl) + '|' + tl)
        .then(function (r) { return r.json(); }).then(function (d) { var t = d && d.responseData && d.responseData.translatedText; if (!t) throw new Error('empty'); return t; });
    });
  }
  function dict(w) {
    if (/\s/.test(w.trim()) || isCJK(w)) return Promise.resolve(null);
    var POS = { noun: 'n.', verb: 'v.', adjective: 'adj.', adverb: 'adv.', preposition: 'prep.', conjunction: 'conj.', pronoun: 'pron.' };
    return timeout(fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(w.trim().toLowerCase()))
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        if (!Array.isArray(j) || !j[0]) return null;
        var e = j[0], ph = (e.phonetics || []).filter(function (p) { return p.text; })[0];
        var m = (e.meanings || [])[0] || {};
        var auds = []; j.forEach(function (en) { (en.phonetics || []).forEach(function (p) { if (p.audio) auds.push(p.audio); }); });
        var audio = auds.filter(function (u) { return /-uk\.mp3/.test(u); })[0] || auds.filter(function (u) { return /-(us|au)\.mp3/.test(u); })[0] || auds[0] || '';
        var out = { ipa: e.phonetic || (ph && ph.text) || '', pos: POS[m.partOfSpeech] || m.partOfSpeech || '', audio: audio };
        dictCache[w.trim().toLowerCase()] = out;
        return out;
      }).catch(function () { return null; }), 8000, null);
  }
  function irasutoya(q) {
    return new Promise(function (res) {
      if (!q) return res([]);
      var cb = '__nightIra' + Date.now() + Math.floor(Math.random() * 1e5);
      var s = document.createElement('script');
      var t = setTimeout(function () { done(); res([]); }, 9000);
      function done() { clearTimeout(t); try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); }
      window[cb] = function (j) {
        done();
        var es = (j && j.feed && j.feed.entry) || [];
        res(es.map(function (e) { var th = e['media$thumbnail']; return th && { u: th.url.replace(/\/s72-c\//, '/s400/').replace(/=s72-c$/, '=s400'), src: 'Irasutoya' }; }).filter(Boolean));
      };
      s.onerror = function () { done(); res([]); };
      s.src = 'https://www.irasutoya.com/feeds/posts/summary?alt=json-in-script&max-results=10&q=' + encodeURIComponent(q) + '&callback=' + cb;
      document.head.appendChild(s);
    });
  }
  function photos(q) {
    var ov = fetch('https://api.openverse.org/v1/images/?page_size=10&mature=false&q=' + encodeURIComponent(q))
      .then(function (r) { return r.json(); }).then(function (j) { return (j.results || []).map(function (x) { return { u: x.thumbnail || x.url, src: 'Openverse' }; }); }).catch(function () { return []; });
    var wk = fetch('https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url|mime&iiurlwidth=500&gsrsearch=' + encodeURIComponent(q + ' filetype:bitmap'))
      .then(function (r) { return r.json(); }).then(function (j) {
        return Object.values((j.query && j.query.pages) || {}).sort(function (a, b) { return (a.index || 0) - (b.index || 0); })
          .filter(function (p) { return p.imageinfo && /jpeg|png|webp/.test(p.imageinfo[0].mime || ''); })
          .map(function (p) { return { u: p.imageinfo[0].thumburl, src: 'Wikimedia' }; });
      }).catch(function () { return []; });
    return Promise.all([timeout(ov, 9000, []), timeout(wk, 9000, [])]).then(function (a) { return a[0].concat(a[1]); });
  }
  function groqKey() {
    try { var c = JSON.parse(localStorage.getItem('nightIeltsGroqCfg') || '{}'); if (c.apiKey) return c; } catch (e) {}
    try { var k = localStorage.getItem('nightIeltsGroqApiKey'); if (k) return { apiKey: k }; } catch (e) {}
    return {};
  }
  var AI_PROMPT = 'You help a Vietnamese teacher explain one word or short phrase (English or Chinese) to students.\n' +
    'Given the WORD and (optionally) the SENTENCE where it appears, reply with ONLY a JSON object:\n' +
    '{"meaning":"short natural Vietnamese meaning that fits the sentence (max 10 words)","pos":"n. | v. | adj. | adv. | phr. | idiom","ipa":"British IPA with slashes for English, or pinyin with tone marks for Chinese","example":"the SENTENCE if given (trimmed to one short sentence), otherwise a short natural example","example_vi":"Vietnamese translation of example","ja":"1-2 word Japanese keyword to search a cute illustration of this idea on irasutoya.com","img":"2-4 word concrete English photo search query that shows this idea"}';
  function ai(word, sentence) {
    var cfg = groqKey();
    var viaGroq = !cfg.apiKey ? Promise.reject(0) : (function () {
      var model = cfg.model || 'openai/gpt-oss-120b';
      var body = { model: model, temperature: 0.2, max_completion_tokens: 600, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: AI_PROMPT }, { role: 'user', content: 'WORD: ' + word + (sentence ? '\nSENTENCE: ' + sentence : '') }] };
      if (/gpt-oss/i.test(model)) body.reasoning_effort = 'low';
      var call = function (b) { return fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.apiKey }, body: JSON.stringify(b) }); };
      return call(body).then(function (r) {
        if (r.status === 400) { var b2 = Object.assign({}, body); delete b2.reasoning_effort; delete b2.response_format; return call(b2); }
        return r;
      }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
        var txt = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
        var m = txt.match(/\{[\s\S]*\}/); var o = m && JSON.parse(m[0]);
        if (!o || !o.meaning) throw 0; o.via = 'AI'; return o;
      });
    })();
    return viaGroq.catch(function () {
      return Promise.all([
        translate(word, 'auto', 'vi').catch(function () { return ''; }),
        dict(word),
        sentence ? translate(sentence, 'auto', 'vi').catch(function () { return ''; }) : ''
      ]).then(function (a) {
        if (!a[0]) throw new Error('Không dịch được — kiểm tra mạng rồi thử lại nhé.');
        return { meaning: a[0], pos: a[1] ? a[1].pos : '', ipa: a[1] ? a[1].ipa : '', example: sentence || '', example_vi: a[2], via: 'Google Dịch' };
      });
    });
  }
  function sentenceOf(range, word) {
    try {
      var n = range.startContainer; if (n.nodeType === 3) n = n.parentNode;
      while (n && n.parentNode && !/^(P|LI|TD|BLOCKQUOTE|H\d)$/.test(n.tagName) && (n.textContent || '').length < 40) n = n.parentNode;
      var t = ((n && n.textContent) || '').replace(/\s+/g, ' ').trim();
      var parts = t.match(/[^.!?。！？]+[.!?。！？]*/g) || [t];
      var s = (parts.filter(function (p) { return p.toLowerCase().indexOf(word.toLowerCase()) >= 0; })[0] || '').trim();
      return s.length > 220 || s.toLowerCase() === word.toLowerCase() ? '' : s;
    } catch (e) { return ''; }
  }
  function shrinkImage(file, cb) {
    var r = new FileReader();
    r.onload = function () {
      var img = new Image();
      img.onload = function () {
        try {
          var k = Math.min(1, 640 / Math.max(img.width, img.height)), c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          cb(c.toDataURL('image/jpeg', 0.85));
        } catch (e) { cb(r.result); }
      };
      img.onerror = function () { cb(r.result); };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }

  /* ---------- CSS (tiền tố nvt-, không phụ thuộc Tailwind) ---------- */
  var cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    var st = document.createElement('style');
    st.textContent = [
      '@keyframes nvtPop{0%{opacity:0;transform:scale(.6) rotate(-4deg)}60%{opacity:1;transform:scale(1.04) rotate(1deg)}100%{transform:none}}',
      '@keyframes nvtFloat{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-14px) rotate(12deg)}}',
      '@keyframes nvtShine{0%{background-position:0% 50%}100%{background-position:200% 50%}}',
      '@keyframes nvtFade{from{opacity:0}to{opacity:1}}',
      '@keyframes nvtWig{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}',
      '.nvt-root,.nvt-root *{box-sizing:border-box}',
      '.nvt-root{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:12px;background:rgba(15,23,42,.55);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);animation:nvtFade .25s ease both;font-family:"Plus Jakarta Sans","Be Vietnam Pro",system-ui,-apple-system,"Segoe UI",sans-serif;color:#1e293b;line-height:1.4;text-align:left}',
      '.nvt-deco{position:absolute;pointer-events:none;user-select:none;font-size:34px;opacity:.85;animation:nvtFloat 3.2s ease-in-out infinite}',
      '.nvt-ring{position:relative;margin:auto;width:100%;max-width:900px;border-radius:36px;padding:5px;box-shadow:0 30px 80px rgba(0,0,0,.35);background:linear-gradient(120deg,#f9a8d4,#c4b5fd,#fde68a,#99f6e4,#f9a8d4);background-size:300% 300%;animation:nvtPop .55s cubic-bezier(.2,1.4,.4,1) both,nvtShine 6s linear infinite}',
      '.nvt-card{position:relative;border-radius:32px;padding:30px;background:linear-gradient(135deg,#fff,#fdf2f8 55%,#f5f3ff)}',
      '.nvt-x{position:absolute;right:16px;top:16px;width:42px;height:42px;border-radius:50%;border:1px solid #e2e8f0;background:#fff;color:#94a3b8;font-size:24px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.08);transition:.2s}.nvt-x:hover{transform:rotate(90deg);color:#ec4899}',
      '.nvt-badge{display:inline-block;margin-bottom:16px;border-radius:999px;padding:6px 16px;font-size:12px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#fff;background:linear-gradient(90deg,#ec4899,#8b5cf6)}',
      '.nvt-grid{display:grid;gap:26px;grid-template-columns:minmax(0,5fr) minmax(0,6fr);align-items:center}',
      '.nvt-left{display:flex;flex-direction:column;align-items:center}',
      '.nvt-pol{position:relative;width:100%;max-width:340px;transform:rotate(-2deg);border-radius:24px;background:#fff;padding:12px 12px 14px;box-shadow:0 14px 30px rgba(0,0,0,.14);transition:.3s}.nvt-pol:hover{transform:none}',
      '.nvt-tape{position:absolute;top:-12px;left:50%;width:96px;height:24px;transform:translateX(-50%) rotate(2deg);border-radius:3px;background:rgba(251,207,232,.85)}',
      '.nvt-imgbox{display:flex;align-items:center;justify-content:center;aspect-ratio:1/1;width:100%;overflow:hidden;border-radius:18px;background:linear-gradient(135deg,#fffbeb,#fdf2f8)}',
      '.nvt-imgbox img{width:100%;height:100%;animation:nvtFade .3s ease both}',
      '.nvt-empty{padding:24px;text-align:center;font-size:14px;font-weight:600;color:#94a3b8}.nvt-empty small{display:block;margin-top:10px;font-weight:400;font-size:12px}',
      '.nvt-cap{margin:8px 0 0;text-align:center;font-size:10px;color:#94a3b8;min-height:14px}',
      '.nvt-row{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:16px}',
      '.nvt-b{display:inline-flex;align-items:center;gap:5px;border:1px solid #e2e8f0;border-radius:999px;background:#fff;padding:6px 12px;font-family:inherit;font-size:12px;font-weight:700;line-height:1.2;color:#475569;cursor:pointer;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,.05);transition:.15s}.nvt-b:hover{transform:translateY(-2px);color:#db2777;border-color:#f9a8d4}.nvt-b:disabled{opacity:.4;cursor:default;transform:none}',
      '.nvt-b.on-p{background:#ec4899;border-color:#ec4899;color:#fff}.nvt-b.on-v{background:#8b5cf6;border-color:#8b5cf6;color:#fff}',
      '.nvt-url{margin-top:8px;width:100%;max-width:340px;border:1px solid #fbcfe8;border-radius:999px;padding:8px 16px;font-size:12px;outline:none;font-family:inherit}',
      '.nvt-head{display:flex;flex-wrap:wrap;align-items:center;gap:12px}',
      '.nvt-word{margin:0;min-width:0;overflow-wrap:anywhere;font-weight:900;line-height:1.1;letter-spacing:-.02em;background:linear-gradient(90deg,#ec4899,#8b5cf6,#f59e0b,#ec4899);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:nvtShine 4s linear infinite}',
      '.nvt-spk{flex:none;width:48px;height:48px;border:0;border-radius:50%;font-size:22px;cursor:pointer;color:#fff;background:linear-gradient(135deg,#f472b6,#8b5cf6);box-shadow:0 6px 14px rgba(139,92,246,.35);transition:.2s}.nvt-spk:hover{transform:scale(1.1);animation:nvtWig .4s ease-in-out 2}',
      '.nvt-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.nvt-chip{border-radius:999px;padding:4px 12px;font-size:14px;font-weight:700}',
      '.nvt-ipa{background:#fff;color:#7c3aed;border:1px solid #ddd6fe;font-family:"Lucida Sans Unicode","Arial Unicode MS",monospace}.nvt-pos{background:#fef3c7;color:#b45309}',
      '.nvt-mbox{position:relative;margin-top:20px;border-radius:24px;background:#fff;padding:18px 20px;box-shadow:0 10px 24px rgba(0,0,0,.08);border:2px solid #fce7f3}',
      '.nvt-mtop{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}',
      '.nvt-lbl{font-size:12px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#ec4899}',
      '.nvt-ai{border:0;border-radius:999px;padding:7px 16px;font-family:inherit;font-size:12px;font-weight:800;line-height:1.2;color:#fff;cursor:pointer;background:linear-gradient(90deg,#8b5cf6,#ec4899);box-shadow:0 4px 10px rgba(236,72,153,.3);transition:.15s}.nvt-ai:hover{transform:scale(1.05)}.nvt-ai:disabled{opacity:.6}',
      '.nvt-mean{min-height:44px;font-size:30px;font-weight:800;line-height:1.25;color:#1e293b;outline:none;transition:filter .3s}.nvt-mean:empty:before{content:attr(data-ph);color:#cbd5e1;font-weight:600}',
      '.nvt-mean.hide{filter:blur(12px);user-select:none}',
      '.nvt-guess{position:absolute;inset:44px 0 0 0;border:0;background:transparent;font-family:inherit;font-size:18px;font-weight:800;color:#ec4899;cursor:pointer}',
      '.nvt-msg{margin:6px 0 0;font-size:11px;color:#94a3b8}',
      '.nvt-ex{margin-top:16px;display:flex;gap:8px;align-items:flex-start;border-radius:24px;padding:16px;background:linear-gradient(90deg,#fffbeb,#fdf2f8);border:1px solid #fef3c7}',
      '.nvt-ex p{margin:0;font-size:17px;font-weight:600;line-height:1.55;color:#334155}.nvt-ex .vi{margin-top:4px;font-size:14px;font-style:italic;font-weight:400;color:#64748b}',
      '.nvt-ex mark{border-radius:6px;padding:0 4px;background:rgba(251,207,232,.85);color:#be185d;font-weight:800}',
      '.nvt-ex button{border:0;background:none;cursor:pointer;font-size:14px;color:#f472b6}',
      '.nvt-foot{margin:20px 0 0;text-align:center;font-size:11px;color:#94a3b8}',
      '@media (max-width:767px){.nvt-grid{grid-template-columns:1fr}.nvt-card{padding:20px}.nvt-deco{font-size:24px}.nvt-mean{font-size:24px}}',
      /* nút nổi khi bôi đen (trang không dùng night-engine) */
      '.nvt-pill{position:absolute;z-index:2147482000;transform:translateX(-50%);border:0;border-radius:999px;padding:7px 14px;font:800 12px/1.2 "Plus Jakarta Sans",system-ui,sans-serif;color:#fff;cursor:pointer;white-space:nowrap;background:linear-gradient(90deg,#ec4899,#8b5cf6);box-shadow:0 6px 16px rgba(139,92,246,.4);animation:nvtPop .35s cubic-bezier(.2,1.4,.4,1) both}',
      '.nvt-pill:after{content:"";position:absolute;left:50%;bottom:-5px;width:10px;height:10px;transform:translateX(-50%) rotate(45deg);background:#a855f7;border-radius:2px;z-index:-1}.nvt-pill.below:after{bottom:auto;top:-5px}.nvt-tb-btn{white-space:nowrap;font-weight:700;color:#db2777!important}'
    ].join('');
    document.head.appendChild(st);
  }

  /* ---------- Thẻ giảng ---------- */
  var openRoot = null;
  function open(word, opts) {
    opts = opts || {};
    word = String(word || '').replace(/\s+/g, ' ').trim();
    if (!word) return;
    close();
    css();
    var sentence = opts.sentence || '';
    var saved = load(word) || {};
    var d = { meaning: '', pos: '', ipa: '', example: sentence, example_vi: '', img: null };
    for (var k in saved) if (saved[k] != null && k in d) d[k] = saved[k];
    var tab = saved.tab || 'ira', pics = { ira: null, photo: null }, idx = 0, hide = false, kw = { ja: '', img: '' };
    var persist = function () { save(word, { meaning: d.meaning, pos: d.pos, ipa: d.ipa, example: d.example, example_vi: d.example_vi, img: d.img, tab: tab }); };

    var root = document.createElement('div');
    root.className = 'nvt-root';
    var decos = ['✨', '⭐', '💖', '🌸', '✨', '💫'], tops = [8, 15, 80, 70, 40, 88], lefts = [6, 88, 10, 85, 94, 50];
    var len = Math.max(word.length * (isCJK(word) ? 2 : 1), 4);
    var fs = 'clamp(2.2rem,' + Math.max(3.2, Math.min(14, 60 / len)).toFixed(2) + 'vw,' + Math.max(2.6, Math.min(4.8, 46 / len)).toFixed(2) + 'rem)';
    root.innerHTML = decos.map(function (c, i) { return '<span class="nvt-deco" aria-hidden="true" style="top:' + tops[i] + '%;left:' + lefts[i] + '%;animation-delay:' + (i * 0.45) + 's">' + c + '</span>'; }).join('') +
      '<div class="nvt-ring" role="dialog" aria-label="Giảng vocab: ' + esc(word) + '"><div class="nvt-card">' +
      '<button type="button" class="nvt-x" data-a="close" aria-label="Đóng">×</button>' +
      '<div class="nvt-badge">🎀 New word</div>' +
      '<div class="nvt-grid">' +
        '<div class="nvt-left"><div class="nvt-pol"><span class="nvt-tape"></span><div class="nvt-imgbox" data-r="img"></div><p class="nvt-cap" data-r="cap"></p></div>' +
          '<div class="nvt-row">' +
            '<button type="button" class="nvt-b" data-a="tab-ira">🎨 Dễ thương</button>' +
            '<button type="button" class="nvt-b" data-a="tab-photo">📷 Ảnh thật</button>' +
            '<button type="button" class="nvt-b" data-a="next">🔄 Ảnh khác</button>' +
            '<a class="nvt-b" target="_blank" rel="noopener" href="https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(word) + '">🔎 Google</a>' +
            '<button type="button" class="nvt-b" data-a="url">🔗 Link ảnh</button>' +
          '</div><input class="nvt-url" data-r="url" style="display:none" placeholder="Dán link ảnh rồi Enter (Google: chuột phải ảnh → Sao chép địa chỉ hình ảnh)"></div>' +
        '<div style="min-width:0">' +
          '<div class="nvt-head"><h2 class="nvt-word" style="font-size:' + fs + '">' + esc(word) + '</h2><button type="button" class="nvt-spk" data-a="speak" title="Nghe">🔊</button></div>' +
          '<div class="nvt-chips" data-r="chips"></div>' +
          '<div class="nvt-mbox"><div class="nvt-mtop"><span class="nvt-lbl">💡 Nghĩa</span><span style="display:flex;gap:6px">' +
            '<button type="button" class="nvt-b" data-a="hide" title="Che nghĩa để học sinh đoán">🙈 Che</button>' +
            '<button type="button" class="nvt-ai" data-a="ai">✨ AI dịch</button></span></div>' +
            '<div class="nvt-mean" data-r="mean" contenteditable="true" spellcheck="false" data-ph="Thầy gõ nghĩa ở đây…"></div>' +
            '<button type="button" class="nvt-guess" data-a="hide" style="display:none" data-r="guess">🤔 Đoán xem nghĩa là gì?</button>' +
            '<p class="nvt-msg" data-r="msg"></p></div>' +
          '<div class="nvt-ex" data-r="ex"></div>' +
        '</div></div>' +
      '<p class="nvt-foot">Esc để đóng · nghĩa & ảnh được nhớ trên máy này cho lần sau · dán ảnh bằng Ctrl+V hoặc kéo thả vào thẻ</p>' +
      '</div></div>';
    var $ = function (r) { return root.querySelector('[data-r="' + r + '"]'); };
    var list = function () { return Array.isArray(pics[tab]) ? pics[tab] : []; };

    function renderImg() {
      var box = $('img'), cap = $('cap'), L = list(), shown = d.img || L[idx] || null;
      if (shown) {
        box.innerHTML = '<img alt="' + esc(word) + '" referrerpolicy="no-referrer" style="object-fit:' + (shown.src === 'Irasutoya' ? 'contain;padding:8px' : 'cover') + '">';
        var im = box.firstChild;
        im.onerror = function () { if (d.img) { d.img = null; persist(); renderImg(); } else if (L.length > 1 && idx < L.length - 1) { idx++; renderImg(); } else { box.innerHTML = '<div class="nvt-empty">Ảnh không tải được 🥲<small>Bấm 🔎 Google rồi dán ảnh (Ctrl+V)</small></div>'; } };
        im.src = shown.u;
        cap.textContent = shown.src + (L.length > 1 && !d.img ? ' · ' + (idx + 1) + '/' + L.length : '');
      } else {
        box.innerHTML = pics[tab] === 'loading' ? '<div class="nvt-empty"><span class="nvt-deco" style="position:static;display:inline-block;font-size:48px">🔍</span></div>'
          : '<div class="nvt-empty">Chưa tìm được ảnh 🥲<small>Dán ảnh (Ctrl+V), kéo thả ảnh vào đây, hoặc bấm 🔎 Google</small></div>';
        cap.textContent = '';
      }
      root.querySelector('[data-a="tab-ira"]').className = 'nvt-b' + (tab === 'ira' ? ' on-p' : '');
      root.querySelector('[data-a="tab-photo"]').className = 'nvt-b' + (tab === 'photo' ? ' on-v' : '');
      root.querySelector('[data-a="next"]').disabled = L.length < 2;
    }
    function renderText() {
      $('chips').innerHTML = (d.ipa ? '<span class="nvt-chip nvt-ipa">' + esc(d.ipa) + '</span>' : '') + (d.pos ? '<span class="nvt-chip nvt-pos">' + esc(d.pos) + '</span>' : '');
      var m = $('mean'); if (document.activeElement !== m && m.textContent !== d.meaning) m.textContent = d.meaning || '';
      m.className = 'nvt-mean' + (hide ? ' hide' : '');
      $('guess').style.display = hide ? 'block' : 'none';
      root.querySelector('.nvt-mtop [data-a="hide"]').textContent = hide ? '👀 Mở' : '🙈 Che';
      var ex = $('ex');
      if (!d.example && !d.example_vi) { ex.style.display = 'none'; return; }
      ex.style.display = '';
      var e = esc(d.example), i = d.example.toLowerCase().indexOf(word.toLowerCase());
      if (i >= 0) e = esc(d.example.slice(0, i)) + '<mark>' + esc(d.example.slice(i, i + word.length)) + '</mark>' + esc(d.example.slice(i + word.length));
      ex.innerHTML = '<span style="font-size:20px">📝</span><div style="min-width:0;flex:1"><p>' + e + (d.example ? ' <button type="button" data-a="speak-ex" aria-label="Nghe câu">🔊</button>' : '') + '</p>' +
        (d.example_vi && !hide ? '<p class="vi">' + esc(d.example_vi) + '</p>' : '') + '</div>';
    }
    function loadPics(which, q) {
      pics[which] = 'loading'; if (which === tab) renderImg();
      var p = which === 'ira'
        ? Promise.resolve(q || kw.ja || (isCJK(word) ? translate(word, 'zh-CN', 'ja') : translate(word, 'en', 'ja')).catch(function () { return ''; }))
            .then(function (ja) { return irasutoya(ja).then(function (L) { return L.length || !ja || ja.length < 3 ? L : irasutoya(ja.slice(0, 2)); }); })
        : (isCJK(word) && !q ? translate(word, 'zh-CN', 'en').catch(function () { return word; }) : Promise.resolve(q || kw.img || word)).then(photos);
      return p.then(function (L) { pics[which] = L; if (which === tab) { idx = 0; renderImg(); } return L; });
    }
    function setImg(u) { d.img = { u: u, src: 'Ảnh của thầy' }; persist(); renderImg(); }
    function msg(t) { $('msg').textContent = t || ''; }

    root.addEventListener('mousedown', function (e) { if (e.target === root) close(); });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'close') close();
      else if (a === 'speak') speak(word, 0.8);
      else if (a === 'speak-ex') speak(d.example, 0.85);
      else if (a === 'hide') { hide = !hide; renderText(); }
      else if (a === 'url') { var u = $('url'); u.style.display = u.style.display === 'none' ? '' : 'none'; if (u.style.display === '') u.focus(); }
      else if (a === 'next') { var L = list(); if (L.length > 1) { idx = (idx + 1) % L.length; d.img = L[idx]; persist(); renderImg(); } }
      else if (a === 'tab-ira' || a === 'tab-photo') { tab = a.slice(4); d.img = null; persist(); if (!Array.isArray(pics[tab])) loadPics(tab); else { idx = 0; renderImg(); } }
      else if (a === 'ai') {
        b.disabled = true; b.textContent = '⏳ Đang dịch…'; msg('');
        ai(word, sentence).then(function (r) {
          kw = { ja: r.ja || '', img: r.img || '' };
          ['meaning', 'pos', 'ipa', 'example', 'example_vi'].forEach(function (k) { if (r[k]) d[k] = r[k]; });
          persist(); renderText();
          msg(r.via === 'AI' ? '✨ AI dịch theo đúng câu trong bài' : '✨ Đã dịch bằng Google Dịch (thêm key Groq ở trang Speaking/Writing để AI dịch theo ngữ cảnh)');
          if (!d.img && (r.ja || r.img)) loadPics(tab, tab === 'ira' ? r.ja : r.img);
        }).catch(function (err) { msg('⚠️ ' + (err && err.message || 'Lỗi, thử lại nhé')); })
          .then(function () { b.disabled = false; b.textContent = '✨ AI dịch'; });
      }
    });
    $('mean').addEventListener('input', function (e) { d.meaning = e.currentTarget.textContent; persist(); });
    $('url').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.currentTarget.value.trim()) { setImg(e.currentTarget.value.trim()); e.currentTarget.style.display = 'none'; } });
    root.addEventListener('dragover', function (e) { e.preventDefault(); });
    root.addEventListener('drop', function (e) {
      e.preventDefault();
      var f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && /^image\//.test(f.type)) return shrinkImage(f, setImg);
      var u = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text');
      if (u && /^https?:/.test(u.trim())) setImg(u.trim());
    });
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    var onPaste = function (e) {
      if (document.activeElement === $('mean') || document.activeElement === $('url')) return;
      var items = (e.clipboardData && e.clipboardData.items) || [];
      for (var i = 0; i < items.length; i++) if (items[i].type && items[i].type.indexOf('image/') === 0) { shrinkImage(items[i].getAsFile(), setImg); e.preventDefault(); return; }
      var t = e.clipboardData && e.clipboardData.getData('text');
      if (t && /^https?:\/\/\S+$/i.test(t.trim())) { setImg(t.trim()); e.preventDefault(); }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('paste', onPaste);
    root._cleanup = function () { document.removeEventListener('keydown', onKey); document.removeEventListener('paste', onPaste); };

    document.body.appendChild(root);
    openRoot = root;
    renderText(); renderImg();
    if (!d.img) loadPics(tab);
    if (!d.ipa && !isCJK(word)) dict(word).then(function (x) { if (x && openRoot === root) { d.ipa = d.ipa || x.ipa; d.pos = d.pos || x.pos; renderText(); } });
    speak(word, 0.8);
  }
  function close() {
    if (!openRoot) return;
    try { openRoot._cleanup(); } catch (e) {}
    openRoot.remove(); openRoot = null;
  }

  /* ---------- Nút nổi khi bôi đen (chỉ ở trang KHÔNG dùng night-engine) ---------- */
  var pill = null;
  function hidePill() { if (pill) { pill.remove(); pill = null; } }
  function cleanWord(t) { return t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '') || t; }
  function okText(t) {
    if (!t || t.length > 60) return false;
    if (isCJK(t)) return t.replace(/\s/g, '').length <= 12;
    return /[A-Za-z]/.test(t) && t.split(/\s+/).length <= 6;
  }
  // Trang có thanh bôi đen riêng (#annot-toolbar ở các đề Reading / Listening) → gắn nút vào CHÍNH thanh đó
  function hostToolbar() { return document.getElementById('annot-toolbar'); }
  function hookToolbar() {
    var tb = hostToolbar();
    if (!tb || tb.querySelector('.nvt-tb-btn')) return !!tb;
    css();
    var bt = document.createElement('button');
    bt.type = 'button'; bt.className = 'annot-btn nvt-tb-btn'; bt.title = 'Giảng vocab này cho cả lớp'; bt.textContent = '🎀 Vocab';
    bt.addEventListener('mousedown', function (e) { e.preventDefault(); });
    bt.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var sel = window.getSelection(), t = sel ? sel.toString().replace(/\s+/g, ' ').trim() : '';
      if (!t || !sel.rangeCount) return;
      var w = cleanWord(t), sn = sentenceOf(sel.getRangeAt(0), w);
      tb.style.display = 'none';
      try { sel.removeAllRanges(); } catch (er) {}
      open(w, { sentence: sn });
    });
    var tr = tb.querySelector('#annot-translate-btn, .annot-translate');
    if (tr) tb.insertBefore(bt, tr); else tb.appendChild(bt);
    // chỉ hiện khi bôi đen từ / cụm ngắn
    var sync = function () { var t = (window.getSelection() || '').toString().replace(/\s+/g, ' ').trim(); bt.style.display = okText(t) ? '' : 'none'; };
    document.addEventListener('selectionchange', sync); sync();
    return true;
  }
  // Ô chữ nhật r có đè lên thanh nổi (fixed/absolute) nào của trang không?
  function collides(r, anchorEl) {
    var pts = [[r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4], [(r.left + r.right) / 2, (r.top + r.bottom) / 2]];
    for (var i = 0; i < pts.length; i++) {
      var x = pts[i][0], y = pts[i][1];
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return true;
      var top = document.elementFromPoint(x, y);
      for (var n = top; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
        if (anchorEl && n.contains(anchorEl)) break;
        var pos = getComputedStyle(n).position;
        if (pos === 'fixed' || pos === 'absolute' || pos === 'sticky') return true;
      }
    }
    return false;
  }
  function onSelEnd() {
    if (hasEngine() || hookToolbar()) return;
    setTimeout(function () {
      var sel = window.getSelection(), t = sel ? sel.toString().replace(/\s+/g, ' ').trim() : '';
      if (!t || !sel.rangeCount || !okText(t)) return hidePill();
      var range = sel.getRangeAt(0), anc = range.commonAncestorContainer;
      var el = anc.nodeType === 1 ? anc : anc.parentNode;
      if (!el || (openRoot && openRoot.contains(el)) || el.closest('input,textarea,[contenteditable="true"],.nvt-root')) return hidePill();
      var r = range.getBoundingClientRect();
      if (!r.width && !r.height) return hidePill();
      css(); hidePill();
      pill = document.createElement('button');
      pill.type = 'button'; pill.className = 'nvt-pill'; pill.textContent = '🎀 Giảng vocab';
      pill.style.visibility = 'hidden'; pill.style.top = '0px'; pill.style.left = '0px';
      document.body.appendChild(pill);
      var pw = pill.offsetWidth || 130, ph = pill.offsetHeight || 30, vw = document.documentElement.clientWidth;
      var cx = Math.min(Math.max(r.left + r.width / 2, pw / 2 + 8), vw - pw / 2 - 8);
      // thử: trên chữ → dưới chữ → xa hơn phía trên / dưới (né thanh nổi có sẵn của trang)
      var tops = [r.top - ph - 12, r.bottom + 12, r.top - ph - 64, r.bottom + 64, r.top - ph - 116, r.bottom + 116];
      var pick = null;
      pill.style.display = 'none';
      for (var i = 0; i < tops.length; i++) {
        var cand = { left: cx - pw / 2, right: cx + pw / 2, top: tops[i], bottom: tops[i] + ph };
        if (!collides(cand, el)) { pick = tops[i]; break; }
      }
      pill.style.display = '';
      if (pick == null) pick = r.top < 60 ? r.bottom + 12 : r.top - ph - 12;
      pill.style.top = pick + window.scrollY + 'px';
      pill.style.left = cx + window.scrollX + 'px';
      pill.classList.toggle('below', pick > r.top);
      pill.style.visibility = '';
      var w = cleanWord(t), sn = sentenceOf(range, w);
      var go = function (e) { e.preventDefault(); e.stopPropagation(); hidePill(); try { sel.removeAllRanges(); } catch (er) {} open(w, { sentence: sn }); };
      pill.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); });
      pill.addEventListener('pointerdown', go);
    }, 120);
  }
  document.addEventListener('mouseup', function (e) { if (pill && pill.contains(e.target)) return; onSelEnd(); });
  document.addEventListener('touchend', function (e) { if (pill && pill.contains(e.target)) return; setTimeout(onSelEnd, 250); });
  document.addEventListener('selectionchange', function () { var s = window.getSelection(); if (pill && (!s || !s.toString().trim())) hidePill(); });
  window.addEventListener('scroll', function () { if (pill && !window.getSelection().toString().trim()) hidePill(); }, { passive: true });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookToolbar); else hookToolbar();
  window.NightVocabTeach = { open: open, close: close, sentenceOf: sentenceOf };
})();
