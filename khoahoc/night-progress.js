/* Night IELTS — night-progress.js: đăng nhập Gmail bắt buộc + lưu tiến độ bài học lên Firebase.
   Dùng chung cho night-engine.js (trang bài học) và roadmap.js (trang lộ trình).
   - Đã đăng nhập ở trang chủ (cùng tên miền) → vào thẳng, không phải đăng nhập lại.
   - Chưa đăng nhập → che trang bằng màn hình "Đăng nhập bằng Gmail".
   - Tiến độ lưu ở collection "lessonProgress", mỗi học sinh × mỗi bài 1 document:
       id = <uid>__<courseKey>__<lessonId>
       { studentId, name, email, photo, courseKey, lessonId, session, title,
         answers:{…}, stats:{done,total,correct,pct}, lastSection, startedAt, updatedAt, completedAt }
   - Tài khoản role "admin" (thầy) không bị lưu tiến độ; trang lộ trình hiện bảng tiến độ cả lớp. */
(function () {
  if (window.NightProgress) return;
  var FB_CONFIG = {
    apiKey: 'AIzaSyCmeN49M4oI78ZPWDhMlbisDOLaMJp2mb8',
    authDomain: 'night-ielts-land.firebaseapp.com',
    projectId: 'night-ielts-land',
    storageBucket: 'night-ielts-land.firebasestorage.app',
    messagingSenderId: '408519436407',
    appId: '1:408519436407:web:a9f0b9ba23368b54427e72'
  };
  var V = '10.8.1';
  var COL = 'lessonProgress';
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
  var fbP = null;

  function fb() {
    if (fbP) return fbP;
    fbP = Promise.all([
      import('https://www.gstatic.com/firebasejs/' + V + '/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/' + V + '/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/' + V + '/firebase-firestore.js')
    ]).then(function (m) {
      var app;
      try { app = m[0].getApp(); } catch (e) { app = m[0].initializeApp(FB_CONFIG); }
      return { authM: m[1], fs: m[2], auth: m[1].getAuth(app), db: m[2].getFirestore(app) };
    });
    return fbP;
  }

  /* ---------- Màn hình đăng nhập ---------- */
  var CSS = '#np-gate{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;background:linear-gradient(160deg,#ECEBFB,#F7F3FF 45%,#FFF4EC);font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:#24242A}' +
    '#np-gate .bx{width:100%;max-width:400px;background:#24242A;border-radius:30px;padding:10px;box-shadow:0 30px 60px -30px rgba(36,36,42,.5)}' +
    '#np-gate .in{background:#fff;border-radius:22px;padding:28px 24px;text-align:center}' +
    '#np-gate img.lg{width:64px;height:64px;border-radius:18px}' +
    '#np-gate h1{font-size:22px;font-weight:800;margin:14px 0 6px}#np-gate p{font-size:14px;line-height:1.55;color:#6B6B78;margin:0 0 20px}' +
    '#np-gate button{display:inline-flex;align-items:center;gap:10px;border:0;cursor:pointer;background:#24242A;color:#fff;font:800 15px inherit;font-family:inherit;padding:13px 22px;border-radius:999px}' +
    '#np-gate button:disabled{opacity:.6}#np-gate .err{margin-top:12px;font-size:12px;color:#E11D48}' +
    '#np-gate .sp{width:34px;height:34px;border-radius:50%;border:4px solid #E6E6EE;border-top-color:#6C70DC;animation:npspin .8s linear infinite;margin:6px auto}@keyframes npspin{to{transform:rotate(360deg)}}';
  function gateEl() {
    var el = document.getElementById('np-gate');
    if (el) return el;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'np-gate';
    el.innerHTML = '<div class="bx"><div class="in"><div class="sp"></div><p style="margin:10px 0 0">Đang kiểm tra đăng nhập…</p></div></div>';
    (document.body || document.documentElement).appendChild(el);
    return el;
  }
  function logoUrl() {
    var s = document.querySelector('script[src*="night-progress.js"]');
    try { return new URL('../logo.png', s ? s.src : location.href).href; } catch (e) { return ''; }
  }
  function showLogin(o, resolve) {
    var el = gateEl();
    el.innerHTML = '<div class="bx"><div class="in"><img class="lg" src="' + logoUrl() + '" alt="" onerror="this.remove()">' +
      '<h1>Đăng nhập để vào học</h1><p>Khoá học của Night IELTS chỉ dành cho học viên. Đăng nhập bằng Gmail để vào bài và lưu lại tiến độ học.</p>' +
      '<button type="button" id="np-login"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Đăng nhập bằng Gmail</button>' +
      '<div class="err" id="np-err"></div></div></div>';
    document.getElementById('np-login').onclick = function () {
      var b = this; b.disabled = true; document.getElementById('np-err').textContent = '';
      o.authM.signInWithPopup(o.auth, new o.authM.GoogleAuthProvider()).catch(function (e) {
        b.disabled = false;
        document.getElementById('np-err').textContent = 'Chưa đăng nhập được (' + (e && e.code || 'lỗi') + '). Thử lại nhé.';
      });
    };
  }
  function hideGate() { var el = document.getElementById('np-gate'); if (el) el.remove(); }

  /* ---------- Bắt đăng nhập ---------- */
  var gateP = null;
  function gate() {
    if (gateP) return gateP;
    if (LOCAL) { gateP = Promise.resolve({ user: null, role: 'local', offline: true }); return gateP; }
    gateEl();
    gateP = fb().then(function (o) {
      return new Promise(function (resolve) {
        o.authM.onAuthStateChanged(o.auth, function (user) {
          if (!user) { showLogin(o, resolve); return; }
          var ref = o.fs.doc(o.db, 'users', user.uid);
          o.fs.getDoc(ref).then(function (snap) {
            var role = 'student';
            if (snap.exists()) role = snap.data().role || 'student';
            else o.fs.setDoc(ref, { email: user.email, name: user.displayName, role: 'student', createdAt: Date.now(), photo: user.photoURL || '' }).catch(function () {});
            return role;
          }).catch(function () { return 'student'; }).then(function (role) {
            hideGate();
            resolve({ user: user, role: role, o: o });
          });
        });
      });
    }).catch(function (e) {
      /* Không tải được Firebase (mất mạng…) → vẫn cho học, chỉ không lưu tiến độ. */
      console.warn('[NightProgress] Firebase lỗi, chạy không lưu:', e);
      hideGate();
      return { user: null, role: 'offline', offline: true };
    });
    return gateP;
  }

  /* ---------- Tiến độ 1 bài ---------- */
  function docId(uid, courseKey, lessonId) { return uid + '__' + courseKey + '__' + lessonId; }
  function localKey(courseKey, lessonId, uid) { return 'night-prog-' + courseKey + '-' + lessonId + '-' + (uid || 'guest'); }

  /* Ghi chú dùng chung thầy ↔ học sinh: lessonNotes/<uidHọcSinh>__<course>__<lesson> */
  function notesChannel(ctx, studentUid, meta) {
    if (!ctx.o || !studentUid) return null;
    var fs = ctx.o.fs, ref = fs.doc(ctx.o.db, 'lessonNotes', docId(studentUid, meta.courseKey, meta.lessonId));
    var t = null, pending = null;
    return {
      subscribe: function (fn) {
        return fs.onSnapshot(ref, function (snap) { var r = snap.exists() ? snap.data() : null; fn(r ? (r.notes || []) : [], r || {}); }, function (e) { console.warn('[NightProgress] notes:', e); });
      },
      save: function (notes) {
        pending = notes; if (t) clearTimeout(t);
        t = setTimeout(function () {
          t = null;
          fs.setDoc(ref, { notes: pending, studentId: studentUid, courseKey: meta.courseKey, lessonId: meta.lessonId, updatedAt: Date.now(), by: ctx.user.uid, byName: ctx.user.displayName || '' })
            .catch(function (e) { console.warn('[NightProgress] Lưu ghi chú lỗi:', e); });
        }, 500);
      },
      me: ctx.user.uid
    };
  }

  /* Thầy xem trực tiếp bài của 1 học sinh: chỉ đọc, cập nhật theo thời gian thực */
  function watchStore(ctx, meta, studentUid) {
    var fs = ctx.o.fs, data = { answers: {} }, remote = [], first = true;
    var store = {
      watch: true, track: false, role: ctx.role, user: ctx.user, info: {},
      get: function (k, d) { return Object.prototype.hasOwnProperty.call(data.answers, k) ? data.answers[k] : d; },
      set: function () {}, setSection: function () {}, lastSection: function () { return ''; },
      onStats: function (fn) { store._stats = fn; }, stats: function () { return store._stats ? store._stats(data.answers) : null; },
      subscribe: function (fn) { remote.push(fn); }, flush: function () {},
      onRemote: function (fn) { remote.push(fn); return function () { remote = remote.filter(function (x) { return x !== fn; }); }; },
      notes: notesChannel(ctx, studentUid, meta)
    };
    return new Promise(function (resolve) {
      fs.onSnapshot(fs.doc(ctx.o.db, COL, docId(studentUid, meta.courseKey, meta.lessonId)), function (snap) {
        var r = snap.exists() ? snap.data() : {};
        data = { answers: r.answers || {} };
        store.info = { name: r.name || '', photo: r.photo || '', lastSection: r.lastSection || '', updatedAt: r.updatedAt || 0, exists: snap.exists() };
        if (first) { first = false; resolve(store); }
        remote.slice().forEach(function (fn) { try { fn(); } catch (e) {} });
      }, function (e) { console.warn('[NightProgress] watch:', e); if (first) { first = false; resolve(store); } });
    });
  }

  function lessonStore(ctx, meta) {
    var uid = ctx.user && ctx.user.uid;
    var watchUid = new URLSearchParams(location.search).get('watch');
    if (watchUid && ctx.role === 'admin' && ctx.o) return watchStore(ctx, meta, watchUid);
    var track = !!uid && ctx.role !== 'admin';
    var lk = localKey(meta.courseKey, meta.lessonId, uid);
    var data = { answers: {}, lastSection: '', updatedAt: 0 };
    try { var l = JSON.parse(localStorage.getItem(lk) || 'null'); if (l && l.answers) data = l; } catch (e) {}
    var timer = null, statsFn = null, listeners = [];
    var store = {
      track: track, role: ctx.role, user: ctx.user,
      get: function (k, d) { return Object.prototype.hasOwnProperty.call(data.answers, k) ? data.answers[k] : d; },
      set: function (k, v) {
        if (v === undefined || v === null || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length)) delete data.answers[k];
        else data.answers[k] = v;
        touch();
      },
      setSection: function (id) { if (id && id !== data.lastSection) { data.lastSection = id; touch(true); } },
      lastSection: function () { return data.lastSection; },
      onStats: function (fn) { statsFn = fn; },
      stats: function () { return statsFn ? statsFn(data.answers) : null; },
      subscribe: function (fn) { listeners.push(fn); },
      onRemote: function () { return function () {}; },
      notes: track ? notesChannel(ctx, uid, meta) : null,
      flush: function () { if (timer) { clearTimeout(timer); timer = null; push(); } }
    };
    function touch(quiet) {
      data.updatedAt = Date.now();
      try { localStorage.setItem(lk, JSON.stringify(data)); } catch (e) {}
      if (!quiet) listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
      if (!track) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { timer = null; push(); }, 1200);
    }
    function push() {
      if (!track) return;
      var o = ctx.o, st = store.stats() || {};
      var rec = {
        studentId: uid, name: ctx.user.displayName || '', email: ctx.user.email || '', photo: ctx.user.photoURL || '',
        courseKey: meta.courseKey, lessonId: meta.lessonId, n: meta.n || 0, session: meta.session || '', title: meta.title || '',
        answers: data.answers, stats: st, lastSection: data.lastSection || '', updatedAt: data.updatedAt
      };
      if (!data.startedAt) data.startedAt = data.updatedAt;
      rec.startedAt = data.startedAt;
      if (st.total && st.done >= st.total) { data.completedAt = data.completedAt || Date.now(); }
      if (data.completedAt) rec.completedAt = data.completedAt;
      o.fs.setDoc(o.fs.doc(o.db, COL, docId(uid, meta.courseKey, meta.lessonId)), rec).catch(function (e) { console.warn('[NightProgress] Lưu lỗi:', e); });
    }
    window.addEventListener('pagehide', store.flush);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') store.flush(); });
    /* Tải bản trên máy chủ (học ở máy khác) — lấy bản mới hơn */
    var ready = Promise.resolve(store);
    if (track) {
      ready = Promise.race([
        ctx.o.fs.getDoc(ctx.o.fs.doc(ctx.o.db, COL, docId(uid, meta.courseKey, meta.lessonId))).then(function (snap) {
          if (snap.exists()) {
            var r = snap.data();
            if ((r.updatedAt || 0) > (data.updatedAt || 0)) {
              data = { answers: r.answers || {}, lastSection: r.lastSection || '', updatedAt: r.updatedAt || 0, startedAt: r.startedAt, completedAt: r.completedAt };
              try { localStorage.setItem(lk, JSON.stringify(data)); } catch (e) {}
            } else { data.startedAt = data.startedAt || r.startedAt; data.completedAt = data.completedAt || r.completedAt; }
          }
          return store;
        }).catch(function () { return store; }),
        new Promise(function (res) { setTimeout(function () { res(store); }, 4000); })
      ]);
    }
    return ready;
  }

  /* ---------- Đọc tiến độ cho trang lộ trình ---------- */
  function myCourse(ctx, courseKey) {
    if (!ctx.o || !ctx.user) return Promise.resolve([]);
    var fs = ctx.o.fs;
    return fs.getDocs(fs.query(fs.collection(ctx.o.db, COL), fs.where('studentId', '==', ctx.user.uid))).then(function (sn) {
      var out = []; sn.forEach(function (d) { var r = d.data(); if (r.courseKey === courseKey) out.push(r); }); return out;
    }).catch(function () { return []; });
  }
  function classCourse(ctx, courseKey) {
    if (!ctx.o) return Promise.resolve({ docs: [], students: [] });
    var fs = ctx.o.fs, db = ctx.o.db;
    return Promise.all([
      fs.getDocs(fs.query(fs.collection(db, COL), fs.where('courseKey', '==', courseKey))).then(function (sn) { var a = []; sn.forEach(function (d) { a.push(d.data()); }); return a; }),
      fs.getDocs(fs.query(fs.collection(db, 'users'), fs.where('role', '==', 'student'))).then(function (sn) { var a = []; sn.forEach(function (d) { var u = d.data(); u.uid = d.id; a.push(u); }); return a; }).catch(function () { return []; })
    ]).then(function (r) { return { docs: r[0], students: r[1] }; });
  }

  window.NightProgress = { gate: gate, lessonStore: lessonStore, myCourse: myCourse, classCourse: classCourse, LOCAL: LOCAL };
})();
