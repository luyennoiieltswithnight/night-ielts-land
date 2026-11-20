/* Night IELTS — PHÁT ÂM TỪNG ÂM (cửa sổ chi tiết, dùng trong speaking.html)
   Máy chấm: Hugging Face Space nightruan31/night-pron (mã nguồn: tools/pron-space/).
   NightPron.open({ id, getBlob, text, words:[{w,s,e}], cached, save })
     - getBlob(): Promise<Blob> file ghi âm của học sinh
     - text: lời học sinh nói (bản AI nghe ra) · words: mốc thời gian từng chữ (Whisper) để phát lại đúng chữ đó
     - cached: kết quả đã chấm (lưu trong bài làm) · save(result): lưu kết quả lại
   NightPron.prefetch(opts) chấm ngầm trước, NightPron.badge(id) -> điểm (nếu đã có). */
(function () {
  var API = 'https://nightruan31-night-pron.hf.space';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var TIP = {
    p: ['/p/ bật hơi', 'Mím 2 môi rồi bật mạnh ra, có luồng hơi phụt ra. Để tờ giấy trước miệng, đọc "p" thấy giấy rung. Ở cuối từ (stop, help) vẫn phải ngậm môi lại, đừng bỏ.', 'pen, people, help'],
    b: ['/b/', 'Mím 2 môi, rung cổ họng, hơi bật nhẹ hơn /p/.', 'big, job, rubber'],
    t: ['/t/ bật hơi', 'Đầu lưỡi chạm phía sau răng cửa trên (không phải chạm răng), bật hơi mạnh. Không đọc như "t" tiếng Việt. Ở cuối từ phải chặn lưỡi lại rõ ràng.', 'time, important, what'],
    d: ['/d/', 'Đầu lưỡi chạm phía sau răng cửa trên, rung cổ họng. Ở cuối từ (played, good) vẫn phải chạm lưỡi.', 'day, good, played'],
    k: ['/k/ bật hơi', 'Cuống lưỡi nâng chạm vòm mềm, bật hơi mạnh. Ở cuối từ (think, book) phải chặn hơi ở cổ, đừng nuốt mất.', 'cat, think, book'],
    g: ['/g/', 'Giống /k/ nhưng rung cổ họng.', 'go, big, again'],
    f: ['/f/', 'Răng trên chạm nhẹ môi dưới, thổi hơi ra liên tục.', 'five, life, coffee'],
    v: ['/v/', 'Răng trên chạm môi dưới, rung cổ họng. Ở cuối từ (have, live) vẫn phải giữ âm.', 'very, have, live'],
    'θ': ['/θ/ (th vô thanh)', 'Đặt đầu lưỡi giữa 2 hàm răng, thè ra một chút, thổi hơi qua. KHÔNG đọc thành "th" tiếng Việt hay /t/, /s/.', 'think, three, month'],
    'ð': ['/ð/ (th hữu thanh)', 'Đầu lưỡi đặt giữa 2 hàm răng như /θ/ nhưng rung cổ họng. Không đọc thành "đ" hay /d/, /z/.', 'the, this, mother'],
    s: ['/s/', 'Đầu lưỡi gần răng trên, thổi hơi xì mảnh như rắn. Ở cuối từ (books, likes) phải nghe rõ tiếng "xì".', 'see, bus, students'],
    z: ['/z/', 'Như /s/ nhưng rung cổ họng (tiếng ong "zzz"). Đuôi -s sau âm hữu thanh đọc /z/: dogs, plays.', 'zoo, is, dogs'],
    'ʃ': ['/ʃ/', 'Tròn môi, đưa ra trước, lưỡi lùi về sau hơn /s/, thổi hơi "sh". Giống "s" tiếng Việt miền Bắc đọc nặng.', 'she, nation, fish'],
    'ʒ': ['/ʒ/', 'Như /ʃ/ nhưng rung cổ họng.', 'usually, television, measure'],
    'tʃ': ['/tʃ/', 'Bật từ /t/ sang /ʃ/, tròn môi. Không đọc như "ch" tiếng Việt (mềm hơn và không bật).', 'cheap, teacher, much'],
    'dʒ': ['/dʒ/', 'Như /tʃ/ nhưng rung cổ họng. Ở cuối từ (large, judge) giữ âm rõ.', 'job, large, judge'],
    m: ['/m/', 'Mím môi, ngân âm qua mũi. Ở cuối từ phải ngậm môi lại.', 'my, time, summer'],
    n: ['/n/', 'Đầu lưỡi chạm sau răng trên, ngân qua mũi. Ở cuối từ (nation, sun) giữ lưỡi chạm, đừng biến thành /ŋ/.', 'no, sun, nation'],
    'ŋ': ['/ŋ/', 'Cuống lưỡi chạm vòm mềm như "ng" tiếng Việt. Đừng thêm /g/ hay /k/ phía sau.', 'sing, thinking, long'],
    l: ['/l/', 'Đầu lưỡi chạm sau răng trên. Ở cuối từ (school, feel) phải giữ lưỡi chạm, không được bỏ hay đọc thành "ô".', 'light, school, feel'],
    'ɹ': ['/r/ tiếng Anh', 'Cong đầu lưỡi lên và lùi về sau, KHÔNG chạm vòm miệng, môi hơi tròn. Không rung lưỡi như "r" tiếng Việt.', 'red, very, really'],
    w: ['/w/', 'Tròn môi nhỏ như sắp huýt sáo rồi mở ra. Không đọc như "qu" hay "v".', 'we, walk, quite'],
    j: ['/j/', 'Như "d" miền Nam / "y" trong "yêu".', 'yes, you, use'],
    h: ['/h/', 'Thở hắt hơi nhẹ từ cổ họng.', 'he, how, hot'],
    i: ['/iː/ (i dài)', 'Kéo căng môi như đang cười, kéo dài âm "iii".', 'see, cheap, people'],
    'ɪ': ['/ɪ/ (i ngắn)', 'Âm "i" ngắn, thả lỏng, hơi giống "ê" một chút. Đọc nhanh và dứt khoát.', 'sit, ship, important'],
    'ɛ': ['/e/', 'Mở miệng vừa như "e" tiếng Việt.', 'bed, red, many'],
    'æ': ['/æ/', 'Mở miệng thật rộng, hạ hàm, như nửa "a" nửa "e".', 'cat, bad, hand'],
    'ʌ': ['/ʌ/', 'Âm "ă" ngắn tiếng Việt, miệng hơi mở.', 'cup, but, much'],
    'ə': ['/ə/ (schwa)', 'Âm "ơ" rất nhẹ và ngắn, thả lỏng miệng. Âm không nhấn, đừng đọc rõ như nguyên âm chính.', 'about, teacher, pronunciation'],
    'ɑ': ['/ɑː/', 'Mở miệng rộng, "a" dài và sâu.', 'car, father, hot (giọng Mỹ)'],
    'ɔ': ['/ɔː/', 'Tròn môi, "o" dài.', 'law, walk, more'],
    'ʊ': ['/ʊ/ (u ngắn)', '"u" ngắn, môi thả lỏng.', 'book, good, put'],
    u: ['/uː/ (u dài)', 'Tròn môi chu ra, kéo dài "uuu".', 'food, school, two'],
    'ɜ': ['/ɜː/', 'Như "ơ" dài, lưỡi giữa miệng (giọng Mỹ có cong lưỡi /r/).', 'work, bird, learn'],
    'eɪ': ['/eɪ/', 'Trượt từ "ê" sang "i": "ây".', 'day, nation, great'],
    'aɪ': ['/aɪ/', 'Trượt từ "a" sang "i": "ai".', 'my, time, like'],
    'ɔɪ': ['/ɔɪ/', 'Trượt từ "o" sang "i": "oi".', 'boy, enjoy, voice'],
    'aʊ': ['/aʊ/', 'Trượt từ "a" sang "u": "ao".', 'now, house, how'],
    'oʊ': ['/oʊ/', 'Trượt từ "ô" sang "u": "âu" tròn môi.', 'go, home, know'],
    'ɪɹ': ['/ɪr/', '"i" rồi cong lưỡi /r/.', 'here, near, clear'],
    'ɛɹ': ['/er/', '"e" rồi cong lưỡi /r/.', 'where, care, there'],
    'ʊɹ': ['/ʊr/', '"u" rồi cong lưỡi /r/.', 'sure, tour, pure'],
    'ɑɹ': ['/ɑr/', '"a" sâu rồi cong lưỡi /r/.', 'car, hard, start'],
    'ɔɹ': ['/ɔr/', '"o" rồi cong lưỡi /r/.', 'more, four, important'],
    'oɹ': ['/ɔr/', '"o" rồi cong lưỡi /r/.', 'more, four, important']
  };
  TIP['iə'] = ['/ɪə/', 'Trượt từ "i" sang "ơ" (giọng Mỹ: "i" rồi cong lưỡi /r/).', 'really, here, idea'];
  var key = function (p) { return String(p || '').replace(/[ˈˌːʲ]/g, ''); };
  var tipOf = function (p) { return TIP[key(p)] || ['/' + key(p) + '/', 'Nghe phát âm chuẩn rồi đọc lại chậm, phóng đại khẩu hình.', '']; };
  var VOW = /^(i|ɪ|ɛ|e|æ|ʌ|ə|ɐ|ɑ|ɔ|o|ʊ|u|ɜ|ɚ|ɝ|ᵻ|a|eɪ|aɪ|ɔɪ|aʊ|oʊ|iə|ɪɹ|ɛɹ|ʊɹ|ɑɹ|ɔɹ|oɹ)$/;
  var colorOf = function (v) { return v >= 85 ? '#16A34A' : v >= 60 ? '#F59E0B' : '#DC2626'; };

  function css() {
    if (document.getElementById('npd-css')) return;
    var s = document.createElement('style'); s.id = 'npd-css';
    s.textContent = [
      '.npd-ov{position:fixed;inset:0;z-index:10050;background:rgba(20,16,48,.55);backdrop-filter:blur(3px);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px}',
      '.npd{width:100%;max-width:860px;background:#fff;border-radius:26px;box-shadow:0 30px 60px -20px rgba(20,10,80,.5);padding:20px 20px 24px;color:#1F1B3A;font-family:"Plus Jakarta Sans",system-ui,sans-serif;animation:npdIn .25s ease-out}',
      '@keyframes npdIn{from{opacity:0;transform:translateY(14px)}}',
      '.npd-top{display:flex;align-items:center;gap:16px}.npd-top h3{margin:0;font-size:21px;font-weight:800}.npd-top p{margin:3px 0 0;color:#6B6890;font-size:13.5px}',
      '.npd-x{margin-left:auto;align-self:flex-start;border:0;background:#F1EFFA;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;color:#4B4870;flex:none}',
      '.npd-ring{--v:0;width:84px;height:84px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--c,#16A34A) calc(var(--v)*1%),#EEE 0);flex:none}',
      '.npd-ring b{width:66px;height:66px;border-radius:50%;background:#fff;display:grid;place-items:center;align-content:center;font-size:24px;font-weight:800;line-height:1.9}',
      '.npd-leg{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:#6B6890;margin-top:6px}.npd-leg span:before{content:"";display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px;background:var(--b);box-shadow:var(--o,none)}',
      '.npd-words{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;max-height:42vh;overflow:auto;padding:2px}',
      '.npd-w{border:1.5px solid #E7E4F5;border-radius:14px;padding:7px 10px 6px;background:#fff;cursor:pointer;transition:transform .12s;font:inherit;text-align:left;color:inherit}',
      '.npd-w:hover{transform:translateY(-2px)}.npd-w.sel{border-color:#5B4BDB;box-shadow:0 0 0 3px #E4DFFF}.npd-w.fn{opacity:.7}',
      '.npd-w .t{font-weight:800;font-size:16px;display:flex;align-items:center;gap:5px}.npd-w .t small{font-size:10.5px;font-weight:800;border-radius:999px;padding:1px 6px;color:#fff;background:var(--c)}',
      '.npd-ph{display:flex;align-items:flex-start;gap:3px;margin-top:5px;flex-wrap:wrap}',
      '.npd-p{font-family:"Noto Sans","Segoe UI",sans-serif;font-size:13px;border-radius:6px;padding:0 5px;font-weight:700;line-height:1.6}',
      '.npd-p.ok{background:#DCFCE7;color:#16A34A}.npd-p.near{background:#FEF3C7;color:#B45309}.npd-p.sub{background:#FEE2E2;color:#DC2626}',
      '.npd-p.miss{background:#fff;color:#DC2626;outline:1.5px dashed #DC2626;outline-offset:-1.5px;text-decoration:line-through}.npd-p.extra{background:#F1F5F9;color:#64748B;font-style:italic}',
      '.npd-d{border-radius:18px;background:linear-gradient(180deg,#FBFAFF,#fff);border:1px solid #E7E4F5;padding:16px;margin-top:14px}',
      '.npd-d h4{margin:0;font-size:24px;font-weight:800;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.npd-d h4 span{font-family:"Noto Sans",sans-serif;color:#6B6890;font-size:15px;font-weight:400}',
      '.npd-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}',
      '.npd-b{border:0;border-radius:999px;padding:8px 14px;font:700 13.5px "Plus Jakarta Sans",sans-serif;cursor:pointer;background:#EEEAFE;color:#5B4BDB;display:inline-flex;align-items:center;gap:6px}',
      '.npd-b.me{background:#FFE4EC;color:#BE185D}.npd-b.cmp{background:linear-gradient(135deg,#5B4BDB,#8B5CF6);color:#fff}.npd-b:disabled{opacity:.45;cursor:default}.npd-b.on{box-shadow:0 0 0 3px rgba(91,75,219,.25)}',
      '.npd-b svg{width:14px;height:14px}',
      '.npd-big{display:flex;align-items:flex-start;gap:6px;flex-wrap:wrap;margin:14px 0 4px}.npd-big .npd-p{font-size:21px;padding:3px 10px;border-radius:10px}',
      '.npd-fix{border-left:4px solid var(--c);background:#fff;border-radius:12px;padding:10px 12px;margin-top:9px;box-shadow:0 4px 14px -10px rgba(0,0,0,.25)}',
      '.npd-fix b.h{display:block;margin-bottom:3px}.npd-fix .how{color:#3F3D56;font-size:14.5px;line-height:1.55}.npd-fix .eg{color:#6B6890;font-size:13px;margin-top:4px}',
      '.npd-ok{color:#16A34A;font-weight:700;margin-top:8px}',
      '.npd-load{padding:40px 10px;text-align:center;color:#6B6890;font-weight:600}.npd-load i{display:block;width:34px;height:34px;margin:0 auto 12px;border-radius:50%;border:3px solid #E4DFFF;border-top-color:#5B4BDB;animation:npdSp 1s linear infinite}@keyframes npdSp{to{transform:rotate(360deg)}}',
      '.npd-err{color:#DC2626;font-weight:700;padding:20px 4px}',
      '.npd-note{font-size:12px;color:#8A87A8;margin-top:12px;line-height:1.5}',
      '.npd-open{display:inline-flex;align-items:center;gap:8px;margin:10px 0 2px;border:0;border-radius:999px;padding:9px 15px;font:800 13.5px "Plus Jakarta Sans",sans-serif;cursor:pointer;color:#fff;background:linear-gradient(135deg,#5B4BDB,#EC4899);box-shadow:0 8px 18px -10px #5B4BDB}',
      '.npd-open small{background:rgba(255,255,255,.25);border-radius:999px;padding:1px 8px;font-size:12px}',
      '@media(max-width:560px){.npd{padding:16px 14px 20px;border-radius:22px}.npd-ov{padding:10px 6px}.npd-ring{width:68px;height:68px}.npd-ring b{width:54px;height:54px;font-size:20px}.npd-top h3{font-size:18px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------- Chấm ---------- */
  var jobs = {}, results = {};
  function score(blob, text) {
    var fd = new FormData();
    fd.append('audio', blob, 'answer.' + (/mp4|m4a|aac/.test(blob.type || '') ? 'm4a' : /wav/.test(blob.type || '') ? 'wav' : 'webm'));
    fd.append('text', text);
    var go = function () { return fetch(API + '/score', { method: 'POST', body: fd }).then(function (r) { if (!r.ok) throw new Error('busy'); return r.json(); }); };
    return go().catch(function () { return new Promise(function (r) { setTimeout(r, 4000); }).then(go); })   // máy vừa thức dậy -> thử lại 1 lần
      .then(function (j) { if (j.error) throw new Error(j.error); return j; });
  }
  function compact(j) {
    return { v: 1, score: j.score, at: Date.now(), words: j.words.map(function (w) { return { w: w.w, score: w.score, fn: !!w.fn, ph: w.ph.map(function (p) { return [p.p, p.st, p.got || '']; }), x: w.extra || [] }; }) };
  }
  function expand(c) {
    return { score: c.score, words: c.words.map(function (w) { return { w: w.w, score: w.score, fn: w.fn, ph: w.ph.map(function (a) { return { p: a[0], st: a[1], got: a[2] }; }), extra: w.x || [] }; }) };
  }
  function run(o) {
    var id = o.id || 'cur';
    if (o.cached && o.cached.words) { results[id] = expand(o.cached); return Promise.resolve(results[id]); }
    if (results[id]) return Promise.resolve(results[id]);
    if (jobs[id]) return jobs[id];
    if (!o.text || !o.getBlob) return Promise.reject(new Error('Bài này chưa có file ghi âm hoặc lời nói để chấm.'));
    jobs[id] = o.getBlob().then(function (b) { if (!b || !b.size) throw new Error('Chưa tải được file ghi âm.'); return score(b, o.text); })
      .then(function (j) { var c = compact(j); results[id] = expand(c); try { o.save && o.save(c); } catch (e) {} return results[id]; })
      .catch(function (e) { delete jobs[id]; throw e; });
    return jobs[id];
  }

  /* ---------- Ghép mốc thời gian (Whisper) vào từng chữ ---------- */
  function attachTimes(W, ww) {
    var toks = [];
    (ww || []).forEach(function (x) { String(x.w || '').toLowerCase().replace(/[’]/g, "'").split(/[^a-z']+/).filter(function (t) { return /[a-z]/.test(t); }).forEach(function (t) { toks.push({ t: t.replace(/^'+|'+$/g, ''), s: +x.s, e: +x.e }); }); });
    var k = 0;
    W.forEach(function (w) {
      var t = w.w.toLowerCase();
      for (var a = k; a < Math.min(toks.length, k + 4); a++) if (toks[a].t === t) { w.s = toks[a].s; w.e = toks[a].e; k = a + 1; return; }
      if (toks[k]) { w.s = toks[k].s; w.e = toks[k].e; k++; }   // lệch chữ (máy nghe khác): lấy chữ kế tiếp
    });
  }

  /* ---------- Phát âm thanh ---------- */
  var actx = null, buf = null, bufFor = null, playing = null;
  function decode(blob) {
    if (bufFor === blob && buf) return Promise.resolve(buf);
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    return blob.arrayBuffer().then(function (ab) { return new Promise(function (res, rej) { actx.decodeAudioData(ab, res, rej); }); }).then(function (b) { buf = b; bufFor = blob; return b; });
  }
  function stop() { try { if (playing) playing.stop(); } catch (e) {} playing = null; try { speechSynthesis.cancel(); } catch (e) {} }
  function playMine(blob, s, e) {
    stop();
    return decode(blob).then(function (b) {
      if (actx.state === 'suspended') actx.resume();
      var a = Math.max(0, s - 0.12), d = Math.min(b.duration - a, (e - s) + 0.28);
      var src = actx.createBufferSource(); src.buffer = b; src.connect(actx.destination); src.start(0, a, Math.max(0.2, d)); playing = src;
      return new Promise(function (r) { src.onended = r; });
    });
  }
  function say(t, rate) {
    stop();
    return new Promise(function (res) {
      try {
        var u = new SpeechSynthesisUtterance(t); u.lang = 'en-US'; u.rate = rate;
        var v = speechSynthesis.getVoices().filter(function (x) { return /en[-_]US/i.test(x.lang); });
        var best = v.filter(function (x) { return /Samantha|Google US|Aria|Jenny|Natural/i.test(x.name); })[0] || v[0]; if (best) u.voice = best;
        u.onend = u.onerror = function () { res(); }; speechSynthesis.speak(u);
      } catch (e) { res(); }
    });
  }

  /* ---------- Giao diện ---------- */
  var IC = {
    spk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
    slow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    cmp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4 3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8"/></svg>'
  };
  function open(o) {
    css();
    var ov = document.createElement('div'); ov.className = 'npd-ov';
    ov.innerHTML = '<div class="npd" role="dialog" aria-label="Phát âm từng âm"><div class="npd-top"><div class="npd-ring" id="npdRing"><b id="npdSc">…</b></div><div><h3>Phát âm từng âm</h3><p id="npdSub">Bấm vào từng chữ để xem âm sai, nghe chuẩn và nghe lại giọng của bạn.</p>' +
      '<div class="npd-leg"><span style="--b:#DCFCE7">Đúng</span><span style="--b:#FEF3C7">Gần đúng</span><span style="--b:#FEE2E2">Sai âm</span><span style="--b:#fff;--o:inset 0 0 0 1.5px #DC2626">Thiếu âm</span></div></div>' +
      '<button class="npd-x" aria-label="Đóng">×</button></div><div id="npdBody"><div class="npd-load"><i></i>Đang chấm từng âm trong bài nói của bạn…</div></div></div>';
    document.body.appendChild(ov);
    var close = function () { stop(); ov.remove(); document.removeEventListener('keydown', onKey); };
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.npd-x')) close(); });
    var blobP = null, getBlob = function () { return blobP || (blobP = o.getBlob ? o.getBlob() : Promise.reject()); };
    var o2 = Object.assign({}, o, { getBlob: getBlob });
    run(o2).then(function (R) {
      attachTimes(R.words, o.words);
      var ring = ov.querySelector('#npdRing'); ring.style.setProperty('--v', R.score); ring.style.setProperty('--c', colorOf(R.score));
      ov.querySelector('#npdSc').innerHTML = toBand(R.score).toFixed(1) + '<span style="display:block;font-size:10px;font-weight:700;color:#8A87A8;margin-top:-14px">' + R.score + '% âm đúng</span>';
      ov.querySelector('#npdSub').textContent = 'Band phát âm từ độ chuẩn từng âm: ' + toBand(R.score).toFixed(1) + ' (' + R.score + '% âm đúng). Bấm vào từng chữ để xem âm sai, nghe chuẩn và nghe lại giọng của bạn.';
      var body = ov.querySelector('#npdBody');
      body.innerHTML = '<div class="npd-words">' + R.words.map(function (w, i) {
        return '<button class="npd-w' + (w.fn ? ' fn' : '') + '" data-i="' + i + '" style="--c:' + colorOf(w.score) + '"><div class="t">' + esc(w.w) + ' <small>' + w.score + '</small></div><div class="npd-ph">' +
          w.ph.map(function (p) { return '<span class="npd-p ' + p.st + '">' + esc(key(p.p)) + '</span>'; }).join('') + w.extra.map(function (x) { return '<span class="npd-p extra">+' + esc(key(x)) + '</span>'; }).join('') + '</div></button>';
      }).join('') + '</div><div id="npdDet"></div><p class="npd-note">Chấm theo giọng Mỹ. Chữ mờ là từ phụ (a, the, to…) nên được đọc lướt, chấm nhẹ tay hơn. Điểm phát âm từng âm để luyện tập, có thể lệch ở những chỗ máy nghe chưa rõ.</p>';
      var pick = function (i) {
        var w = R.words[i]; if (!w) return;
        [].forEach.call(body.querySelectorAll('.npd-w'), function (b) { b.classList.toggle('sel', +b.dataset.i === i); });
        var n = w.ph.length, fixes = [];
        w.ph.forEach(function (p, k) {
          if (p.st === 'ok') return;
          var t = tipOf(p.p), pos = k === 0 ? 'đầu' : k === n - 1 ? 'cuối' : 'giữa', title;
          if (p.st === 'miss') title = (pos === 'cuối' && !VOW.test(key(p.p)) ? 'Nuốt mất âm cuối ' : 'Thiếu âm ') + '/' + key(p.p) + '/' + (pos !== 'cuối' ? ' ở ' + pos + ' từ' : '');
          else if (p.st === 'sub') title = 'Đọc /' + key(p.p) + '/ thành /' + key(p.got) + '/';
          else title = '/' + key(p.p) + '/ gần đúng (bạn đọc /' + key(p.got) + '/)';
          fixes.push('<div class="npd-fix" style="--c:' + (p.st === 'near' ? '#F59E0B' : '#DC2626') + '"><b class="h">' + esc(title) + '</b><div class="how"><b>Cách đọc ' + esc(t[0]) + ':</b> ' + esc(t[1]) + '</div>' + (t[2] ? '<div class="eg">Luyện với: ' + esc(t[2]) + '</div>' : '') + '</div>');
        });
        if (w.extra.length) fixes.push('<div class="npd-fix" style="--c:#94A3B8"><b class="h">Thừa âm ' + w.extra.map(function (x) { return '/' + esc(key(x)) + '/'; }).join(' ') + '</b><div class="how">Bạn đọc thêm âm không có trong từ. Đọc gọn lại, đừng thêm "ơ" hay "s" phía sau.</div></div>');
        var hasT = w.s != null && isFinite(w.s) && w.e > w.s;
        body.querySelector('#npdDet').innerHTML = '<div class="npd-d"><h4>' + esc(w.w) + ' <span>/' + esc(w.ph.map(function (p) { return key(p.p); }).join('')) + '/</span></h4>' +
          '<div class="npd-btns"><button class="npd-b" data-a="std">' + IC.spk + 'Nghe chuẩn</button><button class="npd-b" data-a="slow">' + IC.slow + 'Nghe chậm</button>' +
          '<button class="npd-b me" data-a="me"' + (hasT ? '' : ' disabled title="Không tìm được chỗ chữ này trong file ghi âm"') + '>' + IC.mic + 'Nghe bạn đọc</button>' +
          '<button class="npd-b cmp" data-a="cmp"' + (hasT ? '' : ' disabled') + '>' + IC.cmp + 'So sánh: chuẩn rồi bạn</button></div>' +
          '<div class="npd-big">' + w.ph.map(function (p) { return '<span class="npd-p ' + p.st + '" title="' + (p.st === 'ok' ? 'Đúng' : p.st === 'miss' ? 'Thiếu' : 'Bạn đọc: ' + esc(key(p.got))) + '">' + esc(key(p.p)) + '</span>'; }).join('') + '</div>' +
          (fixes.length ? fixes.join('') : '<div class="npd-ok">Chữ này bạn phát âm đúng hết các âm.</div>') + '</div>';
        [].forEach.call(body.querySelectorAll('[data-a]'), function (b) {
          b.onclick = function () {
            var a = b.dataset.a; [].forEach.call(body.querySelectorAll('[data-a]'), function (x) { x.classList.remove('on'); }); b.classList.add('on');
            var done = function () { b.classList.remove('on'); };
            var mine = function () { return getBlob().then(function (bl) { return playMine(bl, w.s, w.e); }); };
            (a === 'std' ? say(w.w, .9) : a === 'slow' ? say(w.w, .5) : a === 'me' ? mine() : say(w.w, .85).then(function () { return new Promise(function (r) { setTimeout(r, 350); }); }).then(mine))
              .then(done, function () { done(); if (a === 'me' || a === 'cmp') { b.disabled = true; b.title = 'Không phát được file ghi âm trên máy này'; } });
          };
        });
        body.querySelector('#npdDet').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
      body.querySelector('.npd-words').addEventListener('click', function (e) { var b = e.target.closest('.npd-w'); if (b) pick(+b.dataset.i); });
      var worst = R.words.map(function (w, i) { return [w.fn ? 999 : w.score, i]; }).sort(function (a, b) { return a[0] - b[0]; })[0];
      pick(worst ? worst[1] : 0);
    }).catch(function (e) {
      ov.querySelector('#npdSc').textContent = '–';
      ov.querySelector('#npdBody').innerHTML = '<div class="npd-err">' + esc(e && e.message && !/fetch|busy|network/i.test(e.message) ? e.message : 'Máy chấm phát âm đang bận hoặc đang khởi động. Bạn đợi khoảng 1 phút rồi bấm lại nhé.') + '</div>';
    });
  }
  /* Đổi độ chuẩn âm (0-100) sang band IELTS cho tiêu chí Phát âm (phần "phát âm từng âm") */
  function toBand(v) {
    var T = [[95, 8.5], [90, 8], [85, 7.5], [80, 7], [74, 6.5], [68, 6], [61, 5.5], [53, 5], [45, 4.5], [37, 4], [28, 3.5]];
    for (var i = 0; i < T.length; i++) if (v >= T[i][0]) return T[i][1];
    return 3;
  }
  function scoreRaw(blob, text) { return score(blob, text).then(compact); }
  function prefetch(o) { return run(o).catch(function () { return null; }); }
  window.NightPron = { open: open, toBand: toBand, scoreRaw: scoreRaw, prefetch: prefetch, result: function (id) { return results[id || 'cur'] || null; }, btnCss: css };
})();
