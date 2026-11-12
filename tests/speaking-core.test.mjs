// Chạy: node tests/speaking-core.test.mjs  (không cần mạng; kiểm tra phần lõi SPCore trong speaking.html)
// Tuỳ chọn: node tests/speaking-core.test.mjs path/to/old-speaking.html  -> so sánh band V10 vs V11
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
function loadCore(file) {
  const s = fs.readFileSync(file, 'utf8');
  const a = s.indexOf('<script id="sp-core">') + '<script id="sp-core">'.length;
  const body = s.slice(a, s.indexOf('</script>', a));
  const root = {};
  new Function('window', body)(root);
  return root.SPCore || globalThis.SPCore;
}
const SP = loadCore(path.join(here, '..', 'speaking.html'));
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); } }
const ids = crit => [4, 5, 6, 7, 8, 9].flatMap(b => SP.CHECKLIST[crit][b].map(it => ({ id: it[0], band: b })));
const ticks = (crit, f) => ids(crit).map(x => ({ id: x.id, status: f(x.band, x.id) }));

console.log('1. Luật tính band từ ô tích');
t('đạt hết tới band 7, band 8 trượt -> 7', () => assert.equal(SP.checklistBand('grammar', ticks('grammar', b => b <= 7 ? 'yes' : 'no')).band, 7));
t('band 8 chỉ có 2 ô chấm được, cả 2 ✓ -> đạt 8', () => {
  const tk = ticks('lexical', (b, id) => b <= 7 ? 'yes' : b === 8 ? (id === 'L8a' || id === 'L8b' ? 'yes' : 'na') : 'no');
  // L8: 2 ✓ / 2 chấm được = 100% -> đạt 8 thật -> 8 (không phải 7.5)
  assert.equal(SP.checklistBand('lexical', tk).band, 8);
});
t('band kế tiếp 40% nhưng có 2 ô ✗ -> KHÔNG cộng nửa band (V11)', () => {
  const tk = ticks('grammar', (b, id) => b <= 6 ? 'yes' : b === 7 ? ({ G7a: 'yes', G7b: 'partly', G7c: 'partly', G7d: 'no', G7e: 'no' })[id] : 'na');
  const r = SP.checklistBand('grammar', tk);
  assert.equal(r.band, 6);
});
t('V12: band 7 có 1 ✓ + 2 ½ + 1 ✗ (63%) -> đạt 7 (nới từ 70% xuống 60%, ½ = ¾ ô)', () => {
  const tk = ticks('grammar', (b, id) => b <= 6 ? 'yes' : b === 7 ? ({ G7a: 'yes', G7b: 'partly', G7c: 'partly', G7d: 'no', G7e: 'na' })[id] : 'na');
  assert.equal(SP.checklistBand('grammar', tk).band, 7);
});
t('band kế tiếp ~1/3, 1 ô ✗ -> cộng nửa band', () => {
  const tk = ticks('grammar', (b, id) => b <= 6 ? 'yes' : b === 7 ? ({ G7a: 'yes', G7b: 'no', G7c: 'partly', G7d: 'na', G7e: 'na' })[id] : 'na');
  assert.equal(SP.checklistBand('grammar', tk).band, 6.5);
});
t('V12: 1 band trượt lẻ (band 6 trượt nhưng band 7 đạt) không chặn -> 7', () => {
  const tk = ticks('lexical', (b, id) => b === 6 ? 'no' : b <= 7 ? 'yes' : 'na');
  assert.equal(SP.checklistBand('lexical', tk).band, 7);
});
t('V12: 2 band trượt liền nhau vẫn chặn', () => {
  const tk = ticks('lexical', (b, id) => b === 6 || b === 7 ? 'no' : 'yes');
  assert.equal(SP.checklistBand('lexical', tk).band, 5);
});
t('band 8 cần ≥ 2 ô ✓: 1 ✓ + 3 ½ (62%) -> không đạt 8', () => {
  const tk = ticks('fluency', (b, id) => b <= 7 ? 'yes' : b === 8 ? (id === 'F8a' ? 'yes' : 'partly') : 'na');
  assert.ok(SP.checklistBand('fluency', tk).band < 8);
});
t('toàn ô "–" (thiếu bằng chứng) -> KHÔNG thành điểm 3, trả null + insufficient', () => {
  const r = SP.checklistBand('pronunciation', ticks('pronunciation', () => 'na'));
  assert.equal(r.band, null); assert.equal(r.insufficient, true);
});
t('toàn ô "–" nhưng AI có band tự cho -> dùng band AI, đánh dấu insufficient', () => {
  const r = SP.checklistBand('pronunciation', ticks('pronunciation', () => 'na'), 6);
  assert.equal(r.band, 6); assert.equal(r.insufficient, true);
});
t('band 4 trượt rõ -> 3 / 3.5 (không lấy band AI cao hơn)', () => {
  assert.equal(SP.checklistBand('grammar', ticks('grammar', () => 'no'), 6).band, 3);
  const tk = ticks('grammar', (b, id) => b === 4 ? ({ G4a: 'yes', G4b: 'partly', G4c: 'no' })[id] : 'no');
  assert.equal(SP.checklistBand('grammar', tk, 6).band, 3.5);
});
t('V12: điểm tổng làm tròn kiểu IELTS (.25 -> .5, .75 -> lên)', () => {
  assert.equal(SP.overallBand({ fluency: 7, lexical: 7, grammar: 6.5, pronunciation: 6.5 }), 7);
  assert.equal(SP.overallBand({ fluency: 6, lexical: 6.5, grammar: 6.5, pronunciation: 6 }), 6.5);
  assert.equal(SP.overallBand({ fluency: 6, lexical: 6.5, grammar: 6, pronunciation: 6 }), 6);
  assert.equal(SP.overallBand({ fluency: 6, lexical: 6, grammar: 6, pronunciation: null }), null);
});

