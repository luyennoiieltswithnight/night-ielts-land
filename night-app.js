/* Night IELTS — chạy dạng web app (đã "Thêm vào màn hình chính"):
   1) Link / window.open trong cùng trang web → mở ngay trong cửa sổ hiện tại (không bật cửa sổ mới).
   2) Trang con có nút "‹ Quay lại" — tự né các nút nổi của trang (dò lại mỗi khi trang đổi), chật thì thu thành "‹"; giữ & kéo để dời chỗ (nhớ riêng từng trang).
   Ở trình duyệt thường không thay đổi gì. */
(function () {
  if (window.__nightApp) return; window.__nightApp = true;
  var standalone = false;
  try { standalone = window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || window.navigator.standalone === true; } catch (e) {}
  if (!standalone) return;

  function sameSite(url) {
    try { var u = new URL(url, location.href); return u.origin === location.origin && /^https?:$/.test(u.protocol) ? u : null; } catch (e) { return null; }
  }
  function go(u) { location.href = u.href; }

  // 1a) <a target="_blank"> cùng trang web
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var a = e.target.closest && e.target.closest('a[target]');
    if (!a || !a.href || a.hasAttribute('download') || /^_(self|top|parent)$/i.test(a.target)) return;
    var u = sameSite(a.href); if (!u) return;
    e.preventDefault(); go(u);
  }, true);

  // 1b) window.open('trang-cua-web.html') → mở tại chỗ (window.open('') để in ấn thì giữ nguyên)
  var origOpen = window.open;
  window.open = function (url, target) {
    if (url && (!target || target === '_blank')) {
      var u = sameSite(String(url));
      if (u && u.href.split('#')[0] !== location.href.split('#')[0]) { go(u); return null; }
    }
    return origOpen.apply(window, arguments);
  };

  // 2) Nút quay lại (không hiện ở trang chủ, và trang đề thi đã có nút "Thoát")
  var path = location.pathname.replace(/\/+$/, '/');
  if (path === '/' || /\/index\.html$/i.test(path) && path.split('/').length <= 2) return;
  var POS_KEY = 'night-back-pos:' + location.pathname;
  function addBack() {
    if (document.getElementById('night-back') || document.querySelector('[onclick*="exitTest"]')) return;
    var b = document.createElement('button');
    b.id = 'night-back'; b.type = 'button'; b.setAttribute('aria-label', 'Quay lại'); b.title = 'Quay lại (giữ và kéo để dời chỗ)';
    b.innerHTML = '<span style="font-size:20px;line-height:1;margin-top:-2px">‹</span><span class="nb-txt">Quay lại</span>';
    b.style.cssText = 'position:fixed;z-index:2147483000;display:flex;align-items:center;justify-content:center;gap:6px;touch-action:none;' +
      'padding:8px 14px 8px 11px;border:0;border-radius:999px;background:rgba(255,255,255,.94);color:#4b40b8;font:700 14px system-ui,-apple-system,sans-serif;' +
      'box-shadow:0 6px 18px rgba(60,40,140,.22);cursor:pointer;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;transition:opacity .15s';
    b.onclick = function (e) {
      if (b._dragged) { b._dragged = false; e.preventDefault(); return; }
      var ref = ''; try { ref = document.referrer ? new URL(document.referrer).origin : ''; } catch (er) {}
      if (history.length > 1 && ref === location.origin) history.back();
      else location.href = '/index.html';
    };
    document.body.appendChild(b);
    drag(b);
    place();
    /* Trang đổi (nút mới hiện ra, bảng mở/đóng…) → dò lại chỗ trống */
    var t = 0;
    var later = function () { clearTimeout(t); t = setTimeout(place, 250); };
    new MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) { var n = recs[i].target; if (n !== b && !(n.closest && n.closest('#night-back'))) { later(); return; } }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open'] });
    window.addEventListener('resize', later);
    window.addEventListener('scroll', later, { passive: true }); // nút sticky / thanh hiện khi cuộn
    if (window.visualViewport) window.visualViewport.addEventListener('resize', later);
  }
  /* Kéo để dời chỗ (iPad: giữ nút rồi kéo). Chỗ đã kéo được nhớ riêng cho từng trang. */
  function drag(b) {
    var st = null;
    b.addEventListener('pointerdown', function (e) { st = { x: e.clientX, y: e.clientY, r: b.getBoundingClientRect(), moved: false }; try { b.setPointerCapture(e.pointerId); } catch (er) {} });
    b.addEventListener('pointermove', function (e) {
      if (!st) return;
      var dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.moved && Math.abs(dx) + Math.abs(dy) < 10) return;
      st.moved = true; b.style.opacity = '.85';
      var L = Math.max(4, Math.min(innerWidth - st.r.width - 4, st.r.left + dx)), T = Math.max(4, Math.min(innerHeight - st.r.height - 4, st.r.top + dy));
      b.style.right = b.style.bottom = ''; b.style.left = L + 'px'; b.style.top = T + 'px';
    });
    var end = function () {
      if (!st) return;
      if (st.moved) {
        b._dragged = true; b.style.opacity = '';
        var r = b.getBoundingClientRect();
        try { localStorage.setItem(POS_KEY, JSON.stringify({ x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight })); } catch (er) {}
        setTimeout(function () { b._dragged = false; }, 400);
      }
      st = null;
    };
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
  }
  /* Tránh đè lên nút có sẵn của trang: thử lần lượt các chỗ, chỗ nào trống thì đặt ở đó;
     chật quá thì thu nút thành hình tròn nhỏ "‹" rồi thử lại. */
  var SB = 'env(safe-area-inset-bottom)', ST = 'env(safe-area-inset-top)';
  var SPOTS = [
    { left: '12px', bottom: 'calc(14px + ' + SB + ')' },
    { right: '12px', bottom: 'calc(14px + ' + SB + ')' },
    { left: '12px', bottom: 'calc(80px + ' + SB + ')' },
    { right: '12px', bottom: 'calc(80px + ' + SB + ')' },
    { left: '12px', bottom: 'calc(146px + ' + SB + ')' },
    { right: '12px', bottom: 'calc(146px + ' + SB + ')' },
    { left: '12px', top: 'calc(50% - 20px)' },
    { right: '12px', top: 'calc(50% - 20px)' },
    { left: 'calc(50% - 22px)', bottom: 'calc(14px + ' + SB + ')' },
    { right: '12px', top: 'calc(12px + ' + ST + ')' },
    { left: '12px', top: 'calc(12px + ' + ST + ')' }
  ];
  var CLICKABLE = 'a,button,input,select,textarea,summary,label,[role="button"],[onclick],[tabindex]';
  function fixedEls() {
    var out = [], all = document.body.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) {
      var e = all[i]; if (e.id === 'night-back') continue;
      var cs = getComputedStyle(e);
      if ((cs.position === 'fixed' || cs.position === 'sticky') && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0 && cs.pointerEvents !== 'none') out.push(e);
    }
    return out;
  }
  function rects(els) {
    var out = [];
    for (var i = 0; i < els.length; i++) {
      var e = els[i], q = e.getBoundingClientRect();
      if (q.width < 2 || q.height < 2 || q.bottom < 0 || q.top > innerHeight || q.right < 0 || q.left > innerWidth) continue;
      if (q.width > innerWidth * 0.9 && q.height > innerHeight * 0.6) {
        // lớp phủ toàn màn hình (popup, ngăn kéo…): né từng nút bên trong thay vì né cả lớp
        var kids = e.querySelectorAll(CLICKABLE);
        for (var k = 0; k < kids.length && k < 400; k++) { var r = kids[k].getBoundingClientRect(); if (r.width > 1 && r.height > 1) out.push(r); }
        continue;
      }
      out.push(q);
    }
    return out;
  }
  function overlap(r, list) {
    var sum = 0;
    for (var i = 0; i < list.length; i++) {
      var q = list[i];
      var w = Math.min(r.right + 6, q.right) - Math.max(r.left - 6, q.left), h = Math.min(r.bottom + 6, q.bottom) - Math.max(r.top - 6, q.top);
      if (w > 0 && h > 0) sum += w * h;
    }
    return sum;
  }
  function setSpot(b, sp) { b.style.left = b.style.right = b.style.top = b.style.bottom = ''; for (var k in sp) b.style[k] = sp[k]; }
  function setMini(b, on) {
    var t = b.querySelector('.nb-txt'); if (t) t.style.display = on ? 'none' : '';
    b.style.padding = on ? '0' : '8px 14px 8px 11px'; b.style.width = b.style.height = on ? '40px' : '';
  }
  function place() {
    var b = document.getElementById('night-back'); if (!b || b._placing) return;
    b._placing = true;
    try {
      var saved = null; try { saved = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); } catch (er) {}
      if (saved && saved.x >= 0 && saved.x <= 1) {
        setMini(b, false);
        var r0 = b.getBoundingClientRect();
        setSpot(b, { left: Math.max(4, Math.min(innerWidth - r0.width - 4, saved.x * innerWidth - r0.width / 2)) + 'px', top: Math.max(4, Math.min(innerHeight - r0.height - 4, saved.y * innerHeight - r0.height / 2)) + 'px' });
        return;
      }
      var list = rects(fixedEls()), best = null, bestA = Infinity;
      for (var m = 0; m < 2; m++) {
        setMini(b, m === 1);
        for (var i = 0; i < SPOTS.length; i++) {
          setSpot(b, SPOTS[i]);
          var a = overlap(b.getBoundingClientRect(), list);
          if (a === 0) return;
          if (a < bestA) { bestA = a; best = [m, i]; }
        }
      }
      setMini(b, best[0] === 1); setSpot(b, SPOTS[best[1]]);
    } finally { setTimeout(function () { b._placing = false; }, 0); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addBack); else addBack();
})();
