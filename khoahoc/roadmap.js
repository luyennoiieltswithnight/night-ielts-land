/* Night IELTS — khung LỘ TRÌNH dùng chung cho mọi khóa (cùng phong cách trang chủ, mỗi khóa 1 màu).
   Dùng: <script src="roadmap.js"></script> rồi NightRoadmap.render({...}).
   {
     theme: "giaotiep" | "speaking6" | "writing" | "chuyende" | "tiengtrung",
     eyebrow, title, lead, sticker: "ten.webp" (Irasutoya trong img/ira/),
     facts: [[nhãn, giá trị], ...],                 // ô thông tin trong thẻ tối
     tools: [{href, icon, name, desc, tag}],        // lối tắt công cụ (tuỳ chọn)
     flow:  {title, steps:[{t, name, d}]},          // khung 1 buổi học (tuỳ chọn)
     folder: "giaotiep/", unitWord: "Buổi", badgeWord: (chữ nhỏ trong ô số, mặc định = unitWord),
     phases: [{label, sub, desc, sessions:[{
        n, title, tag, meta, points:[...], lines:[[nhãn, chữ]], note,
        extra: {label, src, points:[...]}           // khối ẩn/hiện (vd Band 8)
     }]}],
     table: {title, desc, head:[...], rows:[[...]]}  // bảng đối chiếu (tuỳ chọn)
   }
   Nút "Vào học" tự hiện khi có file folder + "buoi-XX.html". */
