/**
 * NIGHT IELTS — Máy chủ AI DUY NHẤT của cả web (từ 11/2026: 1 key OpenAI của thầy; Groq chỉ còn dự phòng)
 *
 * MỘT KEY CHO TẤT CẢ: mọi trang (Speaking, Writing, từ vựng, khu vườn, khoá học…) gọi AI đều đi qua máy chủ này.
 *   - Thuộc tính tập lệnh OPENAI_API_KEY = sk-… (key OpenAI đã nạp tiền trước) → dùng OpenAI.
 *     Tuỳ chọn: OPENAI_CHAT_MODEL (mặc định gpt-4.1-mini), OPENAI_STT_MODEL (mặc định whisper-1 — có mốc thời gian từng từ).
 *   - Nếu OpenAI lỗi quá tải (429 / 5xx) mà vẫn còn GROQ_API_KEY → tự thử lại bằng Groq (học viên không thấy lỗi).
 *   - Admin / Pro / Astra / Học sinh: không giới hạn. User miễn phí: chỉ chấm Speaking, FREE_PER_DAY lượt/ngày.
 *
 * (Ghi chú cũ, vẫn đúng với phần dự phòng Groq:)
 * NIGHT IELTS — Máy chủ AI miễn phí cho tài khoản User (Groq, key của thầy)
 * Project Apps Script RIÊNG (không đụng project thông báo / gửi mail).
 *
 * Vì sao cần: nếu để key Groq trong trang web, ai bấm F12 cũng lấy được key. Ở đây key nằm trong
 * Apps Script, trang web chỉ gửi bài lên, máy chủ kiểm tra đăng nhập + giới hạn rồi mới gọi Groq.
 *
 * Giới hạn (từ 11/2026): tài khoản User chỉ được AI chấm SPEAKING, mỗi ngày FREE_PER_DAY lượt chấm.
 *   - 1 lượt = 1 lần bấm "Chấm điểm": trang gửi charge:true ở lần nhận dạng giọng nói đầu tiên, máy chủ
 *     trừ 1 lượt và mở "vé" cho các lần gọi AI tiếp theo của chính lần chấm đó (TICKET_CALLS lần, TICKET_MIN phút).
 *   - Writing và mọi tính năng AI khác: chỉ dành cho Pro / Astra (key riêng), máy chủ này từ chối.
 *   - Cả hệ thống tối đa DAILY_CAP lần gọi / ngày để key của thầy không bị quá tải.
 *
 * ===================== CÀI ĐẶT (làm 1 lần) =====================
 * 1. script.google.com → Dự án mới → dán file này vào Code.gs.
 *    Bật "Hiện tệp kê khai appsscript.json" trong Cài đặt dự án, dán nội dung appsscript.json đi kèm.
 * 2. Cài đặt dự án → Thuộc tính tập lệnh → Thêm: GROQ_API_KEY = (key Groq của thầy).
 *    NHIỀU KEY: dán nhiều key vào cùng ô, cách nhau bằng dấu phẩy (gsk_aaa,gsk_bbb,gsk_ccc)
 *    hoặc thêm thuộc tính GROQ_API_KEY_2, GROQ_API_KEY_3... Máy chủ chia lượt lần lượt cho các key;
 *    key nào bị bận (429/413/5xx) thì tự chuyển sang key kế tiếp và tạm "nghỉ" key đó khoảng 1 phút.
 *    Lưu ý: giới hạn của Groq tính theo TÀI KHOẢN (organization), nhiều key trong cùng 1 tài khoản
 *    vẫn dùng chung 1 hạn mức.
 * 3. Triển khai → Tùy chọn triển khai mới → Loại: Ứng dụng web
 *      Thực thi với tư cách: Tôi · Người có quyền truy cập: Bất kỳ ai → Triển khai → Cho phép.
 * 4. Copy "URL ứng dụng web" (…/exec) → trang chủ Night IELTS → 👑 Tài khoản → Cài đặt → dán vào
 *    "Link máy chủ AI miễn phí" → Lưu.
 * Sửa code sau này: Triển khai → Quản lý triển khai → ✏️ → Phiên bản: Phiên bản mới (giữ nguyên URL).
 *
 * ===================== FIRESTORE RULES (Firebase Console → Firestore → Rules) =====================
 * Thêm hàm + các khối dưới vào trong `match /databases/{database}/documents { … }`, và THAY khối
 * `match /users/{uid}` cũ (nếu có) bằng khối mới. Mục đích: không ai tự đổi role của mình thành Pro.
 *
 *   function signedIn() { return request.auth != null; }
 *   function isAdmin() { return signedIn() &&
 *     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'; }
 *
 *   match /users/{uid} {
 *     allow read: if signedIn();
 *     allow create: if isAdmin() || (signedIn() && request.auth.uid == uid
 *                     && request.resource.data.get('role', 'user') == 'user');
 *     allow update: if (isAdmin() || (signedIn() && request.auth.uid == uid
 *                     && !request.resource.data.diff(resource.data).affectedKeys()
 *                         .hasAny(['role', 'proUntil', 'courses', 'buys', 'tier'])))
 *                  // tài khoản thầy không bao giờ tự bị hạ quyền (chống ghi đè nhầm thành User)
 *                  && !(request.auth.uid == uid && resource.data.role == 'admin'
 *                       && request.resource.data.get('role', '') != 'admin');
 *     allow delete: if isAdmin();
 *   }
 *   match /proRequests/{uid} {
 *     allow read: if isAdmin() || (signedIn() && request.auth.uid == uid);
 *     allow create, update: if isAdmin() || (signedIn() && request.auth.uid == uid
 *                     && request.resource.data.status == 'pending');
 *     allow delete: if isAdmin();
 *   }
 *   match /publicSettings/{id} {
 *     allow read: if true;
 *     allow write: if isAdmin();
 *   }
 *   match /readingEdits/{id} {          // "Sửa đề" Reading: ai cũng đọc, chỉ admin sửa
 *     allow read: if true;
 *     allow write: if isAdmin();
 *   }
 *   (khối "match /{col}/{rest=**}" cuối cùng nhớ thêm 'readingEdits' vào danh sách loại trừ)
 */

