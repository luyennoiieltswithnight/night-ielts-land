/**
 * NIGHT IELTS — Thông báo đẩy lên điện thoại học sinh (Firebase Cloud Messaging)
 * Project Apps Script RIÊNG, không đụng tới project gửi mail.
 *
 *  - Mỗi 5 phút: bài mới được giao  → "ting ting" cho học sinh đó.
 *  - Mỗi tối 19:30: còn bài chưa làm → nhắc bài; hết bài → nhắc học 15 phút.
 *
 * Cài đặt: dán file này + appsscript.json, chạy hàm setup() một lần, bấm Cho phép.
 * Kiểm tra: đăng nhập web trên điện thoại bằng Gmail của thầy, bật thông báo, rồi chạy testPush().
 */

const PROJECT_ID = 'night-ielts-land';
const SITE = 'https://nightielts.id.vn/';
const ICON = SITE + 'icons/icon-192.png';
const DAILY_HOUR = 19;      // giờ nhắc mỗi tối (giờ Việt Nam)
const DAILY_MINUTE = 30;

// ===================== LỜI NHẮN (sửa thoải mái) =====================
const MSG_NEW = [
  t => ['🔔 Ting ting! Bài mới về nè con vợ', `Thầy Night vừa giao "${t}". Vô làm liền cho nóng hổi nha 🔥`],
  t => ['📚 Bài mới ra lò!', `"${t}" đang chờ bạn đó. Làm xong là thấy mình giỏi liền 😎`],
  t => ['🚀 Nhiệm vụ mới đã mở khoá', `"${t}" — xử gọn trong 15 phút là đẹp nha!`],
];
const MSG_NEW_MANY = n => ['🔔 Ting ting! Có ' + n + ' bài mới nè', 'Thầy Night vừa giao một loạt luôn á. Vô xem lẹ nha con vợ 🫶'];

const MSG_REMIND = [
  n => [`⏰ Ê ê, còn ${n} bài chưa làm á`, 'Để lâu bài nó buồn đó. Vô xử lẹ đi con vợ 😤'],
  n => ['🥺 Bài tập nhớ bạn quá trời', `Còn ${n} bài đang ngồi chờ. 15 phút thôi là xong 1 bài rồi nè!`],
  n => [`📌 Nhắc nhẹ: ${n} bài đang pending`, 'Làm xong rồi đi ngủ cho ngon giấc nha ✨'],
  n => ['👀 Night thấy hết nha', `Còn ${n} bài chưa đụng tới đó. Vô làm 1 bài thôi cũng được mà 😆`],
];

const MSG_NUDGE = [
  ['☕ 15 phút thôi mà', 'Lướt TikTok 15p được thì học IELTS 15p cũng được nha con vợ 😌'],
  ['🌙 Night gọi nè', 'Hôm nay học chưa? 15 phút từ vựng thôi, band tự lên á ✨'],
  ['💪 Mỗi ngày một xíu', 'Hổng cần học nhiều, chỉ cần học đều. Vô làm 1 bài cho vui nha!'],
  ['🎧 Nghe 1 bài trước khi ngủ?', 'Tai quen tiếng Anh là Listening dễ thở hơn nhiều á 😴'],
  ['🔥 Giữ chuỗi học nha', 'Đã học là phải đều, 15 phút hôm nay = điểm đẹp tháng sau 📈'],
  ['📖 Đọc 1 đoạn Reading hông?', 'Đọc chút xíu thôi, não khoẻ ra liền 🧠'],
  ['🫶 Thầy tin bạn nè', 'Ngồi xuống 15 phút học thôi, xong rồi đi chơi tiếp!'],
];

