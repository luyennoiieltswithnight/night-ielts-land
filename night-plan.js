/* Night IELTS — night-plan.js: gói tài khoản User / Pro / Học sinh.
   Dùng chung cho index.html, speaking.html, writing.html, khoahoc/night-progress.js, khoahoc/roadmap.js.

   Vai trò (users/<uid>.role):
     admin   – thầy, dùng mọi thứ.
     student – học sinh của thầy: được giao bài, vào các khoá thầy thêm, AI dùng key riêng.
     pro     – trả 99k/tháng: mở toàn bộ khoá học, AI dùng key riêng. Hết hạn (proUntil) → như user.
     user    – tài khoản thường (mới đăng ký): 3 buổi đầu mỗi khoá, AI miễn phí 5 phút / 5 tiếng
               cho mỗi kỹ năng qua máy chủ trung gian (apps-script/ai-proxy), dùng key của thầy.

   Firestore:
     publicSettings/main  { bank, acc, holder, qr, price, aiProxy, payServer }   (thầy sửa trong "👑 Tài khoản")
     Kho key AI: nằm ở máy chủ thanh toán (apps-script/thanh-toan, Thuộc tính KEY_POOL), không ở Firestore.
     proRequests/<uid>    { uid, email, name, photo, code, amount, status:'pending'|'approved'|'rejected', createdAt } */
