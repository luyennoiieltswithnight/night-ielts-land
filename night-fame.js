/* Night IELTS — night-fame.js: ghi nhận việc học cho đáng khoe.
   1. Khoảnh khắc chiến thắng: làm xong đề / bài / chấm AI → màn hình ăn mừng + nút xuất ảnh story 9:16.
   2. Night Check-in: chụp ảnh bàn học (chỉ chụp mới), lên Tường lớp, thả 🔥😭👏, thầy đóng mộc.
   3. Album huy hiệu có độ hiếm.   4. Night Wrapped hằng tháng.   5. Học sinh của tuần.   6. Lửa lớp.
   Firestore:
     fame/<uid>            { name, photo, streak, best, lastDay, total:{kind:n}, bestBand:{kind:b}, badges:{id:ts},
                             months:{yyyymm:{days:{dd:1}, k:{kind:n}, hours:[24], bands:{kind:b}, quote, qb, maxStreak}},
                             kudos:[{at,text,by,type}], kudosSeen, checkins }
     checkins/<uid>_<day>  { uid, name, photo, img(dataURL), caption, day, ts, late, ontime, streak, reacts:{uid:emoji}, stamp }
     checkinDays/<day>     { day, uids:{uid:1} }
     publicSettings/checkin { day, at }   (Apps Script thong-bao đặt giờ check-in ngẫu nhiên mỗi ngày)
     publicSettings/main.sotw { uid, name, photo, note, at }   (học sinh của tuần) */