console.log('2. Chuẩn hoá kết quả AI (JSON thiếu / sai)');
t('JSON rỗng không làm hỏng, không bịa điểm', () => {
  const n = SP.normalizeScoring({}, true, 'low', null);
  assert.equal(n.scores.fluency, null); assert.equal(n.scores.overall, null);
});
t('định dạng gọn {"F4a":"y"} được đọc đúng', () => {
  const checks = {}; ids('fluency').forEach(x => { checks[x.id] = x.band <= 6 ? 'y' : 'n'; });
  const n = SP.normalizeScoring({ criteria: { fluency: { checks, band: 7 } } }, true, 'low', null);
  // V12: ô tích cho 6, AI ấn tượng 7 -> không thấp hơn 7 - 0.5
  assert.equal(n.criteria.fluency.band, 6.5); assert.equal(n.criteria.fluency.llmBand, 7);
});
t('chỗ sửa vô nghĩa bị lọc (chỉ khác dấu câu / lặp từ)', () => {
  const n = SP.normalizeScoring({ edits: [{ find: 'go shopping', replace: 'Go shopping.', criterion: 'grammar' }, { find: 'blend food when I eat', replace: 'eat food when I eat', criterion: 'lexical' }, { find: 'he go', replace: 'he goes', criterion: 'grammar', status: 'likely' }] }, true, 'low', null);
  assert.deepEqual(n.edits.map(e => e.replace), ['he goes']);
});

