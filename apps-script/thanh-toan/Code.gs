/**
 * NIGHT IELTS — Thanh toán tự động (SePay → web)
 * Học sinh chuyển khoản với nội dung = mã đơn (NIxxxxxxxx, tạo trên web, lưu ở payOrders/<mã>).
 * SePay thấy tiền vào tài khoản MB → gọi webhook này → đủ tiền thì:
 *   - đơn khoá học  : users/<uid>.buys.<khoá> = (hạn cũ hoặc hôm nay) + 30 ngày
 *   - đơn gói Pro/Astra: users/<uid>.role='pro', tier, proUntil + số tháng
 * Mọi giao dịch tiền vào đều ghi ở payments/<id SePay> (matched=true/false) để thầy đối soát.
 *
 * KHO KEY AI (từ 11/2026): thầy nạp sẵn nhiều key Groq vào kho (trang chủ → 👑 Tài khoản → Cài đặt → Kho key AI).
 * Ai lên Pro / Astra mà chưa có key riêng → máy chủ tự lấy 1 key trống trong kho ghi vào users/<uid>.groqKey:
 *   - ngay khi SePay báo đã nhận tiền (webhook bên dưới);
 *   - khi thầy duyệt tay / đổi vai trò sang Pro, Astra trong bảng Tài khoản;
 *   - khi tài khoản Pro / Astra chưa có key mở web (trang tự xin key, action "claim").
 * Kho key lưu trong Thuộc tính tập lệnh KEY_POOL của chính project này — không nằm trong Firestore,
 * nên học sinh không đọc được. Trang web nói chuyện với máy chủ bằng idToken đăng nhập; thao tác kho
 * chỉ tài khoản role = 'admin' làm được.
 * Sau khi dán bản Code.gs mới: Triển khai → Quản lý triển khai → ✏️ → Phiên bản mới (giữ nguyên URL),
 * rồi dán URL …/exec vào trang chủ → 👑 Tài khoản → Cài đặt → "Link máy chủ thanh toán" → Lưu.
 *
 * CÀI ĐẶT (1 lần):
 *  1. script.google.com → Dự án mới → dán Code.gs này + appsscript.json (Cài đặt dự án → hiện tệp kê khai).
 *  2. Đổi SECRET bên dưới thành chuỗi bí mật bất kỳ (vd. 20 ký tự ngẫu nhiên).
 *  3. Chạy hàm test() một lần → Cho phép (cần tài khoản Google là chủ dự án Firebase night-ielts-land).
 *  4. Triển khai → Tùy chọn triển khai mới → Ứng dụng web · Thực thi: Tôi · Truy cập: Bất kỳ ai → Triển khai.
 *  5. SePay → Tích hợp WebHooks → Thêm: URL = <URL ứng dụng web>?key=<SECRET>, Sự kiện: Có tiền vào,
 *     Kiểu chứng thực: Không cần, Content-type: application/json → Lưu.
 *  6. Firebase Console → Firestore → Rules: thêm 'buys' vào danh sách khoá học sinh KHÔNG được tự sửa
 *     trong khối users (…hasAny(['role', 'proUntil', 'courses', 'buys', 'tier'])) và thêm:
 *
 *   match /payOrders/{code} {          // đơn mua: học sinh tạo đơn của mình, chỉ máy chủ / thầy đổi trạng thái
 *     allow read: if isAdmin() || (signedIn() && resource.data.uid == request.auth.uid);
 *     allow create: if signedIn() && request.resource.data.uid == request.auth.uid
 *                   && request.resource.data.status == 'pending';
 *     allow update, delete: if isAdmin();
 *   }
 *   match /payments/{id} {             // nhật ký tiền vào (máy chủ ghi), thầy xem
 *     allow read, write: if isAdmin();
 *   }
 */