// ===================== CÀI ĐẶT =====================
function setup() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('checkNewAssignments').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('dailyNudge').timeBased().atHour(DAILY_HOUR).nearMinute(DAILY_MINUTE).everyDays(1)
    .inTimezone('Asia/Ho_Chi_Minh').create();
  PropertiesService.getScriptProperties().setProperty('LAST_CHECK', String(Date.now()));
  Logger.log('Xong! Đã cài lịch: kiểm tra bài mới mỗi 5 phút + nhắc học lúc %s:%s mỗi tối.', DAILY_HOUR, DAILY_MINUTE);
}

// Gửi thử 1 thông báo tới máy của chính thầy (Gmail đang chạy script này)
function testPush() {
  const me = Session.getEffectiveUser().getEmail();
  const users = listUsers().filter(u => (u.email || '').toLowerCase() === me.toLowerCase());
  if (!users.length || !users[0].tokens.length) {
    Logger.log('Chưa thấy máy nào của %s bật thông báo. Mở web, đăng nhập Gmail này, bấm "Bật luôn" rồi chạy lại nha.', me);
    return;
  }
  const n = pushToUser(users[0], '🎉 Thông báo chạy ngon rồi nè!', 'Học sinh bật thông báo là nhận được y như vầy luôn 😎', SITE);
  Logger.log('Đã gửi tới %s máy.', n);
}

// ===================== BÀI MỚI (mỗi 5 phút) =====================
function checkNewAssignments() {
  const props = PropertiesService.getScriptProperties();
  const now = Date.now();
  const last = Number(props.getProperty('LAST_CHECK') || now);
  props.setProperty('LAST_CHECK', String(now));

  const docs = runQuery('assignments', [
    ['createdAt', 'GREATER_THAN', last],
    ['createdAt', 'LESS_THAN_OR_EQUAL', now],
  ], ['studentId', 'title', 'link', 'emailNotify']).filter(a => a.studentId && a.emailNotify !== false);
  if (!docs.length) return;

  const byStudent = groupBy(docs, a => a.studentId);
  const users = indexBy(listUsers(), u => u.id);
  Object.keys(byStudent).forEach(sid => {
    const u = users[sid];
    if (!u || !u.tokens.length) return;
    const list = byStudent[sid];
    let msg, link;
    if (list.length === 1) {
      msg = pick(MSG_NEW)(list[0].title || 'bài mới');
      link = absLink(list[0].link);
    } else {
      msg = MSG_NEW_MANY(list.length);
      link = SITE;
    }
    pushToUser(u, msg[0], msg[1], link);
  });
}

// ===================== NHẮC MỖI TỐI =====================
function dailyNudge() {
  const now = Date.now();
  const users = listUsers().filter(u => u.role !== 'admin' && u.tokens.length);
  if (!users.length) return;
  const active = runQuery('assignments', [['expiresAt', 'GREATER_THAN', now]],
    ['studentId', 'kind', 'status', 'link', 'completed', 'vocabList', 'completedIndices'])
    .filter(a => a.studentId && !assignmentDone(a));
  const pending = groupBy(active, a => a.studentId);
  const day = Math.floor(now / 864e5);

  users.forEach((u, i) => {
    const n = (pending[u.id] || []).length;
    const msg = n > 0
      ? MSG_REMIND[(day + i) % MSG_REMIND.length](n)
      : MSG_NUDGE[(day + i) % MSG_NUDGE.length];
    pushToUser(u, msg[0], msg[1], SITE);
  });
}

// Giống hàm assignmentDone() trong index.html
function assignmentDone(d) {
  if (d.kind === 'writing') return d.status === 'submitted' || d.status === 'graded';
  if (d.kind === 'speaking') return d.status === 'completed';
  if (d.link) return d.completed === true;
  const total = (d.vocabList || []).length;
  return total > 0 && (d.completedIndices || []).length >= total;
}

