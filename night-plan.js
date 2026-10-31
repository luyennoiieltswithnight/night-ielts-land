/* Night IELTS — night-plan.js: gói tài khoản User / Pro / Học sinh.
   Dùng chung cho index.html, speaking.html, writing.html, khoahoc/night-progress.js, khoahoc/roadmap.js.

   Vai trò (users/<uid>.role):
     admin   – thầy, dùng mọi thứ.
     student – học sinh của thầy: được giao bài, vào các khoá thầy thêm, AI dùng key riêng.
     pro     – trả 99k/tháng: mở toàn bộ khoá học, AI dùng key riêng. Hết hạn (proUntil) → như user.
     user    – tài khoản thường (mới đăng ký): 3 buổi đầu mỗi khoá, AI miễn phí 5 phút / 5 tiếng
               cho mỗi kỹ năng qua máy chủ trung gian (apps-script/ai-proxy), dùng key của thầy.

   Firestore:
     publicSettings/main  { bank, acc, holder, qr, price, aiProxy }   (thầy sửa trong "👑 Tài khoản")
     proRequests/<uid>    { uid, email, name, photo, code, amount, status:'pending'|'approved'|'rejected', createdAt } */
(function () {
  if (window.NightPlan) return;
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
        settings = s.exists() ? s.data() : {}; lsSet(LS_SET, settings);
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
      return Promise.all([setP, meP]).then(function () { return me; });
    }).catch(function () { return me; });
    return initP;
  }
  /* Tài khoản Pro: key Groq do admin cấp riêng (users/<uid>.groqKey) → tự điền vào máy, khoá ô nhập key.
     Học sinh: tự nhập key như cũ. Hết Pro → gỡ key được cấp khỏi máy. */
  var GK = 'nightIeltsGroqCfg';
  function syncManagedKey() {
    var cfg = {}; try { cfg = JSON.parse(localStorage.getItem(GK) || '{}') || {}; } catch (e) {}
    var pro = effRole(me) === 'pro', k = me && me.groqKey;
    if (pro && k) { if (cfg.apiKey !== k || !cfg.managed) { cfg.apiKey = k; cfg.managed = true; try { localStorage.setItem(GK, JSON.stringify(cfg)); } catch (e) {} } }
    else if (cfg.managed) { delete cfg.apiKey; delete cfg.managed; try { localStorage.setItem(GK, JSON.stringify(cfg)); } catch (e) {} }
    lockKeyInputs();
  }
  function lockKeyInputs() {
    if (effRole(me) !== 'pro') return;
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
    if (r === 'admin' || r === 'pro') return 'full';
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
    '.npl-price{display:flex;align-items:baseline;gap:6px;margin:4px 0 12px}.npl-price b{font-size:30px;font-weight:800;color:#C2410C}.npl-price span{color:#6B6B78;font-size:14px}' +
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
  function payCode(uid) { return 'NIGHTPRO ' + String(uid || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase(); }

  /* ---------- Nâng cấp Pro (người dùng) ---------- */
  function openUpgrade(reason) {
    css();
    var ov = modal('<div class="npl-hd"><h2>⭐ Night IELTS Pro</h2><button class="npl-x" aria-label="Đóng">×</button></div><p class="npl-note">Đang tải…</p>');
    var box = ov.querySelector('.npl-in');
    ensure().then(function () { return fb(); }).then(function (o) {
      var user = o.auth.currentUser;
      var price = Number(settings.price) || 99000;
      var head = '<div class="npl-hd"><h2>⭐ Night IELTS Pro</h2><button class="npl-x" aria-label="Đóng">×</button></div>' +
        (reason ? '<div class="npl-ok" style="background:#FFF7ED;color:#9A3412">' + reason + '</div>' : '') +
        '<div class="npl-price"><b>' + money(price) + '</b><span>/ tháng</span></div>' +
        '<ul class="npl-ul"><li>Mở <b>toàn bộ buổi học</b> của mọi khoá (Giao tiếp, Speaking 6.0, Writing 6.0 → 8.0, Chuyên đề…)</li>' +
        '<li>Luyện <b>Speaking, Writing</b> với AI chấm chữa <b>không giới hạn thời gian</b> (dùng Groq API key miễn phí của bạn, xem hướng dẫn lấy key)</li>' +
        '<li>Lưu tiến độ từng bài, học tiếp trên mọi thiết bị</li></ul>';
      if (!user) { box.innerHTML = head + '<p class="npl-note">Đăng nhập bằng Gmail ở trang chủ trước, rồi bấm nâng cấp lại nhé.</p>'; return; }
      var r = role();
      if (r === 'admin' || r === 'student') {
        box.innerHTML = head + '<div class="npl-ok">Bạn là ' + (r === 'admin' ? 'giáo viên' : '<b>học sinh</b> của Night IELTS') + ', không cần nâng cấp.</div>'; return;
      }
      var reqRef = o.fs.doc(o.db, 'proRequests', user.uid);
      o.fs.getDoc(reqRef).catch(function () { return null; }).then(function (rs) {
        var rq = rs && rs.exists() ? rs.data() : null;
        var code = payCode(user.uid);
        var status = '';
        if (r === 'pro') status = '<div class="npl-ok">✅ Bạn đang là <b>Pro</b> đến hết ngày <b>' + dmy(me.proUntil) + '</b>. Chuyển khoản thêm để gia hạn 1 tháng.</div>';
        if (rq && rq.status === 'pending') status += '<div class="npl-ok" style="background:#EFF6FF;color:#1E40AF">⏳ Đã gửi yêu cầu lúc ' + hm(rq.createdAt) + ' ' + dmy(rq.createdAt) + '. Night IELTS kiểm tra chuyển khoản rồi duyệt, trang sẽ tự mở khi bạn tải lại.</div>';
        if (rq && rq.status === 'rejected' && r !== 'pro') status += '<div class="npl-ok" style="background:#FFF1F2;color:#9F1239">Yêu cầu trước chưa được duyệt (chưa thấy chuyển khoản). Nhắn Night IELTS nếu bạn đã chuyển.</div>';
        var hasBank = settings.acc || settings.qr;
        box.innerHTML = head + status +
          (hasBank ? '<div class="npl-pay">' + (settings.qr ? '<img src="' + esc(settings.qr) + '" alt="QR chuyển khoản">' : '') +
            '<div class="npl-kv"><div><span>Ngân hàng</span><b>' + esc(settings.bank || '') + '</b></div>' +
            '<div><span>Số tài khoản</span><b>' + esc(settings.acc || '') + (settings.acc ? copyBtn(settings.acc) : '') + '</b></div>' +
            '<div><span>Chủ tài khoản</span><b>' + esc(settings.holder || '') + '</b></div>' +
            '<div><span>Số tiền</span><b>' + money(price) + '</b></div>' +
            '<div><span>Nội dung CK</span><b>' + esc(code) + copyBtn(code) + '</b></div></div></div>'
            : '<p class="npl-note">Night IELTS chưa cập nhật thông tin chuyển khoản. Nhắn Night IELTS để đăng ký nhé.</p>') +
          '<p class="npl-note" style="margin:0 0 12px">Ghi đúng <b>nội dung chuyển khoản</b> để Night IELTS biết là bạn. Chuyển xong bấm nút dưới, Night IELTS duyệt trong ngày. Gặp lỗi gì cứ nhắn Night IELTS.</p>' +
          '<button type="button" class="npl-btn gold" id="npl-sent"' + (rq && rq.status === 'pending' ? ' disabled' : '') + '>💸 Tôi đã chuyển khoản</button>';
        wireCopy(box);
        var b = box.querySelector('#npl-sent');
        if (b) b.onclick = function () {
          b.disabled = true; b.textContent = 'Đang gửi…';
          o.fs.setDoc(reqRef, { uid: user.uid, email: user.email || '', name: user.displayName || '', photo: user.photoURL || '', code: code, amount: price, status: 'pending', createdAt: Date.now() })
            .then(function () { b.textContent = '✅ Đã gửi, chờ duyệt'; })
            .catch(function (e) { b.disabled = false; b.textContent = '💸 Tôi đã chuyển khoản'; alert('Chưa gửi được (' + (e.code || e.message) + '). Nhắn Night IELTS giúp nhé.'); });
        };
      });
    }).catch(function (e) { box.innerHTML = '<p class="npl-note">Không tải được (' + esc(e && e.message) + ').</p>'; });
  }

  /* ---------- Quản lý tài khoản (thầy) ---------- */
  var ROLE_LABEL = { user: 'User', pro: 'Pro', student: 'Học sinh', admin: 'Thầy' };
  function pendingCount() {
    return fb().then(function (o) {
      return o.fs.getDocs(o.fs.query(o.fs.collection(o.db, 'proRequests'), o.fs.where('status', '==', 'pending'))).then(function (s) { return s.size; });
    }).catch(function () { return 0; });
  }
  function openAdmin(onChange) {
    var ov = modal('<div class="npl-hd"><h2>👑 Tài khoản & gói Pro</h2><button class="npl-x" aria-label="Đóng">×</button></div>' +
      '<div class="npl-tabs"><button class="npl-tab" data-t="req" aria-selected="true">Yêu cầu Pro</button><button class="npl-tab" data-t="all" aria-selected="false">Tất cả tài khoản</button><button class="npl-tab" data-t="set" aria-selected="false">Cài đặt</button></div><div id="npl-body"><p class="npl-note">Đang tải…</p></div>', true);
    var body = ov.querySelector('#npl-body'), tab = 'req', users = [], reqs = [], q = '', filt = 'all', o;
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
    function setRole(uid, r, plusMonth) {
      var u = uOf(uid) || {}, data = { role: r };
      if (r === 'pro') {
        var base = Math.max(Date.now(), Number(u.proUntil) || 0);
        if (plusMonth || !(Number(u.proUntil) > Date.now())) data.proUntil = base + MONTH;
      }
      return o.fs.setDoc(o.fs.doc(o.db, 'users', uid), data, { merge: true }).then(function () { Object.assign(u, data); changed(); });
    }
    function decide(uid, how) {
      var p = how === 'reject' ? Promise.resolve() : setRole(uid, how, true);
      return p.then(function () {
        return o.fs.setDoc(o.fs.doc(o.db, 'proRequests', uid), { status: how === 'reject' ? 'rejected' : 'approved', decidedAt: Date.now(), decidedAs: how }, { merge: true });
      }).then(function () { reqs = reqs.filter(function (r) { return r.uid !== uid; }); paint(); changed(); });
    }
    function tag(u) { var r = effRole(u), raw = u.role || 'student'; return '<span class="npl-tag ' + r + '">' + (raw === 'pro' && r === 'user' ? 'Pro hết hạn' : ROLE_LABEL[r] || r) + '</span>'; }
    function who(u) { return '<img src="' + esc(u.photo || '') + '" alt="" onerror="this.style.visibility=\'hidden\'"><div class="npl-who"><b>' + esc(u.name || '(chưa có tên)') + '</b><small>' + esc(u.email || '') + '</small></div>'; }
    function paint() {
      if (tab === 'req') {
        body.innerHTML = reqs.length ? reqs.map(function (r) {
          var u = uOf(r.uid) || r;
          return '<div class="npl-row" data-uid="' + esc(r.uid) + '">' + who({ photo: r.photo || u.photo, name: r.name || u.name, email: r.email || u.email }) +
            '<div style="font-size:12px;line-height:1.4"><b>' + esc(r.code || '') + '</b><br><span style="color:#6B6B78">' + money(r.amount) + ' · ' + hm(r.createdAt) + ' ' + dmy(r.createdAt) + '</span></div>' +
            '<button class="npl-btn sm gold" data-d="pro">Duyệt Pro +1 tháng</button><button class="npl-btn sm" data-d="student">Cho làm Học sinh</button><button class="npl-btn sm ghost" data-d="reject">Từ chối</button></div>';
        }).join('') + '<p class="npl-note">Đối chiếu <b>nội dung chuyển khoản</b> trong app ngân hàng với mã NIGHTPRO ở mỗi dòng rồi mới duyệt.</p>'
          : '<p class="npl-note">Chưa có yêu cầu nào đang chờ. 🎉</p>';
      } else if (tab === 'all') {
        var cnt = { all: users.length, student: 0, pro: 0, user: 0, admin: 0 };
        users.forEach(function (u) { cnt[effRole(u)] = (cnt[effRole(u)] || 0) + 1; });
        var list = users.filter(function (u) {
          if (filt !== 'all' && effRole(u) !== filt) return false;
          if (!q) return true;
          return ((u.name || '') + ' ' + (u.email || '')).toLowerCase().indexOf(q) >= 0;
        }).sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        body.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><input class="npl-inp" id="npl-q" placeholder="Tìm tên hoặc Gmail…" value="' + esc(q) + '" style="flex:1;min-width:180px">' +
          '<select class="npl-sel" id="npl-f">' + [['all', 'Tất cả'], ['student', 'Học sinh'], ['pro', 'Pro'], ['user', 'User'], ['admin', 'Thầy']].map(function (x) { return '<option value="' + x[0] + '"' + (filt === x[0] ? ' selected' : '') + '>' + x[1] + ' (' + (cnt[x[0]] || 0) + ')</option>'; }).join('') + '</select></div>' +
          list.slice(0, 300).map(function (u) {
            var r = effRole(u), raw = u.role || 'student';
            return '<div class="npl-row" data-uid="' + esc(u.uid) + '">' + who(u) + tag(u) +
              (raw === 'pro' && u.proUntil ? '<span style="font-size:12px;color:#6B6B78">đến ' + dmy(u.proUntil) + '</span>' : '') +
              (r === 'admin' ? '' : '<select class="npl-sel" data-role>' + ['user', 'pro', 'student'].map(function (x) { return '<option value="' + x + '"' + (raw === x ? ' selected' : '') + '>' + ROLE_LABEL[x] + '</option>'; }).join('') + '</select>' +
                (raw === 'pro' ? '<button class="npl-btn sm gold" data-plus>+1 tháng</button><input class="npl-inp" data-key type="password" placeholder="Key Groq cấp riêng (gsk_…)" value="' + esc(u.groqKey || '') + '" style="flex:1;min-width:170px;padding:6px 10px;font-size:12px"><button class="npl-btn sm" data-savekey>' + (u.groqKey ? 'Đổi key' : 'Lưu key') + '</button>' : '')) + '</div>';
          }).join('') + (list.length > 300 ? '<p class="npl-note">Đang hiện 300 tài khoản đầu, gõ tìm để lọc.</p>' : '');
        var qi = body.querySelector('#npl-q'); qi.oninput = function () { q = qi.value.trim().toLowerCase(); var p = qi.selectionStart; paint(); var n = body.querySelector('#npl-q'); n.focus(); try { n.setSelectionRange(p, p); } catch (e) {} };
        body.querySelector('#npl-f').onchange = function (e) { filt = e.target.value; paint(); };
      } else {
        var s = settings || {};
        body.innerHTML = '<label class="npl-f"><span>Giá gói Pro (đồng / tháng)</span><input class="npl-inp" id="npl-price" type="number" value="' + esc(s.price || 99000) + '"></label>' +
          '<label class="npl-f"><span>Link máy chủ AI miễn phí (Apps Script ai-proxy, dạng https://script.google.com/macros/s/…/exec)</span><input class="npl-inp" id="npl-proxy" value="' + esc(s.aiProxy || '') + '" placeholder="Để trống = tắt AI miễn phí cho User"></label>' +
          '<p class="npl-note" style="margin:-4px 0 12px">Tài khoản User được AI miễn phí <b>5 phút mỗi 5 tiếng</b> cho mỗi kỹ năng (Speaking tính thời lượng ghi âm, Writing ≈ 1–2 bài chấm). Key Groq của thầy nằm trong Apps Script, không lộ ra web. Hướng dẫn cài ở đầu file <b>apps-script/ai-proxy/Code.gs</b>.</p>' +
          '<div class="npl-f"><span>Thông tin chuyển khoản hiện cho người mua Pro</span><div class="npl-ok" style="background:#F8F8FB;color:#24242A">' +
          (s.acc ? esc(s.bank || '') + ' · <b>' + esc(s.acc) + '</b> · ' + esc(s.holder || '') + (s.qr ? ' · có ảnh QR' : '') : 'Chưa có') +
          '<br><span style="color:#6B6B78;font-size:12px">Lấy tự động từ mục <b>Học Phí → Thông tin chuyển khoản</b> mỗi lần thầy bấm Lưu ở đây.</span></div></div>' +
          '<button class="npl-btn" id="npl-save">Lưu cài đặt</button> <span id="npl-msg" class="npl-note"></span>';
        body.querySelector('#npl-save').onclick = function () {
          var btn = this; btn.disabled = true;
          o.fs.getDoc(o.fs.doc(o.db, 'tuitionSettings', 'main')).catch(function () { return null; }).then(function (ts) {
            var t = ts && ts.exists() ? ts.data() : {};
            var rec = { price: Number(body.querySelector('#npl-price').value) || 99000, aiProxy: body.querySelector('#npl-proxy').value.trim(), bank: t.bank || s.bank || '', acc: t.acc || s.acc || '', holder: t.holder || s.holder || '', qr: t.qr || s.qr || '', updatedAt: Date.now() };
            return o.fs.setDoc(o.fs.doc(o.db, 'publicSettings', 'main'), rec).then(function () { settings = rec; lsSet(LS_SET, rec); paint(); body.querySelector('#npl-msg').textContent = '✅ Đã lưu'; });
          }).catch(function (e) { btn.disabled = false; body.querySelector('#npl-msg').textContent = 'Lỗi: ' + (e.code || e.message); });
        };
      }
    }
    body.addEventListener('click', function (e) {
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
      if (plus) { plus.disabled = true; setRole(uid, 'pro', true).then(paint).catch(function (er) { plus.disabled = false; alert('Lỗi: ' + (er.code || er.message)); }); }
    });
    body.addEventListener('change', function (e) {
      var sel = e.target.closest('[data-role]'); if (!sel) return;
      var uid = sel.closest('.npl-row').dataset.uid; sel.disabled = true;
      setRole(uid, sel.value, false).then(paint).catch(function (er) { sel.disabled = false; alert('Lỗi: ' + (er.code || er.message)); });
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
    if (!el) { el = document.createElement('div'); el.id = 'npl-pill'; el.className = 'npl-pill'; document.body.appendChild(el); el.addEventListener('click', function (e) { if (e.target.closest('a')) openUpgrade(); }); }
    el.innerHTML = html; el.style.opacity = '1';
    clearTimeout(pillT); pillT = setTimeout(function () { el.style.opacity = '0'; setTimeout(function () { if (el.style.opacity === '0') el.remove(); }, 450); }, ms || 6000);
  }
  function quotaMsg(qt) {
    var nm = SKILL_NAME[qt.skill] || qt.skill;
    return 'Bạn đã dùng hết ' + Math.round(qt.limit / 60) + ' phút AI miễn phí cho ' + nm + '. Mở lại lúc ' + hm(qt.resetAt) + ' ngày ' + dmy(qt.resetAt) + '. Muốn dùng không giới hạn: nâng cấp ⭐ Pro (hoặc nhập Groq API key riêng ở nút bánh răng).';
  }
  function showQuota(qt) {
    if (!qt) return;
    var left = qt.limit - qt.used, nm = SKILL_NAME[qt.skill] || qt.skill;
    pill('🎁 AI miễn phí · ' + nm + ' còn <b>' + mmss(left) + '</b> phút' + (left <= 0 ? ' (mở lại ' + hm(qt.resetAt) + ')' : '') + '<a>Nâng cấp Pro</a>', left <= 60 ? 9000 : 5000);
  }
  function hasRealKey(init) {
    var h = (init && init.headers) || {}, a = h.Authorization || h.authorization || '';
    return /^Bearer\s+\S{10,}$/.test(a) && !/Bearer\s+(undefined|null)$/.test(a);
  }
  /* Thay cho fetch() tới api.groq.com. Có key riêng → gọi thẳng Groq như cũ.
     Không có key + tài khoản User → đi qua máy chủ AI của thầy (có giới hạn). */
  function groqFetch(url, init, skill) {
    if (hasRealKey(init)) return fetch(url, init);
    skill = skill === 'writing' ? 'writing' : 'speaking';
    return ensure().then(function () {
      if (!freeOK()) { var e0 = new Error('Chưa có Groq API Key. Học sinh tự nhập key ở nút bánh răng; tài khoản Pro sẽ được Night IELTS cấp key riêng (chưa có thì nhắn admin).'); e0.code = 'NO_KEY'; throw e0; }
      if (!settings.aiProxy) throw new Error('AI miễn phí đang tạm tắt. Nhắn admin Night IELTS, hoặc nâng cấp ⭐ Pro và nhập API key riêng.');
      return fb();
    }).then(function (o) {
      var user = o.auth.currentUser;
      if (!user) throw new Error('Đăng nhập bằng Gmail để dùng AI.');
      return user.getIdToken().then(function (tok) {
        var req = { idToken: tok, skill: skill, kind: /audio\/transcriptions/.test(url) ? 'stt' : 'chat' };
        if (req.kind === 'chat') { req.body = init.body; return req; }
        var fields = [], file = null, jobs = [];
        init.body.forEach(function (v, k) {
          if (typeof v === 'object' && v && typeof v.size === 'number') jobs.push(blobToB64(v).then(function (b64) { file = { name: v.name || 'answer.webm', type: v.type || 'audio/webm', b64: b64 }; }));
          else fields.push([k, String(v)]);
        });
        return Promise.all(jobs).then(function () { req.fields = fields; req.file = file; return req; });
      });
    }).then(function (req) {
      return fetch(settings.aiProxy, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(req) });
    }).then(function (r) {
      if (!r.ok) throw new Error('Máy chủ AI miễn phí lỗi ' + r.status + '. Thử lại sau ít phút nhé.');
      return r.json();
    }).then(function (j) {
      if (j.error === 'QUOTA') { var e = new Error(quotaMsg(j.quota)); e.code = 'QUOTA'; showQuota(j.quota); throw e; }
      if (j.error) throw new Error(j.error);
      if (j.quota) showQuota(j.quota);
      return new Response(j.body == null ? '' : j.body, { status: j.status || 200, headers: { 'Content-Type': 'application/json' } });
    });
  }
  /* Dòng nhắc thay cho "Chưa cấu hình API key" khi tài khoản User đang dùng AI miễn phí */
  function freeHint() {
    return '<div class="groq-missing" style="background:#FFF7ED;color:#9A3412;border-color:#FED7AA">🎁 Bạn đang dùng <b>AI miễn phí</b>: 5 phút mỗi 5 tiếng. ' +
      '<button type="button" class="ni-nav-btn" style="padding:4px 10px;font-size:11px;" onclick="NightPlan.openUpgrade()">⭐ Nâng cấp Pro</button></div>';
  }

  window.NightPlan = {
    FREE_LESSONS: FREE_LESSONS, init: boot, role: role, effRole: effRole, me: function () { return me; }, settings: function () { return settings; },
    freeOK: freeOK, courseAccess: courseAccess, lessonFree: lessonFree,
    openUpgrade: openUpgrade, openAdmin: openAdmin, pendingCount: pendingCount,
    groqFetch: groqFetch, freeHint: freeHint, payCode: payCode, siteRoot: siteRoot
  };
  boot();
})();
