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
    '#app button[onclick^="prev("]{display:none!important}',
    '#app .nv-type section>div.border-t>button:last-child{margin-left:auto}',
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
  /* ---- chậu cây của từ đang tưới (khu vườn trên mây) ---- */
  var TN = ['Hạt giống', 'Mầm', 'Cây non', 'Nụ', 'Hoa', 'Vườn hoa'], gpI = -1;
  function gpBox() {
    if (!K.pl || !window.GardenArt) return null;
    var sec = document.querySelector('#app .nv-type section.bg-white'); if (!sec) return null;
    var el = sec.querySelector('.nv-gp');
    if (!el) { el = document.createElement('div'); el.className = 'nv-gp'; el.innerHTML = '<div class="pot"></div><div class="cl">' + GardenArt.cloud(7).replace('class="ga-cloud"', 'class="ga-cloud" style="--clo:#9EA3E6"') + '</div><span class="tag"></span>'; sec.appendChild(el); gpI = -1; }
    return el;
  }
  function showPlant(i, stage, tag) {
    var el = gpBox(); if (!el) return; var p = K.pl[i] || {};
    el.querySelector('.pot').innerHTML = GardenArt.plant(p.f, stage, { special: !!p.fx });
    el.querySelector('.tag').textContent = tag || TN[stage] || '';
  }
  function syncPlant() { if (!K.pl || state.completed) return; var i = state.practiceIndex; if (i !== gpI || !document.querySelector('.nv-gp')) { gpI = i; var p = K.pl[i] || {}; showPlant(i, p.b || 0); } }
  function growFx(i, g) {
    var p = K.pl && K.pl[i]; if (!p) return; var el = gpBox(); if (!el) return;
    var nb = g === 'perfect' ? Math.min(5, (p.b || 0) + 1) : g === 'fail' ? 1 : p.b || 0;
    showPlant(i, g === 'fail' ? 'wilt' : nb, g === 'perfect' ? 'Lên ' + TN[nb] + '!' : g === 'ok' ? 'Giữ bậc' : 'Trồng lại');
    el.classList.remove('grow', 'shake'); void el.offsetWidth; el.classList.add(g === 'perfect' ? 'grow' : 'shake');
    if (g === 'perfect') for (var k = 0; k < 10; k++) { var s = document.createElement('i'); s.className = 'sp'; s.style.left = '50%'; s.style.top = '40%'; s.style.setProperty('--x', (Math.cos(k * .63) * 60).toFixed(0) + 'px'); s.style.setProperty('--y', (Math.sin(k * .63) * 50 - 20).toFixed(0) + 'px'); el.appendChild(s); setTimeout(function (x) { x.remove(); }.bind(null, s), 950); }
    var m = document.createElement('span'); m.className = 'msg'; m.textContent = g === 'perfect' ? 'Cây lớn thêm!' : g === 'ok' ? 'Giữ bậc' : 'Trồng lại nhé'; el.appendChild(m); setTimeout(function () { m.remove(); }, 1650);
  }
  function done() {
    var p = results.filter(function (g) { return g === 'perfect'; }).length, o = results.filter(function (g) { return g === 'ok'; }).length;
    var d = document.createElement('div'); d.className = 'nv-srs-done';
    var more = K.last && K.left > 0, btn = 'border:0;border-radius:999px;font:800 14px "Plus Jakarta Sans",sans-serif;padding:13px 22px;cursor:pointer;margin:6px 4px 0';
    d.innerHTML = '<div><img src="' + (window.NV_SKIN.img || '') + 'garden/flower_seichou8.webp" style="height:120px" alt=""><h2 style="margin:10px 0 4px;font-size:22px">' + (K.last ? 'Tưới xong đợt này!' : 'Xong phần gõ từ!') + '</h2>' +
      '<p style="margin:0;color:#6B6B78;font-size:14px;line-height:1.6"><b style="color:#0F7A6B">' + p + '</b> cây lên bậc · <b style="color:#4B4FC0">' + o + '</b> giữ bậc · <b style="color:#BE123C">' + (results.length - p - o) + '</b> cần trồng lại</p>' +
      (K.last ? (more ? '<p style="margin:8px 0 0;color:#6B6B78;font-size:13px">Còn <b>' + K.left + '</b> cây chờ tưới hôm nay.</p>' : '<p style="margin:8px 0 0;color:#0F7A6B;font-size:13px;font-weight:800">Vườn hôm nay đã tưới xong.</p>') : '<p style="margin:8px 0 0;color:#6B6B78;font-size:13px">Tiếp theo: nghe và <b>chép lại cả câu</b> cho những cây đã ra hoa.</p>') +
      '<div style="margin-top:10px">' + (more ? '<button data-k="more" style="' + btn + ';background:linear-gradient(135deg,#FFD66B,#FF9E5E);color:#3A2410">Tưới tiếp ' + Math.min(20, K.left) + ' cây</button>' : '') +
      '<button data-k="done" style="' + btn + ';background:#24242A;color:#fff">' + (K.last ? 'Về khu vườn' : 'Chép cả câu') + '</button></div></div>';
    d.querySelectorAll('button').forEach(function (bt) { bt.onclick = function () { try { parent.postMessage(bt.dataset.k === 'more' ? { nvSrsMore: true } : { nvSrsDone: true }, '*'); } catch (e) {} }; });
    document.body.appendChild(d);
    try { parent.postMessage({ nvSrsRoundEnd: true }, '*'); } catch (e) {}
  }
  function watch() {
    if (!cur || typeof state === 'undefined') return;
    syncPlant();
    if (state.errorIndex >= 0) cur.err = true;
    if (state.hintActive) cur.hint = true;
    if (state.completed && !cur.fx && K.pl) { cur.fx = 1; growFx(cur.i, cur.rev ? 'fail' : (cur.hint || cur.err || cur.heard || state.hintActive) ? 'ok' : 'perfect'); }
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