// ===================== GỬI THÔNG BÁO =====================
function pushToUser(u, title, body, link) {
  let sent = 0;
  const bad = [];
  u.tokens.forEach(token => {
    const res = UrlFetchApp.fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
      method: 'post', contentType: 'application/json', headers: authHeaders(), muteHttpExceptions: true,
      payload: JSON.stringify({ message: {
        token: token,
        webpush: {
          notification: { title: title, body: body, icon: ICON, badge: ICON },
          fcm_options: { link: link || SITE },
        },
      } }),
    });
    const code = res.getResponseCode();
    if (code === 200) { sent++; return; }
    const txt = res.getContentText();
    if (code === 404 || /UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT/.test(txt)) bad.push(token);
    else Logger.log('Lỗi gửi tới %s: %s %s', u.email || u.id, code, txt.slice(0, 300));
  });
  if (bad.length) removeTokens(u, bad);   // máy đã gỡ app / tắt thông báo -> dọn mã cũ
  return sent;
}

function absLink(link) {
  if (!link) return SITE;
  if (/^https?:\/\//.test(link)) return link;
  return SITE + String(link).replace(/^\.?\//, '');
}

// ===================== FIRESTORE (REST) =====================
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function authHeaders() {
  return { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': PROJECT_ID };
}

function runQuery(collection, filters, fields) {
  const f = filters.map(([field, op, val]) => ({ fieldFilter: { field: { fieldPath: field }, op: op, value: { integerValue: String(Math.floor(val)) } } }));
  const where = f.length === 1 ? f[0] : { compositeFilter: { op: 'AND', filters: f } };
  const res = UrlFetchApp.fetch(FS + ':runQuery', {
    method: 'post', contentType: 'application/json', headers: authHeaders(), muteHttpExceptions: true,
    payload: JSON.stringify({ structuredQuery: Object.assign({ from: [{ collectionId: collection }], where: where },
      fields ? { select: { fields: fields.map(x => ({ fieldPath: x })) } } : {}) }),
  });
  if (res.getResponseCode() !== 200) throw new Error('Firestore query lỗi: ' + res.getContentText().slice(0, 500));
  return JSON.parse(res.getContentText()).filter(r => r.document).map(r => fromDoc(r.document));
}

function listUsers() {
  const out = [];
  let pageToken = '';
  do {
    const url = FS + '/users?pageSize=300&mask.fieldPaths=role&mask.fieldPaths=email&mask.fieldPaths=name&mask.fieldPaths=fcmTokens'
      + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    const res = UrlFetchApp.fetch(url, { headers: authHeaders(), muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw new Error('Đọc users lỗi: ' + res.getContentText().slice(0, 500));
    const j = JSON.parse(res.getContentText());
    (j.documents || []).forEach(d => {
      const u = fromDoc(d);
      u.tokens = Array.isArray(u.fcmTokens) ? u.fcmTokens.filter(Boolean) : [];
      out.push(u);
    });
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  return out;
}

function removeTokens(u, bad) {
  const keep = u.tokens.filter(t => bad.indexOf(t) === -1);
  UrlFetchApp.fetch(FS + '/users/' + encodeURIComponent(u.id) + '?updateMask.fieldPaths=fcmTokens', {
    method: 'patch', contentType: 'application/json', headers: authHeaders(), muteHttpExceptions: true,
    payload: JSON.stringify({ fields: { fcmTokens: { arrayValue: { values: keep.map(t => ({ stringValue: t })) } } } }),
  });
  u.tokens = keep;
}

function fromDoc(d) {
  const o = { id: d.name.split('/').pop() };
  Object.keys(d.fields || {}).forEach(k => { o[k] = fromValue(d.fields[k]); });
  return o;
}

function fromValue(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return Date.parse(v.timestampValue);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) { const o = {}; Object.keys(v.mapValue.fields || {}).forEach(k => { o[k] = fromValue(v.mapValue.fields[k]); }); return o; }
  return null;
}

// ===================== TIỆN ÍCH =====================
function groupBy(arr, fn) { return arr.reduce((m, x) => { const k = fn(x); (m[k] = m[k] || []).push(x); return m; }, {}); }
function indexBy(arr, fn) { return arr.reduce((m, x) => { m[fn(x)] = x; return m; }, {}); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
