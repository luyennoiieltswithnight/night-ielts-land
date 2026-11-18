/* Night IELTS — BẢNG LỜI NHẮN ẨN DANH (trang chủ, mục "Ôn tập & tiến bộ")
   Mọi người gõ một câu động viên / điều mình nghĩ hôm nay. Hiện tối đa 9 lời mới nhất, chữ viết tay, lơ lửng.
   Lời mới đẩy lời cũ nhất ra. Không hiện tên. Admin bấm × để xoá lời khiếm nhã.
   Firestore: wall/{id} = { t: chữ (≤ 90 ký tự), c: màu 0-5, at: thời điểm, uid }  — uid chỉ để chặn spam, không hiện ra.
   NightWall.mount(el, { uid, admin, db, collection, query, orderBy, limit, onSnapshot, addDoc, deleteDoc, doc }) */
(function () {
  var MAX = 9, LEN = 90, GAP = 30e3;
  var PAL = [['#FFF3B0', '#7A5C00'], ['#FFD9E4', '#8A1C45'], ['#D7F5E3', '#16613A'], ['#DCE7FF', '#23408E'], ['#FFE2C7', '#8A3F00'], ['#EBDDFF', '#4B2A8A']];
  var SLOT = [[6, 8], [37, 4], [68, 9], [3, 38], [36, 34], [69, 39], [8, 66], [40, 64], [70, 68]];
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function css() {
    if (document.getElementById('nwall-css')) return;
    var f = document.createElement('link'); f.rel = 'stylesheet'; f.href = 'https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap'; document.head.appendChild(f);
    var s = document.createElement('style'); s.id = 'nwall-css';
    s.textContent = [
      '.nwall{position:relative;overflow:hidden;min-height:300px;border-radius:28px;padding:20px 20px 16px;color:#fff;background:radial-gradient(130% 110% at 90% 0%,#4C3FA8 0%,#26215F 50%,#191641 100%);display:flex;flex-direction:column;isolation:isolate}',
      '.nwall:before{content:"";position:absolute;inset:0;z-index:-1;background-image:radial-gradient(1.5px 1.5px at 12% 20%,rgba(255,255,255,.8),transparent),radial-gradient(1px 1px at 30% 70%,rgba(255,255,255,.6),transparent),radial-gradient(1.5px 1.5px at 55% 15%,rgba(255,255,255,.7),transparent),radial-gradient(1px 1px at 80% 55%,rgba(255,255,255,.6),transparent),radial-gradient(1.5px 1.5px at 92% 85%,rgba(255,255,255,.7),transparent)}',
      '.nwall-h{display:flex;align-items:center;gap:8px}.nwall-h .tag{background:rgba(255,255,255,.14);border-radius:999px;padding:5px 11px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}',
      '.nwall-h h4{margin:0;font-size:20px;font-weight:900;flex:1}',
      '.nwall-sky{position:relative;flex:1;min-height:250px;margin:8px -6px 10px}',
      '.nwall-n{position:absolute;max-width:30%;padding:8px 11px 9px;border-radius:6px 14px 8px 12px;font:20px/1.15 "Patrick Hand","Comic Sans MS",cursive;box-shadow:0 10px 18px -10px rgba(0,0,0,.6);word-break:break-word;animation:nwFloat var(--d,6s) ease-in-out infinite,nwIn .7s cubic-bezier(.2,1.4,.4,1) both;transform-origin:50% 0}',
      '.nwall-n:after{content:"";position:absolute;top:-6px;left:50%;width:26px;height:10px;margin-left:-13px;background:rgba(255,255,255,.45);border-radius:2px;transform:rotate(-4deg)}',
      '.nwall-n.out{animation:nwOut .6s ease-in forwards}',
      '.nwall-n small{display:block;font:600 10px "Plus Jakarta Sans",system-ui,sans-serif;opacity:.55;margin-top:3px}',
      '.nwall-x{position:absolute;top:-8px;right:-8px;width:22px;height:22px;border-radius:50%;border:0;background:#E11D48;color:#fff;font-weight:900;font-size:13px;line-height:22px;cursor:pointer;padding:0}',
      '@keyframes nwFloat{0%,100%{transform:translateY(0) rotate(var(--r,-2deg))}50%{transform:translateY(-7px) rotate(calc(var(--r,-2deg) * -1))}}',
      '@keyframes nwIn{from{opacity:0;transform:scale(.3) rotate(-14deg)}to{opacity:1}}',
      '@keyframes nwOut{to{opacity:0;transform:translateY(-30px) scale(.6) rotate(10deg)}}',
      '.nwall-f{display:flex;gap:8px;align-items:center;background:rgba(255,255,255,.1);border-radius:999px;padding:5px 5px 5px 14px}',
      '.nwall-f input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:#fff;font:19px "Patrick Hand","Plus Jakarta Sans",sans-serif}.nwall-f input::placeholder{color:rgba(255,255,255,.55)}',
      '.nwall-f button{border:0;border-radius:999px;padding:9px 15px;font:800 13px "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer;background:linear-gradient(135deg,#FFB86B,#FF6B9A);color:#2B1236;white-space:nowrap}.nwall-f button:disabled{opacity:.5}',
      '.nwall-m{font-size:11.5px;color:rgba(255,255,255,.6);margin:6px 4px 0;min-height:15px}',
      '.nwall-empty{position:absolute;inset:0;display:grid;place-items:center;text-align:center;font:22px "Patrick Hand",cursive;color:rgba(255,255,255,.6)}',
      '@media(min-width:900px){.nwall-n{max-width:26%}.nwall-sky{min-height:215px}}',
      '@media(max-width:640px){.nwall-n{max-width:44%;font-size:17px}.nwall-sky{min-height:230px}}',
      '@media(prefers-reduced-motion:reduce){.nwall-n{animation:none}}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function ago(t) { var m = Math.floor((Date.now() - t) / 60000); return m < 1 ? 'vừa xong' : m < 60 ? m + ' phút trước' : m < 1440 ? Math.floor(m / 60) + ' giờ trước' : Math.floor(m / 1440) + ' ngày trước'; }
  var unsub = null;
  function mount(el, o) {
    if (!el || !o || !o.db) return; css();
    if (unsub) { try { unsub(); } catch (e) {} unsub = null; }
    el.innerHTML = '<div class="nwall"><div class="nwall-h"><span class="tag">Ẩn danh</span><h4>Hôm nay bạn nghĩ gì?</h4></div>' +
      '<div class="nwall-sky" id="nwSky"><div class="nwall-empty">Chưa có lời nhắn nào — bạn viết lời đầu tiên nhé ✍️</div></div>' +
      '<form class="nwall-f" id="nwF"><input id="nwI" maxlength="' + LEN + '" placeholder="Một lời động viên, một điều bạn nghĩ hôm nay…" autocomplete="off"><button id="nwB" type="submit">Thả lên</button></form>' +
      '<div class="nwall-m" id="nwM">Không hiện tên · tối đa ' + LEN + ' ký tự · lời mới sẽ đẩy lời cũ nhất bay đi</div></div>';
    var sky = el.querySelector('#nwSky'), shown = {}, slotOf = {};
    function free() { var used = {}; Object.keys(slotOf).forEach(function (k) { used[slotOf[k]] = 1; }); for (var i = 0; i < SLOT.length; i++) if (!used[i]) return i; return 0; }
    function render(list) {
      var keep = {}; list.forEach(function (w) { keep[w.id] = 1; });
      Object.keys(shown).forEach(function (id) { if (keep[id]) return; var n = shown[id]; delete shown[id]; delete slotOf[id]; n.classList.add('out'); setTimeout(function () { n.remove(); }, 650); });
      list.slice().reverse().forEach(function (w) {
        if (shown[w.id]) { var sm = shown[w.id].querySelector('small'); if (sm) sm.textContent = ago(w.at); return; }
        var i = free(); slotOf[w.id] = i;
        var p = PAL[(w.c >>> 0) % PAL.length], n = document.createElement('div'); n.className = 'nwall-n';
        n.style.cssText = 'left:' + (SLOT[i][0] + Math.random() * 3) + '%;top:' + (SLOT[i][1] + Math.random() * 4) + '%;background:' + p[0] + ';color:' + p[1] + ';--r:' + (Math.random() * 6 - 3).toFixed(1) + 'deg;--d:' + (5 + Math.random() * 3).toFixed(1) + 's';
        n.innerHTML = esc(w.t) + '<small>' + ago(w.at) + '</small>' + (o.admin ? '<button class="nwall-x" title="Xoá lời nhắn này" data-del="' + w.id + '">×</button>' : '');
        sky.appendChild(n); shown[w.id] = n;
      });
      var em = sky.querySelector('.nwall-empty'); if (em) em.style.display = list.length ? 'none' : '';
    }
    try {
      var q = o.query(o.collection(o.db, 'wall'), o.orderBy('at', 'desc'), o.limit(MAX));
      unsub = o.onSnapshot(q, function (sn) { var L = []; sn.forEach(function (d) { var x = d.data() || {}; if (x.t) L.push({ id: d.id, t: String(x.t).slice(0, LEN), c: x.c || 0, at: Number(x.at) || Date.now() }); }); render(L); },
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
      if (!o.uid) { m.textContent = 'Đăng nhập để thả lời nhắn nhé.'; return; }
      if (t.length < 2) return;
      var last = 0; try { last = +localStorage.getItem('nv-wall-last') || 0; } catch (e) {}
      if (!o.admin && Date.now() - last < GAP) { m.textContent = 'Chờ ' + Math.ceil((GAP - (Date.now() - last)) / 1000) + ' giây nữa rồi thả tiếp nhé.'; return; }
      var b = el.querySelector('#nwB'); b.disabled = true;
      o.addDoc(o.collection(o.db, 'wall'), { t: t.slice(0, LEN), c: Math.floor(Math.random() * PAL.length), at: Date.now(), uid: o.uid })
        .then(function () { inp.value = ''; m.textContent = 'Đã thả lên bảng ✨'; try { localStorage.setItem('nv-wall-last', String(Date.now())); } catch (e) {} })
        .catch(function (e) { m.textContent = /permission/i.test(e.message) ? 'Bảng lời nhắn đang được mở, bạn thử lại sau nhé.' : 'Chưa gửi được, thử lại nhé.'; console.warn(e); })
        .then(function () { b.disabled = false; });
    };
  }
  window.NightWall = { mount: mount, unmount: function () { if (unsub) try { unsub(); } catch (e) {} unsub = null; } };
})();
