/*
 * NIGHT IELTS — test-theme.js: giao diện bento (khung tối, thẻ tím / cam) cho MỌI đề Reading & Listening,
 * đồng bộ với trang chủ và các bài học. Chỉ thêm CSS đè lên — không đụng logic chấm bài.
 * Nạp ở <head> của đề (tránh nháy giao diện cũ); night-track.js cũng tự nạp file này nếu đề chưa có.
 * Chế độ Thi Thật (body.exam-mode) giữ nền trắng tối giản cho tập trung, chỉ đổi màu nhấn.
 */
(function () {
  if (window.__nightTestTheme) return;
  window.__nightTestTheme = true;
  try {
    if (!document.querySelector('link[data-nt-font]')) {
      var l = document.createElement('link');
      l.rel = 'stylesheet'; l.setAttribute('data-nt-font', '1');
      l.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap';
      document.head.appendChild(l);
    }
  } catch (e) {}
  var css = [
    /* ---- màu chung ---- */
    'html body{--nt-ink:#24242A;--nt-lilac:#6C70DC;--nt-lilac-l:#EDEEFD;--nt-peach:#FF9E5E;--nt-peach-l:#FFF1E7;--nt-panel:#F4F4F7;',
    '--bg-color:#B9BCF4;--panel-bg:#ffffff;--border-color:#24242A;--primary-button:#FF9E5E;--hover-bg:#EDEEFD;--text-color:#2b2b33}',
    'html body:not(.exam-mode){background-color:#B9BCF4!important;background-image:repeating-linear-gradient(118deg,rgba(255,255,255,.16) 0 140px,rgba(255,255,255,0) 140px 320px),linear-gradient(160deg,#CDD0FA 0%,#A7AAF0 60%,#9599EA 100%)!important;background-size:auto!important}',
    'html body.exam-mode{--bg-color:#F4F4F7;--panel-bg:#ffffff;--border-color:#24242A;--primary-button:#6C70DC;--hover-bg:#EDEEFD;background:#F4F4F7!important}',
    'html body{font-family:"Plus Jakarta Sans","Inter",system-ui,sans-serif}',
    /* ---- thanh trên cùng: khung tối dạng viên thuốc ---- */
    'html body .header{background:var(--nt-ink)!important;border:0!important;border-radius:28px!important;box-shadow:0 18px 40px -18px rgba(36,36,42,.6)!important;color:#fff;padding:8px 12px!important;gap:10px;flex-wrap:nowrap!important}',
    'html body .header-left{min-width:0;overflow-x:auto;scrollbar-width:none;gap:8px!important}html body .header-left::-webkit-scrollbar{display:none}',
    'html body .header-right{flex:none;gap:8px!important}html body .header button,html body .header .q-circle{white-space:nowrap;flex:none}',
    'html body .question-nav{flex-wrap:nowrap!important}',
    'html body .header .nav-btn{background:rgba(255,255,255,.1)!important;border:0!important;color:#fff!important;border-radius:999px!important;padding:8px 14px!important;font-weight:800!important;font-size:13px!important;transition:background .2s}',
    'html body .header .nav-btn:hover{background:rgba(255,255,255,.2)!important}',
    'html body .header .tab-btn{background:rgba(255,255,255,.1)!important;border:0!important;color:rgba(255,255,255,.7)!important;border-radius:999px!important;padding:8px 14px!important;font-weight:800!important;min-width:0}',
    'html body .header .tab-btn.active{background:#fff!important;color:var(--nt-ink)!important}',
    'html body .part-indicator{background:var(--nt-lilac)!important;color:#fff!important;border-radius:999px!important;padding:7px 14px!important;font-weight:800!important;font-size:13px}',
    'html body .header .q-circle{background:rgba(255,255,255,.1)!important;border:0!important;color:rgba(255,255,255,.75)!important;width:28px;height:28px;font-weight:800}',
    'html body .header .q-circle:hover{background:rgba(255,255,255,.22)!important;color:#fff!important}',
    'html body .header .q-circle.answered{background:var(--nt-peach)!important;color:#fff!important}',
    'html body .header .q-circle.current,html body .header .q-circle.active{box-shadow:0 0 0 2px #fff}',
    'html body .header .timer{background:rgba(255,255,255,.1)!important;border:0!important;color:#fff!important;border-radius:999px!important;padding:8px 14px!important}',
    'html body .header .submit-btn{background:var(--nt-peach)!important;border:0!important;color:#fff!important;border-radius:999px!important;padding:10px 20px!important;font-weight:800!important;box-shadow:0 0 0 3px rgba(255,158,94,.25)}',
    'html body.exam-mode .header .submit-btn{background:var(--nt-lilac)!important;box-shadow:0 0 0 3px rgba(108,112,220,.3)}',
    'html body .header .exam-live-badge{border-radius:999px}',
    /* ---- 2 khung bài đọc / câu hỏi ---- */
    'html body .panel{background:#fff!important;border:0!important;border-radius:30px!important;box-shadow:0 20px 44px -22px rgba(36,36,42,.45)!important}',
    'html body .panel-resizer::after{background:rgba(255,255,255,.7)!important;width:6px}',
    'html body.exam-mode .panel-resizer::after{background:rgba(36,36,42,.2)!important}',
    'html body .passage-text h2{color:var(--nt-ink);letter-spacing:-.01em}',
    'html body .question-group{background:var(--nt-panel)!important;border:0!important;border-radius:24px!important}',
    'html body .question-group h3,html body .question-group h4{color:var(--nt-ink)}',
    'html body .instruction{background:#fff!important;border-left:4px solid var(--nt-lilac)!important;border-radius:14px!important;color:#475569!important}',
    'html body .q-num{background:var(--nt-ink)!important;border:0!important;color:#fff!important;font-weight:800!important}',
    'html body .radio-label{border-radius:12px!important;transition:background .15s}',
    'html body .radio-label:hover{background:var(--nt-lilac-l)!important}',
    'html body input[type=radio],html body input[type=checkbox]{accent-color:var(--nt-lilac)}',
    'html body .text-input{border:1.5px solid #dfe1ea!important;border-bottom:2px solid var(--nt-lilac)!important;background:#fff!important;border-radius:10px!important}',
    'html body .text-input:focus{border-color:var(--nt-lilac)!important;box-shadow:0 0 0 3px rgba(108,112,220,.18)}',
    'html body .inline-blank::placeholder{color:var(--nt-lilac)!important}',
    'html body select.lettered-select,html body select.inline-select{border:1.5px solid #dfe1ea;border-radius:10px;background:#fff;padding:4px 8px}',
    'html body .match-bank{background:#fff!important;border:2px dashed #d5d7f5!important;border-radius:18px!important}',
    'html body .match-chip{border:2px solid var(--nt-lilac)!important;border-radius:999px!important;box-shadow:none!important;color:var(--nt-ink)}',
    'html body .match-slot{border-radius:12px!important}',
    'html body .feedback-box{border-radius:16px!important}',
    'html body .explanation-highlight{background-color:#FFE7A3!important;border-bottom-color:var(--nt-peach)!important}',
    'html body .group-image{border-radius:16px!important;border:0!important}',
    /* nút nhỏ trong khung câu hỏi: chấm riêng, nghe lại, check */
    'html body .part-grade-btn,html body .replay-section-btn,html body .inline-check-btn,html body .check-btn{border:0!important;border-radius:999px!important;background:var(--nt-ink)!important;color:#fff!important;font-weight:800!important;padding:7px 14px!important}',
    'html body .inline-check-btn{padding:4px 9px!important}',
    'html body .replay-section-btn{background:var(--nt-lilac-l)!important;color:var(--nt-lilac)!important}',
    'html body .part-grade-btn:hover,html body .check-btn:hover{background:var(--nt-lilac)!important}',
    /* ---- Listening: thanh audio ---- */
    'html body .global-audio-bar{border:0!important;border-radius:24px!important;background:#fff!important;box-shadow:0 14px 32px -18px rgba(36,36,42,.45)!important}',
    'html body .audio-playpause{background:var(--nt-lilac)!important;border:0!important;color:#fff!important;box-shadow:0 0 0 4px rgba(108,112,220,.2)!important}',
    'html body .transport-btn{border:0!important;background:var(--nt-panel)!important;border-radius:999px!important;font-weight:800!important;color:var(--nt-ink)!important}',
    'html body .transport-btn:hover{background:var(--nt-lilac-l)!important}',
    'html body .section-quick-jump button{border:0!important;background:var(--nt-panel)!important;color:var(--nt-ink)!important;border-radius:999px!important;padding:5px 12px!important;font-weight:800!important}',
    'html body .section-quick-jump button:hover{background:var(--nt-lilac-l)!important}',
    'html body .section-quick-jump button.current-playing{background:var(--nt-ink)!important;color:#fff!important}',
    'html body .wave-zoom button{border:0!important;background:var(--nt-panel)!important;border-radius:999px!important;padding:2px 9px!important}',
    'html body .section-block{border-radius:24px}',
    'html body .global-audio-bar{top:calc(var(--nt-hh,52px) + 18px)!important;margin-top:0!important;box-shadow:0 16px 36px -14px rgba(36,36,42,.45)!important}',
    'html body .global-audio-bar{top:calc(var(--nt-hh,52px) + 8px)!important;padding:5px 10px!important;margin:6px 0!important;border-radius:16px!important}',
    'html body .global-audio-bar .audio-controls{gap:3px!important}',
    'html body .global-audio-bar .audio-player-head{margin:0!important;gap:6px!important}',
    'html body .global-audio-bar .audio-player-title{font-size:12px!important}',
    'html body .global-audio-bar .audio-time{font-size:11px!important}',
    'html body .global-audio-bar .audio-playpause{width:26px!important;height:26px!important;font-size:11px!important;box-shadow:0 0 0 2px rgba(108,112,220,.2)!important}',
    'html body .global-audio-bar .transport-btn{padding:2px 7px!important;font-size:10.5px!important;line-height:1.3!important}',
    'html body .global-audio-bar .audio-transport{gap:3px!important;margin:0!important}',
    'html body .global-audio-bar .wave-zoom button{padding:0 7px!important;font-size:10.5px!important}',
    'html body .global-audio-bar select{font-size:10.5px!important;padding:1px 3px!important}',
    'html body .global-audio-bar .section-quick-jump button{padding:2px 9px!important;font-size:11px!important}',
    'html body .global-audio-bar .wave-scroll{padding:0!important}',
    'html body .global-audio-bar .wave-scroll canvas{height:26px!important}',
    /* ---- Cửa sổ chọn chế độ / kết quả ---- */
    'html body .overlay{background:rgba(36,36,42,.55)!important;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}',
    'html body .modal-box{background:#fff!important;border:0!important;border-radius:36px!important;box-shadow:0 30px 80px -20px rgba(0,0,0,.5)!important;padding:36px 32px!important;position:relative;overflow:hidden}',
    'html body .modal-box:before{content:"";position:absolute;right:-70px;top:-90px;width:240px;height:240px;border-radius:999px;background:var(--nt-lilac-l);z-index:0}',
    'html body .modal-box>*{position:relative;z-index:1}',
    'html body .modal-box h1,html body .modal-box h2{color:var(--nt-ink);letter-spacing:-.02em;font-weight:800}',
    'html body .mode-btn{border:2px solid #E6E7F0!important;border-radius:26px!important;background:var(--nt-panel)!important;padding:22px 18px!important;transition:transform .15s,border-color .15s}',
    'html body .mode-btn:hover{transform:translateY(-2px);border-color:var(--nt-lilac)!important}',
    'html body .mode-btn h3{color:var(--nt-ink);font-weight:800}',
    'html body .mode-btn.selected{background:var(--nt-lilac)!important;border-color:var(--nt-lilac)!important;box-shadow:0 14px 30px -14px rgba(108,112,220,.7)}',
    'html body .mode-btn.selected h3,html body .mode-btn.selected p{color:#fff!important}',
    'html body .modal-box .submit-btn{background:var(--nt-ink)!important;border:0!important;color:#fff!important;border-radius:999px!important;padding:14px 34px!important;font-weight:800!important;font-size:17px!important;box-shadow:0 0 0 5px rgba(36,36,42,.12)}',
    'html body .modal-box .submit-btn:hover{background:var(--nt-lilac)!important}',
    'html body .modal-box select{border:1.5px solid #dfe1ea;border-radius:12px;padding:8px 12px;background:#fff;font-family:inherit;font-weight:600}',
    'html body .score-display{color:var(--nt-ink)!important;font-weight:900!important;letter-spacing:-.03em}',
    'html body .band-display{color:var(--nt-peach)!important}',
    /* ---- popup dịch / thanh tô màu ---- */
    'html body #annot-toolbar{border-radius:999px!important}',
    'html body .trans-header{border-radius:14px 14px 0 0}',
    /* ---- điện thoại ---- */
    'html body .part-indicator{white-space:nowrap;flex:none}',
    '@media (max-width:900px){html body .header{flex-wrap:wrap!important;row-gap:8px}html body .header-left,html body .header-right{width:100%;overflow-x:auto;scrollbar-width:none;flex-wrap:nowrap!important}html body .header-right{justify-content:flex-start}html body .header-right::-webkit-scrollbar{display:none}}',
    '@media (max-width:760px){html body{height:auto!important;min-height:100vh;padding:10px!important}html body .main-container:has(.panel-resizer){flex-direction:column!important;gap:12px!important}html body .main-container:has(.panel-resizer)>.panel{min-width:0!important;height:78vh;flex:none!important}html body .panel{min-width:0!important}html body .panel-resizer{display:none!important}html body .panel-content{padding:18px!important}html body .passage-text{font-size:16px}html body .passage-text h2{font-size:22px}html body .mode-select{flex-direction:column;align-items:stretch}html body .mode-btn{min-width:0!important;width:auto!important;max-width:none!important}}',
    '@media (max-width:760px){html body .header{border-radius:22px!important;padding:8px!important}html body .panel{border-radius:22px!important}html body .modal-box{border-radius:28px!important;padding:26px 18px!important}html body .mode-btn{border-radius:20px!important}}'
  ].join('\n');
  var st = document.createElement('style');
  st.id = 'nt-theme';
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);
  // đặt khối CSS này SAU cùng để thắng CSS gốc của đề (kể cả <style> nằm sau thẻ script)
  // chiều cao thật của thanh trên cùng (đổi theo màn hình) → thanh audio Listening bám ngay bên dưới khi cuộn
  function syncHeader() { try { var hd = document.querySelector('.header'); if (hd) document.documentElement.style.setProperty('--nt-hh', hd.offsetHeight + 'px'); } catch (e) {} }
  window.addEventListener('resize', syncHeader);
  window.addEventListener('load', syncHeader);
  setTimeout(syncHeader, 1500);
  function last() { try { if (st.parentNode && st !== st.parentNode.lastElementChild) st.parentNode.appendChild(st); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { last(); syncHeader(); }); else { last(); syncHeader(); }
})();