(function () {
  const THEMES = {
    giaotiep: { a: "#FF8A3D", ink: "#fff", soft: "#FFF0E4", text: "#C2511A", name: "Giao tiếp" },
    speaking6: { a: "#6C70DC", ink: "#fff", soft: "#EDEEFD", text: "#4A4EB8", name: "Speaking" },
    writing: { a: "#FBBF24", ink: "#24242A", soft: "#FEF4D6", text: "#92570A", name: "Writing" },
    chuyende: { a: "#10B981", ink: "#fff", soft: "#DDF7EC", text: "#04704F", name: "Chuyên đề" },
    tiengtrung: { a: "#C8102E", ink: "#fff", soft: "#FDECEC", text: "#9B0D23", name: "Tiếng Trung" }
  };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>");
  const CSS = `
:root{--ink:#24242A;--panel:#F4F4F7;--line:#E6E6EE;--muted:#6B6B78}
*{box-sizing:border-box}
body{margin:0;font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:var(--ink);background:linear-gradient(160deg,#ECEBFB 0%,#F7F3FF 45%,#FFF4EC 100%);min-height:100vh;-webkit-font-smoothing:antialiased}
.rm-frame{max-width:1120px;margin:16px auto;background:var(--ink);border-radius:32px;padding:10px;box-shadow:0 30px 60px -30px rgba(36,36,42,.45)}
.rm-top{display:flex;align-items:center;gap:10px;padding:8px 10px 14px}
.rm-logo{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none}
.rm-logo i{width:36px;height:36px;border-radius:50%;background:var(--a);display:block;box-shadow:inset 0 0 0 3px rgba(255,255,255,.25)}
.rm-logo b{display:block;font-size:15px;font-weight:800;line-height:1.1}
.rm-logo small{display:block;font-size:10px;letter-spacing:.14em;color:rgba(255,255,255,.5);font-weight:700}
.rm-sp{flex:1}
.rm-back{color:var(--a-ink);background:var(--a);text-decoration:none;font-weight:800;font-size:13px;padding:10px 16px;border-radius:999px}
.rm-in{background:#fff;border-radius:26px;padding:18px}
.rm-hero{display:grid;grid-template-columns:1.55fr 1fr;gap:14px}
.rm-main{position:relative;overflow:hidden;background:var(--a);color:var(--a-ink);border-radius:26px;padding:26px 26px 30px;min-height:260px}
.rm-main:before,.rm-main:after{content:"";position:absolute;border-radius:50%;border:26px solid rgba(255,255,255,.14)}
.rm-main:before{width:260px;height:260px;right:-80px;top:-90px}
.rm-main:after{width:140px;height:140px;right:150px;bottom:-90px}
.rm-chips{display:flex;flex-wrap:wrap;gap:6px;position:relative}
.rm-chip{font-size:11px;font-weight:800;padding:5px 10px;border-radius:999px;background:var(--ink);color:#fff}
.rm-chip.l{background:rgba(255,255,255,.28);color:inherit}
.rm-main h1{position:relative;margin:16px 0 10px;font-size:clamp(28px,4.4vw,44px);line-height:1.05;font-weight:800;letter-spacing:-.02em;max-width:15ch}
.rm-main p{position:relative;margin:0;font-size:14px;line-height:1.6;font-weight:600;opacity:.9;max-width:46ch}
.rm-stk{position:absolute;right:18px;bottom:10px;width:150px;height:150px;object-fit:contain;pointer-events:none}
.rm-side{display:flex;flex-direction:column;gap:14px}
.rm-stats{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.rm-stat{border-radius:22px;padding:14px 16px;border:2px solid var(--line);background:var(--panel)}
.rm-stat.a{background:var(--soft);border-color:color-mix(in srgb,var(--a) 45%,transparent)}
.rm-stat small{display:block;font-size:11px;font-weight:700;color:var(--muted)}
.rm-stat b{display:block;font-size:30px;font-weight:800;line-height:1.2}
.rm-dark{flex:1;background:var(--ink);color:#fff;border-radius:22px;padding:16px}
.rm-dark h3{margin:0 0 10px;font-size:11px;letter-spacing:.16em;color:var(--a);font-weight:800}
.rm-facts{display:grid;gap:8px}
.rm-fact{background:rgba(255,255,255,.07);border-radius:14px;padding:9px 12px}
.rm-fact small{display:block;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.5);font-weight:700}
.rm-fact span{display:block;font-size:13px;font-weight:700;margin-top:2px}
.rm-h2{display:flex;align-items:center;gap:10px;margin:28px 4px 12px;font-size:20px;font-weight:800}
.rm-h2:before{content:"";width:10px;height:10px;border-radius:50%;background:var(--a)}
.rm-h2 small{font-size:12px;color:var(--muted);font-weight:700}
.rm-tools{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
.rm-tool{display:block;text-decoration:none;color:inherit;background:var(--panel);border-radius:22px;padding:16px;transition:transform .15s}
.rm-tool:hover{transform:translateY(-2px)}
.rm-tool .ic{width:40px;height:40px;border-radius:14px;background:var(--soft);display:flex;align-items:center;justify-content:center;font-size:20px}
.rm-tool b{display:block;margin-top:10px;font-size:15px}
.rm-tool p{margin:4px 0 0;font-size:12.5px;color:var(--muted);line-height:1.5}
.rm-tool .tg{float:right;font-size:10px;font-weight:800;color:var(--text);background:var(--soft);padding:3px 8px;border-radius:999px}
.rm-flow{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
.rm-step{background:var(--panel);border-radius:18px;padding:12px 14px}
.rm-step em{font-style:normal;font-size:11px;font-weight:800;color:var(--text)}
.rm-step b{display:block;font-size:14px;margin:2px 0}
.rm-step span{font-size:12px;color:var(--muted);line-height:1.45}
.rm-bar{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px;position:sticky;top:0;z-index:5;background:#fff;padding:10px 0;border-bottom:1px solid var(--line)}
.rm-f{border:0;cursor:pointer;font:700 13px inherit;font-family:inherit;padding:8px 14px;border-radius:999px;background:var(--panel);color:var(--muted)}
.rm-f[aria-pressed=true]{background:var(--ink);color:#fff}
.rm-phase{margin-top:8px}
.rm-phase>p{margin:-4px 4px 12px;font-size:13px;color:var(--muted);line-height:1.55}
.rm-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}
.rm-s{display:flex;gap:14px;background:#fff;border:2px solid var(--line);border-radius:24px;padding:16px;transition:border-color .15s,box-shadow .15s}
.rm-s:hover{border-color:color-mix(in srgb,var(--a) 55%,transparent);box-shadow:0 14px 30px -18px rgba(36,36,42,.3)}
.rm-n{flex:none;width:52px;height:52px;border-radius:18px;background:var(--soft);color:var(--text);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
.rm-n i{font-style:normal;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.8}
.rm-n b{font-size:20px;font-weight:800}
.rm-s.ok .rm-n{background:var(--a);color:var(--a-ink)}
.rm-b{min-width:0;flex:1;display:flex;flex-direction:column}
.rm-tag{align-self:flex-start;font-size:10.5px;font-weight:800;padding:3px 9px;border-radius:999px;background:var(--panel);color:var(--muted);margin-bottom:6px}
.rm-b h3{margin:0;font-size:15.5px;line-height:1.35;font-weight:800}
.rm-meta{margin:4px 0 0;font-size:12px;color:var(--muted);font-weight:600}
.rm-b ul{margin:8px 0 0;padding-left:18px;font-size:13px;line-height:1.55;color:#3d3d48}
.rm-ln{margin:8px 0 0;font-size:13px;line-height:1.5;color:#3d3d48}
.rm-ln b{display:inline-block;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--text);background:var(--soft);padding:2px 7px;border-radius:6px;margin-right:6px}
.rm-note{margin:10px 0 0;font-size:12.5px;line-height:1.5;background:var(--panel);border-radius:12px;padding:8px 10px;color:#3d3d48}
.rm-act{margin-top:auto;padding-top:12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.rm-go{font-weight:800;font-size:13px;text-decoration:none;background:var(--a);color:var(--a-ink);padding:9px 16px;border-radius:999px}
.rm-go:hover{filter:brightness(1.06)}
.rm-soon{font-size:12px;font-weight:700;color:var(--muted);border:1.5px dashed var(--line);padding:7px 12px;border-radius:999px}
.rm-xb{border:0;cursor:pointer;font:800 12px inherit;font-family:inherit;padding:8px 12px;border-radius:999px;background:#FFF4D6;color:#8A5A00}
.rm-x{margin-top:10px;background:#FFFAEB;border:1.5px solid #FDE6A8;border-radius:14px;padding:10px 12px;font-size:13px}
.rm-x small{font-weight:800;color:#8A5A00}
.rm-x ul{margin-top:6px}
.rm-tbl{overflow-x:auto;border-radius:18px;border:2px solid var(--line)}
.rm-tbl table{border-collapse:collapse;width:100%;font-size:13px}
.rm-tbl th,.rm-tbl td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--line)}
.rm-tbl th{background:var(--panel);font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.rm-foot{text-align:center;font-size:12px;color:rgba(255,255,255,.45);padding:14px 0 6px}
.rm-pg{margin-top:10px}
.rm-pgbar{height:7px;border-radius:9px;background:var(--panel);overflow:hidden}
.rm-pgbar i{display:block;height:100%;background:var(--a);border-radius:9px}
.rm-pgt{display:flex;justify-content:space-between;gap:8px;margin-top:5px;font-size:11.5px;font-weight:700;color:var(--muted)}
.rm-pgt b{color:var(--ink)}
.rm-done{color:#047857!important}
.rm-watch{display:inline-flex;margin-top:8px;font-size:12px;font-weight:800;text-decoration:none;color:#fff;background:var(--ink);padding:7px 12px;border-radius:999px}
.rm-watch:hover{filter:brightness(1.2)}
.rm-tp{margin-top:22px;background:var(--panel);border-radius:24px;padding:16px}
.rm-tp h2{margin:0 0 4px;font-size:18px;font-weight:800;display:flex;align-items:center;gap:8px}
.rm-tp>p{margin:0 0 12px;font-size:12.5px;color:var(--muted)}
.rm-tbl2{overflow-x:auto;background:#fff;border-radius:16px}
.rm-tbl2 table{width:100%;border-collapse:collapse;font-size:13px}
.rm-tbl2 th,.rm-tbl2 td{padding:9px 12px;text-align:left;border-bottom:1px solid var(--line);white-space:nowrap}
.rm-tbl2 th{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:#fff;position:sticky;top:0}
.rm-tbl2 tr.st{cursor:pointer}.rm-tbl2 tr.st:hover td{background:var(--soft)}
.rm-tbl2 tr.on td{background:var(--soft);font-weight:800}
.rm-av{width:26px;height:26px;border-radius:50%;vertical-align:middle;margin-right:8px;object-fit:cover;background:var(--soft)}
.rm-mini{display:inline-block;width:70px;height:6px;border-radius:9px;background:var(--panel);overflow:hidden;vertical-align:middle;margin-right:6px}.rm-mini i{display:block;height:100%;background:var(--a)}
.rm-tpbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:10px}
.rm-addb{border:0;cursor:pointer;font:800 13px inherit;font-family:inherit;padding:9px 16px;border-radius:999px;background:var(--ink);color:#fff}.rm-addb.sm{padding:7px 14px;font-size:12px;flex:none}.rm-addb:disabled{opacity:.5}
.rm-err{font-size:12px;color:#E11D48;font-weight:700}
.rm-pick{background:#fff;border-radius:16px;padding:10px;margin-bottom:12px}
.rm-q{width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:12px;padding:10px 12px;font:600 14px inherit;font-family:inherit;outline:none}.rm-q:focus{border-color:var(--ink)}
.rm-pl{max-height:300px;overflow-y:auto;margin-top:8px}
.rm-pr{display:flex;align-items:center;gap:6px;padding:8px 6px;border-bottom:1px solid var(--line)}.rm-pr:last-child{border-bottom:0}
.rm-pr .nm{flex:1;min-width:0}.rm-pr .nm b{display:block;font-size:13.5px}.rm-pr .nm small{display:block;font-size:11.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rm-rm{border:0;cursor:pointer;background:var(--soft);color:var(--muted);font:800 12px inherit;font-family:inherit;padding:5px 10px;border-radius:999px}.rm-rm:hover{color:#E11D48}.rm-rm.on{background:#FFE4E6;color:#E11D48}.rm-rm:disabled{opacity:.5}
.rm-sel{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px;font-size:13px;font-weight:700}
.rm-sel button{border:0;cursor:pointer;font:700 12px inherit;font-family:inherit;padding:7px 12px;border-radius:999px;background:#fff;color:var(--muted)}
.rm-me{display:inline-flex;align-items:center;gap:8px;color:#fff;font-size:12px;font-weight:700}.rm-me img{width:28px;height:28px;border-radius:50%}
@media (max-width:820px){.rm-hero{grid-template-columns:1fr}.rm-stk{width:110px;height:110px;opacity:.95}.rm-main{padding-bottom:110px}}
@media (max-width:520px){.rm-frame{margin:0;border-radius:0;padding:6px}.rm-in{padding:12px;border-radius:22px}.rm-list{grid-template-columns:1fr}.rm-main{padding:20px 18px 112px}.rm-top{padding:6px 6px 10px}}
`;
  const RM_SRC = (document.currentScript && document.currentScript.src) || location.href;
  function render(cfg) {
    if (!document.querySelector('link[rel~="icon"]')) { try { const l = document.createElement("link"); l.rel = "icon"; l.type = "image/png"; l.href = new URL("../icons/favicon-32.png", RM_SRC).href; document.head.appendChild(l); } catch (e) {} }
    const t = THEMES[cfg.theme] || THEMES.speaking6;
    const r = document.documentElement.style;
    r.setProperty("--a", t.a); r.setProperty("--a-ink", t.ink); r.setProperty("--soft", t.soft); r.setProperty("--text", t.text);
    if (!document.querySelector("link[data-rm-font]")) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.dataset.rmFont = "1";
      l.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"; document.head.appendChild(l);
    }
    const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    const unit = cfg.unitWord || "Buổi";
    const phases = cfg.phases || [];
    const total = phases.reduce((n, p) => n + p.sessions.length, 0);
    const pad = (n) => String(n).padStart(2, "0");
    const card = (s) => `<article class="rm-s" data-n="${s.n}" id="${cfg.anchor || "buoi"}-${s.n}">
      <div class="rm-n"><i>${esc(cfg.badgeWord || unit)}</i><b>${pad(s.n)}</b></div>
      <div class="rm-b">
        ${s.tag ? `<span class="rm-tag">${esc(s.tag)}</span>` : ""}
        <h3>${rich(s.title)}</h3>
        ${s.meta ? `<p class="rm-meta">${rich(s.meta)}</p>` : ""}
        ${(s.points || []).length ? `<ul>${s.points.map((p) => `<li>${rich(p)}</li>`).join("")}</ul>` : ""}
        ${(s.lines || []).map(([k, v]) => `<p class="rm-ln"><b>${esc(k)}</b>${rich(v)}</p>`).join("")}
        ${s.note ? `<p class="rm-note">${rich(s.note)}</p>` : ""}
        <div class="rm-pg" hidden></div>
        <div class="rm-act"><span class="rm-ls"><span class="rm-soon">Đang kiểm tra…</span></span>
          ${s.extra ? `<button class="rm-xb" aria-expanded="false">${esc(s.extra.label || "Nâng cao")} ▾</button>` : ""}</div>
        ${s.extra ? `<div class="rm-x" hidden>${s.extra.src ? `<small>${rich(s.extra.src)}</small>` : ""}<ul>${(s.extra.points || []).map((p) => `<li>${rich(p)}</li>`).join("")}</ul></div>` : ""}
      </div></article>`;
    const facts = cfg.facts || [];
    const html = `<div class="rm-frame">
      <div class="rm-top"><a class="rm-logo" href="../index.html"><i></i><span><b>Night IELTS</b><small>CLASSROOM HUB</small></span></a><span class="rm-sp"></span><span class="rm-me" id="rm-me"></span><a class="rm-back" href="../index.html">← Trang chủ</a></div>
      <div class="rm-in">
        <div class="rm-hero">
          <div class="rm-main">
            <div class="rm-chips"><span class="rm-chip">Lộ trình</span>${cfg.eyebrow ? `<span class="rm-chip l">${esc(cfg.eyebrow)}</span>` : ""}</div>
            <h1>${rich(cfg.title)}</h1>
            ${cfg.lead ? `<p>${rich(cfg.lead)}</p>` : ""}
            ${cfg.sticker ? `<img class="rm-stk" src="img/ira/${esc(cfg.sticker)}" alt="" aria-hidden="true" onerror="this.remove()">` : ""}
          </div>
          <div class="rm-side">
            <div class="rm-stats">
              <div class="rm-stat a"><small>Tổng số ${esc(unit.toLowerCase())}</small><b>${total}</b></div>
              <div class="rm-stat"><small>Đã có bài</small><b id="rm-ready">…</b></div>
            </div>
            ${facts.length ? `<div class="rm-dark"><h3>THÔNG TIN KHÓA</h3><div class="rm-facts">${facts.map(([k, v]) => `<div class="rm-fact"><small>${esc(k)}</small><span>${rich(v)}</span></div>`).join("")}</div></div>` : ""}
          </div>
        </div>
        ${cfg.tools && cfg.tools.length ? `<h2 class="rm-h2">Công cụ đi kèm</h2><div class="rm-tools">${cfg.tools.map((x) => `<a class="rm-tool" href="${esc(x.href)}">${x.tag ? `<span class="tg">${esc(x.tag)}</span>` : ""}<span class="ic">${esc(x.icon || "★")}</span><b>${esc(x.name)}</b><p>${rich(x.desc)}</p></a>`).join("")}</div>` : ""}
        ${cfg.flow ? `<h2 class="rm-h2">${esc(cfg.flow.title || "Một buổi học")}</h2><div class="rm-flow">${cfg.flow.steps.map((x) => `<div class="rm-step"><em>${esc(x.t)}</em><b>${esc(x.name)}</b><span>${rich(x.d)}</span></div>`).join("")}</div>` : ""}
        <div id="rm-teacher"></div>
        ${phases.length > 1 ? `<div class="rm-bar" role="toolbar"><button class="rm-f" data-f="all" aria-pressed="true">Tất cả</button>${phases.map((p, i) => `<button class="rm-f" data-f="${i}" aria-pressed="false">${esc(p.label)}</button>`).join("")}</div>` : ""}
        ${phases.map((p, i) => `<section class="rm-phase" data-p="${i}"><h2 class="rm-h2">${esc(p.label)}${p.sub ? ` <small>${esc(p.sub)}</small>` : ""}</h2>${p.desc ? `<p>${rich(p.desc)}</p>` : ""}<div class="rm-list">${p.sessions.map(card).join("")}</div></section>`).join("")}
        ${cfg.table ? `<h2 class="rm-h2">${esc(cfg.table.title)}</h2>${cfg.table.desc ? `<p class="rm-meta" style="margin:-4px 4px 12px">${rich(cfg.table.desc)}</p>` : ""}<div class="rm-tbl"><table><thead><tr>${cfg.table.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${cfg.table.rows.map((row) => `<tr>${row.map((c) => `<td>${rich(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : ""}
      </div>
      <div class="rm-foot">Night IELTS · ${esc(t.name)}</div>
    </div>`;
    const root = document.getElementById("root") || document.body.appendChild(document.createElement("div"));
    root.innerHTML = html;
    if (cfg.title) document.title = `${String(cfg.title).replace(/\*/g, "")} — Night IELTS`;
    root.addEventListener("click", (e) => {
      const b = e.target.closest(".rm-xb");
      if (b) { const x = b.closest(".rm-b").querySelector(".rm-x"); const o = x.hidden; x.hidden = !o; b.setAttribute("aria-expanded", o); b.textContent = (o ? "" : "") + b.textContent.replace(/[▾▴]$/, o ? "▴" : "▾"); return; }
      const f = e.target.closest(".rm-f");
      if (f) { root.querySelectorAll(".rm-f").forEach((x) => x.setAttribute("aria-pressed", x === f)); root.querySelectorAll(".rm-phase").forEach((s) => (s.hidden = !(f.dataset.f === "all" || s.dataset.p === f.dataset.f))); }
    });
    let ready = 0, checked = 0, readyRes; const readyP = new Promise((r) => (readyRes = r));
    const all = root.querySelectorAll(".rm-s");
    all.forEach((el) => {
      const url = (cfg.folder || "") + "buoi-" + pad(el.dataset.n) + ".html";
      const ls = el.querySelector(".rm-ls");
      const done = (ok) => {
        ls.innerHTML = ok ? `<a class="rm-go" href="${url}">Vào học →</a>` : `<span class="rm-soon">Sắp ra mắt</span>`;
        if (ok) { el.classList.add("ok"); ready++; }
        if (++checked === all.length) { document.getElementById("rm-ready").textContent = ready; readyRes(); }
      };
      if (location.protocol === "file:") return done(true);
      fetch(url, { method: "HEAD", cache: "no-store" }).then((r) => done(r.ok)).catch(() => done(false));
    });
    if (!all.length) { document.getElementById("rm-ready").textContent = 0; readyRes(); }
    setTimeout(readyRes, 6000);
    readyP.then(() => rmProgress(cfg, root));
  }
  /* ---------- Đăng nhập + tiến độ (night-progress.js) ---------- */
  function rmLoadNP() {
    if (window.NightProgress) return Promise.resolve(window.NightProgress);
    return new Promise((res) => { const sc = document.createElement("script"); sc.src = new URL("night-progress.js?v=" + Date.now().toString(36).slice(0, -3), RM_SRC).href; sc.onload = () => res(window.NightProgress || null); sc.onerror = () => res(null); document.head.appendChild(sc); });
  }
  const when = (t) => { if (!t) return ""; const d = new Date(t), diff = Date.now() - t; if (diff < 36e5) return Math.max(1, Math.round(diff / 6e4)) + " phút trước"; if (diff < 864e5) return Math.round(diff / 36e5) + " giờ trước"; return d.toLocaleDateString("vi-VN"); };
  function paintCards(root, byN, countMode, watchUid, folder) {
    root.querySelectorAll(".rm-s").forEach((el) => {
      const box = el.querySelector(".rm-pg"); const r = byN[el.dataset.n];
      const watchLink = watchUid && el.classList.contains("ok") ? `<a class="rm-watch" href="${esc((folder || "") + "buoi-" + String(el.dataset.n).padStart(2, "0") + ".html?watch=" + encodeURIComponent(watchUid))}" target="_blank" rel="noopener">👁 Xem bài trực tiếp</a>` : "";
      if (!r) { if (watchLink) { box.hidden = false; box.innerHTML = `<div class="rm-pgt"><span>Chưa mở buổi này</span></div>${watchLink}`; } else { box.hidden = true; box.innerHTML = ""; } return; }
      box.hidden = false;
      if (countMode) { box.innerHTML = `<div class="rm-pgt"><span>👥 <b>${r.count}</b> học sinh đã làm · <b>${r.complete}</b> xong</span><span>TB đúng <b>${r.score}%</b></span></div>`; return; }
      const st = r.stats || {}; const doneAll = st.total && st.done >= st.total;
      box.innerHTML = `<div class="rm-pgbar"><i style="width:${st.pct || 0}%"></i></div><div class="rm-pgt"><span class="${doneAll ? "rm-done" : ""}">${doneAll ? "✓ Đã hoàn thành" : "Đã làm"} <b>${st.done || 0}/${st.total || 0}</b> câu</span><span>Đúng <b>${st.correct || 0}</b>${st.done ? " (" + st.score + "%)" : ""} · ${when(r.updatedAt)}</span></div>${watchLink}`;
    });
  }
  function rmProgress(cfg, root) {
    rmLoadNP().then((NP) => {
      if (!NP) return;
      return NP.gate(cfg.theme).then((ctx) => {
        if (ctx.offline || !ctx.user) return;
        const me = document.getElementById("rm-me");
        if (me) me.innerHTML = `${ctx.user.photoURL ? `<img src="${esc(ctx.user.photoURL)}" alt="">` : ""}<span>${esc((ctx.user.displayName || "").split(" ").pop())}</span>`;
        const key = cfg.theme;
        if (ctx.role !== "admin") {
          return NP.myCourse(ctx, key).then((docs) => { const byN = {}; docs.forEach((d) => { if (d.n) byN[d.n] = d; }); paintCards(root, byN); });
        }
        const slot = root.querySelector("#rm-teacher");
        if (slot) slot.innerHTML = `<div class="rm-tp"><h2>📊 Tiến độ học sinh</h2><p>Đang tải tiến độ của cả lớp…</p></div>`;
        return NP.classCourse(ctx, key).then(({ docs, students }) => teacherPanel(cfg, root, docs, students, ctx, NP))
          .catch((e) => { if (slot) slot.innerHTML = `<div class="rm-tp"><h2>📊 Tiến độ học sinh</h2><p>Không tải được tiến độ (${esc(e && (e.code || e.message) || "lỗi")}). Tải lại trang thử nhé.</p></div>`; });
      });
    });
  }
  function teacherPanel(cfg, root, docs, students, ctx, NP) {
    const slot = root.querySelector("#rm-teacher"); if (!slot) return;
    const key = cfg.theme, total = root.querySelectorAll(".rm-s").length;
    const isIn = (u) => NP.enrolledIn(u, key);
    const docsOf = {}; docs.forEach((d) => { (docsOf[d.studentId] = docsOf[d.studentId] || []).push(d); });
    let sel = "", picker = false, q = "", confirmId = "", busy = "", msg = "";
    const build = () => students.filter(isIn).map((u) => {
      const ds = docsOf[u.uid] || [];
      const done = ds.filter((d) => d.stats && d.stats.total && d.stats.done >= d.stats.total).length;
      const ans = ds.reduce((a, d) => a + ((d.stats && d.stats.done) || 0), 0), cor = ds.reduce((a, d) => a + ((d.stats && d.stats.correct) || 0), 0);
      const last = ds.reduce((a, d) => Math.max(a, d.updatedAt || 0), 0);
      return { id: u.uid, name: u.name, email: u.email, photo: u.photo, docs: ds, started: ds.length, done, ans, cor, score: ans ? Math.round((cor / ans) * 100) : 0, last };
    }).sort((a, b) => (b.last - a.last) || String(a.name || a.email).localeCompare(String(b.name || b.email)));
    const av = (x) => x.photo ? `<img class="rm-av" src="${esc(x.photo)}" alt="">` : `<span class="rm-av" style="display:inline-block"></span>`;
    const setIn = (uid, on) => {
      busy = uid; msg = ""; draw();
      NP.setEnroll(ctx, uid, key, on).then(() => {
        const u = students.find((x) => x.uid === uid);
        if (u) { const c = Array.isArray(u.courses) ? u.courses.filter((k) => k !== key) : []; if (on) c.push(key); u.courses = c; }
        if (!on && sel === uid) sel = "";
      }).catch((e) => { msg = "Không lưu được (" + (e && (e.code || e.message) || "lỗi") + ")."; })
        .then(() => { busy = ""; confirmId = ""; draw(); });
    };
    const draw = () => {
      const list = build();
      const ids = {}; list.forEach((x) => (ids[x.id] = 1));
      const agg = {};
      docs.forEach((d) => { if (!d.n || !ids[d.studentId]) return; const a = (agg[d.n] = agg[d.n] || { count: 0, complete: 0, ans: 0, cor: 0 }); a.count++; const st = d.stats || {}; if (st.total && st.done >= st.total) a.complete++; a.ans += st.done || 0; a.cor += st.correct || 0; });
      Object.values(agg).forEach((a) => { a.score = a.ans ? Math.round((a.cor / a.ans) * 100) : 0; });
      const qq = q.trim().toLowerCase();
      const outs = students.filter((u) => !isIn(u)).filter((u) => !qq || String(u.name || "").toLowerCase().includes(qq) || String(u.email || "").toLowerCase().includes(qq))
        .sort((a, b) => ((docsOf[b.uid] || []).length - (docsOf[a.uid] || []).length) || String(a.name || a.email).localeCompare(String(b.name || b.email)));
      const selName = sel && (list.find((x) => x.id === sel) || {}).name;
      slot.innerHTML = `<div class="rm-tp"><h2>📊 Học sinh của khoá (${list.length})</h2><p>${sel ? "Đang xem kết quả của <b>" + esc(selName || "") + "</b> trên từng thẻ buổi bên dưới. Bấm lại tên để bỏ chọn." : "Chỉ học sinh được thầy thêm vào mới vào học được khoá này. Bấm vào tên để xem kết quả từng buổi trên các thẻ bên dưới, rồi bấm “👁 Xem bài trực tiếp” để mở bài bạn ấy đang làm. Chỉ thầy (tài khoản admin) mới thấy bảng này."}</p>
        <div class="rm-tpbar"><button type="button" class="rm-addb" data-act="pick">${picker ? "✕ Đóng" : "➕ Thêm học sinh vào khoá"}</button>${msg ? `<span class="rm-err">${esc(msg)}</span>` : ""}</div>
        ${picker ? `<div class="rm-pick"><input type="search" class="rm-q" placeholder="Tìm theo tên hoặc Gmail…" value="${esc(q)}">
          <div class="rm-pl">${outs.length ? outs.map((u) => { const n = (docsOf[u.uid] || []).length; return `<div class="rm-pr">${av(u)}<span class="nm"><b>${esc(u.name || "Học sinh")}</b><small>${esc(u.email || "")}${n ? " · đã học " + n + " buổi" : ""}</small></span><button type="button" class="rm-addb sm" data-act="add" data-id="${esc(u.uid)}" ${busy ? "disabled" : ""}>${busy === u.uid ? "…" : "Thêm"}</button></div>`; }).join("") : `<p class="rm-meta" style="margin:8px 4px">${students.length ? "Không còn học sinh nào khác" + (qq ? " khớp “" + esc(q) + "”" : "") + "." : "Chưa có tài khoản học sinh nào."} Học sinh cần đăng nhập Gmail ở trang web ít nhất 1 lần thì mới hiện trong danh sách này.</p>`}</div></div>` : ""}
        <div class="rm-tbl2"><table><thead><tr><th>Học sinh</th><th>Đã mở</th><th>Hoàn thành</th><th>Câu đã làm</th><th>Đúng</th><th>Lần cuối</th><th></th></tr></thead><tbody>
        ${list.length ? list.map((x) => `<tr class="st ${x.id === sel ? "on" : ""}" data-id="${esc(x.id)}"><td>${av(x)}${esc(x.name || x.email || "Học sinh")}</td><td>${x.started}/${total}</td><td><span class="rm-mini"><i style="width:${total ? Math.round((x.done / total) * 100) : 0}%"></i></span>${x.done}</td><td>${x.ans}</td><td>${x.ans ? x.score + "%" : "–"}</td><td>${x.last ? when(x.last) : "Chưa học"}</td><td><button type="button" class="rm-rm ${confirmId === x.id ? "on" : ""}" data-act="rm" data-id="${esc(x.id)}" ${busy ? "disabled" : ""}>${busy === x.id ? "…" : confirmId === x.id ? "Bỏ khỏi khoá?" : "✕"}</button></td></tr>`).join("") : `<tr><td colspan="7">Khoá này chưa có học sinh nào. Bấm “➕ Thêm học sinh vào khoá” để thêm.</td></tr>`}
        </tbody></table></div></div>`;
      slot.querySelectorAll("tr.st").forEach((tr) => tr.onclick = (e) => { if (e.target.closest("button")) return; sel = sel === tr.dataset.id ? "" : tr.dataset.id; confirmId = ""; draw(); });
      slot.querySelectorAll("button[data-act]").forEach((b) => b.onclick = () => {
        const act = b.dataset.act, id = b.dataset.id;
        if (act === "pick") { picker = !picker; draw(); if (picker) { const i = slot.querySelector(".rm-q"); i && i.focus(); } }
        else if (act === "add") setIn(id, true);
        else if (act === "rm") { if (confirmId === id) setIn(id, false); else { confirmId = id; draw(); } }
      });
      const qi = slot.querySelector(".rm-q");
      if (qi) qi.oninput = () => { q = qi.value; const pos = qi.selectionStart; draw(); const n = slot.querySelector(".rm-q"); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } };
      if (sel) { const st = list.find((x) => x.id === sel); const byN = {}; (st ? st.docs : []).forEach((d) => { if (d.n) byN[d.n] = d; }); paintCards(root, byN, false, sel, cfg.folder); }
      else paintCards(root, agg, true);
    };
    draw();
  }
  window.NightRoadmap = { render };
})();
