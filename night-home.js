/* Night IELTS — trang chủ: (1) Bảng DỰ ĐOÁN BAND tổng · (2) thông báo nổi bật "Làm đề cùng bạn bè".
   index.html gọi NightHome.mount(uid, fs) khi đăng nhập, NightHome.unmount() khi đăng xuất.
   fs = { db, doc, getDoc, getDocs, query, collection, where, updateDoc } (Firebase modular của trang). */
(function () {
  var IMG = 'khoahoc/img/ira/';
  var LS = function (k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var fmt = function (b) { return b == null ? '–' : (Math.round(b * 2) / 2).toFixed(1); };
  /* IELTS làm tròn band tổng: .25 lên .5, .75 lên band kế */
  var roundOverall = function (x) { var f = Math.floor(x), d = x - f; return d < 0.25 ? f : d < 0.75 ? f + 0.5 : f + 1; };
  var RAW = {
    listening: [[39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [0, 2]],
    reading: [[39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [0, 2]]
  };
  var rawBand = function (k, of40) { var t = RAW[k]; for (var i = 0; i < t.length; i++) if (of40 >= t[i][0]) return t[i][1]; return 2; };
  var SK = [
    { k: 'listening', n: 'Listening', ic: 'fa-headphones', c: '#6C70DC', go: function () { var b = document.getElementById('listening-hero-card'); if (b) b.click(); } },
    { k: 'reading', n: 'Reading', ic: 'fa-book-open', c: '#FF9E5E', go: function () { var b = document.getElementById('reading-hero-card'); if (b) b.click(); } },
    { k: 'writing', n: 'Writing', ic: 'fa-pen-nib', c: '#F5B82E', go: function () { location.href = 'writing.html'; } },
    { k: 'speaking', n: 'Speaking', ic: 'fa-microphone-lines', c: '#10B981', go: function () { location.href = 'speaking.html'; } }
  ];
  var ST = { uid: null, fs: null, data: null, goal: null, editing: false };

  var CSS = [
    '.nbp{margin:22px 0 6px;font-family:inherit}',
    '.nbp-card{position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(220px,300px) 1fr;gap:22px;padding:22px;border-radius:30px;background:#fff;box-shadow:0 18px 40px -26px rgba(36,36,42,.45);border:1px solid #EEEEF4}',
    '.nbp-l{position:relative;border-radius:24px;padding:20px;color:#fff;background:radial-gradient(120% 90% at 0% 0%,#4C3FA8 0%,#26215F 55%,#191641 100%);display:flex;flex-direction:column;gap:10px}',
    '.nbp-k{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#C9C4FF}',
    '.nbp-big{display:flex;align-items:flex-end;gap:10px}.nbp-big b{font-size:64px;line-height:.9;font-weight:900;letter-spacing:-.03em;background:linear-gradient(135deg,#FFD66B,#FF9EC4);-webkit-background-clip:text;background-clip:text;color:transparent}',
    '.nbp-big span{font-size:13px;color:#D9D6FF;padding-bottom:6px;line-height:1.35}',
    '.nbp-tg{display:flex;flex-wrap:wrap;gap:6px}.nbp-tg span{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.12);border-radius:999px;padding:6px 11px;font-size:12.5px;font-weight:800}',
    '.nbp-gap{font-size:13.5px;line-height:1.5;color:#EDEBFF}.nbp-gap b{color:#FFD66B}',
    '.nbp-edit{align-self:flex-start;border:0;background:rgba(255,255,255,.14);color:#fff;border-radius:999px;padding:7px 12px;font-weight:800;font-size:12px;cursor:pointer}',
    '.nbp-r{display:flex;flex-direction:column;gap:12px;min-width:0}',
    '.nbp-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.nbp-h h3{margin:0;font-size:20px;font-weight:900;color:#24242A}.nbp-h small{color:#8A8A99;font-size:12.5px}',
    '.nbp-sk{display:grid;grid-template-columns:118px 1fr 54px;align-items:center;gap:10px;padding:10px 12px;border-radius:18px;background:#F7F7FB;border:2px solid transparent}',
    '.nbp-sk.weak{border-color:#FF9EAA;background:#FFF5F6}',
    '.nbp-sn{display:flex;align-items:center;gap:8px;font-weight:800;font-size:14px;color:#24242A}.nbp-sn i{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;color:#fff;font-size:13px}',
    '.nbp-bar{position:relative;height:12px;border-radius:99px;background:#E8E8F0}.nbp-bar em{position:absolute;left:0;top:0;bottom:0;border-radius:99px}',
    '.nbp-bar .tgt{position:absolute;top:-5px;bottom:-5px;width:3px;border-radius:3px;background:#24242A}',
    '.nbp-sb{font-weight:900;font-size:18px;text-align:right;color:#24242A}.nbp-sb.na{font-size:12px;color:#A0A0B0;font-weight:700}',
    '.nbp-note{grid-column:1/-1;font-size:12px;color:#8A8A99;margin-top:-2px}.nbp-sk.weak .nbp-note{color:#BE123C;font-weight:700}',
    '.nbp-go{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:12px 18px;font-weight:800;font-size:14px;cursor:pointer;background:#24242A;color:#fff;align-self:flex-start}',
    '.nbp-go:hover{transform:translateY(-1px)}',
    '.nbp-form{display:flex;flex-direction:column;gap:12px}.nbp-form p{margin:0;color:#5A5A6A;font-size:14px;line-height:1.5}',
    '.nbp-chips{display:flex;flex-wrap:wrap;gap:6px}.nbp-chips button{border:2px solid #E4E4EC;background:#fff;border-radius:14px;padding:9px 13px;font-weight:900;font-size:15px;cursor:pointer;color:#24242A}.nbp-chips button.on{border-color:#4C3FA8;background:#EEEBFF;color:#4C3FA8}',
    '.nbp-form label{font-weight:800;font-size:13px;color:#24242A;display:flex;flex-direction:column;gap:6px}.nbp-form input[type=date]{border:2px solid #E4E4EC;border-radius:14px;padding:10px 12px;font:inherit;font-weight:700;max-width:240px}',
    '.nbp-wait{color:#8A8A99;font-size:14px;padding:16px 0}',
    '@media(max-width:820px){.nbp-card{grid-template-columns:1fr;padding:14px;gap:14px}.nbp-big b{font-size:54px}.nbp-sk{grid-template-columns:100px 1fr 46px;padding:9px 10px}}',
    /* thông báo Làm chung */
    '.ncp{position:relative;overflow:hidden;margin:18px 0 4px;border-radius:28px;padding:20px 22px;display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:center;color:#fff;background:linear-gradient(120deg,#FF6B9A 0%,#FF9E5E 45%,#FFC56B 100%);box-shadow:0 22px 44px -24px rgba(255,107,154,.85);animation:ncpIn .6s cubic-bezier(.2,1.2,.4,1)}',
    '@keyframes ncpIn{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}',
    '.ncp:before{content:"";position:absolute;inset:-40% -10% auto auto;width:300px;height:300px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.35),transparent)}',
    '.ncp-pics{position:relative;width:150px;height:110px}.ncp-pics img{position:absolute;height:96px;filter:drop-shadow(0 8px 10px rgba(120,40,60,.3))}.ncp-pics img:first-child{left:0;bottom:0}.ncp-pics img:last-child{right:0;top:0;height:84px;animation:ncpBob 2.6s ease-in-out infinite}',
    '@keyframes ncpBob{50%{transform:translateY(-6px)}}',
    '.ncp-new{display:inline-flex;align-items:center;gap:6px;background:#24242A;color:#FFD66B;border-radius:999px;padding:5px 11px;font-size:11px;font-weight:900;letter-spacing:.12em}',
    '.ncp h3{margin:8px 0 4px;font-size:clamp(19px,2.6vw,25px);font-weight:900;line-height:1.2;text-shadow:0 2px 10px rgba(150,40,70,.25)}',
    '.ncp p{margin:0;font-size:14px;line-height:1.55;color:#FFF6EE;max-width:640px}',
    '.ncp-steps{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0}.ncp-steps span{background:rgba(255,255,255,.22);border-radius:999px;padding:6px 11px;font-size:12.5px;font-weight:800}.ncp-steps b{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#fff;color:#FF6B9A;font-size:11px;margin-right:4px}',
    '.ncp-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:12px}',
    '.ncp-cta{border:0;border-radius:999px;padding:11px 16px;font-weight:900;font-size:13.5px;cursor:pointer;background:#24242A;color:#fff;display:inline-flex;align-items:center;gap:8px}.ncp-cta.w{background:#fff;color:#C2410C}',
    '.ncp-who{font-size:12px;font-weight:800;color:#5B1A2E;background:rgba(255,255,255,.55);border-radius:12px;padding:6px 10px}',
    '.ncp-g{background:linear-gradient(120deg,#5B3FC4 0%,#8B5CF6 50%,#C084FC 100%);box-shadow:0 22px 44px -24px rgba(91,63,196,.85)}.ncp-g .ncp-who{color:#3B1F7A}.ncp-g .ncp-cta{background:#FFD66B;color:#3A2410}',
    '.ncp-x{position:absolute;top:12px;right:12px;width:34px;height:34px;border:0;border-radius:50%;background:rgba(36,36,42,.25);color:#fff;font-size:18px;cursor:pointer;display:grid;place-items:center;z-index:1}.ncp-x:hover{background:rgba(36,36,42,.45)}',
    '@media(max-width:640px){.ncp{grid-template-columns:1fr;padding:18px 16px}.ncp-pics{width:120px;height:86px}.ncp-pics img{height:76px}.ncp-pics img:last-child{height:66px}}'
  ].join('\n');
  function css() { if (document.getElementById('nbp-css')) return; var s = document.createElement('style'); s.id = 'nbp-css'; s.textContent = CSS; document.head.appendChild(s); }
  function host(id, beforeSel) {
    var el = document.getElementById(id); if (el) return el;
    var ref = document.querySelector(beforeSel); if (!ref) return null;
    el = document.createElement('div'); el.id = id; ref.parentNode.insertBefore(el, ref); return el;
  }

  /* ---------------- (2) Thông báo nổi bật: Làm đề cùng bạn bè ---------------- */
  var PROMO_KEY = 'nv-coop-promo-v1';
  function promo() {
    if (LS(PROMO_KEY)) return;
    var el = host('nv-coop-promo', '#nv-skills'); if (!el) return;
    el.innerHTML = '<section class="ncp" role="region" aria-label="Tính năng mới: làm đề cùng bạn bè">' +
      '<button class="ncp-x" type="button" aria-label="Đóng thông báo"><i class="fa-solid fa-xmark"></i></button>' +
      '<div class="ncp-pics"><img src="' + IMG + 'friends_girl_3146.webp" alt=""><img src="' + IMG + 'online_school_girl_9740.webp" alt=""></div>' +
      '<div><span class="ncp-new"><i class="fa-solid fa-star"></i> TÍNH NĂNG MỚI</span>' +
      '<h3>Làm đề Reading · Listening cùng bạn bè</h3>' +
      '<p>Rủ bạn vào chung một đề: ai chọn đáp án, tô highlight hay ghi chú — người kia thấy ngay lập tức. Học nhóm từ xa mà như ngồi chung bàn.</p>' +
      '<div class="ncp-steps"><span><b>1</b>Mở một đề bất kỳ</span><span><b>2</b>Bấm nút “Làm chung” → Tạo link</span><span><b>3</b>Gửi link cho bạn</span></div>' +
      '<div class="ncp-row"><button class="ncp-cta" type="button" data-go="reading"><i class="fa-solid fa-book-open"></i> Thử với đề Reading</button><button class="ncp-cta w" type="button" data-go="listening"><i class="fa-solid fa-headphones"></i> Đề Listening</button>' +
      '<span class="ncp-who">Tài khoản Astra · Học sinh tạo được link — bạn bè bấm link là làm chung, không cần gói</span></div></div></section>';
    el.querySelector('.ncp-x').onclick = function () { LS(PROMO_KEY, Date.now()); var s = el.querySelector('.ncp'); s.style.transition = 'opacity .25s,transform .25s'; s.style.opacity = '0'; s.style.transform = 'translateY(-8px)'; setTimeout(function () { el.innerHTML = ''; }, 260); };
    el.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { var c = document.getElementById(b.dataset.go + '-hero-card'); if (c) c.click(); }; });
  }

  /* Thông báo: gom 15 huy hiệu → 1 tháng Astra */
  var GIFT_KEY = 'nv-badge-gift-v1';
  function giftPromo() {
    if (LS(GIFT_KEY)) return;
    var el = host('nv-gift-promo', '#nv-skills'); if (!el) return;
    el.innerHTML = '<section class="ncp ncp-g" role="region" aria-label="Quà 15 huy hiệu">' +
      '<button class="ncp-x" type="button" aria-label="Đóng thông báo"><i class="fa-solid fa-xmark"></i></button>' +
      '<div class="ncp-pics"><img src="' + IMG + 'trophy_school_boy.webp" alt=""><img src="' + IMG + 'present_box_3084.webp" alt=""></div>' +
      '<div><span class="ncp-new"><i class="fa-solid fa-gift"></i> QUÀ TẶNG</span>' +
      '<h3>Gom đủ 15 huy hiệu — nhận 1 tháng Astra miễn phí</h3>' +
      '<p>Học đều mỗi ngày, làm đề, luyện Speaking, Writing… là huy hiệu tự rơi vào album. Đủ 15 cái, Night IELTS tặng bạn 1 tháng Astra: AI chấm Speaking + Writing và mở toàn bộ khoá học.</p>' +
      '<div class="ncp-row"><button class="ncp-cta" type="button" data-album><i class="fa-solid fa-medal"></i> Xem album huy hiệu</button><span class="ncp-who">Mỗi tài khoản nhận 1 lần · thầy kích hoạt sau khi bạn đủ huy hiệu</span></div></div></section>';
    el.querySelector('.ncp-x').onclick = function () { LS(GIFT_KEY, Date.now()); var s = el.querySelector('.ncp'); s.style.transition = 'opacity .25s,transform .25s'; s.style.opacity = '0'; s.style.transform = 'translateY(-8px)'; setTimeout(function () { el.innerHTML = ''; }, 260); };
    el.querySelector('[data-album]').onclick = function () { if (window.NightFame && NightFame.openBadges) NightFame.openBadges(); else alert('Đăng nhập để xem album huy hiệu nhé.'); };
  }

  /* ---------------- (1) Dự đoán band ---------------- */
  function goalKey() { return 'nv-goal:' + ST.uid; }
  async function load() {
    var f = ST.fs, uid = ST.uid, out = { listening: null, reading: null, writing: null, speaking: null, n: {} };
    var q = function (col, field) { return f.getDocs(f.query(f.collection(f.db, col), f.where(field, '==', uid))).catch(function () { return null; }); };
    var res = await Promise.all([q('testAttempts', 'uid'), q('speakingAttempts', 'studentId'), q('assignments', 'studentId'), f.getDoc(f.doc(f.db, 'users', uid)).catch(function () { return null; })]);
    var cut = Date.now() - 120 * 864e5;
    /* Reading / Listening: trung bình tối đa 3 lần nộp cả đề gần nhất; chưa nộp cả đề thì ước tính từ các phần đã chấm */
    var tests = { listening: { full: [], part: [] }, reading: { full: [], part: [] } };
    if (res[0]) res[0].forEach(function (d) { var x = d.data(), k = x.kind; if (!tests[k] || (x.at || 0) < cut) return; var b = parseFloat(x.band); if (isFinite(b) && b > 0) tests[k].full.push({ at: x.at, b: b }); else if (x.total) tests[k].part.push({ at: x.at, s: Number(x.score) || 0, t: Number(x.total) }); });
    ['listening', 'reading'].forEach(function (k) {
      var T = tests[k];
      if (T.full.length) { var F = T.full.sort(function (a, b) { return b.at - a.at; }).slice(0, 3); out[k] = F.reduce(function (s, x) { return s + x.b; }, 0) / F.length; out.n[k] = F.length + ' đề gần nhất'; }
      else if (T.part.length) { var P = T.part.sort(function (a, b) { return b.at - a.at; }).slice(0, 6), s = 0, t = 0; P.forEach(function (x) { s += x.s; t += x.t; }); if (t >= 8) { out[k] = rawBand(k, s / t * 40); out.n[k] = 'ước tính từ ' + P.length + ' phần lẻ'; } }
    });
    /* Speaking: trung bình 12 câu gần nhất có điểm tổng */
    if (res[1]) { var S = []; res[1].forEach(function (d) { var x = d.data(), o = x.scores && Number(x.scores.overall); if (o && (Number(x.createdAt) || 0) >= cut) S.push({ at: Number(x.createdAt) || 0, b: o }); }); S.sort(function (a, b) { return b.at - a.at; }); S = S.slice(0, 12); if (S.length) { out.speaking = S.reduce(function (s, x) { return s + x.b; }, 0) / S.length; out.n.speaking = S.length + ' câu gần nhất'; } }
    /* Writing: trung bình 3 bài AI chấm gần nhất */
    if (res[2]) { var W = []; res[2].forEach(function (d) { var x = d.data(); if (x.kind !== 'writing' || !x.ai || !Number(x.ai.overall)) return; var at = Number(x.submittedAt) || Number(x.createdAt) || 0; if (at && at < cut) return; W.push({ at: at, b: Number(x.ai.overall) }); }); W.sort(function (a, b) { return b.at - a.at; }); W = W.slice(0, 3); if (W.length) { out.writing = W.reduce(function (s, x) { return s + x.b; }, 0) / W.length; out.n.writing = W.length + ' bài gần nhất'; } }
    /* mục tiêu: ưu tiên bản lưu trên tài khoản, rồi tới máy này */
    var g = null; try { var u = res[3] && res[3].exists() ? res[3].data() : null; if (u && u.ielts && u.ielts.goal) g = u.ielts; } catch (e) {}
    ST.goal = g || LS(goalKey());
    ST.data = out;
  }
  function render() {
    var el = host('nv-band', '#nv-skills'); if (!el) return;
    if (!ST.data) { el.innerHTML = '<section class="nbp"><div class="nbp-card"><div class="nbp-wait"><i class="fa-solid fa-spinner fa-spin"></i> Đang tính band dự đoán…</div></div></section>'; return; }
    if (!ST.goal || ST.editing) return renderForm(el);
    var D = ST.data, g = ST.goal, goal = Number(g.goal), have = SK.filter(function (s) { return D[s.k] != null; });
    var est = have.length ? roundOverall(have.reduce(function (s, x) { return s + D[x.k]; }, 0) / have.length) : null;
    var days = g.date ? Math.ceil((new Date(g.date + 'T00:00:00') - new Date(new Date().toDateString())) / 864e5) : null;
    /* kỹ năng kéo điểm: chưa có dữ liệu → nhắc làm; có đủ → thấp nhất so với mục tiêu */
    var missing = SK.filter(function (s) { return D[s.k] == null; });
    var weak = have.length ? have.slice().sort(function (a, b) { return D[a.k] - D[b.k]; })[0] : null;
    var gap = est != null ? Math.max(0, goal - est) : null;
    var gapTxt = est == null ? 'Làm vài bài ở các kỹ năng để có dự đoán đầu tiên.' :
      gap <= 0 ? 'Bạn đã chạm mục tiêu <b>' + fmt(goal) + '</b>! Giữ phong độ hoặc đặt mục tiêu cao hơn.' :
      'Còn thiếu <b>' + fmt(gap) + ' band</b> để đạt ' + fmt(goal) + (days != null && days > 0 ? ' — trung bình mỗi tuần cần lên khoảng <b>' + (gap / Math.max(1, days / 7)).toFixed(2) + '</b> band.' : '.');
    var rows = SK.map(function (s) {
      var b = D[s.k], isWeak = weak && weak.k === s.k && b < goal;
      var note = b == null ? 'Chưa có bài trong 4 tháng gần đây — làm 1 bài để tính vào dự đoán' : isWeak ? 'Kỹ năng đang kéo điểm xuống nhiều nhất · ' + D.n[s.k] : D.n[s.k] + (b >= goal ? ' · đã đạt mục tiêu' : ' · còn ' + fmt(goal - b) + ' band');
      return '<div class="nbp-sk' + (isWeak ? ' weak' : '') + '"><div class="nbp-sn"><i class="fa-solid ' + s.ic + '" style="background:' + s.c + '"></i>' + s.n + '</div>' +
        '<div class="nbp-bar"><em style="width:' + (b == null ? 0 : b / 9 * 100) + '%;background:' + s.c + '"></em><span class="tgt" style="left:calc(' + (goal / 9 * 100) + '% - 1px)" title="Mục tiêu ' + fmt(goal) + '"></span></div>' +
        '<div class="nbp-sb' + (b == null ? ' na' : '') + '">' + (b == null ? 'chưa có' : fmt(b)) + '</div><div class="nbp-note">' + note + '</div></div>';
    }).join('');
    var focus = missing.length && have.length < 2 ? missing[0] : (weak && D[weak.k] < goal ? weak : missing[0] || null);
    el.innerHTML = '<section class="nbp"><div class="nbp-card">' +
      '<div class="nbp-l"><div class="nbp-k">Nếu thi hôm nay, bạn được khoảng</div>' +
        '<div class="nbp-big"><b>' + (est == null ? '?' : fmt(est)) + '</b><span>band<br>dự đoán</span></div>' +
        '<div class="nbp-tg"><span><i class="fa-solid fa-bullseye"></i> Mục tiêu ' + fmt(goal) + '</span>' + (days != null ? '<span><i class="fa-solid fa-calendar-day"></i> ' + (days > 0 ? 'Còn ' + days + ' ngày' : days === 0 ? 'Thi hôm nay!' : 'Đã qua ngày thi') + '</span>' : '') + '</div>' +
        '<div class="nbp-gap">' + gapTxt + '</div>' +
        '<button class="nbp-edit" type="button"><i class="fa-solid fa-pen"></i> Đổi mục tiêu · ngày thi</button></div>' +
      '<div class="nbp-r"><div class="nbp-h"><h3>Dự đoán band IELTS</h3><small>Tính từ điểm gần nhất của bạn trên Night IELTS (4 tháng)</small></div>' + rows +
        (focus ? '<button class="nbp-go" type="button"><i class="fa-solid ' + focus.ic + '"></i> Luyện ' + focus.n + ' ngay</button>' : '') + '</div>' +
      '</div></section>';
    el.querySelector('.nbp-edit').onclick = function () { ST.editing = true; render(); };
    var go = el.querySelector('.nbp-go'); if (go && focus) go.onclick = focus.go;
  }
  function renderForm(el) {
    var g = ST.goal || {}, pick = Number(g.goal) || 6.5, date = g.date || '';
    el.innerHTML = '<section class="nbp"><div class="nbp-card">' +
      '<div class="nbp-l"><div class="nbp-k">Dự đoán band IELTS</div><img src="' + IMG + 'online_school_girl_9740.webp" alt="" style="height:110px;align-self:center;filter:drop-shadow(0 8px 12px rgba(0,0,0,.3))"><div class="nbp-gap">Cho Night IELTS biết mục tiêu của bạn — mỗi lần làm bài, bảng này tự tính bạn đang ở đâu và còn thiếu gì.</div></div>' +
      '<div class="nbp-r"><div class="nbp-h"><h3>Mục tiêu của bạn là band mấy?</h3></div><div class="nbp-form">' +
        '<div class="nbp-chips">' + [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5].map(function (b) { return '<button type="button" data-b="' + b + '" class="' + (b === pick ? 'on' : '') + '">' + b.toFixed(1) + '</button>'; }).join('') + '</div>' +
        '<label>Bạn dự định thi ngày nào? <small style="font-weight:600;color:#8A8A99">(chưa có lịch thì bỏ trống)</small><input type="date" id="nbp-date" value="' + esc(date) + '"></label>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="nbp-go" type="button" id="nbp-save"><i class="fa-solid fa-chart-line"></i> Xem band dự đoán</button>' + (ST.goal ? '<button class="nbp-go" type="button" id="nbp-cancel" style="background:#F0F0F5;color:#24242A">Huỷ</button>' : '') + '</div>' +
      '</div></div></div></section>';
    el.querySelectorAll('[data-b]').forEach(function (b) { b.onclick = function () { pick = Number(b.dataset.b); el.querySelectorAll('[data-b]').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
    el.querySelector('#nbp-save').onclick = function () {
      var v = { goal: pick, date: el.querySelector('#nbp-date').value || '', at: Date.now() };
      ST.goal = v; ST.editing = false; LS(goalKey(), v); render();
      try { ST.fs.updateDoc(ST.fs.doc(ST.fs.db, 'users', ST.uid), { ielts: v }).catch(function () {}); } catch (e) {}
    };
    var c = el.querySelector('#nbp-cancel'); if (c) c.onclick = function () { ST.editing = false; render(); };
  }

  window.NightHome = {
    mount: function (uid, fs) {
      css(); promo(); giftPromo();
      if (ST.uid === uid && ST.data) return render();
      ST.uid = uid; ST.fs = fs; ST.data = null; ST.goal = LS('nv-goal:' + uid); ST.editing = false;
      render();
      load().then(render).catch(function (e) { console.warn('NightHome', e); ST.data = { n: {} }; render(); });
    },
    promo: function () { css(); promo(); giftPromo(); },
    unmount: function () { ST.uid = null; ST.data = null; ['nv-band'].forEach(function (id) { var el = document.getElementById(id); if (el) el.innerHTML = ''; }); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { css(); promo(); giftPromo(); }); else { css(); promo(); giftPromo(); }
})();