/* Nộp đề Reading / Listening → màn hình ăn mừng + chuỗi học + huy hiệu (night-fame.js) */
(function () {
  if (window.__nightFameHook) return; window.__nightFameHook = true;
  var src; try { src = new URL('../../night-fame.js?v=20261028d', document.currentScript ? document.currentScript.src : location.href).href; } catch (e) { src = '/night-fame.js'; }
  function wrapSave() {
    var orig = window.saveProgressRecord;
    if (typeof orig !== 'function' || orig.__fame) return;
    var w = function (score, total, band) {
      var r = orig.apply(this, arguments);
      try {
        var kind = /\/listening\//.test(location.pathname) ? 'listening' : 'reading';
        var title = (document.title || '').replace(/\s*[-|·].*Night.*$/i, '') || kind;
        var fire = function () { window.NightFame && window.NightFame.event({ kind: kind, id: 'ts_' + location.pathname + '_' + score + '_' + Math.floor(Date.now() / 60000), title: title, score: Number(score), total: Number(total), band: parseFloat(band) || 0 }); };
        if (window.NightFame) fire(); else { var sc = document.createElement('script'); sc.src = src; sc.onload = fire; document.head.appendChild(sc); }
      } catch (e) {}
      return r;
    };
    w.__fame = true; window.saveProgressRecord = w;
  }
  window.addEventListener('load', function () { wrapSave(); setTimeout(wrapSave, 2500); });
})();

