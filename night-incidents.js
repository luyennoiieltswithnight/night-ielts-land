/* Night IELTS — SỰ CỐ TÀI KHOẢN (chỉ giáo viên thấy, trang chủ, Khu giáo viên)
   night-plan.js ghi vào incidents/ mỗi khi: người đã có Pro/Astra/khoá học vẫn bị đòi nâng cấp,
   hoặc máy chủ AI từ chối người đã trả tiền. Ô này hiện ngay lập tức (realtime) + chuông đỏ.
   NightIncidents.mount(el, { db, collection, query, where, onSnapshot, doc, updateDoc }) */
(function () {
  var KIND = {
    upgrade_prompt_but_paid: 'Đã có gói nhưng web vẫn mời nâng cấp',
    course_locked_but_paid: 'Đã mua / có Astra nhưng khoá học vẫn khoá',
    ai_denied_but_paid: 'Đã trả tiền nhưng AI báo hết lượt / cần Pro'
  };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var vt = function (t) { var d = new Date(Number(t) + 7 * 3600e3).toISOString(); return d.slice(11, 16) + ' ' + d.slice(8, 10) + '/' + d.slice(5, 7); };
  function css() {
    if (document.getElementById('ninc-css')) return;
    var s = document.createElement('style'); s.id = 'ninc-css';
    s.textContent = '.ninc{border-radius:22px;padding:14px 16px;margin-bottom:12px;background:#ECFDF5;color:#065F46;font-weight:700;font-size:13.5px;display:flex;align-items:center;gap:10px}' +
      '.ninc.bad{display:block;background:#FEF2F2;color:#7F1D1D;border:1.5px solid #FCA5A5}' +
      '.ninc h4{margin:0 0 8px;font-size:15px;display:flex;align-items:center;gap:8px}.ninc h4 i{font-style:normal;background:#DC2626;color:#fff;border-radius:999px;padding:1px 8px;font-size:12px}' +
      '.ninc-it{background:#fff;border-radius:14px;padding:9px 11px;margin-top:6px;display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;font-weight:600;color:#3F3F46}' +
      '.ninc-it b{color:#111}.ninc-it small{display:block;color:#71717A;font-weight:600;font-size:12px;margin-top:2px;word-break:break-all}' +
      '.ninc-it .w{flex:1;min-width:220px}.ninc-b{border:0;border-radius:999px;padding:6px 12px;font:800 12px "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer;background:#24242A;color:#fff;text-decoration:none}' +
      '.ninc-b.g{background:#fff;color:#24242A;box-shadow:inset 0 0 0 1px #E4E4EC}';
    document.head.appendChild(s);
  }
  function mount(el, o) {
    if (!el || !o || !o.db) return; css();
    var q = o.query(o.collection(o.db, 'incidents'), o.where('seen', '==', false));
    o.onSnapshot(q, function (sn) {
      var L = []; sn.forEach(function (d) { L.push(Object.assign({ id: d.id }, d.data())); });
      L.sort(function (a, b) { return b.at - a.at; });
      if (!L.length) { el.innerHTML = '<div class="ninc">✓ Không có sự cố tài khoản nào. Web đang báo đúng quyền cho mọi người.</div>'; return; }
      el.innerHTML = '<div class="ninc bad"><h4>Sự cố tài khoản cần xem <i>' + L.length + '</i></h4>' +
        '<div style="font-weight:600;font-size:12.5px">Web đã tự cập nhật lại quyền và tải lại trang cho người đó. Bạn kiểm tra lại gói của họ trong 👑 Tài khoản / Đơn hàng, xong bấm "Đã xử lý".</div>' +
        L.slice(0, 12).map(function (x) {
          return '<div class="ninc-it"><div class="w"><b>' + esc(x.name || x.email) + '</b> · ' + esc(KIND[x.kind] || x.kind) +
            '<small>' + esc(x.email) + ' · ' + vt(x.at) + ' · trang ' + esc(x.page) + (x.reason ? ' · ' + esc(x.reason) : '') +
            ' · lúc đó: ' + esc(x.role || '?') + (x.tier ? '/' + esc(x.tier) : '') + (x.proUntil ? ' đến ' + new Date(x.proUntil).toLocaleDateString('vi-VN') : '') + '</small></div>' +
            '<a class="ninc-b g" href="don-hang.html">Xem đơn</a><button class="ninc-b" data-seen="' + x.id + '">Đã xử lý</button></div>';
        }).join('') + '</div>';
    }, function (e) { console.warn('Sự cố:', e); });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-seen]'); if (!b) return;
      b.disabled = true; o.updateDoc(o.doc(o.db, 'incidents', b.dataset.seen), { seen: true, seenAt: Date.now() }).catch(function (er) { alert(er.message); });
    });
  }
  window.NightIncidents = { mount: mount };
})();
