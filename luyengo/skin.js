/* Night IELTS — lớp giao diện cho màn luyện Nghe – Gõ (chạy bên trong khung luyện của luyengo.html).
   Không đụng logic chấm của engine-en/zh: chỉ đổi màu, bo góc, nút và gắn hình Irasutoya sau mỗi lần engine vẽ lại.
   window.NV_SKIN = { lang: 'en'|'zh', ac: '#màu khoá', img: 'đường dẫn thư mục ảnh/' } được luyengo.html đặt sẵn. */
(function () {
  var K = window.NV_SKIN || {}, IMG = K.img || 'khoahoc/img/ira/', AC = K.ac || '#6C70DC', ZH = K.lang === 'zh';
  var P = {
    hero: ZH ? 'norimono_panda_girl_5774' : 'study_night_girl_5647',
    left: ZH ? 'zh_panda' : 'study_english_ondoku_6827',
    right: ZH ? 'kanji_woman_8688' : 'book_sakubun_kodomo_girl'
  };
  var pic = function (n, cls) { return '<img class="' + cls + '" src="' + IMG + n + '.webp" alt="" loading="lazy">'; };
  var css = document.createElement('style');
  css.textContent = [
    ':root{--ink:#24242A;--ink2:#34343C;--panel:#F4F4F7;--line:#EEEEF3;--mut:#6B6B78;--ac:' + AC + '}',
    'html{background:#E9E9EF}',
    '#app>div.min-h-screen{background:var(--ink);border-radius:28px;margin:8px;padding:6px;min-height:calc(100vh - 16px)!important}',
    '#app main{background:var(--panel);border-radius:22px}',
    '.nv-exit{background:var(--ink2)!important;color:#fff!important;border:0;border-radius:999px;padding:9px 14px;font-weight:800;font-size:13px;cursor:pointer;margin-right:12px;display:inline-flex;align-items:center;gap:6px}',
    'header.sticky>div:first-child{display:flex;align-items:center}',
    'body{background:#E9E9EF!important;font-family:"Plus Jakarta Sans",system-ui,sans-serif!important;color:var(--ink)}',
    'body.paper-texture{background-image:none!important}',
    /* thanh trên: khung tối như trang chủ */
    'header.sticky{background:var(--ink)!important;border:0!important;backdrop-filter:none!important;padding:8px 10px 12px!important;top:0!important}',
    'header.sticky h1{color:#fff!important;font-size:16px!important}',
    'header.sticky div[class*="tracking-widest"]{color:#A9A9B8!important}',
    'header.sticky select{background:var(--ink2)!important;border:0!important;color:#fff!important;border-radius:999px!important}',
    'header.sticky button{background:#fff!important;color:var(--ink)!important;border-radius:999px!important}',
    'header.sticky span{color:#A9A9B8!important}',
    /* thẻ & khung */
    'article.bg-white{border:1.5px solid var(--line)!important;border-radius:24px!important;box-shadow:none!important}',
    'article.bg-white:hover{border-color:#DCDDF6!important}',
    'section.bg-white{border:1.5px solid var(--line)!important;border-radius:28px!important;box-shadow:0 20px 50px -30px rgba(36,36,42,.35)!important}',
    'section.bg-white>div.border-b{background:var(--panel)!important;border:0!important}',
    'section.bg-white>div.border-t{background:#fff!important;border-top:1.5px solid var(--line)!important}',
    /* nút: viên thuốc, nút chính màu đen, nút phụ nền xám */
    '#app button[class*="rounded-2xl"],#app button[class*="rounded-xl"]{border-radius:999px!important}',
    '#app button.bg-slate-900{background:var(--ink)!important;box-shadow:0 10px 24px -10px rgba(36,36,42,.6)!important}',
    '#app button.bg-slate-50,#app button.bg-slate-100{background:var(--panel)!important}',
    '#app h2{letter-spacing:-.02em}',
    /* nút nghe: tròn màu khoá, vòng sáng */
    '#app button[aria-label="Nghe"]{background:var(--ac)!important;box-shadow:0 0 0 10px color-mix(in srgb,var(--ac) 16%,transparent),0 18px 36px -12px var(--ac)!important}',
    '#app .animate-ping{display:none}',
    /* ô gõ */
    '#inputWrapper{border-radius:22px!important;border:2px dashed #D9D9E3!important;background:#FBFBFD!important;box-shadow:none!important}',
    '#inputWrapper:focus-within{border-style:solid!important;border-color:var(--ac)!important;background:#fff!important}',
    '#purpleProgressBar{background:var(--ac)!important}',
    /* hình minh hoạ */
    '.nv-banner{position:relative;overflow:hidden;display:flex;align-items:center;gap:16px;border-radius:26px;background:var(--ac);color:#fff;padding:22px 24px;margin-bottom:22px;min-height:150px}',
    '.nv-banner:before{content:"";position:absolute;right:-50px;top:-60px;width:220px;height:220px;border-radius:999px;border:30px solid rgba(255,255,255,.13)}',
    '.nv-banner .tx{position:relative;flex:1;min-width:0}.nv-banner b{display:block;font-size:22px;font-weight:800;line-height:1.2}.nv-banner small{display:block;margin-top:6px;font-size:13.5px;opacity:.9;line-height:1.5}',
    '.nv-banner img{position:relative;height:130px;width:auto;flex:none;filter:drop-shadow(0 8px 14px rgba(0,0,0,.18))}',
    '.nv-side{position:absolute;top:28px;width:118px;height:auto;pointer-events:none}',
    '.nv-side.l{left:26px}.nv-side.r{right:26px}',
    '@media(max-width:860px){.nv-side{display:none}.nv-banner img{height:96px}.nv-banner b{font-size:18px}}'
  ].join('\n');
  document.head.appendChild(css);
  var f = document.createElement('link'); f.rel = 'stylesheet'; f.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap'; document.head.appendChild(f);

  function decorate() {
    var app = document.getElementById('app'); if (!app) return;
    var hd = app.querySelector('header.sticky');
    if (hd && !hd.querySelector('.nv-exit') && window.parent !== window) {
      var first = hd.firstElementChild, wrap = document.createElement('div');
      hd.insertBefore(wrap, first); wrap.appendChild(first);
      wrap.insertAdjacentHTML('afterbegin', '<button class="nv-exit" type="button">&larr; Thoát</button>');
      wrap.querySelector('.nv-exit').onclick = function () { try { parent.postMessage('nv-close', '*'); } catch (e) {} };
    }
    var sec = app.querySelector('section.bg-white');
    if (sec && !sec.querySelector('.nv-side')) {
      /* màn gõ: 2 hình hai bên nút nghe */
      var body = sec.children[2] || sec;
      body.style.position = 'relative';
      body.insertAdjacentHTML('beforeend', pic(P.left, 'nv-side l') + pic(P.right, 'nv-side r'));
    }
    var grid = app.querySelector('div.grid');
    if (grid && !app.querySelector('.nv-banner')) {
      /* màn danh sách: băng rôn có hình */
      var top = grid.previousElementSibling;
      var n = grid.children.length;
      (top || grid).insertAdjacentHTML('beforebegin', '<div class="nv-banner"><div class="tx"><b>' + (ZH ? 'Nghe – gõ pinyin' : 'Nghe – gõ lại từng chữ') + '</b><small>' + n + ' mục · nghe thử từng thẻ, rồi bấm <b style="display:inline;font-size:inherit">Bắt đầu</b> để luyện gõ cụm từ rồi tới câu.</small></div>' + pic(P.hero, '') + '</div>');
    }
  }
  function boot() {
    var app = document.getElementById('app'); if (!app) return setTimeout(boot, 50);
    decorate();
    new MutationObserver(function () { decorate(); }).observe(app, { childList: true, subtree: true });
  }
  boot();
})();
