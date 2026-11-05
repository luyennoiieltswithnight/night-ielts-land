/* Night IELTS — dây chuyền dựng đề Reading từ "spec" JSON (do AI dựng từ sách), có KIỂM ĐỊNH bằng code.
   Chạy:  node tools/reading-pipeline/build.js spec.json            -> chỉ kiểm định, in báo cáo
          node tools/reading-pipeline/build.js spec.json --write    -> kiểm định OK thì ghi reading/<set>/testN.html + manifest
   Dùng chính hàm buildTestHTML() của homework/night-ielts-reading-test-builder.html (mở bằng Playwright)
   để ra đúng định dạng đề của web, rồi sửa các lỗi hay gặp của trình tạo đề (ô heading, chữ cái đoạn, chấm đáp án). */
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..');
const specPath = process.argv[2], WRITE = process.argv.includes('--write');
if (!specPath) { console.error('Dùng: node build.js spec.json [--write]'); process.exit(2); }
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const errors = [], warns = [];
const E = (m) => errors.push(m), W = (m) => warns.push(m);

/* ---------- tiện ích ---------- */
const norm = (s) => String(s || '').toLowerCase().replace(/[’‘`]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
const alts = (a) => String(a || '').split(/\s*\/\s*|\s+OR\s+/i).map((x) => x.trim()).filter(Boolean);
const variants = (a) => [a.replace(/\(([^)]*)\)/g, '$1'), a.replace(/\([^)]*\)/g, '')].map((x) => x.replace(/\s+/g, ' ').trim());
const wc = (s) => String(s).replace(/\([^)]*\)/g, '').trim().split(/\s+/).filter(Boolean);
const isNum = (w) => /^[\d.,:%$£€-]+[a-z%]*$/i.test(w) || /^\d/.test(w);
function wordLimit(instr) {
  const t = String(instr || '').toUpperCase();
  const m = t.match(/(ONE|TWO|THREE|FOUR) WORDS?( ONLY)?/);
  if (!m) return null;
  const n = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4 }[m[1]];
  return { n, num: /AND\/OR A NUMBER|AND\/OR NUMBER/.test(t) };
}
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv'];
const FROM_PASSAGE = { text: 1, table: 1, inline: 1 };

/* ---------- 1. KIỂM ĐỊNH spec ---------- */
let qn = 0;
const key = spec.key || [];
if (!spec.meta || !spec.meta.book || !spec.meta.testNum) E('Thiếu meta.book / meta.testNum');
if (!Array.isArray(spec.passages) || spec.passages.length !== 3) E('Phải có đúng 3 passage');
(spec.passages || []).forEach((p, pi) => {
  const P = 'Passage ' + (pi + 1);
  const paras = p.paragraphs || [];
  if (!p.title) E(P + ': thiếu tiêu đề');
  if (!paras.length) E(P + ': chưa có đoạn văn');
  const allText = norm([p.intro || ''].concat(paras.map((x) => x.text)).join(' '));
  paras.forEach((x, i) => { if (/"/.test(x.text)) E(P + ` đoạn ${i + 1}: có dấu ngoặc kép thẳng (") — đổi sang “ ” (trình tạo đề sẽ biến "..." thành chữ nghiêng)`); });
  // chữ cái đoạn: liên tục từ A
  const lettered = paras.filter((x) => x.letter);
  lettered.forEach((x, i) => { if (x.letter !== LETTERS[i]) E(P + `: chữ cái đoạn không liên tục (đoạn thứ ${i + 1} có chữ ${x.letter}, phải là ${LETTERS[i]})`); });
  (p.groups || []).forEach((g) => {
    const qs = g.questions || [];
    const a = qn + 1, b = qn + qs.length; qn = b;
    const G = `${P} câu ${a}–${b} (${g.type})`;
    // "Reading Passage 2 has seven paragraphs, A-G" -> phải có đúng 7 đoạn mang chữ A–G
    const m = String(g.instruction || '').match(/has\s+(\w+)\s+(paragraphs|sections)\s*,?\s*A\s*[-–—]\s*([A-Z])/i);
    if (m) {
      const want = LETTERS.indexOf(m[3].toUpperCase()) + 1;
      if (lettered.length !== want) E(`${G}: đề ghi ${m[2]} A–${m[3]} (${want}) nhưng bài đang có ${lettered.length} đoạn mang chữ cái → CHIA ĐOẠN SAI`);
    }
    const tpl = g.notesTemplate != null ? g.notesTemplate : null;
    const blanks = (s) => (String(s || '').match(/_{2,}/g) || []).length;
    if ((g.type === 'text' && tpl) || g.type === 'wordbank') { if (blanks(tpl) !== qs.length) E(`${G}: đoạn ghi chú có ${blanks(tpl)} chỗ ___ nhưng có ${qs.length} câu`); }
    if (g.type === 'table') {
      const n = blanks(g.tableRowsRaw);
      if (n !== qs.length) E(`${G}: bảng có ${n} chỗ ___ nhưng có ${qs.length} câu`);
      const cols = (g.tableColumns || []).length;
      String(g.tableRowsRaw || '').split('\n').filter((l) => l.trim()).forEach((l, i) => { if (l.split('|').length !== cols) E(`${G}: hàng ${i + 1} của bảng có ${l.split('|').length} ô, bảng có ${cols} cột`); });
    }
    const lim = wordLimit(g.instruction);
    qs.forEach((q, qi) => {
      const n = a + qi, Q = `Câu ${n}`;
      const ans = String(q.answer || '').trim();
      if (!ans) { E(`${Q}: chưa có đáp án`); return; }
      if (!String(q.exp || '').trim()) E(`${Q}: chưa có giải thích`);
      if (key.length && key[n - 1] != null) {
        const k = alts(key[n - 1]).map(norm).sort().join('|'), mine = alts(ans).map(norm).sort().join('|');
        if (k !== mine) E(`${Q}: đáp án "${ans}" khác đáp án sách "${key[n - 1]}"`);
      }
      if (g.type === 'tfng') { const L = (g.labels || ['TRUE', 'FALSE', 'NOT GIVEN']).map((x) => x.toUpperCase()); if (!L.includes(ans.toUpperCase())) E(`${Q}: đáp án ${ans} không thuộc ${L.join('/')}`); }
      if (g.type === 'mcq') { if (!/^[A-D]$/.test(ans)) E(`${Q}: đáp án trắc nghiệm phải là A–D`); if ((q.options || []).length !== 4) W(`${Q}: trắc nghiệm không đủ 4 lựa chọn`); }
      if (['heading', 'grid', 'list_match', 'matching', 'multi', 'wordbank'].includes(g.type)) {
        const labs = (g.type === 'heading' ? ROMAN : LETTERS.split('')).slice(0, (g.matchOptions || []).length);
        if (!labs.map((x) => x.toUpperCase()).includes(ans.toUpperCase())) E(`${Q}: đáp án ${ans} không có trong danh sách lựa chọn (${labs.join(',')})`);
      }
      if (g.type === 'heading' && !/\b([A-Z])\s*$/.test(String(q.text || '').trim())) E(`${Q}: câu heading phải ghi rõ đoạn, vd "Paragraph B"`);
      if (FROM_PASSAGE[g.type]) {
        // ít nhất 1 cách viết của đáp án phải có nguyên văn trong bài (vd "flavour / flavor": bài chỉ có "flavour")
        if (!alts(ans).some((al) => variants(al).some((v) => v && allText.includes(norm(v).replace(/^\$/, ''))))) E(`${Q}: đáp án "${ans}" không xuất hiện nguyên văn trong bài`);
        alts(ans).forEach((al) => {
          if (lim) {
            const ws = wc(al), nums = ws.filter(isNum).length, words = ws.length - nums;
            if (lim.num ? (words > lim.n || nums > 1) : ws.length > lim.n) E(`${Q}: đáp án "${al}" vượt giới hạn số từ của đề`);
          }
        });
      }
      if (!q.loc && !/NOT GIVEN/i.test(ans) && g.type !== 'heading') W(`${Q}: chưa có cụm bằng chứng (loc) — nút "Xem vị trí" sẽ ẩn`);
      if (q.loc) {
        const ok = paras.some((x) => norm(x.text).includes(norm(q.loc)));
        if (!ok) E(`${Q}: cụm bằng chứng "${String(q.loc).slice(0, 60)}" không có nguyên văn trong 1 đoạn nào`);
      }
    });
  });
});
if (qn !== 40) E(`Tổng số câu là ${qn}, phải là 40`);

/* ---------- 2. Dựng HTML bằng trình tạo đề của web ---------- */
function toBuilderState(spec) {
  return {
    meta: { source: spec.meta.source || 'cambridge', book: String(spec.meta.book), testNum: String(spec.meta.testNum), title: '', titleEdited: false },
    passages: spec.passages.map((p) => ({
      title: p.title,
      paragraphs: [p.intro ? '"' + p.intro.replace(/"/g, '”') + '"' : null].concat(p.paragraphs.map((x) => x.text)).filter(Boolean).join('\n\n'),
      groups: p.groups.map((g) => JSON.parse(JSON.stringify(Object.assign({ reference: '', imageUrl: '' }, g, g.type === 'heading' ? { questions: [] } : {}))))
        .map((g, gi) => { if (p.groups[gi].type === 'heading') g.questions = p.groups[gi].questions.map((q) => Object.assign({}, q)); return g; })
    }))
  };
}
const ANS_FN = `
        // Night pipeline: chấm điền từ chấp nhận đáp án thay thế ("flavour / flavor"), phần trong ngoặc
        // không bắt buộc ("(food) consumption"), bỏ qua dấu phẩy / khoảng trắng trong số ("1,000 kg" = "1000kg").
        function nightAnsOk(u, c) {
            const n = s => String(s || '').toUpperCase().replace(/[’‘]/g, "'").replace(/\\s+/g, ' ').replace(/[.;:!?]+$/, '').trim();
            u = n(u); if (!u) return false;
            const tight = s => s.replace(/[\\s,]/g, '');
            return String(c || '').split(/\\s*\\/\\s*|\\s+OR\\s+/i).some(a => {
                return [a.replace(/\\(([^)]*)\\)/g, '$1'), a.replace(/\\([^)]*\\)/g, '')].some(v => { v = n(v); return v === u || tight(v) === tight(u); });
            });
        }
`;
function postProcess(html, spec) {
  // a) bỏ ô heading do trình tạo đề đặt THEO THỨ TỰ (nguyên nhân lỗi cũ), đặt lại theo đúng chữ cái đoạn
  html = html.replace(/<span class="heading-gap"[^>]*><\/span> /g, '');
  let qn = 0;
  spec.passages.forEach((p, pi) => {
    const id = 'passage-' + (pi + 1) + '-text';
    const s = html.indexOf('id="' + id + '"'); if (s < 0) { E('Không thấy khối ' + id); return; }
    const e = html.indexOf('</div>', s);
    let block = html.slice(s, e);
    const nums = {}; let hgKey = null;
    p.groups.forEach((g) => g.questions.forEach((q) => { qn++; if (g.type === 'heading') { const L = String(q.text).trim().slice(-1).toUpperCase(); nums[L] = qn; if (!hgKey) hgKey = 'hg' + qn; } }));
    let idx = -1, k = 0; const offset = p.intro ? 1 : 0;
    block = block.replace(/<p>/g, (m) => {
      idx++;
      const para = p.paragraphs[idx - offset];
      if (!para || !para.letter) return m;
      k++;
      const gap = nums[para.letter] ? `<span class="heading-gap" data-qnum="${nums[para.letter]}" data-group="${hgKey}"></span> ` : '';
      delete nums[para.letter];
      return `<p>${gap}<b class="para-letter">${para.letter}</b> `;
    });
    Object.keys(nums).forEach((L) => E(`Passage ${pi + 1}: câu heading ${nums[L]} trỏ tới đoạn ${L} nhưng không có đoạn ${L}`));
    html = html.slice(0, s) + block + html.slice(e);
  });
  // b) chấm điền từ linh hoạt
  if (html.includes('let isCorrect = (uAns === cAns);')) {
    html = html.replace('let isCorrect = (uAns === cAns);', 'let isCorrect = nightAnsOk(uAns, cAns);');
    html = html.replace('function gradeQuestionRange(', ANS_FN.trim() + '\n        function gradeQuestionRange(');
  } else W('Không vá được phần chấm điền từ (mẫu đề đã đổi?)');
  // c) chữ cái đoạn in đậm, tách riêng
  html = html.replace('</style>', '        .para-letter{font-weight:800;margin-right:6px;color:#4b3f8f}\n    </style>');
  return html;
}

function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rq) => {
      const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rq.writeHead(404); return rq.end(); }
      rq.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); fs.createReadStream(f).pipe(rq);
    }).listen(0, () => res(srv));
  });
}