const FIREBASE_WEB_KEY = 'AIzaSyCmeN49M4oI78ZPWDhMlbisDOLaMJp2mb8';   // khoá web công khai của Firebase (không phải bí mật)
const WINDOW_MS = 5 * 60 * 60 * 1000;          // 5 tiếng
const LIMITS = { speaking: 300, writing: 300 }; // giây cho mỗi kỹ năng trong 1 cửa sổ 5 tiếng
const CHAT_COST = { speaking: 10, writing: 75 };
const DAILY_CAP = 600;                          // tổng số lần gọi Groq / ngày cho mọi User
const MAX_BODY = 3000000;                       // ký tự, chặn gửi bài quá lớn
const GROQ = 'https://api.groq.com/openai/v1/';
const OPENAI = 'https://api.openai.com/v1/';

function doGet() {
  const n = groqKeys_().length, oa = !!openaiKey_();
  return ContentService.createTextOutput('Night IELTS AI proxy đang chạy ✅' + (oa ? ' · OpenAI (Speaking ' + oaModel_('chat', 'speaking') + ', Writing ' + oaModel_('chat', 'writing') + ') · nghe giọng: Groq trước, OpenAI ' + oaModel_('stt') + ' dự phòng' : ' · CHƯA có OPENAI_API_KEY') + (n ? ' · dự phòng ' + n + ' key Groq' : ''));
}
function openaiKey_() { return String(PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY') || '').trim(); }
/* Speaking + Writing chấm bằng gpt-4.1-mini (~150đ/câu). gpt-5-nano rẻ hơn nhưng chấm quá thấp tay (13/11/2026: bài ~6.5 bị chấm 5.5) → không dùng.
   (gpt-4.1-nano đã bị OpenAI khai tử 11/2026.) Đổi model: thêm Thuộc tính tập lệnh
   OPENAI_SPEAKING_MODEL / OPENAI_CHAT_MODEL / OPENAI_STT_MODEL — không cần sửa code. */
function oaModel_(kind, skill) {
  const P = PropertiesService.getScriptProperties();
  if (kind === 'stt') return P.getProperty('OPENAI_STT_MODEL') || 'whisper-1';
  if (skill === 'speaking') return P.getProperty('OPENAI_SPEAKING_MODEL') || 'gpt-4.1-mini';
  return P.getProperty('OPENAI_CHAT_MODEL') || 'gpt-4.1-mini';
}
function busy_(r) { const c = r ? r.getResponseCode() : 0; return !r || c === 429 || c >= 500; }
/* Gói chat kiểu Groq → OpenAI: đổi model, bỏ tham số riêng của Groq. */
function toOpenAI_(payload, skill) {
  const p = JSON.parse(JSON.stringify(payload));
  p.model = oaModel_('chat', skill);
  ['reasoning_format', 'include_reasoning', 'reasoning_effort', 'service_tier', 'compound_custom', 'documents', 'search_settings', 'citation_options', 'disable_tool_validation'].forEach(function (k) { delete p[k]; });
  if (p.max_tokens && !p.max_completion_tokens) { p.max_completion_tokens = p.max_tokens; }
  delete p.max_tokens;
  return fitModel_(p);
}
/* Họ GPT-5 là model "suy nghĩ": không nhận temperature, phải đặt mức nghĩ thấp nhất cho nhanh + rẻ. */
function fitModel_(p) {
  if (/^gpt-5/.test(p.model)) {
    delete p.temperature; delete p.top_p; delete p.presence_penalty; delete p.frequency_penalty;
    p.reasoning_effort = /^gpt-5-/.test(p.model) || p.model === 'gpt-5' ? 'minimal' : 'none';
  }
  return p;
}
function chat_(payload, skill) {
  let r = null;
  if (openaiKey_()) {
    const p1 = toOpenAI_(payload, skill);
    r = oaChat_(p1);
    if (r.getResponseCode() !== 200 && !busy_(r) && p1.model !== 'gpt-4.1-mini') {   // model bị khai tử / không nhận tham số → dùng gpt-4.1-mini
      console.log('OpenAI ' + p1.model + ' lỗi ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
      const p2 = JSON.parse(JSON.stringify(payload)); const keepTemp = p2.temperature;
      const q = toOpenAI_(p2, skill); q.model = 'gpt-4.1-mini'; delete q.reasoning_effort; if (keepTemp != null) q.temperature = keepTemp;
      r = oaChat_(q);
    }
    if (r.getResponseCode() !== 200) console.log('OpenAI lỗi ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
    if (!busy_(r) || !groqKey_()) return r;
  }
  const gl = JSON.stringify(payload);
  return withKeys_(function (k) {
    return UrlFetchApp.fetch(GROQ + 'chat/completions', { method: 'post', contentType: 'application/json', payload: gl, headers: { Authorization: 'Bearer ' + k }, muteHttpExceptions: true });
  });
}
function oaChat_(p) {
  return UrlFetchApp.fetch(OPENAI + 'chat/completions', { method: 'post', contentType: 'application/json', payload: JSON.stringify(p), headers: { Authorization: 'Bearer ' + openaiKey_() }, muteHttpExceptions: true });
}

const FREE_PER_DAY = 2, TICKET_CALLS = 20, TICKET_MIN = 30;
function today_() { return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd'); }
function dailyQuota_(uid) {
  const n = Number(PropertiesService.getScriptProperties().getProperty('f_' + today_() + '_' + uid) || 0);
  return { skill: 'speaking', kind: 'daily', used: Math.min(n, FREE_PER_DAY), limit: FREE_PER_DAY, resetAt: new Date(Utilities.formatDate(new Date(Date.now() + 86400000), 'Asia/Ho_Chi_Minh', "yyyy-MM-dd'T'00:00:00XXX")).getTime() };
}
/* Trừ 1 lượt + mở vé. Trả false nếu hết lượt. */
function chargeTurn_(uid) {
  const lock = LockService.getScriptLock(); lock.waitLock(8000);
  try {
    const P = PropertiesService.getScriptProperties(), key = 'f_' + today_() + '_' + uid, n = Number(P.getProperty(key) || 0);
    if (n >= FREE_PER_DAY) return false;
    P.setProperty(key, String(n + 1));
    CacheService.getScriptCache().put('tk_' + uid, String(TICKET_CALLS), TICKET_MIN * 60);
    if (Math.random() < 0.05) { const pre = 'f_' + today_(); Object.keys(P.getProperties()).forEach(function (k) { if (k.indexOf('f_') === 0 && k.indexOf(pre) !== 0) P.deleteProperty(k); }); }
    return true;
  } finally { lock.releaseLock(); }
}
function refundTurn_(uid) {
  const P = PropertiesService.getScriptProperties(), key = 'f_' + today_() + '_' + uid, n = Number(P.getProperty(key) || 0);
  if (n > 0) P.setProperty(key, String(n - 1));
}
/* Dùng 1 lần gọi trong vé của lượt chấm hiện tại. */
function useTicket_(uid) {
  const c = CacheService.getScriptCache(), n = Number(c.get('tk_' + uid) || 0);
  if (n <= 0) return false;
  c.put('tk_' + uid, String(n - 1), TICKET_MIN * 60);
  return true;
}

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const user = verify_(req.idToken);
    if (!user) return out_({ error: 'Phiên đăng nhập hết hạn. Tải lại trang rồi thử lại nhé.' });
    if (!openaiKey_() && !groqKey_()) return out_({ error: 'AI đang bảo trì, bạn chờ một lát hoặc nhắn Night IELTS nhé.' });
    const skill = req.skill === 'writing' ? 'writing' : 'speaking';
    const paid = isPaid_(user.uid, req.idToken);   // Pro / Astra còn hạn, chưa được cấp key riêng → dùng key của thầy, không giới hạn lượt
    if (!paid) {
      if (skill !== 'speaking') return out_({ error: 'PRO_ONLY' });
      if (req.charge) { if (!chargeTurn_(user.uid)) return out_({ error: 'QUOTA', quota: dailyQuota_(user.uid) }); }
      else if (!useTicket_(user.uid)) return out_({ error: 'QUOTA', quota: dailyQuota_(user.uid) });
    }
    if (!paid && !daily_(false)) return out_({ error: 'AI miễn phí hôm nay đã đủ số lần dùng. Bạn quay lại vào ngày mai, hoặc nâng cấp Pro để dùng không giới hạn nhé.' });

    let resp;
    if (req.kind === 'stt') {
      if (!req.file || !req.file.b64) return out_({ error: 'Thiếu file ghi âm.' });
      if (req.file.b64.length > 25000000) return out_({ error: 'File ghi âm quá dài.' });
      resp = stt_(req);
    } else {
      const body = String(req.body || '');
      if (body.length > MAX_BODY) return out_({ error: 'Bài gửi lên quá dài.' });
      let payload; try { payload = JSON.parse(body); } catch (x) { return out_({ error: 'Dữ liệu gửi lên không hợp lệ.' }); }
      if (payload.max_completion_tokens > 6000) payload.max_completion_tokens = 6000;
      if (payload.max_tokens > 6000) payload.max_tokens = 6000;
      delete payload.stream;
      resp = chat_(payload, skill);
    }
    daily_(true);
    if (!paid && req.charge && resp.getResponseCode() !== 200) refundTurn_(user.uid);   // lỗi ngay bước đầu -> trả lại lượt
    return out_({ status: resp.getResponseCode(), body: resp.getContentText(), quota: !paid && req.charge ? dailyQuota_(user.uid) : null });
  } catch (err) {
    return out_({ error: 'AI đang bận, bạn chờ khoảng 1 phút rồi thử lại nhé.', detail: String(err && err.message || err) });
  }
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function groqKeys_() {
  const P = PropertiesService.getScriptProperties().getProperties();
  let keys = String(P.GROQ_API_KEY || '').split(/[\s,;]+/);
  Object.keys(P).filter(function (n) { return /^GROQ_API_KEY_\d+$/.test(n); }).sort().forEach(function (n) { keys = keys.concat(String(P[n]).split(/[\s,;]+/)); });
  return keys.filter(function (k, i, a) { return /^gsk_/.test(k) && a.indexOf(k) === i; });
}
function groqKey_() { return groqKeys_()[0] || ''; }
/* Gọi Groq lần lượt qua các key: bắt đầu từ key kế tiếp (chia đều), bỏ qua key đang "nghỉ";
   gặp 429 / 413 / 5xx thì cho key đó nghỉ rồi thử key khác. Trả về phản hồi cuối cùng. */
function withKeys_(call) {
  const keys = groqKeys_(), c = CacheService.getScriptCache();
  if (keys.length <= 1) return call(keys[0] || '');
  const start = (Number(c.get('rr') || 0) + 1) % keys.length;
  c.put('rr', String(start), 21600);
  let resp = null, tried = 0;
  for (let n = 0; n < keys.length; n++) {
    const i = (start + n) % keys.length;
    if (c.get('cool_' + i) && n < keys.length - 1) continue;   // đang nghỉ (còn key khác thì bỏ qua)
    resp = call(keys[i]); tried++;
    const code = resp.getResponseCode();
    if (code !== 429 && code !== 413 && code < 500) return resp;
    let wait = 60;
    try { const h = resp.getHeaders(); const ra = Number(h['retry-after'] || h['Retry-After']); if (ra > 0) wait = Math.min(120, Math.ceil(ra) + 2); } catch (x) {}
    c.put('cool_' + i, '1', Math.max(5, wait));
  }
  return resp || call(keys[0]);
}

/* Kiểm tra token đăng nhập Firebase (Google xác thực giúp), nhớ 50 phút cho đỡ chậm. */
/* Tài khoản Pro / Astra còn hạn? Đọc users/<uid> bằng chính idToken của học sinh (rules cho phép đọc). Nhớ 10 phút. */
function isPaid_(uid, tok) {
  const c = CacheService.getScriptCache(), k = 'paid_' + uid, hit = c.get(k);
  if (hit) return hit === '1';
  let ok = false;
  try {
    const r = UrlFetchApp.fetch('https://firestore.googleapis.com/v1/projects/night-ielts-land/databases/(default)/documents/users/' + uid + '?mask.fieldPaths=role&mask.fieldPaths=proUntil',
      { headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true });
    if (r.getResponseCode() === 200) {
      const f = JSON.parse(r.getContentText()).fields || {};
      const role = f.role && f.role.stringValue, until = Number(f.proUntil && (f.proUntil.integerValue || f.proUntil.doubleValue) || 0);
      ok = role === 'admin' || role === 'student' || (role === 'pro' && until > Date.now());   // Học sinh của thầy: không giới hạn
    }
  } catch (e) {}
  c.put(k, ok ? '1' : '0', 600);
  return ok;
}
function verify_(tok) {
  if (!tok || typeof tok !== 'string') return null;
  const cache = CacheService.getScriptCache();
  const h = 'tk_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, tok)).slice(0, 40);
  const hit = cache.get(h);
  if (hit) return JSON.parse(hit);
  const r = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_WEB_KEY, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: tok }), muteHttpExceptions: true
  });
  if (r.getResponseCode() !== 200) return null;
  const u = (JSON.parse(r.getContentText()).users || [])[0];
  if (!u || !u.localId) return null;
  const user = { uid: u.localId, email: u.email || '' };
  cache.put(h, JSON.stringify(user), 3000);
  return user;
}

