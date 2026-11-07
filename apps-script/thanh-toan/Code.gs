/**
 * NIGHT IELTS — Thanh toán tự động (SePay → web)
 * Học sinh chuyển khoản với nội dung = mã đơn (NIxxxxxxxx, tạo trên web, lưu ở payOrders/<mã>).
 * SePay thấy tiền vào tài khoản MB → gọi webhook này → đủ tiền thì:
 *   - đơn khoá học  : users/<uid>.buys.<khoá> = (hạn cũ hoặc hôm nay) + 30 ngày
 *   - đơn gói Pro/Astra: users/<uid>.role='pro', tier, proUntil + số tháng
 * Mọi giao dịch tiền vào đều ghi ở payments/<id SePay> (matched=true/false) để thầy đối soát.
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
const SECRET = 'DOI-THANH-CHUOI-BI-MAT';
const DAY = 86400000, MONTH = 30 * DAY;
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function doPost(e) {
  try {
    if (!e || !e.parameter || e.parameter.key !== SECRET) return out({ success: false, error: 'forbidden' });
    const tx = JSON.parse((e.postData && e.postData.contents) || '{}');
    return out(handle(tx));
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
      }
    }
    patchDoc('payOrders/' + code, { status: 'paid', paidAt: now, paidAmount: amount, txId: id }, ['status', 'paidAt', 'paidAmount', 'txId']);
    log.matched = true;
    setDoc('payments/' + id, log);
    return { success: true, matched: true };
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