console.log('3. Phát âm: tự tích ô có giới hạn + nguồn bằng chứng');
const pe = (o) => Object.assign({ evidence_strength: 'groq_intent', words_heard: 80, pct_words_affected: 1, likely_mispronounced: [], sentence_stress: { contentLouderDb: 4 }, weak_forms: { functionVsContentDurRatio: 0.7 }, linking: { opportunities: 6, linked: 5 }, intonation: { phrasesJudged: 5, phrasesWithPitchMovement: 4 }, mean_words_between_pauses: 8 }, o);
t('nói rõ, trôi chảy: tự tích không vượt band 7 (P8a ≤ một phần, P9a không tự tích)', () => {
  const a = SP.pronAutoTicks(pe({}));
  assert.equal(a.P7a.status, 'yes'); assert.equal(a.P8a.status, 'partly'); assert.equal(a.P9a, undefined);
  assert.equal(a.P8b.status, 'partly'); assert.equal(a.P7c.status, 'partly');
  assert.ok(a.P7a.evidence.startsWith('🎧')); assert.ok(a.P6b.evidence.startsWith('📏'));
});
t('V12: giọng Việt dễ hiểu (8% từ bị nghe nhầm) -> P6a, P7a đạt', () => {
  const a = SP.pronAutoTicks(pe({ pct_words_affected: 8 }));
  assert.equal(a.P6a.status, 'yes'); assert.equal(a.P7a.status, 'yes'); assert.equal(a.P4a.status, 'yes');
});
t('V12: 2 máy nghe khớp hoàn toàn -> P7a đạt, P8a một phần', () => {
  const a = SP.pronAutoTicks(pe({ evidence_strength: 'asr_agree', pct_words_affected: 0 }));
  assert.equal(a.P6a.status, 'yes'); assert.equal(a.P7a.status, 'yes'); assert.equal(a.P8a.status, 'partly');
});
t('V12: Phát âm nghe hiểu được -> không thấp hơn tiêu chí cao nhất, ≥ trung bình + 0.5', () => {
  const c = (b) => { const o = {}; ids('fluency').forEach(x => { o[x.id] = x.band <= b ? 'y' : 'n'; }); return o; };
  const mk = (crit, b) => { const o = {}; ids(crit).forEach(x => { o[x.id] = x.band <= b ? 'y' : 'n'; }); return o; };
  const n = SP.normalizeScoring({ criteria: { fluency: { checks: mk('fluency', 6) }, lexical: { checks: mk('lexical', 6) }, grammar: { checks: mk('grammar', 5) }, pronunciation: { checks: mk('pronunciation', 5) } } }, true, 'low', pe({ pct_words_affected: 6 }));
  assert.equal(n.criteria.pronunciation.band, 6.5);
  assert.ok(n.scores.pronunciation >= n.scores.fluency);
});
t('V12: Phát âm nghe nhầm nhiều (30%) -> chỉ nâng tới trung bình', () => {
  const mk = (crit, b) => { const o = {}; ids(crit).forEach(x => { o[x.id] = x.band <= b ? 'y' : 'n'; }); return o; };
  const n = SP.normalizeScoring({ criteria: { fluency: { checks: mk('fluency', 6) }, lexical: { checks: mk('lexical', 6) }, grammar: { checks: mk('grammar', 6) }, pronunciation: { checks: mk('pronunciation', 4) } } }, true, 'low', pe({ pct_words_affected: 30 }));
  assert.equal(n.criteria.pronunciation.band, 6);
});
t('ồn nền: số đo không tin cậy (null) -> không tự tích ô ngữ điệu / nối âm', () => {
  const a = SP.pronAutoTicks(pe({ sentence_stress: { contentLouderDb: null }, linking: null, intonation: null, weak_forms: { functionVsContentDurRatio: null } }));
  ['P4b', 'P5b', 'P6b', 'P7b', 'P7c', 'P8b'].forEach(id => assert.equal(a[id], undefined, id));
});
t('bài quá ngắn (< 15 từ) -> không tự tích ô độ dễ nghe', () => {
  const a = SP.pronAutoTicks(pe({ words_heard: 10 }));
  assert.equal(a.P4a, undefined);
});
t('phân loại nguồn bằng chứng A/B/C/D', () => {
  const c = SP.pronEvidenceClasses(pe({ linking: null }));
  assert.ok(c.A.includes('sentence_stress')); assert.ok(c.D.includes('linking')); assert.ok(c.B.length && c.C.length);
  assert.ok(c.D.includes('individual vowel/consonant quality'));
});