/* Hạn mức theo cửa sổ 5 tiếng, tính từ lần dùng đầu tiên. Lưu trong CacheService (tối đa 6 tiếng). */
function getQ_(uid) {
  const raw = CacheService.getScriptCache().get('q_' + uid);
  let q = raw ? JSON.parse(raw) : null;
  if (!q || Date.now() - q.start >= WINDOW_MS) q = { start: Date.now(), used: { speaking: 0, writing: 0 } };
  return q;
}
function charge_(uid, skill, sec) {
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const q = getQ_(uid);
    q.used[skill] = (q.used[skill] || 0) + sec;
    CacheService.getScriptCache().put('q_' + uid, JSON.stringify(q), 21600);
    return q;
  } finally { lock.releaseLock(); }
}
function view_(q, skill) { return { skill: skill, used: Math.min(q.used[skill] || 0, LIMITS[skill]), limit: LIMITS[skill], resetAt: q.start + WINDOW_MS }; }

function daily_(add) {
  const key = 'd_' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  const c = CacheService.getScriptCache();
  const n = Number(c.get(key) || 0);
  if (add) c.put(key, String(n + 1), 21600);
  return n < DAILY_CAP * Math.max(openaiKey_() ? 3 : 1, groqKeys_().length);   // thêm key thì thêm hạn mức ngày
}

