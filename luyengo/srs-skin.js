/* Night IELTS — Khu vườn từ vựng: chạy 1 lượt ÔN (spaced repetition) bên trong màn Nghe – Gõ.
   Không sửa engine: chỉ bọc next/reveal/speak để CHẤM từng mục rồi báo ra trang vườn (vuon.html):
     perfect = gõ đúng, không gợi ý, không gõ sai  -> cây lên 1 bậc
     ok      = có gợi ý / gõ sai rồi sửa / phải nghe (ở kiểu "nhìn nghĩa") -> giữ bậc
     fail    = bấm Xem đáp án hoặc bỏ qua           -> về bậc 1
   window.NV_SKIN.srs = { type: 'phrase'|'sentence', mf: [true/false theo từng mục] }
   mf = "nhìn nghĩa, tự nhớ" (active recall): không tự đọc; bấm loa = dùng gợi ý. */
(function () {
  var K = (window.NV_SKIN || {}).srs; if (!K) return;
  var cur = null, finished = false, results = [];
  var css = document.createElement('style');
  css.textContent = [
    '#app .nv-type>div:first-child{display:none!important}', /* ẩn Quay lại danh sách + tab Cụm từ/Câu */
    '#app button[onclick^="prev("]{visibility:hidden}',
    '#app header.sticky select,#app header.sticky button:not(.nv-exit){display:none!important}',
    '.nv-mf{display:flex;align-items:center;justify-content:center;gap:8px;margin:0 auto 6px;width:max-content;max-width:100%;background:#FFF1E7;color:#C2410C;border-radius:999px;padding:6px 14px;font:800 12px "Plus Jakarta Sans",sans-serif}',
    '.nv-srs-done{position:fixed;inset:0;z-index:999;background:rgba(27,31,75,.82);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px)}',
    '.nv-srs-done>div{background:#fff;border-radius:28px;padding:26px;max-width:420px;width:100%;text-align:center;font-family:"Plus Jakarta Sans",sans-serif}'
  ].join('\n');
  document.head.appendChild(css);
  function fresh(i) { cur = { i: i, hint: false, err: false, heard: false, rev: false }; }
  function mfNow() { return K.type === 'phrase' && K.mf && K.mf[state.practiceIndex]; }

  /* chặn tự đọc ở kiểu "nhìn nghĩa"; bấm loa (người bấm) = gợi ý */
  var origSpeak = window.speak, auto = false;
  window.speak = function (t, r) {
    if (auto && mfNow()) return;
    if (!auto && cur && mfNow()) cur.heard = true;
    try { parent.postMessage('nv-speak', '*'); } catch (e) {} /* nhạc nền nhỏ lại khi đọc */
    return origSpeak.apply(this, arguments);
  };
  var wrapAuto = function (name) {
    var f = window[name]; if (typeof f !== 'function') return;
    window[name] = function () { auto = true; try { return f.apply(this, arguments); } finally { auto = false; } };
  };
  var origReveal = window.reveal;
  window.reveal = function () { if (cur) cur.rev = true; return origReveal.apply(this, arguments); };
  var origHint = window.giveHint;
  window.giveHint = function () { if (cur) cur.hint = true; return origHint.apply(this, arguments); };

  function grade() {
    if (!cur) return null;
    var g = !state.completed || cur.rev ? 'fail' : (cur.hint || cur.err || cur.heard || state.hintActive) ? 'ok' : 'perfect';
    results[cur.i] = g;
    try { parent.postMessage({ nvSrs: { i: cur.i, g: g } }, '*'); } catch (e) {}
    return g;
  }
  var origNext = window.next;
  window.next = function () {
    if (finished) return;
    grade();
    if (state.practiceIndex >= ITEMS.length - 1) { finished = true; done(); return; }
    auto = true; try { origNext.apply(this, arguments); } finally { auto = false; }
    fresh(state.practiceIndex);
  };
  function done() {
    var p = results.filter(function (g) { return g === 'perfect'; }).length, o = results.filter(function (g) { return g === 'ok'; }).length;
    var d = document.createElement('div'); d.className = 'nv-srs-done';
    d.innerHTML = '<div><img src="' + (window.NV_SKIN.img || '') + 'garden/flower_seichou8.webp" style="height:120px" alt=""><h2 style="margin:10px 0 4px;font-size:22px">Tưới xong lượt này!</h2>' +
      '<p style="margin:0;color:#6B6B78;font-size:14px;line-height:1.6"><b style="color:#0F7A6B">' + p + '</b> cây lên bậc · <b style="color:#4B4FC0">' + o + '</b> giữ bậc · <b style="color:#BE123C">' + (results.length - p - o) + '</b> cần trồng lại</p>' +
      '<button style="margin-top:16px;border:0;border-radius:999px;background:#24242A;color:#fff;font:800 14px inherit;padding:13px 24px;cursor:pointer">Về khu vườn</button></div>';
    d.querySelector('button').onclick = function () { try { parent.postMessage({ nvSrsDone: true }, '*'); } catch (e) {} };
    document.body.appendChild(d);
    try { parent.postMessage({ nvSrsRoundEnd: true }, '*'); } catch (e) {}
  }
  function watch() {
    if (!cur || typeof state === 'undefined') return;
    if (state.errorIndex >= 0) cur.err = true;
    if (state.hintActive) cur.hint = true;
    var lab = document.querySelector('.nv-mf'), show = mfNow() && !state.completed;
    var stage = document.querySelector('.nv-stage');
    if (show && !lab && stage) stage.insertAdjacentHTML('afterbegin', '<div class="nv-mf">Nhìn nghĩa, tự nhớ ra từ — bấm loa là dùng gợi ý</div>');
    else if (!show && lab) lab.remove();
  }
  function boot() {
    var app = document.getElementById('app');
    if (!app || !app.firstChild || typeof state === 'undefined') return setTimeout(boot, 50);
    ['goType', 'changeType', 'setPhraseMode', 'setSentenceMode', 'retryItem'].forEach(wrapAuto);
    state.viewMode = 'type'; state.practiceType = K.type === 'sentence' ? 'sentence' : 'phrase'; state.practiceIndex = 0;
    state.input = ''; state.revealed = false; state.completed = false; state.hintActive = false; state.hintEndIndex = -1; state.errorIndex = -1;
    render(0); fresh(0);
    if (!mfNow()) setTimeout(function () { auto = true; try { speak(current().audioText, 1); } finally { auto = false; } }, 350);
    setTimeout(function () { var el = document.getElementById('hiddenInput'); if (el) el.focus(); }, 400);
    new MutationObserver(watch).observe(app, { childList: true, subtree: true, characterData: true });
  }
  boot();
})();