/* Reading: chế độ "Giải đề" của thầy (reading-solver.js tự kiểm tra admin, người khác không thấy gì) */
(function () {
  if (window.__nightSolverHook || !/\/reading\//.test(location.pathname)) return; window.__nightSolverHook = true;
  var src; try { src = new URL('reading-solver.js?v=20261104a', document.currentScript ? document.currentScript.src : location.href).href; } catch (e) { src = '/reading-solver.js'; }
  var add = function () { var s = document.createElement('script'); s.src = src; document.head.appendChild(s); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();

/* Listening: chế độ "Giải đề cùng thầy" (listening-solver.js tự kiểm tra admin, người khác không thấy gì) */
(function () {
  if (window.__nightLSolverHook || !/\/listening\//.test(location.pathname)) return; window.__nightLSolverHook = true;
  var src; try { src = new URL('listening-solver.js?v=20261106c', document.currentScript ? document.currentScript.src : location.href).href; } catch (e) { src = '/listening-solver.js'; }
  var add = function () { var s = document.createElement('script'); s.src = src; document.head.appendChild(s); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();

/* Web app: mở trang trong cùng cửa sổ + nút quay lại (night-app.js) — cho cả các đề tạo mới sau này */
(function () {
  if (window.__nightApp || document.querySelector('script[src*="night-app.js"]')) return;
  var s = document.createElement('script'); s.src = '/night-app.js'; s.defer = true; (document.head || document.documentElement).appendChild(s);
})();

/* Reading / Listening: "In đề" cho giáo viên (test-print.js tự kiểm tra admin) */
(function () {
  if (window.__nightPrintHook || !/\/(reading|listening)\//.test(location.pathname)) return; window.__nightPrintHook = true;
  var src; try { src = new URL('test-print.js?v=' + Math.floor(Date.now() / 300000), document.currentScript ? document.currentScript.src : location.href).href; } catch (e) { src = '/test-print.js'; }
  var add = function () { var s = document.createElement('script'); s.src = src; document.head.appendChild(s); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();

/* Reading / Listening: chỉ bấm ĐÚNG ô tròn/ô vuông mới chọn đáp án; bôi đen / highlight / ghi chú chữ trong đáp án thoải mái.
   Và chữ của đáp án luôn nằm trong 1 khối <span> duy nhất để highlight không làm vỡ dòng (trước đây mỗi đoạn highlight thành 1 cột flex). */
(function () {
  if (window.__nightOptClick) return; window.__nightOptClick = true;
  try {
    var st = document.createElement('style');
    st.textContent = 'html body label.radio-label{cursor:default}html body label.radio-label>input{flex:none;cursor:pointer;width:18px;height:18px;margin:0}'
      + 'html body label.radio-label>.rl-text{flex:1 1 auto;min-width:0;display:block;cursor:text;user-select:text;-webkit-user-select:text}';
    (document.head || document.documentElement).appendChild(st);
  } catch (e) {}
  function wrap(label) {
    if (label.__rlDone) return; label.__rlDone = true;
    var kids = Array.prototype.slice.call(label.childNodes), span = null;
    kids.forEach(function (n) {
      if (n.nodeType === 1 && n.tagName === 'INPUT') return;
      if (n.nodeType === 3 && !n.nodeValue.trim() && !span) return;
      if (!span) { span = document.createElement('span'); span.className = 'rl-text'; label.insertBefore(span, n); }
      span.appendChild(n);
    });
  }
  function scan(root) { (root.querySelectorAll ? root : document).querySelectorAll('label.radio-label').forEach(wrap); }
  function start() {
    scan(document);
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { if (n.matches && n.matches('label.radio-label')) wrap(n); else scan(n); } }); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  /* click vào chữ (không phải ô chọn) thì không chuyển thành click vào ô chọn */
  document.addEventListener('click', function (e) {
    var t = e.target, lb = t && t.closest ? t.closest('label.radio-label') : null;
    if (lb && !(t.tagName === 'INPUT')) e.preventDefault();
  }, true);
})();

/* Reading / Listening: giao diện "tờ đề giấy" giống bản In đề (nền xám nhạt, tờ trắng, màu nhấn theo kỹ năng,
   khung viền mảnh, số câu dạng viên thuốc, chỗ trống gạch chân, chữ bài đọc kiểu sách). Chỉ CSS, không đụng logic chấm. */
(function () {
  if (window.__nightPaperUI) return; window.__nightPaperUI = true;
  var L = /\/listening\//.test(location.pathname), C = L ? '#0d9488' : '#6d5dfc', C2 = L ? '#e3f6f3' : '#efecff';
  var css = [
    'html body{--nt-lilac:' + C + ';--nt-lilac-l:' + C2 + ';--nt-ink:#1d2140;--nt-panel:#fff;--pp-c:' + C + ';--pp-c2:' + C2 + ';--pp-line:#c9cbe0;--pp-ink2:#5b6080;--text-color:#1d2140;--primary-button:' + C + '}',
    'html body .header{background:#1d2140!important}',
    'html body .header .submit-btn,html body.exam-mode .header .submit-btn{background:' + C + '!important;box-shadow:0 0 0 3px ' + C2 + '!important}',
    'html body .header .q-circle.answered{background:' + C + '!important}',
    'html body .part-indicator{background:' + C + '!important}',
    'html body .panel{background:#fff!important;border-radius:18px!important;box-shadow:0 4px 20px rgba(29,33,64,.12)!important}',
    /* bài đọc / transcript: chữ kiểu sách như bản in */
    'html body .passage-text{font-family:Georgia,"Times New Roman",serif!important;font-size:17px!important;line-height:1.7!important;color:#1d2140}',
    'html body .passage-text h2,html body .passage-text h3{font-family:"Plus Jakarta Sans",system-ui,sans-serif;font-weight:800;color:#1d2140}',
    /* khối câu hỏi */
    'html body .question-group{background:#fff!important;border:1.3px solid var(--pp-line)!important;border-radius:14px!important;padding:18px 20px!important}',
    'html body .question-group>h3{font-weight:800;color:' + C + ';font-size:16px;letter-spacing:.01em;border-bottom:2.5px solid ' + C + ';padding-bottom:6px;margin-bottom:10px}',
    'html body .instruction{background:transparent!important;border-left:3px solid ' + C2 + '!important;border-radius:0!important;color:var(--pp-ink2)!important;font-style:italic;padding:2px 0 2px 12px!important}',
    'html body .q-num{background:' + C + '!important;color:#fff!important;border:0!important;border-radius:999px!important;min-width:26px;width:auto;height:26px;padding:0 7px;font-weight:800;font-size:13px}',
    'html body .question-item{padding:6px 0}',
    /* đáp án: dòng thoáng, hover nhẹ như phiếu in */
    'html body label.radio-label{border-radius:8px!important;padding:4px 8px!important}',
    'html body label.radio-label:hover{background:' + C2 + '!important}',
    'html body input[type=radio],html body input[type=checkbox]{accent-color:' + C + '}',
    /* chỗ trống: chỉ gạch chân */
    'html body .text-input{border:0!important;border-bottom:1.5px solid #6f7499!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}',
    'html body .text-input:focus{border-bottom-color:' + C + '!important;background:' + C2 + '!important;box-shadow:none!important}',
    'html body .inline-blank::placeholder{color:' + C + '!important;font-weight:800}',
    'html body .inline-summary.notes-template,html body .notes-template{border:1.3px solid var(--pp-line);border-radius:12px;padding:12px 18px;background:#fff}',
    'html body table th,html body .question-group table th{background:' + C2 + '!important}',
    'html body table td,html body table th{border-color:var(--pp-line)}',
    'html body select.lettered-select,html body select.inline-select{border:1.3px solid var(--pp-line);border-radius:8px}',
    'html body .match-bank{background:' + C2 + '!important;border:1.3px dashed ' + C + '!important}',
    'html body .match-chip{border:1.5px solid ' + C + '!important;color:' + C + '!important}',
    /* hình Irasutoya giống bản In đề: đầu mỗi Section / Passage */
    'html body .section-header-row h2::before{content:"";display:inline-block;width:40px;height:40px;margin-right:8px;vertical-align:middle;background:url(https://nightielts.id.vn/khoahoc/img/ira/music_earphone_canal_2571.webp) center/contain no-repeat}',
    'html body .passage-text .content-wrapper>p:first-child[style*="#666"]::after{content:"";float:right;width:64px;height:64px;margin:-6px 0 0 10px;background:url(https://nightielts.id.vn/khoahoc/img/ira/study_night_boy_0934.webp) center/contain no-repeat}',
    'html body .question-group:last-child::after{content:"";display:block;width:56px;height:56px;margin:10px 0 0 auto;background:url(https://nightielts.id.vn/khoahoc/img/ira/trophy_school_boy.webp) center/contain no-repeat}',
    'html body .feedback-box{border-radius:10px}'
  ].join('\n');
  try { var st = document.createElement('style'); st.setAttribute('data-nt-paper', '1'); st.textContent = css; (document.head || document.documentElement).appendChild(st); } catch (e) {}
})();

/* Reading / Listening: nút "🎀 Giảng vocab" (vocab-teach.js) cho MỌI đề — kể cả đề dựng bằng dây chuyền mới chưa gắn sẵn thẻ script */
(function () {
  if (window.__nightVocabHook || !/\/(reading|listening)\//.test(location.pathname)) return; window.__nightVocabHook = true;
  var add = function () {
    if (window.NightVocabTeach || document.querySelector('script[src*="vocab-teach.js"]')) return;
    var src; try { src = new URL('vocab-teach.js', document.currentScript ? document.currentScript.src : 'https://nightielts.id.vn/test-theme.js').href; } catch (e) { src = 'https://nightielts.id.vn/vocab-teach.js'; }
    var s = document.createElement('script'); s.src = src; s.defer = true; document.head.appendChild(s);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();

/* Night IELTS: giọng đọc tốt hơn cho mọi nút loa (iPad/iPhone hay chọn giọng nén rất dở) */
(function () {
  try {
    if (window.__nightTTS || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    window.__nightTTS = 1;
    var BAD = /compact|espeak|fred|albert|zarvox|bad news|bells|bubbles|cellos|jester|organ|trinoids|whisper|wobble|boing|good news|superstar|junior|ralph|kathy|bahh|grandma|grandpa|rocko|shelley|sandy|eddy|flo|reed/i;
    function best(lang) {
      var vs = speechSynthesis.getVoices() || [], base = String(lang || 'en').slice(0, 2).toLowerCase(), top = -1e9, pick = null;
      vs.forEach(function (v) {
        var l = String(v.lang || '').replace('_', '-'), n = v.name || '', sc = 0;
        if (l.toLowerCase().indexOf(base) !== 0) return;
        if (l === lang) sc += 15; else if (base === 'en' && /GB|US/.test(l)) sc += 8;
        if (/natural|neural/i.test(n)) sc += 120;
        if (/google/i.test(n)) sc += 80;
        if (/premium|enhanced|siri/i.test(n)) sc += 90;
        if (/online/i.test(n)) sc += 60;
        if (/daniel|karen|moira|arthur|martha|aaron|nicky|tessa|rishi|samantha|libby|sonia|ryan|serena|kate|ava|allison|jenny|aria|guy/i.test(n)) sc += 40;
        if (BAD.test(n)) sc -= 500;
        if (v.localService === false) sc += 5;
        if (sc > top) { top = sc; pick = v; }
      });
      return pick;
    }
    var orig = speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak = function (u) {
      try {
        var cur = u.voice, lang = u.lang || 'en-GB';
        if (!cur || BAD.test(cur.name || '')) { var v = best(lang); if (v) u.voice = v; }
        if (u.rate === 1 && /^en/i.test(lang)) u.rate = 0.92;
      } catch (e) {}
      return orig(u);
    };
    speechSynthesis.getVoices();
    speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', function () {});
  } catch (e) {}
})();

/* Floating toolbars (chọn chữ): giữ kích cỡ cố định khi zoom + tự căn vào vùng nhìn thấy (giống night-engine) */
(function () {
  try {
    var vv = window.visualViewport;
    if (!vv) return;
    var IDS = ['annot-toolbar', 'note-input-box', 'note-delete-box', 'trans-box'];
    function init(el) {
      var mine = null, busy = false, mo;
      function place() {
        if (busy) return;
        var cs = getComputedStyle(el);
        if (cs.display === 'none') return;
        var l = el.style.left, t = el.style.top;
        if (!mine || l !== mine.l || t !== mine.t) { mine = { ol: parseFloat(l) || 0, ot: parseFloat(t) || 0 }; }
        busy = true; mo.disconnect();
        var s = vv.scale || 1, pad = 8;
        el.style.transformOrigin = '0 0';
        el.style.transform = s > 1.01 || s < 0.99 ? 'scale(' + (1 / s) + ')' : '';
        el.style.maxWidth = Math.max(160, (vv.width - pad * 2) * s) + 'px';
        el.style.left = (vv.pageLeft + pad) + 'px';
        var w = el.offsetWidth / s, h = el.offsetHeight / s;
        var vl = vv.pageLeft, vt = vv.pageTop;
        var x = mine.ol, y = mine.ot;
        x = Math.max(vl + pad, Math.min(x, vl + vv.width - pad - w));
        y = Math.max(vt + pad, Math.min(y, vt + vv.height - pad - h));
        el.style.left = x + 'px'; el.style.top = y + 'px';
        mine.l = el.style.left; mine.t = el.style.top;
        busy = false; mo.observe(el, { attributes: true, attributeFilter: ['style'] });
      }
      mo = new MutationObserver(place);
      mo.observe(el, { attributes: true, attributeFilter: ['style'] });
      vv.addEventListener('resize', place);
      vv.addEventListener('scroll', place);
      place();
    }
    function go() { IDS.forEach(function (id) { var e = document.getElementById(id); if (e && !e.__vvf) { e.__vvf = 1; init(e); } }); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  } catch (e) {}
})();

(function(){try{if(window.__nightVoicePref)return;var s=document.createElement('script');s.src='/tts-pref.js?v=3';document.head.appendChild(s);}catch(e){}})();

/* Bắt buộc đăng nhập mới được làm đề Reading / Listening */
(function () {
  try {
    if (window.__nightTestGate || location.protocol === 'file:' || /^(localhost|127\.)/.test(location.hostname)) return;
    window.__nightTestGate = 1;
    var V = '10.8.1', CFG = { apiKey: 'AIzaSyCmeN49M4oI78ZPWDhMlbisDOLaMJp2mb8', authDomain: 'night-ielts-land.firebaseapp.com', projectId: 'night-ielts-land',
      storageBucket: 'night-ielts-land.firebasestorage.app', messagingSenderId: '408519436407', appId: '1:408519436407:web:a9f0b9ba23368b54427e72' };
    var css = '#nt-gate{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:16px;background:linear-gradient(160deg,#ECEBFB,#F7F3FF 45%,#FFF4EC);font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:#24242A}' +
      '#nt-gate .bx{width:100%;max-width:400px;background:#24242A;border-radius:30px;padding:10px;box-shadow:0 30px 60px -30px rgba(36,36,42,.5)}#nt-gate .in{background:#fff;border-radius:22px;padding:28px 24px;text-align:center}' +
      '#nt-gate img{width:64px;height:64px;border-radius:18px}#nt-gate h1{font-size:22px;font-weight:800;margin:14px 0 6px}#nt-gate p{font-size:14px;line-height:1.55;color:#6B6B78;margin:0 0 20px}' +
      '#nt-gate button{display:inline-flex;align-items:center;gap:10px;border:0;cursor:pointer;background:#24242A;color:#fff;font:800 15px inherit;font-family:inherit;padding:13px 22px;border-radius:999px}#nt-gate a{color:#6B6B78;font-size:13px}';
    function gate(o) {
      if (document.getElementById('nt-gate')) return;
      var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      var el = document.createElement('div'); el.id = 'nt-gate';
      el.innerHTML = '<div class="bx"><div class="in"><img src="/icons/icon-192.png" alt="" onerror="this.remove()">' +
        '<h1>Đăng nhập để làm đề</h1><p>Đề Reading &amp; Listening chỉ dành cho tài khoản Night IELTS. Đăng nhập miễn phí bằng Google hoặc email — bài làm và từ vựng sẽ được lưu lại.</p>' +
        '<button type="button" id="nt-login">Đăng nhập</button><p style="margin:16px 0 0"><a href="/index.html">← Về trang chủ</a></p></div></div>';
      document.body.appendChild(el);
      try { document.documentElement.style.overflow = 'hidden'; } catch (e) {}
      document.getElementById('nt-login').onclick = function () {
        var go = function () { NightLogin.open({ auth: o.auth, authM: o.A, title: 'Đăng nhập để làm đề', note: 'Chọn Google hoặc nhận link đăng nhập qua email bất kỳ.' }); };
        if (window.NightLogin) return go();
        var s = document.createElement('script'); s.src = '/night-login.js?v=20261113a'; s.onload = go; document.head.appendChild(s);
      };
    }
    function ungate() { var el = document.getElementById('nt-gate'); if (el) { el.remove(); try { document.documentElement.style.overflow = ''; } catch (e) {} } }
    Promise.all([import('https://www.gstatic.com/firebasejs/' + V + '/firebase-app.js'), import('https://www.gstatic.com/firebasejs/' + V + '/firebase-auth.js')]).then(function (m) {
      var app; try { app = m[0].getApp(); } catch (e) { app = m[0].initializeApp(CFG); }
      var o = { auth: m[1].getAuth(app), A: m[1] };
      var run = function () {
        o.A.onAuthStateChanged(o.auth, function (u) {
          if (u) ungate();
          else if (document.body) gate(o); else document.addEventListener('DOMContentLoaded', function () { gate(o); });
        });
      };
      if (/[?&]oobCode=/.test(location.search)) {
        var s = document.createElement('script'); s.src = '/night-login.js?v=20261113a';
        s.onload = function () { NightLogin.complete(o.auth, o.A).then(run, run); }; document.head.appendChild(s);
      } else run();
    }).catch(function () {});
  } catch (e) {}
})();

/* ===== Listening: sóng âm kiểu phần mềm dựng âm thanh (vẽ đè hàm của trang đề) =====
   - Vạch đỏ ĐỨNG YÊN ở giữa; sóng âm chạy qua nó khi phát.
   - Kéo sóng âm sang trái/phải để tua; bấm/chạm vào 1 đoạn -> đoạn đó nhảy vào giữa (vạch đỏ) và phát từ đó.
   - Lướt 2 ngón ngang trên touchpad cũng tua; Ctrl/⌘ + cuộn (pinch) vẫn là zoom như cũ; nút − + giữ nguyên.
   - Nút ⤢ "Phóng dài": thanh sóng âm dài ra bằng thanh đen phía trên (cao giữ nguyên) để nhìn được đoạn dài hơn.
   - Mỗi 3px 1 vạch, nét theo màn hình Retina, đánh dấu S2–S4 vẽ thẳng lên sóng. */
(function () {
  var WIDE_KEY = 'nt-wave-wide';
  function install() {
    if (typeof window.redrawVisibleWaveSlice !== 'function' || typeof window.updatePlayhead !== 'function' || window.__nvWave2) return false;
    var wrap = document.getElementById('wave-scroll'), canvas = document.getElementById('wave-canvas');
    if (!wrap || !canvas) return false;
    window.__nvWave2 = true;
    var H = 40, PLAYED = '#6C70DC', REST = '#C3C5E8', MARK = '#FF9E5E';
    var st = document.createElement('style');
    st.textContent = [
      'html body .wave-scroll{overflow:hidden!important;background:#F4F4F7!important;border:0!important;border-radius:12px!important;padding:3px 0!important;cursor:grab!important;touch-action:pan-y!important;user-select:none;-webkit-user-select:none;position:relative}',
      'html body .wave-scroll.nv-drag{cursor:grabbing!important}',
      'html body .wave-scroll canvas,html body .global-audio-bar .wave-scroll canvas{position:static!important;height:' + H + 'px!important;width:100%!important}',
      'html body .wave-scroll #wave-spacer,html body .wave-scroll .wave-marker-line,html body .wave-scroll .wave-marker-label{display:none!important}',
      'html body .wave-scroll .playhead{left:50%!important;top:0!important;bottom:0!important;height:auto!important;width:2px!important;margin-left:-1px;background:#E11D48!important;box-shadow:0 0 0 3px rgba(225,29,72,.15)}',
      'html body .wave-scroll .playhead:before{content:"";position:absolute;left:50%;top:-1px;transform:translateX(-50%);border:5px solid transparent;border-top-color:#E11D48}',
      'html body .nv-wide-btn{margin-left:4px}',
      /* Phóng dài: thanh sóng âm rộng bằng thanh đen trên cùng */
      'html body .nv-wide{width:var(--nv-wide-w)!important;max-width:none!important;margin-left:var(--nv-wide-ml)!important;margin-right:0!important;box-sizing:border-box!important}'
    ].join('\n');
    document.head.appendChild(st);

    var curT = function () { return (typeof audio !== 'undefined' && audio) ? (audio.currentTime || 0) : 0; };
    var dur = function () { return (typeof waveData !== 'undefined' && waveData && waveData.duration) || (audio && audio.duration) || 0; };
    var pps = function () { return (typeof wavePxPerSec !== 'undefined' && wavePxPerSec) || 45; };
    var fitCanvas = function () {
      var vw = Math.max(120, wrap.clientWidth || 600), dpr = Math.min(3, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(vw * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(vw * dpr); canvas.height = Math.round(H * dpr); }
      return { W: vw, dpr: dpr };
    };
    var dragT = null; /* thời điểm đang kéo tới (chưa thả) */
    function draw() {
      if (typeof waveData === 'undefined' || !waveData) return;
      var f = fitCanvas(), W = f.W, ctx = canvas.getContext('2d');
      ctx.setTransform(f.dpr, 0, 0, f.dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      var P = waveData.peaks, N = P.length, D = dur() || 1, px = pps();
      if (!waveData._max) { var m = 0; for (var i = 0; i < N; i++) if (P[i] > m) m = P[i]; waveData._max = m || 1; }
      var max = waveData._max, t = dragT != null ? dragT : curT();
      var t0 = t - (W / 2) / px; /* thời điểm ở mép trái */
      var pitch = 3, bw = 2, perSec = N / D;
      for (var x = 0; x < W; x += pitch) {
        var a0 = t0 + x / px, a1 = t0 + (x + pitch) / px;
        if (a1 < 0 || a0 > D) continue;
        var g0 = Math.max(0, a0) * perSec, g1 = Math.min(D, a1) * perSec, v = 0;
        if (g1 - g0 >= 1) { for (var k = Math.floor(g0); k < Math.ceil(g1) && k < N; k++) if (P[k] > v) v = P[k]; }
        else { var b = Math.floor(g0), fr = g0 - b; v = (P[b] || 0) * (1 - fr) + (P[b + 1] || 0) * fr; }
        var hgt = Math.max(2, Math.pow(v / max, 0.75) * (H - 6));
        ctx.fillStyle = a0 < t ? PLAYED : REST;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, (H - hgt) / 2, bw, hgt, 1); else ctx.rect(x, (H - hgt) / 2, bw, hgt);
        ctx.fill();
      }
      /* đánh dấu Section 2–4 */
      if (typeof markStart === 'function') {
        ctx.font = '700 10px "Plus Jakarta Sans",system-ui,sans-serif';
        for (var n = 2; n <= 4; n++) {
          var ms = markStart(n); if (!(ms > 0)) continue;
          var mx = (ms - t0) * px; if (mx < -20 || mx > W + 20) continue;
          ctx.fillStyle = MARK; ctx.fillRect(mx - 1, 0, 2, H);
          ctx.fillText('S' + n, mx + 4, 10);
        }
      }
    }
    window.drawWaveform = function () { draw(); };
    window.redrawVisibleWaveSlice = function () { draw(); };
    window.drawWaveMarkerLines = function () { wrap.querySelectorAll('.wave-marker-line,.wave-marker-label').forEach(function (e) { e.remove(); }); draw(); };
    window.updatePlayhead = function () { draw(); };
    /* chạy mượt khi đang phát (timeupdate chỉ ~4 lần/giây) */
    (function loop() { if (typeof audio !== 'undefined' && audio && !audio.paused) draw(); requestAnimationFrame(loop); })();

    var seek = function (sec) {
      if (typeof appMode !== 'undefined' && appMode !== 'practice') return;
      var D = dur(); if (!D) return;
      audio.currentTime = Math.max(0, Math.min(D - 0.05, sec));
      audio._boundEnd = null; /* tự tua -> bỏ giới hạn "nghe 1 section" như bản gốc */
      draw();
    };
    /* Kéo / bấm: chặn handler click cũ của trang (nó tính theo kiểu cuộn cũ) */
    wrap.parentElement.addEventListener('click', function (e) { if (wrap.contains(e.target)) { e.stopPropagation(); e.preventDefault(); } }, true);
    var dn = null;
    wrap.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dn = { x: e.clientX, y: e.clientY, t: curT(), moved: false, id: e.pointerId, type: e.pointerType };
    });
    window.addEventListener('pointermove', function (e) {
      if (!dn || e.pointerId !== dn.id) return;
      var dx = e.clientX - dn.x, dy = e.clientY - dn.y;
      if (!dn.moved) {
        if (Math.abs(dx) < 6) return;
        if (dn.type === 'touch' && Math.abs(dy) > Math.abs(dx)) { dn = null; return; } /* vuốt dọc = cuộn trang */
        dn.moved = true; wrap.classList.add('nv-drag'); try { wrap.setPointerCapture(e.pointerId); } catch (er) {}
      }
      dragT = Math.max(0, Math.min(dur(), dn.t - dx / pps()));
      draw();
    });
    var up = function (e) {
      if (!dn || e.pointerId !== dn.id) return;
      var d = dn; dn = null; wrap.classList.remove('nv-drag');
      if (d.moved) { var tt = dragT; dragT = null; seek(tt); return; }
      if (e.type === 'pointercancel') return;
      var r = wrap.getBoundingClientRect(), x = e.clientX - r.left;
      seek(curT() + (x - r.width / 2) / pps()); /* đoạn được bấm nhảy vào giữa */
    };
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    /* lướt ngang 2 ngón (touchpad) = tua; Ctrl/⌘ + cuộn để handler cũ zoom */
    var wheelAcc = 0, wheelT = 0;
    wrap.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.metaKey) return;
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
      if (!d) return;
      e.preventDefault();
      if (dragT == null) dragT = curT();
      dragT = Math.max(0, Math.min(dur(), dragT + d / pps()));
      draw();
      clearTimeout(wheelT); wheelT = setTimeout(function () { var tt = dragT; dragT = null; seek(tt); }, 160);
    }, { passive: false });

    /* Nút Phóng dài / Thu gọn */
    var zoomPlus = document.querySelector('button[onclick="zoomWave(1)"]');
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'nv-wide-btn';
    if (zoomPlus) { btn.className += ' ' + zoomPlus.className; zoomPlus.insertAdjacentElement('afterend', btn); }
    else wrap.insertAdjacentElement('beforebegin', btn);
    /* phóng dài CẢ thanh audio (tiêu đề, nút, sóng âm, Section…), cỡ các nút giữ nguyên */
    var box = wrap.closest('.global-audio-bar') || wrap.closest('.audio-player') || wrap.parentElement;
    var setWide = function (on) {
      box.classList.toggle('nv-wide', on);
      btn.textContent = on ? '⤡' : '⤢';
      btn.title = on ? 'Thu gọn thanh sóng âm' : 'Phóng dài thanh sóng âm (bằng thanh trên cùng)';
      if (on) {
        var top = document.querySelector('.header, header, .top-nav, nav') , tr = top ? top.getBoundingClientRect() : { left: 16, width: innerWidth - 32 };
        box.classList.remove('nv-wide');
        var wr = box.getBoundingClientRect(), ml = parseFloat(getComputedStyle(box).marginLeft) || 0;
        box.style.setProperty('--nv-wide-w', Math.round(tr.width) + 'px');
        box.style.setProperty('--nv-wide-ml', Math.round(tr.left - (wr.left - ml)) + 'px');
        box.classList.add('nv-wide');
      }
      try { localStorage.setItem(WIDE_KEY, on ? '1' : ''); } catch (e) {}
      setTimeout(draw, 0);
    };
    btn.onclick = function () { setWide(!box.classList.contains('nv-wide')); };
    var wideOn = false; try { wideOn = localStorage.getItem(WIDE_KEY) === '1'; } catch (e) {}
    setWide(wideOn);
    window.addEventListener('resize', function () { if (box.classList.contains('nv-wide')) setWide(true); else draw(); });
    if (window.ResizeObserver) new ResizeObserver(function () { draw(); }).observe(wrap);
    draw();
    return true;
  }
  if (!install()) { var n = 0, t = setInterval(function () { if (install() || ++n > 80) clearInterval(t); }, 250); }
})();

/* ===== Bút vẽ giống bài học (nút ✏️ + thanh màu, chỉ Apple Pencil vẽ, chống tì tay) trên trang đề Reading / Listening =====
   Bấm ✏️ lần đầu mới tải React + engine, rồi bật bút luôn (không làm trang đề nặng thêm khi không dùng). Phím D bật/tắt, Z hoàn tác. */
(function () {
  if (!/\/(reading|listening)\//.test(location.pathname) || window.__nvPen) return;
  window.__nvPen = true;
  var base; try { base = new URL('./', document.currentScript ? document.currentScript.src : 'https://nightielts.id.vn/test-theme.js').href; } catch (e) { base = '/'; }
  function load(src) { return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); }); }
  var busy = false;
  function start(b) {
    if (busy) return; busy = true;
    if (b) { b.textContent = '⏳'; b.disabled = true; }
    var chain = Promise.resolve();
    if (!window.React) chain = chain.then(function () { return load('https://unpkg.com/react@18.3.1/umd/react.production.min.js'); });
    if (!window.ReactDOM) chain = chain.then(function () { return load('https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js'); });
    chain.then(function () { return window.NightLesson && window.NightLesson.mountPen ? null : load(base + 'khoahoc/night-engine.js?v=20261110p'); })
      .then(function () {
        /* đề có 2 khung cuộn riêng (bài đọc | câu hỏi): chỉ vẽ trong vùng trắng, nét đi theo cuộn của từng khung, mỗi Passage/Part giữ nét riêng */
        if (document.querySelector('.panel-content')) {
          window.NV_PEN_PANES = '.panel-content';
          window.NV_PEN_PART = function () { try { return typeof currentPassage !== 'undefined' ? 'p' + currentPassage : typeof currentSection !== 'undefined' ? 's' + currentSection : ''; } catch (e) { return ''; } };
        }
        window.NightLesson.mountPen();
        if (b) b.remove();
        var tries = 0, t = setInterval(function () { /* bật bút ngay */
          var pen = document.querySelector('#nv-notes-root [aria-label="Bật bút vẽ"]');
          if (pen) { clearInterval(t); pen.click(); } else if (++tries > 40) clearInterval(t);
        }, 100);
      })
      .catch(function () { busy = false; if (b) { b.textContent = '✏️'; b.disabled = false; } alert('Chưa tải được bút vẽ, kiểm tra mạng rồi thử lại nhé.'); });
  }
  function boot() {
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'nv-pen-boot'; b.title = 'Bút vẽ (D)'; b.setAttribute('aria-label', 'Bật bút vẽ');
    b.textContent = '✏️';
    b.style.cssText = 'position:fixed;left:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:2147482001;width:48px;height:48px;border-radius:999px;border:0;background:#fff;color:#6C70DC;font-size:20px;cursor:pointer;box-shadow:0 10px 28px -8px rgba(108,112,220,.6);display:flex;align-items:center;justify-content:center';
    b.onclick = function () { start(b); };
    b.setAttribute('data-nv-nopin', '1');
    document.body.appendChild(b);
    /* zoom: nút vẫn ở góc trái dưới phần đang nhìn, đúng cỡ */
    var vv = window.visualViewport;
    if (vv) {
      var place = function () {
        if (!b.isConnected) return;
        var sc = vv.scale || 1;
        if (Math.abs(sc - 1) < 0.01) { b.style.transform = ''; b.style.top = ''; b.style.bottom = 'calc(16px + env(safe-area-inset-bottom))'; b.style.left = '16px'; return; }
        b.style.bottom = 'auto'; b.style.top = '0px'; b.style.left = '0px'; b.style.transformOrigin = '0 0';
        b.style.transform = 'translate(' + (vv.offsetLeft + 16 / sc) + 'px,' + (vv.offsetTop + vv.height - 64 / sc) + 'px) scale(' + (1 / sc) + ')';
      };
      vv.addEventListener('resize', place); vv.addEventListener('scroll', place); window.addEventListener('scroll', place, { passive: true });
    }
    window.addEventListener('keydown', function k(e) {
      var el = document.activeElement;
      if ((e.key === 'd' || e.key === 'D') && !e.metaKey && !e.ctrlKey && !(el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) && document.getElementById('nv-pen-boot')) {
        e.preventDefault(); window.removeEventListener('keydown', k); start(document.getElementById('nv-pen-boot'));
      }
    });
  }
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);
})();

/* ===== Lịch sử bài làm: mỗi lần NỘP BÀI lưu 1 bản gọn lên Firestore (testAttempts) =====
   Chỉ lưu câu trả lời + điểm (~0,5–1 KB/lần). Đề + đáp án đúng đã nằm sẵn trong file đề.
   - User thường: tự hết hạn sau 30 ngày (expiresAt — bật TTL trong Firebase để tự xoá).
   - Học sinh / Pro / Astra / thầy: giữ mãi (lần làm lúc đang có gói vẫn giữ kể cả khi gói hết).
   Xem lại: mở <đề>?review=<mã> -> tự điền lại câu trả lời và chấm, KHÔNG lưu thêm. */
(function () {
  if (!/\/(reading|listening)\//.test(location.pathname) || window.__nvHist) return;
  window.__nvHist = true;
  var V = '10.8.1', CFG = { apiKey: 'AIzaSyCmeN49M4oI78ZPWDhMlbisDOLaMJp2mb8', authDomain: 'night-ielts-land.firebaseapp.com', projectId: 'night-ielts-land', storageBucket: 'night-ielts-land.firebasestorage.app', messagingSenderId: '408519436407', appId: '1:408519436407:web:a9f0b9ba23368b54427e72' };
  var fbP = null;
  function fb() {
    if (fbP) return fbP;
    fbP = Promise.all([
      import('https://www.gstatic.com/firebasejs/' + V + '/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/' + V + '/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/' + V + '/firebase-firestore.js')
    ]).then(function (m) {
      var app = m[0].getApps().length ? m[0].getApp() : m[0].initializeApp(CFG), auth = m[1].getAuth(app), db = m[2].getFirestore(app);
      return new Promise(function (ok) { var un = m[1].onAuthStateChanged(auth, function (u) { un(); ok({ fs: m[2], db: db, user: u }); }); });
    });
    return fbP;
  }
  var KIND = /\/listening\//.test(location.pathname) ? 'listening' : 'reading';
  var total = function () { try { return TOTAL_QUESTIONS; } catch (e) { return 40; } };
  function capture(a, b) {
    var out = [];
    for (var n = a || 1; n <= (b || total()); n++) {
      var els = document.getElementsByName('q' + n), v = '';
      if (els.length) {
        if (els[0].type === 'radio' || els[0].type === 'checkbox') { var c = []; Array.prototype.forEach.call(els, function (r) { if (r.checked) c.push(r.value); }); v = c.join('|'); }
        else v = String(els[0].value || '').trim().slice(0, 60);
      }
      out.push(v);
    }
    return out;
  }
  function restore(ans, from) {
    (ans || []).forEach(function (v, i) {
      var els = document.getElementsByName('q' + (i + (from || 1))); if (!els.length || !v) return;
      if (els[0].type === 'radio' || els[0].type === 'checkbox') {
        var set = String(v).split('|');
        Array.prototype.forEach.call(els, function (r) { r.checked = set.indexOf(r.value) >= 0; if (r.checked) r.dispatchEvent(new Event('change', { bubbles: true })); });
      } else { els[0].value = v; els[0].dispatchEvent(new Event('input', { bubbles: true })); els[0].dispatchEvent(new Event('change', { bubbles: true })); }
    });
  }
  var REVIEW = (location.search.match(/[?&]review=([A-Za-z0-9_-]+)/) || [])[1];
  var t0 = Date.now(), loadId = Date.now().toString(36), partIds = {}, fullDone = false;
  /* ghi 1 bản; id cố định theo (lần mở trang + phần) để chấm lại cùng phần chỉ cập nhật, không nhân bản */
  function write(id, extra) {
    return fb().then(function (f) {
      if (!f.user) return null;
      return f.fs.getDoc(f.fs.doc(f.db, 'users', f.user.uid)).then(function (s) {
        var u = s.exists() ? s.data() : {}, role = u.role || 'user';
        var keep = role === 'admin' || role === 'student' || (role === 'pro' && Number(u.proUntil) > Date.now());
        var now = Date.now(), data = Object.assign({
          uid: f.user.uid, kind: KIND, path: location.pathname, title: (document.title || '').replace(/^Night IELTS\s*[-–·]\s*/i, '').slice(0, 80),
          mode: (typeof appMode !== 'undefined' ? appMode : '') || '', secs: Math.round((now - t0) / 1000), at: now, keep: keep
        }, extra);
        if (!keep) data.expiresAt = new Date(now + 30 * 864e5);
        return f.fs.setDoc(f.fs.doc(f.db, 'testAttempts', f.user.uid + '_' + loadId + '_' + id), data).then(function () { return f; });
      });
    }).catch(function (e) { console.warn('Night history: chưa lưu được', e); return null; });
  }
  function hook() {
    if (typeof window.saveProgressRecord !== 'function' || window.saveProgressRecord.__nvHist) return false;
    var orig = window.saveProgressRecord;
    var wrapped = function (score, total2, band) {
      var r = orig.apply(this, arguments);
      if (!REVIEW) {
        fullDone = true;
        var old = Object.keys(partIds); partIds = {};
        write('full', { score: Number(score) || 0, total: Number(total2) || total(), band: String(band || ''), ans: capture() }).then(function (f) {
          /* nộp cả đề thì thay cho các lần chấm lẻ từng phần trước đó (không đếm trùng) */
          if (f) old.forEach(function (n) { f.fs.deleteDoc(f.fs.doc(f.db, 'testAttempts', f.user.uid + '_' + loadId + '_p' + n)).catch(function () {}); });
        });
      }
      return r;
    };
    wrapped.__nvHist = true;
    window.saveProgressRecord = wrapped;
    /* chấm lẻ: Passage (Reading: gradePart) / Section (Listening: openSectionReview) */
    ['gradePart', 'openSectionReview'].forEach(function (fn) {
      var o = window[fn]; if (typeof o !== 'function' || o.__nvHist) return;
      var w = function (n) {
        var out = o.apply(this, arguments);
        try {
          n = Number(n);
          var R = null; try { R = typeof passageRanges !== 'undefined' ? passageRanges : sectionRanges; } catch (e) { try { R = sectionRanges; } catch (e2) {} }
          var rg = R && R[n - 1];
          if (!REVIEW && !fullDone && rg) {
            var ans = capture(rg[0], rg[1]);
            if (ans.some(function (v) { return v; })) {
              var sc = 0; try { sc = gradeQuestionRange(rg[0], rg[1]); } catch (e) {}
              partIds[n] = 1;
              write('p' + n, { part: n, partLabel: KIND === 'reading' ? 'Passage' : 'Section', from: rg[0], score: sc, total: rg[1] - rg[0] + 1, band: '', ans: ans });
            }
          }
        } catch (e) { console.warn('Night history part', e); }
        return out;
      };
      w.__nvHist = true; window[fn] = w;
    });
    return true;
  }
  if (!hook()) { var hn = 0, ht = setInterval(function () { if (hook() || ++hn > 80) clearInterval(ht); }, 250); }

  /* ---- Chế độ xem lại ---- */
  if (!REVIEW) return;
  function banner(html) {
    var b = document.getElementById('nv-review-banner');
    if (!b) {
      b = document.createElement('div'); b.id = 'nv-review-banner';
      b.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 74px);transform:translateX(-50%);z-index:2147482100;background:#24242A;color:#fff;border-radius:999px;padding:10px 12px 10px 18px;font:700 13.5px "Plus Jakarta Sans",system-ui,sans-serif;display:flex;align-items:center;gap:12px;box-shadow:0 16px 36px -14px rgba(36,36,42,.6);max-width:calc(100vw - 24px)';
      document.body.appendChild(b);
    }
    b.innerHTML = html;
  }
  function go() {
    if (typeof window.startTest !== 'function' || !document.body) return setTimeout(go, 200);
    banner('Đang mở bài làm cũ…');
    fb().then(function (f) {
      if (!f.user) { banner('Đăng nhập để xem lại bài làm'); return; }
      return f.fs.getDoc(f.fs.doc(f.db, 'testAttempts', REVIEW)).then(function (s) {
        if (!s.exists()) { banner('Không tìm thấy bài làm này (có thể đã hết hạn 30 ngày)'); return; }
        var a = s.data();
        try { if (typeof selectMode === 'function') selectMode('practice'); } catch (e) {}
        try { window.startTest(); } catch (e) {}
        setTimeout(function () {
          restore(a.ans, a.from || 1);
          var from = a.from || 1, to = a.part ? from + a.total - 1 : total();
          try { gradeQuestionRange(from, to); } catch (e) {}
          if (a.part) { try { if (KIND === 'listening' && typeof switchSection === 'function') switchSection(a.part); else if (typeof switchPassage === 'function') switchPassage(a.part); } catch (e) {} }
          var d = new Date(a.at);
          banner('Xem lại ' + (a.part ? a.partLabel + ' ' + a.part + ' · ' : 'bài làm ') + d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
            ' · <span style="color:#FFB680">' + a.score + '/' + a.total + (a.band ? ' · Band ' + a.band : '') + '</span>' +
            '<a href="' + location.pathname + '" style="background:#fff;color:#24242A;border-radius:999px;padding:6px 12px;text-decoration:none;font-weight:800;white-space:nowrap">Làm lại</a>');
        }, 600);
      });
    }).catch(function () { banner('Chưa mở được bài làm cũ'); });
  }
  go();
})();

/* ===== Ghi lại CÂU chứa từ học sinh bôi đen trong đề, để Khu vườn từ vựng có câu ví dụ thật cho phần "chép cả câu" ===== */
(function () {
  if (!/\/(reading|listening)\//.test(location.pathname) || window.__nvCtx) return;
  window.__nvCtx = true;
  var t = 0;
  document.addEventListener('selectionchange', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      var sel = window.getSelection && window.getSelection(); if (!sel || sel.isCollapsed) return;
      var w = String(sel).trim(); if (!w || w.length > 60 || w.split(/\s+/).length > 6) return;
      var n = sel.anchorNode; while (n && n.nodeType !== 1) n = n.parentNode;
      while (n && n !== document.body && !/^(P|LI|TD|DIV|SPAN|BLOCKQUOTE)$/.test(n.tagName)) n = n.parentNode;
      if (!n || n === document.body) return;
      var text = (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim(); if (text.length < w.length + 5) return;
      var sents = text.match(/[^.!?]+[.!?]?/g) || [text], low = w.toLowerCase(), hit = '';
      for (var i = 0; i < sents.length; i++) if (sents[i].toLowerCase().indexOf(low) >= 0) { hit = sents[i].trim(); break; }
      if (!hit || hit.length > 220) return;
      try {
        var m = JSON.parse(localStorage.getItem('nv-word-ctx') || '{}'); m[low] = hit;
        var k = Object.keys(m); if (k.length > 600) k.slice(0, k.length - 600).forEach(function (x) { delete m[x]; });
        localStorage.setItem('nv-word-ctx', JSON.stringify(m));
      } catch (e) {}
    }, 400);
  });
})();
