/* Dựng đề Listening từ file DSL bằng chính parseTemplate()/buildTestHTML() của homework/test-builder-listening.html.
   node build.js <dsl.txt> [--key key.json] [--marks 0,472.6,909.9,1330.1] [--audio file.mp3] [--write]
   Kiểm: đủ 4 section, 40 câu, đáp án khớp key (nếu có), loc tìm thấy, chạy thử đề không lỗi. */
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..');
const a = process.argv.slice(2), dslPath = a[0];
const arg = (n) => { const i = a.indexOf(n); return i > -1 ? a[i + 1] : null; };
const WRITE = a.includes('--write');
const errors = [], warns = [];
const E = (m) => errors.push(m), W = (m) => warns.push(m);
function report() {
  console.log(`\n=== KIỂM ĐỊNH: ${errors.length} lỗi, ${warns.length} cảnh báo ===`);
  errors.forEach((m) => console.log('  ✗ ' + m)); warns.forEach((m) => console.log('  ! ' + m));
  if (!errors.length) console.log('  ✓ Đạt' + (WRITE ? '' : ' (chưa ghi — thêm --write)'));
  process.exitCode = errors.length ? 1 : 0;
}
function serve() { return new Promise((res) => { const s = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, () => res(s)); }); }
(async () => {
  const dsl = fs.readFileSync(dslPath, 'utf8');
  const marks = (arg('--marks') || '0,null,null,null').split(',').map((x) => (x === 'null' ? null : parseFloat(x)));
  if (WRITE && marks.some((m) => m == null)) E('Thiếu --marks 4 mốc section khi --write');
  const key = arg('--key') ? JSON.parse(fs.readFileSync(arg('--key'), 'utf8')) : null;
  const srv = await serve(), port = srv.address().port, br = await chromium.launch();
  let html = null, meta = null;
  try {
    const ctx = await br.newContext();
    await ctx.route('**/*', (r) => (r.request().url().startsWith('http://localhost:' + port) ? r.continue() : r.fulfill({ body: '' })));
    const pg = await ctx.newPage(); const perrB = []; pg.on('pageerror', (e) => perrB.push(e.message));
    await pg.goto(`http://localhost:${port}/homework/test-builder-listening.html`, { waitUntil: 'domcontentloaded' });
    const out = await pg.evaluate(({ dsl, marks }) => {
      const { state, warnings } = parseTemplate(dsl);
      if (!state.meta.title) state.meta.title = 'Test ' + state.meta.testNum;
      state.audio.fileName = 'x.mp3'; state.audio.sectionMarks = { 1: marks[0], 2: marks[1], 3: marks[2], 4: marks[3] };
      testState = state;
      const r = buildTestHTML(state);
      const answers = []; state.sections.forEach((s) => s.groups.forEach((g) => g.questions.forEach((q) => answers.push(q.answer))));
      const perSec = state.sections.map((s) => s.groups.reduce((t, g) => t + g.questions.length, 0));
      const noTr = state.sections.map((s, i) => (s.transcript || '').trim().length < 500 ? i + 1 : 0).filter(Boolean);
      return { html: r.html, bw: r.warnings, pw: warnings, answers, perSec, noTr, meta: state.meta, total: r.total };
    }, { dsl, marks });
    perrB.forEach((m) => E('Lỗi trình tạo: ' + m));
    html = out.html; meta = out.meta;
    out.pw.forEach((w) => W('Parse: ' + w));
    out.bw.forEach((w) => (/không tìm thấy|chưa nhập đáp án|chỗ trống|cột|lựa chọn|không khớp|chưa có transcript/i.test(w) ? E('Builder: ' + w) : W('Builder: ' + w)));
    if (out.perSec.join() !== '10,10,10,10') E('Số câu mỗi section: ' + out.perSec.join('/') + ' (cần 10/10/10/10)');
    if (out.total !== 40) E('Tổng ' + out.total + ' câu (cần 40)');
    if (out.noTr.length) E('Transcript ngắn/thiếu ở section: ' + out.noTr.join(','));
    if (key) {
      const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
      key.forEach((k, i) => { const mine = String(out.answers[i] || '').split('|').map(norm); if (!mine.includes(norm(k.split('|')[0]))) E(`Câu ${i + 1}: đáp án "${out.answers[i]}" ≠ sách "${k}"`); });
      if (key.length !== out.answers.length) E(`Key ${key.length} ≠ ${out.answers.length} câu`);
    } else W('Không có --key: chưa so với đáp án sách');
    // đáp án điền từ phải xuất hiện trong transcript của đúng section (cảnh báo)
    const chk = await pg.evaluate(() => { const r = []; let n = 0; testState.sections.forEach((s, si) => s.groups.forEach((g) => g.questions.forEach((q) => { n++; if (['text', 'wordbank', 'table', 'flowchart', 'short'].includes(g.type) && q.answer) { const t = (s.transcript || '').toLowerCase().replace(/[‘’]/g, "'"); const ok = q.answer.split('|').some((v) => t.includes(v.toLowerCase().trim().replace(/[‘’]/g, "'"))); if (!ok) r.push(`Câu ${n} (S${si + 1}): "${q.answer}" không có nguyên văn trong transcript`); } }))); return r; });
    chk.forEach((m) => W(m));
    // chạy thử
    const tmp = path.join(ROOT, '_lis_preview.html'); fs.writeFileSync(tmp, html);
    const p2 = await ctx.newPage(); const perr = []; p2.on('pageerror', (e) => perr.push(e.message));
    await p2.goto(`http://localhost:${port}/_lis_preview.html`, { waitUntil: 'load' }); await p2.waitForTimeout(500);
    const sm = await p2.evaluate(() => { try { selectMode('practice'); startTest(); } catch (e) { return { err: e.message }; } return { qs: document.querySelectorAll('.q-circle').length, inputs: document.querySelectorAll('input[type=text],input:not([type]),select').length }; });
    fs.unlinkSync(tmp);
    perr.forEach((m) => E('Lỗi khi chạy thử: ' + m)); if (sm.err) E('Không bắt đầu làm bài: ' + sm.err); else if (sm.qs < 40) E('Chạy thử: chỉ thấy ' + sm.qs + ' câu');
    if (!errors.length && WRITE) {
      const pre = meta.source === 'cambridge' ? 'cam' : 'real', book = String(parseInt(meta.book, 10)), tn = String(parseInt(meta.testNum, 10));
      const dir = path.join(ROOT, `listening/${pre}${book}`); fs.mkdirSync(dir, { recursive: true });
      const au = arg('--audio'); if (au) fs.copyFileSync(au, path.join(dir, `test${tn}-audio.mp3`)); else W('Không có --audio');
      fs.writeFileSync(path.join(dir, `test${tn}.html`), html);
      const mf = path.join(ROOT, 'listening/manifest.json'), M = JSON.parse(fs.readFileSync(mf, 'utf8'));
      M.listening[pre] = M.listening[pre] || {}; M.listening[pre][book] = M.listening[pre][book] || {};
      M.listening[pre][book][tn] = { path: `listening/${pre}${book}/test${tn}.html`, title: `Test ${tn}` };
      fs.writeFileSync(mf, JSON.stringify(M, null, 2) + '\n'); console.log(`ĐÃ GHI: listening/${pre}${book}/test${tn}.html`);
    }
  } finally { await br.close(); srv.close(); }
  report();
})();
