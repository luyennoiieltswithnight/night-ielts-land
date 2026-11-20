/* Night IELTS — BẢNG LỜI NHẮN ẨN DANH "Dây đèn đêm" (trang chủ)
   Lời nhắn là những tấm giấy viết tay kẹp trên 3 dây đèn dưới bầu trời đêm, đung đưa nhẹ.
   Hiện tối đa 9 lời mới nhất (điện thoại: 6). Lời mới đẩy lời cũ nhất bay đi. Không hiện tên. Admin bấm × để xoá.
   Góc trên: số người đang học cùng bạn (NightOnline trong night-plan.js).
   Firestore: wall/{id} = { t: chữ (≤ 90 ký tự), c: màu 0-5, at: thời điểm, uid }
   NightWall.mount(el, { uid, admin, db, collection, query, orderBy, limit, onSnapshot, addDoc, deleteDoc, doc }) */
(function () {
  var MAX = 9, LEN = 90, GAP = 30e3;
  var PAL = [['#FFF4C2', '#6B4E00'], ['#FFDDE7', '#8A1C45'], ['#DDF6E6', '#16613A'], ['#DEE8FF', '#23408E'], ['#FFE6CC', '#8A3F00'], ['#ECE0FF', '#4B2A8A']];
  var ROWS = [10, 41, 72], COLS = [[16, 50, 84], [26, 58, 86], [14, 47, 80]], SAG = 5;   // % theo chiều cao / rộng bầu trời
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var small = function () { return window.innerWidth < 640; };
  var rowY = function (r, xPct) { var t = xPct / 100; return ROWS[r] + 4 * t * (1 - t) * SAG; };
  function css() {
    if (document.getElementById('nwall-css')) return;
    var f = document.createElement('link'); f.rel = 'stylesheet'; f.href = 'https://fonts.googleapis.com/css2?family=Patrick+Hand&subset=vietnamese&display=swap'; document.head.appendChild(f);
    var s = document.createElement('style'); s.id = 'nwall-css';
    s.textContent = [
      '.nwall{position:relative;overflow:hidden;border-radius:30px;padding:20px 20px 16px;color:#fff;isolation:isolate;background:linear-gradient(180deg,#0E0B2E 0%,#1C1652 45%,#2C1E5E 80%,#3D2462 100%)}',
      // cực quang + sao + trăng
      '.nwall-aur{position:absolute;inset:-20%;z-index:-2;filter:blur(40px);opacity:.55;background:radial-gradient(35% 25% at 20% 30%,#38BDF8 0%,transparent 70%),radial-gradient(30% 22% at 60% 18%,#A78BFA 0%,transparent 70%),radial-gradient(28% 20% at 85% 40%,#F472B6 0%,transparent 70%);animation:nwAur 18s ease-in-out infinite alternate}',
      '@keyframes nwAur{to{transform:translate(4%,3%) rotate(4deg) scale(1.08)}}',
      '.nwall-stars,.nwall-stars:after{position:absolute;inset:0;z-index:-1;content:"";background-repeat:repeat;pointer-events:none}',
      '.nwall-stars{background-image:radial-gradient(1px 1px at 10% 15%,#fff,transparent),radial-gradient(1.4px 1.4px at 28% 62%,#fff,transparent),radial-gradient(1px 1px at 47% 8%,#fff,transparent),radial-gradient(1.6px 1.6px at 66% 36%,#fff,transparent),radial-gradient(1px 1px at 82% 74%,#fff,transparent),radial-gradient(1.2px 1.2px at 93% 12%,#fff,transparent),radial-gradient(1px 1px at 5% 88%,#fff,transparent),radial-gradient(1.3px 1.3px at 38% 92%,#fff,transparent);background-size:340px 260px;opacity:.7}',
      '.nwall-stars:after{background-image:radial-gradient(1.8px 1.8px at 20% 40%,#FFF7D6,transparent),radial-gradient(1.5px 1.5px at 72% 22%,#E0E7FF,transparent),radial-gradient(1.8px 1.8px at 55% 80%,#FFF7D6,transparent);background-size:420px 300px;animation:nwTw 3.5s ease-in-out infinite}',
      '@keyframes nwTw{50%{opacity:.25}}',
      '.nwall-moon{position:absolute;top:22px;right:26px;width:46px;height:46px;border-radius:50%;box-shadow:-11px 7px 0 0 #FFE9A8;transform:rotate(-18deg);filter:drop-shadow(0 0 14px rgba(255,233,168,.55));z-index:-1}',
      // tiêu đề
      '.nwall-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-right:64px}',
      '.nwall-h .tag{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:5px 11px;font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}',
      '.nwall-h h4{margin:0;font:400 34px/1.05 "Patrick Hand",cursive;letter-spacing:.01em;background:linear-gradient(90deg,#FFF3C4,#FFC2D9 55%,#C9D6FF);-webkit-background-clip:text;background-clip:text;color:transparent}',
      '.nwall-on{display:inline-flex;align-items:center;gap:8px;background:rgba(16,185,129,.16);border:1px solid rgba(110,231,183,.35);color:#D1FAE5;border-radius:999px;padding:6px 12px 6px 10px;font-size:12.5px;font-weight:700;white-space:nowrap}',
      '.nwall-on i{width:8px;height:8px;border-radius:50%;background:#34D399;box-shadow:0 0 0 0 rgba(52,211,153,.7);animation:nwPing 1.8s infinite}',
      '.nwall-on b{font-size:14px;color:#fff}',
      '@keyframes nwPing{70%{box-shadow:0 0 0 8px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}',
      // dây đèn
      '.nwall-sky{position:relative;height:430px;margin:10px -8px 8px}',
      '.nwall-sky svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}',
      '.nwall-sky path{fill:none;stroke:rgba(255,236,200,.45);stroke-width:1.4}',
      '.nwall-bulb{position:absolute;width:7px;height:9px;margin:-2px 0 0 -3.5px;border-radius:50% 50% 45% 45%;background:var(--b);box-shadow:0 0 10px 2px var(--b);animation:nwBulb 2.6s ease-in-out infinite;animation-delay:var(--dl)}',
      '@keyframes nwBulb{50%{opacity:.35;box-shadow:0 0 4px 0 var(--b)}}',
      // tờ giấy
      '.nwall-n{position:absolute;width:26%;max-width:230px;transform-origin:50% -10px;animation:nwSwing var(--d,6s) ease-in-out infinite,nwIn .8s cubic-bezier(.2,1.4,.4,1) both}',
      '.nwall-n .pin{position:absolute;left:50%;top:-14px;width:9px;height:20px;margin-left:-4.5px;border-radius:3px;background:linear-gradient(90deg,#C08A54,#E8B97F 50%,#B07B47);box-shadow:0 2px 3px rgba(0,0,0,.4);z-index:2}',
      '.nwall-n .paper{position:relative;padding:12px 12px 10px;border-radius:4px 4px 10px 6px;background:var(--p);color:var(--ink);font:20px/1.15 "Patrick Hand","Comic Sans MS",cursive;word-break:break-word;box-shadow:0 14px 22px -12px rgba(0,0,0,.7),inset 0 -14px 18px -16px rgba(0,0,0,.25);background-image:repeating-linear-gradient(transparent 0 22px,rgba(0,0,0,.05) 22px 23px)}',
      '.nwall-n .paper:after{content:"";position:absolute;right:0;bottom:0;width:18px;height:18px;background:linear-gradient(135deg,transparent 50%,rgba(0,0,0,.08) 50%);border-radius:0 0 10px 0}',
      '.nwall-n small{display:block;font:600 10px "Plus Jakarta Sans",system-ui,sans-serif;opacity:.55;margin-top:5px}',
      '.nwall-n.mine .paper{box-shadow:0 0 0 2px #FDE68A,0 14px 22px -12px rgba(0,0,0,.7)}',
      '.nwall-n.out{animation:nwOut .7s ease-in forwards}',
      '.nwall-x{position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;border:0;background:#E11D48;color:#fff;font-weight:900;font-size:13px;line-height:22px;cursor:pointer;padding:0;z-index:3}',
      '@keyframes nwSwing{0%,100%{transform:rotate(var(--r,-3deg))}50%{transform:rotate(calc(var(--r,-3deg) * -1))}}',
      '@keyframes nwIn{from{opacity:0;transform:translateY(-40px) rotate(-20deg) scale(.6)}to{opacity:1}}',
      '@keyframes nwOut{to{opacity:0;transform:translateY(-60px) rotate(25deg) scale(.5)}}',
      '.nwall-empty{position:absolute;left:0;right:0;top:44%;text-align:center;font:24px "Patrick Hand",cursive;color:rgba(255,255,255,.65)}',
      // ô nhập
      '.nwall-f{display:flex;gap:8px;align-items:center;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(6px);border-radius:999px;padding:5px 5px 5px 16px}',
      '.nwall-f svg{width:18px;height:18px;flex:none;opacity:.7}',
      '.nwall-f input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:#fff;font:21px "Patrick Hand","Plus Jakarta Sans",sans-serif}.nwall-f input::placeholder{color:rgba(255,255,255,.5)}',
      '.nwall-f button{border:0;border-radius:999px;padding:10px 17px;font:800 13px "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer;background:linear-gradient(135deg,#FDE68A,#FDA4AF);color:#3B0B2A;white-space:nowrap;box-shadow:0 6px 16px -6px rgba(253,164,175,.8)}.nwall-f button:disabled{opacity:.5}',
      '.nwall-m{font-size:11.5px;color:rgba(255,255,255,.55);margin:7px 6px 0;min-height:15px}',
      '@media(max-width:640px){.nwall{padding:18px 14px 14px;border-radius:26px}.nwall-h h4{font-size:30px}.nwall-sky{height:470px}.nwall-n{width:42%}.nwall-n .paper{font-size:17px;padding:10px}.nwall-moon{top:18px;right:18px;width:38px;height:38px}}',
      '@media(prefers-reduced-motion:reduce){.nwall-n,.nwall-aur,.nwall-bulb,.nwall-stars:after{animation:none}}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function ago(t) { var m = Math.floor((Date.now() - t) / 60000); return m < 1 ? 'vừa xong' : m < 60 ? m + ' phút trước' : m < 1440 ? Math.floor(m / 60) + ' giờ trước' : Math.floor(m / 1440) + ' ngày trước'; }
  /* Vị trí các kẹp: 3 dây × 3 (điện thoại: 3 dây × 2) */
  function slots() {
    var out = [];
    ROWS.forEach(function (_, r) { var cs = small() ? [26, 74] : COLS[r]; cs.forEach(function (x) { out.push({ r: r, x: x, y: rowY(r, x) }); }); });
    return out;
  }
  function skySvg() {
    var p = ROWS.map(function (y) { return '<path vector-effect="non-scaling-stroke" d="M-2 ' + (y - 1) + ' Q 50 ' + (y + 2 * SAG) + ' 102 ' + (y - 1) + '"/>'; }).join('');
    var bulbs = '', BC = ['#FDE68A', '#FDA4AF', '#93C5FD', '#86EFAC', '#C4B5FD'], k = 0;
    ROWS.forEach(function (_, r) { for (var x = 4; x <= 96; x += 8) { bulbs += '<i class="nwall-bulb" style="left:' + x + '%;top:' + rowY(r, x).toFixed(2) + '%;--b:' + BC[k % BC.length] + ';--dl:' + ((k * 0.37) % 2.6).toFixed(2) + 's"></i>'; k++; } });
    return '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + p + '</svg>' + bulbs;
  }
  var unsub = null, onUnsub = null;
  function mount(el, o) {
    if (!el || !o || !o.db) return; css();
    if (unsub) { try { unsub(); } catch (e) {} unsub = null; }
    if (onUnsub) { try { onUnsub(); } catch (e) {} onUnsub = null; }
    el.innerHTML = '<div class="nwall"><div class="nwall-aur"></div><div class="nwall-stars"></div><div class="nwall-moon"></div>' +
      '<div class="nwall-h"><span class="tag">Ẩn danh</span><h4>Hôm nay bạn nghĩ gì?</h4><span class="nwall-on" id="nwOn" style="display:none"><i></i><span><b id="nwOnN">1</b> người đang học cùng bạn</span></span></div>' +
      '<div class="nwall-sky" id="nwSky">' + skySvg() + '<div class="nwall-empty">Chưa có lời nhắn nào, bạn viết lời đầu tiên nhé</div></div>' +
      '<form class="nwall-f" id="nwF"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>' +
      '<input id="nwI" maxlength="' + LEN + '" placeholder="Một lời động viên, một điều bạn nghĩ hôm nay…" autocomplete="off"><button id="nwB" type="submit">Kẹp lên dây</button></form>' +
      '<div class="nwall-m" id="nwM">Không hiện tên · tối đa ' + LEN + ' ký tự · lời mới sẽ đẩy lời cũ nhất bay đi</div></div>';
    var sky = el.querySelector('#nwSky'), shown = {}, slotOf = {}, mineIds = {};
    // Số người đang học cùng
    // Hiện số thật: từ 10 người đang online trở lên -> "đang học cùng bạn"; ít hơn -> "bạn đã học hôm nay" (từ 10 trở lên); giáo viên luôn thấy cả hai
    if (window.NightOnline) onUnsub = NightOnline.watch(function (n, d) {
      var b = el.querySelector('#nwOn'); if (!b) return; var txt = '';
      if (o.admin) txt = '<b>' + n + '</b> người đang online · <b>' + (d || n) + '</b> bạn học hôm nay';
      else if (n >= 10) txt = '<b>' + n + '</b> người đang học cùng bạn';
      else if (d >= 10) txt = '<b>' + d + '</b> bạn đã vào học hôm nay';
      b.style.display = txt ? '' : 'none'; b.lastChild.innerHTML = txt;
    });
    function free() { var S = slots(), used = {}; Object.keys(slotOf).forEach(function (k) { used[slotOf[k]] = 1; }); for (var i = 0; i < S.length; i++) if (!used[i]) return i; return 0; }
    function render(list) {
      list = list.slice(0, small() ? 6 : MAX);
      var keep = {}; list.forEach(function (w) { keep[w.id] = 1; });
      Object.keys(shown).forEach(function (id) { if (keep[id]) return; var n = shown[id]; delete shown[id]; delete slotOf[id]; n.classList.add('out'); setTimeout(function () { n.remove(); }, 700); });
      var S = slots();
      list.slice().reverse().forEach(function (w) {
        if (shown[w.id]) { var sm = shown[w.id].querySelector('small'); if (sm) sm.textContent = ago(w.at); return; }
        var i = free(); slotOf[w.id] = i; var sl = S[i];
        var p = PAL[(w.c >>> 0) % PAL.length], n = document.createElement('div');
        n.className = 'nwall-n' + (o.uid && w.uid === o.uid ? ' mine' : '');
        n.style.cssText = 'left:' + Math.max(1, Math.min(73, sl.x - 13)) + '%;top:calc(' + sl.y + '% + 4px);--p:' + p[0] + ';--ink:' + p[1] + ';--r:' + (Math.random() * 3 + 1.5).toFixed(1) * (Math.random() < .5 ? -1 : 1) + 'deg;--d:' + (4.5 + Math.random() * 3).toFixed(1) + 's';
        if (small()) n.style.left = Math.max(2, Math.min(56, sl.x - 21)) + '%';
        n.innerHTML = '<span class="pin"></span><div class="paper">' + esc(w.t) + '<small>' + ago(w.at) + '</small></div>' + (o.admin ? '<button class="nwall-x" title="Xoá lời nhắn này" data-del="' + w.id + '">×</button>' : '');
        sky.appendChild(n); shown[w.id] = n;
      });
      var em = sky.querySelector('.nwall-empty'); if (em) em.style.display = list.length ? 'none' : '';
    }
    try {
      var q = o.query(o.collection(o.db, 'wall'), o.orderBy('at', 'desc'), o.limit(MAX));
      unsub = o.onSnapshot(q, function (sn) { var L = []; sn.forEach(function (d) { var x = d.data() || {}; if (x.t) L.push({ id: d.id, t: String(x.t).slice(0, LEN), c: x.c || 0, at: Number(x.at) || Date.now(), uid: x.uid }); }); render(L); },
        function (e) { console.warn('Bảng lời nhắn:', e); el.querySelector('#nwM').textContent = 'Chưa tải được bảng lời nhắn.'; });
    } catch (e) { console.warn(e); }
    sky.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-del]'); if (!b || !o.admin) return;
      if (!confirm('Xoá lời nhắn này?')) return;
      o.deleteDoc(o.doc(o.db, 'wall', b.dataset.del)).catch(function (e) { alert('Không xoá được: ' + e.message); });
    });
    el.querySelector('#nwF').onsubmit = function (ev) {
      ev.preventDefault();
      var inp = el.querySelector('#nwI'), m = el.querySelector('#nwM'), t = inp.value.replace(/\s+/g, ' ').trim();
      if (!o.uid) { m.textContent = 'Đăng nhập để kẹp lời nhắn nhé.'; return; }
      if (t.length < 2) return;
      var last = 0; try { last = +localStorage.getItem('nv-wall-last') || 0; } catch (e) {}
      if (!o.admin && Date.now() - last < GAP) { m.textContent = 'Chờ ' + Math.ceil((GAP - (Date.now() - last)) / 1000) + ' giây nữa rồi kẹp tiếp nhé.'; return; }
      var b = el.querySelector('#nwB'); b.disabled = true;
      o.addDoc(o.collection(o.db, 'wall'), { t: t.slice(0, LEN), c: Math.floor(Math.random() * PAL.length), at: Date.now(), uid: o.uid })
        .then(function () { inp.value = ''; m.textContent = 'Đã kẹp lên dây đèn ✨'; try { localStorage.setItem('nv-wall-last', String(Date.now())); } catch (e) {} })
        .catch(function (e) { m.textContent = /permission/i.test(e.message) ? 'Bảng lời nhắn đang được mở, bạn thử lại sau nhé.' : 'Chưa gửi được, thử lại nhé.'; console.warn(e); })
        .then(function () { b.disabled = false; });
    };
  }
  window.NightWall = { mount: mount, unmount: function () { if (unsub) try { unsub(); } catch (e) {} unsub = null; if (onUnsub) try { onUnsub(); } catch (e) {} onUnsub = null; } };
})();
