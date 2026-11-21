/* Night IELTS — CHI PHÍ & HOÁ ĐƠN (chỉ giáo viên thấy, trang chủ)
   Danh sách các dịch vụ web đang trả tiền: số tiền, chu kỳ, ngày phải trả tiếp theo, link trang thanh toán.
   Còn ≤ 7 ngày thì đỏ. Bấm "Đã trả" -> tự dời sang kỳ sau. Sửa / thêm / xoá ngay tại chỗ.
   Lưu: Firestore payments/__costs (khối payments chỉ admin đọc/ghi).
   NightCosts.mount(el, { db, doc, getDoc, setDoc }) */
(function () {
  var DEF = [
    { id: 'openai', name: 'OpenAI (AI chấm Speaking, Writing…)', amount: 250000, cur: 'đ', cycle: 'topup', due: '', url: 'https://platform.openai.com/settings/organization/billing/overview',
      note: 'Nạp trước. Không có hoá đơn hằng tháng: hết tiền nạp là AI ngừng. Nên bật Auto recharge. Ước tính ~2 đô / tuần theo mức dùng hiện tại.' },
    { id: 'hf', name: 'Hugging Face PRO (máy chấm phát âm)', amount: 9, cur: 'USD', cycle: 'month', due: '2026-12-20', url: 'https://huggingface.co/settings/billing',
      note: 'Tự trừ thẻ mỗi tháng vào ngày đăng ký. Hết tiền / thẻ lỗi thì máy chấm phát âm dừng.' },
    { id: 'firebase', name: 'Firebase Blaze (kho dữ liệu, đăng nhập)', amount: 50000, cur: 'đ', cycle: 'month', due: '2026-12-01', url: 'https://console.cloud.google.com/billing',
      note: 'Chỉ tính phần vượt mức miễn phí (50.000 lượt đọc / ngày). Google tự trừ thẻ Timo đầu tháng sau. Đã đặt báo động 50.000đ.' },
    { id: 'sepay', name: 'SePay (tự duyệt chuyển khoản)', amount: 0, cur: 'đ', cycle: 'month', due: '', url: 'https://my.sepay.vn',
      note: 'Đang dùng gói miễn phí. Vào SePay → Gói dịch vụ xem giới hạn giao dịch / tháng; nếu cần nâng gói thì ghi số tiền và ngày trả vào đây.' },
    { id: 'domain', name: 'Tên miền nightielts.id.vn (VinaHost)', amount: 0, cur: 'đ', cycle: 'year', due: '', url: 'https://my.vinahost.vn',
      note: 'Gia hạn mỗi năm. Điền ngày hết hạn để web nhắc trước. Quên gia hạn là web mất địa chỉ.' }
  ];
  var CYC = { month: 'mỗi tháng', year: 'mỗi năm', topup: 'nạp trước', once: 'một lần' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var money = function (a, c) { a = Number(a) || 0; return c === 'USD' ? a.toLocaleString('en-US') + ' $' : a.toLocaleString('vi-VN') + ' đ'; };
  var daysTo = function (d) { if (!d) return null; var t = new Date(d + 'T00:00:00+07:00').getTime(); return Math.ceil((t - Date.now()) / 864e5); };
  var addCycle = function (d, c) { var x = new Date((d || new Date().toISOString().slice(0, 10)) + 'T12:00:00Z'); if (c === 'year') x.setUTCFullYear(x.getUTCFullYear() + 1); else x.setUTCMonth(x.getUTCMonth() + 1); return x.toISOString().slice(0, 10); };
  var fmtD = function (d) { return d ? d.split('-').reverse().join('/') : 'chưa có ngày'; };
  function css() {
    if (document.getElementById('ncost-css')) return;
    var s = document.createElement('style'); s.id = 'ncost-css';
    s.textContent = [
      '.ncost{background:#fff;border:1px solid #EEEEF3;border-radius:26px;padding:18px 18px 14px;box-shadow:0 18px 40px -34px rgba(36,36,42,.5)}',
      '.ncost-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}.ncost-h h3{margin:0;font-size:18px;font-weight:800}',
      '.ncost-h .tag{font-size:10.5px;font-weight:800;letter-spacing:.08em;background:#24242A;color:#fff;border-radius:999px;padding:4px 9px}',
      '.ncost-sum{margin-left:auto;font-size:12.5px;font-weight:700;color:#6B6B78}.ncost-sum b{color:#24242A}',
      '.ncost-alert{border-radius:14px;padding:9px 12px;margin-bottom:10px;font-size:13px;font-weight:700;background:#FEF2F2;color:#B91C1C}',
      '.ncost-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}',
      '.ncost-i{border-radius:18px;background:#F7F7FA;padding:13px 14px;display:flex;flex-direction:column;gap:6px;border:1.5px solid transparent}',
      '.ncost-i.soon{border-color:#FCA5A5;background:#FFF7F7}.ncost-i.late{border-color:#EF4444;background:#FEF2F2}',
      '.ncost-i .n{font-weight:800;font-size:14px;line-height:1.3}',
      '.ncost-i .row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12.5px;color:#6B6B78}',
      '.ncost-i .amt{font-size:17px;font-weight:900;color:#24242A}',
      '.ncost-pill{font-size:11px;font-weight:800;border-radius:999px;padding:2px 8px;background:#E7E7EE;color:#4B4B58}',
      '.ncost-pill.ok{background:#DCFCE7;color:#15803D}.ncost-pill.soon{background:#FEE2E2;color:#B91C1C}.ncost-pill.late{background:#B91C1C;color:#fff}',
      '.ncost-i .note{font-size:12px;color:#6B6B78;line-height:1.45}',
      '.ncost-i .act{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}',
      '.ncost-b{border:0;border-radius:999px;padding:6px 11px;font:800 12px "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer;background:#fff;color:#24242A;text-decoration:none;display:inline-flex;align-items:center;gap:5px;box-shadow:inset 0 0 0 1px #E4E4EC}',
      '.ncost-b.pri{background:#24242A;color:#fff;box-shadow:none}',
      '.ncost-f{display:grid;gap:6px}.ncost-f input,.ncost-f select,.ncost-f textarea{width:100%;border:1.5px solid #E4E4EC;border-radius:10px;padding:7px 9px;font:600 13px "Plus Jakarta Sans",system-ui,sans-serif;background:#fff;color:#24242A}',
      '.ncost-f .two{display:grid;grid-template-columns:1fr 80px;gap:6px}',
      '.ncost-foot{display:flex;gap:8px;align-items:center;margin-top:10px;font-size:12px;color:#8A8A98}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function mount(el, o) {
    if (!el || !o || !o.db) return; css();
    var ref = o.doc(o.db, 'payments', '__costs'), items = null, editing = null;
    function save() { return o.setDoc(ref, { items: items, updatedAt: Date.now() }).catch(function (e) { alert('Chưa lưu được: ' + e.message); }); }
    function render() {
      var monthly = 0, alerts = [];
      items.forEach(function (it) {
        var a = Number(it.amount) || 0, vnd = it.cur === 'USD' ? a * 26000 : a;
        if (it.cycle === 'month' || it.cycle === 'topup') monthly += vnd; else if (it.cycle === 'year') monthly += vnd / 12;
        var d = daysTo(it.due); if (d != null && d <= 7) alerts.push(it.name.split(' (')[0] + (d < 0 ? ' đã quá hạn ' + (-d) + ' ngày' : d === 0 ? ' đến hạn hôm nay' : ' còn ' + d + ' ngày'));
      });
      el.innerHTML = '<div class="ncost"><div class="ncost-h"><span class="tag">CHỈ GIÁO VIÊN</span><h3>Chi phí & hoá đơn</h3><span class="ncost-sum">Ước tính <b>' + Math.round(monthly).toLocaleString('vi-VN') + ' đ</b> / tháng</span></div>' +
        (alerts.length ? '<div class="ncost-alert">Sắp phải trả: ' + esc(alerts.join(' · ')) + '</div>' : '') +
        '<div class="ncost-list">' + items.map(function (it, i) {
          if (editing === i) return '<div class="ncost-i"><div class="ncost-f">' +
            '<input data-f="name" value="' + esc(it.name) + '" placeholder="Tên dịch vụ">' +
            '<div class="two"><input data-f="amount" type="number" min="0" step="any" value="' + esc(it.amount) + '" placeholder="Số tiền"><select data-f="cur"><option' + (it.cur === 'đ' ? ' selected' : '') + '>đ</option><option' + (it.cur === 'USD' ? ' selected' : '') + '>USD</option></select></div>' +
            '<select data-f="cycle">' + Object.keys(CYC).map(function (k) { return '<option value="' + k + '"' + (it.cycle === k ? ' selected' : '') + '>' + CYC[k] + '</option>'; }).join('') + '</select>' +
            '<label style="font-size:11.5px;color:#6B6B78;font-weight:700">Ngày phải trả / hết hạn tiếp theo<input data-f="due" type="date" value="' + esc(it.due) + '"></label>' +
            '<input data-f="url" value="' + esc(it.url) + '" placeholder="Link trang thanh toán">' +
            '<textarea data-f="note" rows="3" placeholder="Ghi chú">' + esc(it.note) + '</textarea>' +
            '<div class="act"><button class="ncost-b pri" data-a="ok" data-i="' + i + '">Lưu</button><button class="ncost-b" data-a="cancel">Huỷ</button><button class="ncost-b" data-a="del" data-i="' + i + '" style="color:#B91C1C">Xoá</button></div></div></div>';
          var d = daysTo(it.due), st = d == null ? '' : d < 0 ? 'late' : d <= 7 ? 'soon' : 'ok';
          var dl = it.cycle === 'topup' ? '<span class="ncost-pill">Nạp khi sắp hết</span>' : d == null ? '<span class="ncost-pill">Chưa có ngày</span>' :
            '<span class="ncost-pill ' + st + '">' + (d < 0 ? 'Quá hạn ' + (-d) + ' ngày' : d === 0 ? 'Hôm nay' : 'Còn ' + d + ' ngày') + '</span>';
          return '<div class="ncost-i ' + (st === 'ok' ? '' : st) + '"><div class="n">' + esc(it.name) + '</div>' +
            '<div class="row"><span class="amt">' + (Number(it.amount) ? money(it.amount, it.cur) : 'Miễn phí / chưa rõ') + '</span><span>' + (CYC[it.cycle] || '') + '</span></div>' +
            '<div class="row">' + (it.cycle === 'topup' ? '' : 'Kỳ tới: <b style="color:#24242A">' + fmtD(it.due) + '</b> ') + dl + '</div>' +
            (it.note ? '<div class="note">' + esc(it.note) + '</div>' : '') +
            '<div class="act">' + (it.url ? '<a class="ncost-b" href="' + esc(it.url) + '" target="_blank" rel="noopener">Mở trang thanh toán ↗</a>' : '') +
            (it.cycle === 'month' || it.cycle === 'year' ? '<button class="ncost-b pri" data-a="paid" data-i="' + i + '">Đã trả kỳ này</button>' : '') +
            '<button class="ncost-b" data-a="edit" data-i="' + i + '">Sửa</button></div></div>';
        }).join('') + '</div>' +
        '<div class="ncost-foot"><button class="ncost-b" data-a="add">+ Thêm dịch vụ</button><span>Số USD quy đổi ~26.000đ để ước tính. Học sinh không thấy mục này.</span></div></div>';
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b || !items) return;
      var a = b.dataset.a, i = +b.dataset.i;
      if (a === 'edit') { editing = i; render(); }
      else if (a === 'cancel') { editing = null; render(); }
      else if (a === 'ok') {
        var box = b.closest('.ncost-i'), it = items[i];
        [].forEach.call(box.querySelectorAll('[data-f]'), function (f) { it[f.dataset.f] = f.dataset.f === 'amount' ? Number(f.value) || 0 : f.value.trim(); });
        editing = null; render(); save();
      }
      else if (a === 'del') { if (confirm('Xoá mục "' + items[i].name + '"?')) { items.splice(i, 1); editing = null; render(); save(); } }
      else if (a === 'paid') { var it2 = items[i]; it2.due = addCycle(it2.due, it2.cycle); it2.paidAt = Date.now(); render(); save(); }
      else if (a === 'add') { items.push({ id: 'x' + Date.now(), name: 'Dịch vụ mới', amount: 0, cur: 'đ', cycle: 'month', due: '', url: '', note: '' }); editing = items.length - 1; render(); }
    });
    o.getDoc(ref).then(function (s) { items = s.exists() && Array.isArray(s.data().items) ? s.data().items : DEF.slice(); render(); if (!s.exists()) save(); })
      .catch(function (e) { el.innerHTML = '<div class="ncost">Chưa tải được mục chi phí: ' + esc(e.message) + '</div>'; });
  }
  window.NightCosts = { mount: mount };
})();
