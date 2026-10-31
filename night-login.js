/* Night IELTS — night-login.js: hộp đăng nhập dùng chung (Google HOẶC email nhận link đăng nhập).
   NightLogin.open({ auth, authM, title, note })  → mở hộp chọn cách đăng nhập
   NightLogin.complete(auth, authM)                → gọi khi trang tải: nếu đang mở từ link trong email thì đăng nhập luôn
   Email: Firebase "Email link (passwordless)" — không cần mật khẩu, bấm link trong thư là vào. */
(function () {
  if (window.NightLogin) return;
  var KEY = 'nightLoginEmail';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var CSS = '#nl-ov{position:fixed;inset:0;z-index:100001;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(36,36,42,.45);backdrop-filter:blur(3px);font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif}' +
    '#nl-ov .bx{width:100%;max-width:400px;background:#fff;border-radius:26px;padding:26px 22px 20px;box-shadow:0 30px 60px -20px rgba(36,36,42,.45);color:#24242A;text-align:center;position:relative}' +
    '#nl-ov h2{margin:0 0 6px;font-size:21px;font-weight:800}#nl-ov p{margin:0 0 16px;font-size:13.5px;line-height:1.55;color:#6B6B78}' +
    '#nl-ov .x{position:absolute;right:12px;top:10px;border:0;background:none;font-size:20px;color:#9A9AA8;cursor:pointer}' +
    '#nl-ov .bt{display:flex;width:100%;align-items:center;justify-content:center;gap:10px;border:0;border-radius:999px;padding:13px 18px;font:800 15px inherit;font-family:inherit;cursor:pointer}' +
    '#nl-ov .g{background:#24242A;color:#fff}#nl-ov .e{background:#6C70DC;color:#fff;margin-top:10px}#nl-ov .bt:disabled{opacity:.6}' +
    '#nl-ov .or{display:flex;align-items:center;gap:10px;margin:14px 0;color:#A3A3B2;font-size:12px;font-weight:700}#nl-ov .or:before,#nl-ov .or:after{content:"";flex:1;height:1px;background:#EEEEF3}' +
    '#nl-ov input{width:100%;box-sizing:border-box;border:2px solid #EEEEF3;border-radius:14px;padding:12px 14px;font:600 15px inherit;font-family:inherit;outline:none}#nl-ov input:focus{border-color:#6C70DC}' +
    '#nl-ov .msg{margin-top:12px;font-size:13px;line-height:1.5}#nl-ov .ok{color:#047857}#nl-ov .err{color:#E11D48}' +
    '#nl-ov .safe{margin-top:16px;font-size:11.5px;line-height:1.5;color:#8A8A98}#nl-ov .safe a{color:#6C70DC}';
  function root() { try { return new URL('./', document.querySelector('script[src*="night-login.js"]').src).href; } catch (e) { return '/'; } }
  function close() { var o = document.getElementById('nl-ov'); if (o) o.remove(); }
  var G_ICON = '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  function open(opt) {
    opt = opt || {};
    var auth = opt.auth, A = opt.authM; if (!auth || !A) return;
    close();
    if (!document.getElementById('nl-css')) { var st = document.createElement('style'); st.id = 'nl-css'; st.textContent = CSS; document.head.appendChild(st); }
    var r = root(), o = document.createElement('div'); o.id = 'nl-ov';
    o.innerHTML = '<div class="bx">' + (opt.noClose ? '' : '<button class="x" data-k="x" aria-label="Đóng">×</button>') +
      '<h2>' + esc(opt.title || 'Đăng nhập Night IELTS') + '</h2><p>' + (opt.note || 'Đăng nhập để lưu tiến độ học và dùng đầy đủ tính năng.') + '</p>' +
      '<button class="bt g" data-k="g">' + G_ICON + ' Tiếp tục với Google</button>' +
      '<div class="or">hoặc dùng email bất kỳ</div>' +
      '<input type="email" id="nl-mail" placeholder="email@cua-ban.com" autocomplete="email" value="' + esc(localStorage.getItem(KEY) || '') + '">' +
      '<button class="bt e" data-k="e">Gửi link đăng nhập về email</button>' +
      '<div class="msg" id="nl-msg"></div>' +
      '<div class="safe">🔒 Không cần mật khẩu. Night IELTS chỉ lưu tên, email và ảnh đại diện — không xem được mật khẩu, thư hay danh bạ.<br><a href="' + r + 'privacy.html" target="_blank">Chính sách bảo mật</a> · <a href="' + r + 'terms.html" target="_blank">Điều khoản</a></div></div>';
    document.body.appendChild(o);
    var msg = o.querySelector('#nl-msg');
    o.addEventListener('click', function (e) {
      if (e.target === o && !opt.noClose) return close();
      var b = e.target.closest('[data-k]'); if (!b) return;
      if (b.dataset.k === 'x') return close();
      if (b.dataset.k === 'g') {
        b.disabled = true; msg.textContent = '';
        A.signInWithPopup(auth, new A.GoogleAuthProvider()).then(close).catch(function (er) {
          b.disabled = false;
          if (er && /popup-closed|cancelled-popup/.test(er.code || '')) return;
          msg.className = 'msg err'; msg.textContent = 'Chưa đăng nhập được (' + (er && er.code || 'lỗi') + '). Thử lại hoặc dùng email.';
        });
      }
      if (b.dataset.k === 'e') {
        var mail = (o.querySelector('#nl-mail').value || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { msg.className = 'msg err'; msg.textContent = 'Email chưa đúng, kiểm tra lại nhé.'; return; }
        b.disabled = true; msg.className = 'msg'; msg.textContent = 'Đang gửi…';
        var back = location.href.split('#')[0];
        A.sendSignInLinkToEmail(auth, mail, { url: back, handleCodeInApp: true }).then(function () {
          try { localStorage.setItem(KEY, mail); } catch (e2) {}
          msg.className = 'msg ok'; msg.innerHTML = '✅ Đã gửi link tới <b>' + esc(mail) + '</b>. Mở hộp thư (cả mục Spam / Quảng cáo), bấm link trong thư là vào học — mở trên <b>chính máy này</b> cho nhanh.';
          b.textContent = 'Gửi lại link'; b.disabled = false;
        }).catch(function (er) {
          b.disabled = false; msg.className = 'msg err';
          msg.textContent = (er && er.code === 'auth/operation-not-allowed') ? 'Đăng nhập bằng email đang tạm tắt, vui lòng dùng Google.' : 'Chưa gửi được (' + (er && er.code || 'lỗi') + '). Thử lại sau ít phút.';
        });
      }
    });
  }
  /* Mở từ link trong email → đăng nhập, xoá tham số khỏi thanh địa chỉ */
  function complete(auth, A) {
    try {
      if (!auth || !A || !A.isSignInWithEmailLink || !A.isSignInWithEmailLink(auth, location.href)) return Promise.resolve(false);
    } catch (e) { return Promise.resolve(false); }
    var mail = '';
    try { mail = localStorage.getItem(KEY) || ''; } catch (e) {}
    if (!mail) mail = (prompt('Nhập lại email bạn vừa dùng để nhận link đăng nhập:') || '').trim();
    if (!mail) return Promise.resolve(false);
    return A.signInWithEmailLink(auth, mail, location.href).then(function (cred) {
      try {
        var u = new URL(location.href); ['apiKey', 'oobCode', 'mode', 'continueUrl', 'lang', 'tenantId'].forEach(function (k) { u.searchParams.delete(k); });
        history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
      } catch (e) {}
      /* Tài khoản email chưa có tên → lấy phần trước @ làm tên hiển thị */
      if (cred && cred.user && !cred.user.displayName && A.updateProfile) A.updateProfile(cred.user, { displayName: mail.split('@')[0] }).catch(function () {});
      return true;
    }).catch(function (er) { alert('Link đăng nhập đã hết hạn hoặc đã dùng rồi (' + (er && er.code || 'lỗi') + '). Gửi lại link mới nhé.'); return false; });
  }
  window.NightLogin = { open: open, close: close, complete: complete };
})();
