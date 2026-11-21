/* Tạo parts-index.json: danh sách từng Passage (Reading) / Section (Listening) của mọi đề,
   kèm tên bài, dạng câu hỏi, số câu — để trang luyen-phan.html tìm và mở làm lẻ.
   Chạy: node tools/build-parts-index.js (tự chạy lại mỗi khi thêm đề mới) */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const TYPE_VI = { tfng: 'True/False/Not Given', ynng: 'Yes/No/Not Given', mcq: 'Trắc nghiệm', multi: 'Chọn nhiều đáp án', text: 'Điền từ', heading: 'Matching Headings', list_match: 'Nối thông tin', wordbank: 'Điền từ có sẵn', grid: 'Nối bảng', table: 'Điền bảng', map: 'Bản đồ / sơ đồ', diagram: 'Sơ đồ' };
function grabArray(html, name) {
  const i = html.indexOf('const ' + name + ' = '); if (i < 0) return null;
  let j = i + name.length + 9, depth = 0, k = j, inStr = false, esc = false;
  for (; k < html.length; k++) {
    const c = html[k];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true; else if (c === '[') depth++; else if (c === ']') { depth--; if (!depth) break; }
  }
  try { return JSON.parse(html.slice(j, k + 1)); } catch (e) { return null; }
}
function kindOf(g) {
  const t = g.type || '', ins = (g.instruction || '').toLowerCase();
  if (t === 'tfng' && /yes|no/.test(ins) && !/true/.test(ins)) return 'ynng';
  if (/heading/.test(ins)) return 'heading';
  if (/map|plan/.test(ins) && t !== 'text') return 'map';
  if (/diagram|flow/.test(ins)) return 'diagram';
  return t;
}
const out = [];
for (const skill of ['reading', 'listening']) {
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, skill, 'manifest.json'), 'utf8'))[skill];
  for (const set of Object.keys(man)) for (const book of Object.keys(man[set])) for (const test of Object.keys(man[set][book])) {
    let rel = man[set][book][test]; if (rel && typeof rel === 'object') rel = rel.url || rel.path || rel.file || Object.values(rel).find(v => typeof v === 'string' && /\.html$/.test(v));
    if (!rel) continue;
    const file = path.join(ROOT, rel); if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8'), qd = grabArray(html, 'questionsData'); if (!qd) continue;
    let n = 0;
    qd.forEach((groups, pi) => {
      const start = n + 1; let types = [];
      groups.forEach(g => { n += (g.questions || []).length; const k = kindOf(g); if (k && !types.includes(k)) types.push(k); });
      let title = '';
      if (skill === 'reading') { const m = html.match(new RegExp('id="passage-' + (pi + 1) + '-text"[^>]*data-title="([^"]*)"')); title = m ? m[1] : ''; }
      else { const g0 = groups[0] || {}; const t = (g0.notesTemplate || g0.title || '').split('\n').map(s => s.trim()).find(Boolean) || ''; title = t.replace(/<[^>]+>/g, '').slice(0, 70); }
      out.push({ skill, set, book, test: +test, part: pi + 1, title, types, labels: types.map(t => TYPE_VI[t] || t), q: [start, n], url: rel });
    });
  }
}
fs.writeFileSync(path.join(ROOT, 'parts-index.json'), JSON.stringify(out));
console.log('parts:', out.length, 'reading', out.filter(x => x.skill === 'reading').length, 'listening', out.filter(x => x.skill === 'listening').length);