const PROJECT_ID = 'night-ielts-land';
const FIREBASE_WEB_KEY = 'AIzaSyCmeN49M4oI78ZPWDhMlbisDOLaMJp2mb8';   // khoá web công khai của Firebase (không phải bí mật)
const SECRET = 'DOI-THANH-CHUOI-BI-MAT';
const DAY = 86400000, MONTH = 30 * DAY;
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (e && e.parameter && e.parameter.key === SECRET) return out(handle(body));   // SePay webhook
    if (body && body.action) return out(api(body));                                  // trang web (kho key AI)
    return out({ success: false, error: 'forbidden' });
  } catch (err) {
    console.error(err);
    return out({ success: false, error: String(err && err.message || err) });
  }
}
function doGet() { return out({ ok: true, service: 'night-ielts-thanh-toan' }); }
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function handle(tx) {
  if (tx.transferType && tx.transferType !== 'in') return { success: true, skip: 'out' };
  const id = String(tx.id || tx.referenceCode || Date.now());
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (getDoc('payments/' + id)) return { success: true, dup: true };
    const amount = Number(tx.transferAmount || 0);
    const text = String((tx.code || '') + ' ' + (tx.content || '') + ' ' + (tx.description || '')).toUpperCase().replace(/[^A-Z0-9]/g, ' ');
    const cands = [];
    [text, text.replace(/\s+/g, '')].forEach(t => { const re = /NI([A-HJ-NP-Z2-9]{8})/g; let x; while ((x = re.exec(t))) { cands.push('NI' + x[1]); re.lastIndex = x.index + 1; } });
    const log = { id: id, amount: amount, content: String(tx.content || ''), account: String(tx.accountNumber || ''), gateway: String(tx.gateway || ''),
      at: Date.now(), txDate: String(tx.transactionDate || ''), matched: false };
    if (!cands.length) { log.note = 'không thấy mã đơn'; setDoc('payments/' + id, log); return { success: true, matched: false }; }
    let code = cands[0], order = null;
    for (const c of [...new Set(cands)].slice(0, 6)) { const d = getDoc('payOrders/' + c); if (d) { code = c; order = d; break; } }
    log.code = code;
    if (!order) { log.note = 'mã đơn không tồn tại'; setDoc('payments/' + id, log); return { success: true, matched: false }; }
    log.uid = order.uid;
    if (amount < Number(order.amount || 0)) { log.note = 'thiếu tiền (cần ' + order.amount + ')'; setDoc('payments/' + id, log); return { success: true, matched: false }; }
    const user = getDoc('users/' + order.uid) || {};
    const now = Date.now();
    if (order.kind === 'course' && order.course) {
      const buys = user.buys || {};
      const base = Math.max(now, Number(buys[order.course]) || 0);
      const until = base + MONTH;
      patchDoc('users/' + order.uid, { ['buys.' + order.course]: until }, ['buys.' + order.course]);
      log.result = 'khoá ' + order.course + ' đến ' + new Date(until).toISOString().slice(0, 10);
    } else if (order.kind === 'plan' && order.plan) {
      const role = user.role || 'user';
      if (role === 'admin' || role === 'student') { log.note = 'tài khoản ' + role + ' — không đổi gói'; }
      else {
        const base = Math.max(now, Number(user.proUntil) || 0);
        const until = base + (Number(order.months) || 1) * MONTH;
        const tier = order.plan === 'pro' && user.tier === 'astra' && Number(user.proUntil) > now ? 'astra' : order.plan;
        patchDoc('users/' + order.uid, { role: 'pro', tier: tier, proUntil: until }, ['role', 'tier', 'proUntil']);
        log.result = 'gói ' + tier + ' đến ' + new Date(until).toISOString().slice(0, 10);
        if (!user.groqKey) {
          try { const k = assignKey_(order.uid, user.email || ''); log.key = k ? 'đã cấp key AI từ kho' : 'KHO KEY TRỐNG — chưa cấp key'; }
          catch (x) { log.key = 'lỗi cấp key: ' + String(x && x.message || x).slice(0, 120); }
        }
      }
    }
    patchDoc('payOrders/' + code, { status: 'paid', paidAt: now, paidAmount: amount, txId: id }, ['status', 'paidAt', 'paidAmount', 'txId']);
    log.matched = true;
    setDoc('payments/' + id, log);
    return { success: true, matched: true };
  } finally { lock.releaseLock(); }
}

