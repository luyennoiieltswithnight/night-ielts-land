/* Gom từ vựng + câu trắc nghiệm của các khoá học thành games/data-<khoá>.json cho các game học tập.
   Chạy lại mỗi khi thêm buổi mới: node tools/build-games-data.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const COURSES = { giaotiep: 'Giao tiếp Thực chiến', speaking6: 'IELTS Speaking 6.0', writing: 'IELTS Writing 6.0 → 8.0', chuyende: '25 Chuyên đề' };
const str = '"((?:[^"\\\\]|\\\\.)*)"';
const field = (o, k) => { const m = o.match(new RegExp('(?:"' + k + '"|\\b' + k + ')\\s*:\\s*' + str)); return m ? JSON.parse('"' + m[1] + '"') : ''; };
const clean = t => String(t || '').replace(/<[^>]+>/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
const index = {};
for (const key of Object.keys(COURSES)) {
  const dir = path.join(ROOT, 'khoahoc', key); if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => /^buoi-\d+\.html$/.test(f)).sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)));
  const lessons = [];
  for (const f of files) {
    const n = parseInt(f.match(/\d+/)), s = fs.readFileSync(path.join(dir, f), 'utf8');
    const title = clean((s.match(/<title>([^<]*)<\/title>/) || [])[1] || ('Buổi ' + n)).replace(/\s*[·|–-]\s*Night IELTS.*$/i, '').replace(/^Night IELTS\s*[—–-]\s*/i, '');
    const words = [], seen = new Set(), mcq = [];
    for (const m of s.matchAll(/\{[^{}]*?(?:"word"|\bword)\s*:\s*"[^{}]*?(?:"meaning"|\bmeaning)\s*:\s*"[^{}]*\}/g)) {
      const o = m[0], w = clean(field(o, 'word')), mm = clean(field(o, 'meaning'));
      if (!w || !mm || seen.has(w.toLowerCase()) || w.length > 40) continue; seen.add(w.toLowerCase());
      words.push([w, field(o, 'phonetic'), mm, clean(field(o, 'example')), field(o, 'ira')]);
    }
    for (const m of s.matchAll(/\{[^{}]*?(?:"q"|\bq)\s*:\s*"[^{}]*?(?:"options"|\boptions)\s*:\s*(\[[^\]]*\])\s*,\s*(?:"answer"|\banswer)\s*:\s*(\d+)[^{}]*\}/g)) {
      try {
        const q = clean(field(m[0], 'q')), opts = JSON.parse(m[1]).map(clean), a = +m[2];
        if (q && opts.length >= 2 && opts.length <= 4 && a < opts.length && q.length <= 160 && opts.every(x => x && x.length <= 40)) mcq.push([q, opts, a, clean(field(m[0], 'explain')).slice(0, 160)]);
      } catch (e) {}
    }
    if (words.length || mcq.length) lessons.push({ n, title, words, mcq });
  }
  fs.writeFileSync(path.join(ROOT, 'games', 'data-' + key + '.json'), JSON.stringify({ key, name: COURSES[key], lessons }));
  index[key] = { name: COURSES[key], lessons: lessons.map(l => [l.n, l.title, l.words.length, l.mcq.length]) };
  console.log(key, 'lessons', lessons.length, 'words', lessons.reduce((a, l) => a + l.words.length, 0), 'mcq', lessons.reduce((a, l) => a + l.mcq.length, 0));
}
fs.writeFileSync(path.join(ROOT, 'games', 'index.json'), JSON.stringify(index));
