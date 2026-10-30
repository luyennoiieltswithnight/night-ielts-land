/* Night IELTS — chạy dạng web app (đã "Thêm vào màn hình chính"):
   1) Link / window.open trong cùng trang web → mở ngay trong cửa sổ hiện tại (không bật cửa sổ mới).
   2) Trang con có nút "‹ Quay lại" nhỏ ở góc dưới bên trái.
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
  function addBack() {
    if (document.getElementById('night-back') || document.querySelector('[onclick*="exitTest"]')) return;
    var b = document.createElement('button');
    b.id = 'night-back'; b.type = 'button'; b.setAttribute('aria-label', 'Quay lại');
    b.innerHTML = '<span style="font-size:20px;line-height:1;margin-top:-2px">‹</span><span>Quay lại</span>';
    b.style.cssText = 'position:fixed;left:12px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:2147483000;display:flex;align-items:center;gap:6px;' +
      'padding:8px 14px 8px 11px;border:0;border-radius:999px;background:rgba(255,255,255,.94);color:#4b40b8;font:700 14px system-ui,-apple-system,sans-serif;' +
      'box-shadow:0 6px 18px rgba(60,40,140,.22);cursor:pointer;-webkit-tap-highlight-color:transparent';
    b.onclick = function () {
      var ref = ''; try { ref = document.referrer ? new URL(document.referrer).origin : ''; } catch (e) {}
      if (history.length > 1 && ref === location.origin) history.back();
      else location.href = '/index.html';
    };
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addBack); else addBack();
})();
