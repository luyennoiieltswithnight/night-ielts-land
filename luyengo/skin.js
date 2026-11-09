/* Night IELTS — lớp giao diện cho màn luyện Nghe – Gõ (chạy bên trong khung luyện của luyengo.html).
   Không đụng logic chấm của engine-en/zh: chỉ đổi màu, bo góc, nút và gắn hình Irasutoya sau mỗi lần engine vẽ lại.
   window.NV_SKIN = { lang: 'en'|'zh', ac: '#màu khoá', img: 'đường dẫn thư mục ảnh/' } được luyengo.html đặt sẵn. */
(function () {
  var K = window.NV_SKIN || {}, IMG = K.img || 'khoahoc/img/ira/', AC = K.ac || '#6C70DC', ZH = K.lang === 'zh';
  var P = {
    hero: ZH ? 'norimono_panda_girl_5774' : 'study_night_girl_5647',
    left: ZH ? 'zh_panda' : 'study_english_ondoku_6827',
    right: ZH ? 'zh_teacher' : 'book_sakubun_kodomo_girl'
  };
  if (K.theme === 'night') { P.left = 'garden/tsukimi_jugoya_usagi'; P.right = 'garden/gardening_jouro'; P.hero = 'garden/flower_seichou8'; }
  var pic = function (n, cls) { return '<img class="' + cls + '" src="' + IMG + n + '.webp" alt="" loading="lazy">'; };
  var css = document.createElement('style');
  css.textContent = [
    ':root{--ink:#24242A;--ink2:#34343C;--panel:#F4F4F7;--line:#EEEEF3;--mut:#6B6B78;--ac:' + AC + '}',
    'html{background:#E9E9EF}',
    '#app>div.min-h-screen{background:var(--ink);border-radius:28px;margin:10px auto;padding:6px;max-width:72rem;width:calc(100% - 20px);min-height:calc(100vh - 20px)!important;box-shadow:0 30px 70px -20px rgba(36,36,42,.55)}',
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
    '@media(max-width:860px){.nv-side{display:none}.nv-banner img{height:96px}.nv-banner b{font-size:18px}}',
    /* ===== Màn gõ — thiết kế lại ===== */
    '#app .nv-type>div:first-child h2,#app .nv-type>div:first-child div[class*="tracking-widest"]{display:none}',
    '#app .nv-type>div:first-child{align-items:center!important}',
    '#app .nv-type>div:first-child button[onclick="goCards()"]{background:#fff;border:1.5px solid var(--line);color:var(--ink)!important;padding:9px 16px;border-radius:999px;margin:0!important}',
    '#app .nv-type>div:first-child>div:last-child{background:var(--ink)!important;border:0!important;border-radius:999px!important;padding:4px!important;box-shadow:none!important}',
    '#app .nv-type>div:first-child>div:last-child button{border-radius:999px!important;color:#C9C9D6!important;background:none!important;padding:9px 18px!important;box-shadow:none!important}',
    '#app .nv-type>div:first-child>div:last-child button[class*="bg-primary-50"]{background:#fff!important;color:var(--ink)!important}',
    '#app .nv-type{max-width:880px!important}',
    '#app .nv-type section.bg-white{border:0!important;border-radius:32px!important;box-shadow:0 30px 60px -34px rgba(36,36,42,.45)!important}',
    '#app .nv-type section>div.border-b{padding:18px 26px!important;gap:16px}',
    '#app .nv-type section>div.border-b>span.nv-old{display:none}',
    '.nv-count{font-size:15px;font-weight:800;color:var(--ink);white-space:nowrap}.nv-count small{color:var(--mut);font-weight:700}',
    '.nv-prog{flex:1;height:10px;border-radius:99px;background:#E4E4EC;overflow:hidden}.nv-prog i{display:block;height:100%;border-radius:99px;background:var(--ac);transition:width .35s ease}',
    '#app .nv-type section>div.border-b>span:last-child{background:color-mix(in srgb,var(--ac) 14%,#fff)!important;color:var(--ac)!important;border:0!important;border-radius:999px!important}',
    '.nv-stage{background:radial-gradient(120% 70% at 50% 0%,color-mix(in srgb,var(--ac) 13%,#fff) 0%,#fff 62%)!important;padding:34px 28px 30px!important}',
    '#app .nv-type button[aria-label="Nghe"]{width:112px!important;height:112px!important}',
    '#app .nv-type button[aria-label="Nghe"]:before,#app .nv-type button[aria-label="Nghe"]:after{content:"";position:absolute;inset:-14px;border-radius:999px;border:2px solid var(--ac);opacity:0;animation:nvRing 2.4s ease-out infinite}',
    '#app .nv-type button[aria-label="Nghe"]:after{animation-delay:1.2s}',
    '@keyframes nvRing{0%{transform:scale(.85);opacity:.55}100%{transform:scale(1.35);opacity:0}}',
    '.nv-stage>div:nth-child(2)>div:first-child,.nv-stage>div:nth-child(3)>div:first-child{color:var(--mut)!important}',
    '.nv-stage>div:nth-child(2)>div:last-child{display:inline-block;margin-top:4px;background:#fff;border:1.5px solid var(--line);border-radius:18px;padding:10px 20px;font-size:22px!important;box-shadow:0 10px 24px -18px rgba(36,36,42,.5)}',
    '#app .nv-type #inputWrapper{border:0!important;background:var(--panel)!important;border-radius:24px!important;box-shadow:inset 0 2px 0 rgba(36,36,42,.04)!important;max-width:700px!important}',
    '#app .nv-type #inputWrapper:focus-within{background:#fff!important;box-shadow:0 0 0 3px var(--ac),0 16px 34px -20px var(--ac)!important}',
    '#app .nv-type #typingFeedback span{letter-spacing:.06em}',
    '#app .nv-type section>div.border-t{padding:16px 20px!important;background:var(--panel)!important;border:0!important}',
    '#app .nv-type section>div.border-t>div{background:var(--ink);border-radius:999px;padding:5px;gap:4px!important}',
    '#app .nv-type section>div.border-t>div button{background:none!important;color:#E4E4EC!important;padding:10px 14px!important}',
    '#app .nv-type section>div.border-t>div button:hover{background:var(--ink2)!important}',
    '#app .nv-type section>div.border-t>div button span{color:#A9A9B8!important}',
    '#app .nv-type section>div.border-t>div button[onclick^="giveHint"]{color:#FBBF24!important}',
    '#app .nv-type section>div.border-t>button:first-child{background:#fff!important;border:1.5px solid var(--line)!important;color:var(--ink)!important}',
    '#app .nv-type section>div.border-t>button:last-child{background:var(--ac)!important;background-image:none!important;padding:13px 28px!important;box-shadow:0 14px 28px -14px var(--ac)!important}',
    '.nv-side{animation:nvFloat 4s ease-in-out infinite}.nv-side.r{animation-delay:-2s}',
    '@keyframes nvFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}',
    '@media(max-width:900px){#app .nv-type section>div.border-t{flex-wrap:wrap!important;justify-content:space-between!important;row-gap:12px}#app .nv-type section>div.border-t>div{order:-1;width:100%;justify-content:center;flex-wrap:wrap}}',
    '@media(max-width:640px){#app .nv-stage{padding:26px 14px!important}#app .nv-type section>div.border-t>div button{padding:9px 10px!important}}'
  ].join('\n');
  document.head.appendChild(css);
  /* ===== Giao diện ĐÊM (Khu vườn từ vựng): nền xanh đêm, kính mờ, chữ trắng, nhấn vàng cam ===== */
  if (K.theme === 'night') {
    var nc = document.createElement('style');
    nc.textContent = [
      'html{background:#141838!important}body,body.paper-texture{background:radial-gradient(120% 80% at 80% 0%,#3B3A78 0%,#1B1F4B 50%,#141838 100%)!important;color:#fff}',
      'body:before{content:"";position:fixed;inset:0;pointer-events:none;background-image:radial-gradient(1.5px 1.5px at 12% 18%,#fff,transparent),radial-gradient(1px 1px at 32% 8%,#fff,transparent),radial-gradient(1.5px 1.5px at 58% 22%,#fff,transparent),radial-gradient(1px 1px at 76% 12%,#fff,transparent),radial-gradient(1.5px 1.5px at 88% 30%,#fff,transparent),radial-gradient(1px 1px at 22% 40%,#fff,transparent),radial-gradient(1px 1px at 66% 44%,#fff,transparent);opacity:.7}',
      '#app>div.min-h-screen{background:rgba(14,16,40,.75)!important;border:1px solid rgba(255,255,255,.08);position:relative}',
      '#app main{background:transparent!important}',
      '#app header.sticky{background:rgba(255,255,255,.05)!important;border-bottom:1px solid rgba(255,255,255,.08)!important}',
      '#app .nv-type section.bg-white{position:relative;overflow:hidden;background:linear-gradient(160deg,#2B2F6E 0%,#1B1F4B 60%,#161A40 100%)!important;border:1px solid rgba(255,255,255,.1)!important;box-shadow:0 30px 60px -30px rgba(0,0,0,.8)!important}',
      '#app .nv-type section.bg-white:before{content:"";position:absolute;right:-90px;top:-90px;width:300px;height:300px;border-radius:999px;border:44px solid rgba(255,255,255,.06);pointer-events:none}',
      '#app .nv-type section>div.border-b{background:transparent!important}',
      '#app .nv-count{color:#fff}#app .nv-count small{color:#B9BCF4}',
      '#app .nv-prog{background:rgba(255,255,255,.12)}#app .nv-prog i{background:linear-gradient(90deg,#FFD66B,#FF9E5E)}',
      '#app .nv-type section>div.border-b>span:last-child{background:rgba(255,255,255,.12)!important;color:#FFE7A3!important}',
      '#app .nv-stage{background:transparent!important}',
      '#app .nv-stage *{color:#fff}',
      '#app .nv-stage>div:nth-child(2)>div:first-child,#app .nv-stage>div:nth-child(3)>div:first-child,#app .nv-stage [class*="tracking-widest"]{color:#B9BCF4!important}',
      '#app .nv-stage>div:nth-child(2)>div:last-child{background:rgba(255,255,255,.1)!important;border:1px solid rgba(255,255,255,.14)!important;color:#fff!important;box-shadow:none!important}',
      '#app .nv-type button[aria-label="Nghe"]{background:linear-gradient(135deg,#FFD66B,#FF9E5E)!important;color:#3A2410!important;box-shadow:0 0 0 10px rgba(255,214,107,.14),0 18px 36px -12px rgba(255,158,94,.8)!important}',
      '#app .nv-type button[aria-label="Nghe"] *{color:#3A2410!important}',
      '#app .nv-type button[aria-label="Nghe"]:before,#app .nv-type button[aria-label="Nghe"]:after{border-color:#FFD66B!important}',
      '#app .nv-type #inputWrapper{background:rgba(255,255,255,.07)!important;border:1px solid rgba(255,255,255,.12)!important}',
      '#app .nv-type #inputWrapper:focus-within{background:rgba(255,255,255,.11)!important;box-shadow:0 0 0 3px #FFD66B,0 16px 34px -20px #FFD66B!important}',
      '#app .nv-type #visualInputBox span{color:#fff}#app .nv-type #visualInputBox .char-box{border-color:rgba(255,231,163,.55)!important}',
      '#app .nv-type section>div.border-t{background:rgba(0,0,0,.18)!important}',
      '#app .nv-type section>div.border-t>div{background:rgba(255,255,255,.08)!important}',
      '#app .nv-type section>div.border-t>button:last-child{background:linear-gradient(135deg,#FFD66B,#FF9E5E)!important;color:#3A2410!important}',
      '#app .nv-type section>div.border-t>button:last-child *{color:#3A2410!important}',
      '#app .nv-type section>div.border-t>button:first-child{background:rgba(255,255,255,.08)!important;border-color:rgba(255,255,255,.12)!important;color:#fff!important}',
      '#app .nv-type #typingFeedback{color:#9BE7A1}',
      '.nv-mf{background:rgba(255,214,107,.16)!important;color:#FFE7A3!important}',
      '#app .nv-stage .char-typed{color:#fff!important;border-bottom-color:#FFD66B!important}',
      '#app .nv-stage .char-error{color:#FF8FA3!important;border-bottom-color:#FF6B81!important}',
      '#app .nv-stage .char-hint{color:#FFE7A3!important}',
      '#app .nv-stage .char-box:not(.char-typed):not(.char-error):not(.char-hint){color:rgba(255,255,255,.4)!important;border-bottom-color:rgba(255,255,255,.25)!important}',
      '.nv-side{filter:drop-shadow(0 8px 16px rgba(0,0,0,.45))}'
    ].join('\n');
    document.head.appendChild(nc);
  }
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
    if (sec) {
      var wrapT = sec.parentElement; if (wrapT && !wrapT.classList.contains('nv-type')) wrapT.classList.add('nv-type');
      var stage = sec.children[2]; if (stage && !stage.classList.contains('nv-stage')) stage.classList.add('nv-stage');
      var bar = sec.children[1];
      if (bar && !bar.querySelector('.nv-prog') && typeof state !== 'undefined' && typeof ITEMS !== 'undefined') {
        var i = state.practiceIndex + 1, n = ITEMS.length;
        if (bar.firstElementChild) bar.firstElementChild.classList.add('nv-old');
        bar.insertAdjacentHTML('afterbegin', '<span class="nv-count">' + i + ' <small>/ ' + n + '</small></span><span class="nv-prog"><i style="width:' + Math.round(i / n * 100) + '%"></i></span>');
      }
    }
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
  /* ---------- Bàn phím: luôn gõ chữ Latin (không bị Telex / bộ gõ tiếng Trung chen vào) ----------
     Ô nhập ẩn là kiểu "password": trình duyệt tự tắt bộ gõ (IME) và gợi ý chữ cho loại ô này. */
  function lockKeyboard() {
    var el = document.getElementById('hiddenInput');
    if (!el || el.dataset.nvKb) return;
    el.dataset.nvKb = '1';
    try { el.type = 'password'; } catch (e) {}
    el.setAttribute('autocomplete', 'off'); el.setAttribute('lang', 'en'); el.setAttribute('data-lpignore', 'true'); el.setAttribute('data-1p-ignore', 'true'); el.setAttribute('data-form-type', 'other');
    el.setAttribute('enterkeyhint', 'next');
  }
  var warnT = 0;
  document.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'hiddenInput') return;
    if (/[^\x00-\x7F]/.test(e.target.value)) {
      var w = document.getElementById('nv-kbwarn');
      if (!w) { w = document.createElement('div'); w.id = 'nv-kbwarn'; w.style.cssText = 'position:fixed;left:50%;top:84px;transform:translateX(-50%);z-index:99;background:#24242A;color:#fff;padding:10px 16px;border-radius:999px;font:700 13px "Plus Jakarta Sans",sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25);max-width:calc(100vw - 24px);text-align:center'; document.body.appendChild(w); }
      w.textContent = 'Chuyển bàn phím sang tiếng Anh (EN) để gõ nhé — tắt bộ gõ Telex / pinyin';
      clearTimeout(warnT); warnT = setTimeout(function () { w.remove(); }, 4000);
    }
  }, true);

  /* ---------- Lưu tiến độ: gửi ra trang ngoài (luyengo.html) để lưu, lần sau mở là làm tiếp ---------- */
  var done = { phrase: {}, sentence: {} }, lastSent = '', sendT = 0;
  function track() {
    if (typeof state === 'undefined' || typeof ITEMS === 'undefined' || !K.pkey) return;
    if (state.completed && state.viewMode === 'type') done[state.practiceType][state.practiceIndex] = 1;
    var msg = { t: state.practiceType, i: state.practiceIndex, v: state.viewMode, n: ITEMS.length,
      done: { phrase: Object.keys(done.phrase).map(Number), sentence: Object.keys(done.sentence).map(Number) } };
    var j = JSON.stringify(msg); if (j === lastSent) return; lastSent = j;
    clearTimeout(sendT); sendT = setTimeout(function () { try { parent.postMessage({ nvProgress: msg, key: K.pkey }, '*'); } catch (e) {} }, 300);
  }
  function resume() {
    var r = K.resume; if (!r || typeof state === 'undefined' || !ITEMS.length) return;
    (r.done && r.done.phrase || []).forEach(function (i) { done.phrase[i] = 1; });
    (r.done && r.done.sentence || []).forEach(function (i) { done.sentence[i] = 1; });
    if (r.v !== 'type') return;
    state.viewMode = 'type'; state.practiceType = r.t === 'sentence' ? 'sentence' : 'phrase';
    state.practiceIndex = Math.max(0, Math.min(ITEMS.length - 1, r.i | 0));
    state.input = ''; state.revealed = false; state.completed = false; state.hintActive = false; state.hintEndIndex = -1; state.errorIndex = -1;
    render(0);
  }
  function boot() {
    var app = document.getElementById('app'); if (!app || !app.firstChild) return setTimeout(boot, 50);
    resume();
    decorate(); lockKeyboard(); track();
    new MutationObserver(function () { decorate(); lockKeyboard(); track(); }).observe(app, { childList: true, subtree: true });
  }
  boot();
})();
