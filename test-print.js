/* Night IELTS — "In đề" cho giáo viên (chỉ tài khoản admin thấy nút) trên trang đề Reading / Listening.
   3 cấp: (1) in passage / section đang mở, (2) in cả đề, (3) in Passage N của NHIỀU đề (vd. chỉ ôn Passage 1).
   Dữ liệu lấy từ chính file đề (questionsData + bài đọc gốc) + bản thầy đã sửa (Firestore readingEdits) nếu có.
   Không gọi AI. */
(function () {
  if (window.NightPrint) return;
  var FB = { apiKey: 'AIzaSyCmeN49M4oI78ZPWDhMlbisDOLaMJp2mb8', authDomain: 'night-ielts-land.firebaseapp.com', projectId: 'night-ielts-land', storageBucket: 'night-ielts-land.firebasestorage.app', messagingSenderId: '408519436407', appId: '1:408519436407:web:a9f0b9ba23368b54427e72' };
  var V = '10.8.1', CK = 'nrs_admin_uid';
  var KIND = /\/listening\//.test(location.pathname) ? 'listening' : 'reading';
  var ROOT = new URL('../../', location.href).href;
  var IRA = ROOT + 'khoahoc/img/ira/';
  var ST = {
    cover: KIND === 'reading' ? 'book_inu_yomu_0009' : 'music_ongaku_kansyou_2460',
    part: KIND === 'reading' ? 'study_night_boy_0934' : 'music_earphone_canal_2571',
    vocab: 'magnifier6_girl', notes: 'bunbougu_note_7561', key: 'denkyuu_on', end: 'trophy_school_boy', puzzle: 'pose_puzzle_kumiawaseru'
  };
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function safeHtml(h) { // cho phép <br>, <b>, <i>, <em>, <strong>; còn lại thoát
    return esc(h).replace(/&lt;(\/?)(br|b|i|em|strong|u)\s*\/?&gt;/gi, '<$1$2>');
  }

  /* ---------- Đọc 1 file đề ---------- */
  function parseTest(html, path) {
    var m = html.match(/const questionsData = (\[[\s\S]*?\]);\s*\n/);
    if (!m) throw new Error('Không đọc được câu hỏi trong ' + path);
    var qd = JSON.parse(m[1]);
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var title = setLabel(setOf(path)) + ' · Test ' + testNo(path);
    var passages = [];
    for (var p = 1; p <= qd.length; p++) {
      var w = doc.getElementById('passage-' + p + '-text');
      passages.push(w ? { html: w.innerHTML, title: w.getAttribute('data-title') || '' } : null);
    }
    return { path: path, title: title, qd: qd, passages: passages };
  }
  function applyEdits(t) {
    if (KIND !== 'reading') return Promise.resolve(t);
    var id = ('/' + t.path).replace(/^\/+|\.html$/g, '').replace(/[^a-z0-9]+/gi, '__');
    return fetch('https://firestore.googleapis.com/v1/projects/' + FB.projectId + '/databases/(default)/documents/readingEdits/' + id + '?key=' + FB.apiKey, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.fields) t.passages.forEach(function (ps, i) { var f = d.fields['p' + (i + 1)]; if (ps && f && f.stringValue) ps.html = f.stringValue; });
        if (d && d.fields && d.fields.qd && d.fields.qd.stringValue) {
          try {
            var nq = JSON.parse(d.fields.qd.stringValue);
            nq.forEach(function (gs, pi) { (gs || []).forEach(function (g, gi) { if (g.imageUrl === '@orig') g.imageUrl = (t.qd[pi] && t.qd[pi][gi] && t.qd[pi][gi].imageUrl) || ''; }); });
            if (Array.isArray(nq) && nq.length) t.qd = nq;
          } catch (e) {}
        }
        return t;
      }).catch(function () { return t; });
  }
  var CACHE = {};
  function loadTest(path) {
    if (CACHE[path]) return CACHE[path];
    CACHE[path] = fetch(ROOT + path, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('Không tải được ' + path); return r.text(); })
      .then(function (h) { return applyEdits(parseTest(h, path)); });
    return CACHE[path];
  }
  function thisPath() { return location.pathname.replace(/^.*?\/(reading|listening)\//, '$1/').replace(/^\//, ''); }
  function listTests() {
    return fetch(ROOT + KIND + '/manifest.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (m) {
      var out = [];
      (function walk(o) {
        if (!o) return;
        if (typeof o === 'string') { if (/\.html$/.test(o)) out.push(o); return; }
        if (o.path && typeof o.path === 'string') { out.push(o.path); return; }
        if (typeof o === 'object') Object.keys(o).forEach(function (k) { walk(o[k]); });
      })(m);
      var seen = {};
      return out.filter(function (p) { if (seen[p]) return false; seen[p] = 1; return true; });
    });
  }
  function setOf(path) { var m = path.match(/\/(cam|real)(\d+)\//); return m ? m[1] + m[2] : 'khac'; }
  function setLabel(set) { var m = set.match(/^(cam|real)(\d+)$/); return m ? (m[1] === 'cam' ? 'Orange inspired ' : 'Real ') + m[2] : set; }
  function testNo(path) { var m = path.match(/test(\d+)\.html$/); return m ? +m[1] : 0; }

  /* ---------- Câu hỏi -> HTML in ---------- */
  var BL = /_{3,}/g;
  function blank(n) { return '<span class="bl"><i>' + n + '</i></span>'; }
  function fillBlanks(text, nums) { var i = 0; return safeHtml(text).replace(BL, function () { return nums[i] != null ? blank(nums[i++]) : '<span class="bl"></span>'; }); }
  function optList(opts, cls) { return '<div class="opts ' + (cls || '') + '">' + (opts || []).map(function (o) { return '<div>' + safeHtml(o) + '</div>'; }).join('') + '</div>'; }
  function letters(opts) { return (opts || []).map(function (o) { var m = String(o).match(/^\s*([A-Z]|[ivx]+)[.)]/i); return m ? m[1] : String(o).trim().slice(0, 4); }); }
  function renderGroup(g, nums) {
    var a = nums[0], b = nums[nums.length - 1];
    var h = '<div class="grp"><div class="gh"><b>Questions ' + a + (b !== a ? '–' + b : '') + '</b></div>';
    var ins = String(g.instruction || '').replace(/^\s*Questions?\s+\d+\s*(?:[-–]|and)\s*\d+\s*(<br\s*\/?>|:)?\s*/i, '');
    if (ins) h += '<div class="ins">' + safeHtml(ins) + '</div>';
    if (g.imageUrl && /^(data:image|https?:)/.test(g.imageUrl)) h += '<div class="gimg"><img src="' + esc(g.imageUrl) + '" alt=""></div>';
    var qs = g.questions || [], t = g.type;
    if (t === 'heading') {
      h += '<div class="box"><div class="bt">List of Headings</div>' + optList(g.options, 'roman') + '</div>';
      h += '<div class="ql">' + qs.map(function (q, i) { return '<div class="qi"><span class="qn">' + nums[i] + '</span><span class="qt">' + safeHtml(q.text) + '</span><span class="ab"></span></div>'; }).join('') + '</div>';
    } else if (t === 'tfng') {
      var labs = g.labels && g.labels.length ? g.labels : ['TRUE', 'FALSE', 'NOT GIVEN'];
      var sh = labs.map(function (l) { return /not given/i.test(l) ? 'NG' : l.charAt(0); });
      h += '<div class="ql">' + qs.map(function (q, i) { return '<div class="qi tf"><span class="qn">' + nums[i] + '</span><span class="qt">' + safeHtml(q.text) + '</span><span class="tfb">' + sh.map(function (s) { return '<span>' + s + '</span>'; }).join('') + '</span></div>'; }).join('') + '</div>';
    } else if (t === 'mcq') {
      h += '<div class="ql">' + qs.map(function (q, i) { return '<div class="qi mc"><span class="qn">' + nums[i] + '</span><div class="qt">' + safeHtml(q.text) + optList(q.options, 'circ') + '</div></div>'; }).join('') + '</div>';
    } else if (t === 'multi') {
      h += optList(g.options, 'sq') + '<div class="ql"><div class="qi"><span class="qn">' + a + (b !== a ? '–' + b : '') + '</span><span class="qt">Chọn ' + (g.pickCount || qs.length) + ' đáp án:</span>' + nums.map(function () { return '<span class="ab sm"></span>'; }).join('') + '</div></div>';
    } else if (t === 'list_match' || t === 'matching' || t === 'planlabel' || t === 'grid') {
      if (t === 'grid') h += '<div class="box inline"><div class="bt">Chọn</div>' + letters(g.options).map(function (l) { return '<span class="lt">' + esc(l) + '</span>'; }).join('') + '</div>';
      else if (t !== 'planlabel' || (g.options || []).some(function (o) { return !/^\s*[A-Z][.)]\s*[A-Z]\s*$/.test(o); })) h += '<div class="box">' + optList(g.options) + '</div>';
      h += '<div class="ql">' + qs.map(function (q, i) { return '<div class="qi"><span class="qn">' + nums[i] + '</span><span class="qt">' + safeHtml(q.text) + '</span><span class="ab sm"></span></div>'; }).join('') + '</div>';
    } else if (t === 'table') {
      var k = 0, take = function () { return nums[k++]; };
      h += '<table class="tb"><thead><tr>' + (g.tableColumns || []).map(function (c) { return '<th>' + safeHtml(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        (g.tableRows || []).map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + safeHtml(c).replace(BL, function () { var n = take(); return n != null ? blank(n) : '<span class="bl"></span>'; }) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
    } else if (t === 'inline') {
      h += '<div class="ql">' + qs.map(function (q, i) { return '<div class="qi"><span class="qn">' + nums[i] + '</span><span class="qt">' + safeHtml(q.pre) + ' ' + blank(nums[i]) + ' ' + safeHtml(q.post) + '</span></div>'; }).join('') + '</div>';
    } else if ((t === 'text' || t === 'wordbank' || t === 'flowchart') && g.notesTemplate) {
      if (g.options && g.options.length) h += '<div class="box">' + optList(g.options, 'two') + '</div>';
      var k2 = 0;
      var lines = String(g.notesTemplate).split('\n');
      var tpl = lines.map(function (ln) {
        if (!ln.trim()) return '';
        var cnt = (ln.match(BL) || []).length, ns = nums.slice(k2, k2 + cnt); k2 += cnt;
        var isHead = !cnt && ln.length < 60 && !/^[•\-–]/.test(ln.trim());
        return '<div class="' + (isHead ? 'nh' : 'nl') + '">' + fillBlanks(ln, ns) + '</div>';
      }).filter(Boolean);
      h += '<div class="notes' + (t === 'flowchart' ? ' flow' : '') + '">' + (t === 'flowchart' ? tpl.join('<div class="arr">↓</div>') : tpl.join('')) + '</div>';
    } else {
      h += '<div class="ql">' + qs.map(function (q, i) {
        var tx = String(q.text || '');
        return /_{3,}/.test(tx) ? '<div class="qi"><span class="qn">' + nums[i] + '</span><span class="qt">' + fillBlanks(tx, [nums[i]]) + '</span></div>'
          : '<div class="qi wr"><span class="qn">' + nums[i] + '</span><span class="qt">' + safeHtml(tx) + '</span><span class="ab"></span></div>';
      }).join('') + '</div>';
    }
    return h + '</div>';
  }
  function numberTest(t) { // gán số câu 1..40 theo thứ tự
    var n = 0;
    t.nums = t.qd.map(function (groups) { return groups.map(function (g) { return (g.questions || []).map(function () { return ++n; }); }); });
    return t;
  }
  function passageHtml(t, pi) {
    var ps = t.passages[pi]; if (!ps) return '';
    var d = document.createElement('div'); d.innerHTML = ps.html;
    $$('script,style,button,input,select,textarea', d).forEach(function (e) { e.remove(); });
    $$('.heading-gap', d).forEach(function (g) { var s = document.createElement('span'); s.className = 'hg'; s.innerHTML = '<i>' + esc(g.getAttribute('data-qnum') || '') + '</i>'; g.replaceWith(s); });
    $$('*', d).forEach(function (e) { Array.prototype.slice.call(e.attributes).forEach(function (a) { if (/^on|^style$|^contenteditable$|^data-rs/i.test(a.name)) e.removeAttribute(a.name); }); });
    var first = d.querySelector('p'); if (first && /^READING PASSAGE/i.test(first.textContent.trim())) first.remove();
    var h2 = d.querySelector('h2'); var ttl = h2 ? h2.textContent.trim() : ps.title; if (h2) h2.remove();
    return { title: ttl, body: d.innerHTML };
  }

  /* ---------- Ghép tài liệu ---------- */
  function partName(pi) { return KIND === 'reading' ? 'Reading Passage ' + (pi + 1) : 'Section ' + (pi + 1); }
  function sectionBlock(t, pi, opt, label) {
    var nums = t.nums[pi], flat = [].concat.apply([], nums), a = flat[0], b = flat[flat.length - 1];
    var h = '<section class="part">';
    h += '<div class="ph"><img src="' + IRA + ST.part + '.webp" alt=""><div><div class="pk">' + esc(partName(pi)) + ' · Questions ' + a + '–' + b + '</div><div class="pt">' + esc(label || t.title) + '</div></div>' +
      '<div class="meta">Họ tên: <span class="ln"></span><br>Ngày: <span class="ln s"></span> Điểm: <span class="ln s"></span>/' + flat.length + '</div></div>';
    if (KIND === 'reading') {
      var ps = passageHtml(t, pi);
      if (ps) h += '<div class="pz' + (opt.margin ? ' mg' : '') + '"><h2>' + esc(ps.title) + '</h2>' + ps.body + '</div>';
      h += '<div class="qh">Câu hỏi</div>';
    } else {
      h += '<div class="pre"><div class="pre-t">Trước khi nghe <small>(30 giây)</small></div><div class="pre-l">Gạch chân từ khoá · đoán loại từ cần điền (n / v / adj / số / tên riêng)</div></div>';
    }
    t.qd[pi].forEach(function (g, gi) { h += renderGroup(g, nums[gi]); });
    if (opt.vocab) h += vocabBox();
    return h + '</section>';
  }
  function vocabBox() {
    var rows = ''; for (var i = 0; i < 6; i++) rows += '<tr><td></td><td></td><td></td></tr>';
    return '<div class="vb"><div class="vh"><img src="' + IRA + ST.vocab + '.webp" alt=""><div><b>Từ vựng mới &amp; ghi chú</b><small>Chép lại từ / cụm từ hay trong bài, kèm nghĩa và câu ví dụ</small></div></div>' +
      '<table><thead><tr><th style="width:32%">Từ / cụm từ</th><th style="width:24%">Nghĩa</th><th>Ví dụ / ghi chú</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function keyBlock(items, opt) {
    var h = '<section class="part key"><div class="ph"><img src="' + IRA + ST.key + '.webp" alt=""><div><div class="pk">Answer key</div><div class="pt">Đáp án' + (opt.exp ? ' &amp; giải thích' : '') + '</div></div></div>';
    items.forEach(function (it) {
      h += '<div class="kh">' + esc(it.label) + '</div>';
      if (opt.exp) h += '<div class="kx">' + it.rows.map(function (r) { return '<div class="kr"><b>' + r.n + '</b><span class="ka">' + esc(r.a) + '</span>' + (r.exp ? '<div class="ke">' + esc(r.exp) + '</div>' : '') + '</div>'; }).join('') + '</div>';
      else h += '<div class="kg">' + it.rows.map(function (r) { return '<div><b>' + r.n + '</b>' + esc(r.a) + '</div>'; }).join('') + '</div>';
    });
    return h + '</section>';
  }
  function keyRows(t, pi) {
    var rows = [];
    t.qd[pi].forEach(function (g, gi) {
      (g.questions || []).forEach(function (q, qi) {
        var a = Array.isArray(q.answer) ? q.answer.join(' / ') : String(q.answer == null ? '' : q.answer);
        rows.push({ n: t.nums[pi][gi][qi], a: a, exp: String(q.exp || '').replace(/<[^>]+>/g, '') });
      });
    });
    return rows;
  }
  function cover(title, sub, list) {
    return '<section class="cover"><div class="cv-top">NIGHT IELTS · ' + (KIND === 'reading' ? 'READING' : 'LISTENING') + '</div>' +
      '<img class="cv-img" src="' + IRA + ST.cover + '.webp" alt=""><h1>' + esc(title) + '</h1><div class="cv-sub">' + esc(sub) + '</div>' +
      (list ? '<ol class="cv-list">' + list.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' : '') +
      '<div class="cv-info"><div>Họ tên <span class="ln"></span></div><div>Lớp <span class="ln"></span></div><div>Ngày làm <span class="ln"></span></div><div>Thời gian <span class="ln"></span></div></div>' +
      '<div class="cv-score"><div><small>Số câu đúng</small><b></b></div><div><small>Band</small><b></b></div><div><small>Chữ ký thầy</small><b></b></div></div>' +
      '<div class="cv-tip"><img src="' + IRA + ST.puzzle + '.webp" alt=""><div><b>Mẹo làm bài</b><br>' + (KIND === 'reading' ? 'Đọc câu hỏi trước · gạch keyword · đọc từng đoạn, câu nào thấy thông tin thì làm luôn · câu khó để lại, rà soát cuối bài.' : 'Đọc trước câu hỏi trong 30 giây · đoán loại từ cần điền · nghe theo thứ tự câu hỏi · kiểm tra chính tả, số ít / số nhiều.') + '</div></div></section>';
  }
  var CSS = '' +
    '@page{size:A4;margin:13mm 13mm 14mm}' +
    '*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    'html,body{margin:0;background:#fff;color:#1d2140;font:10.5pt/1.5 "Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif}' +
    ':root{--c:' + (KIND === 'reading' ? '#6d5dfc' : '#0d9488') + ';--c2:' + (KIND === 'reading' ? '#efecff' : '#e3f6f3') + ';--ink2:#5b6080;--line:#c9cbe0}' +
    '.sheet{max-width:184mm;margin:0 auto}' +
    'section.part{break-before:page;page-break-before:always}.sheet>section.part:first-child{break-before:auto;page-break-before:auto}' +
    '.cover{min-height:265mm;display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:10mm}' +
    '.cv-top{letter-spacing:.25em;font-weight:800;font-size:9pt;color:var(--c)}' +
    '.cv-img{width:52mm;margin:8mm 0 4mm}.cover h1{font-size:24pt;margin:0;line-height:1.15}.cv-sub{color:var(--ink2);margin-top:2mm;font-size:11pt}' +
    '.cv-list{text-align:left;margin:6mm auto 0;columns:2;column-gap:10mm;font-size:9.5pt;color:var(--ink2);max-width:150mm}' +
    '.cv-info{display:grid;grid-template-columns:1fr 1fr;gap:5mm 10mm;width:150mm;margin-top:10mm;text-align:left;font-weight:600}' +
    '.cv-info .ln{display:inline-block;width:52mm;border-bottom:1px solid var(--line);margin-left:3mm}' +
    '.cv-score{display:flex;gap:6mm;margin-top:9mm}.cv-score div{width:42mm;border:1.5px solid var(--c);border-radius:4mm;padding:3mm;height:24mm}.cv-score small{color:var(--ink2);font-weight:700}' +
    '.cv-tip{margin-top:auto;display:flex;gap:4mm;align-items:center;text-align:left;background:var(--c2);border-radius:5mm;padding:4mm 6mm;width:170mm;font-size:9.5pt}.cv-tip img{width:24mm}' +
    '.ph{display:flex;align-items:center;gap:4mm;border-bottom:2.5px solid var(--c);padding-bottom:2.5mm;margin-bottom:4mm}' +
    '.ph img{width:15mm;height:15mm;object-fit:contain}.pk{font-weight:800;color:var(--c);font-size:9pt;letter-spacing:.06em;text-transform:uppercase}.pt{font-weight:800;font-size:13pt}' +
    '.ph .meta{margin-left:auto;font-size:8.5pt;color:var(--ink2);text-align:right;line-height:1.9}.ln{display:inline-block;width:40mm;border-bottom:1px solid var(--line)}.ln.s{width:16mm}' +
    '.pz{font:10.8pt/1.62 Georgia,"Times New Roman",serif;text-align:justify;position:relative}' +
    '.pz h2{font:800 14pt/1.25 "Plus Jakarta Sans",system-ui,sans-serif;text-align:center;margin:1mm 0 3mm}' +
    '.pz p{margin:0 0 2.2mm}.pz img{max-width:100%}' +
    '.pz.mg{padding-right:46mm;background:repeating-linear-gradient(to bottom,transparent 0 6.6mm,#dfe1ee 6.6mm 6.9mm) right 0 top 7mm/42mm 100% no-repeat;border-right:0}' +
    '.pz.mg::before{content:"Ghi chú · keyword";position:absolute;right:0;top:0;width:42mm;font:700 7.5pt system-ui;color:#9aa0c0;letter-spacing:.08em;text-transform:uppercase;border-left:1px dashed #cfd2e6;padding-left:2mm;height:100%}' +
    '.hg{display:inline-block;min-width:34mm;border:1.3px dashed var(--c);border-radius:2mm;padding:0 2mm;margin-right:2mm;font:700 8.5pt/1.7 system-ui;color:var(--c)}.hg i{font-style:normal}.hg i::before{content:"Q"}' +
    '.qh{break-before:page;page-break-before:always;font-weight:800;font-size:12pt;color:var(--c);margin-bottom:2mm}' +
    '.grp{margin:0 0 5mm;break-inside:auto}.gh{font-size:11pt;margin-bottom:1mm}.ins{font-style:italic;color:var(--ink2);font-size:9.5pt;margin-bottom:2.5mm;border-left:3px solid var(--c2);padding-left:3mm}' +
    '.gimg{text-align:center;margin:2mm 0}.gimg img{max-width:100%;max-height:95mm}' +
    '.box{border:1.3px solid var(--line);border-radius:3mm;padding:2.5mm 4mm;margin:0 0 3mm;break-inside:avoid}.box.inline{display:flex;align-items:center;gap:3mm}.bt{font-weight:800;font-size:9pt;color:var(--c);margin-bottom:1mm}.box.inline .bt{margin:0}' +
    '.lt{display:inline-block;width:6.5mm;height:6.5mm;border:1px solid var(--line);border-radius:50%;text-align:center;line-height:6.2mm;font-weight:700;font-size:9pt}' +
    '.opts div{padding:.4mm 0}.opts.two{columns:2;column-gap:8mm}.opts.circ div::before,.opts.sq div::before{content:"";display:inline-block;width:3.2mm;height:3.2mm;border:1px solid #8a8fb0;border-radius:50%;margin-right:2.5mm;vertical-align:-.3mm}.opts.sq div::before{border-radius:.6mm}' +
    '.ql{display:flex;flex-direction:column;gap:2.4mm}.qi{display:flex;align-items:flex-start;gap:3mm;break-inside:avoid}' +
    '.qn{flex:none;min-width:6.6mm;height:6.6mm;padding:0 1.2mm;border-radius:3.3mm;background:var(--c);color:#fff;font-weight:800;font-size:8.5pt;display:inline-flex;align-items:center;justify-content:center;margin-top:.2mm}' +
    '.qt{flex:1}.ab{flex:none;width:34mm;border-bottom:1.2px solid #8a8fb0;height:6mm}.ab.sm{width:14mm;margin-left:1.5mm}.qi.wr{flex-wrap:wrap}.qi.wr .ab{width:60mm;margin-left:9.6mm}' +
    '.tfb{flex:none;display:flex;gap:1.5mm}.tfb span{border:1px solid #8a8fb0;border-radius:1.5mm;padding:0 1.6mm;font-size:8pt;font-weight:700;color:#5b6080}' +
    '.mc .opts{margin-top:1mm}' +
    '.bl{display:inline-block;min-width:28mm;border-bottom:1.2px solid #6f7499;position:relative;height:5mm;vertical-align:-1mm;margin:0 1mm}.bl i{position:absolute;left:0;top:-1.2mm;font:800 7pt system-ui;color:#fff;background:var(--c);border-radius:1.5mm;padding:0 1mm;font-style:normal}' +
    '.notes{border:1.3px solid var(--line);border-radius:3mm;padding:3mm 5mm;line-height:2.05}.notes .nh{font-weight:800;margin-top:1.5mm}.notes .nl{padding-left:2mm}' +
    '.notes.flow{display:flex;flex-direction:column;align-items:center;text-align:center;border:0;padding:0}.notes.flow>div:not(.arr){border:1.2px solid var(--line);border-radius:2.5mm;padding:1.5mm 4mm;width:100%}.arr{color:var(--c);font-weight:800;line-height:1.2}' +
    '.tb{width:100%;border-collapse:collapse;font-size:9.5pt;line-height:1.9}.tb th{background:var(--c2);text-align:left}.tb th,.tb td{border:1px solid var(--line);padding:1mm 2mm;vertical-align:top}' +
    '.pre{display:flex;gap:4mm;align-items:baseline;background:var(--c2);border-radius:3mm;padding:2mm 4mm;margin-bottom:4mm;font-size:9pt}.pre-t{font-weight:800;color:var(--c)}' +
    '.vb{break-inside:avoid;margin-top:6mm;border:1.5px solid var(--c);border-radius:4mm;padding:3mm 4mm}.vh{display:flex;gap:3mm;align-items:center;margin-bottom:2mm}.vh img{width:13mm}.vh small{display:block;color:var(--ink2);font-size:8.5pt}' +
    '.vb table{width:100%;border-collapse:collapse}.vb th{font-size:8.5pt;text-align:left;color:var(--ink2);border-bottom:1.2px solid var(--line);padding:1mm}.vb td{height:7.6mm;border-bottom:1px solid #e1e3ef}.vb td+td{border-left:1px dashed #e1e3ef}' +
    '.key .kh{font-weight:800;color:var(--c);margin:4mm 0 2mm;break-after:avoid}.kg{display:grid;grid-template-columns:repeat(4,1fr);gap:1.5mm 5mm}.kg div{border-bottom:1px dotted var(--line);padding:.6mm 0}.kg b,.kr b{display:inline-block;min-width:8mm;color:var(--c)}' +
    '.kr{padding:1.2mm 0;border-bottom:1px dotted var(--line);break-inside:avoid}.ka{font-weight:800}.ke{color:var(--ink2);font-size:9pt;margin-left:8mm}' +
    '.end{text-align:center;margin-top:8mm;color:var(--ink2);font-size:9pt}.end img{width:18mm;display:block;margin:0 auto 1mm}' +
    '@media screen{body{background:#eceef6}.sheet{background:#fff;padding:14mm;margin:8mm auto;box-shadow:0 4px 20px rgba(0,0,0,.1);max-width:210mm}section.part,.cover{border-bottom:2px dashed #d9dbe8;padding-bottom:10mm;margin-bottom:10mm}}';

  var DUPLEX = false;
  var DX_CSS = '@page{size:A4 landscape;margin:9mm}body.dx{font-size:9pt}body.dx .sheet{max-width:279mm}body.dx section.part{column-count:2;column-gap:10mm;column-rule:1px dashed #d9dbe8}body.dx .pz{font-size:9.4pt}body.dx .pz.mg{padding-right:0;background:none}body.dx .pz.mg::before{display:none}body.dx .cover{min-height:172mm}body.dx .kg{grid-template-columns:repeat(2,1fr)}body.dx .gimg img{max-height:70mm}@media screen{body.dx .sheet{max-width:297mm}}';
  function buildDoc(title, body) {
    return '<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
      '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">' +
      '<style>' + CSS + (DUPLEX ? DX_CSS : '') + '</style></head><body' + (DUPLEX ? ' class="dx"' : '') + '><div class="sheet">' + body +
      '<div class="end"><img src="' + IRA + ST.end + '.webp" alt="">Night IELTS · nightielts.id.vn</div></div></body></html>';
  }

  /* ---------- 3 cấp in ---------- */
  function curPart() {
    if (KIND === 'listening') { try { if (typeof currentSection !== 'undefined') return currentSection - 1; } catch (e) {} return 0; }
    for (var p = 1; p <= 3; p++) { var w = $('#passage-' + p + '-text'); if (w && w.classList.contains('active')) return p - 1; }
    return 0;
  }
  function makePart(opt) {
    return loadTest(thisPath()).then(function (t) {
      numberTest(t); var pi = opt.part;
      var body = sectionBlock(t, pi, opt);
      if (opt.key) body += keyBlock([{ label: partName(pi), rows: keyRows(t, pi) }], opt);
      return buildDoc(t.title + ' · ' + partName(pi), body);
    });
  }
  function makeTest(opt) {
    return loadTest(thisPath()).then(function (t) {
      numberTest(t);
      var body = cover(t.title, KIND === 'reading' ? '3 passages · 40 câu · 60 phút' : '4 sections · 40 câu · khoảng 30 phút', null);
      t.qd.forEach(function (_, pi) { body += sectionBlock(t, pi, opt); });
      if (opt.key) body += keyBlock(t.qd.map(function (_, pi) { return { label: partName(pi), rows: keyRows(t, pi) }; }), opt);
      return buildDoc(t.title, body);
    });
  }
  function makeBulk(opt, paths, onProgress) {
    var done = 0, res = new Array(paths.length);
    var q = paths.slice(), idx = {}; paths.forEach(function (p, i) { idx[p] = i; });
    function worker() {
      var p = q.shift(); if (!p) return Promise.resolve();
      return loadTest(p).then(function (t) { res[idx[p]] = t; }, function () { res[idx[p]] = null; })
        .then(function () { onProgress(++done, paths.length); return worker(); });
    }
    return Promise.all([worker(), worker(), worker()]).then(function () {
      var tests = res.filter(function (t) { return t && t.qd[opt.part]; });
      tests.forEach(numberTest);
      var name = partName(opt.part);
      var body = cover(name + ' · ' + tests.length + ' đề', 'Ôn riêng ' + name + ' của nhiều đề', null);
      tests.forEach(function (t) { body += sectionBlock(t, opt.part, opt, t.title); });
      if (opt.key) body += keyBlock(tests.map(function (t) { return { label: t.title + ' · ' + name, rows: keyRows(t, opt.part) }; }), opt);
      return buildDoc(name + ' — ' + tests.length + ' đề', body);
    });
  }

  /* ---------- Giao diện chọn kiểu in ---------- */
  var UI_CSS = '' +
    '#np-ov{position:fixed;inset:0;z-index:10001;background:rgba(28,22,70,.45);display:flex;align-items:center;justify-content:center;font:14px/1.5 "Plus Jakarta Sans",system-ui,sans-serif;color:#1f2340}' +
    '#np-ov .bx{background:#fff;border-radius:22px;width:min(760px,calc(100vw - 20px));max-height:calc(100vh - 30px);overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);padding:20px 22px}' +
    '#np-ov h3{margin:0 0 4px;font-size:19px}#np-ov .sub{color:#7a7f9d;margin-bottom:14px}' +
    '#np-ov .modes{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}' +
    '#np-ov .md{border:2px solid #ecebf6;border-radius:16px;padding:12px;cursor:pointer;text-align:center;background:#fff;font:inherit;color:inherit}' +
    '#np-ov .md img{width:64px;height:64px;object-fit:contain}#np-ov .md b{display:block;margin-top:4px}#np-ov .md small{color:#7a7f9d}' +
    '#np-ov .md.on{border-color:#6d5dfc;background:#f5f3ff}' +
    '#np-ov .row{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-top:14px}' +
    '#np-ov label{display:inline-flex;gap:6px;align-items:center;cursor:pointer}' +
    '#np-ov select{font:inherit;padding:6px 10px;border-radius:10px;border:1px solid #d9d6ee}' +
    '#np-ov .sets{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}#np-ov .sets label{background:#f3f2fa;border-radius:999px;padding:4px 10px;font-size:13px}' +
    '#np-ov .ft{display:flex;gap:8px;justify-content:flex-end;margin-top:18px;align-items:center}' +
    '#np-ov button.b{font:inherit;border:0;border-radius:12px;padding:9px 16px;cursor:pointer;font-weight:700;background:#f1effb;color:#4b40b8}#np-ov button.pr{background:#6d5dfc;color:#fff}' +
    '#np-ov .msg{margin-right:auto;color:#7a7f9d;font-size:13px}' +
    '#np-pv{position:fixed;inset:0;z-index:10002;background:#2b2f45;display:flex;flex-direction:column}' +
    '#np-pv .tb{display:flex;gap:8px;align-items:center;padding:10px 14px;background:#1f2235;color:#fff;font:600 14px system-ui}' +
    '#np-pv .tb span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#np-pv button{font:inherit;border:0;border-radius:10px;padding:8px 16px;cursor:pointer;font-weight:700;background:#3a3f5c;color:#fff}#np-pv button.pr{background:#6d5dfc}' +
    '#np-pv iframe{flex:1;border:0;background:#eceef6;width:100%}' +
    '@media (max-width:640px){#np-ov .modes{grid-template-columns:1fr}}';
  function ui() { if (!$('#np-css')) { var s = document.createElement('style'); s.id = 'np-css'; s.textContent = UI_CSS; document.head.appendChild(s); } }
  function openMenu() {
    ui();
    var old = $('#np-ov'); if (old) old.remove();
    var nParts = KIND === 'reading' ? 3 : 4, cur = curPart();
    var partOpts = ''; for (var i = 0; i < nParts; i++) partOpts += '<option value="' + i + '"' + (i === cur ? ' selected' : '') + '>' + partName(i) + '</option>';
    var o = document.createElement('div'); o.id = 'np-ov';
    o.innerHTML = '<div class="bx"><h3>In đề ' + (KIND === 'reading' ? 'Reading' : 'Listening') + '</h3><div class="sub">Bản in A4: có ảnh minh hoạ, lề ghi chú, ô từ vựng mới. Đáp án in ở trang cuối (tuỳ chọn).</div>' +
      '<div class="modes">' +
      '<button class="md on" data-m="part"><img src="' + IRA + ST.notes + '.webp" alt=""><b>In 1 ' + (KIND === 'reading' ? 'passage' : 'section') + '</b><small>' + (KIND === 'reading' ? 'Bài đọc + câu hỏi' : 'Câu hỏi của section') + '</small></button>' +
      '<button class="md" data-m="test"><img src="' + IRA + ST.cover + '.webp" alt=""><b>In cả đề</b><small>Trang bìa + ' + nParts + ' ' + (KIND === 'reading' ? 'passage' : 'section') + '</small></button>' +
      '<button class="md" data-m="bulk"><img src="' + IRA + ST.puzzle + '.webp" alt=""><b>In 1 ' + (KIND === 'reading' ? 'passage' : 'section') + ' của nhiều đề</b><small>Vd. chỉ ôn Passage 1 của cả bộ</small></button></div>' +
      '<div class="row"><span>Phần:</span><select data-k="part">' + partOpts + '</select></div>' +
      '<div class="bulk" style="display:none"><div class="row" style="margin-top:10px"><b>Chọn bộ đề</b> <label><input type="checkbox" data-k="all"> Chọn tất cả</label></div><div class="sets">Đang tải danh sách…</div></div>' +
      '<div class="row"><label><input type="checkbox" data-k="key" checked> Kèm đáp án (trang cuối)</label><label><input type="checkbox" data-k="exp"> Đáp án kèm giải thích</label>' +
      (KIND === 'reading' ? '<label><input type="checkbox" data-k="margin" checked> Lề ghi chú cạnh bài đọc</label>' : '') + '<label><input type="checkbox" data-k="vocab" checked> Ô từ vựng mới</label><label><input type="checkbox" data-k="duplex"> In 2 trang/tờ (A4 ngang, 2 cột)</label></div>' +
      '<div class="ft"><span class="msg"></span><button class="b" data-k="close">Huỷ</button><button class="b pr" data-k="go">Xem bản in</button></div></div>';
    document.body.appendChild(o);
    var mode = 'part', paths = null;
    o.addEventListener('click', function (e) {
      if (e.target === o) return o.remove();
      var md = e.target.closest('.md');
      if (md) {
        mode = md.dataset.m; $$('.md', o).forEach(function (x) { x.classList.toggle('on', x === md); });
        $('.bulk', o).style.display = mode === 'bulk' ? '' : 'none';
        if (mode === 'bulk' && !paths) listTests().then(function (ps) {
          paths = ps; var sets = {};
          ps.forEach(function (p) { (sets[setOf(p)] = sets[setOf(p)] || []).push(p); });
          var mine = setOf(thisPath());
          $('.sets', o).innerHTML = Object.keys(sets).map(function (k) { return '<label><input type="checkbox" value="' + k + '"' + (k === mine ? ' checked' : '') + '> ' + esc(setLabel(k)) + ' (' + sets[k].length + ')</label>'; }).join('');
        }).catch(function () { $('.sets', o).textContent = 'Không tải được danh sách đề.'; });
        return;
      }
      var k = e.target.dataset && e.target.dataset.k;
      if (k === 'all') { $$('.sets input', o).forEach(function (x) { x.checked = e.target.checked; }); return; }
      if (k === 'close') return o.remove();
      if (k === 'go') {
        var opt = { part: +$('[data-k="part"]', o).value, key: $('[data-k="key"]', o).checked, exp: $('[data-k="exp"]', o).checked, margin: !!($('[data-k="margin"]', o) || {}).checked, vocab: $('[data-k="vocab"]', o).checked, duplex: $('[data-k="duplex"]', o).checked };
        DUPLEX = !!opt.duplex;
        var msg = $('.msg', o); msg.textContent = 'Đang chuẩn bị…';
        var p;
        if (mode === 'part') p = makePart(opt);
        else if (mode === 'test') p = makeTest(opt);
        else {
          var chosen = $$('.sets input:checked', o).map(function (x) { return x.value; });
          var list = (paths || []).filter(function (x) { return chosen.indexOf(setOf(x)) !== -1; }).sort(function (a, b) { return setOf(a) === setOf(b) ? testNo(a) - testNo(b) : (setOf(a) < setOf(b) ? -1 : 1); });
          if (!list.length) { msg.textContent = 'Chọn ít nhất 1 bộ đề.'; return; }
          p = makeBulk(opt, list, function (d, n) { msg.textContent = 'Đang tải đề ' + d + '/' + n + '…'; });
        }
        p.then(function (html) { o.remove(); preview(html); }).catch(function (err) { msg.textContent = 'Lỗi: ' + (err && err.message || err); });
      }
    });
  }
  function preview(html) {
    ui();
    var pv = document.createElement('div'); pv.id = 'np-pv';
    pv.innerHTML = '<div class="tb"><span>Bản xem trước — bấm In (chọn khổ A4; muốn tiết kiệm giấy thì chọn "Pages per sheet = 2" hoặc "In hai mặt"; bật "Đồ hoạ nền" / Background graphics để in màu và dòng kẻ)</span><button data-k="close">Đóng</button><button class="pr" data-k="print">In / Lưu PDF</button></div><iframe title="Bản in"></iframe>';
    document.body.appendChild(pv);
    var fr = $('iframe', pv);
    fr.srcdoc = html;
    pv.addEventListener('click', function (e) {
      var k = e.target.dataset && e.target.dataset.k;
      if (k === 'close') pv.remove();
      if (k === 'print') { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (er) { var w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); setTimeout(function () { w.print(); }, 800); } } }
    });
  }

  /* ---------- Nút chỉ cho admin ---------- */
  function addBtn() {
    if ($('#np-btn')) return;
    var host = $('.header-right'); if (!host) return;
    var b = document.createElement('button'); b.id = 'np-btn'; b.type = 'button'; b.textContent = 'In đề';
    b.style.cssText = 'background:#e3f6f3;color:#0f766e;border:0;border-radius:999px;padding:7px 14px;font-weight:700;cursor:pointer;margin-right:6px';
    b.onclick = openMenu; host.insertBefore(b, host.firstChild);
    var box = $('#setup-screen .modal-box');
    if (box && !$('#np-btn2')) {
      var b2 = document.createElement('button'); b2.id = 'np-btn2'; b2.type = 'button'; b2.textContent = 'In đề cho học sinh';
      b2.style.cssText = 'display:block;margin:8px auto 0;background:#e3f6f3;color:#0f766e;border:0;border-radius:10px;padding:8px 16px;font-weight:700;cursor:pointer';
      b2.onclick = openMenu; box.appendChild(b2);
    }
  }
  function removeBtn() { ['#np-btn', '#np-btn2'].forEach(function (k) { var b = $(k); if (b) b.remove(); }); }
  function checkAdmin() {
    try { if (localStorage.getItem(CK)) addBtn(); } catch (e) {}
    Promise.all([
      import('https://www.gstatic.com/firebasejs/' + V + '/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/' + V + '/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/' + V + '/firebase-firestore.js')
    ]).then(function (m) {
      var t0 = Date.now();
      (function wait() {
        var app = m[0].getApps().length ? m[0].getApp() : (Date.now() - t0 > 6000 ? m[0].initializeApp(FB) : null);
        if (!app) return setTimeout(wait, 200);
        m[1].onAuthStateChanged(m[1].getAuth(app), function (u) {
          if (!u) { try { localStorage.removeItem(CK); } catch (e) {} return removeBtn(); }
          m[2].getDoc(m[2].doc(m[2].getFirestore(app), 'users', u.uid)).then(function (d) {
            var ok = d.exists() && d.data().role === 'admin';
            try { ok ? localStorage.setItem(CK, u.uid) : localStorage.removeItem(CK); } catch (e) {}
            ok ? addBtn() : removeBtn();
          }).catch(function () {});
        });
      })();
    }).catch(function () {});
  }
  window.NightPrint = { open: openMenu, _enable: addBtn, _build: { part: makePart, test: makeTest, bulk: makeBulk, list: listTests } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', checkAdmin); else checkAdmin();
})();