/* Gửi file ghi âm sang Groq Whisper (dựng multipart bằng tay để giữ được các trường lặp lại). */
function stt_(req) {
  // Nghe giọng: Groq (key miễn phí, rẻ nhất) trước; Groq lỗi/hết lượt mới dùng OpenAI whisper-1 (~160đ/phút).
  let g = null;
  if (groqKey_()) {
    const mg = multipart_(req.fields || [], req.file);
    g = withKeys_(function (k) {
      return UrlFetchApp.fetch(GROQ + 'audio/transcriptions', { method: 'post', contentType: 'multipart/form-data; boundary=' + mg.boundary, payload: mg.bytes, headers: { Authorization: 'Bearer ' + k }, muteHttpExceptions: true });
    });
    if (g && g.getResponseCode() === 200) return g;
  }
  if (openaiKey_()) {
    const fields = (req.fields || []).map(function (f) { return f[0] === 'model' ? ['model', oaModel_('stt')] : f; });
    const mp = multipart_(fields, req.file);
    return UrlFetchApp.fetch(OPENAI + 'audio/transcriptions', { method: 'post', contentType: 'multipart/form-data; boundary=' + mp.boundary, payload: mp.bytes, headers: { Authorization: 'Bearer ' + openaiKey_() }, muteHttpExceptions: true });
  }
  return g;
}
/* Dựng multipart bằng tay để giữ được các trường lặp lại (timestamp_granularities[]). */
function multipart_(fieldList, file) {
  const boundary = '----NightIelts' + Utilities.getUuid().replace(/-/g, '');
  const enc = function (s) { return Utilities.newBlob(s).getBytes(); };
  let bytes = [];
  fieldList.forEach(function (f) {
    bytes = bytes.concat(enc('--' + boundary + '\r\nContent-Disposition: form-data; name="' + String(f[0]).replace(/"/g, '') + '"\r\n\r\n' + String(f[1]) + '\r\n'));
  });
  const name = String(file.name || 'answer.webm').replace(/[^\w.\-]/g, '');
  bytes = bytes.concat(enc('--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="' + name + '"\r\nContent-Type: ' + String(file.type || 'audio/webm').replace(/[\r\n]/g, '') + '\r\n\r\n'));
  bytes = bytes.concat(Utilities.base64Decode(file.b64));
  bytes = bytes.concat(enc('\r\n--' + boundary + '--\r\n'));
  return { boundary: boundary, bytes: bytes };
}
