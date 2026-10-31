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
  var src; try { src = new URL('reading-solver.js?v=20261030e', document.currentScript ? document.currentScript.src : location.href).href; } catch (e) { src = '/reading-solver.js'; }
  var add = function () { var s = document.createElement('script'); s.src = src; document.head.appendChild(s); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();

/* Listening: chế độ "Giải đề cùng thầy" (listening-solver.js tự kiểm tra admin, người khác không thấy gì) */
(function () {
  if (window.__nightLSolverHook || !/\/listening\//.test(location.pathname)) return; window.__nightLSolverHook = true;
  var src; try { src = new URL('listening-solver.js?v=20261031b', document.currentScript ? document.currentScript.src : location.href).href; } catch (e) { src = '/listening-solver.js'; }
  var add = function () { var s = document.createElement('script'); s.src = src; document.head.appendChild(s); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();

/* Web app: mở trang trong cùng cửa sổ + nút quay lại (night-app.js) — cho cả các đề tạo mới sau này */
(function () {
  if (window.__nightApp || document.querySelector('script[src*="night-app.js"]')) return;
  var s = document.createElement('script'); s.src = '/night-app.js'; s.defer = true; (document.head || document.documentElement).appendChild(s);
})();