// ===================== KHO KEY AI =====================
/* KEY_POOL = [{ k: 'gsk_…', uid: '' | '<uid được cấp>', email, at }] */
function loadPool_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('KEY_POOL') || '[]'); } catch (x) { return []; } }
function savePool_(p) { PropertiesService.getScriptProperties().setProperty('KEY_POOL', JSON.stringify(p)); }
function mask_(k) { k = String(k || ''); return k.slice(0, 8) + '…' + k.slice(-4); }
function paidActive_(u) { return !!u && (u.role === 'pro' && Number(u.proUntil) > Date.now()); }
/* Cấp key cho uid (gọi khi đã giữ khoá LockService). Đã từng được cấp thì trả lại đúng key cũ. */
function assignKey_(uid, email) {
  const pool = loadPool_();
  let e = pool.filter(x => x.uid === uid)[0];
  if (!e) { e = pool.filter(x => !x.uid)[0]; if (!e) return null; e.uid = uid; e.email = email || ''; e.at = Date.now(); savePool_(pool); }
  patchDoc('users/' + uid, { groqKey: e.k }, ['groqKey']);
  return e.k;
}
function verifyTok_(tok) {
  if (!tok || typeof tok !== 'string') return null;
  const r = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_WEB_KEY, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: tok }), muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  const u = (JSON.parse(r.getContentText()).users || [])[0];
  return u && u.localId ? { uid: u.localId, email: u.email || '' } : null;
}
function poolView_() {
  const pool = loadPool_();
  return { ok: true, free: pool.filter(x => !x.uid).length, total: pool.length,
    pool: pool.map((x, i) => ({ i: i, key: mask_(x.k), uid: x.uid || '', email: x.email || '', at: x.at || 0 })) };
}
function api(req) {
  const who = verifyTok_(req.idToken);
  if (!who) return { error: 'Phiên đăng nhập hết hạn, tải lại trang rồi thử lại.' };
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const me = getDoc('users/' + who.uid) || {};
    if (req.action === 'claim') {               // Pro / Astra tự xin key khi mở web
      if (!paidActive_(me)) return { ok: false, error: 'not_paid' };
      if (me.groqKey) return { ok: true, key: me.groqKey };
      const k = assignKey_(who.uid, me.email || who.email);
      return k ? { ok: true, key: k } : { ok: false, empty: true };
    }
    if (me.role !== 'admin') return { error: 'forbidden' };
    if (req.action === 'poolList') return poolView_();
    if (req.action === 'poolAdd') {
      const pool = loadPool_(), have = {}; pool.forEach(x => have[x.k] = 1);
      let added = 0;
      String(req.keys || '').split(/[\s,;]+/).forEach(k => { if (/^gsk_[A-Za-z0-9]{20,}$/.test(k) && !have[k]) { pool.push({ k: k, uid: '', email: '', at: 0 }); have[k] = 1; added++; } });
      savePool_(pool);
      const v = poolView_(); v.added = added; return v;
    }
    if (req.action === 'poolDelete') {          // chỉ xoá được key chưa cấp cho ai
      const pool = loadPool_(), i = Number(req.i);
      if (pool[i] && !pool[i].uid) { pool.splice(i, 1); savePool_(pool); }
      return poolView_();
    }
    if (req.action === 'assign') {              // thầy vừa cho 1 tài khoản lên Pro / Astra
      const u = getDoc('users/' + req.uid);
      if (!u) return { error: 'Không thấy tài khoản.' };
      if (u.groqKey) return { ok: true, key: u.groqKey, had: true };
      const k = assignKey_(req.uid, u.email || '');
      return k ? { ok: true, key: k } : { ok: false, empty: true };
    }
    if (req.action === 'reclaim') {             // thu hồi key của tài khoản hết hạn quá 30 ngày → trả về kho
      const pool = loadPool_(); let n = 0;
      pool.forEach(x => {
        if (!x.uid) return;
        const u = getDoc('users/' + x.uid) || {};
        const expired = !(u.role === 'pro') || Number(u.proUntil || 0) < Date.now() - 30 * DAY;
        if (u.role === 'admin' || u.role === 'student' || !expired) return;
        if (u.groqKey === x.k) patchDoc('users/' + x.uid, { groqKey: '' }, ['groqKey']);
        x.uid = ''; x.email = ''; x.at = 0; n++;
      });
      savePool_(pool);
      const v = poolView_(); v.reclaimed = n; return v;
    }
    return { error: 'unknown action' };
  } finally { lock.releaseLock(); }
}

// ===================== FIRESTORE (REST) =====================
function headers() { return { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': PROJECT_ID }; }
function getDoc(path) {
  const r = UrlFetchApp.fetch(FS + '/' + path, { headers: headers(), muteHttpExceptions: true });
  if (r.getResponseCode() === 404) return null;
  if (r.getResponseCode() !== 200) throw new Error('Đọc ' + path + ' lỗi: ' + r.getContentText().slice(0, 300));
  return fromFields(JSON.parse(r.getContentText()).fields || {});
}
function setDoc(path, obj) { return patchDoc(path, obj, null); }
function patchDoc(path, obj, mask) {
  let fields = {};
  if (mask) {
    // hỗ trợ khoá dạng "buys.tiengtrung"
    Object.keys(obj).forEach(k => {
      const parts = k.split('.'); let cur = fields;
      parts.forEach((p, i) => {
        if (i === parts.length - 1) cur[p] = toValue(obj[k]);
        else { cur[p] = cur[p] || { mapValue: { fields: {} } }; cur = cur[p].mapValue.fields; }
      });
    });
  } else Object.keys(obj).forEach(k => fields[k] = toValue(obj[k]));
  const q = mask ? '?' + mask.map(f => 'updateMask.fieldPaths=' + encodeURIComponent(f.split('.').map(x => /^[A-Za-z_][A-Za-z0-9_]*$/.test(x) ? x : '`' + x + '`').join('.'))).join('&') : '';
  const r = UrlFetchApp.fetch(FS + '/' + path + q, { method: 'patch', contentType: 'application/json', headers: headers(), muteHttpExceptions: true, payload: JSON.stringify({ fields: fields }) });
  if (r.getResponseCode() !== 200) throw new Error('Ghi ' + path + ' lỗi: ' + r.getContentText().slice(0, 300));
}
function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'object') { const f = {}; Object.keys(v).forEach(k => f[k] = toValue(v[k])); return { mapValue: { fields: f } }; }
  return { stringValue: String(v) };
}
function fromValue(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return Date.parse(v.timestampValue);
  if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  return null;
}
function fromFields(f) { const o = {}; Object.keys(f).forEach(k => o[k] = fromValue(f[k])); return o; }

/* Chạy thử 1 lần để cấp quyền + kiểm tra đọc được Firestore */
function test() {
  const s = getDoc('publicSettings/main');
  Logger.log('Đọc Firestore OK. Ngân hàng nhận tiền trên web: %s · %s · %s', s && s.bank, s && s.acc, s && s.holder);
}
