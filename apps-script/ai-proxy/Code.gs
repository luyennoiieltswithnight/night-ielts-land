/**
 * NIGHT IELTS — Máy chủ AI miễn phí cho tài khoản User (Groq, key của thầy)
 * Project Apps Script RIÊNG (không đụng project thông báo / gửi mail).
 *
 * Vì sao cần: nếu để key Groq trong trang web, ai bấm F12 cũng lấy được key. Ở đây key nằm trong
 * Apps Script, trang web chỉ gửi bài lên, máy chủ kiểm tra đăng nhập + giới hạn rồi mới gọi Groq.
 *
 * Giới hạn: mỗi tài khoản 5 phút / 5 tiếng cho MỖI kỹ năng.
 *   - Speaking: tính đúng thời lượng ghi âm (Groq trả về), mỗi lần AI nhận xét tính thêm 10 giây.
 *   - Writing: mỗi lần gọi AI tính 75 giây (chấm 1 bài ≈ 2–3 lần gọi → ~1–2 bài / 5 tiếng).
 *   - Cả hệ thống tối đa DAILY_CAP lần gọi / ngày để key của thầy không bị quá tải.
 *
 * ===================== CÀI ĐẶT (làm 1 lần) =====================
 * 1. script.google.com → Dự án mới → dán file này vào Code.gs.
 *    Bật "Hiện tệp kê khai appsscript.json" trong Cài đặt dự án, dán nội dung appsscript.json đi kèm.
 * 2. Cài đặt dự án → Thuộc tính tập lệnh → Thêm: GROQ_API_KEY = (key Groq của thầy).
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
 *     allow update: if isAdmin() || (signedIn() && request.auth.uid == uid
 *                     && !request.resource.data.diff(resource.data).affectedKeys()
 *                         .hasAny(['role', 'proUntil', 'courses']));
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

function doGet() {
  return ContentService.createTextOutput('Night IELTS AI proxy đang chạy ✅' + (groqKey_() ? '' : ' — CHƯA có GROQ_API_KEY trong Thuộc tính tập lệnh!'));
}

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const user = verify_(req.idToken);
    if (!user) return out_({ error: 'Phiên đăng nhập hết hạn. Tải lại trang rồi thử lại nhé.' });
    if (!groqKey_()) return out_({ error: 'Máy chủ AI chưa có key. Nhắn thầy Night nhé.' });
    const skill = LIMITS[req.skill] ? req.skill : 'speaking';

    let q = getQ_(user.uid);
    if (q.used[skill] >= LIMITS[skill]) return out_({ error: 'QUOTA', quota: view_(q, skill) });
    if (!daily_(false)) return out_({ error: 'AI miễn phí đã hết lượt của cả hệ thống hôm nay. Thử lại ngày mai, hoặc nâng cấp Pro và dùng key riêng nhé.' });

    let resp, cost = 0;
    if (req.kind === 'stt') {
      if (!req.file || !req.file.b64) return out_({ error: 'Thiếu file ghi âm.' });
      if (req.file.b64.length > 25000000) return out_({ error: 'File ghi âm quá dài.' });
      resp = stt_(req);
      if (resp.getResponseCode() === 200) {
        let d = 0; try { d = Number(JSON.parse(resp.getContentText()).duration) || 0; } catch (x) {}
        cost = Math.max(5, Math.ceil(d || 30));
      }
    } else {
      const body = String(req.body || '');
      if (body.length > MAX_BODY) return out_({ error: 'Bài gửi lên quá dài.' });
      let payload; try { payload = JSON.parse(body); } catch (x) { return out_({ error: 'Dữ liệu gửi lên không hợp lệ.' }); }
      if (payload.max_completion_tokens > 6000) payload.max_completion_tokens = 6000;
      if (payload.max_tokens > 6000) payload.max_tokens = 6000;
      delete payload.stream;
      resp = UrlFetchApp.fetch(GROQ + 'chat/completions', {
        method: 'post', contentType: 'application/json', payload: JSON.stringify(payload),
        headers: { Authorization: 'Bearer ' + groqKey_() }, muteHttpExceptions: true
      });
      if (resp.getResponseCode() === 200) cost = CHAT_COST[skill];
    }
    daily_(true);
    if (cost) q = charge_(user.uid, skill, cost);
    return out_({ status: resp.getResponseCode(), body: resp.getContentText(), quota: view_(q, skill) });
  } catch (err) {
    return out_({ error: 'Máy chủ AI lỗi: ' + (err && err.message || err) });
  }
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function groqKey_() { return PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY') || ''; }

/* Kiểm tra token đăng nhập Firebase (Google xác thực giúp), nhớ 50 phút cho đỡ chậm. */
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
  return n < DAILY_CAP;
}

/* Gửi file ghi âm sang Groq Whisper (dựng multipart bằng tay để giữ được các trường lặp lại). */
function stt_(req) {
  const boundary = '----NightIelts' + Utilities.getUuid().replace(/-/g, '');
  const enc = function (s) { return Utilities.newBlob(s).getBytes(); };
  let bytes = [];
  (req.fields || []).forEach(function (f) {
    bytes = bytes.concat(enc('--' + boundary + '\r\nContent-Disposition: form-data; name="' + String(f[0]).replace(/"/g, '') + '"\r\n\r\n' + String(f[1]) + '\r\n'));
  });
  const name = String(req.file.name || 'answer.webm').replace(/[^\w.\-]/g, '');
  bytes = bytes.concat(enc('--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="' + name + '"\r\nContent-Type: ' + String(req.file.type || 'audio/webm').replace(/[\r\n]/g, '') + '\r\n\r\n'));
  bytes = bytes.concat(Utilities.base64Decode(req.file.b64));
  bytes = bytes.concat(enc('\r\n--' + boundary + '--\r\n'));
  return UrlFetchApp.fetch(GROQ + 'audio/transcriptions', {
    method: 'post', contentType: 'multipart/form-data; boundary=' + boundary, payload: bytes,
    headers: { Authorization: 'Bearer ' + groqKey_() }, muteHttpExceptions: true
  });
}