(function () {
  if (window.NightPlan) return;
  var LITE = !!(document.currentScript && document.currentScript.hasAttribute('data-lite'));   // trang bài học: chỉ nối AI, không hiện nút/thông báo
  var FB_CONFIG = {
    apiKey: 'AIzaSyCmeN49M4oI78ZPWDhMlbisDOLaMJp2mb8',
    authDomain: 'night-ielts-land.firebaseapp.com',
    projectId: 'night-ielts-land',
    storageBucket: 'night-ielts-land.firebasestorage.app',
    messagingSenderId: '408519436407',
    appId: '1:408519436407:web:a9f0b9ba23368b54427e72'
  };
  var V = '10.8.1';
  var FREE_LESSONS = 3;
  var DAY = 86400000, MONTH = 30 * DAY;
  var LS_ME = 'nightPlanMe', LS_SET = 'nightPlanSettings';
  var SKILL_NAME = { speaking: 'Speaking', writing: 'Writing' };
  /* MỘT KEY AI CHO CẢ WEB (11/2026): mọi lời gọi tới api.groq.com trên trang có night-plan.js đều được chuyển
     qua máy chủ AI của thầy (apps-script/ai-proxy — 1 key OpenAI). Không ai phải nhập key nữa. */
  var ONE_KEY = true, AI_PLACEHOLDER = 'night-ai';
  var _fetch = window.fetch.bind(window);
  // Máy chủ thanh toán (apps-script/thanh-toan) — mặc định, thầy có thể đổi trong 👑 Tài khoản → Cài đặt
  var PAY_SERVER_DEFAULT = 'https://script.google.com/macros/s/AKfycbx8EyDjs7WFXlfK2VhDT_Dpdi3XMvADi_AbDpzJIBDA-NWWrMtKR-nys0C-x_3k9tC78A/exec';
  function payServer() { return (settings && settings.payServer) || PAY_SERVER_DEFAULT; }

  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return Number(n || 0).toLocaleString('vi-VN') + 'đ'; }
  function dmy(t) { var d = new Date(t); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
  function hm(t) { var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function siteRoot() {
    var s = document.querySelector('script[src*="night-plan.js"]');
    try { return new URL('./', s ? s.src : location.href).href; } catch (e) { return '/'; }
  }

  /* ---------- Firebase ---------- */
  var fbP = null;
  function fb() {
    if (fbP) return fbP;
    fbP = Promise.all([
      import('https://www.gstatic.com/firebasejs/' + V + '/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/' + V + '/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/' + V + '/firebase-firestore.js')
    ]).then(function (m) {
      /* Chờ trang tự khởi động Firebase trước (index/speaking/writing dùng initializeFirestore riêng),
         chỉ tự khởi động khi sau 6 giây trang vẫn chưa làm. */
      return new Promise(function (res) {
        var t0 = Date.now();
        (function wait() {
          if (m[0].getApps().length) return res(m[0].getApp());
          if (Date.now() - t0 > 6000) return res(m[0].initializeApp(FB_CONFIG));
          setTimeout(wait, 150);
        })();
      }).then(function (app) {
        return new Promise(function (r) { setTimeout(r, 50); }).then(function () {
          return { authM: m[1], fs: m[2], auth: m[1].getAuth(app), db: m[2].getFirestore(app) };
        });
      });
    });
    return fbP;
  }

  /* ---------- Vai trò ---------- */
  function effRole(u) {
    if (!u) return 'guest';
    var r = u.role || 'student';
    if (r === 'pro' && !(Number(u.proUntil) > Date.now())) return 'user';
    return r;
  }
  var me = lsGet(LS_ME), settings = lsGet(LS_SET) || {};
  var initP = null;
  function boot() {
    if (initP) return initP;
    initP = fb().then(function (o) {
      var setP = o.fs.getDoc(o.fs.doc(o.db, 'publicSettings', 'main')).then(function (s) {
        settings = s.exists() ? s.data() : {}; lsSet(LS_SET, settings); showSupportBtn();
      }).catch(function () {});
      var meP = new Promise(function (res) {
        var unsub = o.authM.onAuthStateChanged(o.auth, function (user) {
          unsub();
          if (!user) { me = null; lsSet(LS_ME, null); return res(); }
          o.fs.getDoc(o.fs.doc(o.db, 'users', user.uid)).then(function (s) {
            var d = s.exists() ? s.data() : { role: 'user' };
            me = { uid: user.uid, email: user.email || d.email || '', name: user.displayName || d.name || '', photo: user.photoURL || d.photo || '', role: d.role || 'student', groqKey: d.groqKey || '', proUntil: d.proUntil || 0 };
            lsSet(LS_ME, me); syncManagedKey(); res();
          }).catch(function () { res(); });
        });
      });
      return Promise.all([setP, meP]).then(function () { maybeClaimKey(); return me; });
    }).catch(function () { return me; });
    return initP;
  }
  /* ---------- Kho key AI (máy chủ thanh toán) ---------- */
  function payApi(action, extra) {
    if (!payServer()) return Promise.reject(new Error('Chưa có link máy chủ thanh toán (👑 Tài khoản → Cài đặt).'));
    return fb().then(function (o) {
      var u = o.auth.currentUser; if (!u) throw new Error('Chưa đăng nhập');
      return u.getIdToken();
    }).then(function (tok) {
      return fetch(payServer(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action: action, idToken: tok }, extra || {})) });
    }).then(function (r) { if (!r.ok) throw new Error('Máy chủ bận (' + r.status + ')'); return r.json(); })
      .then(function (j) { if (j && j.error) throw new Error(j.error === 'forbidden' ? 'Không có quyền' : j.error); return j; });
  }
  /* Pro / Astra còn hạn mà chưa có key riêng → tự xin 1 key trong kho (tối đa 1 lần / 10 phút mỗi máy) */
  function maybeClaimKey() {
    try {
      if (ONE_KEY || !me || effRole(me) !== 'pro' || me.groqKey || !payServer()) return;
      var k = 'nightKeyClaimAt', last = Number(sessionStorage.getItem(k) || 0);
      if (Date.now() - last < 10 * 60000) return;
      sessionStorage.setItem(k, String(Date.now()));
      payApi('claim').then(function (j) {
        if (j && j.key) { me.groqKey = j.key; lsSet(LS_ME, me); syncManagedKey(); pill('🔑 Tài khoản của bạn đã được cấp AI riêng — dùng thoải mái nhé!', 4000); }
      }).catch(function () {});
    } catch (e) {}
  }
  /* Tài khoản Pro: key Groq do admin cấp riêng (users/<uid>.groqKey) → tự điền vào máy, khoá ô nhập key.
     Học sinh: tự nhập key như cũ. Hết Pro → gỡ key được cấp khỏi máy. */
  var GK = 'nightIeltsGroqCfg';
  function syncManagedKey() {
    var cfg = {}; try { cfg = JSON.parse(localStorage.getItem(GK) || '{}') || {}; } catch (e) {}
    var pro = effRole(me) === 'pro', k = me && me.groqKey;
    if (ONE_KEY) {
      // Tài khoản không phải admin: ghi "key giả" để các trang thấy AI đã sẵn sàng; lời gọi thật đi qua máy chủ.
      if (me && effRole(me) !== 'admin') {
        if (cfg.apiKey !== AI_PLACEHOLDER || !cfg.managed) { cfg.apiKey = AI_PLACEHOLDER; cfg.managed = true; try { localStorage.setItem(GK, JSON.stringify(cfg)); } catch (e) {} }
        try { if (!localStorage.getItem('nightIeltsGroqApiKey')) localStorage.setItem('nightIeltsGroqApiKey', AI_PLACEHOLDER); } catch (e) {}
      } else if (cfg.managed && cfg.apiKey === AI_PLACEHOLDER && !me) { delete cfg.apiKey; delete cfg.managed; try { localStorage.setItem(GK, JSON.stringify(cfg)); } catch (e) {} }
    }
    else if (pro && k) { if (cfg.apiKey !== k || !cfg.managed) { cfg.apiKey = k; cfg.managed = true; try { localStorage.setItem(GK, JSON.stringify(cfg)); } catch (e) {} } }
    else if (cfg.managed) { delete cfg.apiKey; delete cfg.managed; try { localStorage.setItem(GK, JSON.stringify(cfg)); } catch (e) {} }
    lockKeyInputs();
  }
  /* User (miễn phí) và Pro / Astra không tự nhập key: ẩn nút bánh răng "Cấu hình Groq API Key".
     Bấm vào chỗ nào gọi tới cửa sổ nhập key thì User được mời nâng cấp, Pro được báo key do Night IELTS cấp. */
  function hideKeyUI() {
    var r = effRole(me), raw = me && me.role;
    if (!me || !(r === 'user' || r === 'pro' || raw === 'pro' || (ONE_KEY && r === 'student'))) return;
    var run = function () {
      if (!document.getElementById('npl-nokey-css')) { var st = document.createElement('style'); st.id = 'npl-nokey-css'; st.textContent = '#groqSettingsBtn,.btn.gear,#groqGearDot{display:none!important}'; document.head.appendChild(st); }
      var orig = window.openGroqSettingsModal;
      if (orig && !orig.__npl) {
        var f = function () {
          if (ONE_KEY && effRole(me) !== 'user') { pill('AI đã được Night IELTS kết nối sẵn cho tài khoản của bạn — không cần nhập key.', 4000); return; }
          if (effRole(me) === 'pro') { if (me && me.groqKey) return orig.apply(this, arguments); pill('Key AI của tài khoản bạn đang được Night IELTS cấp, chờ một lát nhé.', 4000); return; }
          openUpgrade('AI không giới hạn dành cho tài khoản ⭐ Pro / 🌟 Astra.', 'pro');
        };
        f.__npl = true; window.openGroqSettingsModal = f;
      }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
    setTimeout(run, 1500);
  }
  function lockKeyInputs() {
    hideKeyUI();
    if (ONE_KEY || effRole(me) !== 'pro') return;
    var run = function () {
      ['groqModalKeyInput', 'groqKeyInput'].forEach(function (id) {
        var el = document.getElementById(id); if (!el || el.dataset.nplLocked) return;
        el.dataset.nplLocked = '1'; el.disabled = true; el.type = 'password';
        el.value = (me && me.groqKey) || '';
        el.placeholder = 'Night IELTS sẽ cấp key cho tài khoản Pro';
        var n = document.createElement('p'); n.style.cssText = 'font-size:12px;color:#6B6B78;margin:4px 0 8px';
        n.textContent = (me && me.groqKey) ? 'Key AI do Night IELTS cấp riêng cho tài khoản Pro của bạn — không cần nhập. Lỗi thì nhắn admin.' : 'Tài khoản Pro: Night IELTS sẽ cấp key AI riêng cho bạn (thường trong ngày). Chưa có thì nhắn admin.';
        el.insertAdjacentElement('afterend', n);
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  }
  function ensure() { if (!me || !initP) initP = null; return boot(); }
  function role() { return effRole(me); }
  /* Được dùng AI miễn phí (key của thầy, có giới hạn)? Chỉ tài khoản thường / Pro đã hết hạn. */
  function freeOK() { return role() === 'user'; }
  /* Quyền vào khoá: 'full' | 'free' (3 buổi đầu) */
  function courseAccess(u, enrolled) {
    var r = effRole(u);
    if (r === 'admin' || (r === 'pro' && tierOf(u) === 'astra')) return 'full';
    if (r === 'student' && enrolled) return 'full';
    return 'free';
  }
  function lessonFree(n) { return Number(n) > 0 && Number(n) <= FREE_LESSONS; }

  /* ---------- Giao diện ---------- */
  var CSS = '.npl-ov{position:fixed;inset:0;z-index:100050;background:rgba(36,36,42,.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:#24242A}' +
    '.npl-bx{width:100%;max-width:520px;max-height:calc(100vh - 32px);display:flex;flex-direction:column;background:#24242A;border-radius:28px;padding:8px;box-shadow:0 30px 60px -30px rgba(0,0,0,.6)}' +
    '.npl-bx.wide{max-width:860px}' +
    '.npl-in{background:#fff;border-radius:22px;padding:22px 20px;overflow:auto}' +
    '.npl-hd{display:flex;align-items:center;gap:10px;margin-bottom:12px}.npl-hd h2{flex:1;margin:0;font-size:20px;font-weight:800}' +
    '.npl-x{border:0;background:#F1F1F6;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;color:#555}' +
    '.npl-old{color:#9CA3AF;font-weight:600;font-size:.72em;margin-right:4px;text-decoration:line-through}.npl-price .npl-old{font-size:16px}.npl-m .npl-old{display:block;font-size:11px;margin:2px 0 0}.npl-off{background:#DC2626;color:#fff;font-weight:800;font-size:12px;border-radius:999px;padding:2px 8px;align-self:center}' +
    '.npl-price{display:flex;align-items:baseline;gap:6px;margin:4px 0 12px}.npl-price b{font-size:30px;font-weight:800;color:#C2410C}.npl-price span{color:#6B6B78;font-size:14px}' +
    '.npl-plans{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:6px 0 10px}@media(max-width:520px){.npl-plans{grid-template-columns:1fr}}.npl-plan{position:relative;text-align:left;padding:14px;border:2px solid #E4E4EC;border-radius:18px;background:#fff;font:inherit;cursor:pointer}.npl-plan.on{border-color:#F59E0B;background:#FFFBEB;box-shadow:0 10px 24px -14px rgba(245,158,11,.6)}.npl-plan.astra.on{border-color:#7C3AED;background:#F5F3FF;box-shadow:0 10px 24px -14px rgba(124,58,237,.6)}.npl-plan>b{display:block;font-size:17px}.npl-pp{display:block;font-size:20px;font-weight:800;color:#C2410C;margin:2px 0 6px}.npl-plan.astra .npl-pp{color:#6D28D9}.npl-pp small{font-size:12px;color:#6B6B78;font-weight:600}.npl-plan ul{margin:0;padding-left:16px;font-size:12.5px;line-height:1.45;color:#3F3F46}.npl-hot{position:absolute;top:-9px;right:10px;white-space:nowrap;line-height:1.4;background:#7C3AED;color:#fff;font-size:10.5px;font-weight:800;padding:2px 8px;border-radius:99px}' +
    '.npl-ms{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px}.npl-m{position:relative;padding:10px 6px;border:2px solid #E4E4EC;border-radius:14px;background:#fff;font:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:1px}.npl-m b{font-size:14px}.npl-m span{font-size:13px;font-weight:700;color:#3F3F46}.npl-m small{font-size:11px;color:#059669;font-weight:700}.npl-m.on{border-color:#24242A;background:#24242A}.npl-m.on b,.npl-m.on span{color:#fff}.npl-m.on small{color:#6EE7B7}.npl-m .npl-hot{right:50%;transform:translateX(50%);background:#F59E0B}' +
    '.npl-ul{margin:0 0 14px;padding:0;list-style:none}.npl-ul li{padding:6px 0 6px 26px;position:relative;font-size:14px;line-height:1.5}.npl-ul li:before{content:"✓";position:absolute;left:4px;top:6px;color:#16A34A;font-weight:800}' +
    '.npl-pay{display:flex;gap:14px;align-items:flex-start;background:#FFF7ED;border:1.5px solid #FED7AA;border-radius:18px;padding:12px;margin-bottom:12px;flex-wrap:wrap}' +
    '.npl-pay img{width:150px;height:150px;object-fit:contain;background:#fff;border-radius:12px;flex:none}' +
    '.npl-kv{flex:1;min-width:200px;font-size:14px}.npl-kv div{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px dashed #FED7AA}.npl-kv div:last-child{border:0}.npl-kv span{color:#6B6B78}.npl-kv b{text-align:right;word-break:break-all}' +
    '.npl-cp{border:0;background:#24242A;color:#fff;font:700 11px inherit;font-family:inherit;padding:3px 8px;border-radius:999px;cursor:pointer;margin-left:6px}' +
    '.npl-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;cursor:pointer;background:#24242A;color:#fff;font:800 14px inherit;font-family:inherit;padding:12px 18px;border-radius:999px;text-decoration:none}' +
    '.npl-btn.gold{background:linear-gradient(135deg,#F59E0B,#EA580C)}.npl-btn.ghost{background:#F1F1F6;color:#24242A}.npl-btn.green{background:#16A34A}.npl-btn.red{background:#E11D48}.npl-btn.sm{padding:7px 12px;font-size:12px}' +
    '.npl-btn:disabled{opacity:.55;cursor:default}' +
    '.npl-note{font-size:13px;color:#6B6B78;line-height:1.55;margin:10px 0 0}.npl-ok{background:#ECFDF5;color:#065F46;border-radius:14px;padding:10px 12px;font-size:14px;margin:8px 0}' +
    '.npl-tabs{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}.npl-tab{border:0;background:#F1F1F6;color:#24242A;font:700 13px inherit;font-family:inherit;padding:8px 14px;border-radius:999px;cursor:pointer}.npl-tab[aria-selected=true]{background:#24242A;color:#fff}' +
    '.npl-seg{display:flex;gap:6px;padding:5px;background:#F1F1F5;border-radius:16px;margin-bottom:10px}.npl-seg button{flex:1;padding:10px 8px;border:0;border-radius:12px;background:transparent;font:inherit;font-weight:800;font-size:14px;color:#6B6B78;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap}.npl-seg button span{background:#fff;border-radius:99px;padding:1px 8px;font-size:12px}.npl-seg button em{font-style:normal;font-size:11px;background:#FEF3C7;color:#92400E;border-radius:99px;padding:2px 7px}.npl-seg button.on{background:#24242A;color:#fff}.npl-seg button.on span{background:rgba(255,255,255,.2)}' +
    '.npl-row{display:flex;align-items:center;gap:10px;padding:10px;border:1.5px solid #EEEEF4;border-radius:16px;margin-bottom:8px;flex-wrap:wrap}' +
    '.npl-row img{width:36px;height:36px;border-radius:50%;object-fit:cover;flex:none;background:#eee}.npl-who{flex:1;min-width:150px;font-size:13px;line-height:1.35}.npl-who b{font-size:14px}.npl-who small{color:#6B6B78;display:block;word-break:break-all}' +
    '.npl-tag{font-size:11px;font-weight:800;padding:3px 9px;border-radius:999px;background:#F1F1F6}.npl-tag.pro{background:#FEF3C7;color:#92400E}.npl-tag.student{background:#E0E7FF;color:#3730A3}.npl-tag.admin{background:#24242A;color:#fff}.npl-tag.user{background:#F1F5F9;color:#475569}' +
    '.npl-sel,.npl-inp{border:1.5px solid #E5E5EE;border-radius:12px;padding:8px 10px;font:600 13px inherit;font-family:inherit;background:#fff;color:#24242A}.npl-inp{width:100%;box-sizing:border-box}' +
    '.npl-f{display:block;margin:0 0 12px}.npl-f>span{display:block;font-size:12px;font-weight:800;color:#6B6B78;margin-bottom:5px}' +
    '.npl-pill{position:fixed;left:14px;bottom:14px;z-index:100040;background:#24242A;color:#fff;font:700 13px "Plus Jakarta Sans",system-ui,sans-serif;padding:10px 14px;border-radius:999px;box-shadow:0 10px 30px -10px rgba(0,0,0,.5);max-width:calc(100vw - 28px);transition:opacity .4s}' +
    '.npl-pill a{color:#FCD34D;margin-left:6px;cursor:pointer;text-decoration:underline}' +
    '.npl-badge{display:inline-flex;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#E11D48;color:#fff;font-size:10px;font-weight:800;align-items:center;justify-content:center;margin-left:6px}';
  function css() { if (document.getElementById('npl-css')) return; var s = document.createElement('style'); s.id = 'npl-css'; s.textContent = CSS; document.head.appendChild(s); }
  function modal(html, wide) {
    css();
    var ov = document.createElement('div'); ov.className = 'npl-ov';
    ov.innerHTML = '<div class="npl-bx' + (wide ? ' wide' : '') + '"><div class="npl-in">' + html + '</div></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.npl-x')) ov.remove(); });
    document.body.appendChild(ov);
    return ov;
  }
  function copyBtn(text) { return '<button type="button" class="npl-cp" data-cp="' + esc(text) + '">Copy</button>'; }
  function wireCopy(root) {
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cp]'); if (!b) return;
      var t = b.getAttribute('data-cp');
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = 'Đã copy'; }, function () { b.textContent = t; });
    });
  }
  /* VietQR: ảnh QR có sẵn số tiền + nội dung CK (quét là điền hết). Đoán mã ngân hàng từ tên thầy nhập. */
  var BANKS = [['vietcombank|vcb','970436'],['vietinbank|ctg|icb','970415'],['bidv','970418'],['agribank|vba','970405'],['techcombank|tcb','970407'],['mbbank|mb bank|^mb$|quan doi','970422'],['acb|a chau','970416'],['vpbank|vp bank','970432'],['tpbank|tp bank|tien phong','970423'],['sacombank|stb','970403'],['hdbank','970437'],['vib','970441'],['shb','970443'],['ocb|phuong dong','970448'],['msb|maritime','970426'],['seabank','970440'],['eximbank|eib','970431'],['lpbank|lienviet|lpb','970449'],['vietcapital|ban viet','970454'],['abbank','970425'],['namabank|nam a','970428'],['bac a|bab','970409'],['pvcombank','970412'],['kienlong','970452'],['cake','546034'],['ubank','546035'],['timo','963388'],['scb','970429'],['dong a','970406'],['baoviet','970438'],['saigonbank','970400'],['vietabank|viet a','970427'],['ncb|quoc dan','970419'],['pgbank','970430'],['oceanbank','970414'],['gpbank','970408'],['vrb','970421'],['woori','970457'],['shinhan','970424'],['uob','970458'],['cimb','422589'],['public bank','970439'],['hong leong','970442'],['standard chartered','970410'],['vikki','970406']];
  function bankBin(name) {
    var n = String(name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
    if (/^\d{6}$/.test(n)) return n;
    for (var i = 0; i < BANKS.length; i++) if (new RegExp(BANKS[i][0]).test(n)) return BANKS[i][1];
    return '';
  }
  function vietQR(st, amount, info) {
    var bin = bankBin(st.bank), acc = String(st.acc || '').replace(/\s/g, '');
    if (!bin || !acc) return '';
    return 'https://img.vietqr.io/image/' + bin + '-' + encodeURIComponent(acc) + '-compact2.png?amount=' + Math.round(amount || 0) + '&addInfo=' + encodeURIComponent(info || '') + '&accountName=' + encodeURIComponent(st.holder || '');
  }
  function payCode(uid, plan, months) { return (plan ? 'NIGHT' + (plan === 'astra' ? 'A' : 'P') + (months || 1) : 'NIGHTPRO') + ' ' + String(uid || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase(); }
  /* ---------- Gói: Pro (AI chấm Speaking + Writing) · Astra (AI + mọi khoá học) ---------- */
  var PLAN_DEF = {
    pro: { name: 'Pro', icon: '⭐', prices: { 1: 49000, 3: 129000, 6: 229000 }, perks: ['AI chấm chữa <b>Speaking</b> và <b>Writing</b> không giới hạn', 'Bản sửa lỗi, nâng cấp từ vựng, phân tích band chi tiết', 'Lưu bài làm, xem lại tiến bộ trên mọi thiết bị'] },
    astra: { name: 'Astra', icon: '🌟', prices: { 1: 79000, 3: 199000, 6: 359000 }, perks: ['<b>Tất cả quyền lợi gói Pro</b>', 'Mở <b>toàn bộ buổi học</b> của mọi khoá: Giao tiếp, Speaking, Writing, Chuyên đề…', 'Học theo lộ trình, lưu tiến độ từng buổi'] }
  };
  var MONTHS = [1, 3, 6];
  /* Giá gốc hiển thị (gạch ngang): giá bán đang là giá đã giảm 20% → giá gốc = giá bán / 0,8, làm tròn nghìn */
  var LIST_OFF = 20;
  function listPrice(p) { return Math.round(p / (1 - LIST_OFF / 100) / 1000) * 1000; }
  function oldP(p) { return '<s class="npl-old">' + money(listPrice(p)) + '</s>'; }
  function offTag() { return '<span class="npl-off">−' + LIST_OFF + '%</span>'; }
  function planPrice(plan, m) {
    var sp = settings && settings.plans && settings.plans[plan];
    var v = sp && Number(sp[m]); return v > 0 ? v : PLAN_DEF[plan].prices[m];
  }
  /* Gói của tài khoản Pro còn hạn: tier 'pro' = chỉ AI; 'astra' hoặc không ghi (Pro mua trước khi chia gói) = AI + khoá học */
  function tierOf(u) { return effRole(u) === 'pro' ? (u.tier === 'pro' ? 'pro' : 'astra') : ''; }
  function planName(u) { var t = tierOf(u); return t ? PLAN_DEF[t].name : ''; }

  /* ---------- Nâng cấp Pro (người dùng) ---------- */
  function openUpgrade(reason, wantPlan) {
    css();
    var ov = modal('<div class="npl-hd"><h2>🌟 Nâng cấp Night IELTS</h2><button class="npl-x" aria-label="Đóng">×</button></div><p class="npl-note">Đang tải…</p>');
    var box = ov.querySelector('.npl-in');
    var plan = wantPlan === 'pro' ? 'pro' : 'astra', months = 3;
    ensure().then(function () { return fb(); }).then(function (o) {
      var user = o.auth.currentUser;
      var hd = '<div class="npl-hd"><h2>🌟 Nâng cấp Night IELTS</h2><button class="npl-x" aria-label="Đóng">×</button></div>' +
        (reason ? '<div class="npl-ok" style="background:#FFF7ED;color:#9A3412">' + reason + '</div>' : '');
      if (!user) { box.innerHTML = hd + '<p class="npl-note">Đăng nhập bằng Gmail ở trang chủ trước, rồi bấm nâng cấp lại nhé.</p>'; return; }
      var r = role();
      if (r === 'admin' || r === 'student') {
        box.innerHTML = hd + '<div class="npl-ok">Bạn là ' + (r === 'admin' ? 'giáo viên' : '<b>học sinh</b> của Night IELTS') + ', không cần nâng cấp.</div>'; return;
      }
      var reqRef = o.fs.doc(o.db, 'proRequests', user.uid);
      o.fs.getDoc(reqRef).catch(function () { return null; }).then(function (rs) {
        var rq = rs && rs.exists() ? rs.data() : null;
        if (r === 'pro' && !wantPlan) plan = tierOf(me) || 'astra';
        var stopW = function () {}, startU = Number(me && me.proUntil) || 0;
        new MutationObserver(function () { if (!ov.isConnected) stopW(); }).observe(document.body, { childList: true });
        function paint() {
          var price0 = planPrice(plan, months), p0 = plan, m0 = months;
          getOrder(o, user, { kind: 'plan', plan: plan, months: months }, price0).then(function (code) { if (p0 === plan && m0 === months) paintWith(code); })
            .catch(function () { paintWith(payCode(user.uid, plan, months)); });
        }
        function paintWith(code) {
          var price = planPrice(plan, months), per = Math.round(price / months / 1000) * 1000, base = planPrice(plan, 1) * months;
          var save = base > price ? Math.round((1 - price / base) * 100) : 0;
          var status = '';
          if (r === 'pro') status = '<div class="npl-ok">✅ Bạn đang dùng gói <b>' + planName(me) + '</b> đến hết ngày <b>' + dmy(me.proUntil) + '</b>. Chuyển khoản thêm để gia hạn' + (tierOf(me) === 'pro' ? ' hoặc lên <b>Astra</b>' : '') + '.</div>';
          if (rq && rq.status === 'pending') status += '<div class="npl-ok" style="background:#EFF6FF;color:#1E40AF">⏳ Đã gửi yêu cầu' + (rq.plan ? ' gói <b>' + PLAN_DEF[rq.plan].name + ' ' + rq.months + ' tháng</b>' : '') + ' lúc ' + hm(rq.createdAt) + ' ' + dmy(rq.createdAt) + '. Night IELTS kiểm tra chuyển khoản rồi duyệt, trang sẽ tự mở khi bạn tải lại.</div>';
          if (rq && rq.status === 'rejected' && r !== 'pro') status += '<div class="npl-ok" style="background:#FFF1F2;color:#9F1239">Yêu cầu trước chưa được duyệt (chưa thấy chuyển khoản). Nhắn Night IELTS nếu bạn đã chuyển.</div>';
          var cards = ['pro', 'astra'].map(function (k) {
            var d = PLAN_DEF[k];
            return '<button type="button" class="npl-plan' + (plan === k ? ' on' : '') + (k === 'astra' ? ' astra' : '') + '" data-plan="' + k + '">' + (k === 'astra' ? '<span class="npl-hot">Đầy đủ nhất</span>' : '') +
              '<b>' + d.icon + ' ' + d.name + '</b><span class="npl-pp">' + oldP(planPrice(k, 1)) + money(planPrice(k, 1)) + '<small>/tháng</small></span><ul>' + d.perks.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></button>';
          }).join('');
          var chips = MONTHS.map(function (m) {
            var pr = planPrice(plan, m), bs = planPrice(plan, 1) * m, sv = bs > pr ? Math.round((1 - pr / bs) * 100) : 0;
            return '<button type="button" class="npl-m' + (months === m ? ' on' : '') + '" data-m="' + m + '">' + (m === 3 ? '<span class="npl-hot">Phổ biến</span>' : '') + '<b>' + m + ' tháng</b>' + oldP(pr) + '<span>' + money(pr) + '</span>' + (sv ? '<small>tiết kiệm ' + sv + '%</small>' : '<small>&nbsp;</small>') + '</button>';
          }).join('');
          var hasBank = settings.acc || settings.qr, dq = vietQR(settings, price, code);
          box.innerHTML = hd + status + '<div class="npl-plans">' + cards + '</div><div class="npl-ms">' + chips + '</div>' +
            '<div class="npl-price">' + oldP(price) + '<b>' + money(price) + '</b>' + offTag() + '<span>' + months + ' tháng' + (months > 1 ? ' · ≈ ' + money(per) + '/tháng' + (save ? ' · tiết kiệm ' + save + '%' : '') : '') + '</span></div>' +
            (hasBank ? '<div class="npl-pay">' + (dq ? '<img src="' + esc(dq) + '" alt="QR chuyển khoản"' + (settings.qr ? ' onerror="this.onerror=null;this.src=\'' + esc(settings.qr) + '\'"' : '') + '>' : (settings.qr ? '<img src="' + esc(settings.qr) + '" alt="QR chuyển khoản">' : '')) +
              '<div class="npl-kv"><div><span>Ngân hàng</span><b>' + esc(settings.bank || '') + '</b></div>' +
              '<div><span>Số tài khoản</span><b>' + esc(settings.acc || '') + (settings.acc ? copyBtn(settings.acc) : '') + '</b></div>' +
              '<div><span>Chủ tài khoản</span><b>' + esc(settings.holder || '') + '</b></div>' +
              '<div><span>Số tiền</span><b>' + money(price) + '</b></div>' +
              '<div><span>Nội dung CK</span><b>' + esc(code) + copyBtn(code) + '</b></div></div></div>'
              : '<p class="npl-note">Night IELTS chưa cập nhật thông tin chuyển khoản. Nhắn Night IELTS để đăng ký nhé.</p>') +
            (dq ? '<p class="npl-note" style="margin:0 0 8px">📱 Quét mã QR bằng app ngân hàng: <b>số tiền và nội dung đã điền sẵn</b>, chỉ cần bấm chuyển.</p>' : '') +
            '<div class="npl-ok" style="background:#EFF6FF;color:#1E40AF" data-wait>⏳ Ghi đúng <b>nội dung ' + esc(code) + '</b>. Tiền vào là <b>gói tự kích hoạt sau vài giây</b>, không cần chờ duyệt.</div>' +
            '<button type="button" class="npl-btn ghost" id="npl-sent" style="font-size:12px"' + (rq && rq.status === 'pending' ? ' disabled' : '') + '>Đã chuyển hơn 10 phút mà chưa mở? Báo Night IELTS</button>';
          stopW(); stopW = watchMe(o, user.uid, function (u) { return Number(u.proUntil) > Math.max(startU, Date.now()) + 1000; }, function (u) {
            var w = box.querySelector('[data-wait]');
            if (w) { w.style.background = '#ECFDF5'; w.style.color = '#065F46'; w.innerHTML = '🎉 Đã nhận tiền! Gói <b>' + esc(planName(u) || '') + '</b> dùng đến hết ngày <b>' + dmy(u.proUntil) + '</b>. Tải lại trang để dùng ngay.'; }
          });
          wireCopy(box);
          box.querySelectorAll('[data-plan]').forEach(function (x) { x.onclick = function () { plan = x.dataset.plan; paint(); }; });
          box.querySelectorAll('[data-m]').forEach(function (x) { x.onclick = function () { months = +x.dataset.m; paint(); }; });
          var b = box.querySelector('#npl-sent');
          if (b) b.onclick = function () {
            b.disabled = true; b.textContent = 'Đang gửi…';
            o.fs.setDoc(reqRef, { uid: user.uid, email: user.email || '', name: user.displayName || '', photo: user.photoURL || '', code: code, amount: price, plan: plan, months: months, status: 'pending', createdAt: Date.now() })
              .then(function () { rq = { status: 'pending', plan: plan, months: months, createdAt: Date.now() }; paint(); })
              .catch(function (e) { b.disabled = false; b.textContent = '💸 Tôi đã chuyển khoản'; alert('Chưa gửi được (' + (e.code || e.message) + '). Nhắn Night IELTS giúp nhé.'); });
          };
        }
        paint();
      });
    }).catch(function (e) { box.innerHTML = '<p class="npl-note">Không tải được (' + esc(e && e.message) + ').</p>'; });
  }

  /* ---------- Quản lý tài khoản (thầy) ---------- */
  var ROLE_LABEL = { user: 'User', pro: 'Pro', astra: 'Astra', student: 'Học sinh', admin: 'Thầy' };
  function pendingCount() {
    return fb().then(function (o) {
      return o.fs.getDocs(o.fs.query(o.fs.collection(o.db, 'proRequests'), o.fs.where('status', '==', 'pending'))).then(function (s) { return s.size; });
    }).catch(function () { return 0; });
  }
  function openAdmin(onChange) {
    var ov = modal('<div class="npl-hd"><h2>👑 Tài khoản & gói Pro · Astra</h2><button class="npl-x" aria-label="Đóng">×</button></div>' +
      '<div class="npl-tabs"><button class="npl-tab" data-t="req" aria-selected="true">Yêu cầu nâng cấp</button><button class="npl-tab" data-t="all" aria-selected="false">Tất cả tài khoản</button><button class="npl-tab" data-t="set" aria-selected="false">Cài đặt</button></div><div id="npl-body"><p class="npl-note">Đang tải…</p></div>', true);
    var body = ov.querySelector('#npl-body'), tab = 'req', users = [], reqs = [], q = '', seg = 'stu', o, PAGE = 40, shown = 40;
    var changed = function () { try { onChange && onChange(); } catch (e) {} };
    ov.querySelector('.npl-tabs').addEventListener('click', function (e) {
      var t = e.target.closest('.npl-tab'); if (!t) return;
      tab = t.dataset.t; ov.querySelectorAll('.npl-tab').forEach(function (x) { x.setAttribute('aria-selected', x === t); }); paint();
    });
    function load() {
      return Promise.all([
        o.fs.getDocs(o.fs.collection(o.db, 'users')).then(function (s) { users = []; s.forEach(function (d) { var u = d.data(); u.uid = d.id; users.push(u); }); }),
        o.fs.getDocs(o.fs.query(o.fs.collection(o.db, 'proRequests'), o.fs.where('status', '==', 'pending'))).then(function (s) { reqs = []; s.forEach(function (d) { var r = d.data(); r.uid = d.id; reqs.push(r); }); reqs.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }); })
      ]);
    }
    function uOf(uid) { for (var i = 0; i < users.length; i++) if (users[i].uid === uid) return users[i]; return null; }
    /* r: user | student | pro | astra (pro/astra = role 'pro' + tier). addMonths: số tháng cộng thêm (0 = chỉ cho 1 tháng nếu đang hết hạn) */
    function setRole(uid, r, addMonths) {
      var u = uOf(uid) || {}, paid = r === 'pro' || r === 'astra', data = { role: paid ? 'pro' : r };
      if (paid) {
        data.tier = r;
        var base = Math.max(Date.now(), Number(u.proUntil) || 0);
        if (addMonths) data.proUntil = base + addMonths * MONTH;
        else if (!(Number(u.proUntil) > Date.now())) data.proUntil = base + MONTH;
      }
      return o.fs.setDoc(o.fs.doc(o.db, 'users', uid), data, { merge: true }).then(function () {
        Object.assign(u, data); changed();
        if (!ONE_KEY && paid && !u.groqKey && payServer()) {
          payApi('assign', { uid: uid }).then(function (j) {
            if (j.key) { u.groqKey = j.key; pill('🔑 Đã tự cấp key AI từ kho cho ' + esc(u.email || u.name || 'tài khoản') + (j.had ? ' (key cũ)' : ''), 3500); if (tab === 'all') paintList(); }
            else if (j.empty) pill('⚠️ Kho key AI đã hết — tài khoản này tạm dùng AI qua máy chủ chung. Nạp thêm key trong 👑 Tài khoản → Cài đặt.', 6000);
          }).catch(function (er) { pill('Không tự cấp được key: ' + esc(er.message), 5000); });
        }
      });
    }
    function decide(uid, how) {
      var rq = reqs.filter(function (x) { return x.uid === uid; })[0] || {};
      var p = how === 'reject' ? Promise.resolve() : how === 'approve' ? setRole(uid, rq.plan === 'pro' ? 'pro' : 'astra', Number(rq.months) || 1) : setRole(uid, how, 0);
      return p.then(function () {
        return o.fs.setDoc(o.fs.doc(o.db, 'proRequests', uid), { status: how === 'reject' ? 'rejected' : 'approved', decidedAt: Date.now(), decidedAs: how }, { merge: true });
      }).then(function () { reqs = reqs.filter(function (r) { return r.uid !== uid; }); paint(); changed(); });
    }
    function tag(u) { var r = effRole(u), raw = u.role || 'student'; return '<span class="npl-tag ' + r + '">' + (raw === 'pro' && r === 'user' ? (u.tier === 'pro' ? 'Pro' : 'Astra') + ' hết hạn' : r === 'pro' ? (tierOf(u) === 'pro' ? '⭐ Pro' : '🌟 Astra') : ROLE_LABEL[r] || r) + '</span>'; }
    function who(u) { return '<img loading="lazy" decoding="async" src="' + esc(u.photo || '') + '" alt="" onerror="this.style.visibility=\'hidden\'"><div class="npl-who"><b>' + esc(u.name || '(chưa có tên)') + '</b><small>' + esc(u.email || '') + '</small></div>'; }
    function rowHtml(u) {
      var r = effRole(u), raw = u.role || 'student';
      return '<div class="npl-row" data-uid="' + esc(u.uid) + '">' + who(u) + tag(u) +
        (raw === 'pro' && u.proUntil ? '<span style="font-size:12px;color:#6B6B78">đến ' + dmy(u.proUntil) + '</span>' : '') +
        (r === 'admin' ? '' : '<select class="npl-sel" data-role>' + ['user', 'pro', 'astra', 'student'].map(function (x) { var cur = raw === 'pro' ? (u.tier === 'pro' ? 'pro' : 'astra') : raw; return '<option value="' + x + '"' + (cur === x ? ' selected' : '') + '>' + ROLE_LABEL[x] + '</option>'; }).join('') + '</select>' +
          (raw === 'pro' ? '<button class="npl-btn sm gold" data-plus>+1 tháng</button><input class="npl-inp" data-key type="text" autocomplete="off" data-lpignore="true" data-1p-ignore spellcheck="false" placeholder="Key Groq cấp riêng (gsk_…)" value="' + esc(u.groqKey || '') + '" style="flex:1;min-width:170px;padding:6px 10px;font-size:12px;-webkit-text-security:disc"><button class="npl-btn sm" data-savekey>' + (u.groqKey ? 'Đổi key' : 'Lưu key') + '</button>' : '')) + '</div>';
    }
    function paintList() {
      var box = body.querySelector('#npl-list'); if (!box) return;
      var isStu = function (u) { var r = effRole(u); return r === 'student' || r === 'admin'; };
      var rank = function (u) { var r = effRole(u), raw = u.role || 'student'; return r === 'admin' ? 0 : r === 'pro' ? 1 : raw === 'pro' ? 2 : 3; };
      var list = users.filter(function (u) {
        if ((seg === 'stu') !== isStu(u)) return false;
        return !q || ((u.name || '') + ' ' + (u.email || '')).toLowerCase().indexOf(q) >= 0;
      }).sort(function (a, b) { return rank(a) - rank(b) || (rank(a) === 1 ? (b.proUntil || 0) - (a.proUntil || 0) : 0) || (b.createdAt || 0) - (a.createdAt || 0); });
      box.innerHTML = list.length ? list.slice(0, shown).map(rowHtml).join('') +
        (list.length > shown ? '<button class="npl-btn ghost" data-more style="width:100%">Hiện thêm (' + (list.length - shown) + ' tài khoản nữa)</button>' : '')
        : (q ? (function () {
            var other = users.filter(function (u) { return (seg === 'stu') === !isStu(u) && ((u.name || '') + ' ' + (u.email || '')).toLowerCase().indexOf(q) >= 0; }).length;
            return '<p class="npl-note">Không có tài khoản nào khớp “<b>' + esc(q) + '</b>” trong nhóm ' + (seg === 'stu' ? 'Học sinh' : 'User') + (other ? ' (có ' + other + ' ở nhóm ' + (seg === 'stu' ? 'User' : 'Học sinh') + ')' : '') + '.</p><button class="npl-btn ghost" data-clearq>Xoá ô tìm kiếm</button>';
          })() : '<p class="npl-note">' + (seg === 'stu' ? 'Chưa có học sinh nào.' : 'Chưa có User nào.') + '</p>');
    }
    function paint() {
      if (tab === 'req') {
        body.innerHTML = reqs.length ? reqs.map(function (r) {
          var u = uOf(r.uid) || r;
          return '<div class="npl-row" data-uid="' + esc(r.uid) + '">' + who({ photo: r.photo || u.photo, name: r.name || u.name, email: r.email || u.email }) +
            '<div style="font-size:12px;line-height:1.4"><b>' + esc(r.code || '') + '</b><br><span style="color:#6B6B78">' + money(r.amount) + ' · ' + hm(r.createdAt) + ' ' + dmy(r.createdAt) + '</span></div>' +
            '<button class="npl-btn sm gold" data-d="approve">Duyệt ' + (r.plan ? PLAN_DEF[r.plan].name + ' ' + (r.months || 1) + ' tháng' : 'Astra 1 tháng') + '</button><button class="npl-btn sm" data-d="student">Cho làm Học sinh</button><button class="npl-btn sm ghost" data-d="reject">Từ chối</button></div>';
        }).join('') + '<p class="npl-note">Đối chiếu <b>nội dung chuyển khoản</b> trong app ngân hàng với mã NIGHTPRO ở mỗi dòng rồi mới duyệt.</p>'
          : '<p class="npl-note">Chưa có yêu cầu nào đang chờ. 🎉</p>';
      } else if (tab === 'all') {
        // 2 nhóm riêng: Học sinh | User (Pro xếp lên đầu). Đổi vai trò là tài khoản tự chuyển sang nhóm kia.
        var isStu = function (u) { var r = effRole(u); return r === 'student' || r === 'admin'; };
        var nStu = users.filter(isStu).length, nUsr = users.length - nStu;
        var nPro = users.filter(function (u) { return effRole(u) === 'pro'; }).length;   // Pro + Astra còn hạn
        body.innerHTML = '<div class="npl-seg"><button data-seg="stu"' + (seg === 'stu' ? ' class="on"' : '') + '>🎓 Học sinh <span>' + nStu + '</span></button><button data-seg="usr"' + (seg === 'usr' ? ' class="on"' : '') + '>👤 User <span>' + nUsr + '</span>' + (nPro ? '<em>⭐ ' + nPro + ' trả phí</em>' : '') + '</button></div>' +
          '<div id="npl-list"></div>';
        q = '';
        paintList();
      } else {
        var s = settings || {};
        body.innerHTML = '<div class="npl-f"><span>Bảng giá (đồng)</span><table style="width:100%;border-collapse:collapse;font-size:13px"><tr><th></th>' + MONTHS.map(function (m) { return '<th style="text-align:left;padding:4px">' + m + ' tháng</th>'; }).join('') + '</tr>' +
          ['pro', 'astra'].map(function (k) { return '<tr><td style="padding:4px;font-weight:800">' + PLAN_DEF[k].icon + ' ' + PLAN_DEF[k].name + '</td>' + MONTHS.map(function (m) { return '<td style="padding:4px"><input class="npl-inp" type="number" data-pp="' + k + m + '" value="' + planPrice(k, m) + '" style="width:100%;padding:6px 8px"></td>'; }).join('') + '</tr>'; }).join('') +
          '</table><p class="npl-note" style="margin:4px 0 0">Pro = AI chấm Speaking + Writing. Astra = Pro + mở toàn bộ khoá học. Tài khoản Pro mua trước khi chia gói được tính là Astra đến hết hạn.</p></div>' +
          '<label class="npl-f"><span>Link máy chủ AI miễn phí (Apps Script ai-proxy, dạng https://script.google.com/macros/s/…/exec)</span><input class="npl-inp" id="npl-proxy" value="' + esc(s.aiProxy || '') + '" placeholder="Để trống = tắt AI miễn phí cho User"></label>' +
          '<p class="npl-note" style="margin:-4px 0 12px">Tài khoản User được AI miễn phí <b>5 phút mỗi 5 tiếng</b> cho mỗi kỹ năng (Speaking tính thời lượng ghi âm, Writing ≈ 1–2 bài chấm). Key Groq của thầy nằm trong Apps Script, không lộ ra web. Hướng dẫn cài ở đầu file <b>apps-script/ai-proxy/Code.gs</b>.</p>' +
          '<label class="npl-f"><span>Link máy chủ thanh toán (Apps Script thanh-toan, dạng https://script.google.com/macros/s/…/exec) — dùng cho kho key AI</span><input class="npl-inp" id="npl-pay" value="' + esc(s.payServer || PAY_SERVER_DEFAULT) + '" placeholder="https://script.google.com/macros/s/…/exec"></label>' +
          '<div class="npl-f" id="npl-pool"><span>🔑 Kho key AI — tự cấp cho tài khoản Pro / Astra chưa có key</span><div id="npl-pool-box" class="npl-note">' + (payServer() ? 'Đang tải kho key…' : 'Dán link máy chủ thanh toán ở trên rồi bấm Lưu cài đặt để dùng kho key.') + '</div>' +
          '<textarea class="npl-inp" id="npl-pool-add" rows="3" placeholder="Dán key Groq mới (gsk_…), mỗi key một dòng" style="width:100%;margin-top:6px;font-family:monospace;font-size:12px;-webkit-text-security:disc"></textarea>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button class="npl-btn sm gold" id="npl-pool-addbtn" type="button">➕ Thêm vào kho</button><button class="npl-btn sm ghost" id="npl-pool-reclaim" type="button">♻️ Thu hồi key của tài khoản hết hạn &gt; 30 ngày</button></div>' +
          '<p class="npl-note" style="margin:6px 0 0">Ai trả tiền qua SePay, được thầy duyệt / đổi sang Pro · Astra, hoặc tài khoản Pro chưa có key mở web → máy chủ tự lấy 1 key trống ghi vào tài khoản. Kho hết key thì tài khoản vẫn dùng AI qua máy chủ chung như trước.</p></div>' +
          '<label class="npl-f"><span>Số Zalo nhận góp ý / khiếu nại (hiện nút 💬 ở góc trái dưới mọi trang)</span><input class="npl-inp" id="npl-zalo" value="' + esc(s.zalo || '') + '" placeholder="vd: 0912345678 — để trống = ẩn nút"></label>' +
          '<div class="npl-f"><span>Thông tin chuyển khoản hiện cho người mua Pro</span><div class="npl-ok" style="background:#F8F8FB;color:#24242A">' +
          (s.acc ? esc(s.bank || '') + ' · <b>' + esc(s.acc) + '</b> · ' + esc(s.holder || '') + (s.qr ? ' · có ảnh QR' : '') + (s.acc ? (bankBin(s.bank) ? '<br><span style="color:#047857;font-size:12px">✅ QR tự điền số tiền + nội dung: đang bật</span>' : '<br><span style="color:#E11D48;font-size:12px">⚠️ Không nhận ra tên ngân hàng "' + esc(s.bank || '') + '" để tạo QR tự điền — sửa tên ngân hàng trong Học Phí (vd: Vietcombank, MB Bank, Techcombank)</span>') : '') : 'Chưa có') +
          '<br><span style="color:#6B6B78;font-size:12px">Lấy tự động từ mục <b>Học Phí → Thông tin chuyển khoản</b> mỗi lần thầy bấm Lưu ở đây.</span></div></div>' +
          '<button class="npl-btn" id="npl-save">Lưu cài đặt</button> <span id="npl-msg" class="npl-note"></span>';
        body.querySelector('#npl-save').onclick = function () {
          var btn = this; btn.disabled = true;
          o.fs.getDoc(o.fs.doc(o.db, 'tuitionSettings', 'main')).catch(function () { return null; }).then(function (ts) {
            var t = ts && ts.exists() ? ts.data() : {};
            var plans = {}; ['pro', 'astra'].forEach(function (k) { plans[k] = {}; MONTHS.forEach(function (m) { plans[k][m] = Number(body.querySelector('[data-pp="' + k + m + '"]').value) || PLAN_DEF[k].prices[m]; }); });
            var rec = { plans: plans, price: plans.astra[1], aiProxy: body.querySelector('#npl-proxy').value.trim(), payServer: body.querySelector('#npl-pay').value.trim(), zalo: body.querySelector('#npl-zalo').value.replace(/[^0-9]/g, ''), bank: t.bank || s.bank || '', acc: t.acc || s.acc || '', holder: t.holder || s.holder || '', qr: t.qr || s.qr || '', updatedAt: Date.now() };
            return o.fs.setDoc(o.fs.doc(o.db, 'publicSettings', 'main'), rec, { merge: true }).then(function () { settings = Object.assign({}, settings, rec); lsSet(LS_SET, rec); showSupportBtn(); paint(); body.querySelector('#npl-msg').textContent = '✅ Đã lưu'; });
          }).catch(function (e) { btn.disabled = false; body.querySelector('#npl-msg').textContent = 'Lỗi: ' + (e.code || e.message); });
        };
        poolPaint();
      }
    }
    function poolHtml(j) {
      var by = {}; users.forEach(function (u) { by[u.uid] = u; });
      return '<b>' + j.free + '</b> key trống / ' + j.total + ' key trong kho' + (j.added != null ? ' · vừa thêm ' + j.added : '') + (j.reclaimed != null ? ' · vừa thu hồi ' + j.reclaimed : '') +
        (j.free === 0 ? ' <span style="color:#E11D48">— hết key trống, nạp thêm nhé</span>' : '') +
        '<div style="margin-top:6px;max-height:220px;overflow:auto">' + j.pool.map(function (x) {
          var u = x.uid ? by[x.uid] : null;
          return '<div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-top:1px solid #eee;font-size:12px"><code>' + esc(x.key) + '</code>' +
            (x.uid ? '<span>→ ' + esc((u && (u.email || u.name)) || x.email || x.uid) + (u ? ' ' + tag(u) : '') + ' <span style="color:#6B6B78">' + (x.at ? dmy(x.at) : '') + '</span></span>'
              : '<span style="color:#047857">trống</span><button class="npl-btn sm ghost" data-pooldel="' + x.i + '" type="button" style="margin-left:auto">Xoá</button>') + '</div>';
        }).join('') + '</div>';
    }
    function poolPaint(p) {
      var box = body.querySelector('#npl-pool-box'); if (!box || !payServer()) return;
      (p || payApi('poolList')).then(function (j) { box.innerHTML = poolHtml(j); }).catch(function (e) { box.textContent = 'Không tải được kho key: ' + e.message + ' (kiểm tra đã triển khai bản Code.gs mới của thanh-toan chưa).'; });
    }
    body.addEventListener('click', function (e) {
      if (e.target.closest('#npl-pool-addbtn')) {
        var ta = body.querySelector('#npl-pool-add'), btnA = e.target.closest('#npl-pool-addbtn');
        if (!/gsk_/.test(ta.value)) { alert('Dán key Groq (bắt đầu bằng gsk_), mỗi key một dòng.'); return; }
        btnA.disabled = true;
        poolPaint(payApi('poolAdd', { keys: ta.value }).then(function (j) { ta.value = ''; btnA.disabled = false; return j; }, function (er) { btnA.disabled = false; throw er; }));
        return;
      }
      if (e.target.closest('#npl-pool-reclaim')) { if (confirm('Thu hồi key của các tài khoản Pro / Astra đã hết hạn quá 30 ngày, trả về kho?')) poolPaint(payApi('reclaim')); return; }
      var pd = e.target.closest('[data-pooldel]');
      if (pd) { if (confirm('Xoá key trống này khỏi kho?')) poolPaint(payApi('poolDelete', { i: Number(pd.dataset.pooldel) })); return; }
      var sg = e.target.closest('[data-seg]');
      if (sg) { seg = sg.dataset.seg; shown = PAGE; q = ''; paint(); return; }
      if (e.target.closest('[data-clearq]')) { q = ''; shown = PAGE; paint(); return; }
      if (e.target.closest('[data-more]')) { shown += PAGE; paintList(); return; }
      var row = e.target.closest('.npl-row'); if (!row) return;
      var uid = row.dataset.uid, d = e.target.closest('[data-d]'), plus = e.target.closest('[data-plus]');
      if (d) { d.disabled = true; decide(uid, d.dataset.d).catch(function (er) { d.disabled = false; alert('Lỗi: ' + (er.code || er.message)); }); }
      var sk = e.target.closest('[data-savekey]');
      if (sk) {
        var inp = row.querySelector('[data-key]'), val = (inp.value || '').trim();
        if (val && !/^gsk_\S{20,}$/.test(val)) { alert('Key Groq phải bắt đầu bằng gsk_'); return; }
        sk.disabled = true;
        o.fs.setDoc(o.fs.doc(o.db, 'users', uid), { groqKey: val }, { merge: true }).then(function () { var uu = uOf(uid); if (uu) uu.groqKey = val; sk.disabled = false; sk.textContent = val ? '✓ Đã lưu' : 'Đã xoá key'; })
          .catch(function (er) { sk.disabled = false; alert('Lỗi: ' + (er.code || er.message)); });
        return;
      }
      if (plus) { plus.disabled = true; var pu = uOf(uid) || {}; setRole(uid, pu.tier === 'pro' ? 'pro' : 'astra', 1).then(paint).catch(function (er) { plus.disabled = false; alert('Lỗi: ' + (er.code || er.message)); }); }
    });
    body.addEventListener('change', function (e) {
      var sel = e.target.closest('[data-role]'); if (!sel) return;
      var uid = sel.closest('.npl-row').dataset.uid; sel.disabled = true;
      var nv = sel.value;
      setRole(uid, nv, false).then(function () { paint(); pill(nv === 'student' ? '🎓 Đã chuyển sang nhóm Học sinh' : nv === 'pro' || nv === 'astra' ? '⭐ Đã lên ' + ROLE_LABEL[nv] + ' (nhóm User, xếp đầu)' : '👤 Đã chuyển sang nhóm User', 2500); }).catch(function (er) { sel.disabled = false; alert('Lỗi: ' + (er.code || er.message)); });
    });
    fb().then(function (x) { o = x; return boot(); }).then(load).then(paint).catch(function (e) { body.innerHTML = '<p class="npl-note">Không tải được (' + esc(e.code || e.message) + '). Kiểm tra Firestore rules (xem apps-script/ai-proxy/Code.gs).</p>'; });
  }

  /* ---------- AI miễn phí qua máy chủ trung gian ---------- */
  function blobToB64(b) {
    return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1] || ''); }; r.onerror = rej; r.readAsDataURL(b); });
  }
  function mmss(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  var pillT = null;
  function pill(html, ms) {
    css();
    var el = document.getElementById('npl-pill');
    if (!el) { el = document.createElement('div'); el.id = 'npl-pill'; el.className = 'npl-pill'; document.body.appendChild(el); el.addEventListener('click', function (e) { if (e.target.closest('a')) openUpgrade('', 'pro'); }); }
    el.innerHTML = html; el.style.opacity = '1';
    clearTimeout(pillT); pillT = setTimeout(function () { el.style.opacity = '0'; setTimeout(function () { if (el.style.opacity === '0') el.remove(); }, 450); }, ms || 6000);
  }
  function quotaMsg(qt) {
    var nm = SKILL_NAME[qt.skill] || qt.skill;
    if (qt.skill === 'writing') return 'Bạn đã dùng hết ' + qt.limit + ' bài Writing được AI chấm thử miễn phí. Nâng cấp ⭐ Pro để AI chấm Writing không giới hạn nhé.';
    if (qt.kind === 'daily') return 'Bạn đã dùng hết ' + qt.limit + ' lượt chấm Speaking miễn phí hôm nay. Ngày mai bạn có lượt mới, hoặc nâng cấp ⭐ Pro để chấm không giới hạn nhé.';
    return 'Bạn đã dùng hết lượt AI miễn phí cho ' + nm + '. Nâng cấp ⭐ Pro để dùng không giới hạn nhé.';
  }
  function showQuota(qt) {
    if (!qt) return;
    var left = Math.max(0, qt.limit - qt.used);
    if (qt.skill === 'writing') return pill('🎁 Chấm thử Writing miễn phí · còn <b>' + left + '/' + qt.limit + '</b> bài<a>Nâng cấp Pro</a>', 9000);
    pill('🎁 Chấm Speaking miễn phí · còn <b>' + left + '/' + qt.limit + '</b> lượt hôm nay<a>Nâng cấp Pro</a>', left <= 0 ? 9000 : 5000);
  }
  function hasRealKey(init) {
    var h = (init && init.headers) || {}, a = h.Authorization || h.authorization || '';
    return /^Bearer\s+\S{10,}$/.test(a) && !/Bearer\s+(undefined|null)$/.test(a);
  }
  /* Thay cho fetch() tới api.groq.com. Có key riêng → gọi thẳng Groq như cũ.
     Không có key + tài khoản User → đi qua máy chủ AI của thầy (có giới hạn). */
  function groqFetch(url, init, skill) {
    if (!ONE_KEY && hasRealKey(init)) return _fetch(url, init);
    skill = skill === 'writing' ? 'writing' : 'speaking';
    var paidNoKey = false;
    return ensure().then(function () {
      var r0 = role();
      paidNoKey = r0 === 'pro' || (ONE_KEY && (r0 === 'admin' || r0 === 'student'));   // không giới hạn: Pro / Astra / Học sinh / admin
      if (!freeOK() && !paidNoKey) { var e0 = new Error(role() === 'pro' ? 'AI của tài khoản bạn đang được kích hoạt, bạn chờ một lát hoặc nhắn Night IELTS nhé.' : 'Chưa có API key AI. Bấm nút bánh răng ⚙️ để nhập key.'); e0.code = 'NO_KEY'; throw e0; }
      if (!settings.aiProxy) throw new Error('AI miễn phí đang tạm tắt. Nhắn admin Night IELTS, hoặc nâng cấp ⭐ Pro và nhập API key riêng.');
      return fb();
    }).then(function (o) {
      var user = o.auth.currentUser;
      if (!user) throw new Error('Đăng nhập bằng Gmail để dùng AI.');
      if (paidNoKey) return user.getIdToken().then(function (tok) { return { idToken: tok, skill: skill, charge: false, kind: /audio\/transcriptions/.test(url) ? 'stt' : 'chat' }; }).then(function (req) {
        if (req.kind === 'chat') { req.body = init.body; return req; }
        var fields = [], file = null, jobs = [];
        init.body.forEach(function (v, k) {
          if (typeof v === 'object' && v && typeof v.size === 'number') jobs.push(blobToB64(v).then(function (b64) { file = { name: v.name || 'answer.webm', type: v.type || 'audio/webm', b64: b64 }; }));
          else fields.push([k, String(v)]);
        });
        return Promise.all(jobs).then(function () { req.fields = fields; req.file = file; return req; });
      });
      var charge = !!window.__aiChargeNext; window.__aiChargeNext = false;
      // Writing miễn phí: chỉ phần CHẤM BÀI (chấm thử 2 bài), các tính năng AI khác của Writing vẫn dành cho Pro
      if (skill !== 'speaking' && !charge && !window.__aiScoring) { var e1 = new Error('Tính năng AI này dành cho tài khoản ⭐ Pro / 🌟 Astra.'); e1.code = 'PRO_ONLY'; throw e1; }
      if (!charge && !window.__aiScoring) { var e2 = new Error('Tài khoản miễn phí chỉ dùng AI để chấm điểm Speaking (2 lượt/ngày). Tính năng này dành cho ⭐ Pro.'); e2.code = 'PRO_ONLY'; throw e2; }
      return user.getIdToken().then(function (tok) {
        var req = { idToken: tok, skill: skill, charge: charge, kind: /audio\/transcriptions/.test(url) ? 'stt' : 'chat' };
        if (req.kind === 'chat') { req.body = init.body; return req; }
        var fields = [], file = null, jobs = [];
        init.body.forEach(function (v, k) {
          if (typeof v === 'object' && v && typeof v.size === 'number') jobs.push(blobToB64(v).then(function (b64) { file = { name: v.name || 'answer.webm', type: v.type || 'audio/webm', b64: b64 }; }));
          else fields.push([k, String(v)]);
        });
        return Promise.all(jobs).then(function () { req.fields = fields; req.file = file; return req; });
      });
    }).then(function (req) {
      return _fetch(settings.aiProxy, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(req) });
    }).then(function (r) {
      if (!r.ok) throw new Error('AI đang bận, bạn chờ khoảng 1 phút rồi thử lại nhé.');
      return r.json();
    }).then(function (j) {
      if (j.error === 'QUOTA') { var e = new Error(quotaMsg(j.quota)); e.code = 'QUOTA'; showQuota(j.quota); throw e; }
      if (j.error === 'PRO_ONLY') { var e3 = new Error('Tính năng AI này dành cho tài khoản ⭐ Pro / 🌟 Astra.'); e3.code = 'PRO_ONLY'; throw e3; }
      if (j.error) throw new Error(j.error);
      if (j.quota) showQuota(j.quota);
      return new Response(j.body == null ? '' : j.body, { status: j.status || 200, headers: { 'Content-Type': 'application/json' } });
    });
  }
  /* Dòng nhắc thay cho "Chưa cấu hình API key" khi tài khoản User đang dùng AI miễn phí */
  function freeHint() {
    return '<div class="groq-missing" style="background:#FFF7ED;color:#9A3412;border-color:#FED7AA">🎁 Tài khoản miễn phí: <b>2 lượt chấm Speaking mỗi ngày</b>. Các tính năng AI khác (nâng cấp bài, phân tích, Writing, thi thử) dành cho Pro. ' +
      '<button type="button" class="ni-nav-btn" style="padding:4px 10px;font-size:11px;" onclick="NightPlan.openUpgrade(\'\', \'pro\')">⭐ Nâng cấp Pro</button></div>';
  }

  /* ---------- Thanh toán tự động (SePay → apps-script/thanh-toan) ----------
     Mỗi lần mua tạo 1 đơn payOrders/<MÃ>  { uid, kind:'course'|'plan', course, plan, months, amount, status:'pending' }.
     Học sinh chuyển khoản với nội dung = MÃ → máy chủ đọc biến động số dư, đủ tiền thì tự mở khoá / gia hạn gói. */
  var COURSE_PRICE = 39000;
  var COURSE_LABEL = { giaotiep: 'Giao tiếp Thực chiến', speaking6: 'IELTS Speaking 6.0', writing: 'IELTS Writing 6.0 → 8.0', chuyende: '25 Chuyên đề Tiếng Anh THPT', tiengtrung: 'Tiếng Trung Quyển 1' };
  function coursePrice() { var v = settings && Number(settings.coursePrice); return v > 0 ? v : COURSE_PRICE; }
  function courseUntil(u, key) { var b = u && u.buys; return b && Number(b[key]) > Date.now() ? Number(b[key]) : 0; }
  function newCode() { var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', c = 'NI'; for (var i = 0; i < 8; i++) c += A[Math.floor(Math.random() * A.length)]; return c; }
  /* dùng lại đơn còn chờ (cùng món, < 3 ngày) để học sinh quét lại không bị lệch mã */
  function getOrder(o, user, item, amount) {
    var k = 'npl-order:' + user.uid + ':' + item.kind + ':' + (item.course || item.plan + item.months) + ':' + amount, old = lsGet(k);
    if (old && old.code && Date.now() - old.t < 3 * DAY) return Promise.resolve(old.code);
    var code = newCode();
    var data = { uid: user.uid, email: user.email || '', name: user.displayName || '', kind: item.kind, amount: amount, status: 'pending', createdAt: Date.now() };
    if (item.course) data.course = item.course;
    if (item.plan) { data.plan = item.plan; data.months = item.months; }
    return o.fs.setDoc(o.fs.doc(o.db, 'payOrders', code), data).then(function () { lsSet(k, { code: code, t: Date.now() }); return code; });
  }
  function payBlock(price, code) {
    var dq = vietQR(settings, price, code);
    return '<div class="npl-pay">' + (dq ? '<img src="' + esc(dq) + '" alt="QR chuyển khoản">' : (settings.qr ? '<img src="' + esc(settings.qr) + '" alt="QR chuyển khoản">' : '')) +
      '<div class="npl-kv"><div><span>Ngân hàng</span><b>' + esc(settings.bank || '') + '</b></div>' +
      '<div><span>Số tài khoản</span><b>' + esc(settings.acc || '') + (settings.acc ? copyBtn(settings.acc) : '') + '</b></div>' +
      '<div><span>Chủ tài khoản</span><b>' + esc(settings.holder || '') + '</b></div>' +
      '<div><span>Số tiền</span><b>' + money(price) + '</b></div>' +
      '<div><span>Nội dung CK</span><b>' + esc(code) + copyBtn(code) + '</b></div></div></div>' +
      '<p class="npl-note" style="margin:0 0 8px">📱 Quét mã QR bằng app ngân hàng (hoặc MoMo, ZaloPay): <b>số tiền và nội dung đã điền sẵn</b>. Nếu chuyển tay, ghi <b>đúng nội dung ' + esc(code) + '</b>.</p>' +
      '<div class="npl-ok" style="background:#EFF6FF;color:#1E40AF" data-wait>⏳ Đang chờ tiền về… Chuyển xong <b>trang tự mở khoá sau vài giây</b>, không cần bấm gì.</div>';
  }
  /* theo dõi tài khoản: điều kiện done(u) đúng → gọi ok() */
  function watchMe(o, uid, done, ok) {
    var un = o.fs.onSnapshot(o.fs.doc(o.db, 'users', uid), function (sn) {
      var u = sn.exists() ? sn.data() : null;
      if (u && done(u)) { me = u; try { un(); } catch (e) {} ok(u); }
    }, function () {});
    return function () { try { un(); } catch (e) {} };
  }
  function openCourseBuy(key, name) {
    css(); name = name || COURSE_LABEL[key] || key;
    var hd = '<div class="npl-hd"><h2>🔓 Mua khoá học</h2><button class="npl-x" aria-label="Đóng">×</button></div>';
    var ov = modal(hd + '<p class="npl-note">Đang tải…</p>'), box = ov.querySelector('.npl-in'), stop = function () {};
    new MutationObserver(function () { if (!ov.isConnected) stop(); }).observe(document.body, { childList: true });
    ensure().then(function () { return fb(); }).then(function (o) {
      var user = o.auth.currentUser;
      if (!user) { box.innerHTML = hd + '<p class="npl-note">Đăng nhập trước rồi bấm mua lại nhé.</p>'; return; }
      var price = coursePrice(), cur = courseUntil(me, key);
      if (!(settings.acc || settings.qr)) { box.innerHTML = hd + '<p class="npl-note">Night IELTS chưa cập nhật thông tin chuyển khoản. Nhắn Night IELTS nhé.</p>'; return; }
      return getOrder(o, user, { kind: 'course', course: key }, price).then(function (code) {
        box.innerHTML = hd +
          '<p style="margin:0 0 4px;font-weight:800;font-size:16px">' + esc(name) + '</p>' +
          '<div class="npl-price">' + oldP(price) + '<b>' + money(price) + '</b>' + offTag() + '<span>học trọn khoá trong 30 ngày</span></div>' +
          (cur ? '<div class="npl-ok">✅ Bạn đang có khoá này đến hết ngày <b>' + dmy(cur) + '</b>. Mua thêm để cộng thêm 30 ngày.</div>' : '') +
          '<ul class="npl-ul"><li>Mở <b>tất cả buổi học</b> của khoá</li><li>Tải <b>PDF từng buổi</b> để in, take notes</li><li>Lưu tiến độ, ghi chú trên mọi máy</li></ul>' +
          payBlock(price, code);
        wireCopy(box);
        stop = watchMe(o, user.uid, function (u) { return courseUntil(u, key) > (cur || Date.now()) + 1000; }, function (u) {
          var w = box.querySelector('[data-wait]');
          if (w) { w.style.background = '#ECFDF5'; w.style.color = '#065F46'; w.innerHTML = '🎉 Đã nhận tiền! Khoá <b>' + esc(name) + '</b> mở đến hết ngày <b>' + dmy(courseUntil(u, key)) + '</b>.'; }
          var b = document.createElement('button'); b.className = 'npl-btn green'; b.style.width = '100%'; b.textContent = 'Vào học ngay →';
          b.onclick = function () { location.reload(); }; box.appendChild(b);
        });
      });
    }).catch(function (e) { box.innerHTML = hd + '<p class="npl-note">Không tạo được đơn (' + esc(e && (e.code || e.message)) + '). Thử lại hoặc nhắn Night IELTS nhé.</p>'; });
  }
  /* Hộp hướng dẫn sử dụng khoá (tự hiện lần đầu, sau đó mở bằng nút ❓) — st: { bought, until, canPrint, why } */
  function openCourseGuide(key, name, st) {
    css(); st = st || {}; name = name || COURSE_LABEL[key] || key;
    var price = coursePrice();
    var ov = modal('<div class="npl-hd"><h2>📘 Hướng dẫn học khoá</h2><button class="npl-x" aria-label="Đóng">×</button></div>' +
      '<p style="margin:0 0 10px;font-weight:800;font-size:16px">' + esc(name) + '</p>' +
      '<ul class="npl-ul">' +
      '<li><b>Học lần lượt từng buổi.</b> Mỗi buổi: từ vựng → bài học → bài tập. Tiến độ tự lưu, học máy nào cũng được.</li>' +
      '<li><b>In PDF để take notes:</b> mỗi buổi có nút <b>🖨 In / PDF</b> trên thanh trên cùng. Tải về in ra giấy hoặc ghi chú trên iPad. PDF buổi sau mở khi bạn <b>đã học buổi trước</b>.</li>' +
      '<li><b>Bấm vào chữ / loa để nghe</b>, bôi đen để tra nghĩa, ghi chú ngay trên bài.</li>' +
      '</ul>' +
      (st.bought ? '<div class="npl-ok">✅ Bạn đã mua khoá này — dùng đến hết ngày <b>' + dmy(st.until) + '</b>.</div>'
        : st.full ? '<div class="npl-ok">✅ Tài khoản của bạn đã mở khoá này.</div>'
        : '<div class="npl-pay" style="display:block"><b style="font-size:15px">🔓 Mua riêng khoá này</b><div class="npl-price" style="margin:6px 0 4px">' + oldP(price) + '<b>' + money(price) + '</b>' + offTag() + '<span>/ 30 ngày · mở toàn bộ buổi + tải PDF</span></div>' +
          '<p class="npl-note" style="margin:0 0 10px">Chuyển khoản quét QR — tiền vào là khoá tự mở, không cần chờ duyệt.</p>' +
          '<button type="button" class="npl-btn gold" data-buy style="width:100%">Mua khoá · ' + money(price) + '</button></div>') +
      '<button type="button" class="npl-btn ghost npl-x" style="width:100%;margin-top:10px">Đã hiểu, vào học</button>');
    var b = ov.querySelector('[data-buy]');
    if (b) b.onclick = function () { ov.remove(); openCourseBuy(key, name); };
    return ov;
  }

  /* Bắt mọi fetch() tới api.groq.com trên trang → chuyển qua máy chủ AI (1 key của thầy). */
  if (ONE_KEY && !window.__nplFetchHook) {
    window.__nplFetchHook = true;
    window.fetch = function (input, init) {
      var u = typeof input === 'string' ? input : (input && input.url) || '';
      if (/^https:\/\/api\.groq\.com\//.test(u)) return groqFetch(u, init || {}, /writing/i.test(location.pathname) ? 'writing' : 'speaking');
      return _fetch(input, init);
    };
  }
  window.NightPlan = {
    FREE_LESSONS: FREE_LESSONS, init: boot, role: role, effRole: effRole, me: function () { return me; }, settings: function () { return settings; },
    freeOK: freeOK, proxyOK: function () { var r = role(); return r === 'pro' || (ONE_KEY && (r === 'admin' || r === 'student')); }, courseAccess: courseAccess, lessonFree: lessonFree,
    openUpgrade: openUpgrade, openAdmin: openAdmin, pendingCount: pendingCount,
    groqFetch: groqFetch, freeHint: freeHint, openCourseBuy: openCourseBuy, openCourseGuide: openCourseGuide, courseUntil: courseUntil, coursePrice: coursePrice, payCode: payCode, siteRoot: siteRoot, tierOf: tierOf, planName: planName, planPrice: planPrice
  };
  /* Nút "Góp ý · Khiếu nại" -> mở Zalo của thầy (số nhập trong 👑 Tài khoản → Cài đặt) */
  function zaloNum() { var z = String((settings && settings.zalo) || '').replace(/[^0-9]/g, ''); return z.length >= 9 ? z : ''; }
  function showSupportBtn() {
    if (LITE) return;
    if (!document.body) return;
    var z = zaloNum(), b = document.getElementById('ni-support-btn');
    if (!z) { if (b) b.remove(); return; }
    if (b) return;
    if (!document.getElementById('ni-support-css')) {
      var st = document.createElement('style'); st.id = 'ni-support-css';
      st.textContent = '#ni-support-btn{position:fixed;left:14px;bottom:14px;z-index:9990;display:flex;align-items:center;gap:7px;padding:10px 15px 10px 12px;border:0;border-radius:99px;background:#0068FF;color:#fff;font:700 13px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 10px 24px -8px rgba(0,104,255,.6);cursor:pointer}#ni-support-btn svg{width:18px;height:18px}' +
        '#ni-sup-ov{position:fixed;inset:0;z-index:9999;background:rgba(20,20,30,.45);display:flex;align-items:flex-end;justify-content:center;padding:14px}@media(min-width:640px){#ni-sup-ov{align-items:center}}' +
        '#ni-sup{width:100%;max-width:380px;background:#fff;border-radius:22px;padding:18px;font:500 14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#24242A;box-shadow:0 30px 70px -20px rgba(0,0,0,.45)}#ni-sup h3{margin:0 0 4px;font-size:17px;font-weight:800}#ni-sup p{margin:0 0 12px;color:#6B6B78;font-size:13px}' +
        '#ni-sup button.o{display:flex;width:100%;align-items:center;gap:10px;text-align:left;padding:12px 14px;margin-bottom:8px;border:1.5px solid #E4E4EC;border-radius:14px;background:#fff;font:inherit;font-weight:700;cursor:pointer}#ni-sup button.o:hover{border-color:#0068FF;background:#F2F7FF}#ni-sup button.o small{display:block;font-weight:500;color:#6B6B78;font-size:12px}#ni-sup .x{margin-top:4px;width:100%;padding:10px;border:0;border-radius:12px;background:#F1F1F5;font:inherit;font-weight:700;cursor:pointer}';
      document.head.appendChild(st);
    }
    b = document.createElement('button');
    b.id = 'ni-support-btn'; b.type = 'button';
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>Góp ý · Khiếu nại';
    b.onclick = openSupport;
    document.body.appendChild(b);
  }
  function openSupport() {
    var z = zaloNum(); if (!z) return;
    var ov = document.createElement('div'); ov.id = 'ni-sup-ov';
    var opts = [['🐞', 'Báo lỗi web / AI chấm bài', 'Trang bị đơ, không chấm được, chấm sai...'], ['📣', 'Khiếu nại / góp ý', 'Điều bạn chưa hài lòng hoặc muốn web tốt hơn'], ['⭐', 'Hỏi về khoá học, gói Pro', 'Học phí, chuyển khoản, mở khoá bài học']];
    ov.innerHTML = '<div id="ni-sup"><h3>Trò chuyện với Night IELTS</h3><p>Chọn nội dung, web sẽ chép sẵn tin nhắn rồi mở Zalo, bạn chỉ cần dán và gửi.</p>' +
      opts.map(function (o, i) { return '<button class="o" data-i="' + i + '"><span style="font-size:20px">' + o[0] + '</span><span>' + o[1] + '<small>' + o[2] + '</small></span></button>'; }).join('') +
      '<button class="x">Đóng</button></div>';
    ov.onclick = function (e) { if (e.target === ov || e.target.className === 'x') ov.remove(); };
    Array.prototype.forEach.call(ov.querySelectorAll('button.o'), function (btn) {
      btn.onclick = function () {
        var o = opts[+btn.getAttribute('data-i')];
        var msg = '[' + o[1] + '] Night IELTS\n' + (me && (me.name || me.email) ? 'Tài khoản: ' + (me.name || '') + (me.email ? ' (' + me.email + ')' : '') + '\n' : '') + 'Trang: ' + location.href + '\nNội dung: ';
        var go = function () { window.open('https://zalo.me/' + z, '_blank', 'noopener'); ov.remove(); };
        try { navigator.clipboard.writeText(msg).then(function () { pill('📋 Đã chép sẵn tin nhắn — mở Zalo rồi dán vào nhé', 3500); go(); }, go); } catch (e) { go(); }
      };
    });
    document.body.appendChild(ov);
  }
  if (document.body) showSupportBtn(); else document.addEventListener('DOMContentLoaded', showSupportBtn);
  try { hideKeyUI(); } catch (e) {}
  /* Thông báo đang cập nhật — tắt: đổi UPDATE_NOTICE thành '' */
  var UPDATE_NOTICE = '🛠️ <b>Thông báo:</b> Tất cả các kỹ năng và bài test đang trong quá trình cập nhật. Nếu gặp lỗi, các bạn <a data-zalo style="color:#fff;font-weight:800;text-decoration:underline;cursor:pointer">nhắn Zalo</a> cho Night IELTS nhé!';
  function showUpdateNotice() {
    if (LITE) return;
    if (!UPDATE_NOTICE || document.getElementById('ni-update-notice')) return;
    try { if (sessionStorage.getItem('niUpdHide') === '1') return; } catch (e) {}
    var d = document.createElement('div');
    d.id = 'ni-update-notice';
    d.style.cssText = 'position:relative;z-index:9998;display:flex;align-items:center;gap:10px;padding:10px 14px;background:linear-gradient(90deg,#4F46E5,#7C3AED);color:#fff;font:600 13.5px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 2px 10px rgba(79,70,229,.25)';
    d.innerHTML = '<span style="flex:1">' + UPDATE_NOTICE + '</span><button type="button" aria-label="Đóng" style="flex:none;background:rgba(255,255,255,.2);border:0;color:#fff;border-radius:99px;width:26px;height:26px;font-size:16px;line-height:1;cursor:pointer">×</button>';
    var za = d.querySelector('[data-zalo]'); if (za) za.onclick = function () { if (zaloNum()) openSupport(); else pill('Chưa có số Zalo hỗ trợ', 2500); };
    d.querySelector('button').onclick = function () { d.remove(); try { sessionStorage.setItem('niUpdHide', '1'); } catch (e) {} };
    document.body.insertBefore(d, document.body.firstChild);
  }
  if (document.body) showUpdateNotice(); else document.addEventListener('DOMContentLoaded', showUpdateNotice);
  boot();
})();
