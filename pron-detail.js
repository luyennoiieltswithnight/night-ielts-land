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
      '.npd-ov{position:fixed;inset:0;z-index:10050;background:rgba(20,16,48,.55);backdrop-filter:blur(4px);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:22px 12px}',
      '.npd{width:100%;max-width:1180px;background:#FBFAFF;border-radius:28px;box-shadow:0 30px 70px -20px rgba(20,10,80,.55);color:#1F1B3A;font-family:"Plus Jakarta Sans",system-ui,sans-serif;animation:npdIn .25s ease-out;overflow:clip}',
      '@keyframes npdIn{from{opacity:0;transform:translateY(14px)}}',
      '.npd-hd{display:flex;align-items:center;gap:16px;padding:18px 22px;background:linear-gradient(120deg,#2A2370,#5B4BDB 60%,#B84BD8);color:#fff}',
      '.npd-ring{--v:0;width:76px;height:76px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--c,#22C55E) calc(var(--v)*1%),rgba(255,255,255,.18) 0);flex:none}',
      '.npd-ring b{width:60px;height:60px;border-radius:50%;background:#251F63;display:grid;place-items:center;font-size:22px;font-weight:800}',
      '.npd-hd h3{margin:0;font-size:20px;font-weight:800}.npd-hd p{margin:4px 0 0;font-size:13.5px;opacity:.85;line-height:1.45}',
      '.npd-stat{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.npd-stat span{background:rgba(255,255,255,.16);border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700}',
      '.npd-x{margin-left:auto;align-self:flex-start;border:0;background:rgba(255,255,255,.18);width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;color:#fff;flex:none}',
      '.npd-main{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(320px,1fr);gap:18px;padding:18px 22px 22px}',
      '.npd-sec{font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#8A87A8;margin:0 0 8px}',
      '.npd-box{background:#fff;border:1px solid #ECE9F8;border-radius:20px;padding:16px}',
      '.npd-text{font-size:17px;line-height:2.05}',
      '.npd-tw{border:0;background:none;font:inherit;color:inherit;padding:1px 3px;border-radius:7px;cursor:pointer;border-bottom:2.5px solid transparent}',
      '.npd-tw.lv1{border-bottom-color:#F59E0B}.npd-tw.lv2{background:#FEE2E2;color:#B91C1C;border-bottom-color:#EF4444}.npd-tw.fn{color:#8A87A8}',
      '.npd-tw.sel{background:#5B4BDB;color:#fff;border-bottom-color:#5B4BDB}',
      '.npd-todo{display:flex;flex-wrap:wrap;gap:8px}',
      '.npd-chip{border:1.5px solid #ECE9F8;background:#fff;border-radius:14px;padding:7px 11px;font:700 14.5px "Plus Jakarta Sans",sans-serif;color:#1F1B3A;cursor:pointer;display:inline-flex;align-items:center;gap:7px}',
      '.npd-chip i{font-style:normal;font-size:11px;font-weight:800;border-radius:999px;padding:1px 7px;color:#fff;background:var(--c)}.npd-chip.sel{border-color:#5B4BDB;box-shadow:0 0 0 3px #E4DFFF}',
      '.npd-good{color:#16A34A;font-weight:700;font-size:14px}',
      '.npd-grid{display:flex;flex-wrap:wrap;gap:8px;align-content:flex-start}',
      '.npd-kbar{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}',
      '.npd-k{border:0;border-radius:999px;padding:10px 16px;font:800 13.5px "Plus Jakarta Sans",sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:8px;background:#1F1B3A;color:#fff}',
      '.npd-k.std{background:#EEEAFE;color:#4B3CC9}.npd-k svg{width:15px;height:15px}.npd-k.on{background:#EF4444;color:#fff}',
      '.npd-w.kara{background:#5B4BDB;border-color:#5B4BDB;transform:translateY(-3px) scale(1.04);box-shadow:0 10px 20px -10px #5B4BDB}.npd-w.kara .t{color:#fff}.npd-w.kara .t small{background:#fff;color:#5B4BDB}',
      '.npd-w.past{opacity:.55}',
      '.npd-w{border:1.5px solid #ECE9F8;border-radius:14px;padding:7px 10px 6px;background:#fff;cursor:pointer;transition:transform .12s;font:inherit;text-align:left;color:inherit}',
      '.npd-w:hover{transform:translateY(-2px)}.npd-w.sel{border-color:#5B4BDB;box-shadow:0 0 0 3px #E4DFFF}.npd-w.fn{opacity:.72}',
      '.npd-w .t{font-weight:800;font-size:16px;display:flex;align-items:center;gap:5px}.npd-w .t small{font-size:10.5px;font-weight:800;border-radius:999px;padding:1px 6px;color:#fff;background:var(--c)}',
      '.npd-ph{display:flex;align-items:flex-start;gap:3px;margin-top:5px;flex-wrap:wrap}',
      '.npd-ph .npd-p{font-size:13px;padding:0 5px;border-radius:6px;line-height:1.6}',
      '.npd-leg{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:#6B6890;margin:0 0 10px}.npd-leg span:before{content:"";display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px;background:var(--b);box-shadow:var(--o,none)}',
      '.npd-side{position:sticky;top:12px;align-self:start}',
      '.npd-card{background:#fff;border:1px solid #ECE9F8;border-radius:22px;padding:18px;box-shadow:0 14px 30px -24px rgba(40,20,140,.45)}',
      '.npd-card h4{margin:0;font-size:30px;font-weight:800;letter-spacing:-.01em;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.npd-card h4 span{font-family:"Noto Sans","Segoe UI",sans-serif;color:#8A87A8;font-size:16px;font-weight:400}',
      '.npd-big{display:flex;align-items:flex-start;gap:6px;flex-wrap:wrap;margin:12px 0 2px}',
      '.npd-p{font-family:"Noto Sans","Segoe UI",sans-serif;font-weight:700;border-radius:10px;padding:3px 11px;font-size:20px;line-height:1.5}',
      '.npd-p.ok{background:#DCFCE7;color:#15803D}.npd-p.near{background:#FEF3C7;color:#B45309}.npd-p.sub{background:#FEE2E2;color:#DC2626}',
      '.npd-p.miss{background:#fff;color:#DC2626;box-shadow:inset 0 0 0 2px #EF4444;text-decoration:line-through}.npd-p.extra{background:#F1F5F9;color:#64748B;font-style:italic}',
      '.npd-p small{display:block;font-size:10px;font-weight:700;text-align:center;font-family:"Plus Jakarta Sans",sans-serif;opacity:.8;line-height:1.2;text-decoration:none}',
      '.npd-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}',
      '.npd-b{border:0;border-radius:14px;padding:10px 12px;font:700 13.5px "Plus Jakarta Sans",sans-serif;cursor:pointer;background:#EEEAFE;color:#4B3CC9;display:flex;align-items:center;justify-content:center;gap:7px}',
      '.npd-b.me{background:#FFE4EC;color:#BE185D}.npd-b.cmp{background:#1F1B3A;color:#fff}.npd-b:disabled{opacity:.4;cursor:default}.npd-b.on{outline:3px solid rgba(91,75,219,.3)}',
      '.npd-b svg{width:15px;height:15px;flex:none}',
      '.npd-fix{border-radius:14px;background:#FFF8F8;border:1px solid #FDE2E2;padding:11px 13px;margin-top:10px}.npd-fix.near{background:#FFFBEB;border-color:#FDE9B5}.npd-fix.extra{background:#F8FAFC;border-color:#E2E8F0}',
      '.npd-fix b.h{display:block;margin-bottom:4px;font-size:14.5px}.npd-fix .how{color:#3F3D56;font-size:14px;line-height:1.55}.npd-fix .eg{color:#6B6890;font-size:12.5px;margin-top:5px}',
      '.npd-ok{color:#16A34A;font-weight:700;margin-top:12px}',
      '.npd-prac{margin-top:14px;border-top:1px dashed #E4E1F3;padding-top:14px}',
      '.npd-rec{display:inline-flex;align-items:center;gap:8px;border:1.5px solid #E4DFFF;border-radius:999px;padding:9px 16px;font:700 14px "Plus Jakarta Sans",sans-serif;color:#4B3CC9;background:#F6F4FF;cursor:pointer}.npd-rec:hover{background:#EEEAFE}',
      '.npd-rec.on{color:#fff;background:#EF4444;border-color:#EF4444;animation:npdPulse 1.1s infinite}@keyframes npdPulse{50%{box-shadow:0 0 0 7px rgba(239,68,68,.15)}}',
      '.npd-rec:disabled{opacity:.6;cursor:default}.npd-rec svg{width:16px;height:16px;flex:none}',
      '.npd-try{margin-top:10px;font-size:14px}.npd-try .npd-big .npd-p{font-size:17px}',
      '.npd-try .msg{font-weight:800;margin-top:6px}',
      '.npd-load{padding:60px 10px;text-align:center;color:#6B6890;font-weight:600}.npd-load i{display:block;width:34px;height:34px;margin:0 auto 12px;border-radius:50%;border:3px solid #E4DFFF;border-top-color:#5B4BDB;animation:npdSp 1s linear infinite}@keyframes npdSp{to{transform:rotate(360deg)}}',
      '.npd-err{color:#DC2626;font-weight:700;padding:26px 22px}',
      '.npd-note{font-size:12px;color:#8A87A8;margin:12px 2px 0;line-height:1.5}',
      '.npd-open{display:inline-flex;align-items:center;gap:8px;margin:10px 0 2px;border:0;border-radius:999px;padding:9px 15px;font:800 13.5px "Plus Jakarta Sans",sans-serif;cursor:pointer;color:#fff;background:linear-gradient(135deg,#5B4BDB,#EC4899);box-shadow:0 8px 18px -10px #5B4BDB}',
      '.npd-open small{background:rgba(255,255,255,.25);border-radius:999px;padding:1px 8px;font-size:12px}',
      '@media(max-width:820px){.npd-main{grid-template-columns:1fr;padding:14px}.npd-side{position:static}.npd-hd{padding:14px 16px}.npd-ring{width:62px;height:62px}.npd-ring b{width:48px;height:48px;font-size:18px}.npd-hd h3{font-size:17px}.npd-card h4{font-size:25px}.npd-ov{padding:8px 4px}.npd{border-radius:22px}}'
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
    return { v: 1, score: j.score, at: Date.now(), words: j.words.map(function (w) { return { w: w.w, score: w.score, fn: !!w.fn, s: w.s != null ? w.s : null, e: w.e != null ? w.e : null, ph: w.ph.map(function (p) { return p.p + '|' + p.st + '|' + (p.got || ''); }).join(' '), x: (w.extra || []).join(' ') }; }) };   // Firestore không nhận mảng lồng nhau -> lưu dạng chuỗi
  }
  function expand(c) {
    return { score: c.score, words: c.words.map(function (w) { return { w: w.w, score: w.score, fn: w.fn, s: w.s, e: w.e, ph: (typeof w.ph === 'string' ? w.ph.split(' ').filter(Boolean).map(function (t) { return t.split('|'); }) : w.ph).map(function (a) { return { p: a[0], st: a[1], got: a[2] || '' }; }), extra: typeof w.x === 'string' ? w.x.split(' ').filter(Boolean) : (w.x || []) }; }) };
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
    if (W.some(function (w) { return w.s != null && w.e > w.s; })) return;   // máy chấm đã trả mốc thời gian từng chữ
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
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
    spk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
    slow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    cmp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4 3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8"/></svg>'
  };
  function phChips(ph, extra, withGot) {
    return ph.map(function (p) {
      var lab = withGot && p.st !== 'ok' ? '<small>' + (p.st === 'miss' ? 'thiếu' : 'bạn: ' + esc(key(p.got))) + '</small>' : '';
      return '<span class="npd-p ' + p.st + '">' + esc(key(p.p)) + lab + '</span>';
    }).join('') + (extra || []).map(function (x) { return '<span class="npd-p extra">+' + esc(key(x)) + (withGot ? '<small>thừa</small>' : '') + '</span>'; }).join('');
  }
  function fixList(w) {
    var n = w.ph.length, out = [], seen = {};
    w.ph.forEach(function (p, k) {
      if (p.st === 'ok') return;
      var t = tipOf(p.p), pos = k === 0 ? 'đầu' : k === n - 1 ? 'cuối' : 'giữa', title;
      if (p.st === 'miss') title = (pos === 'cuối' && !VOW.test(key(p.p)) ? 'Nuốt mất âm cuối ' : 'Thiếu âm ') + '/' + key(p.p) + '/' + (pos !== 'cuối' ? ' ở ' + pos + ' từ' : '');
      else if (p.st === 'sub') title = 'Đọc /' + key(p.p) + '/ thành /' + key(p.got) + '/';
      else title = '/' + key(p.p) + '/ gần đúng (bạn đọc /' + key(p.got) + '/)';
      var head = '<b class="h">' + esc(title) + '</b>';
      if (seen[key(p.p)]) { out.push('<div class="npd-fix ' + (p.st === 'near' ? 'near' : '') + '">' + head + '</div>'); return; }
      seen[key(p.p)] = 1;
      out.push('<div class="npd-fix ' + (p.st === 'near' ? 'near' : '') + '">' + head + '<div class="how"><b>Cách đọc ' + esc(t[0]) + ':</b> ' + esc(t[1]) + '</div>' + (t[2] ? '<div class="eg">Luyện với: ' + esc(t[2]) + '</div>' : '') + '</div>');
    });
    if (w.extra.length) out.push('<div class="npd-fix extra"><b class="h">Thừa âm ' + w.extra.map(function (x) { return '/' + esc(key(x)) + '/'; }).join(' ') + '</b><div class="how">Bạn đọc thêm âm không có trong từ. Đọc gọn lại, đừng thêm "ơ" hay "s" phía sau.</div></div>');
    return out.join('');
  }
  var mr = null;
  function recordWord(btn, onBlob) {
    if (mr && mr.state === 'recording') { mr.stop(); return; }
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (st) {
      var ch = [], mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].filter(function (m) { return window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m); })[0];
      mr = new MediaRecorder(st, mime ? { mimeType: mime } : undefined);
      mr.ondataavailable = function (e) { if (e.data && e.data.size) ch.push(e.data); };
      var auto = setTimeout(function () { if (mr && mr.state === 'recording') mr.stop(); }, 6000);
      mr.onstop = function () { clearTimeout(auto); st.getTracks().forEach(function (t) { t.stop(); }); btn.classList.remove('on'); onBlob(new Blob(ch, { type: mr.mimeType || 'audio/webm' })); };
      mr.start(); btn.classList.add('on'); btn.innerHTML = IC.mic + 'Đang nghe… đọc xong bấm để dừng';
    }).catch(function () { btn.textContent = 'Chưa cho phép dùng micro'; });
  }

  function open(o) {
    css();
    var ov = document.createElement('div'); ov.className = 'npd-ov';
    ov.innerHTML = '<div class="npd" role="dialog" aria-label="Phát âm từng âm"><div class="npd-hd"><div class="npd-ring" id="npdRing"><b id="npdSc">…</b></div>' +
      '<div style="min-width:0"><h3>Phát âm của bạn</h3><p id="npdSub">Đang nghe từng âm trong bài nói…</p><div class="npd-stat" id="npdStat"></div></div><button class="npd-x" aria-label="Đóng">×</button></div>' +
      '<div id="npdBody"><div class="npd-load"><i></i>Đang chấm từng âm trong bài nói của bạn…</div></div></div>';
    document.body.appendChild(ov);
    var close = function () { if (ov.__kStop) ov.__kStop(); stop(); if (mr && mr.state === 'recording') try { mr.stop(); } catch (e) {} ov.remove(); document.removeEventListener('keydown', onKey); };
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.npd-x')) close(); });
    var blobP = null, getBlob = function () { return blobP || (blobP = o.getBlob ? o.getBlob() : Promise.reject()); };
    run(Object.assign({}, o, { getBlob: getBlob })).then(function (R) {
      attachTimes(R.words, o.words);
      var band = toBand(R.score), bad = R.words.filter(function (w) { return !w.fn && w.score < 85; });
      var ring = ov.querySelector('#npdRing'); ring.style.setProperty('--v', R.score); ring.style.setProperty('--c', R.score >= 85 ? '#4ADE80' : R.score >= 60 ? '#FBBF24' : '#F87171');
      ov.querySelector('#npdSc').textContent = band.toFixed(1);
      ov.querySelector('#npdSub').textContent = bad.length ? 'Nhìn cả bài để so: âm đỏ là sai, khung đỏ là thiếu. Bấm vào chữ bất kỳ để nghe chuẩn, nghe lại giọng bạn và đọc lại cho đúng.' : 'Bạn phát âm rất chuẩn. Bấm vào bất kỳ chữ nào để nghe lại và so sánh.';
      ov.querySelector('#npdStat').innerHTML = '<span>Band phát âm ' + band.toFixed(1) + '</span><span>' + R.score + '% âm đúng</span><span>' + bad.length + ' chữ cần sửa</span>';
      var lv = function (w) { return w.score >= 85 ? 0 : w.score >= 60 ? 1 : 2; };
      var todo = bad.map(function (w) { return w; }).sort(function (a, b) { return a.score - b.score; }).slice(0, 10);
      var body = ov.querySelector('#npdBody');
      body.innerHTML = '<div class="npd-main"><div>' +
        '<div class="npd-kbar"><button class="npd-k" data-k="me">' + IC.play + 'Nghe bài của bạn · chạy chữ</button><button class="npd-k std" data-k="std">' + IC.play + 'Nghe giọng chuẩn · chạy chữ</button></div>' +
        '<div class="npd-leg"><span style="--b:#DCFCE7">Đúng</span><span style="--b:#FEF3C7">Gần đúng</span><span style="--b:#FEE2E2">Sai âm</span><span style="--b:#fff;--o:inset 0 0 0 1.5px #DC2626">Thiếu âm</span><span style="--b:#F1F5F9">Thừa âm</span></div>' +
        '<div class="npd-grid">' + R.words.map(function (w, i) {
          return '<button class="npd-w' + (w.fn ? ' fn' : '') + '" data-i="' + i + '" style="--c:' + colorOf(w.score) + '"><div class="t">' + esc(w.w) + ' <small>' + w.score + '</small></div><div class="npd-ph">' + phChips(w.ph, w.extra, false) + '</div></button>';
        }).join('') + '</div>' +
        '<p class="npd-note">Chữ mờ là từ phụ (a, the, to…) nên đọc lướt, chấm nhẹ tay hơn. Chấm theo giọng Mỹ, có thể lệch ở chỗ máy nghe chưa rõ.</p>' +
        '</div><div class="npd-side" id="npdDet"></div></div>';
      var pick = function (i) {
        var w = R.words[i]; if (!w) return;
        if (ov.__kStop) ov.__kStop();
        [].forEach.call(body.querySelectorAll('[data-i]'), function (b) { b.classList.toggle('sel', +b.dataset.i === i); });
        var hasT = w.s != null && isFinite(w.s) && w.e > w.s, fx = fixList(w);
        var det = body.querySelector('#npdDet');
        det.innerHTML = '<div class="npd-card"><p class="npd-sec">Chữ đang xem · <span style="color:' + colorOf(w.score) + '">' + w.score + '% âm đúng</span></p><h4>' + esc(w.w) + ' <span>/' + esc(w.ph.map(function (p) { return key(p.p); }).join('')) + '/</span></h4>' +
          '<div class="npd-big">' + phChips(w.ph, w.extra, true) + '</div>' +
          '<div class="npd-btns"><button class="npd-b" data-a="std">' + IC.spk + 'Nghe chuẩn</button><button class="npd-b" data-a="slow">' + IC.slow + 'Nghe chậm</button>' +
          '<button class="npd-b me" data-a="me"' + (hasT ? '' : ' disabled title="Không tìm được chỗ chữ này trong file ghi âm"') + '>' + IC.mic + 'Giọng bạn</button>' +
          '<button class="npd-b cmp" data-a="cmp"' + (hasT ? '' : ' disabled') + '>' + IC.cmp + 'Chuẩn rồi bạn</button></div>' +
          (fx || '<div class="npd-ok">Chữ này bạn phát âm đúng hết các âm.</div>') +
          '<div class="npd-prac"><p class="npd-sec">Tự đọc lại cho đúng</p><button class="npd-rec" id="npdRec">' + IC.mic + 'Đọc lại "' + esc(w.w) + '"</button><div class="npd-try" id="npdTry"></div></div></div>';
        [].forEach.call(det.querySelectorAll('[data-a]'), function (b) {
          b.onclick = function () {
            var a = b.dataset.a; [].forEach.call(det.querySelectorAll('[data-a]'), function (x) { x.classList.remove('on'); }); b.classList.add('on');
            var done = function () { b.classList.remove('on'); };
            var mine = function () { return getBlob().then(function (bl) { return playMine(bl, w.s, w.e); }); };
            (a === 'std' ? say(w.w, .9) : a === 'slow' ? say(w.w, .5) : a === 'me' ? mine() : say(w.w, .85).then(function () { return new Promise(function (r) { setTimeout(r, 350); }); }).then(mine))
              .then(done, function () { done(); if (a === 'me' || a === 'cmp') { b.disabled = true; b.title = 'Không phát được file ghi âm trên máy này'; } });
          };
        });
        var rb = det.querySelector('#npdRec'), tryEl = det.querySelector('#npdTry'), best = w.score;
        rb.onclick = function () {
          stop();
          recordWord(rb, function (bl) {
            rb.disabled = true; rb.innerHTML = IC.mic + 'Đang chấm…';
            score(bl, w.w).then(function (j) {
              var t = j.words && j.words[0];
              if (!t) throw new Error('Chưa nghe rõ, đọc to hơn chút nhé.');
              var up = t.score > best; best = Math.max(best, t.score);
              tryEl.innerHTML = '<div class="npd-big">' + phChips(t.ph, t.extra, true) + '</div><div class="msg" style="color:' + colorOf(t.score) + '">' +
                (t.score >= 95 ? 'Chuẩn rồi! ' : t.score >= 85 ? 'Rất tốt! ' : up ? 'Tốt hơn lần trước rồi! ' : 'Chưa chuẩn, thử lại nhé. ') + t.score + '% âm đúng</div>' +
                '<button class="npd-b me" style="margin-top:8px;width:100%" data-mine>' + IC.spk + 'Nghe lại lần vừa đọc</button>';
              tryEl.querySelector('[data-mine]').onclick = function () { decode(bl).then(function (b) { playMine(bl, 0, b.duration); }); };
            }).catch(function (e) { tryEl.innerHTML = '<div class="msg" style="color:#DC2626">' + esc(e && e.message && !/fetch|busy/i.test(e.message) ? e.message : 'Máy chấm đang bận, thử lại sau ít giây nhé.') + '</div>'; })
              .then(function () { rb.disabled = false; rb.innerHTML = IC.mic + 'Đọc lại "' + esc(w.w) + '"'; });
          });
        };
        if (window.innerWidth <= 820) det.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      /* ---------- Karaoke: phát cả bài, chữ đang đọc sáng lên ---------- */
      var cards = [].slice.call(body.querySelectorAll('.npd-w')), kb = [].slice.call(body.querySelectorAll('.npd-k')), raf = 0, kOn = null;
      var mark = function (i) { cards.forEach(function (c, k) { c.classList.toggle('kara', k === i); c.classList.toggle('past', i >= 0 && k < i); }); if (i >= 0 && cards[i]) cards[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
      var kStop = function () { cancelAnimationFrame(raf); stop(); mark(-1); cards.forEach(function (c) { c.classList.remove('past'); }); kb.forEach(function (b) { b.classList.remove('on'); b.innerHTML = IC.play + (b.dataset.k === 'me' ? 'Nghe bài của bạn · chạy chữ' : 'Nghe giọng chuẩn · chạy chữ'); }); kOn = null; };
      ov.__kStop = kStop;
      var hasTimes = R.words.some(function (w) { return w.s != null && w.e > w.s; });
      if (!hasTimes) kb[0].disabled = true;
      kb.forEach(function (b) {
        b.onclick = function () {
          var k = b.dataset.k; if (kOn === k) { kStop(); return; } kStop(); kOn = k;
          b.classList.add('on'); b.innerHTML = IC.stop + 'Dừng';
          if (k === 'me') {
            getBlob().then(decode).then(function (buf) {
              if (kOn !== 'me') return;
              if (actx.state === 'suspended') actx.resume();
              var src = actx.createBufferSource(); src.buffer = buf; src.connect(actx.destination); var t0 = actx.currentTime; src.start(); playing = src;
              src.onended = function () { if (kOn === 'me') kStop(); };
              var cur = -1;
              (function tick() {
                var t = actx.currentTime - t0, i = -1;
                for (var n = 0; n < R.words.length; n++) { var w = R.words[n]; if (w.s != null && t >= w.s - 0.05 && t <= (w.e || w.s) + 0.12) { i = n; break; } if (w.s != null && w.s > t) break; }
                if (i >= 0 && i !== cur) { cur = i; mark(i); }
                if (kOn === 'me') raf = requestAnimationFrame(tick);
              })();
            }).catch(function () { kStop(); b.disabled = true; });
          } else {
            var txt = '', starts = [];
            R.words.forEach(function (w) { starts.push(txt.length); txt += w.w + ' '; });
            try {
              speechSynthesis.cancel();
              var u = new SpeechSynthesisUtterance(txt.trim()); u.lang = 'en-US'; u.rate = 0.85;
              var v = speechSynthesis.getVoices().filter(function (x) { return /en[-_]US/i.test(x.lang); }); var best = v.filter(function (x) { return /Samantha|Google US|Aria|Jenny|Natural/i.test(x.name); })[0] || v[0]; if (best) u.voice = best;
              var gotB = false, est = null;
              u.onboundary = function (e) { if (e.name && e.name !== 'word') return; gotB = true; var i = 0; while (i + 1 < starts.length && starts[i + 1] <= e.charIndex) i++; mark(i); };
              u.onstart = function () { var t0 = Date.now(), per = 60000 / (150 * 0.85); est = setInterval(function () { if (gotB || kOn !== 'std') return clearInterval(est); var el = Date.now() - t0, acc = 0, i = 0; for (; i < R.words.length; i++) { acc += per * Math.max(1, R.words[i].w.length / 5); if (acc > el) break; } mark(Math.min(i, R.words.length - 1)); }, 120); };
              u.onend = u.onerror = function () { clearInterval(est); if (kOn === 'std') kStop(); };
              speechSynthesis.speak(u);
            } catch (e) { kStop(); }
          }
        };
      });
      body.querySelector('.npd-main').addEventListener('click', function (e) { var b = e.target.closest('.npd-w'); if (b) pick(+b.dataset.i); });
      var first = todo[0] ? R.words.indexOf(todo[0]) : 0;
      pick(first);
      if (window.innerWidth <= 820) ov.scrollTop = 0;
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