(function () {
  if (window.NightFame) return;
  var FB_CONFIG = { apiKey: 'AIzaSyCmeN49M4oI78ZPWDhMlbisDOLaMJp2mb8', authDomain: 'night-ielts-land.firebaseapp.com', projectId: 'night-ielts-land', storageBucket: 'night-ielts-land.firebasestorage.app', messagingSenderId: '408519436407', appId: '1:408519436407:web:a9f0b9ba23368b54427e72' };
  var V = '10.8.1', TZ = 'Asia/Ho_Chi_Minh', CHECKIN_WINDOW = 15 * 60000;
  var ROOT = (function () { var s = document.querySelector('script[src*="night-fame.js"]'); try { return new URL('./', s ? s.src : location.href).href; } catch (e) { return '/'; } })();
  var IRA = ROOT + 'khoahoc/img/ira/';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dayKey(t) { return new Date(t || Date.now()).toLocaleDateString('en-CA', { timeZone: TZ }).replace(/-/g, ''); }
  function hourVN(t) { return Number(new Date(t || Date.now()).toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false })) % 24; }
  function dayNum(k) { return Math.round(Date.UTC(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6, 8)) / 864e5); }
  function keyOfNum(n) { var d = new Date(n * 864e5); return d.getUTCFullYear() + ('0' + (d.getUTCMonth() + 1)).slice(-2) + ('0' + d.getUTCDate()).slice(-2); }
  function hm(t) { return new Date(t).toLocaleTimeString('vi-VN', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------- Firebase (chờ trang tự khởi động trước) ---------- */
  var fbP = null;
  function fb() {
    if (fbP) return fbP;
    fbP = Promise.all(['app', 'auth', 'firestore'].map(function (x) { return import('https://www.gstatic.com/firebasejs/' + V + '/firebase-' + x + '.js'); })).then(function (m) {
      return new Promise(function (res) {
        var t0 = Date.now();
        (function w() { if (m[0].getApps().length) return res(m[0].getApp()); if (Date.now() - t0 > 6000) return res(m[0].initializeApp(FB_CONFIG)); setTimeout(w, 150); })();
      }).then(function (app) {
        var o = { authM: m[1], fs: m[2], auth: m[1].getAuth(app), db: m[2].getFirestore(app) };
        return new Promise(function (res) { var u = o.authM.onAuthStateChanged(o.auth, function (user) { u(); o.user = user; res(o); }); });
      });
    });
    return fbP;
  }
  var meP = null;
  function me() {
    if (meP) return meP;
    meP = fb().then(function (o) {
      var user = o.auth.currentUser || o.user;
      if (!user) { meP = null; return null; }
      o.user = user;
      return o.fs.getDoc(o.fs.doc(o.db, 'users', o.user.uid)).then(function (s) {
        var d = s.exists() ? s.data() : {};
        return { uid: o.user.uid, name: o.user.displayName || d.name || '', photo: o.user.photoURL || d.photo || '', role: d.role || 'student', o: o };
      }).catch(function () { return { uid: o.user.uid, name: o.user.displayName || '', photo: o.user.photoURL || '', role: 'student', o: o }; });
    });
    return meP;
  }

  /* ---------- Huy hiệu ---------- */
  var RAR = { common: ['Thường', '#64748B', '#F1F5F9'], rare: ['Hiếm', '#2563EB', '#DBEAFE'], epic: ['Sử thi', '#9333EA', '#F3E8FF'], legend: ['Huyền thoại', '#D97706', '#FEF3C7'] };
  var BADGES = [
    { id: 'first', n: 'Bước đầu tiên', d: 'Hoàn thành hoạt động học đầu tiên', r: 'common', i: 'kaidan_woman_noboru' },
    { id: 'streak3', n: 'Lửa nhỏ', d: 'Học 3 ngày liên tiếp', r: 'common', i: 'yaruki_moeru_woman_8815' },
    { id: 'streak7', n: 'Một tuần bốc cháy', d: 'Học 7 ngày liên tiếp', r: 'rare', i: 'yaruki_moeru_woman_8815' },
    { id: 'streak30', n: 'Tháng không nghỉ', d: 'Học 30 ngày liên tiếp', r: 'epic', i: 'yaruki_moeru_man_2348' },
    { id: 'streak100', n: 'Bất tử', d: 'Học 100 ngày liên tiếp', r: 'legend', i: 'yaruki_moeru_man_2348', h: 1 },
    { id: 'owl', n: 'Cú đêm', d: 'Học sau 23 giờ', r: 'rare', i: 'animal_chara_fukurou_hakase', h: 1 },
    { id: 'bird', n: 'Chim sớm', d: 'Học trước 7 giờ sáng', r: 'rare', i: 'bird_kyukanchou_girl_5003', h: 1 },
    { id: 'comeback', n: 'Quay xe thành công', d: 'Quay lại học sau 7 ngày vắng', r: 'rare', i: 'korobu_kodomo_7490', h: 1 },
    { id: 'tests10', n: 'Thợ săn đề', d: 'Làm xong 10 đề Reading / Listening', r: 'rare', i: 'test_shiken_woman' },
    { id: 'tests50', n: 'Máy cày đề', d: 'Làm xong 50 đề Reading / Listening', r: 'epic', i: 'shigoto_tekipaki_9672' },
    { id: 'speak10', n: 'Mồm dẻo', d: 'Luyện Speaking 10 lần', r: 'rare', i: 'ai_talk_woman' },
    { id: 'write10', n: 'Ngòi bút thép', d: 'Được AI chấm 10 bài Writing', r: 'rare', i: 'book_sakubun_kodomo_girl' },
    { id: 'lessons10', n: 'Mọt bài giảng', d: 'Học xong 10 buổi trong các khoá', r: 'rare', i: 'denkyuu_on' },
    { id: 'allskills', n: 'Tứ kỹ toàn năng', d: 'Làm đủ cả Reading, Listening, Speaking, Writing', r: 'epic', i: 'kinniku__1952' },
    { id: 'perfect', n: 'Không trượt phát nào', d: 'Đúng hết một đề (từ 10 câu)', r: 'epic', i: 'test100_5952', h: 1 },
    { id: 'band7', n: 'Chạm mốc 7.0', d: 'Đạt band 7.0 trở lên ở bất kỳ kỹ năng', r: 'epic', i: 'graph_up' },
    { id: 'band8', n: 'Hệ 8.0', d: 'Đạt band 8.0 trở lên', r: 'legend', i: 'trophy_school_boy', h: 1 },
    { id: 'checkin7', n: 'Check-in chăm chỉ', d: 'Check-in 7 lần', r: 'rare', i: 'camera_film_2730' },
    { id: 'ontime', n: 'Đúng giờ vàng', d: 'Check-in trong 15 phút từ lúc chuông reo', r: 'rare', i: 'kitchen_timer', h: 1 },
    { id: 'kudos', n: 'Được thầy đóng mộc', d: 'Thầy Night khen một bài / một check-in', r: 'rare', i: 'teacher_tensaku_woman' },
    { id: 'sotw', n: 'Học sinh của tuần', d: 'Được chọn là Học sinh của tuần', r: 'legend', i: 'jibun_migaki_man_0425', h: 1 }
  ];
  var BMAP = {}; BADGES.forEach(function (b) { BMAP[b.id] = b; });
  function earned(f, ev) {
    var t = f.total || {}, b = f.bestBand || {}, out = [];
    var acts = 0; Object.keys(t).forEach(function (k) { acts += t[k]; });
    var h = hourVN(ev.at);
    if (acts >= 1) out.push('first');
    if (f.streak >= 3) out.push('streak3'); if (f.streak >= 7) out.push('streak7'); if (f.streak >= 30) out.push('streak30'); if (f.streak >= 100) out.push('streak100');
    if (ev.kind !== 'kudos' && (h >= 23 || h < 4)) out.push('owl');
    if (ev.kind !== 'kudos' && h >= 4 && h < 7) out.push('bird');
    if (ev.comeback) out.push('comeback');
    var tests = (t.reading || 0) + (t.listening || 0);
    if (tests >= 10) out.push('tests10'); if (tests >= 50) out.push('tests50');
    if ((t.speaking || 0) >= 10) out.push('speak10'); if ((t.writing || 0) >= 10) out.push('write10'); if ((t.lesson || 0) >= 10) out.push('lessons10');
    if (t.reading && t.listening && t.speaking && t.writing) out.push('allskills');
    if (ev.total >= 10 && ev.score === ev.total) out.push('perfect');
    var top = Math.max(b.reading || 0, b.listening || 0, b.speaking || 0, b.writing || 0);
    if (top >= 7) out.push('band7'); if (top >= 8) out.push('band8');
    if ((f.checkins || 0) >= 7) out.push('checkin7');
    if (ev.ontime) out.push('ontime');
    if (ev.kind === 'kudos') out.push(ev.type === 'sotw' ? 'sotw' : 'kudos');
    return out;
  }

  /* ---------- Ghi nhận 1 hoạt động ---------- */
  var KIND = {
    reading: ['Reading', '📖'], listening: ['Listening', '🎧'], speaking: ['Speaking', '🗣️'], writing: ['Writing', '✍️'],
    lesson: ['Bài học', '📚'], checkin: ['Check-in', '📸'], kudos: ['Thầy khen', '🏅']
  };
  var CAPS = {
    any: ['Học xong rồi, giờ lướt TikTok không áy náy 😌', 'Một bước gần hơn tới band mơ ước ✨', 'Ai cản được tui nữa 😤', 'IELTS ơi chờ đó 🫡', 'Hôm nay tui chọn học thay vì nằm 🛌❌'],
    high: ['Band này ai dạy vậy trời 😭🔥', 'Mẹ ơi con giỏi rồi 😭', 'Không phải flex đâu, chỉ là sự thật 💅', 'Ủa sao giỏi vậy 😳'],
    night: ['3 giờ sáng vẫn còn cày, cú đêm chính hiệu 🦉', 'Đêm khuya chỉ có tui và IELTS 🌙'],
    streak: ['Chuỗi này mà đứt là tui khóc 🔥', 'Ngày thứ {n} không bỏ cuộc 🔥'],
    checkin: ['Check-in bàn học, chứng minh tui có học 📸', 'Góc học tập hôm nay ✨', 'Đang chăm, đừng làm phiền 🤫'],
    kudos: ['Được thầy Night đóng mộc, khung ảnh liền 🖼️', 'Thầy khen đó, nói ít hiểu nhiều 😎']
  };
  function seenId(id) { if (!id) return false; var a = lsGet('nightFameSeen', []); if (a.indexOf(id) >= 0) return true; a.push(id); lsSet('nightFameSeen', a.slice(-300)); return false; }

  function record(ev) {
    ev.at = ev.at || Date.now();
    return me().then(function (u) {
      if (!u || u.role === 'admin') return null;
      var o = u.o, ref = o.fs.doc(o.db, 'fame', u.uid);
      return o.fs.getDoc(ref).then(function (s) {
        var f = s.exists() ? s.data() : {};
        f.name = u.name; f.photo = u.photo; f.total = f.total || {}; f.bestBand = f.bestBand || {}; f.badges = f.badges || {}; f.months = f.months || {};
        var today = dayKey(ev.at), prev = f.lastDay;
        if (ev.kind === 'kudos') {
          var nk = earned(f, ev).filter(function (id) { return !f.badges[id]; }); nk.forEach(function (id) { f.badges[id] = ev.at; });
          return o.fs.setDoc(ref, f).then(function () { return { f: f, news: nk, u: u }; });
        }
        if (prev !== today) {
          var gap = prev ? dayNum(today) - dayNum(prev) : 0;
          f.streak = gap === 1 ? (f.streak || 0) + 1 : 1;
          if (gap >= 7) ev.comeback = true;
          f.lastDay = today;
        }
        f.best = Math.max(f.best || 0, f.streak || 1);
        if (ev.kind !== 'kudos') f.total[ev.kind] = (f.total[ev.kind] || 0) + 1;
        if (ev.kind === 'checkin') f.checkins = (f.checkins || 0) + 1;
        if (ev.band) f.bestBand[ev.kind] = Math.max(f.bestBand[ev.kind] || 0, ev.band);
        var mk = today.slice(0, 6), m = f.months[mk] || { days: {}, k: {}, hours: [], bands: {} };
        m.days[today.slice(6)] = 1; if (ev.kind !== 'kudos') m.k[ev.kind] = (m.k[ev.kind] || 0) + 1;
        var h = hourVN(ev.at); m.hours[h] = (m.hours[h] || 0) + 1;
        for (var i = 0; i < 24; i++) if (m.hours[i] == null) m.hours[i] = 0;
        if (ev.band) m.bands[ev.kind] = Math.max(m.bands[ev.kind] || 0, ev.band);
        if (ev.kind === 'speaking' && ev.text && (ev.band || 0) >= (m.qb || 0)) { var q = bestSentence(ev.text); if (q) { m.quote = q; m.qb = ev.band || 0; } }
        m.maxStreak = Math.max(m.maxStreak || 0, f.streak || 1);
        f.months[mk] = m;
        var news = earned(f, ev).filter(function (id) { return !f.badges[id]; });
        news.forEach(function (id) { f.badges[id] = ev.at; });
        return o.fs.setDoc(ref, f).then(function () { return { f: f, news: news, u: u }; });
      });
    }).catch(function (e) { console.warn('[NightFame]', e); return null; });
  }
  function bestSentence(t) {
    var ss = (String(t).match(/[^.!?]+[.!?]+/g) || [String(t)]).map(function (x) { return x.trim(); }).filter(function (x) { var w = x.split(/\s+/).length; return w >= 6 && w <= 28; });
    ss.sort(function (a, b) { return b.length - a.length; });
    return ss[0] || '';
  }
  /* Gọi từ các trang: NightFame.event({kind, title, band, score, total, text, id}) */
  function event(ev) {
    if (!ev || !KIND[ev.kind]) return;
    if (seenId(ev.id)) return;
    record(ev).then(function (r) { if (r) celebrate(ev, r); });
  }

  /* ---------- Màn hình ăn mừng ---------- */
  var CSS = '.nf-ov{position:fixed;inset:0;z-index:100060;background:radial-gradient(circle at 50% 30%,rgba(78,82,190,.98),rgba(16,14,34,.99));display:flex;align-items:safe center;justify-content:center;padding:24px 16px;overflow-y:auto;font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:#fff;animation:nfIn .35s ease}' +
    '@keyframes nfIn{from{opacity:0}to{opacity:1}}@keyframes nfPop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}@keyframes nfGlow{0%,100%{text-shadow:0 0 30px rgba(255,190,90,.6)}50%{text-shadow:0 0 60px rgba(255,190,90,.95)}}' +
    '.nf-card{position:relative;width:100%;max-width:400px;text-align:center;animation:nfPop .55s cubic-bezier(.2,.9,.3,1.2)}' +
    '.nf-kind{display:inline-block;background:rgba(255,255,255,.14);border-radius:999px;padding:6px 14px;font-weight:800;font-size:13px;letter-spacing:.04em}' +
    '.nf-big{font-size:96px;line-height:1;font-weight:800;margin:14px 0 4px;color:#FFD38A;animation:nfGlow 2.4s ease infinite}' +
    '.nf-big.sm{font-size:64px}.nf-t{font-size:16px;opacity:.85;margin:0 0 14px;line-height:1.45}' +
    '.nf-stk{width:150px;height:150px;object-fit:contain;filter:drop-shadow(0 12px 24px rgba(0,0,0,.35))}' +
    '.nf-cap{font-size:20px;font-weight:800;line-height:1.35;margin:10px 0 14px}' +
    '.nf-chips{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:16px}.nf-chip{background:rgba(255,255,255,.14);border-radius:999px;padding:7px 12px;font-weight:800;font-size:13px}' +
    '.nf-badge{display:flex;align-items:center;gap:10px;text-align:left;background:#fff;color:#24242A;border-radius:18px;padding:8px 12px;margin:0 auto 8px;max-width:340px}.nf-badge img{width:44px;height:44px;object-fit:contain}.nf-badge small{display:block;font-weight:800;font-size:11px}.nf-badge b{font-size:14px}' +
    '.nf-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:6px}.nf-btn{border:0;cursor:pointer;font:800 14px inherit;font-family:inherit;padding:12px 18px;border-radius:999px;background:#fff;color:#24242A}.nf-btn.gold{background:linear-gradient(135deg,#F59E0B,#EA580C);color:#fff}.nf-btn.ghost{background:rgba(255,255,255,.14);color:#fff}' +
    '.nf-conf{position:fixed;inset:0;pointer-events:none;z-index:100061}' +
    /* hộp thoại sáng (tường lớp, huy hiệu) */
    '.nf-sh{position:fixed;inset:0;z-index:100055;background:rgba(36,36,42,.55);display:flex;align-items:flex-end;justify-content:center;font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:#24242A}' +
    '@media(min-width:700px){.nf-sh{align-items:center;padding:16px}}' +
    '.nf-pane{width:100%;max-width:640px;max-height:94vh;display:flex;flex-direction:column;background:#24242A;border-radius:28px 28px 0 0;padding:8px}@media(min-width:700px){.nf-pane{border-radius:28px}}' +
    '.nf-pin{background:#F6F5FB;border-radius:22px;overflow:auto;padding:16px}' +
    '.nf-hd{display:flex;align-items:center;gap:10px;margin-bottom:12px}.nf-hd h2{flex:1;margin:0;font-size:20px;font-weight:800}.nf-x{border:0;background:#E9E8F2;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer}' +
    '.nf-flame{display:flex;gap:10px;align-items:center;background:linear-gradient(135deg,#FFEDD5,#FDE68A);border-radius:18px;padding:12px 14px;margin-bottom:12px;font-size:14px;line-height:1.45}.nf-flame b.n{font-size:30px;font-weight:800;color:#C2410C}' +
    '.nf-post{background:#fff;border-radius:22px;padding:14px;margin-bottom:12px;box-shadow:0 10px 30px -22px rgba(36,36,42,.5)}' +
    '.nf-shot{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;border:0;cursor:pointer;background:#24242A;color:#fff;font:800 15px inherit;font-family:inherit;padding:14px;border-radius:18px}' +
    '.nf-shot.on{background:linear-gradient(135deg,#F59E0B,#EA580C);animation:nfGlowB 1.6s ease infinite}@keyframes nfGlowB{50%{box-shadow:0 0 0 6px rgba(245,158,11,.25)}}' +
    '.nf-inp{width:100%;box-sizing:border-box;border:1.5px solid #E5E5EE;border-radius:14px;padding:10px 12px;font:600 14px inherit;font-family:inherit;margin:10px 0}' +
    '.nf-pol{background:#fff;border-radius:6px;padding:10px 10px 14px;box-shadow:0 14px 30px -18px rgba(0,0,0,.45);position:relative}.nf-pol img.ph{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:3px;display:block;background:#eee}' +
    '.nf-pol .meta{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13px}.nf-pol .meta img{width:28px;height:28px;border-radius:50%;object-fit:cover}.nf-pol .meta b{flex:1}' +
    '.nf-pol .cap{font-size:14px;margin-top:6px;line-height:1.4}.nf-pol .tm{position:absolute;top:18px;left:18px;background:rgba(0,0,0,.6);color:#fff;font-weight:800;font-size:12px;padding:4px 9px;border-radius:999px}' +
    '.nf-pol .late{position:absolute;top:18px;right:18px;background:#E11D48;color:#fff;font-weight:800;font-size:12px;padding:4px 9px;border-radius:999px}.nf-pol .late.ok{background:#16A34A}' +
    '.nf-pol .stamp{position:absolute;right:16px;bottom:96px;transform:rotate(-12deg);border:3px solid #DC2626;color:#DC2626;font-weight:800;font-size:15px;padding:4px 10px;border-radius:8px;background:rgba(255,255,255,.75);letter-spacing:.03em}' +
    '.nf-wall{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}@media(max-width:420px){.nf-wall{grid-template-columns:minmax(0,1fr)}}.nf-pol{min-width:0}' +
    '.nf-rx{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}.nf-rx button{border:1.5px solid #EEE;background:#fff;border-radius:999px;padding:4px 9px;font-size:13px;cursor:pointer;font-family:inherit}.nf-rx button.me{border-color:#F59E0B;background:#FFF7ED}' +
    '.nf-day{font-weight:800;font-size:13px;color:#6B6B78;margin:14px 2px 8px}' +
    '.nf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}.nf-b{background:#fff;border-radius:18px;padding:12px 10px;text-align:center;border:2px solid transparent}.nf-b img{width:64px;height:64px;object-fit:contain}.nf-b b{display:block;font-size:13px;margin-top:6px}.nf-b small{display:block;font-size:11px;color:#6B6B78;margin-top:4px;line-height:1.35}.nf-b .r{display:inline-block;font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px;margin-top:6px}.nf-b.lock{opacity:.55}.nf-b.lock img{filter:grayscale(1) brightness(.4)}' +
    /* thanh trang chủ */
    '.nf-strip{display:flex;gap:10px;flex-wrap:wrap;align-items:stretch;margin:0 0 18px;font-family:"Plus Jakarta Sans",system-ui,sans-serif}' +
    '.nf-tile{flex:1;min-width:150px;display:flex;align-items:center;gap:10px;border:0;cursor:pointer;text-align:left;background:#fff;border-radius:22px;padding:12px 14px;box-shadow:0 10px 30px -22px rgba(36,36,42,.45);font-family:inherit;color:#24242A}' +
    '.nf-tile .e{font-size:28px}.nf-tile b{display:block;font-size:15px;font-weight:800}.nf-tile small{display:block;font-size:12px;color:#6B6B78}' +
    '.nf-tile.dark{background:#24242A;color:#fff}.nf-tile.dark small{color:#C9C9D6}.nf-tile.hot{background:linear-gradient(135deg,#F59E0B,#EA580C);color:#fff}.nf-tile.hot small{color:#FFEDD5}' +
    '.nf-sotw{flex-basis:100%;display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#FEF3C7,#FDE68A);border-radius:22px;padding:12px 14px;font-size:14px}.nf-sotw img.av{width:46px;height:46px;border-radius:50%;object-fit:cover;border:3px solid #F59E0B}' +
    /* Wrapped */
    '.nf-wr{position:fixed;inset:0;z-index:100062;display:flex;align-items:center;justify-content:center;background:#0F0E1A;font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:#fff}' +
    '.nf-sl{position:relative;width:100%;max-width:420px;height:100%;max-height:820px;display:flex;flex-direction:column;justify-content:center;padding:40px 28px;box-sizing:border-box;text-align:center;cursor:pointer;user-select:none}' +
    '.nf-sl .bars{position:absolute;top:14px;left:14px;right:14px;display:flex;gap:4px}.nf-sl .bars i{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.25)}.nf-sl .bars i.on{background:#fff}' +
    '.nf-sl h3{font-size:18px;font-weight:700;opacity:.85;margin:0 0 10px}.nf-sl .num{font-size:110px;font-weight:800;line-height:1;margin:6px 0}.nf-sl p{font-size:18px;line-height:1.5;margin:8px 0}.nf-sl .q{font-size:24px;font-weight:800;line-height:1.4;font-style:italic}' +
    '.nf-sl .cal{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin:18px auto 0;max-width:280px}.nf-sl .cal i{aspect-ratio:1;border-radius:6px;background:rgba(255,255,255,.12)}.nf-sl .cal i.on{background:#FFD38A}' +
    '.nf-sl .x{position:absolute;top:26px;right:16px;border:0;background:rgba(255,255,255,.15);color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer}';
  function css() { if (document.getElementById('nf-css')) return; var s = document.createElement('style'); s.id = 'nf-css'; s.textContent = CSS; document.head.appendChild(s); }

  function confetti() {
    var c = document.createElement('canvas'); c.className = 'nf-conf'; document.body.appendChild(c);
    var W = c.width = innerWidth, H = c.height = innerHeight, x = c.getContext('2d'), cols = ['#FFD38A', '#FF9E5E', '#6C70DC', '#F472B6', '#34D399', '#fff'];
    var ps = []; for (var i = 0; i < 160; i++) ps.push({ x: W / 2, y: H * .35, vx: (Math.random() - .5) * 16, vy: -Math.random() * 16 - 4, s: 5 + Math.random() * 7, c: pick(cols), r: Math.random() * 6, vr: (Math.random() - .5) * .3 });
    var t0 = performance.now();
    (function f(t) {
      x.clearRect(0, 0, W, H);
      ps.forEach(function (p) { p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); });
      if (t - t0 < 3200) requestAnimationFrame(f); else c.remove();
    })(t0);
  }
  function stickerOf(ev, news) {
    if (news && news.length) return BMAP[news[0]].i;
    return { reading: 'test_shiken_woman', listening: 'test_shiken_woman', speaking: 'ai_talk_woman', writing: 'book_sakubun_kodomo_girl', lesson: 'denkyuu_on', checkin: 'camera_film_2730', kudos: 'teacher_tensaku_woman' }[ev.kind] || 'trophy_school_boy';
  }
  function captionOf(ev, f) {
    var h = hourVN(ev.at);
    if (ev.kind === 'checkin') return pick(CAPS.checkin);
    if (ev.kind === 'kudos') return pick(CAPS.kudos);
    if (ev.band >= 7 || (ev.total >= 10 && ev.score / ev.total >= .85)) return pick(CAPS.high);
    if (h >= 23 || h < 4) return pick(CAPS.night);
    if (f && f.streak >= 3 && Math.random() < .5) return pick(CAPS.streak).replace('{n}', f.streak);
    return pick(CAPS.any);
  }
  function celebrate(ev, r) {
    css();
    var f = (r && r.f) || {}, news = (r && r.news) || [], u = (r && r.u) || {};
    var big = ev.big || (ev.band ? Number(ev.band).toFixed(1) : (ev.total && typeof ev.score === 'number' ? ev.score + '/' + ev.total : (ev.kind === 'checkin' ? '📸' : ev.kind === 'kudos' ? '🏅' : '✓')));
    var label = (KIND[ev.kind] || ['', ''])[1] + ' ' + (ev.kind === 'checkin' ? 'Check-in xong!' : ev.kind === 'kudos' ? 'Thầy Night khen bạn!' : (KIND[ev.kind][0] + (ev.band ? ' · Band' : ev.total && typeof ev.score === 'number' ? ' · Đúng' : ' · Hoàn thành')));
    var cap = ev.caption || captionOf(ev, f), st = stickerOf(ev, news);
    var data = { label: label, big: big, title: ev.title || '', cap: cap, sticker: st, streak: f.streak || 0, name: u.name || '', photo: u.photo || '', img: ev.img || '', news: news };
    var ov = document.createElement('div'); ov.className = 'nf-ov';
    ov.innerHTML = '<div class="nf-card"><span class="nf-kind">' + esc(label) + '</span>' +
      (ev.img ? '<div class="nf-pol" style="max-width:220px;margin:14px auto 4px;transform:rotate(-3deg)"><img class="ph" src="' + esc(ev.img) + '"></div>' : '<div class="nf-big' + (String(big).length > 4 ? ' sm' : '') + '">' + esc(big) + '</div>') +
      (ev.title ? '<p class="nf-t">' + esc(ev.title) + '</p>' : '') +
      (ev.img ? '' : '<img class="nf-stk" src="' + IRA + st + '.webp" alt="">') +
      '<div class="nf-cap">' + esc(cap) + '</div>' +
      '<div class="nf-chips">' + (f.streak ? '<span class="nf-chip">🔥 Chuỗi ' + f.streak + ' ngày</span>' : '') + (f.best > f.streak ? '<span class="nf-chip">Kỷ lục ' + f.best + '</span>' : '') + '</div>' +
      news.slice(0, 3).map(function (id) { var b = BMAP[id], rr = RAR[b.r]; return '<div class="nf-badge"><img src="' + IRA + b.i + '.webp" alt=""><div><small style="color:' + rr[1] + '">🏅 HUY HIỆU MỚI · ' + rr[0].toUpperCase() + '</small><b>' + esc(b.n) + '</b></div></div>'; }).join('') +
      (news.length > 3 ? '<p style="margin:0 0 10px;font-weight:800">+' + (news.length - 3) + ' huy hiệu nữa trong album 🏅</p>' : '') +
      '<div class="nf-btns"><button class="nf-btn gold" data-a="story">📸 Lưu ảnh story</button><button class="nf-btn ghost" data-a="close">Đóng</button></div></div>';
    ov.addEventListener('click', function (e) {
      var a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'close') ov.remove();
      if (a.dataset.a === 'story') { a.disabled = true; a.textContent = 'Đang tạo ảnh…'; story(data).then(function () { a.disabled = false; a.textContent = '📸 Lưu ảnh story'; }); }
    });
    document.body.appendChild(ov); confetti();
    try { navigator.vibrate && navigator.vibrate([30, 40, 60]); } catch (e) {}
  }

  /* ---------- Ảnh story 1080×1920 ---------- */
  function loadImg(src) { return new Promise(function (res) { if (!src) return res(null); var i = new Image(); i.crossOrigin = 'anonymous'; i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }
  function wrap(x, text, cx, y, maxW, lh) {
    var words = String(text).split(' '), line = '', lines = [];
    words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    lines.slice(0, 4).forEach(function (l, i) { x.fillText(l, cx, y + i * lh); });
    return y + Math.min(lines.length, 4) * lh;
  }
  function story(d) {
    var W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d'), F = '"Plus Jakarta Sans",system-ui,-apple-system,sans-serif';
    return Promise.all([loadImg(d.img ? d.img : IRA + d.sticker + '.webp'), loadImg(d.photo), document.fonts ? document.fonts.ready.catch(function () {}) : null]).then(function (im) {
      var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#16142B'); g.addColorStop(.55, '#4B4FB8'); g.addColorStop(1, '#FF9E5E');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.globalAlpha = .08; x.fillStyle = '#fff'; for (var i = 0; i < 60; i++) { x.beginPath(); x.arc((i * 197) % W, (i * 331) % H, 2 + (i % 4), 0, 7); x.fill(); } x.globalAlpha = 1;
      x.textAlign = 'center'; x.fillStyle = '#fff';
      x.font = '800 44px ' + F; x.fillText('🌙 Night IELTS', W / 2, 150);
      x.font = '700 40px ' + F; x.globalAlpha = .85; x.fillText(d.label, W / 2, 230); x.globalAlpha = 1;
      var y = 300;
      if (d.img && im[0]) {
        x.save(); x.translate(W / 2, 760); x.rotate(-.05); x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,.4)'; x.shadowBlur = 50; x.fillRect(-330, -430, 660, 860); x.shadowBlur = 0;
        var iw = im[0].width, ih = im[0].height, s = Math.max(620 / iw, 760 / ih); x.beginPath(); x.rect(-310, -410, 620, 760); x.clip();
        x.drawImage(im[0], -iw * s / 2, -410 + (760 - ih * s) / 2, iw * s, ih * s); x.restore();
        y = 1230;
      } else {
        x.font = '800 ' + (String(d.big).length > 4 ? 230 : 330) + 'px ' + F; x.fillStyle = '#FFD38A'; x.shadowColor = 'rgba(255,190,90,.8)'; x.shadowBlur = 60;
        x.fillText(d.big, W / 2, 620); x.shadowBlur = 0;
        if (im[0]) { var r = Math.min(380 / im[0].width, 380 / im[0].height); x.drawImage(im[0], W / 2 - im[0].width * r / 2, 700, im[0].width * r, im[0].height * r); }
        y = 1160;
      }
      x.fillStyle = '#fff';
      if (d.title) { x.font = '600 40px ' + F; x.globalAlpha = .85; y = wrap(x, d.title, W / 2, y, 900, 54) + 30; x.globalAlpha = 1; }
      x.font = '800 62px ' + F; y = wrap(x, d.cap, W / 2, y + 30, 920, 80) + 40;
      if (d.streak) { x.font = '800 48px ' + F; var tx = '🔥 Chuỗi ' + d.streak + ' ngày', tw = x.measureText(tx).width + 70; x.fillStyle = 'rgba(255,255,255,.16)'; roundRect(x, W / 2 - tw / 2, y, tw, 90, 45); x.fill(); x.fillStyle = '#fff'; x.fillText(tx, W / 2, y + 63); y += 130; }
      if (d.news && d.news.length) { x.font = '700 40px ' + F; wrap(x, '🏅 Huy hiệu mới: ' + d.news.map(function (id) { return BMAP[id].n; }).join(' · '), W / 2, Math.min(y + 20, 1640), 940, 52); }
      if (im[1]) { x.save(); x.beginPath(); x.arc(W / 2 - 250, 1810, 42, 0, 7); x.clip(); x.drawImage(im[1], W / 2 - 292, 1768, 84, 84); x.restore(); }
      x.font = '800 40px ' + F; x.textAlign = 'left'; x.fillText(d.name || 'Night IELTS', W / 2 - 190, 1800);
      x.font = '600 32px ' + F; x.globalAlpha = .8; x.fillText('nightielts.id.vn · ' + new Date().toLocaleDateString('vi-VN'), W / 2 - 190, 1846); x.globalAlpha = 1;
      return new Promise(function (res) { c.toBlob(res, 'image/png'); });
    }).then(function (blob) {
      var file = new File([blob], 'night-ielts-' + Date.now() + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) return navigator.share({ files: [file] }).catch(function () {});
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 1000);
    });
  }
  function roundRect(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }

  /* ---------- Hộp thoại sáng ---------- */
  function sheet(title, html) {
    css();
    var ov = document.createElement('div'); ov.className = 'nf-sh';
    ov.innerHTML = '<div class="nf-pane"><div class="nf-pin"><div class="nf-hd"><h2>' + title + '</h2><button class="nf-x" aria-label="Đóng">×</button></div><div class="nf-body">' + html + '</div></div></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.nf-x')) ov.remove(); });
    document.body.appendChild(ov);
    return ov;
  }

  /* ---------- Night Check-in + Tường lớp ---------- */
  function shrink(file, max, q) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { var im = new Image(); im.onload = function () { var s = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', q)); }; im.onerror = rej; im.src = fr.result; };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }
  function moment(o) { return o.fs.getDoc(o.fs.doc(o.db, 'publicSettings', 'checkin')).then(function (s) { var d = s.exists() ? s.data() : null; return d && d.day === dayKey() ? d : null; }).catch(function () { return null; }); }
  function flame(o) {
    var since = dayKey(Date.now() - 31 * 864e5);
    return o.fs.getDocs(o.fs.query(o.fs.collection(o.db, 'checkinDays'), o.fs.where('day', '>=', since))).then(function (s) {
      var by = {}, active = {}, cut = dayKey(Date.now() - 14 * 864e5);
      s.forEach(function (d) { var x = d.data(), n = Object.keys(x.uids || {}); by[x.day] = n.length; if (x.day >= cut) n.forEach(function (u) { active[u] = 1; }); });
      var need = Math.max(2, Math.ceil(Object.keys(active).length * .5)), k = 0, t = dayNum(dayKey());
      if ((by[keyOfNum(t)] || 0) < need) t--;
      while ((by[keyOfNum(t)] || 0) >= need) { k++; t--; }
      return { streak: k, today: by[dayKey()] || 0, need: need, members: Object.keys(active).length };
    }).catch(function () { return { streak: 0, today: 0, need: 2, members: 0 }; });
  }
  function openCheckin() {
    var ov = sheet('📸 Night Check-in', '<p style="color:#6B6B78">Đang tải…</p>'), body = ov.querySelector('.nf-body');
    me().then(function (u) {
      if (!u) { body.innerHTML = '<p>Đăng nhập bằng Gmail ở trang chủ để check-in nhé.</p>'; return; }
      var o = u.o, today = dayKey(), myRef = o.fs.doc(o.db, 'checkins', u.uid + '_' + today), isT = u.role === 'admin';
      Promise.all([moment(o), flame(o), o.fs.getDoc(myRef).catch(function () { return null; })]).then(function (r) {
        var mo = r[0], fl = r[1], mine = r[2] && r[2].exists() ? r[2].data() : null;
        var open = mo && Date.now() - mo.at < CHECKIN_WINDOW;
        body.innerHTML = '<div class="nf-flame"><img src="' + IRA + 'friends_kids_7874.webp" style="width:54px;height:54px;object-fit:contain"><div style="flex:1"><b class="n">🔥 ' + fl.streak + '</b> ngày <b>Lửa lớp</b><br><span style="color:#9A3412">Hôm nay ' + fl.today + '/' + fl.need + ' bạn đã check-in. Đủ ' + fl.need + ' bạn thì lửa lớp cháy thêm 1 ngày, thiếu là tắt cả lớp 😱</span></div></div>' +
          (isT ? '<div class="nf-post"><b>Thầy</b> xem tường lớp bên dưới, bấm <b>Đóng mộc</b> để khen. ' + '<button class="nf-btn gold" data-a="sotw" style="margin-top:8px">⭐ Chọn Học sinh của tuần</button></div>'
            : '<div class="nf-post" id="nf-me">' + (mine ? '<b>✅ Hôm nay bạn đã check-in lúc ' + hm(mine.ts) + '</b>' + (mine.ontime ? ' · ⚡ đúng giờ vàng' : '') + '<br><span style="color:#6B6B78;font-size:13px">Chụp lại sẽ thay ảnh cũ.</span>' :
              (open ? '<b style="color:#C2410C">⏰ Chuông check-in đang reo! Còn ' + Math.ceil((mo.at + CHECKIN_WINDOW - Date.now()) / 60000) + ' phút để lấy huy hiệu Đúng giờ vàng</b>' : '<b>Chụp góc học tập hôm nay</b><br><span style="color:#6B6B78;font-size:13px">Bàn học, vở, màn hình đang làm bài… Chỉ chụp mới, không chọn ảnh cũ.</span>')) +
              '<input type="file" accept="image/*" capture="environment" id="nf-cam" hidden><button class="nf-shot' + (open && !mine ? ' on' : '') + '" data-a="cam" style="margin-top:10px">📷 ' + (mine ? 'Chụp lại' : 'Chụp check-in') + '</button><div id="nf-prev"></div></div>') +
          '<div id="nf-wall"><p style="color:#6B6B78">Đang tải tường lớp…</p></div>';
        var cam = body.querySelector('#nf-cam'), shot = null;
        body.addEventListener('click', function (e) {
          var a = e.target.closest('[data-a]'); if (!a) return;
          if (a.dataset.a === 'cam') cam.click();
          if (a.dataset.a === 'sotw') pickSotw(o);
          if (a.dataset.a === 'post') post(a);
        });
        if (cam) cam.onchange = function () {
          var f = cam.files && cam.files[0]; if (!f) return;
          if (f.lastModified && Date.now() - f.lastModified > 10 * 60000) { body.querySelector('#nf-prev').innerHTML = '<p style="color:#E11D48;font-weight:700;margin:10px 0 0">Ảnh này cũ rồi nha 😏 Check-in phải chụp mới ngay lúc này.</p>'; cam.value = ''; return; }
          shrink(f, 720, .62).then(function (url) {
            shot = url;
            body.querySelector('#nf-prev').innerHTML = '<div class="nf-pol" style="max-width:260px;margin:12px auto 0"><img class="ph" src="' + url + '"></div>' +
              '<input class="nf-inp" id="nf-cap" maxlength="80" placeholder="Đang học gì nè? (vd: cày Cam 15 Listening 🎧)">' +
              '<button class="nf-shot on" data-a="post">🚀 Đăng lên tường lớp</button>';
          });
        };
        function post(btn) {
          if (!shot) return; btn.disabled = true; btn.textContent = 'Đang đăng…';
          var now = Date.now(), ontime = !!(mo && now - mo.at >= 0 && now - mo.at < CHECKIN_WINDOW), late = !!(mo && now - mo.at >= CHECKIN_WINDOW);
          var cap = (body.querySelector('#nf-cap').value || '').trim();
          o.fs.getDoc(o.fs.doc(o.db, 'fame', u.uid)).then(function (s) { return s.exists() ? (s.data().streak || 0) : 0; }).catch(function () { return 0; }).then(function (stk) {
            var dayRef = o.fs.doc(o.db, 'checkinDays', today), upd = { day: today, uids: {} }; upd.uids[u.uid] = 1;
            return Promise.all([
              o.fs.setDoc(myRef, { uid: u.uid, name: u.name, photo: u.photo, img: shot, caption: cap, day: today, ts: now, ontime: ontime, late: late, streak: stk + (mine ? 0 : 1), reacts: {} }),
              o.fs.setDoc(dayRef, upd, { merge: true })
            ]);
          }).then(function () {
            ov.remove();
            event({ kind: 'checkin', id: 'ci_' + today + (mine ? '_' + now : ''), title: cap || 'Góc học tập hôm nay', img: shot, ontime: ontime });
          }).catch(function (e) { btn.disabled = false; btn.textContent = '🚀 Đăng lên tường lớp'; alert('Chưa đăng được (' + (e.code || e.message) + ')'); });
        }
        loadWall(o, u, body.querySelector('#nf-wall'));
      });
    });
  }
  function loadWall(o, u, el) {
    var since = dayKey(Date.now() - 864e5);
    o.fs.getDocs(o.fs.query(o.fs.collection(o.db, 'checkins'), o.fs.where('day', '>=', since))).then(function (s) {
      var arr = []; s.forEach(function (d) { var x = d.data(); x.id = d.id; arr.push(x); });
      arr.sort(function (a, b) { return b.ts - a.ts; });
      if (!arr.length) { el.innerHTML = '<p style="color:#6B6B78;text-align:center;margin:20px 0">Chưa ai check-in. Làm người đầu tiên đi 🔥</p>'; return; }
      var days = {}; arr.forEach(function (x) { (days[x.day] = days[x.day] || []).push(x); });
      var isT = u.role === 'admin';
      el.innerHTML = Object.keys(days).sort().reverse().map(function (d) {
        return '<div class="nf-day">' + (d === dayKey() ? 'HÔM NAY' : 'HÔM QUA') + ' · ' + days[d].length + ' bạn</div><div class="nf-wall">' + days[d].map(function (x) {
          var rx = x.reacts || {}, cnt = {}; Object.keys(rx).forEach(function (k) { cnt[rx[k]] = (cnt[rx[k]] || 0) + 1; });
          return '<div class="nf-pol" data-id="' + esc(x.id) + '"><img class="ph" src="' + esc(x.img) + '" loading="lazy"><span class="tm">' + hm(x.ts) + '</span>' +
            (x.ontime ? '<span class="late ok">⚡ đúng giờ</span>' : x.late ? '<span class="late">trễ 😴</span>' : '') +
            (x.stamp ? '<span class="stamp">' + esc(x.stamp.text) + '</span>' : '') +
            '<div class="meta"><img src="' + esc(x.photo || '') + '" onerror="this.style.visibility=\'hidden\'"><b>' + esc(x.name || '') + '</b>' + (x.streak ? '<span>🔥' + x.streak + '</span>' : '') + '</div>' +
            (x.caption ? '<div class="cap">' + esc(x.caption) + '</div>' : '') +
            '<div class="nf-rx">' + ['🔥', '😭', '👏'].map(function (e) { return '<button data-rx="' + e + '"' + (rx[u.uid] === e ? ' class="me"' : '') + '>' + e + ' ' + (cnt[e] || '') + '</button>'; }).join('') +
            (isT ? '<button data-stamp="1" style="border-color:#DC2626;color:#DC2626;font-weight:800">' + (x.stamp ? '✓ Đã đóng mộc' : '🏅 Đóng mộc') + '</button>' : '') + '</div></div>';
        }).join('') + '</div>';
      }).join('');
      el.onclick = function (e) {
        var card = e.target.closest('.nf-pol'); if (!card) return;
        var id = card.dataset.id, x = arr.filter(function (y) { return y.id === id; })[0]; if (!x) return;
        var b = e.target.closest('[data-rx]');
        if (b) {
          var v = b.dataset.rx; x.reacts = x.reacts || {}; if (x.reacts[u.uid] === v) delete x.reacts[u.uid]; else x.reacts[u.uid] = v;
          var p = {}; p['reacts.' + u.uid] = x.reacts[u.uid] || o.fs.deleteField();
          o.fs.updateDoc(o.fs.doc(o.db, 'checkins', id), p).catch(function () {});
          loadWall(o, u, el);
        }
        if (e.target.closest('[data-stamp]') && !x.stamp) {
          var text = pick(['THẦY DUYỆT ✓', 'ĐỈNH 🔥', 'CHĂM QUÁ ✓', '10 ĐIỂM ✓']);
          Promise.all([
            o.fs.updateDoc(o.fs.doc(o.db, 'checkins', id), { stamp: { text: text, at: Date.now() } }),
            giveKudos(o, x.uid, 'Thầy đóng mộc “' + text + '” lên check-in của bạn', 'kudos')
          ]).then(function () { loadWall(o, u, el); }).catch(function (er) { alert('Lỗi: ' + (er.code || er.message)); });
        }
      };
    }).catch(function (e) { el.innerHTML = '<p style="color:#E11D48">Không tải được tường lớp (' + esc(e.code || e.message) + ')</p>'; });
  }
  function giveKudos(o, uid, text, type) {
    return o.fs.setDoc(o.fs.doc(o.db, 'fame', uid), { kudos: o.fs.arrayUnion({ at: Date.now(), text: text, type: type || 'kudos' }) }, { merge: true });
  }
  function pickSotw(o) {
    var ov = sheet('⭐ Học sinh của tuần', '<p style="color:#6B6B78">Đang tải danh sách…</p>'), body = ov.querySelector('.nf-body');
    o.fs.getDocs(o.fs.query(o.fs.collection(o.db, 'users'), o.fs.where('role', '==', 'student'))).then(function (s) {
      var us = []; s.forEach(function (d) { var x = d.data(); x.uid = d.id; us.push(x); }); us.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
      body.innerHTML = '<select class="nf-inp" id="nf-su">' + us.map(function (x) { return '<option value="' + esc(x.uid) + '">' + esc(x.name || x.email) + '</option>'; }).join('') + '</select>' +
        '<input class="nf-inp" id="nf-sn" maxlength="90" placeholder="Lời khen (vd: Check-in 7/7 ngày, Speaking lên 6.5 🔥)">' +
        '<button class="nf-shot on" id="nf-sok">⭐ Vinh danh</button>';
      body.querySelector('#nf-sok').onclick = function () {
        var uid = body.querySelector('#nf-su').value, x = us.filter(function (y) { return y.uid === uid; })[0], note = body.querySelector('#nf-sn').value.trim();
        Promise.all([
          o.fs.setDoc(o.fs.doc(o.db, 'publicSettings', 'main'), { sotw: { uid: uid, name: x.name || '', photo: x.photo || '', note: note, at: Date.now() } }, { merge: true }),
          giveKudos(o, uid, 'Bạn là Học sinh của tuần! ' + note, 'sotw')
        ]).then(function () { ov.remove(); alert('Đã vinh danh ' + (x.name || '') + ' 🎉'); }).catch(function (e) { alert('Lỗi: ' + (e.code || e.message)); });
      };
    });
  }

  /* ---------- Album huy hiệu ---------- */
  function openBadges() {
    var ov = sheet('🏅 Album huy hiệu', '<p style="color:#6B6B78">Đang tải…</p>'), body = ov.querySelector('.nf-body');
    me().then(function (u) {
      if (!u) { body.innerHTML = '<p>Đăng nhập để xem huy hiệu.</p>'; return; }
      return u.o.fs.getDoc(u.o.fs.doc(u.o.db, 'fame', u.uid)).then(function (s) {
        var f = s.exists() ? s.data() : {}, got = f.badges || {}, n = Object.keys(got).length;
        body.innerHTML = '<p style="margin:0 0 12px;color:#6B6B78">Đã có <b style="color:#24242A">' + n + '/' + BADGES.length + '</b> · Chuỗi hiện tại 🔥 ' + (f.streak || 0) + ' · Kỷ lục ' + (f.best || 0) + ' ngày</p><div class="nf-grid">' +
          BADGES.map(function (b) {
            var has = got[b.id], rr = RAR[b.r], hid = !has && b.h;
            return '<div class="nf-b' + (has ? '' : ' lock') + '" style="' + (has ? 'border-color:' + rr[1] : '') + '"><img src="' + IRA + b.i + '.webp" alt=""><b>' + (hid ? '???' : esc(b.n)) + '</b><small>' + (hid ? 'Huy hiệu ẩn, tự khám phá nha 👀' : esc(b.d)) + '</small><span class="r" style="color:' + rr[1] + ';background:' + rr[2] + '">' + rr[0] + '</span>' + (has ? '<small>' + new Date(has).toLocaleDateString('vi-VN') + '</small>' : '') + '</div>';
          }).join('') + '</div>';
      });
    });
  }

  /* ---------- Night Wrapped ---------- */
  var MONTHS = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  function persona(m) {
    var k = m.k || {}, h = m.hours || [], sum = function (a, b) { var s = 0; for (var i = a; i < b; i++) s += h[i % 24] || 0; return s; };
    var tot = 0; h.forEach(function (x) { tot += x || 0; });
    var nd = Object.keys(m.days || {}).length;
    if (tot && sum(22, 27) / tot >= .4) return ['Cú Đêm Bất Khuất 🦉', 'Thế giới ngủ, bạn học. Đỉnh nhưng nhớ ngủ nha.', 'animal_chara_fukurou_hakase'];
    if (tot && sum(5, 9) / tot >= .35) return ['Chim Sớm Có Sâu 🐦', 'Học trước khi cả nhà dậy. Kỷ luật thép.', 'bird_kyukanchou_girl_5003'];
    if (nd >= 20) return ['Đồng Hồ Thụy Sĩ ⏱️', 'Gần như ngày nào cũng học. Ổn định đáng sợ.', 'kitchen_timer'];
    var top = Object.keys(k).filter(function (x) { return x !== 'checkin'; }).sort(function (a, b) { return k[b] - k[a]; })[0];
    if (top === 'speaking') return ['Thánh Nói 🗣️', 'Mic là bạn, AI là khán giả trung thành.', 'ai_talk_woman'];
    if (top === 'writing') return ['Ngòi Bút Vàng ✍️', 'Viết nhiều tới mức AI cũng phải nể.', 'book_sakubun_kodomo_girl'];
    if (top === 'reading' || top === 'listening') return ['Thợ Săn Đề 🎯', 'Đề nào cũng xử, không chừa đề nào.', 'test_shiken_woman'];
    if (top === 'lesson') return ['Mọt Bài Giảng 📚', 'Bài nào thầy dạy cũng thuộc.', 'denkyuu_on'];
    return ['Chiến Binh Thầm Lặng 🥷', 'Ít nói, học đều, bất ngờ bùng nổ.', 'jibun_migaki_man_0425'];
  }
  function openWrapped(mk) {
    css();
    me().then(function (u) {
      if (!u) return alert('Đăng nhập để xem Wrapped nhé.');
      return u.o.fs.getDoc(u.o.fs.doc(u.o.db, 'fame', u.uid)).then(function (s) {
        var f = s.exists() ? s.data() : {}, months = f.months || {};
        mk = mk || Object.keys(months).sort().pop();
        var m = months[mk];
        if (!m) return alert('Chưa có dữ liệu học tháng này. Làm vài bài rồi quay lại nha 😉');
        var y = +mk.slice(0, 4), mo = +mk.slice(4, 6), dim = new Date(y, mo, 0).getDate(), first = (new Date(y, mo - 1, 1).getDay() + 6) % 7;
        var nd = Object.keys(m.days || {}).length, k = m.k || {}, acts = 0; Object.keys(k).forEach(function (x) { acts += k[x]; });
        var p = persona(m), b = m.bands || {}, bandRows = ['reading', 'listening', 'speaking', 'writing'].filter(function (x) { return b[x]; });
        var cal = ''; for (var i = 0; i < first; i++) cal += '<i style="background:none"></i>'; for (var dd = 1; dd <= dim; dd++) cal += '<i class="' + (m.days[('0' + dd).slice(-2)] ? 'on' : '') + '"></i>';
        var BG = ['#1E1B4B', '#7C2D12', '#064E3B', '#4C1D95', '#831843', '#1E3A8A', '#0F0E1A'];
        var slides = [
          '<h3>Night Wrapped</h3><div class="num" style="font-size:72px">' + MONTHS[mo] + '</div><p>của <b>' + esc(u.name) + '</b></p><p style="opacity:.7;margin-top:40px">Chạm để xem tiếp 👉</p>',
          '<h3>Bạn đã học</h3><div class="num">' + nd + '</div><p>ngày trong ' + dim + ' ngày</p><div class="cal">' + cal + '</div>',
          '<h3>Tổng cộng</h3><div class="num">' + acts + '</div><p>hoạt động học</p><p style="opacity:.85">' + Object.keys(k).map(function (x) { return (KIND[x] || ['', ''])[1] + ' ' + k[x] + ' ' + (KIND[x] || [x])[0]; }).join(' · ') + '</p>',
          '<h3>Chuỗi dài nhất tháng</h3><div class="num">🔥' + (m.maxStreak || 1) + '</div><p>ngày liên tiếp không bỏ học</p>',
          bandRows.length ? '<h3>Band cao nhất tháng</h3>' + bandRows.map(function (x) { return '<p style="font-size:24px"><b>' + KIND[x][1] + ' ' + KIND[x][0] + ': <span style="color:#FFD38A">' + Number(b[x]).toFixed(1) + '</span></b></p>'; }).join('') : '',
          m.quote ? '<h3>Câu nói hay nhất tháng của bạn</h3><p class="q">“' + esc(m.quote) + '”</p><p style="opacity:.7">— Speaking, band ' + Number(m.qb || 0).toFixed(1) + '</p>' : '',
          '<h3>Tính cách học của bạn là</h3><img src="' + IRA + p[2] + '.webp" style="width:160px;height:160px;object-fit:contain;margin:10px auto"><div class="num" style="font-size:38px;line-height:1.25">' + esc(p[0]) + '</div><p>' + esc(p[1]) + '</p><button class="nf-btn gold" data-a="story" style="margin-top:16px">📸 Lưu ảnh story</button>'
        ].filter(Boolean);
        var ov = document.createElement('div'), idx = 0; ov.className = 'nf-wr';
        function paint() {
          ov.style.background = BG[idx % BG.length];
          ov.innerHTML = '<div class="nf-sl"><div class="bars">' + slides.map(function (_, i) { return '<i class="' + (i <= idx ? 'on' : '') + '"></i>'; }).join('') + '</div><button class="x" data-a="x">×</button>' + slides[idx] + '</div>';
        }
        ov.addEventListener('click', function (e) {
          var a = e.target.closest('[data-a]');
          if (a && a.dataset.a === 'x') return ov.remove();
          if (a && a.dataset.a === 'story') return story({ label: 'Night Wrapped · ' + MONTHS[mo], big: nd + ' ngày', title: acts + ' hoạt động · chuỗi dài nhất ' + (m.maxStreak || 1) + ' ngày', cap: 'Tính cách học: ' + p[0], sticker: p[2], streak: 0, name: u.name, photo: u.photo });
          var r = ov.querySelector('.nf-sl').getBoundingClientRect();
          idx = e.clientX < r.left + r.width / 3 ? Math.max(0, idx - 1) : Math.min(slides.length - 1, idx + 1); paint();
        });
        paint(); document.body.appendChild(ov);
      });
    });
  }

  /* ---------- Thanh "hôm nay" ở trang chủ + lời khen chưa xem ---------- */
  function mount(el) {
    if (!el) return;
    css();
    me().then(function (u) {
      if (!u) { el.innerHTML = ''; return; }
      var o = u.o, isT = u.role === 'admin';
      Promise.all([
        isT ? Promise.resolve({}) : o.fs.getDoc(o.fs.doc(o.db, 'fame', u.uid)).then(function (s) { return s.exists() ? s.data() : {}; }).catch(function () { return {}; }),
        o.fs.getDoc(o.fs.doc(o.db, 'publicSettings', 'main')).then(function (s) { return s.exists() ? s.data() : {}; }).catch(function () { return {}; }),
        o.fs.getDoc(o.fs.doc(o.db, 'checkins', u.uid + '_' + dayKey())).then(function (s) { return s.exists(); }).catch(function () { return false; }),
        moment(o)
      ]).then(function (r) {
        var f = r[0], ps = r[1], did = r[2], mo = r[3], sw = ps.sotw;
        var alive = f.lastDay && dayNum(dayKey()) - dayNum(f.lastDay) <= 1, stk = alive ? (f.streak || 0) : 0;
        var ring = mo && !did && Date.now() - mo.at < CHECKIN_WINDOW;
        var nb = Object.keys(f.badges || {}).length, mk = dayKey().slice(0, 6);
        el.innerHTML = '<div class="nf-strip">' +
          (sw && Date.now() - sw.at < 8 * 864e5 ? '<div class="nf-sotw"><img class="av" src="' + esc(sw.photo || '') + '" onerror="this.style.visibility=\'hidden\'"><div style="flex:1"><b>⭐ Học sinh của tuần: ' + esc(sw.name) + '</b><br><span style="color:#92400E">' + esc(sw.note || 'Được thầy Night vinh danh 🎉') + '</span></div><img src="' + IRA + 'trophy_school_boy.webp" style="width:52px;height:52px;object-fit:contain"></div>' : '') +
          (isT ? '' : '<button class="nf-tile dark" data-a="badges"><span class="e">🔥</span><span><b>' + stk + ' ngày' + (stk && f.lastDay !== dayKey() ? ' · học ngay kẻo tắt!' : '') + '</b><small>Chuỗi học · kỷ lục ' + (f.best || 0) + '</small></span></button>') +
          '<button class="nf-tile' + (ring ? ' hot' : '') + '" data-a="checkin"><span class="e">📸</span><span><b>' + (isT ? 'Tường lớp' : did ? 'Đã check-in ✓' : ring ? 'Chuông check-in đang reo!' : 'Check-in hôm nay') + '</b><small>' + (isT ? 'Xem ảnh, đóng mộc khen' : 'Chụp góc học, giữ lửa lớp') + '</small></span></button>' +
          (isT ? '' : '<button class="nf-tile" data-a="badges"><span class="e">🏅</span><span><b>' + nb + '/' + BADGES.length + ' huy hiệu</b><small>Mở album</small></span></button>' +
            '<button class="nf-tile" data-a="wrapped"><span class="e">🎁</span><span><b>Night Wrapped</b><small>' + MONTHS[+mk.slice(4)] + ' của bạn</small></span></button>') +
          '</div>';
        el.onclick = function (e) {
          var a = e.target.closest('[data-a]'); if (!a) return;
          if (a.dataset.a === 'checkin') openCheckin(); if (a.dataset.a === 'badges') openBadges(); if (a.dataset.a === 'wrapped') openWrapped();
        };
        if (/[?&]checkin=1/.test(location.search) && !window.__nfAutoCI) { window.__nfAutoCI = true; openCheckin(); }
        /* Lời khen mới từ thầy → ăn mừng + huy hiệu */
        if (!isT) {
          var seen = f.kudosSeen || 0, fresh = (f.kudos || []).filter(function (k) { return k.at > seen; });
          if (fresh.length) {
            var k = fresh[fresh.length - 1];
            o.fs.setDoc(o.fs.doc(o.db, 'fame', u.uid), { kudosSeen: Date.now() }, { merge: true }).then(function () {
              record({ kind: 'kudos', type: k.type, at: Date.now() }).then(function (rr) { celebrate({ kind: 'kudos', title: k.text, at: Date.now(), big: k.type === 'sotw' ? '⭐' : '🏅' }, rr); });
            });
          }
        }
      });
    });
  }

  window.NightFame = { event: event, celebrate: celebrate, openCheckin: openCheckin, openBadges: openBadges, openWrapped: openWrapped, mount: mount, BADGES: BADGES, story: story };
  var auto = document.getElementById('night-fame-strip'); if (auto) mount(auto);
})();