(async () => {
  if (errors.length) return report();
  const srv = await serve(), port = srv.address().port;
  const br = await chromium.launch();
  try {
    const ctx = await br.newContext();
    await ctx.route('**/*', (r) => (r.request().url().startsWith('http://localhost:' + port) ? r.continue() : r.fulfill({ body: '' })));
    const pg = await ctx.newPage();
    await pg.goto(`http://localhost:${port}/homework/night-ielts-reading-test-builder.html`, { waitUntil: 'domcontentloaded' });
    const out = await pg.evaluate((st) => { const r = buildTestHTML(st); return { html: r.html, warnings: r.warnings, total: r.total, title: r.title }; }, toBuilderState(spec));
    out.warnings.forEach((w) => (/không tìm thấy cụm|chưa nhập đáp án|chỗ trống|cột|lựa chọn|không khớp/i.test(w) ? E('Trình tạo đề: ' + w) : W('Trình tạo đề: ' + w)));
    let html = postProcess(out.html, spec);
    // 3. chạy thử đề trên trình duyệt
    const tmp = path.join(ROOT, '_pipeline_preview.html'); fs.writeFileSync(tmp, html);
    const p2 = await ctx.newPage(); const perr = [];
    p2.on('pageerror', (e) => perr.push(e.message));
    await p2.goto(`http://localhost:${port}/_pipeline_preview.html`, { waitUntil: 'load' });
    await p2.waitForTimeout(500);
    const smoke = await p2.evaluate(() => { try { selectMode('practice'); startTest(); } catch (e) { return { err: e.message }; } return { gaps: document.querySelectorAll('.heading-gap.match-slot').length, qs: document.querySelectorAll('[id^="q-container-"]').length, total: TOTAL_QUESTIONS, okFn: typeof nightAnsOk === 'function' && nightAnsOk('food consumption', '(food) consumption') && nightAnsOk('1000kg', '1,000 kg') && nightAnsOk('flavor', 'flavour / flavor') }; });
    fs.unlinkSync(tmp);
    perr.forEach((m) => E('Lỗi khi chạy thử đề: ' + m));
    if (smoke.err) E('Không bắt đầu làm bài được: ' + smoke.err);
    else {
      const nH = spec.passages.reduce((t, p) => t + p.groups.filter((g) => g.type === 'heading').reduce((s, g) => s + g.questions.length, 0), 0);
      if (smoke.gaps !== nH) E(`Chạy thử: có ${smoke.gaps} ô kéo heading, cần ${nH}`);
      if (smoke.total !== 40) E(`Chạy thử: đề có ${smoke.total} câu`);
      if (!smoke.okFn) E('Chạy thử: hàm chấm điền từ linh hoạt không chạy đúng');
    }
    if (!errors.length && WRITE) {
      const pre = (spec.meta.source || 'cambridge') === 'cambridge' ? 'cam' : 'real';
      const book = String(parseInt(spec.meta.book, 10)), tn = String(parseInt(spec.meta.testNum, 10));
      const rel = `reading/${pre}${book}/test${tn}.html`;
      fs.mkdirSync(path.join(ROOT, path.dirname(rel)), { recursive: true });
      fs.writeFileSync(path.join(ROOT, rel), html);
      const mf = path.join(ROOT, 'reading/manifest.json'), M = JSON.parse(fs.readFileSync(mf, 'utf8'));
      M.reading = M.reading || {}; M.reading[pre] = M.reading[pre] || {}; M.reading[pre][book] = M.reading[pre][book] || {};
      M.reading[pre][book][tn] = rel;
      fs.writeFileSync(mf, JSON.stringify(M, null, 2) + '\n');
      console.log('ĐÃ GHI: ' + rel + ' (+ manifest)');
    }
  } finally { await br.close(); srv.close(); }
  report();
})();
function report() {
  console.log(`\n=== KIỂM ĐỊNH: ${errors.length} lỗi, ${warns.length} cảnh báo ===`);
  errors.forEach((m) => console.log('  ✗ ' + m));
  warns.forEach((m) => console.log('  ! ' + m));
  if (!errors.length) console.log('  ✓ Đạt' + (WRITE ? '' : ' (chưa ghi — thêm --write để ghi đề)'));
  process.exitCode = errors.length ? 1 : 0;
}
