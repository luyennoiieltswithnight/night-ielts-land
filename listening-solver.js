/* Night IELTS — "Giải đề cùng thầy" cho Listening (chỉ tài khoản admin/thầy thấy nút).
   Quy trình của thầy, mỗi Section:
     1) Từ cần nhớ: cặp từ trong đề ↔ cách nói trong transcript (phiên âm, loa, ảnh Irasutoya) → học sinh chép.
     2) Từng nhóm câu: cách đọc nhóm (điền từ đọc lướt theo thứ tự · matching/map đọc TỪNG option, option thừa ·
        trắc nghiệm đọc keyword đề + khác biệt giữa A/B/C).
     3) Từng câu: dự đoán (loại từ + đáp án có thể / keyword) + từ tín hiệu để "đợi"
        → bấm tiếp: đáp án, mở transcript, tô vị trí + cặp từ đồng nghĩa.
   Nội dung do AI (Groq, key của thầy trong trình duyệt) soạn 1 lần / Section, lưu Firestore
   publicSettings/listenSolve__<đề>__s<N> → các lớp sau mở ra là có ngay. Có nút Soạn lại / Sửa. */
(function () {
  if (window.ListeningSolver) return;
  var FB_CONFIG = {
    apiKey: 'AIzaSyCmeN49M4oI78ZPWDhMlbisDOLaMJp2mb8',
    authDomain: 'night-ielts-land.firebaseapp.com',
    projectId: 'night-ielts-land',
    storageBucket: 'night-ielts-land.firebasestorage.app',
    messagingSenderId: '408519436407',
    appId: '1:408519436407:web:a9f0b9ba23368b54427e72'
  };
  var V = '10.8.1', CK = 'nrs_admin_uid', FBX = null;
  var COLORS = ['#2563eb', '#d97706', '#059669', '#db2777', '#7c3aed', '#0891b2', '#dc2626', '#65a30d'];
  var TYPE_NAME = { text: 'Điền từ (notes)', table: 'Điền bảng', flowchart: 'Điền sơ đồ', wordbank: 'Chọn từ trong khung', mcq: 'Trắc nghiệm', multi: 'Chọn nhiều đáp án', matching: 'Matching', list_match: 'Matching', grid: 'Matching', planlabel: 'Bản đồ / sơ đồ (map)', short: 'Trả lời ngắn' };
  var OPT_TYPES = { matching: 1, list_match: 1, grid: 1, planlabel: 1, wordbank: 1 };
  var MCQ_TYPES = { mcq: 1, multi: 1 };
  var TEST_ID = location.pathname.replace(/^\/+|\.html$/g, '').replace(/[^a-z0-9]+/gi, '__');
  var IRA = (function () { try { return new URL('khoahoc/img/ira/', document.currentScript.src).href; } catch (e) { return '/khoahoc/img/ira/'; } })();

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function plain(h) { var d = document.createElement('div'); d.innerHTML = String(h || '').replace(/<br\s*\/?>/gi, ' '); return (d.textContent || '').replace(/\s+/g, ' ').trim(); }
  function data() { try { return (typeof questionsData !== 'undefined') ? questionsData : null; } catch (e) { return null; } }
  function groqCfg() { try { return JSON.parse(localStorage.getItem('nightIeltsGroqCfg') || '{}'); } catch (e) { return {}; } }

  /* ---------- Phân tích đề ---------- */
  function analyse() {
    var qd = data(); if (!qd) return null;
    var n = 0;
    return qd.map(function (groups, si) {
      var gs = (groups || []).map(function (g, gi) {
        var gaps = [];
        if (g.notesTemplate && /___/.test(g.notesTemplate)) {
          var lines = g.notesTemplate.split('\n'), prev = '';
          lines.forEach(function (ln) {
            var parts = ln.split('___');
            if (parts.length >= 2) for (var k = 0; k < parts.length - 1; k++) gaps.push({ line: ln, k: k, head: prev });
            if (ln.trim()) prev = ln.trim().replace(/___/g, '…');
          });
        } else if (g.type === 'table' && g.tableRows) {
          g.tableRows.forEach(function (row) {
            row.forEach(function (cell, ci) {
              var parts = String(cell).split('___');
              for (var k = 0; k < parts.length - 1; k++) gaps.push({ line: (g.tableColumns && g.tableColumns[ci] ? g.tableColumns[ci] + ': ' : '') + cell, k: k, head: row[0] + (row[1] ? ' · ' + row[1] : '') });
            });
          });
        }
        var qs = (g.questions || []).map(function (q, qi) {
          n++;
          var num = q.qNum || n, ctx = plain(q.text), x_prev = '';
          var gp = gaps[qi];
          if (gp) {
            var c = 0;
            ctx = gp.line.replace(/___/g, function () { return c++ === gp.k ? '[' + num + ' ____ ]' : '…'; }).trim();
            x_prev = gp.head && gp.head !== gp.line.trim() ? gp.head : '';
          }
          return { num: num, q: q, ctx: ctx, prev: x_prev, gi: gi };
        });
        return { gi: gi, g: g, type: g.type, qs: qs, color: COLORS[gi % COLORS.length], opts: (g.options || []).map(plain), title: plain(g.instruction) };
      });
      return { s: si + 1, groups: gs };
    });
  }
  function range(G) { var a = G.qs[0].num, b = G.qs[G.qs.length - 1].num; return a === b ? 'Câu ' + a : 'Câu ' + a + '–' + b; }
  function transcriptText(s) { var w = $('#passage-' + s + '-text'); return w ? (w.innerText || w.textContent || '').replace(/\n{2,}/g, '\n').trim() : ''; }

  /* ---------- AI soạn 1 Section ---------- */
  var SYS = 'You are an experienced IELTS Listening teacher in Vietnam preparing a "solve the test with the teacher" walkthrough. ' +
    'You get one Listening section: its question groups (with the correct answers and the transcript sentence where each answer is), and the full transcript. ' +
    'The walkthrough is used BEFORE listening (prediction), then to explain answers. Explanations in Vietnamese, English words kept in English. Be concise. ' +
    'Return ONLY a JSON object with this exact shape:\n' +
    '{"vocab":[{"q":"word/phrase as written in the QUESTION or OPTIONS","t":"the matching paraphrase/synonym as SAID in the transcript","ipa":"British IPA of t with slashes","vi":"short Vietnamese meaning","ja":"1-2 word Japanese keyword to find an irasutoya illustration of this idea"}],' +
    '"groups":[{"gi":0,"how":"1-2 sentences in Vietnamese: how to read this group BEFORE listening (do not mention any answer)","extra":"","options":[{"o":"option letter or text","key":"its keyword / core idea in Vietnamese (max 10 words)"}]}],' +
    '"questions":[{"n":1,"pos":"for gap-fill: part of speech + kind, e.g. danh từ chỉ nghề nghiệp, số tiền, tính từ; for others: empty","guess":["4-6 plausible answers BEFORE listening, from context only"],' +
    '"signals":["2-4 easy-to-hear words copied from the QUESTION PAPER itself (the gap line, the line just above it, e.g. a heading, label, name or number like Address, 24, Andrea Brown) that the listener waits for to know the gap is coming. NEVER include the answer or words that only appear in the transcript"],' +
    '"keywords":["for mcq/matching: keywords in the stem/item to underline"],"diff":"for mcq: how options A/B/C differ in 1-2 sentences (Vietnamese); else empty",' +
    '"why":"1 sentence in Vietnamese: why this is the answer, mention the trap/distractor if any","pairs":[["question/option words","transcript words"]]}]}\n' +
    'Rules: vocab = 8-15 items, ONLY pairs where the question/option wording DIFFERS from the transcript wording (paraphrase), plus key words beyond the answer that help locate the info; no pairs that are identical. ' +
    '"guess" must not simply copy the answer unless it is very predictable; include the real answer among them only if a student could reasonably predict it. ' +
    'Every question number given must appear once in "questions". Groups: include every group index; "options" only for groups that have options, list EVERY option (all letters A, B, C, D, E…) with its key idea — never only the correct ones.';
  function buildPrompt(P) {
    var out = 'SECTION ' + P.s + '\n\n';
    P.groups.forEach(function (G) {
      out += '### Group ' + G.gi + ' (' + G.type + ') — ' + G.title + '\n';
      if (G.opts.length) out += 'Options:\n' + G.opts.map(function (o) { return '  ' + o; }).join('\n') + '\n';
      G.qs.forEach(function (x) {
        var opts = (x.q.options || []).map(plain);
        out += 'Q' + x.num + ': ' + (x.prev ? '[line above: ' + x.prev + '] ' : '') + (x.ctx || '(no text)') + (opts.length ? ' | options: ' + opts.join(' / ') : '') +
          ' | ANSWER: ' + (Array.isArray(x.q.answer) ? x.q.answer.join(' / ') : x.q.answer) + ' | transcript: "' + plain(x.q.loc) + '"\n';
      });
      out += '\n';
    });
    var tr = transcriptText(P.s); if (tr.length > 14000) tr = tr.slice(0, 14000);
    return out + '### TRANSCRIPT\n' + tr;
  }
  function callGroq(P) {
    var cfg = groqCfg();
    if (!cfg.apiKey) return Promise.reject(new Error('Chưa có Groq API key trên máy này. Mở Speaking/Writing AI để nhập key một lần.'));
    var model = cfg.model || 'openai/gpt-oss-120b';
    var body = { model: model, temperature: 0.3, max_completion_tokens: 8000, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SYS }, { role: 'user', content: buildPrompt(P) }] };
    if (/gpt-oss/i.test(model)) body.reasoning_effort = 'low';
    var tries = 0;
    function go() {
      return fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.apiKey }, body: JSON.stringify(body) })
        .then(function (r) {
          if (r.status === 400 && body.reasoning_effort) { delete body.reasoning_effort; return go(); }
          if (r.status === 429 && tries++ < 3) return new Promise(function (res) { setTimeout(res, 5000); }).then(go);
          if (r.status === 401) throw new Error('Groq key không hợp lệ.');
          if (!r.ok) throw new Error('AI lỗi (HTTP ' + r.status + ').');
          return r.json().then(function (j) {
            var t = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content || '';
            t = t.replace(/^```(json)?|```$/g, '').trim();
            return JSON.parse(t);
          });
        });
    }
    return go();
  }

  /* ---------- Lưu / đọc Firestore ---------- */
  function docId(s) { return 'listenSolve__' + TEST_ID + '__s' + s; }
  function loadSaved(s) {
    return fetch('https://firestore.googleapis.com/v1/projects/' + FB_CONFIG.projectId + '/databases/(default)/documents/publicSettings/' + docId(s) + '?key=' + FB_CONFIG.apiKey, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { try { return d && d.fields && d.fields.json ? JSON.parse(d.fields.json.stringValue) : null; } catch (e) { return null; } })
      .catch(function () { return null; });
  }
  function saveDoc(s, obj) {
    return (FBX || Promise.reject(new Error('Chưa đăng nhập tài khoản thầy'))).then(function (x) {
      return x.fs.setDoc(x.fs.doc(x.db, 'publicSettings', docId(s)), { json: JSON.stringify(obj), path: location.pathname, section: s, updatedAt: Date.now(), by: x.uid || '' });
    });
  }

  /* ---------- Ảnh Irasutoya ---------- */
  var iraCache = {};
  function irasutoya(q) {
    if (iraCache[q]) return iraCache[q];
    return iraCache[q] = new Promise(function (res) {
      if (!q) return res([]);
      var cb = '__lsIra' + Date.now() + Math.floor(Math.random() * 1e5), s = document.createElement('script');
      var t = setTimeout(function () { done(); res([]); }, 9000);
      function done() { clearTimeout(t); try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); }
      window[cb] = function (j) {
        done();
        res(((j && j.feed && j.feed.entry) || []).map(function (e) { var th = e['media$thumbnail']; return th && th.url.replace(/\/s72-c\//, '/s400/').replace(/=s72-c$/, '=s400'); }).filter(Boolean));
      };
      s.onerror = function () { done(); res([]); };
      s.src = 'https://www.irasutoya.com/feeds/posts/summary?alt=json-in-script&max-results=8&q=' + encodeURIComponent(q) + '&callback=' + cb;
      document.head.appendChild(s);
    });
  }
  function fillImages(P) {
    var V = (P.ai && P.ai.vocab) || [], changed = false;
    var jobs = V.map(function (v, i) {
      if (v.img) return Promise.resolve();
      return irasutoya(v.ja).then(function (L) { return L.length ? L : irasutoya((v.ja || '').slice(0, 2)); }).then(function (L) {
        v.imgs = L; if (L[0]) { v.img = L[0]; changed = true; var im = $('#ls-card img[data-v="' + i + '"]'); if (im) im.src = v.img; }
      });
    });
    Promise.all(jobs).then(function () { if (changed && FBX) saveDoc(P.s, P.ai).catch(function () {}); });
  }

  /* ---------- Giọng đọc ---------- */
  var curAudio = null;
  function speak(text) {
    text = String(text || '').trim(); if (!text) return;
    try { speechSynthesis.cancel(); } catch (e) {}
    if (curAudio) try { curAudio.pause(); } catch (e) {}
    var a = new Audio('https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-GB&q=' + encodeURIComponent(text)); curAudio = a;
    a.play().catch(function () {
      try { var u = new SpeechSynthesisUtterance(text); u.lang = 'en-GB'; u.rate = 0.9; speechSynthesis.speak(u); } catch (e) {}
    });
  }

  /* ---------- Kịch bản từng bước ---------- */
  function script(P) {
    var A = P.ai || {}, out = [];
    var gInfo = {}; (A.groups || []).forEach(function (g) { gInfo[g.gi] = g; });
    var qInfo = {}; (A.questions || []).forEach(function (q) { qInfo[q.n] = q; });
    out.push({ kind: 'intro', st: 'music_earphone_canal_2571', title: 'Section ' + P.s + ': chuẩn bị trước khi nghe', html: 'Section này có <b>' + P.groups.length + ' nhóm câu</b> (' + P.groups.map(function (G) { return range(G).replace('Câu ', 'C') + ' ' + (TYPE_NAME[G.type] || G.type); }).join(' · ') + '). Học từ cần nhớ trước, rồi đọc đề theo từng câu.' });
    if ((A.vocab || []).length) out.push({ kind: 'vocab', st: 'bunbougu_memo_7150', title: 'Từ cần nhớ — chép vào vở', html: 'Bên trái là chữ <b>trong đề</b>, bên phải là cách người nói <b>nói trong bài nghe</b>. Nghe được vế phải là biết sắp tới đáp án.' });
    P.groups.forEach(function (G) {
      var gi = gInfo[G.gi] || {};
      var isOpt = (OPT_TYPES[G.type] || G.type === 'multi') && G.opts.length;
      var how = gi.how || (MCQ_TYPES[G.type] ? 'Đọc tiêu đề, gạch keyword của từng câu; lướt A/B/C để thấy chúng khác nhau ở đâu.' : isOpt ? 'Câu hỏi đi theo thứ tự. Đọc kỹ TỪNG option vì sẽ có option thừa.' : 'Đề đi theo thứ tự câu 1, 2, 3… Đọc lướt từ trên xuống, dự đoán từng chỗ trống.');
      var keyOf = {}; (gi.options || []).forEach(function (op) { var L = (/^\s*([A-Z])\b/.exec(op.o || '') || [])[1]; if (L) keyOf[L] = op.key; });
      out.push({ kind: 'group', G: G, st: MCQ_TYPES[G.type] ? 'magnifier6_girl' : isOpt ? 'pose_puzzle_kumiawaseru' : 'pose_yubisashi_kakunin_businessman', title: range(G) + ' · ' + (TYPE_NAME[G.type] || G.type), html: esc(how), diff: G.type === 'multi' ? ((qInfo[G.qs[0].num] || {}).diff || '') : '', kws: G.type === 'multi' ? ((qInfo[G.qs[0].num] || {}).keywords || []) : [], opts: isOpt ? G.opts.map(function (o) { var L = (/^\s*([A-Z])[.)\s]/.exec(o) || [])[1]; return { o: o, key: L ? keyOf[L] || '' : '' }; }) : null, groupInfo: gi });
      G.qs.forEach(function (x) {
        var info = qInfo[x.num] || {};
        if (G.type !== 'multi') out.push({ kind: 'predict', G: G, x: x, info: info, st: 'kangaeruhito_1840', title: 'Câu ' + x.num + ': dự đoán trước khi nghe' });
        out.push({ kind: 'answer', G: G, x: x, info: info, st: 'denkyuu_on', title: 'Câu ' + x.num + ': đáp án & vị trí trong transcript' });
      });
    });
    out.push({ kind: 'end', st: 'pose_doyagao_woman_0170', title: 'Xong Section ' + P.s + '!', html: 'Cho học sinh nghe lại cả Section một lần, chỉ tập trung vào các <b>từ tín hiệu</b> đã gạch.' });
    return out;
  }

  /* ---------- Giao diện ---------- */
  var S = null; // {an, s, i}
  var CSS = '' +
    '#ls-btn,#ls-btn-h{background:#fff7d6;color:#7a5200;border:0;border-radius:999px;padding:7px 14px;font-weight:700;cursor:pointer;margin-right:6px}' +
    '.ls-loc{border-radius:4px;padding:1px 2px;background:color-mix(in srgb,var(--lsc) 22%,transparent);box-shadow:inset 0 -2px 0 var(--lsc)}' +
    '.ls-badge{display:inline-block;min-width:20px;padding:0 6px;margin-right:4px;border-radius:10px;background:var(--lsc);color:#fff;font:700 11px/18px system-ui;text-align:center}' +
    'mark.ls-syn{background:#fde68a;color:inherit;border-radius:3px;padding:0 2px}' +
    '.ls-qhit{outline:2.5px solid var(--lsc)!important;outline-offset:3px;border-radius:10px}' +
    '.ls-qdone{opacity:.5}' +
    'body.ls-on{padding-bottom:50vh}' +
    '#ls-card{position:fixed;left:50%;transform:translateX(-50%);bottom:14px;z-index:9999;width:min(1020px,calc(100vw - 24px));max-height:48vh;overflow:auto;background:#fff8db;color:#1f2340;border:1.5px solid #fcd34d;border-radius:20px;box-shadow:0 14px 40px rgba(60,40,140,.22);font:14px/1.5 "Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif;border-top:5px solid var(--lsc,#7c6cf0)}' +
    '#ls-card .rh{display:flex;align-items:center;gap:6px;padding:10px 12px 0;flex-wrap:wrap}' +
    '#ls-card .lb{font-size:12px;font-weight:700;color:#8a86a8;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#ls-card .pt{border:0;background:#f1effb;color:#5b51c9;font:700 12px system-ui;border-radius:999px;padding:3px 9px;cursor:pointer}' +
    '#ls-card .pt.on{background:#6d5dfc;color:#fff}' +
    '#ls-card .ic{border:0;background:transparent;color:#8a86a8;font:600 12px system-ui;cursor:pointer;padding:3px 7px;border-radius:8px}' +
    '#ls-card .ic:hover{background:#f3f2fa}' +
    '#ls-card .steps{display:flex;gap:5px;padding:8px 14px 2px;overflow-x:auto;scrollbar-width:thin}' +
    '#ls-card .steps b{flex:none;font:600 12px/1 system-ui;padding:6px 9px;border-radius:10px;border:1.5px solid #f1e3a6;color:#a08a4a;background:#fffdf3;cursor:pointer;white-space:nowrap}' +
    '#ls-card .steps b.d{border-color:#d9d3fd;background:#f5f3ff;color:#6d5dfc}' +
    '#ls-card .steps b.on{border-color:var(--lsc,#6d5dfc);background:var(--lsc,#6d5dfc);color:#fff;font-weight:800}' +
    '#ls-card .rb{display:flex;gap:12px;padding:10px 14px 2px;align-items:flex-start;font-size:15px}' +
    '#ls-card .rb>img{width:60px;height:60px;object-fit:contain;flex:none}' +
    '#ls-card .tt{font-weight:800;font-size:17px;line-height:1.3;margin-bottom:3px}' +
    '#ls-card .tx{color:#4a4e6a}' +
    '#ls-card .bx{margin:8px 14px 0;padding:9px 12px;border-radius:12px;background:#fff;color:#3d4060;font-size:14px}' +
    '#ls-card .bx h5{margin:0 0 4px;font:800 11.5px system-ui;text-transform:uppercase;letter-spacing:.04em;color:#8a86a8}' +
    '#ls-card .ctx{font-size:15.5px;color:#1f2340}#ls-card .ctx .gap{background:var(--lsc);color:#fff;border-radius:6px;padding:0 6px;font-weight:800}' +
    '#ls-card .chip{display:inline-block;margin:3px 4px 0 0;padding:3px 10px;border-radius:999px;background:#eef2ff;color:#3730a3;font-weight:700;font-size:13.5px}' +
    '#ls-card .chip.sig{background:#fef3c7;color:#92400e}#ls-card .chip.kw{background:#fce7f3;color:#9d174d}' +
    '#ls-card .ans{margin:8px 14px 0;padding:9px 12px;border-radius:12px;background:#ecfdf3;color:#14532d}' +
    '#ls-card .ans .a{font-weight:800;font-size:16px}' +
    '#ls-card .pair{display:flex;gap:6px;align-items:center;font-size:14px;margin-top:3px}#ls-card .pair i{font-style:normal;color:#a3a0bd}' +
    '#ls-card .opt{display:flex;gap:8px;padding:5px 0;border-bottom:1px dashed #eee}#ls-card .opt b{min-width:22px;color:#5b51c9}' +
    '#ls-card .opt.x{opacity:.45;text-decoration:line-through}' +
    '#ls-card .warn{margin:8px 14px 0;padding:8px 11px;border-radius:12px;background:#fff1f2;color:#9f1239;font-size:13.5px}' +
    '#ls-card .vg{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;padding:10px 14px 0}' +
    '#ls-card .vc{background:#fff;border-radius:14px;padding:10px;display:flex;gap:10px;align-items:center;box-shadow:0 1px 3px rgba(0,0,0,.06)}' +
    '#ls-card .vc img{width:64px;height:64px;object-fit:contain;flex:none;cursor:pointer;border-radius:8px;background:#fafafa}' +
    '#ls-card .vc .w{font-weight:800;font-size:15px;color:#1f2340;cursor:pointer}#ls-card .vc .q{font-size:12.5px;color:#8a86a8}' +
    '#ls-card .vc .p{font-size:12.5px;color:#6d5dfc}#ls-card .vc .m{font-size:13px;color:#3d4060}' +
    '#ls-card .vc .sp{border:0;background:#f1effb;border-radius:8px;cursor:pointer;padding:2px 6px;font-size:13px;margin-left:4px}' +
    '#ls-card .show{margin:8px 14px 0;width:calc(100% - 28px);border:1.5px dashed #9ee2b8;background:#f6fef9;color:#15803d;font-weight:700;border-radius:12px;padding:8px;cursor:pointer}' +
    '#ls-card .rf{display:flex;gap:8px;padding:8px 14px 10px;position:sticky;bottom:0;background:#fff8db;align-items:center}' +
    '#ls-card .rf .k{font-size:11.5px;color:#a3a0bd;flex:1}' +
    '#ls-card .bk{border:0;background:#f1effb;color:#5b51c9;font-weight:700;border-radius:12px;padding:9px 14px;cursor:pointer}' +
    '#ls-card .nx{border:0;background:#6d5dfc;color:#fff;font-weight:800;border-radius:12px;padding:9px 20px;cursor:pointer}' +
    '#ls-card .load{padding:22px 16px;text-align:center;color:#5b51c9;font-weight:700}' +
    '#ls-card textarea{width:calc(100% - 28px);margin:8px 14px 0;height:34vh;font:12px/1.4 ui-monospace,monospace;border:1px solid #ddd;border-radius:10px;padding:8px}' +
    '#ls-card.mini .rb,#ls-card.mini .bx,#ls-card.mini .ans,#ls-card.mini .vg,#ls-card.mini .warn,#ls-card.mini .show{display:none}' +
    '@media (max-width:760px){#ls-card{left:8px;right:8px;bottom:8px;width:auto;transform:none;max-height:62vh}#ls-card .rb>img{width:48px;height:48px}#ls-card .rf .k{display:none}#ls-card .vg{grid-template-columns:1fr}}';

  function qBox(num) {
    var el = document.getElementById('q-container-' + num); if (el) return el;
    var inp = document.querySelector('[name="q' + num + '"]');
    return inp ? (inp.closest('.question-item,.question-group,tr,li,p') || inp) : null;
  }
  function clearMarks() {
    $$('.ls-badge').forEach(function (b) { b.remove(); });
    $$('mark.ls-syn').forEach(function (m) { m.replaceWith(document.createTextNode(m.textContent)); });
    $$('.ls-loc').forEach(function (e) { e.classList.remove('ls-loc'); e.style.removeProperty('--lsc'); });
    $$('.ls-qhit,.ls-qdone').forEach(function (e) { e.classList.remove('ls-qhit', 'ls-qdone'); e.style.removeProperty('--lsc'); });
    $$('[id^="passage-"][id$="-text"]').forEach(function (w) { w.normalize(); });
  }
  function markWords(root, words) {
    words = (words || []).map(function (w) { return String(w || '').trim(); }).filter(function (w) { return w.length > 2; });
    if (!root || !words.length) return;
    var re = new RegExp('(' + words.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).sort(function (a, b) { return b.length - a.length; }).join('|') + ')', 'ig');
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (t) {
      if (!re.test(t.nodeValue)) return; re.lastIndex = 0;
      var f = document.createDocumentFragment(), last = 0, s = t.nodeValue, m;
      while ((m = re.exec(s))) { f.appendChild(document.createTextNode(s.slice(last, m.index))); var mk = document.createElement('mark'); mk.className = 'ls-syn'; mk.textContent = m[0]; f.appendChild(mk); last = m.index + m[0].length; }
      f.appendChild(document.createTextNode(s.slice(last))); t.parentNode.replaceChild(f, t);
    });
  }
  function openTranscript(s) {
    var p = document.getElementById('transcript-panel-S' + s);
    if (p && getComputedStyle(p).display === 'none') p.style.display = 'block';
    return p;
  }
  function scrollIn(el, block) { try { el && el.scrollIntoView({ block: block || 'center', behavior: 'smooth' }); } catch (e) {} }
  function ansText(x) { var a = x.q.answer; return Array.isArray(a) ? a.join(' / ') : String(a == null ? '' : a).split('|').join(' / '); }
  function answersOf(x) { var a = x.q.answer; return (Array.isArray(a) ? a : String(a == null ? '' : a).split('|')).map(function (t) { return String(t).toLowerCase().trim(); }).filter(Boolean); }
  function shuffled(arr, seed) {
    var a = (arr || []).filter(Boolean).slice(), r = seed * 9301 + 49297;
    for (var i = a.length - 1; i > 0; i--) { r = (r * 9301 + 49297) % 233280; var j = Math.floor(r / 233280 * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  var STOP = /^(the|a|an|of|to|in|on|at|for|and|or|is|are|be|by|with|your|you|it|its|per|from|which|who|that|this|must|will|can|has|have|was|were|not|less|more|about|each|usually|best)$/i;
  function signalsOf(x, inf) {
    var ans = answersOf(x), paper = ((x.prev || '') + ' ' + (x.ctx || '') + ' ' + plain(x.q.text) + ' ' + (x.q.options || []).map(plain).join(' ')).toLowerCase();
    var ok = (inf.signals || []).filter(function (w) {
      var lw = String(w || '').toLowerCase().trim(); if (!lw) return false;
      if (ans.some(function (a) { return a && (lw.indexOf(a) >= 0 || a.indexOf(lw) >= 0); })) return false;
      return paper.indexOf(lw) >= 0;
    });
    if (ok.length) return ok;
    var src = ((x.prev || '') + ' ' + (x.ctx || '').replace(/\[\d+ ____ \]/, ' ')).replace(/[…:›,;()?.!"“”]/g, ' ');
    var out = [];
    src.split(/\s+/).forEach(function (w) { if (w && !STOP.test(w) && (w.length > 3 || /\d/.test(w)) && ans.indexOf(w.toLowerCase()) < 0 && out.indexOf(w) < 0) out.push(w); });
    return out.slice(-4);
  }
  function chips(arr, cls) { return (arr || []).filter(Boolean).map(function (w) { return '<span class="chip ' + (cls || '') + '">' + esc(w) + '</span>'; }).join(''); }
  function ctxHtml(x) { return esc(x.ctx || ('Câu ' + x.num)).replace(/\[(\d+) ____ \]/, '<span class="gap">$1 ______</span>'); }

  function render() {
    if (!S) return;
    var P = S.an[S.s - 1], card = $('#ls-card');
    var tabs = S.an.map(function (x) { return '<button class="pt' + (x.s === S.s ? ' on' : '') + '" data-s="' + x.s + '">S' + x.s + '</button>'; }).join('');
    var head = '<div class="rh">' + tabs + '<span class="lb">Giải đề Listening · Section ' + S.s + '</span>' +
      (P.ai ? '<button class="ic" data-k="edit" title="Sửa nội dung AI soạn">Sửa</button><button class="ic" data-k="regen" title="Cho AI soạn lại Section này">Soạn lại</button>' : '') +
      '<button class="ic" data-k="mini">' + (S.mini ? '▴' : '▾') + '</button><button class="ic" data-k="close">✕</button></div>';
    if (P.loading) { card.innerHTML = head + '<div class="load">' + esc(P.loading) + '</div>'; return; }
    if (P.err) { card.innerHTML = head + '<div class="warn">' + esc(P.err) + '</div><div class="rf"><span class="k"></span><button class="nx" data-k="regen">Thử lại</button></div>'; return; }
    if (S.editing) {
      card.innerHTML = head + '<textarea spellcheck="false">' + esc(JSON.stringify(P.ai, null, 1)) + '</textarea><div class="rf"><span class="k">Sửa trực tiếp nội dung (JSON) rồi lưu</span><button class="bk" data-k="edit-cancel">Huỷ</button><button class="nx" data-k="edit-save">Lưu</button></div>';
      return;
    }
    clearMarks();
    var L = P.script, o = L[S.i];
    card.style.setProperty('--lsc', o.G ? o.G.color : '#7c6cf0');
    for (var j = 0; j < S.i; j++) if (L[j].kind === 'answer' && (!o.x || L[j].x.num !== o.x.num)) { var e = qBox(L[j].x.num); if (e) e.classList.add('ls-qdone'); }
    var chipsHtml = L.map(function (z, k) {
      var lab = z.kind === 'intro' ? 'Bắt đầu' : z.kind === 'vocab' ? 'Từ vựng' : z.kind === 'group' ? range(z.G).replace('Câu ', 'C') : z.kind === 'predict' ? 'C' + z.x.num + ' dự đoán' : z.kind === 'answer' ? 'C' + z.x.num + ' đáp án' : 'Xong';
      return '<b data-i="' + k + '" class="' + (k === S.i ? 'on' : k < S.i ? 'd' : '') + '">' + lab + '</b>';
    }).join('');
    var h = head + '<div class="steps">' + chipsHtml + '</div>' +
      '<div class="rb"><img src="' + IRA + (o.st || 'book_2458') + '.webp" alt="" onerror="this.style.visibility=\'hidden\'"><div><div class="tt">' + esc(o.title) + '</div><div class="tx">' + (o.html || '') + '</div></div></div>';
    var focus = null;

    if (o.kind === 'vocab') {
      h += '<div class="vg">' + (P.ai.vocab || []).map(function (v, i) {
        return '<div class="vc"><img data-v="' + i + '" src="' + esc(v.img || (IRA + 'book_2458.webp')) + '" title="Bấm để đổi ảnh" alt="">' +
          '<div><div class="q">Đề: ' + esc(v.q) + '</div><div class="w" data-say="' + esc(v.t) + '">' + esc(v.t) + '<button class="sp" data-say="' + esc(v.t) + '">🔊</button></div>' +
          '<div class="p">' + esc(v.ipa || '') + '</div><div class="m">' + esc(v.vi || '') + '</div></div></div>';
      }).join('') + '</div>';
    }
    if (o.kind === 'group') {
      o.G.qs.forEach(function (x) { var e = qBox(x.num); if (e) { e.classList.add('ls-qhit'); e.style.setProperty('--lsc', o.G.color); focus = focus || e; } });
      if (o.opts) {
        var spare = Math.max(0, o.opts.length - o.G.qs.length), isMcq = MCQ_TYPES[o.G.type];
        var hd = isMcq ? 'Câu hỏi: ' + esc(o.G.title.replace(/^Questions?[^A-Za-z]*[\d–\- and]+\s*/i, '')) + '<br>Đọc tổng quan ' + o.opts.length + ' đáp án — chọn ' + o.G.qs.length + ', thấy chúng khác nhau ở đâu'
          : 'Đọc từng option — ' + o.opts.length + ' option cho ' + o.G.qs.length + ' câu' + (spare ? ' → sẽ có ' + spare + ' option không dùng (chưa biết là cái nào)' : '');
        h += '<div class="bx"><h5 style="text-transform:none;font-size:13px">' + hd + '</h5>' +
          o.opts.map(function (op) {
            var letter = (/^\s*([A-Z])[.)\s]/.exec(op.o || '') || [])[1] || '';
            return '<div class="opt"><b>' + esc(letter || '•') + '</b><div>' + esc(String(op.o || '').replace(/^\s*[A-Z][.)]\s*/, '')) + (op.key ? '<div style="color:#8a86a8;font-size:13px">→ ' + esc(op.key) + '</div>' : '') + '</div></div>';
          }).join('') + '</div>';
        if (o.kws && o.kws.length) h += '<div class="bx"><h5>Keyword cần gạch</h5>' + chips(o.kws, 'kw') + '</div>';
        if (o.diff) h += '<div class="bx"><h5>Các đáp án khác nhau ở đâu?</h5>' + esc(o.diff) + '</div>';
      }
    }
    if (o.kind === 'predict' || o.kind === 'answer') {
      var x = o.x, inf = o.info || {}, e2 = qBox(x.num);
      if (e2) { e2.classList.add('ls-qhit'); e2.style.setProperty('--lsc', o.G.color); focus = e2; }
      var opts = (x.q.options || []).map(plain);
      h += '<div class="bx"><h5>' + (TYPE_NAME[o.G.type] || '') + '</h5>' + (x.prev ? '<div style="color:#8a86a8;font-size:14px">' + esc(x.prev) + '</div>' : '') + '<div class="ctx">' + ctxHtml(x) + '</div>' + (opts.length ? '<div style="margin-top:4px">' + opts.map(esc).join('<br>') + '</div>' : '') + '</div>';
      if (o.kind === 'predict') {
        var gs = shuffled(inf.guess, x.num);
        if (inf.pos) h += '<div class="bx"><h5>Loại từ cần điền</h5>' + esc(inf.pos) + (gs.length ? '<div style="margin-top:4px">Có thể là: ' + chips(gs) + '</div>' : '') + '</div>';
        else if (gs.length && !MCQ_TYPES[o.G.type]) h += '<div class="bx"><h5>Dự đoán</h5>' + chips(gs) + '</div>';
        if (inf.keywords && inf.keywords.length) h += '<div class="bx"><h5>Keyword cần gạch</h5>' + chips(inf.keywords, 'kw') + '</div>';
        if (inf.diff) h += '<div class="bx"><h5>A / B / C khác nhau ở đâu?</h5>' + esc(inf.diff) + '</div>';
        var sg = signalsOf(x, inf);
        if (sg.length) h += '<div class="bx"><h5>Từ tín hiệu trong đề — nghe thấy những từ này là sắp tới chỗ trống</h5>' + chips(sg, 'sig') + '</div>';
      } else {
        h += '<div class="ans"><div class="a">Đáp án: ' + esc(ansText(x)) + '</div>' + (inf.why || x.q.exp ? '<div style="font-size:13.5px;margin-top:3px">' + esc(inf.why || plain(x.q.exp)) + '</div>' : '') +
          ((inf.pairs || []).length ? '<div style="margin-top:6px">' + inf.pairs.map(function (p) { return '<div class="pair"><b>' + esc(p[0]) + '</b><i>↔</i><span>' + esc(p[1]) + '</span></div>'; }).join('') + '</div>' : '') + '</div>';
        var tp = openTranscript(S.s), loc = document.getElementById('loc-' + x.num);
        if (loc) {
          loc.classList.add('ls-loc'); loc.style.setProperty('--lsc', o.G.color);
          var b = document.createElement('span'); b.className = 'ls-badge'; b.textContent = x.num; b.style.setProperty('--lsc', o.G.color); loc.insertBefore(b, loc.firstChild);
          var para = loc.closest('p') || loc.parentNode;
          markWords(para, (inf.pairs || []).map(function (p) { return p[1]; }).concat(signalsOf(x, inf)));
          focus = loc;
        } else if (tp) focus = tp;
      }
    }
    if (o.kind === 'end') { var tp2 = openTranscript(S.s); markWords(document.getElementById('passage-' + S.s + '-text'), [].concat.apply([], P.groups.reduce(function (a, G) { return a.concat(G.qs); }, []).map(function (x) { return signalsOf(x, (P.ai.questions || []).filter(function (q) { return q.n === x.num; })[0] || {}); }))); focus = tp2; }
    var nextLabel = o.kind === 'end' ? (S.s < S.an.length ? 'Sang Section ' + (S.s + 1) + ' ›' : 'Xong') : 'Tiếp ›';
    h += '<div class="rf"><span class="k">← → chuyển bước · M thu gọn · Esc tắt</span><button class="bk" data-k="prev">‹</button><button class="nx" data-k="next">' + nextLabel + '</button></div>';
    card.innerHTML = h; card.classList.toggle('mini', !!S.mini);
    var on = card.querySelector('.steps .on'); if (on) try { on.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) {}
    if (focus) scrollIn(focus, o.kind === 'answer' ? 'center' : 'start');
  }

  function prepare(s, force) {
    var P = S.an[s - 1];
    if (P.ai && !force) { P.script = P.script || script(P); return render(); }
    P.err = ''; P.loading = force ? 'AI đang soạn lại Section ' + s + '…' : 'Đang tải phần giải đề Section ' + s + '…'; render();
    (force ? Promise.resolve(null) : loadSaved(s)).then(function (saved) {
      if (saved) return saved;
      P.loading = 'AI đang soạn Section ' + s + ' (lần đầu, khoảng 20–40 giây). Lần sau mở ra có ngay.'; render();
      return callGroq(P).then(function (ai) { return saveDoc(s, ai).then(function () { return ai; }, function () { return ai; }); });
    }).then(function (ai) {
      P.ai = ai; P.loading = ''; P.script = script(P);
      if (S && S.s === s) { S.i = 0; render(); }
      fillImages(P);
    }).catch(function (e) { P.loading = ''; P.err = (e && e.message) || String(e); render(); });
  }
  function goSection(s) {
    if (!S) return;
    S.s = s; S.i = 0; S.showX = false; S.editing = false;
    try { window.switchSection && window.switchSection(s); } catch (e) {}
    prepare(s);
  }
  function next() {
    var P = S.an[S.s - 1]; if (!P.script) return;
    var o = P.script[S.i];
    S.showX = false;
    if (S.i + 1 < P.script.length) { S.i++; return render(); }
    if (S.s < S.an.length) goSection(S.s + 1);
  }
  function prev() { var P = S.an[S.s - 1]; if (P.script && S.i > 0) { S.i--; S.showX = false; render(); } }
  function onCard(e) {
    var t = e.target;
    var say = t.closest('[data-say]'); if (say) { speak(say.dataset.say); if (t.classList.contains('w') && window.NightVocabTeach) window.NightVocabTeach.open(say.dataset.say); return; }
    var im = t.closest('img[data-v]');
    if (im) { var P0 = S.an[S.s - 1], v = P0.ai.vocab[+im.dataset.v]; if (v && v.imgs && v.imgs.length > 1) { var k = (v.imgs.indexOf(v.img) + 1) % v.imgs.length; v.img = v.imgs[k]; im.src = v.img; clearTimeout(S.saveT); S.saveT = setTimeout(function () { saveDoc(P0.s, P0.ai).catch(function () {}); }, 1500); } return; }
    var b = t.closest('button,b[data-i]'); if (!b) return;
    if (b.dataset.i != null) { S.i = +b.dataset.i; S.showX = false; return render(); }
    if (b.dataset.s) return goSection(+b.dataset.s);
    var k2 = b.dataset.k, P = S.an[S.s - 1];
    if (k2 === 'next') next(); else if (k2 === 'prev') prev();
    else if (k2 === 'showx') { S.showX = true; render(); }
    else if (k2 === 'mini') { S.mini = !S.mini; render(); }
    else if (k2 === 'close') close();
    else if (k2 === 'regen') { if (!P.ai || confirm('Cho AI soạn lại toàn bộ Section ' + S.s + '? Bản đang lưu sẽ bị thay.')) { P.ai = null; P.script = null; S.i = 0; prepare(S.s, true); } }
    else if (k2 === 'edit') { S.editing = true; render(); }
    else if (k2 === 'edit-cancel') { S.editing = false; render(); }
    else if (k2 === 'edit-save') {
      try { var obj = JSON.parse($('#ls-card textarea').value); P.ai = obj; P.script = script(P); S.editing = false; S.i = Math.min(S.i, P.script.length - 1); render(); saveDoc(S.s, obj).catch(function (er) { alert('Lỗi lưu: ' + (er && er.message || er)); }); }
      catch (er) { alert('JSON chưa đúng: ' + er.message); }
    }
  }
  function onKey(e) {
    if (!S || S.editing) return;
    var t = e.target; if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    else if (e.key === 'm' || e.key === 'M') { S.mini = !S.mini; render(); }
    else if (e.key === 'Escape') close();
  }
  function curSection() { try { if (typeof currentSection !== 'undefined') return currentSection; } catch (e) {} return 1; }
  function css() { if (!$('#ls-css')) { var st = document.createElement('style'); st.id = 'ls-css'; st.textContent = CSS; document.head.appendChild(st); } }
  function open() {
    var setup = $('#setup-screen');
    if (setup && getComputedStyle(setup).display !== 'none') {
      try { window.selectMode && window.selectMode('practice'); window.startTest && window.startTest(); } catch (e) {}
      return setTimeout(open, 150);
    }
    var an = analyse(); if (!an || !an.length) return;
    css();
    S = { an: an, s: curSection(), i: 0 };
    var card = $('#ls-card'); if (!card) { card = document.createElement('div'); card.id = 'ls-card'; document.body.appendChild(card); card.addEventListener('click', onCard); }
    card.style.display = '';
    document.body.classList.add('ls-on');
    goSection(S.s);
  }
  function close() {
    clearMarks(); S = null;
    document.body.classList.remove('ls-on');
    var c = $('#ls-card'); if (c) c.style.display = 'none';
  }
  document.addEventListener('keydown', onKey);


  /* ================= SỬA ĐỀ (admin): in đậm tiêu đề, nghiêng, gạch chân… ngay trên đề =================
     Lưu publicSettings/listenEdit__<đề> = { blocks: { "s-gi-ins|note": html } }; mọi người mở đề đều thấy. */
  var EDITS = null, EDIT_DOC = 'listenEdit__' + TEST_ID;
  var editsP = fetch('https://firestore.googleapis.com/v1/projects/' + FB_CONFIG.projectId + '/databases/(default)/documents/publicSettings/' + EDIT_DOC + '?key=' + FB_CONFIG.apiKey, { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { try { EDITS = d && d.fields && d.fields.json ? JSON.parse(d.fields.json.stringValue) : null; } catch (e) { EDITS = null; } })
    .catch(function () {});
  function editBlocks() {
    var out = [];
    for (var s = 1; s <= 4; s++) {
      var box = document.getElementById('questions-p' + s); if (!box) continue;
      $$(':scope > .question-group', box).forEach(function (g, gi) {
        var ins = $('p.instruction', g); if (ins) out.push({ k: s + '-' + gi + '-ins', el: ins });
        $$('.notes-template', g).forEach(function (n, ni) { out.push({ k: s + '-' + gi + '-note' + ni, el: n }); });
      });
    }
    return out;
  }
  function cleanHtml(el) {
    var c = el.cloneNode(true);
    $$('.inline-check-btn,.ls-badge', c).forEach(function (b) { b.remove(); });
    $$('[contenteditable]', c).forEach(function (x) { x.removeAttribute('contenteditable'); });
    $$('input', c).forEach(function (i) { i.removeAttribute('value'); i.value = ''; i.className = 'text-input inline-blank'; i.removeAttribute('disabled'); i.removeAttribute('style'); });
    $$('.ls-qhit,.ls-qdone', c).forEach(function (x) { x.classList.remove('ls-qhit', 'ls-qdone'); x.style.removeProperty('--lsc'); });
    return c.innerHTML;
  }
  function applyEdits() {
    if (!EDITS || !EDITS.blocks) return;
    var changed = false;
    editBlocks().forEach(function (b) { var h = EDITS.blocks[b.k]; if (h != null) { b.el.innerHTML = h; changed = true; } });
    if (changed) { try { window.addInlineCheckButtons && window.addInlineCheckButtons(); } catch (e) {} }
  }
  (function wrapGen() {
    var o = window.generateQuestionsHTML; if (typeof o !== 'function' || o.__ls) return;
    var w = function () { var r = o.apply(this, arguments); try { applyEdits(); } catch (e) {} return r; };
    w.__ls = 1; window.generateQuestionsHTML = w;
    var st = window.startTest;
    if (typeof st === 'function' && !st.__ls) {
      var w2 = function () { var self = this, args = arguments, done = false; var go = function () { if (done) return; done = true; st.apply(self, args); }; editsP.then(go); setTimeout(go, 2500); };
      w2.__ls = 1; window.startTest = w2;
    }
  })();
  editsP.then(function () { var setup = $('#setup-screen'); if (EDITS && setup && getComputedStyle(setup).display === 'none') applyEdits(); });

  var ED = null;
  var ED_CSS = '#ls-edbar{position:fixed;left:50%;transform:translateX(-50%);bottom:14px;z-index:10000;display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:#24242A;color:#fff;border-radius:18px;padding:8px 10px;box-shadow:0 14px 40px rgba(0,0,0,.3);font:600 13px system-ui;max-width:calc(100vw - 20px)}' +
    '#ls-edbar button{border:0;border-radius:10px;padding:7px 11px;background:rgba(255,255,255,.12);color:#fff;font:700 13px system-ui;cursor:pointer}#ls-edbar button:hover{background:rgba(255,255,255,.22)}' +
    '#ls-edbar button.pr{background:#6C70DC}#ls-edbar button.dg{background:#be123c}#ls-edbar .msg{color:#a7f3d0;margin:0 4px}' +
    'body.ls-editing [data-ls-ed]{outline:2px dashed #a5b4fc;outline-offset:4px;border-radius:6px;cursor:text}body.ls-editing [data-ls-ed]:focus{outline-color:#6C70DC;background:#fafaff}' +
    'body.ls-editing .inline-blank-wrap{pointer-events:none;opacity:.7}';
  function edOpen() {
    var setup = $('#setup-screen');
    if (setup && getComputedStyle(setup).display !== 'none') { try { window.selectMode && window.selectMode('practice'); window.startTest && window.startTest(); } catch (e) {} return setTimeout(edOpen, 300); }
    if (ED) return;
    close();
    if (!$('#ls-ed-css')) { var st = document.createElement('style'); st.id = 'ls-ed-css'; st.textContent = ED_CSS; document.head.appendChild(st); }
    ED = { blocks: editBlocks() };
    ED.blocks.forEach(function (b) { b.el.setAttribute('contenteditable', 'true'); b.el.setAttribute('data-ls-ed', '1'); $$('.inline-blank-wrap,.inline-check-btn', b.el).forEach(function (x) { x.setAttribute('contenteditable', 'false'); }); });
    document.body.classList.add('ls-editing');
    var bar = document.createElement('div'); bar.id = 'ls-edbar';
    bar.innerHTML = '<span style="opacity:.7">Sửa đề — bôi đen chữ rồi bấm:</span>' +
      '<button data-c="bold"><b>B</b> Đậm</button><button data-c="italic"><i>I</i> Nghiêng</button><button data-c="underline"><u>U</u> Gạch chân</button>' +
      '<button data-c="big">Tiêu đề to</button><button data-c="removeFormat">Xoá định dạng</button>' +
      '<span class="msg"></span>' + (EDITS ? '<button class="dg" data-c="reset">Về bản gốc</button>' : '') + '<button data-c="cancel">Huỷ</button><button class="pr" data-c="save">Lưu</button>';
    document.body.appendChild(bar);
    bar.addEventListener('mousedown', function (e) { if (e.target.closest('button')) e.preventDefault(); });
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var c = b.dataset.c;
      if (c === 'bold' || c === 'italic' || c === 'underline' || c === 'removeFormat') { document.execCommand(c); return; }
      if (c === 'big') {
        var sel = getSelection(); if (!sel.rangeCount || sel.isCollapsed) return;
        var r = sel.getRangeAt(0), span = document.createElement('b'); span.style.fontSize = '1.15em'; span.style.color = '#24242A';
        try { r.surroundContents(span); } catch (er) { span.appendChild(r.extractContents()); r.insertNode(span); }
        return;
      }
      if (c === 'cancel') return edClose(true);
      if (c === 'save' || c === 'reset') return edSave(c === 'reset');
    });
  }
  function edClose(reload) {
    var bar = $('#ls-edbar'); if (bar) bar.remove();
    document.body.classList.remove('ls-editing');
    if (ED) ED.blocks.forEach(function (b) { b.el.removeAttribute('contenteditable'); b.el.removeAttribute('data-ls-ed'); $$('[contenteditable]', b.el).forEach(function (x) { x.removeAttribute('contenteditable'); }); });
    ED = null;
    if (reload) location.reload();
  }
  function edSave(reset) {
    if (reset && !confirm('Xoá mọi chỉnh sửa của đề này, quay về bản gốc?')) return;
    var msg = $('#ls-edbar .msg'); msg.textContent = 'Đang lưu…';
    var blocks = {};
    if (!reset) ED.blocks.forEach(function (b) { blocks[b.k] = cleanHtml(b.el); });
    (FBX || Promise.reject(new Error('Chưa đăng nhập tài khoản thầy'))).then(function (x) {
      var ref = x.fs.doc(x.db, 'publicSettings', EDIT_DOC);
      return reset ? x.fs.deleteDoc(ref) : x.fs.setDoc(ref, { json: JSON.stringify({ blocks: blocks }), path: location.pathname, updatedAt: Date.now(), by: x.uid || '' });
    }).then(function () { msg.textContent = 'Đã lưu! Đang tải lại…'; setTimeout(function () { location.reload(); }, 600); })
      .catch(function (e) { msg.style.color = '#fecaca'; msg.textContent = 'Lỗi lưu: ' + (e && e.message || e); });
  }

  /* ---------- Nút chỉ cho admin ---------- */
  function addBtn() {
    if ($('#ls-btn-h') || !data()) return;
    css();
    var host = $('.header-right');
    if (host && !$('#ls-edit-h')) { var be = document.createElement('button'); be.id = 'ls-edit-h'; be.type = 'button'; be.textContent = 'Sửa đề'; be.title = 'In đậm tiêu đề, nghiêng, gạch chân… lưu cho mọi người'; be.style.cssText = 'background:#f1effb;color:#4b40b8;border:0;border-radius:999px;padding:7px 14px;font-weight:700;cursor:pointer;margin-right:6px'; be.onclick = edOpen; host.insertBefore(be, host.firstChild); }
    if (host) { var b = document.createElement('button'); b.id = 'ls-btn-h'; b.type = 'button'; b.textContent = 'Giải đề'; b.title = 'Giải đề cùng thầy (chỉ thầy thấy)'; b.onclick = function () { S ? close() : open(); }; host.insertBefore(b, host.firstChild); }
    var box = $('#setup-screen .modal-box') || $('#setup-screen > div');
    if (box && !$('#ls-btn')) {
      var b2 = document.createElement('button'); b2.id = 'ls-btn'; b2.type = 'button'; b2.textContent = 'Giải đề cùng thầy';
      b2.style.cssText = 'display:block;margin:12px auto 0;background:#1f2937;color:#fde68a;border:0;border-radius:10px;padding:10px 18px;font-weight:700;cursor:pointer';
      b2.onclick = open; box.appendChild(b2);
      var b3 = document.createElement('button'); b3.type = 'button'; b3.id = 'ls-edit2'; b3.textContent = 'Sửa đề'; b3.style.cssText = 'display:block;margin:8px auto 0;background:#f1effb;color:#4b40b8;border:0;border-radius:10px;padding:8px 16px;font-weight:700;cursor:pointer'; b3.onclick = edOpen; box.appendChild(b3);
    }
  }
  function removeBtn() { ['#ls-btn', '#ls-btn-h', '#ls-edit-h', '#ls-edit2'].forEach(function (k) { var b = $(k); if (b) b.remove(); }); close(); }
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
            if (ok) FBX = Promise.resolve({ fs: m[2], db: m[2].getFirestore(app), uid: u.uid });
            ok ? addBtn() : removeBtn();
          }).catch(function () {});
        });
      })();
    }).catch(function () {});
  }

  window.ListeningSolver = { open: open, close: close, edit: edOpen, analyse: analyse, _enable: addBtn, _prompt: function (s) { var a = analyse(); return a && buildPrompt(a[(s || 1) - 1]); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', checkAdmin); else checkAdmin();
})();
