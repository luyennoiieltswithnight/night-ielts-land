/*
 * NIGHT IELTS — night-push.js: nút "🔔 Bật thông báo" cho học sinh + lưu mã thiết bị (FCM token)
 * vào users/{uid}.fcmTokens. Apps Script "Night IELTS Thông báo" đọc mã này để báo bài mới,
 * nhắc bài chưa làm và nhắc học mỗi ngày.
 *
 * Nạp ở cuối index.html, SAU khối <script type="module"> chính (đã initializeApp).
 * - Android/Chrome máy tính: bấm nút là bật được.
 * - iPhone/iPad: phải "Thêm vào Màn hình chính" rồi mở web từ biểu tượng đó (giới hạn của Apple).
 */
import { getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getMessaging, getToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging.js";

// Firebase Console → Project settings → Cloud Messaging → Web Push certificates → "Key pair"
const VAPID_KEY = 'BJtjvYGEX9OsSIbLMcCFz5YNeXZQ07kAG98WTpMATAuTHrEs2zo5wqtFJRdAl_Wgz2BURyUn_098EkIAG6cOqUk';

const DISMISS_KEY = 'nightPushDismissedAt';
const TOKEN_KEY = 'nightPushToken';
const DISMISS_DAYS = 3;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

function injectStyle() {
  if (document.getElementById('night-push-style')) return;
  const s = document.createElement('style');
  s.id = 'night-push-style';
  s.textContent = `
  .np-card{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9999;width:min(92vw,380px);
    background:#1e1b2e;color:#fff;border-radius:18px;padding:14px 16px;box-shadow:0 12px 32px rgba(0,0,0,.35);
    font-family:inherit;font-size:14px;line-height:1.45;animation:npUp .35s ease}
  .np-card b{font-size:15px}
  .np-row{display:flex;gap:8px;margin-top:10px}
  .np-btn{flex:1;border:0;border-radius:12px;padding:9px 10px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit}
  .np-yes{background:#9b87f5;color:#fff}.np-no{background:rgba(255,255,255,.12);color:#fff}
  .np-toast{position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:10000;width:min(92vw,380px);
    background:#fff;color:#1e1b2e;border-radius:16px;padding:12px 14px;box-shadow:0 10px 28px rgba(0,0,0,.25);
    font-family:inherit;font-size:14px;cursor:pointer;animation:npDown .3s ease}
  @keyframes npUp{from{opacity:0;transform:translate(-50%,20px)}to{opacity:1;transform:translate(-50%,0)}}
  @keyframes npDown{from{opacity:0;transform:translate(-50%,-20px)}to{opacity:1;transform:translate(-50%,0)}}`;
  document.head.appendChild(s);
}

function removeCard() { const c = document.getElementById('np-card'); if (c) c.remove(); }

function showCard(html, onYes, yesText) {
  removeCard(); injectStyle();
  const c = document.createElement('div');
  c.id = 'np-card'; c.className = 'np-card';
  c.innerHTML = html + `<div class="np-row">
    ${onYes ? `<button class="np-btn np-yes">${yesText || '🔔 Bật luôn'}</button>` : ''}
    <button class="np-btn np-no">${onYes ? 'Để sau' : 'Ok hiểu rồi'}</button></div>`;
  document.body.appendChild(c);
  if (onYes) c.querySelector('.np-yes').onclick = onYes;
  c.querySelector('.np-no').onclick = () => { lsSet(DISMISS_KEY, String(Date.now())); removeCard(); };
}

function showToast(title, body, link) {
  injectStyle();
  const t = document.createElement('div');
  t.className = 'np-toast';
  t.innerHTML = `<b>${title || 'Night IELTS'}</b><div>${body || ''}</div>`;
  t.onclick = () => { if (link) location.href = link; t.remove(); };
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 7000);
}

async function registerAndSave(uid, messaging, db) {
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
  if (!token) return false;
  if (lsGet(TOKEN_KEY) !== uid + ':' + token) {
    await setDoc(doc(db, 'users', uid), { fcmTokens: arrayUnion(token), pushUpdatedAt: Date.now() }, { merge: true });
    lsSet(TOKEN_KEY, uid + ':' + token);
  }
  return true;
}

async function start() {
  if (!VAPID_KEY) return;                       // chưa cấu hình xong thì im lặng
  if (!('serviceWorker' in navigator)) return;
  if (isIOS && !isStandalone) {
    // iPhone chỉ nhận thông báo khi web được "Thêm vào Màn hình chính"
    onAuthStateChanged(getAuth(getApp()), (user) => {
      if (!user) return;
      const d = Number(lsGet(DISMISS_KEY) || 0);
      if (Date.now() - d < DISMISS_DAYS * 864e5) return;
      showCard(`<b>📲 Muốn nhận thông báo bài tập hông?</b><br>
        Trên iPhone làm 2 bước nha: bấm nút <b>Chia sẻ</b> <span style="opacity:.8">(ô vuông có mũi tên)</span>
        → <b>Thêm vào MH chính</b>. Rồi mở Night IELTS từ biểu tượng mới đó, bấm bật thông báo là xong 🙌`, null);
    });
    return;
  }
  if (!('Notification' in window) || !(await isSupported())) return;

  const app = getApp();
  const db = getFirestore(app);
  const messaging = getMessaging(app);

  onMessage(messaging, (p) => {
    const n = p.notification || {};
    const link = (p.fcmOptions && p.fcmOptions.link) || (p.data && p.data.link);
    showToast(n.title, n.body, link);
  });

  onAuthStateChanged(getAuth(app), async (user) => {
    removeCard();
    if (!user) return;
    if (Notification.permission === 'granted') {
      registerAndSave(user.uid, messaging, db).catch(e => console.warn('Night push:', e));
      return;
    }
    if (Notification.permission === 'denied') return;
    const d = Number(lsGet(DISMISS_KEY) || 0);
    if (Date.now() - d < DISMISS_DAYS * 864e5) return;
    showCard(`<b>🔔 Bật thông báo đi nè!</b><br>
      Có bài mới hay quên làm bài là Night réo liền, khỏi lo bị "bỏ quên" 😆`, async () => {
      const yes = document.querySelector('#np-card .np-yes');
      if (yes) { yes.disabled = true; yes.textContent = 'Đang bật...'; }
      try {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') { removeCard(); return; }
        await registerAndSave(user.uid, messaging, db);
        removeCard();
        showToast('Ngon lành cành đào 🎉', 'Từ giờ có bài là điện thoại "ting ting" liền nha!');
      } catch (e) {
        console.error('Night push:', e);
        removeCard();
        showToast('Ui, chưa bật được 😢', 'Thử tải lại trang rồi bấm lần nữa nha.');
      }
    });
  });
}

start().catch(e => console.warn('Night push:', e));