console.log('4. So 2 lần nghe (Whisper)');
const W = (txt, t0 = 0) => txt.split(' ').map((w, i) => ({ w, s: t0 + i * 0.4, e: t0 + i * 0.4 + 0.3 }));
t('khác nhau nghe na ná -> sound_alike; khác hẳn -> lexical_difference', () => {
  const f1 = SP.speechFindings({ A: W('I like to walk in the office every day'), B: W('I like to work in the office every day') });
  assert.equal(f1[0].subtype, 'sound_alike');
  const f2 = SP.speechFindings({ A: W('I like to swim in the office every day'), B: W('I like to read in the office every day') });
  assert.equal(f2[0].subtype, 'lexical_difference');
  assert.ok(f1.concat(f2).every(f => f.status === 'uncertain'));
});
t('từ chỉ có ở lần 1, nằm trong đoạn im lặng -> possible_hallucination', () => {
  const A = W('I usually cook dinner at home thank you'), B = W('I usually cook dinner at home');
  const voiced = new Array(200).fill(false); for (let k = 0; k < 120; k++) voiced[k] = true; // tiếng nói tới 2.4s
  const f = SP.speechFindings({ A, B, audio: { voiced } });
  assert.equal(f[0].subtype, 'possible_hallucination');
});
t('đuôi -s chỉ do đo âm (2 máy cùng nghe có -s) -> uncertain, không tính lỗi ngữ pháp', () => {
  const A = W('there are many students in my class'), B = A;
  const x16 = new Float32Array(16000 * 4); for (let i = 0; i < x16.length; i++) x16[i] = 0.3 * Math.sin(i / 8); // toàn nguyên âm, không tiếng xì
  const f = SP.speechFindings({ A, B, x16, noiseDb: -80 });
  const fs_ = f.filter(x => x.category === 'final_s');
  assert.ok(fs_.length >= 1); assert.ok(fs_.every(x => x.status === 'uncertain'));
});
t('bỏ qua AI đoán ý chỉ khi 2 lần nghe khớp hết và Whisper tự tin', () => {
  const A = W('I usually cook dinner at home with my family'), seg = [{ avgLogprob: -0.2, noSpeechProb: 0.01 }];
  assert.equal(SP.decodesAgree({ words: A, segments: seg }, { words: A }, []), true);
  assert.equal(SP.decodesAgree({ words: A, segments: [{ avgLogprob: -0.9 }] }, { words: A }, []), false);
  assert.equal(SP.decodesAgree({ words: A, segments: seg }, null, []), false);
  assert.equal(SP.decodesAgree({ words: A, segments: seg }, { words: A }, [{ category: 'asr_disagreement' }]), false);
});
t('bản rút gọn findings gửi AI không có thời gian / nguồn', () => {
  const c = SP.compactFindings([{ category: 'asr_disagreement', subtype: 'sound_alike', asr: 'walk', alt: 'work', likely: null, status: 'uncertain', time: 3.2, source: 'two_decodes', segment: 'walk' }]);
  assert.deepEqual(c[0], { cat: 'asr_disagreement:sound_alike', heard: 'walk', alt: 'work', status: 'uncertain' });
});

console.log('5. Chất lượng ghi âm');
t('ghi âm quá ngắn / ồn -> từ chối hoặc không chấm phát âm', () => {
  assert.equal(SP.qualityCheck({ duration: 0.5, peak: 0.5, speechSec: 0.3, clipRatio: 0, snrDb: 30 }).canScore, false);
  const q = SP.qualityCheck({ duration: 10, peak: 0.5, speechSec: 8, clipRatio: 0, snrDb: 8 });
  assert.equal(q.canScore, true); assert.equal(q.pronunciationReliable, false);
});

const oldFile = process.argv[2];
if (oldFile) {
  console.log('6. So sánh V10 (' + oldFile + ') với V11 — cùng bộ ô tích');
  const OLD = loadCore(oldFile);
  const cases = {
    'đạt tới 6, band 7 một phần có 2 ô ✗': ticks('grammar', (b, id) => b <= 6 ? 'yes' : b === 7 ? ({ G7a: 'yes', G7b: 'partly', G7c: 'partly', G7d: 'no', G7e: 'no' })[id] : 'na'),
    'toàn "–" (thiếu bằng chứng)': ticks('grammar', () => 'na'),
    'band 4 trượt, AI tự cho 6': ticks('grammar', () => 'no')
  };
  Object.entries(cases).forEach(([k, tk]) => console.log('   ' + k + ': V10 = ' + OLD.checklistBand('grammar', tk, 6).band + ' | V11 = ' + SP.checklistBand('grammar', tk, 6).band));
  const a10 = OLD.pronAutoTicks(pe({})), a11 = SP.pronAutoTicks(pe({}));
  console.log('   Phát âm nói rõ (1% từ nghe nhầm): V10 P8a=' + (a10.P8a || {}).status + ' P9a=' + (a10.P9a || {}).status + ' P8b=' + (a10.P8b || {}).status + ' | V11 P8a=' + (a11.P8a || {}).status + ' P9a=' + (a11.P9a || {}).status + ' P8b=' + (a11.P8b || {}).status);
  const pc = SP.CHECKLIST.pronunciation;
  const band = (A) => { const c = SP.fillPronChecks([], pe({})); return null; };
  const b10 = OLD.checklistBand('pronunciation', OLD.fillPronChecks([], pe({}))).band, b11 = SP.checklistBand('pronunciation', SP.fillPronChecks([], pe({}))).band;
  console.log('   Phát âm chỉ dùng ô tự tích (AI để "–" hết): V10 = ' + b10 + ' | V11 = ' + b11);
}
console.log('\n' + pass + ' đạt, ' + fail + ' lỗi');
process.exit(fail ? 1 : 0);
