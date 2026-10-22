/* Night IELTS — khung bài học dùng chung cho MỌI khóa (khoahoc/night-engine.js).
   Mỗi trang bài học nằm trong thư mục khóa (khoahoc/<khóa>/buoi-XX.html), nạp <script src="../night-engine.js"></script>
   rồi gọi NightLesson.render({...}). Tên thư mục = mã khóa (giaotiep, speaking6, …) → dùng cho link "Lộ trình"
   mặc định (../<khóa>.html) và key lưu checklist bài về nhà (night-<khóa>-<id>-homework).
   Gồm: giọng đọc UK/US, dịch khi bôi đen, ô ghi chú, phụ đề trực tiếp (CC), quiz, từ vựng (ảnh Irasutoya/ảnh/emoji), nút In / PDF, các khối
   Speaking (cards, criteria, formula, models, speak + nút AI). Trước đây là giaotiep-engine.js + speaking-engine.js. */
(function() {
  const { useState, useRef, useEffect, useCallback } = React;
  const TTS_OK = typeof window !== "undefined" && "speechSynthesis" in window;
  let ACCENT = "en-GB";
  function pickVoice(lang) {
    if (!TTS_OK) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    return voices.find((v) => v.lang === lang && /Google|Natural|Premium|Enhanced/i.test(v.name)) || voices.find((v) => v.lang === lang) || voices.find((v) => v.lang && v.lang.replace("_", "-").startsWith(lang)) || voices.find((v) => v.lang && v.lang.startsWith("en")) || null;
  }
  function speak(text, rate = 0.9) {
    if (!TTS_OK || !text) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/\s*\|\s*/g, ", ").replace(/[()]/g, "").replace(/[‿↗↘]/g, " "));
      u.lang = ACCENT;
      const v = pickVoice(ACCENT);
      if (v) u.voice = v;
      u.rate = rate;
      window.speechSynthesis.speak(u);
    } catch (e) {
    }
  }
  if (TTS_OK) {
    window.speechSynthesis.onvoiceschanged = () => {
    };
  }
  function SpeakButton({ text, rate, label, className = "" }) {
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: !TTS_OK,
        onClick: (e) => {
          e.stopPropagation();
          speak(text, rate);
        },
        "aria-label": `Nghe: ${text}`,
        className: `inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-indigo-100 disabled:opacity-40 ${className}`
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "🔊"),
      label && /* @__PURE__ */ React.createElement("span", null, label)
    );
  }
  /* Ảnh minh họa thẻ từ vựng.
     Thẻ có thể thêm (ưu tiên từ trái sang phải): ira: "ten_anh.webp"  ·  img: "từ khóa tìm ảnh" | "https://…" | "img/b04/bus.jpg"  ·  emoji: "🚌"
     ira = ảnh Irasutoya (いらすとや) đã tải sẵn trong khoahoc/img/ira/ — đường dẫn tính theo vị trí file engine này,
     nên dùng được cho mọi khóa. Ảnh hỏng/không có → hiện emoji.
     img từ khóa → tìm Wikimedia Commons trước, không có thì Openverse (kết quả lưu lại trên máy học viên).
     Ảnh chỉ tải khi thẻ cuộn tới. */
  const ENGINE_SRC = (document.currentScript && document.currentScript.src) || "";
  const IRA_BASE = (() => { try { return new URL("img/ira/", ENGINE_SRC || location.href).href; } catch (e) { return "../img/ira/"; } })();
  const IMG_CACHE = "night-vocab-img-v1:";
  const IMG_DIRECT = /^(https?:)?\/\/|^[\w./-]+\.(jpe?g|png|webp|gif|svg)$/i;
  const imgPending = {};
  function findVocabImage(q) {
    try { const c = localStorage.getItem(IMG_CACHE + q); if (c) return Promise.resolve(JSON.parse(c)); } catch (e) {}
    if (imgPending[q]) return imgPending[q];
    const timeout = (p) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), 8000))]);
    const wiki = () => fetch("https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|mime&iiurlwidth=360&gsrsearch=" + encodeURIComponent(q + " filetype:bitmap"))
      .then((r) => r.json()).then((j) => {
        const pages = Object.values((j.query && j.query.pages) || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
        const p = pages.find((x) => x.imageinfo && /jpeg|png|webp/.test(x.imageinfo[0].mime || ""));
        return p ? { u: p.imageinfo[0].thumburl, src: "Wikimedia Commons", page: p.imageinfo[0].descriptionurl } : null;
      }).catch(() => null);
    const ov = () => fetch("https://api.openverse.org/v1/images/?page_size=1&mature=false&q=" + encodeURIComponent(q))
      .then((r) => r.json()).then((j) => { const x = j.results && j.results[0]; return x ? { u: x.thumbnail, src: "Openverse", page: x.foreign_landing_url } : null; }).catch(() => null);
    imgPending[q] = timeout(wiki()).then((r) => r || timeout(ov())).then((r) => {
      const v = r || { none: true };
      try { localStorage.setItem(IMG_CACHE + q, JSON.stringify(v)); } catch (e) {}
      delete imgPending[q];
      return v;
    });
    return imgPending[q];
  }
  function VocabVisual({ img, emoji, ira }) {
    const local = !!ira;
    const direct = local || (img && IMG_DIRECT.test(img));
    const [res, setRes] = useState(local ? { u: IRA_BASE + ira, ira: true } : direct ? { u: img } : null);
    const [broken, setBroken] = useState(false);
    const box = useRef(null);
    useEffect(() => {
      if (local) { setRes({ u: IRA_BASE + ira, ira: true }); setBroken(false); return; }
      if (!img || direct) return;
      let alive = true;
      const go = () => findVocabImage(img).then((r) => alive && setRes(r));
      if (!("IntersectionObserver" in window) || !box.current) { go(); return () => { alive = false; }; }
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: "300px" });
      io.observe(box.current);
      return () => { alive = false; io.disconnect(); };
    }, [img, ira]);
    const showImg = res && res.u && !broken;
    return React.createElement("div", { ref: box, className: "relative mb-2 flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl " + (showImg ? "bg-white" : "bg-white/50") },
      showImg
        ? React.createElement("img", { src: res.u, alt: "", loading: "lazy", decoding: "async", draggable: false, referrerPolicy: "no-referrer", onError: () => setBroken(true), className: res.ira ? "h-full w-full object-contain p-1" : "h-full w-full object-cover" })
        : React.createElement("span", { className: "text-4xl leading-none" + (img && !res ? " animate-pulse opacity-60" : "") }, emoji || (img ? "🖼️" : "📘")),
      showImg && res.src && React.createElement("a", {
        href: res.page || "#", target: "_blank", rel: "noopener",
        onClick: (e) => e.stopPropagation(),
        className: "absolute bottom-0 right-0 rounded-tl-lg bg-black/45 px-1.5 text-[9px] font-medium text-white/90 no-underline"
      }, "Ảnh: ", res.src));
  }
  function InteractiveVocab({ word, phonetic, meaning, example, img, emoji, ira, visual }) {
    const [flipped, setFlipped] = useState(false);
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: `perspective-1000 ${visual ? "h-64" : "h-44"} w-full max-w-[220px] cursor-pointer select-none`,
        onClick: () => setFlipped(!flipped)
      },
      /* @__PURE__ */ React.createElement("div", { className: `flip-card-inner ${flipped ? "rotate-y-180" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: `flip-card-front flex h-full flex-col items-center ${visual ? "justify-start p-3" : "justify-center p-4"} rounded-3xl border border-amber-200 bg-vocab-bg text-center shadow-floating` }, visual && React.createElement(VocabVisual, { img, emoji, ira }), /* @__PURE__ */ React.createElement("p", { className: `${visual ? "text-base leading-tight" : "text-lg"} font-bold text-slate-800` }, word), phonetic && /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm text-slate-600" }, phonetic), /* @__PURE__ */ React.createElement(SpeakButton, { text: word, className: "mt-2 bg-white/70" }), /* @__PURE__ */ React.createElement("p", { className: `${visual ? "mt-auto pt-1 text-[10px]" : "mt-2 text-[11px]"} font-semibold uppercase tracking-wide text-slate-500` }, "Chạm để xem nghĩa")), /* @__PURE__ */ React.createElement("div", { className: "flip-card-back flex h-full flex-col items-center justify-center rounded-3xl border border-sky-200 bg-vocab-back/90 p-4 text-center text-white shadow-floating" }, /* @__PURE__ */ React.createElement("p", { className: "text-base font-bold" }, meaning), example && /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-xs italic text-sky-50" }, '"', example, '"')))
    );
  }
  function ParagraphBlock({ index, heading, text, lines, speakers = [], vocabHighlights = [], inlineImage }) {
    const alignRight = index % 2 === 0;
    const fullText = lines ? lines.map((l) => l.line).join(" ") : text;
    return /* @__PURE__ */ React.createElement("div", { className: `flex flex-col gap-6 md:flex-row ${alignRight ? "md:flex-row-reverse" : ""} items-start` }, /* @__PURE__ */ React.createElement("div", { className: "w-full flex-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-floating" }, /* @__PURE__ */ React.createElement("div", { className: "mb-3 flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white" }, index), heading && /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-slate-700" }, heading), /* @__PURE__ */ React.createElement("div", { className: "h-px flex-1 bg-slate-100" }), /* @__PURE__ */ React.createElement(SpeakButton, { text: fullText, rate: 0.85, label: "Cả đoạn" })), text && /* @__PURE__ */ React.createElement("p", { className: "leading-relaxed text-slate-700" }, text), lines && /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, lines.map((l, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: `flex items-start gap-3 ${l.who === speakers[0] ? "" : "flex-row-reverse text-right"}` }, /* @__PURE__ */ React.createElement("span", { className: `mt-0.5 flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${l.who === speakers[0] ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}` }, l.who), React.createElement(Cover, null, React.createElement("p", { className: "flex-1 leading-relaxed text-slate-700" }, l.line, " ", /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !TTS_OK, onClick: () => speak(l.line, 0.85), className: "text-xs text-primary/70 hover:text-primary disabled:opacity-30", "aria-label": "Nghe câu này" }, "🔊")))))), inlineImage && /* @__PURE__ */ React.createElement("figure", { className: "mt-4" }, /* @__PURE__ */ React.createElement("img", { src: inlineImage.src, alt: inlineImage.caption || "", className: "w-full rounded-2xl object-cover" }), inlineImage.caption && /* @__PURE__ */ React.createElement("figcaption", { className: "mt-2 text-center text-xs text-slate-400" }, inlineImage.caption))), vocabHighlights.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "grid w-full flex-shrink-0 grid-cols-2 gap-3 sm:flex sm:flex-wrap md:w-56" }, vocabHighlights.map((v, i) => /* @__PURE__ */ React.createElement(InteractiveVocab, { key: i, ...v }))));
  }
  /* ---------- 🎀 Giảng vocab: dùng chung file ../vocab-teach.js của cả web (nạp khi cần) ---------- */
  function openVocabTeach(word, range) {
    const go = () => { const V = window.NightVocabTeach; if (V) V.open(word, { sentence: V.sentenceOf(range, word) }); };
    if (window.NightVocabTeach) return go();
    const s = document.createElement("script");
    s.src = new URL("../vocab-teach.js", ENGINE_SRC || location.href).href;
    s.onload = go;
    document.head.appendChild(s);
  }
  // Bôi đen chữ trong bài → thanh nhỏ: in đậm, gạch chân, tô màu, chữ đỏ, bỏ định dạng, Dịch
  function SelectionTranslateTooltip({ containerRef }) {
    const [tooltip, setTooltip] = useState(null);
    const readSelection = useCallback(() => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : "";
      if (!text || !containerRef.current || sel.rangeCount === 0) { setTooltip(null); return; }
      const range = sel.getRangeAt(0);
      if (!containerRef.current.contains(range.commonAncestorContainer)) { setTooltip(null); return; }
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) { setTooltip(null); return; }
      const left = Math.min(Math.max(rect.left + rect.width / 2, 170), window.innerWidth - 170) + window.scrollX;
      setTooltip({ top: rect.bottom + window.scrollY + 10, left, text, range: range.cloneRange() });
    }, [containerRef]);
    useEffect(() => {
      const onMouseUp = () => setTimeout(readSelection, 0);
      const onTouchEnd = () => setTimeout(readSelection, 10);
      const onSelectionChange = () => { const sel = window.getSelection(); if (!sel || sel.toString().trim() === "") setTooltip(null); };
      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("touchend", onTouchEnd);
      document.addEventListener("selectionchange", onSelectionChange);
      return () => {
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("touchend", onTouchEnd);
        document.removeEventListener("selectionchange", onSelectionChange);
      };
    }, [readSelection]);
    if (!tooltip) return null;
    const done = () => { try { window.getSelection().removeAllRanges(); } catch (e) {} setTooltip(null); };
    const act = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn(); };
    const openTranslate = () => window.open(`https://translate.google.com/?sl=auto&tl=vi&text=${encodeURIComponent(tooltip.text)}&op=translate`, "_blank", "noopener");
    const E = React.createElement;
    return E("div", { style: { position: "absolute", top: tooltip.top, left: tooltip.left, transform: "translateX(-50%)" }, className: "z-[60] flex flex-col items-center", onMouseDown: (e) => e.preventDefault() },
      E("span", { className: "-mb-1 text-sm leading-none text-slate-800" }, "▲"),
      E("div", { className: "flex items-center gap-0.5 rounded-full bg-slate-800 p-1 shadow-premium" },
        HL_OK && MARKS.map((m) => E("button", { key: m.k, type: "button", title: m.title, "aria-label": m.title, onPointerDown: act(() => { markRange(m.k, tooltip.range); done(); }),
          className: "flex h-8 w-8 items-center justify-center rounded-full text-sm text-white hover:bg-white/15" },
          m.dot ? E("span", { className: "h-4 w-4 rounded-full ring-2 ring-white/60", style: { background: m.dot } }) : E("span", { className: m.cls }, m.label))),
        HL_OK && E("button", { type: "button", title: "Bỏ định dạng", "aria-label": "Bỏ định dạng", onPointerDown: act(() => { unmarkRange(tooltip.range); done(); }), className: "flex h-8 w-8 items-center justify-center rounded-full text-sm text-white/70 hover:bg-white/15" }, "⌫"),
        HL_OK && E("span", { className: "mx-0.5 h-5 w-px bg-white/25" }),
        E("button", { type: "button", onPointerDown: act(openTranslate), className: "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white" }, "Dịch"),
        tooltip.text.split(/\s+/).length <= 6 && tooltip.text.length <= 60 && E("button", { type: "button", title: "Mở thẻ giảng từ này cho cả lớp", onPointerDown: act(() => { const w = tooltip.text.replace(/^[^\w]+|[^\w]+$/g, "") || tooltip.text; const rg = tooltip.range; done(); openVocabTeach(w, rg); }),
          className: "ml-0.5 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-3 py-1.5 text-xs font-extrabold text-white shadow" }, "🎀 Giảng vocab")));
  }
  const NV_TONES = ["bg-peach text-white", "bg-primary text-white", "bg-ink text-white"];
  function Section({ id, step, title, desc, children, sticker, band8 }) {
    const E = React.createElement;
    const tone = band8 ? "bg-amber-400 text-ink" : NV_TONES[(parseInt(step, 10) - 1 + 3) % 3];
    return E("section", { id, className: "scroll-mt-24" }, E("div", { className: "mb-5 flex items-center gap-3 sm:gap-4" },
      E("span", { className: `flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold shadow-sm sm:h-14 sm:w-14 sm:rounded-[20px] sm:text-xl ${tone}` }, step),
      E("div", { className: "min-w-0 flex-1" },
        band8 && E("span", { className: "mb-1 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-amber-700" }, "★ Band 8"),
        E("h2", { className: "text-xl font-extrabold leading-tight tracking-tight text-ink sm:text-[1.7rem]" }, title),
        desc && E("p", { className: "mt-1 text-sm text-slate-500" }, rich(desc))),
      sticker && E("img", { src: IRA_BASE + sticker, alt: "", "aria-hidden": "true", loading: "lazy", className: "nv-float -mb-1 h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20", onError: (e) => { e.currentTarget.style.display = "none"; } })),
      E("div", { className: "rounded-[26px] bg-panel p-3 sm:rounded-[32px] sm:p-5" }, children));
  }
  const BADGES = {
    long: ["Dài", "bg-indigo-100 text-primary"],
    short: ["Ngắn", "bg-amber-100 text-amber-700"],
    diph: ["Đôi", "bg-sky-100 text-sky-700"],
    voiceless: ["Vô thanh", "bg-rose-100 text-rose-600"],
    voiced: ["Hữu thanh", "bg-emerald-100 text-emerald-700"],
    other: ["Hữu thanh", "bg-emerald-100 text-emerald-700"]
  };
  function VowelCard({ v }) {
    const [open, setOpen] = useState(false);
    const [badgeText, badge] = BADGES[v.type] || BADGES.short;
    const word = v.word || v.job;
    const wordIpa = v.wordIpa || v.jobIpa;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        onClick: () => {
          setOpen(!open);
          speak(word, 0.8);
        },
        className: `cursor-pointer rounded-3xl border bg-white p-4 shadow-floating transition hover:-translate-y-0.5 ${open ? "border-primary/40" : "border-slate-200"}`
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "font-serif text-3xl font-bold text-slate-900" }, "/", v.ipa, "/"), /* @__PURE__ */ React.createElement("span", { className: `rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badge}` }, v.badge || badgeText)),
      /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-base font-bold text-primary" }, word),
      /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400" }, wordIpa),
      open && /* @__PURE__ */ React.createElement("div", { className: "mt-3 border-t border-slate-100 pt-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs leading-relaxed text-slate-600" }, rich(v.tip)), /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex flex-wrap gap-1.5" }, v.more.split(" · ").map((w) => /* @__PURE__ */ React.createElement(SpeakButton, { key: w, text: w, label: w, rate: 0.8 }))))
    );
  }
  function VowelChart({ mono = [], diph = [], tabs, hint, mistakes = [], mistakesTitle }) {
    const allTabs = tabs || [
      { label: `${mono.length} nguyên âm đơn`, items: mono },
      { label: `${diph.length} nguyên âm đôi`, items: diph }
    ];
    const [tab, setTab] = useState(0);
    const list = (allTabs[tab] || allTabs[0]).items;
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "mb-4 inline-flex flex-wrap rounded-3xl border border-slate-200 bg-white p-1 shadow-sm" }, allTabs.map((t, k) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: k,
        onClick: () => setTab(k),
        className: `rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === k ? "bg-primary text-white shadow-premium" : "text-slate-500 hover:text-slate-800"}`
      },
      t.label
    ))), /* @__PURE__ */ React.createElement("p", { className: "mb-4 text-sm text-slate-500" }, hint || "Chạm vào từng thẻ để nghe từ ví dụ và xem mẹo khẩu hình."), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" }, list.map((v) => /* @__PURE__ */ React.createElement(VowelCard, { key: v.ipa, v }))), mistakes.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-6 rounded-3xl border border-rose-100 bg-rose-50/60 p-5" }, /* @__PURE__ */ React.createElement("p", { className: "mb-3 text-sm font-bold text-rose-600" }, mistakesTitle || "Lỗi người Việt hay gặp"), /* @__PURE__ */ React.createElement("div", { className: "grid gap-3 sm:grid-cols-2" }, mistakes.map((m, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "rounded-2xl bg-white p-3 text-sm shadow-sm" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-slate-800" }, "✗ ", rich(m.wrong)), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-slate-600" }, "✓ ", rich(m.fix)))))));
  }
  const QUIZ_ROUNDS = 10;
  function makeRound(pairs) {
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    const answer = Math.random() < 0.5 ? "a" : "b";
    const swap = Math.random() < 0.5;
    return { pair, answer, order: swap ? ["b", "a"] : ["a", "b"] };
  }
  function MinimalPairQuiz({ pairs }) {
    const [round, setRound] = useState(() => makeRound(pairs));
    const [n, setN] = useState(1);
    const [score, setScore] = useState(0);
    const [picked, setPicked] = useState(null);
    const [done, setDone] = useState(false);
    const word = round.pair[round.answer];
    const play = () => speak(word, 0.8);
    const choose = (k) => {
      if (picked) return;
      setPicked(k);
      if (k === round.answer) setScore((s) => s + 1);
    };
    const next = () => {
      if (n >= QUIZ_ROUNDS) {
        setDone(true);
        return;
      }
      const r = makeRound(pairs);
      setRound(r);
      setPicked(null);
      setN(n + 1);
      setTimeout(() => speak(r.pair[r.answer], 0.8), 150);
    };
    const restart = () => {
      setRound(makeRound(pairs));
      setN(1);
      setScore(0);
      setPicked(null);
      setDone(false);
    };
    if (!TTS_OK) {
      return /* @__PURE__ */ React.createElement("p", { className: "rounded-3xl bg-white p-6 text-sm text-slate-500 shadow-floating" }, "Thiết bị này chưa hỗ trợ giọng đọc — hãy mở bằng Chrome hoặc Safari để làm quiz.");
    }
    if (done) {
      return /* @__PURE__ */ React.createElement("div", { className: "rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-floating" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-slate-500" }, "Kết quả"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-5xl font-extrabold text-primary" }, score, "/", QUIZ_ROUNDS), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-slate-600" }, score >= 8 ? "Tai nghe rất tốt! 🎉" : "Nghe lại bảng nguyên âm rồi thử lần nữa nhé."), /* @__PURE__ */ React.createElement("button", { onClick: restart, className: "mt-5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-premium" }, "Làm lại"));
    }
    return /* @__PURE__ */ React.createElement("div", { className: "rounded-3xl border border-slate-200 bg-white p-6 shadow-floating" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between text-xs font-semibold text-slate-400" }, /* @__PURE__ */ React.createElement("span", null, "Câu ", n, "/", QUIZ_ROUNDS), /* @__PURE__ */ React.createElement("span", null, "Đúng: ", score)), /* @__PURE__ */ React.createElement("div", { className: "mt-1 h-1.5 w-full rounded-full bg-slate-100" }, /* @__PURE__ */ React.createElement("div", { className: "h-1.5 rounded-full bg-primary transition-all", style: { width: `${(n - 1) / QUIZ_ROUNDS * 100}%` } })), /* @__PURE__ */ React.createElement("div", { className: "mt-6 flex flex-col items-center" }, /* @__PURE__ */ React.createElement("button", { onClick: play, className: "flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl text-white shadow-premium transition hover:bg-primary-dark" }, "🔊"), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-xs text-slate-400" }, "Bấm để nghe — bạn nghe thấy từ nào?")), /* @__PURE__ */ React.createElement("div", { className: "mt-6 grid grid-cols-2 gap-3" }, round.order.map((k) => {
      const w = round.pair[k];
      const ipa = round.pair[k + "i"];
      let style = "border-slate-200 bg-slate-50 hover:border-primary/40";
      if (picked) {
        if (k === round.answer) style = "border-emerald-300 bg-emerald-50";
        else if (k === picked) style = "border-rose-300 bg-rose-50";
        else style = "border-slate-200 bg-slate-50 opacity-60";
      }
      return /* @__PURE__ */ React.createElement("button", { key: k, onClick: () => choose(k), className: `rounded-2xl border-2 p-4 text-center transition ${style}` }, /* @__PURE__ */ React.createElement("p", { className: "text-xl font-bold text-slate-800" }, w), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-500" }, ipa));
    })), picked && /* @__PURE__ */ React.createElement("div", { className: "mt-5 flex flex-wrap items-center justify-between gap-3" }, /* @__PURE__ */ React.createElement("p", { className: `text-sm font-semibold ${picked === round.answer ? "text-emerald-600" : "text-rose-500"}` }, picked === round.answer ? "Chính xác!" : `Chưa đúng — đáp án là “${word}”.`), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(SpeakButton, { text: round.pair.a, label: round.pair.a, rate: 0.8 }), /* @__PURE__ */ React.createElement(SpeakButton, { text: round.pair.b, label: round.pair.b, rate: 0.8 }), /* @__PURE__ */ React.createElement("button", { onClick: next, className: "rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white shadow-premium" }, n >= QUIZ_ROUNDS ? "Xem kết quả" : "Câu tiếp →"))));
  }
  const THINK_SECONDS = 15;
  function ReflexDrill({ questions: QUESTIONS }) {
    const [idx, setIdx] = useState(0);
    const [phase, setPhase] = useState("ready");
    const [left, setLeft] = useState(THINK_SECONDS);
    const [shuffle, setShuffle] = useState(false);
    const [order, setOrder] = useState(QUESTIONS.map((_, i) => i));
    const item = QUESTIONS[order[idx]];
    useEffect(() => {
      if (phase !== "answering") return;
      if (left <= 0) {
        setPhase("reveal");
        return;
      }
      const t = setTimeout(() => setLeft((l) => l - 1), 1e3);
      return () => clearTimeout(t);
    }, [phase, left]);
    const start = () => {
      setLeft(THINK_SECONDS);
      setPhase("answering");
      speak(item.q, 0.9);
    };
    const go = (d) => {
      const ni = (idx + d + order.length) % order.length;
      setIdx(ni);
      setPhase("ready");
      setLeft(THINK_SECONDS);
    };
    const toggleShuffle = () => {
      const next = !shuffle;
      setShuffle(next);
      const base = QUESTIONS.map((_, i) => i);
      if (next) base.sort(() => Math.random() - 0.5);
      setOrder(base);
      setIdx(0);
      setPhase("ready");
    };
    const pct = left / THINK_SECONDS * 100;
    return /* @__PURE__ */ React.createElement("div", { className: "rounded-3xl border border-slate-200 bg-white p-6 shadow-floating" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold text-slate-400" }, "Câu ", idx + 1, "/", order.length), /* @__PURE__ */ React.createElement("button", { onClick: toggleShuffle, className: `rounded-full px-3 py-1 text-xs font-semibold ${shuffle ? "bg-primary text-white" : "bg-slate-100 text-slate-500"}` }, "🔀 Xáo trộn")), /* @__PURE__ */ React.createElement("div", { className: "mt-5 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-extrabold text-slate-900 sm:text-3xl" }, item.q), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm text-slate-400" }, item.vi), /* @__PURE__ */ React.createElement(SpeakButton, { text: item.q, label: "Nghe câu hỏi", className: "mt-3" })), phase === "ready" && /* @__PURE__ */ React.createElement("div", { className: "mt-6 text-center" }, /* @__PURE__ */ React.createElement("button", { onClick: start, className: "rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-premium hover:bg-primary-dark" }, "Bắt đầu trả lời (", THINK_SECONDS, "s)"), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-xs text-slate-400" }, "Nói to câu trả lời của bạn trước khi hết giờ.")), phase === "answering" && /* @__PURE__ */ React.createElement("div", { className: "mt-6" }, /* @__PURE__ */ React.createElement("div", { className: "h-2 w-full rounded-full bg-slate-100" }, /* @__PURE__ */ React.createElement("div", { className: `h-2 rounded-full transition-all duration-1000 ${left <= 5 ? "bg-rose-400" : "bg-primary"}`, style: { width: `${pct}%` } })), /* @__PURE__ */ React.createElement("p", { className: "mt-3 text-center text-4xl font-extrabold tabular-nums text-primary" }, left), /* @__PURE__ */ React.createElement("div", { className: "mt-3 flex flex-wrap justify-center gap-2" }, item.frames.map((f) => /* @__PURE__ */ React.createElement("span", { key: f, className: "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700" }, f))), /* @__PURE__ */ React.createElement("div", { className: "mt-4 text-center" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setPhase("reveal"), className: "text-xs font-semibold text-slate-400 underline" }, "Xem câu mẫu luôn"))), phase === "reveal" && /* @__PURE__ */ React.createElement("div", { className: "mt-6 rounded-2xl bg-sky-50 p-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wide text-sky-700" }, "Câu trả lời mẫu"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 leading-relaxed text-slate-800" }, item.sample), /* @__PURE__ */ React.createElement("div", { className: "mt-3 flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement(SpeakButton, { text: item.sample, label: "Nghe mẫu", rate: 0.85, className: "bg-white" }), /* @__PURE__ */ React.createElement("button", { onClick: start, className: "rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm" }, "↺ Thử lại"))), /* @__PURE__ */ React.createElement("div", { className: "mt-6 flex justify-between" }, /* @__PURE__ */ React.createElement("button", { onClick: () => go(-1), className: "rounded-full px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100" }, "← Trước"), /* @__PURE__ */ React.createElement("button", { onClick: () => go(1), className: "rounded-full bg-primary-light px-4 py-2 text-sm font-semibold text-primary hover:bg-indigo-100" }, "Câu tiếp →")));
  }
  function Homework({ tasks: HOMEWORK, storageKey: KEY }) {
    const [done, setDone] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem(KEY)) || [];
      } catch (e) {
        return [];
      }
    });
    const toggle = (i) => {
      const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
      setDone(next);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch (e) {
      }
    };
    return /* @__PURE__ */ React.createElement("div", { className: "rounded-3xl border border-slate-200 bg-white p-6 shadow-floating" }, /* @__PURE__ */ React.createElement("div", { className: "mb-4 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-slate-500" }, "Hoàn thành ", done.length, "/", HOMEWORK.length), done.length === HOMEWORK.length && /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold text-emerald-600" }, "Xuất sắc! 🎉")), /* @__PURE__ */ React.createElement("ul", { className: "space-y-2" }, HOMEWORK.map((h, i) => /* @__PURE__ */ React.createElement("li", { key: i }, /* @__PURE__ */ React.createElement("label", { className: "flex cursor-pointer items-start gap-3 rounded-2xl p-2 hover:bg-slate-50" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: done.includes(i), onChange: () => toggle(i), className: "mt-1 h-4 w-4 accent-primary" }), /* @__PURE__ */ React.createElement("span", { className: `text-sm leading-relaxed ${done.includes(i) ? "text-slate-400 line-through" : "text-slate-700"}` }, rich(h)))))));
  }
  const IPA_GROUPS = [
    { label: "Nguyên âm đơn", items: [
      ["i:", "iː", "sheep"],
      ["I", "ɪ", "ship (hoặc /ih)"],
      ["ae", "æ", "cat"],
      ["^", "ʌ", "cup (hoặc /uh)"],
      ["a:", "ɑː", "car"],
      ["O", "ɒ", "hot (hoặc /oh)"],
      ["o:", "ɔː", "door"],
      ["U", "ʊ", "book"],
      ["u:", "uː", "food"],
      ["3:", "ɜː", "bird"],
      ["3", "ɜ", "(không dài)"],
      ["@", "ə", "about (schwa)"]
    ] },
    { label: "Nguyên âm đôi", items: [
      ["ei", "eɪ", "day"],
      ["ai", "aɪ", "my"],
      ["oi", "ɔɪ", "boy"],
      ["au", "aʊ", "now"],
      ["ou", "əʊ", "go (hoặc /@u)"],
      ["i@", "ɪə", "near"],
      ["e@", "eə", "hair"],
      ["u@", "ʊə", "tour"]
    ] },
    { label: "Phụ âm", items: [
      ["th", "θ", "think"],
      ["dh", "ð", "this"],
      ["sh", "ʃ", "shop"],
      ["zh", "ʒ", "usually"],
      ["ch", "tʃ", "chair"],
      ["d3", "dʒ", "job (hoặc /dj)"],
      ["ng", "ŋ", "sing"]
    ] },
    { label: "Ký hiệu", items: [
      ["'", "ˈ", "trọng âm chính"],
      [",", "ˌ", "trọng âm phụ"],
      [":", "ː", "âm dài"],
      ["->", "→", "mũi tên"],
      ["/", "∕", "gõ // để ra dấu / thường"]
    ] }
  ];
  const IPA_CODES = { ih: "ɪ", uh: "ʌ", oh: "ɒ", "@u": "əʊ", dj: "dʒ" };
  IPA_GROUPS.forEach((g) => g.items.forEach(([c, s]) => {
    if (c !== "/") IPA_CODES[c] = s;
  }));
  const IPA_KEYS = Object.keys(IPA_CODES);
  const hasLonger = (t) => IPA_KEYS.some((k) => k.length > t.length && k.startsWith(t));
  function expandIpaAtCaret() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !sel.isCollapsed) return false;
    const node = sel.anchorNode;
    if (!node || node.nodeType !== 3) return false;
    const off = sel.anchorOffset;
    const full = node.textContent;
    const T = full.slice(0, off);
    let start, len, sym;
    if (T.endsWith("//")) {
      start = off - 2;
      len = 2;
      sym = "∕";
    } else {
      const idx = T.lastIndexOf("/");
      if (idx < 0 || off - idx > 5) return false;
      const tok = T.slice(idx + 1);
      if (!tok) {
        const T2 = T.slice(0, -1);
        const i2 = T2.lastIndexOf("/");
        const tok2 = i2 >= 0 ? T2.slice(i2 + 1) : "";
        if (!tok2 || !IPA_CODES[tok2] || off - i2 > 6) return false;
        start = i2;
        len = tok2.length + 1;
        sym = IPA_CODES[tok2];
      } else if (IPA_CODES[tok] && !hasLonger(tok)) {
        start = idx;
        len = tok.length + 1;
        sym = IPA_CODES[tok];
      } else if (hasLonger(tok)) return false;
      else {
        const head = tok.slice(0, -1);
        if (!head || !IPA_CODES[head]) return false;
        start = idx;
        len = head.length + 1;
        sym = IPA_CODES[head];
      }
    }
    node.textContent = full.slice(0, start) + sym + full.slice(start + len);
    const r = document.createRange();
    r.setStart(node, off - len + sym.length);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    return true;
  }
  const NOTE_COLORS = ["#0f172a", "#e11d48", "#4338ca", "#059669", "#ea580c", "#9333ea"];
  const NOTE_BGS = ["#ffffff", "#fef9c3", "#e0f2fe", "#dcfce7", "#fce7f3"];
  const clampN = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Ô ghi chú: tiện ích dùng chung ---------- */
  // AI dùng CHUNG key Groq với cả web (localStorage "nightIeltsGroqCfg" — Speaking, Writing, Test Builder)
  function getGroqCfg() { try { return JSON.parse(localStorage.getItem("nightIeltsGroqCfg") || "{}"); } catch (e) { return {}; } }
  function saveGroqKey(key) { const c = getGroqCfg(); c.apiKey = key; try { localStorage.setItem("nightIeltsGroqCfg", JSON.stringify(c)); } catch (e) {} }
  const NOTE_AI_PROMPT = "You clean up speech-to-text dictation for a teacher's notes. The text may be English, Vietnamese, or a mix.\n" +
    "Rules:\n- Keep the SAME language(s) as the input. Never translate.\n" +
    "- Make MINIMAL edits: remove filler words and accidental repetitions (uh, um, ờ, à, ừm, kiểu là, repeated words/phrases), fix words that were clearly misrecognised (use context), fix spelling, and restore missing Vietnamese diacritics.\n" +
    "- Add correct punctuation, capitalisation and sentence breaks; split into short paragraphs or a list only if the speaker clearly listed items.\n" +
    "- Do NOT add ideas, explanations or examples. Do NOT change the meaning. Do NOT make it more formal, academic or fancy. Keep the speaker's own words and level (no overcorrection). Keep IPA symbols, names and English example words as they are.\n" +
    "- Output ONLY the cleaned text, no quotes, no comments.";
  async function noteAiRewrite(text) {
    const cfg = getGroqCfg();
    if (!cfg.apiKey) { const e = new Error("NO_KEY"); e.code = "NO_KEY"; throw e; }
    const model = cfg.model || "openai/gpt-oss-120b";
    let payload = { model, temperature: 0.2, max_completion_tokens: 2000, messages: [{ role: "system", content: NOTE_AI_PROMPT }, { role: "user", content: text }] };
    if (/gpt-oss/i.test(model)) payload.reasoning_effort = "low";
    let res;
    for (let i = 0; i < 3; i++) {
      res = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.apiKey }, body: JSON.stringify(payload) });
      if (res.status === 400 && payload.reasoning_effort) { payload = { ...payload }; delete payload.reasoning_effort; continue; }
      if (res.status !== 429 || i === 2) break;
      await new Promise((r) => setTimeout(r, 4000));
    }
    if (res.status === 401) throw new Error("Groq key không hợp lệ — kiểm tra lại key.");
    if (!res.ok) throw new Error("AI lỗi (HTTP " + res.status + "), thử lại nhé.");
    const j = await res.json();
    const out = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!out) throw new Error("AI không trả lời, thử lại nhé.");
    return out.replace(/^\s*["“]|["”]\s*$/g, "").trim();
  }
  async function groqTranscribe(blob, lang) {
    const cfg = getGroqCfg();
    if (!cfg.apiKey) { const e = new Error("NO_KEY"); e.code = "NO_KEY"; throw e; }
    const fd = new FormData();
    fd.append("file", blob, "voice." + (blob.type.includes("mp4") ? "m4a" : "webm"));
    fd.append("model", "whisper-large-v3");
    fd.append("language", lang === "vi" ? "vi" : "en");
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: "Bearer " + cfg.apiKey }, body: fd });
    if (!res.ok) throw new Error("Không nhận diện được giọng nói (HTTP " + res.status + ").");
    const j = await res.json();
    return (j.text || "").trim();
  }
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const textToHtml = (s) => escHtml(s).replace(/\r?\n/g, "<br>");

  // Dán từ web: giữ định dạng (đậm, nghiêng, gạch chân, màu chữ, highlight, xuống dòng, danh sách, ảnh)
  // nhưng bỏ cỡ chữ / font / khung / nền của thẻ — để vẫn chỉnh tiếp được bằng thanh công cụ.
  function cleanPastedHtml(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const out = document.createElement("div");
    const SKIP = /^(SCRIPT|STYLE|META|LINK|TITLE|BUTTON|INPUT|SELECT|TEXTAREA|SVG|NOSCRIPT|TEMPLATE|IFRAME|AUDIO|VIDEO|CANVAS|OBJECT)$/;
    const BLOCK = /^(P|DIV|LI|H[1-6]|TR|BLOCKQUOTE|SECTION|ARTICLE|HEADER|FOOTER|ASIDE|NAV|MAIN|FIGURE|FIGCAPTION|DT|DD|PRE|TABLE|UL|OL|DL|FORM|FIELDSET|DETAILS|SUMMARY)$/;
    const isGray = (c) => { const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/); if (!m) return /^(black|inherit|initial|currentcolor|#0{3,6})$/i.test(c.trim()); if (m[4] !== undefined && +m[4] < 0.2) return true; const [r, g, b] = [+m[1], +m[2], +m[3]]; return Math.max(r, g, b) - Math.min(r, g, b) < 30; };
    const isClearBg = (c) => { const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/); if (!m) return /transparent|none|initial|inherit|white|#fff/i.test(c); if (m[4] !== undefined && +m[4] < 0.2) return true; return +m[1] > 245 && +m[2] > 245 && +m[3] > 245; };
    const walk = (node, parent) => {
      node.childNodes.forEach((c) => {
        if (c.nodeType === 3) { const t = c.textContent.replace(/[\t\r\n ]+/g, " "); if (t) parent.appendChild(document.createTextNode(t)); return; }
        if (c.nodeType !== 1) return;
        const tag = c.tagName.toUpperCase();
        if (SKIP.test(tag) || c.getAttribute("aria-hidden") === "true") return;
        if (tag === "BR") { parent.appendChild(document.createElement("br")); return; }
        if (tag === "IMG") {
          const src = c.getAttribute("src") || "";
          if (/^(data:image\/|https?:)/i.test(src)) { const im = document.createElement("img"); im.src = src; im.style.width = Math.min(+c.getAttribute("width") || 260, 320) + "px"; parent.appendChild(im); }
          return;
        }
        const st = c.getAttribute("style") || "";
        const get = (p) => { const m = st.match(new RegExp("(?:^|;)\\s*" + p + "\\s*:\\s*([^;]+)", "i")); return m ? m[1].trim() : ""; };
        let host = parent;
        const block = BLOCK.test(tag);
        if (block && tag !== "UL" && tag !== "OL" && tag !== "TABLE") { const d = document.createElement("div"); if (tag === "LI") d.appendChild(document.createTextNode("• ")); parent.appendChild(d); host = d; }
        const fw = get("font-weight");
        if (/^(B|STRONG|H[1-6]|TH)$/.test(tag) || fw === "bold" || +fw >= 600) { const x = document.createElement("b"); host.appendChild(x); host = x; }
        if (/^(I|EM)$/.test(tag) || /italic/i.test(get("font-style"))) { const x = document.createElement("i"); host.appendChild(x); host = x; }
        if (tag === "U" || /underline/i.test(get("text-decoration") + get("text-decoration-line"))) { const x = document.createElement("u"); host.appendChild(x); host = x; }
        const col = get("color");
        const bg = !block ? (get("background-color") || get("background")) : "";
        if ((col && !isGray(col)) || (bg && !isClearBg(bg) && !/url\(|gradient/i.test(bg))) {
          const x = document.createElement("span");
          if (col && !isGray(col)) x.style.color = col;
          if (bg && !isClearBg(bg) && !/url\(|gradient/i.test(bg)) x.style.backgroundColor = bg;
          host.appendChild(x); host = x;
        }
        if (tag === "MARK") { const x = document.createElement("span"); x.style.backgroundColor = "#fde047"; host.appendChild(x); host = x; }
        walk(c, host);
        if (tag === "TD" || tag === "TH") host.appendChild(document.createTextNode(" "));
      });
    };
    walk(doc.body, out);
    out.querySelectorAll("div,b,i,u,span").forEach((el) => { if (!el.textContent.trim() && !el.querySelector("img,br")) el.remove(); });
    return out.innerHTML;
  }
  // Ảnh dán vào: thu nhỏ còn tối đa 1000px & nén JPEG để không làm đầy bộ nhớ trình duyệt
  function imageFileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * k), hh = Math.round(img.naturalHeight * k);
        const cv = document.createElement("canvas"); cv.width = w; cv.height = hh;
        const x = cv.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, w, hh); x.drawImage(img, 0, 0, w, hh);
        URL.revokeObjectURL(url);
        resolve({ src: cv.toDataURL("image/jpeg", 0.8), w });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Không đọc được ảnh")); };
      img.src = url;
    });
  }

  function NoteBox({ note, onChange, onDelete, ipaOn }) {
    const ce = React.createElement;
    const ref = useRef(null);
    const rootRef = useRef(null);
    const lastRange = useRef(null);
    const [focused, setFocused] = useState(false);
    const [selSize, setSelSize] = useState(null); // cỡ chữ của đoạn đang bôi đen (null = không bôi đen)
    const [msg, setMsg] = useState(null); // { text, tone }
    const [needKey, setNeedKey] = useState(false);
    const [keyInput, setKeyInput] = useState("");
    const [aiBusy, setAiBusy] = useState(false);
    const [lang, setLang] = useState(() => { try { return localStorage.getItem("night-notes-voice-lang") || "en"; } catch (e) { return "en"; } });
    const [rec, setRec] = useState(null); // null | "live" | "record" | "busy"
    const recRef = useRef(null);
    const [selImg, setSelImg] = useState(null);
    const [, force] = useState(0);
    useEffect(() => {
      if (ref.current) ref.current.innerHTML = note.html || "";
    }, []);
    useEffect(() => { try { localStorage.setItem("night-notes-voice-lang", lang); } catch (e) {} }, [lang]);
    useEffect(() => () => { const r = recRef.current; if (r) { r.stopping = true; try { r.stop(); } catch (e) {} } }, []);
    const flash = (text, tone = "info", ms = 3500) => { setMsg({ text, tone }); if (ms) setTimeout(() => setMsg((m) => (m && m.text === text ? null : m)), ms); };
    const save = () => {
      if (ref.current) onChange(note.id, { html: ref.current.innerHTML });
    };
    const inEditor = (r) => r && ref.current && ref.current.contains(r.commonAncestorContainer);
    // Nhớ vị trí con trỏ / vùng bôi đen trong ô (để mic & AI chèn đúng chỗ kể cả khi lỡ bấm ra ngoài)
    useEffect(() => {
      const onSel = () => {
        const s = window.getSelection();
        if (!s || !s.rangeCount) return;
        const r = s.getRangeAt(0);
        if (!inEditor(r)) return;
        lastRange.current = r.cloneRange();
        if (r.collapsed) { setSelSize(null); return; }
        let el = r.startContainer.nodeType === 3 ? r.startContainer.parentElement : r.startContainer;
        if (el === ref.current && el.childNodes[r.startOffset] && el.childNodes[r.startOffset].nodeType === 1) el = el.childNodes[r.startOffset];
        setSelSize(Math.round(parseFloat(getComputedStyle(el).fontSize) || note.size));
      };
      document.addEventListener("selectionchange", onSel);
      return () => document.removeEventListener("selectionchange", onSel);
    }, [note.size]);
    const restoreRange = () => {
      const s = window.getSelection();
      const cur0 = s && s.rangeCount ? s.getRangeAt(0).cloneRange() : null;
      if (ref.current && document.activeElement !== ref.current) ref.current.focus({ preventScroll: true });
      const cur = cur0;
      let r = cur && inEditor(cur) ? cur : lastRange.current;
      if (!r || !inEditor(r)) { r = document.createRange(); r.selectNodeContents(ref.current); r.collapse(false); }
      s.removeAllRanges(); s.addRange(r);
      return r;
    };
    const cmd = (c, v) => {
      try {
        document.execCommand("styleWithCSS", false, true);
      } catch (e) {
      }
      document.execCommand(c, false, v);
      save();
    };
    const keep = (e) => e.preventDefault();

    /* --- Cỡ chữ: có bôi đen → chỉ đổi phần bôi đen; không bôi đen → đổi cỡ chữ mặc định cả ô --- */
    const resizeSelection = (delta) => {
      const s = window.getSelection();
      if (!s || !s.rangeCount) return false;
      const r = s.getRangeAt(0);
      if (r.collapsed || !inEditor(r)) return false;
      const px = clampN((selSize || note.size) + delta, 8, 160);
      try { document.execCommand("styleWithCSS", false, false); } catch (e) {}
      document.execCommand("fontSize", false, "7");
      try { document.execCommand("styleWithCSS", false, true); } catch (e) {}
      const marks = [...ref.current.querySelectorAll('font[size="7"], span[style*="xxx-large"]')];
      const spans = marks.map((f) => {
        const sp = document.createElement("span");
        if (f.tagName === "FONT") { if (f.color) sp.style.color = f.color; while (f.firstChild) sp.appendChild(f.firstChild); }
        else { sp.setAttribute("style", f.getAttribute("style")); while (f.firstChild) sp.appendChild(f.firstChild); }
        sp.style.fontSize = px + "px";
        sp.querySelectorAll("[style]").forEach((x) => { x.style.fontSize = ""; if (!x.getAttribute("style")) x.removeAttribute("style"); });
        sp.querySelectorAll("font[size]").forEach((x) => x.removeAttribute("size"));
        f.replaceWith(sp);
        return sp;
      });
      if (spans.length) {
        const nr = document.createRange();
        nr.setStart(spans[0], 0);
        const last = spans[spans.length - 1];
        nr.setEnd(last, last.childNodes.length);
        s.removeAllRanges(); s.addRange(nr);
        lastRange.current = nr.cloneRange();
      }
      setSelSize(px);
      save();
      return true;
    };
    const changeSize = (delta) => {
      if (!resizeSelection(delta)) onChange(note.id, { size: clampN(note.size + delta, 10, 120) });
    };

    /* --- Chèn chữ / HTML tại vị trí đã nhớ, rồi bôi đen đoạn vừa chèn --- */
    const insertTextSelected = (text) => {
      if (!text) return;
      const r = restoreRange();
      r.deleteContents();
      const before = r.startContainer.nodeType === 3 ? r.startContainer.textContent.slice(0, r.startOffset) : "";
      const t = (before && !/\s$/.test(before) ? " " : "") + text;
      const node = document.createTextNode(t);
      r.insertNode(node);
      const nr = document.createRange();
      nr.setStart(node, t.length - text.length); nr.setEnd(node, t.length);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(nr);
      lastRange.current = nr.cloneRange();
      save();
    };
    const insertFragmentAtCaret = (html) => {
      const r = restoreRange();
      r.deleteContents();
      const tmp = document.createElement("div"); tmp.innerHTML = html;
      const frag = document.createDocumentFragment(); let lastNode = null;
      while (tmp.firstChild) lastNode = frag.appendChild(tmp.firstChild);
      r.insertNode(frag);
      if (lastNode) { const nr = document.createRange(); nr.setStartAfter(lastNode); nr.collapse(true); const s = window.getSelection(); s.removeAllRanges(); s.addRange(nr); lastRange.current = nr.cloneRange(); }
      save();
    };

    /* --- Giọng nói → chữ --- */
    const stopVoice = () => { const r = recRef.current; if (r) { r.stopping = true; try { r.stop(); } catch (e) {} } };
    const startVoice = async () => {
      if (rec) { stopVoice(); return; }
      restoreRange();
      if (SpeechRec) {
        // Chrome / Edge / Safari: nhận diện trực tiếp, chữ hiện ngay khi nói
        const r = new SpeechRec();
        r.lang = lang === "vi" ? "vi-VN" : "en-US";
        r.continuous = true; r.interimResults = true;
        const live = document.createElement("span");
        live.style.color = "#94a3b8"; live.setAttribute("data-live", "1");
        const range = restoreRange(); range.deleteContents();
        const before = range.startContainer.nodeType === 3 ? range.startContainer.textContent.slice(0, range.startOffset) : "";
        const pad = before && !/\s$/.test(before) ? " " : "";
        range.insertNode(live);
        let finalText = "";
        r.onresult = (e) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript;
            if (e.results[i].isFinal) finalText += (finalText && !/\s$/.test(finalText) ? " " : "") + t.trim();
            else interim += t;
          }
          live.textContent = pad + finalText + (interim ? (finalText ? " " : "") + interim : "");
        };
        r.onerror = (e) => {
          if (e.error === "not-allowed" || e.error === "service-not-allowed") { r.stopping = true; flash("Chưa cấp quyền micro — bấm cho phép micro rồi thử lại.", "error"); }
          else if (e.error === "network") { r.stopping = true; flash("Nhận diện giọng nói cần mạng internet.", "error"); }
        };
        r.onend = () => {
          if (!r.stopping) { try { r.start(); return; } catch (e) {} } // Chrome tự ngắt khi im lặng lâu → nghe tiếp
          recRef.current = null; setRec(null); window.dispatchEvent(new Event("night-dictation-end"));
          const txt = (pad + finalText).replace(/\s+$/, "");
          if (!live.parentNode) return;
          if (!finalText) { live.remove(); save(); return; }
          const node = document.createTextNode(txt);
          live.replaceWith(node);
          if (ref.current) ref.current.focus({ preventScroll: true });
          const nr = document.createRange(); nr.setStart(node, pad.length); nr.setEnd(node, txt.length);
          const s = window.getSelection(); s.removeAllRanges(); s.addRange(nr);
          lastRange.current = nr.cloneRange();
          save();
          flash("Đã chèn đoạn vừa nói (đang được bôi đen) — bấm ✨ AI xử lí lại nếu cần.", "ok", 5000);
        };
        recRef.current = r;
        try { r.start(); setRec("live"); window.dispatchEvent(new Event("night-dictation-start")); } catch (e) { live.remove(); flash("Không bật được micro.", "error"); }
        return;
      }
      // Trình duyệt không có nhận diện trực tiếp (vd Firefox) → ghi âm rồi gửi Groq Whisper (key chung của web)
      if (!getGroqCfg().apiKey) { setNeedKey(true); flash("Trình duyệt này cần Groq key để chuyển giọng nói thành chữ.", "error", 0); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        const chunks = [];
        mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        mr.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          recRef.current = null; setRec("busy");
          try { const text = await groqTranscribe(new Blob(chunks, { type: mr.mimeType || "audio/webm" }), lang); insertTextSelected(text); if (text) flash("Đã chèn đoạn vừa nói — bấm ✨ AI xử lí lại nếu cần.", "ok", 5000); else flash("Không nghe rõ, thử lại nhé.", "error"); }
          catch (err) { flash(err.message, "error"); }
          setRec(null);
        };
        recRef.current = mr; mr.start(); setRec("record");
      } catch (e) { flash("Chưa cấp quyền micro — bấm cho phép micro rồi thử lại.", "error"); }
    };

    /* --- AI xử lí lại đoạn bôi đen --- */
    const runAi = async () => {
      if (aiBusy) return;
      const s = window.getSelection();
      let r = s && s.rangeCount ? s.getRangeAt(0) : null;
      if (!r || r.collapsed || !inEditor(r)) r = lastRange.current && !lastRange.current.collapsed && inEditor(lastRange.current) ? lastRange.current : null;
      if (!r) { flash("Bôi đen đoạn cần AI xử lí trước nhé.", "error"); return; }
      const text = r.toString().trim();
      if (!text) { flash("Đoạn bôi đen chưa có chữ.", "error"); return; }
      if (!getGroqCfg().apiKey) { setNeedKey(true); return; }
      const saved = r.cloneRange();
      setSelImg(null);
      setAiBusy(true); flash("✨ AI đang xử lí…", "info", 0);
      try {
        const out = await noteAiRewrite(text);
        if (ref.current) ref.current.focus({ preventScroll: true });
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(saved);
        document.execCommand("insertHTML", false, textToHtml(out)); // dùng insertHTML để Cmd/Ctrl+Z hoàn tác được
        save();
        flash("Xong! Không ưng thì bấm Ctrl+Z (Cmd+Z) để hoàn tác.", "ok", 5000);
      } catch (e) {
        if (e.code === "NO_KEY") setNeedKey(true); else flash(e.message, "error");
      }
      setAiBusy(false);
    };

    /* --- Dán: ảnh → chèn ảnh (chỉnh cỡ được); HTML từ web → giữ định dạng nhưng vẫn chỉnh được --- */
    const onPaste = async (e) => {
      const cd = e.clipboardData;
      if (!cd) return;
      const files = [...(cd.files || [])].filter((f) => /^image\//.test(f.type));
      if (files.length) {
        e.preventDefault();
        lastRange.current = window.getSelection().rangeCount ? window.getSelection().getRangeAt(0).cloneRange() : lastRange.current;
        for (const f of files) {
          try {
            const { src, w } = await imageFileToDataUrl(f);
            const maxW = ref.current ? ref.current.clientWidth - 28 : 300;
            insertFragmentAtCaret(`<img src="${src}" style="width:${Math.min(w, maxW, 320)}px">`);
          } catch (err) { flash(err.message, "error"); }
        }
        return;
      }
      const html = cd.getData("text/html");
      if (html) {
        e.preventDefault();
        insertFragmentAtCaret(cleanPastedHtml(html));
        return;
      }
      const text = cd.getData("text/plain");
      if (text) { e.preventDefault(); insertFragmentAtCaret(textToHtml(text)); }
    };

    /* --- Ảnh trong ô: bấm vào ảnh để chọn, kéo góc để đổi cỡ --- */
    const onEditorClick = (e) => {
      if (e.target && e.target.tagName === "IMG") setSelImg(e.target);
      else if (selImg) setSelImg(null);
    };
    useEffect(() => {
      if (!selImg) return;
      const off = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setSelImg(null); };
      const sc = () => force((n) => n + 1);
      document.addEventListener("pointerdown", off);
      const ed = ref.current; ed && ed.addEventListener("scroll", sc);
      return () => { document.removeEventListener("pointerdown", off); ed && ed.removeEventListener("scroll", sc); };
    }, [selImg]);
    const imgBox = selImg && selImg.isConnected && rootRef.current ? (() => {
      const a = selImg.getBoundingClientRect(), b = rootRef.current.getBoundingClientRect(), v = ref.current.getBoundingClientRect();
      // chỉ vẽ khung chọn trong phần ô đang nhìn thấy (ảnh có thể bị cuộn khuất bên trong ô)
      const L = Math.max(a.left, v.left), T = Math.max(a.top, v.top), R = Math.min(a.right, v.right), B = Math.min(a.bottom, v.bottom);
      if (R - L < 30 || B - T < 30) return null;
      return { left: L - b.left, top: T - b.top, width: R - L, height: B - T };
    })() : null;
    const startImgResize = (e) => {
      e.preventDefault(); e.stopPropagation();
      const sx = e.clientX, w0 = selImg.getBoundingClientRect().width;
      const maxW = ref.current ? ref.current.clientWidth - 24 : 2000;
      const move = (ev) => { selImg.style.width = clampN(Math.round(w0 + ev.clientX - sx), 40, Math.max(60, maxW)) + "px"; selImg.style.height = "auto"; force((n) => n + 1); };
      const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); save(); };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
    const setImgPct = (p) => { if (!selImg || !ref.current) return; selImg.style.width = Math.round((ref.current.clientWidth - 28) * p) + "px"; selImg.style.height = "auto"; force((n) => n + 1); save(); };
    const delImg = () => { if (selImg) { selImg.remove(); setSelImg(null); save(); } };

    const startDrag = (e, mode) => {
      e.preventDefault();
      e.stopPropagation();
      const sx = e.clientX, sy = e.clientY;
      const o = { x: note.x, y: note.y, w: note.w, h: note.h };
      const move = (ev) => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (mode === "move") onChange(note.id, { x: Math.max(0, o.x + dx), y: Math.max(0, o.y + dy) });
        else onChange(note.id, { w: Math.max(160, o.w + dx), h: Math.max(70, o.h + dy) });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
    const onKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          changeSize(2);
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          changeSize(-2);
        }
      }
      if (selImg && (e.key === "Backspace" || e.key === "Delete")) { e.preventDefault(); delImg(); }
    };
    const onInput = () => {
      if (selImg) setSelImg(null);
      if (ipaOn) expandIpaAtCaret();
      save();
    };
    const Btn = ({ title, onClick, children, className = "", disabled }) => ce(
      "button",
      {
        type: "button",
        title,
        disabled,
        onMouseDown: keep,
        onClick,
        className: `flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg px-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 ${className}`
      },
      children
    );
    const Sep = () => ce("span", { className: "mx-1 h-5 w-px bg-slate-200" });
    const recording = rec === "live" || rec === "record";
    const toneCls = { info: "bg-slate-800 text-white", ok: "bg-emerald-600 text-white", error: "bg-rose-600 text-white" };
    return ce("div", { ref: rootRef, style: { position: "absolute", left: note.x, top: note.y, width: note.w, zIndex: focused || recording || needKey ? 36 : 35 } },
      focused && ce("div", { className: "absolute bottom-full left-0 mb-2 flex flex-wrap items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-floating", style: { width: "max-content", maxWidth: "min(94vw, 640px)" } },
        ce(Btn, { title: "In đậm (Cmd+B)", onClick: () => cmd("bold") }, ce("b", null, "B")),
        ce(Btn, { title: "In nghiêng (Cmd+I)", onClick: () => cmd("italic") }, ce("i", { className: "font-serif" }, "I")),
        ce(Btn, { title: "Gạch chân (Cmd+U)", onClick: () => cmd("underline") }, ce("u", null, "U")),
        ce(Sep),
        NOTE_COLORS.map((c) => ce("button", { key: c, type: "button", title: "Màu chữ", onMouseDown: keep, onClick: () => cmd("foreColor", c), className: "mx-0.5 h-5 w-5 rounded-full ring-2 ring-white", style: { background: c, boxShadow: "0 0 0 1px #cbd5e1" } })),
        ce(Btn, { title: "Tô nền chữ (highlight)", onClick: () => cmd("hiliteColor", "#fde047") }, ce("span", { className: "rounded bg-yellow-300 px-1 text-xs font-bold" }, "ab")),
        ce(Btn, { title: "Bỏ định dạng", onClick: () => cmd("removeFormat") }, ce("span", { className: "text-xs font-semibold" }, "T", ce("sub", null, "×"))),
        ce(Sep),
        ce(Btn, { title: selSize ? "Giảm cỡ phần đang bôi đen (Cmd −)" : "Giảm cỡ chữ cả ô (Cmd −) — bôi đen để chỉ đổi phần đó", onClick: () => changeSize(-2) }, "A−"),
        ce("span", { className: `w-9 text-center text-xs tabular-nums ${selSize ? "font-bold text-indigo-600" : "text-slate-400"}`, title: selSize ? "Cỡ chữ phần đang bôi đen" : "Cỡ chữ mặc định của ô" }, selSize || note.size),
        ce(Btn, { title: selSize ? "Tăng cỡ phần đang bôi đen (Cmd +)" : "Tăng cỡ chữ cả ô (Cmd +) — bôi đen để chỉ đổi phần đó", onClick: () => changeSize(2) }, "A+"),
        ce(Sep),
        NOTE_BGS.map((c) => ce("button", { key: c, type: "button", title: "Màu nền ô", onMouseDown: keep, onClick: () => onChange(note.id, { bg: c }), className: "mx-0.5 h-5 w-5 rounded-md", style: { background: c, boxShadow: "0 0 0 1px #cbd5e1" } })),
        ce("div", { className: "h-0 basis-full" }), // hàng 2: giọng nói & AI
        ce(Btn, { title: recording ? "Dừng ghi giọng nói" : "Nói để nhập chữ (giọng nói → chữ)", onClick: startVoice, disabled: rec === "busy", className: recording ? "bg-rose-500 text-white hover:bg-rose-600" : "" }, recording ? "■ Dừng" : rec === "busy" ? "⏳" : "🎤 Nói"),
        ce(Btn, { title: "Đổi ngôn ngữ nhận diện giọng nói", onClick: () => setLang(lang === "en" ? "vi" : "en"), disabled: recording, className: "text-[11px] font-bold" }, lang === "en" ? "🇬🇧 EN" : "🇻🇳 VI"),
        ce(Btn, { title: "Bôi đen đoạn chữ rồi bấm: AI sửa lặp từ, nhận diện sai, thêm dấu câu — không sửa quá tay", onClick: runAi, disabled: aiBusy, className: "font-semibold text-indigo-700" }, aiBusy ? "⏳ Đang xử lí…" : "✨ AI xử lí lại")
      ),
      ce("div", { className: "flex flex-col overflow-hidden rounded-2xl border-2 shadow-floating", style: { height: note.h, background: note.bg, borderColor: recording ? "#f43f5e" : focused ? "#4338CA" : "#e2e8f0" } },
        ce("div", { onPointerDown: (e) => startDrag(e, "move"), className: "flex h-6 flex-shrink-0 cursor-move items-center justify-between bg-slate-900/5 px-2", style: { touchAction: "none" } },
          recording
            ? ce("button", { type: "button", onPointerDown: (e) => e.stopPropagation(), onMouseDown: keep, onClick: stopVoice, className: "flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-rose-600" }, ce("span", { className: "h-2 w-2 animate-pulse rounded-full bg-rose-500" }), rec === "live" ? "ĐANG NGHE (" + lang.toUpperCase() + ") — BẤM ĐỂ DỪNG" : "ĐANG GHI ÂM — BẤM ĐỂ DỪNG")
            : ce("span", { className: "text-[10px] font-bold tracking-widest text-slate-400" }, rec === "busy" ? "⏳ ĐANG CHUYỂN GIỌNG NÓI THÀNH CHỮ…" : "⋮⋮ KÉO ĐỂ DI CHUYỂN"),
          ce("button", { type: "button", onPointerDown: (e) => e.stopPropagation(), onClick: () => { stopVoice(); onDelete(note.id); }, className: "text-xs font-bold text-slate-400 hover:text-rose-500", title: "Xóa ô này" }, "✕")
        ),
        ce("div", {
          ref,
          contentEditable: true,
          suppressContentEditableWarning: true,
          spellCheck: false,
          onFocus: () => setFocused(true),
          onBlur: () => {
            setFocused(false);
            save();
          },
          onInput,
          onKeyDown,
          onPaste,
          onClick: onEditorClick,
          className: "night-note-ed flex-1 overflow-auto px-3 py-2 leading-snug text-slate-900 outline-none",
          style: { fontSize: note.size, fontFamily: "'Plus Jakarta Sans', 'Segoe UI', 'Arial Unicode MS', sans-serif" }
        })
      ),
      imgBox && ce(React.Fragment, null,
        ce("div", { style: { position: "absolute", left: imgBox.left - 2, top: imgBox.top - 2, width: imgBox.width + 4, height: imgBox.height + 4, border: "2px solid #4338ca", borderRadius: 6, pointerEvents: "none" } }),
        ce("div", { className: "flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-semibold shadow-floating", style: { position: "absolute", left: imgBox.left, top: imgBox.top + 4 } },
          [["25%", 0.25], ["50%", 0.5], ["100%", 1]].map(([l, p]) => ce("button", { key: l, type: "button", onMouseDown: keep, onClick: () => setImgPct(p), className: "rounded-md px-1.5 py-0.5 text-slate-600 hover:bg-slate-100" }, l)),
          ce("button", { type: "button", onMouseDown: keep, onClick: delImg, title: "Xóa ảnh", className: "rounded-md px-1.5 py-0.5 text-rose-500 hover:bg-rose-50" }, "🗑")),
        ce("div", { onPointerDown: startImgResize, title: "Kéo để đổi cỡ ảnh", style: { position: "absolute", left: imgBox.left + imgBox.width - 7, top: imgBox.top + imgBox.height - 7, width: 14, height: 14, background: "#4338ca", border: "2px solid #fff", borderRadius: 4, cursor: "nwse-resize", touchAction: "none", boxShadow: "0 1px 3px rgba(0,0,0,.3)" } })
      ),
      (msg || needKey) && ce("div", { className: "absolute left-0 top-full mt-2 w-full space-y-1.5", style: { minWidth: 240 } },
        msg && ce("p", { className: `rounded-xl px-3 py-1.5 text-xs font-semibold shadow-floating ${toneCls[msg.tone] || toneCls.info}` }, msg.text),
        needKey && ce("div", { className: "rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-floating" },
          ce("p", { className: "mb-1 font-bold text-slate-800" }, "🔑 Cần Groq API key (dùng chung với cả web)"),
          ce("p", { className: "mb-2" }, "Key đã lưu ở trang Speaking AI / Writing sẽ tự dùng được ở đây. Chưa có thì lấy miễn phí tại ", ce("a", { href: "https://console.groq.com/keys", target: "_blank", rel: "noopener", className: "font-semibold text-indigo-600 underline" }, "console.groq.com/keys"), "."),
          ce("div", { className: "flex gap-1.5" },
            ce("input", { type: "password", value: keyInput, onChange: (e) => setKeyInput(e.target.value), placeholder: "gsk_...", className: "min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-400" }),
            ce("button", { type: "button", onClick: () => { if (!keyInput.trim()) return; saveGroqKey(keyInput.trim()); setKeyInput(""); setNeedKey(false); setMsg(null); flash("Đã lưu key — bôi đen lại đoạn chữ rồi bấm ✨ AI xử lí lại.", "ok", 5000); }, className: "rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white" }, "Lưu"),
            ce("button", { type: "button", onClick: () => { setNeedKey(false); setMsg(null); }, className: "rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100" }, "✕")))
      ),
      ce("div", { onPointerDown: (e) => startDrag(e, "resize"), title: "Kéo để đổi kích thước", className: "absolute -bottom-1 -right-1 h-5 w-5 cursor-nwse-resize rounded-br-2xl", style: { touchAction: "none" } },
        ce("svg", { viewBox: "0 0 20 20", className: "h-5 w-5 text-slate-400" }, ce("path", { d: "M18 8v10H8M18 13v5h-5", stroke: "currentColor", strokeWidth: "2", fill: "none", strokeLinecap: "round" })))
    );
  }
  function IpaCheatSheet({ onClose }) {
    return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4", onClick: onClose }, /* @__PURE__ */ React.createElement("div", { className: "max-h-[85vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-6 shadow-floating", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "mb-4 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("p", { className: "text-lg font-extrabold text-slate-900" }, "⌨️ Bảng gõ tắt IPA"), /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "rounded-full px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100" }, "Đóng ✕")), /* @__PURE__ */ React.createElement("p", { className: "mb-4 text-sm text-slate-500" }, "Trong ô ghi chú, gõ ", /* @__PURE__ */ React.createElement("b", { className: "text-primary" }, "/"), " + mã → tự đổi thành ký hiệu. Ví dụ gõ ", /* @__PURE__ */ React.createElement("code", { className: "rounded bg-slate-100 px-1" }, "/ch/i:z"), " ra ", /* @__PURE__ */ React.createElement("b", null, "tʃiːz"), ". Mã có phân biệt chữ ", /* @__PURE__ */ React.createElement("b", null, "hoa/thường"), " (/I = ɪ, /O = ɒ, /U = ʊ). Các âm bàn phím có sẵn (p, b, t, d, k, g, f, v, s, z, h, m, n, l, r, w, j, e) gõ bình thường."), IPA_GROUPS.map((g) => /* @__PURE__ */ React.createElement("div", { key: g.label, className: "mb-4" }, /* @__PURE__ */ React.createElement("p", { className: "mb-2 text-xs font-bold uppercase tracking-wide text-primary" }, g.label), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2 sm:grid-cols-4" }, g.items.map(([c, s, ex]) => /* @__PURE__ */ React.createElement("div", { key: c, className: "rounded-2xl border border-slate-100 bg-slate-50 p-2" }, /* @__PURE__ */ React.createElement("p", { className: "flex items-baseline justify-between" }, /* @__PURE__ */ React.createElement("code", { className: "text-sm font-bold text-slate-700" }, "/", c === "/" ? "/" : c), /* @__PURE__ */ React.createElement("span", { className: "font-serif text-xl font-bold text-primary" }, s)), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-400" }, ex)))))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400" }, "Mẹo: nếu viết “he/she” mà bị đổi thành ký hiệu, gõ “he//she” hoặc tắt Gõ tắt IPA trong menu ✏️.")));
  }
  function NotesLayer({ lessonId }) {
    const KEY = `night-notes-${lessonId}`;
    // Ghi chú chỉ sống trong tab đang mở (sessionStorage): tải lại trang vẫn còn, đóng tab là mất.
    const [notes, setNotes] = useState(() => {
      try { localStorage.removeItem(KEY); } catch (e) {}
      try {
        return JSON.parse(sessionStorage.getItem(KEY)) || [];
      } catch (e) {
        return [];
      }
    });
    const [open, setOpen] = useState(false);
    const [hidden, setHidden] = useState(false);
    const [sheet, setSheet] = useState(false);
    const [ipaOn, setIpaOn] = useState(() => {
      try {
        return localStorage.getItem("night-notes-ipa") !== "off";
      } catch (e) {
        return true;
      }
    });
    const [confirmClear, setConfirmClear] = useState(false);
    const [storeFull, setStoreFull] = useState(false);
    useEffect(() => {
      try {
        sessionStorage.setItem(KEY, JSON.stringify(notes));
        setStoreFull(false);
      } catch (e) {
        setStoreFull(true);
      }
    }, [notes]);
    useEffect(() => {
      try {
        localStorage.setItem("night-notes-ipa", ipaOn ? "on" : "off");
      } catch (e) {
      }
    }, [ipaOn]);
    const update = (id, patch) => setNotes((ns) => ns.map((n) => n.id === id ? { ...n, ...patch } : n));
    const remove = (id) => setNotes((ns) => ns.filter((n) => n.id !== id));
    const add = () => {
      const w = Math.min(380, window.innerWidth - 40);
      setNotes((ns) => [...ns, {
        id: Date.now().toString(36),
        html: "",
        size: 20,
        bg: "#fef9c3",
        w,
        h: 160,
        x: Math.max(10, (document.documentElement.clientWidth - w) / 2 + ns.length % 4 * 24),
        y: window.scrollY + 140 + ns.length % 4 * 24
      }]);
      setHidden(false);
      setOpen(false);
    };
    const Item = ({ onClick, children, danger }) => /* @__PURE__ */ React.createElement("button", { onClick, className: `w-full rounded-xl px-3 py-2 text-left text-sm font-semibold ${danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-100"}` }, children);
    return /* @__PURE__ */ React.createElement(React.Fragment, null, !hidden && notes.map((n) => /* @__PURE__ */ React.createElement(NoteBox, { key: n.id, note: n, onChange: update, onDelete: remove, ipaOn })), sheet && /* @__PURE__ */ React.createElement(IpaCheatSheet, { onClose: () => setSheet(false) }), /* @__PURE__ */ React.createElement("div", { className: "night-fab fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2" }, storeFull && /* @__PURE__ */ React.createElement("p", { className: "max-w-xs rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-floating" }, "⚠️ Bộ nhớ trình duyệt đã đầy — ghi chú mới chưa được lưu. Xóa bớt ảnh hoặc thu nhỏ ảnh trong ghi chú."), open && /* @__PURE__ */ React.createElement("div", { className: "w-60 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-floating" }, /* @__PURE__ */ React.createElement(Item, { onClick: add }, "＋ Thêm ô ghi chú"), /* @__PURE__ */ React.createElement(Item, { onClick: () => {
      setSheet(true);
      setOpen(false);
    } }, "⌨️ Bảng gõ tắt IPA"), /* @__PURE__ */ React.createElement(Item, { onClick: () => setIpaOn(!ipaOn) }, ipaOn ? "✅" : "⬜", " Gõ tắt IPA (/d3 → dʒ)"), notes.length > 0 && /* @__PURE__ */ React.createElement(Item, { onClick: () => setHidden(!hidden) }, hidden ? "👁 Hiện" : "🙈 Ẩn", " ghi chú (", notes.length, ")"), notes.length > 0 && /* @__PURE__ */ React.createElement(Item, { danger: true, onClick: () => {
      if (confirmClear) {
        setNotes([]);
        setConfirmClear(false);
        setOpen(false);
      } else setConfirmClear(true);
    } }, "🗑 ", confirmClear ? "Bấm lần nữa để xóa hết" : "Xóa tất cả ghi chú")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setOpen(!open);
          setConfirmClear(false);
        },
        title: "Ghi chú khi giảng",
        className: "flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl text-white shadow-premium transition hover:bg-primary-dark"
      },
      open ? "✕" : "✏️"
    )));
  }
  // **đậm** và *nghiêng* — hỗ trợ lồng nhau (*câu có **từ đậm** bên trong*, ***on** foot*)
  function rich(text) {
    if (!text) return null;
    const s = String(text);
    if (s.indexOf("*") < 0) return s;
    const root = { tag: null, kids: [] };
    const stack = [root];
    let buf = "", key = 0;
    const flush = () => { if (buf) { stack[stack.length - 1].kids.push(buf); buf = ""; } };
    const open = (tag) => { flush(); const n = { tag, kids: [] }; stack[stack.length - 1].kids.push(n); stack.push(n); };
    const close = () => { flush(); stack.pop(); };
    const top = () => stack[stack.length - 1].tag;
    for (let i = 0; i < s.length; ) {
      if (s[i] !== "*") { buf += s[i++]; continue; }
      let j = i; while (j < s.length && s[j] === "*") j++;
      let n = j - i;
      const prev = i > 0 ? s[i - 1] : " ", next = j < s.length ? s[j] : " ";
      const closing = !/\s/.test(prev) && !/[\p{L}\p{N}]/u.test(next);
      if (closing) {
        while (n > 0 && stack.length > 1) {
          if (top() === "b" && n >= 2) { close(); n -= 2; }
          else if (top() === "i" && n !== 2) { close(); n -= 1; }
          else break;
        }
      }
      while (n > 0) {
        if (n >= 3) { open("i"); open("b"); n -= 3; }
        else if (n === 2) { open("b"); n -= 2; }
        else { open("i"); n -= 1; }
      }
      i = j;
    }
    flush();
    const render = (node) => node.kids.map((k) => typeof k === "string" ? React.createElement(React.Fragment, { key: key++ }, k)
      : React.createElement(k.tag, k.tag === "b" ? { key: key++, className: "font-bold text-primary" } : { key: key++ }, render(k)));
    return render(root);
  }

  function GrammarBlock({ index, name, forms = [], uses = [], examples = [], signals, note }) {
    return /* @__PURE__ */ React.createElement("div", { className: "rounded-3xl border border-slate-200 bg-white p-6 shadow-floating" }, /* @__PURE__ */ React.createElement("div", { className: "mb-4 flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white" }, index), /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-extrabold text-slate-900" }, name)), forms.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mb-4 grid gap-2 sm:grid-cols-3" }, forms.map((f, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "rounded-2xl bg-primary-light p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wide text-primary/70" }, f.label), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm font-semibold text-slate-800" }, rich(f.pattern))))), uses.length > 0 && /* @__PURE__ */ React.createElement("ul", { className: "mb-4 space-y-1.5" }, uses.map((u, i) => /* @__PURE__ */ React.createElement("li", { key: i, className: "flex gap-2 text-sm leading-relaxed text-slate-700" }, /* @__PURE__ */ React.createElement("span", { className: "text-primary" }, "▸"), /* @__PURE__ */ React.createElement("span", null, rich(u))))), examples.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, examples.map((e, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-slate-800" }, rich(e.en)), e.vi && React.createElement(Cover, null, React.createElement("p", { className: "mt-0.5 text-xs text-slate-500" }, e.vi))), /* @__PURE__ */ React.createElement(SpeakButton, { text: String(e.en).replace(/\*/g, ""), rate: 0.85 })))), signals && /* @__PURE__ */ React.createElement("p", { className: "mt-4 text-xs text-slate-500" }, /* @__PURE__ */ React.createElement("b", { className: "text-slate-700" }, "Dấu hiệu:"), " ", rich(signals)), note && /* @__PURE__ */ React.createElement("p", { className: "mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800" }, "💡 ", rich(note)));
  }
  function ChoiceQuiz({ items = [] }) {
    const [picked, setPicked] = useState({});
    const answered = Object.keys(picked).length;
    const correct = items.filter((it, i) => picked[i] === it.answer).length;
    return /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, items.map((it, i) => {
      const p = picked[i];
      return /* @__PURE__ */ React.createElement("div", { key: i, className: "rounded-3xl border border-slate-200 bg-white p-5 shadow-floating" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-slate-800" }, /* @__PURE__ */ React.createElement("span", { className: "mr-2 text-primary" }, i + 1, "."), rich(it.q)), it.img && React.createElement("img", { src: it.img, alt: "", loading: "lazy", className: "mt-3 w-full max-w-xl rounded-2xl border border-slate-100" }), /* @__PURE__ */ React.createElement("div", { className: "mt-3 flex flex-wrap gap-2" }, it.options.map((o, k) => {
        let style = "border-slate-200 bg-slate-50 text-slate-700 hover:border-primary/40";
        if (p !== void 0) {
          if (k === it.answer) style = "border-emerald-300 bg-emerald-50 text-emerald-700";
          else if (k === p) style = "border-rose-300 bg-rose-50 text-rose-600";
          else style = "border-slate-200 bg-slate-50 text-slate-400";
        }
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: k,
            disabled: p !== void 0,
            onClick: () => setPicked({ ...picked, [i]: k }),
            className: `rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition ${style}`
          },
          o
        );
      })), p !== void 0 && it.explain && /* @__PURE__ */ React.createElement("p", { className: `mt-3 text-xs leading-relaxed ${p === it.answer ? "text-emerald-700" : "text-rose-600"}` }, p === it.answer ? "✓ " : "✗ ", rich(it.explain)));
    }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between rounded-3xl bg-primary-light px-5 py-3 text-sm font-semibold text-primary" }, /* @__PURE__ */ React.createElement("span", null, "Đã làm ", answered, "/", items.length, " · Đúng ", correct), answered > 0 && /* @__PURE__ */ React.createElement("button", { onClick: () => setPicked({}), className: "text-xs underline" }, "Làm lại")));
  }
  function PhraseBox({ title, groups = [], phrases = [] }) {
    const all = groups.length ? groups : [{ phrases }];
    return /* @__PURE__ */ React.createElement("div", { className: "rounded-3xl border border-amber-200 bg-amber-50/70 p-5" }, title && /* @__PURE__ */ React.createElement("p", { className: "mb-3 text-sm font-bold text-amber-800" }, "💬 ", title), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, all.map((g, gi) => /* @__PURE__ */ React.createElement("div", { key: gi }, g.label && /* @__PURE__ */ React.createElement("p", { className: "mb-2 text-xs font-bold uppercase tracking-wide text-amber-700" }, g.label), /* @__PURE__ */ React.createElement("div", { className: "grid gap-3 sm:grid-cols-2" }, g.phrases.map((k) => /* @__PURE__ */ React.createElement("div", { key: k.phrase, className: "rounded-2xl bg-white p-3 shadow-sm" }, /* @__PURE__ */ React.createElement("p", { className: "flex items-center justify-between gap-2 font-semibold text-slate-800" }, k.phrase, /* @__PURE__ */ React.createElement(SpeakButton, { text: k.phrase })), k.note && /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-slate-500" }, rich(k.note)))))))));
  }
  function MarkedWord({ w }) {
    const plain = w.replace(/[\[\]]/g, "");
    const parts = w.split(/(\[[^\]]+\])/g);
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => speak(plain, 0.8),
        className: "rounded-lg bg-white px-2 py-0.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:ring-primary/40"
      },
      parts.map((p, i) => p.startsWith("[") ? /* @__PURE__ */ React.createElement("span", { key: i, className: "rounded bg-amber-200/80 px-0.5 text-primary-dark" }, p.slice(1, -1)) : /* @__PURE__ */ React.createElement(React.Fragment, { key: i }, p))
    );
  }
  function PhonicsCard({ row }) {
    return /* @__PURE__ */ React.createElement("div", { className: "rounded-3xl border border-slate-200 bg-white p-4 shadow-floating" }, /* @__PURE__ */ React.createElement("div", { className: "mb-3 flex items-center gap-3" }, row.letters ? /* @__PURE__ */ React.createElement("span", { className: "rounded-2xl bg-amber-100 px-3 py-0.5 text-2xl font-extrabold tracking-wide text-slate-900" }, row.letters) : /* @__PURE__ */ React.createElement("span", { className: "font-serif text-2xl font-bold text-slate-900" }, "/", row.ipa, "/"), row.badge && /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold uppercase text-primary" }, row.badge)), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, row.sp.map(([pattern, words], i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-50 p-2" }, /* @__PURE__ */ React.createElement("span", { className: "mr-1 min-w-[3.5rem] rounded-full bg-primary px-2.5 py-0.5 text-center text-xs font-bold text-white" }, pattern), words.split(",").map((w) => w.trim()).filter(Boolean).map((w) => /* @__PURE__ */ React.createElement(MarkedWord, { key: w, w }))))), row.tip && /* @__PURE__ */ React.createElement("p", { className: "mt-3 text-xs leading-relaxed text-slate-500" }, "💡 ", rich(row.tip)));
  }
  function PhonicsGrid({ groups = [], rows = [], intro }) {
    const all = groups.length ? groups : [{ rows }];
    const [tab, setTab] = useState(0);
    const g = all[tab] || all[0];
    return /* @__PURE__ */ React.createElement("div", null, intro && /* @__PURE__ */ React.createElement("p", { className: "mb-4 rounded-3xl bg-primary-light p-4 text-sm leading-relaxed text-slate-700" }, rich(intro)), all.length > 1 && /* @__PURE__ */ React.createElement("div", { className: "mb-4 inline-flex flex-wrap rounded-3xl border border-slate-200 bg-white p-1 shadow-sm" }, all.map((x, k) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: k,
        onClick: () => setTab(k),
        className: `rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === k ? "bg-primary text-white shadow-premium" : "text-slate-500 hover:text-slate-800"}`
      },
      x.label
    ))), /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 md:grid-cols-2" }, g.rows.map((r) => /* @__PURE__ */ React.createElement(PhonicsCard, { key: r.letters || r.ipa, row: r }))));
  }
  function StressWord({ w }) {
    const sentence = w.indexOf(" ") >= 0;
    const syl = sentence ? w.split(" ") : w.split("·");
    const isStress = (x) => {
      const core = x.replace(/[^A-Za-z']/g, "");
      if (sentence) return core.length >= 2 && core === core.toUpperCase();
      return x === x.toUpperCase() && /[A-Z]/.test(x);
    };
    const plain = sentence ? w.toLowerCase() : syl.join("").toLowerCase();
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => speak(plain, sentence ? 0.85 : 0.75),
        className: `flex flex-col items-center rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200 transition hover:ring-primary/40 ${sentence ? "w-full" : ""}`
      },
      /* @__PURE__ */ React.createElement("span", { className: "flex items-end gap-1.5" }, syl.map((x, i) => isStress(x) ? /* @__PURE__ */ React.createElement("span", { key: i, className: "h-3.5 w-3.5 rounded-full bg-primary" }) : /* @__PURE__ */ React.createElement("span", { key: i, className: "mb-0.5 h-2 w-2 rounded-full bg-slate-300" }))),
      /* @__PURE__ */ React.createElement("span", { className: `mt-1 text-slate-500 ${sentence ? "text-base" : "text-sm"}` }, syl.map((x, i) => sentence ? /* @__PURE__ */ React.createElement("span", { key: i, className: isStress(x) ? "font-extrabold text-primary" : "" }, x, i < syl.length - 1 ? " " : "") : /* @__PURE__ */ React.createElement("span", { key: i, className: isStress(x) ? "font-extrabold text-primary" : "" }, x.toLowerCase(), i < syl.length - 1 ? "·" : "")))
    );
  }
  function StressGrid({ groups = [], intro }) {
    return /* @__PURE__ */ React.createElement("div", null, intro && /* @__PURE__ */ React.createElement("p", { className: "mb-4 rounded-3xl bg-primary-light p-4 text-sm leading-relaxed text-slate-700" }, rich(intro)), /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 md:grid-cols-2" }, groups.map((g, gi) => /* @__PURE__ */ React.createElement("div", { key: gi, className: "rounded-3xl border border-slate-200 bg-white p-4 shadow-floating" }, /* @__PURE__ */ React.createElement("div", { className: "mb-3 flex items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-mono text-xl font-extrabold tracking-widest text-slate-900" }, g.pattern), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold text-slate-400" }, g.label)), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, g.words.map((w) => /* @__PURE__ */ React.createElement(StressWord, { key: w, w }))), g.tip && /* @__PURE__ */ React.createElement("p", { className: "mt-3 text-xs leading-relaxed text-slate-500" }, "💡 ", rich(g.tip))))));
  }
  /* ===================== SPEAKING 6.0 — các khối riêng ===================== */
  const h = React.createElement;
  const fmt = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

  // Thẻ thông tin: type "cards" — cards:[{tag, title, sub, body, bullets:[], foot}], cols
  function InfoCards({ cards = [], cols = 3, intro, img }) {
    const grid = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[cols] || "sm:grid-cols-2 lg:grid-cols-3";
    return h("div", null,
      intro && h("p", { className: "mb-4 rounded-3xl bg-primary-light p-4 text-sm leading-relaxed text-slate-700" }, rich(intro)),
      img && h("figure", { className: "mb-4 rounded-3xl border border-slate-200 bg-white p-3 shadow-floating" }, h("a", { href: img, target: "_blank", rel: "noopener", title: "Mở ảnh to" }, h("img", { src: img, alt: "", loading: "lazy", className: "mx-auto w-full max-w-3xl rounded-2xl" }))),
      h("div", { className: `grid gap-4 ${grid}` }, cards.map((c, i) => h("div", { key: i, className: "flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-floating" },
        h("div", { className: "flex items-center justify-between gap-2" },
          c.tag && h("span", { className: "rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white" }, c.tag),
          c.sub && h("span", { className: "text-xs font-semibold text-slate-400" }, c.sub)),
        c.title && h("h3", { className: "mt-3 text-lg font-extrabold text-slate-900" }, rich(c.title)),
        c.body && h("p", { className: "mt-2 text-sm leading-relaxed text-slate-600" }, rich(c.body)),
        c.bullets && h("ul", { className: "mt-3 space-y-1.5" }, c.bullets.map((b, k) => h("li", { key: k, className: "flex gap-2 text-sm leading-relaxed text-slate-700" }, h("span", { className: "text-primary" }, "▸"), h("span", null, rich(b))))),
        c.foot && h("p", { className: "mt-auto pt-3 text-xs leading-relaxed text-amber-700" }, "💡 ", rich(c.foot))
      )))
    );
  }

  // 4 tiêu chí: type "criteria" — items:[{name, en, short, check:[...], band5, band6}]
  function Criteria({ items = [], note, labels = ["Band 5.0 thường là", "Band 6.0 cần"] }) {
    const [open, setOpen] = useState(0);
    const colors = ["bg-cyan-500", "bg-indigo-500", "bg-purple-500", "bg-pink-500"];
    return h("div", null,
      h("div", { className: "grid grid-cols-2 gap-3 md:grid-cols-4" }, items.map((c, i) => h("button", {
        key: i, onClick: () => setOpen(i),
        className: `rounded-3xl border-2 p-4 text-left transition ${open === i ? "border-primary bg-white shadow-premium" : "border-slate-200 bg-white/70 hover:border-primary/40"}`
      },
        h("span", { className: `inline-block h-2 w-8 rounded-full ${colors[i % 4]}` }),
        h("p", { className: "mt-2 text-sm font-extrabold text-slate-900" }, c.name),
        h("p", { className: "text-xs font-semibold text-slate-400" }, c.en, " · 25%")))),
      items[open] && h("div", { className: "mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-floating" },
        h("p", { className: "text-sm leading-relaxed text-slate-700" }, rich(items[open].short)),
        items[open].check && h("ul", { className: "mt-3 space-y-1.5" }, items[open].check.map((b, k) => h("li", { key: k, className: "flex gap-2 text-sm text-slate-700" }, h("span", { className: "text-primary" }, "✓"), h("span", null, rich(b))))),
        h("div", { className: "mt-4 grid gap-3 sm:grid-cols-2" },
          h("div", { className: "rounded-2xl bg-slate-50 p-4" }, h("p", { className: "text-[11px] font-bold uppercase tracking-wide text-slate-500" }, labels[0]), h(Cover, null, h("p", { className: "mt-1 text-sm leading-relaxed text-slate-700" }, rich(items[open].band5)))),
          h("div", { className: "rounded-2xl bg-emerald-50 p-4" }, h("p", { className: "text-[11px] font-bold uppercase tracking-wide text-emerald-700" }, labels[1]), h(Cover, null, h("p", { className: "mt-1 text-sm leading-relaxed text-slate-800" }, rich(items[open].band6)))))),
      note && h("p", { className: "mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800" }, "💡 ", rich(note))
    );
  }

  // Công thức trả lời: type "formula" — formula, steps:[{tag, label, text}], examples:[{q, parts:[{tag, text}]}]
  const STEP_COLORS = ["bg-cyan-100 text-cyan-800", "bg-indigo-100 text-indigo-800", "bg-amber-100 text-amber-800", "bg-emerald-100 text-emerald-800", "bg-pink-100 text-pink-800"];
  function Formula({ formula, steps = [], examples = [], note, img }) {
    const colorOf = (tag) => STEP_COLORS[Math.max(0, steps.findIndex((s) => s.tag === tag)) % STEP_COLORS.length];
    return h("div", { className: "space-y-5" },
      formula && h("div", { className: "rounded-3xl bg-primary p-5 text-center text-white shadow-premium" },
        h("p", { className: "text-[11px] font-bold uppercase tracking-widest text-white/70" }, "Công thức"),
        h("p", { className: "mt-1 text-lg font-extrabold sm:text-xl" }, rich(formula))),
      img && h("figure", { className: "rounded-3xl border border-slate-200 bg-white p-3 shadow-floating" }, h("a", { href: img, target: "_blank", rel: "noopener", title: "Mở ảnh to" }, h("img", { src: img, alt: "", loading: "lazy", className: "mx-auto w-full max-w-2xl rounded-2xl" }))),
      steps.length > 0 && h("div", { className: `grid gap-3 sm:grid-cols-${Math.min(steps.length, 4)}` }, steps.map((s, i) => h("div", { key: i, className: "rounded-3xl border border-slate-200 bg-white p-4 shadow-floating" },
        h("span", { className: `rounded-full px-3 py-0.5 text-xs font-extrabold ${STEP_COLORS[i % STEP_COLORS.length]}` }, s.tag),
        h("p", { className: "mt-2 text-sm font-bold text-slate-800" }, rich(s.label)),
        s.text && h("p", { className: "mt-1 text-xs leading-relaxed text-slate-500" }, rich(s.text))))),
      examples.map((ex, i) => h("div", { key: i, className: "rounded-3xl border border-slate-200 bg-white p-5 shadow-floating" },
        h("div", { className: "flex items-start justify-between gap-3" },
          h("p", { className: "text-sm font-bold text-slate-900" }, "❓ ", ex.q),
          h(SpeakButton, { text: ex.q })),
        h("div", { className: "mt-3 space-y-2" }, ex.parts.map((p, k) => h("div", { key: k, className: "flex items-start gap-2" },
          h("span", { className: `mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${colorOf(p.tag)}` }, p.tag),
          h(Cover, null, h("p", { className: "text-sm leading-relaxed text-slate-800" }, rich(p.text)))))),
        h("div", { className: "mt-3" }, h(SpeakButton, { text: ex.parts.map((p) => String(p.text).replace(/\*/g, "")).join(" "), label: "Nghe cả câu trả lời", rate: 0.9 })))),
      note && h("p", { className: "rounded-2xl bg-amber-50 p-3 text-sm text-amber-800" }, "💡 ", rich(note))
    );
  }

  // Câu trả lời mẫu: type "models" — items:[{label, q, a, notes:[...]}]; ẩn mặc định để học viên tự nói trước
  function ModelAnswer({ it, i }) {
    const [show, setShow] = useState(false);
    return h("div", { className: "rounded-3xl border border-slate-200 bg-white p-5 shadow-floating" },
      h("div", { className: "flex items-start justify-between gap-3" },
        h("div", null,
          it.label && h("p", { className: "text-[11px] font-bold uppercase tracking-wide text-primary/70" }, it.label),
          h("p", { className: "text-sm font-bold text-slate-900 sm:text-base" }, i + 1, ". ", it.q)),
        h(SpeakButton, { text: it.q })),
      !show ? h("button", { onClick: () => setShow(true), className: "mt-3 rounded-full bg-primary-light px-4 py-1.5 text-xs font-semibold text-primary hover:bg-indigo-100" }, "Tự nói trước → rồi bấm xem câu mẫu")
        : h("div", { className: "mt-3 rounded-2xl bg-sky-50 p-4" },
          h("p", { className: "leading-relaxed text-slate-800" }, rich(it.a)),
          it.notes && h("ul", { className: "mt-3 space-y-1" }, it.notes.map((n, k) => h("li", { key: k, className: "text-xs leading-relaxed text-slate-600" }, "▸ ", rich(n)))),
          h("div", { className: "mt-3 flex flex-wrap gap-2" },
            h(SpeakButton, { text: String(it.a).replace(/\*/g, ""), label: "Nghe mẫu", rate: 0.9, className: "bg-white" }),
            h("button", { onClick: () => setShow(false), className: "rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm" }, "Ẩn"))));
  }
  function ModelAnswers({ items = [] }) {
    return h("div", { className: "space-y-4" }, items.map((it, i) => h(ModelAnswer, { key: i, it, i })));
  }

  // Ghi âm bằng micro
  function useRecorder() {
    const [state, setState] = useState("idle");
    const [url, setUrl] = useState(null);
    const [err, setErr] = useState("");
    const [ext, setExt] = useState("webm");
    const mr = useRef(null), chunks = useRef([]), stream = useRef(null);
    const start = async () => {
      if (!navigator.mediaDevices || !window.MediaRecorder) { setErr("Trình duyệt này chưa ghi âm được — vẫn luyện nói theo đồng hồ bình thường."); return false; }
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.current = s; chunks.current = [];
        const m = new MediaRecorder(s);
        m.ondataavailable = (e) => { if (e.data && e.data.size) chunks.current.push(e.data); };
        m.onstop = () => {
          const b = new Blob(chunks.current, { type: m.mimeType || "audio/webm" });
          setExt(/mp4|aac|m4a/i.test(b.type) ? "m4a" : /ogg/i.test(b.type) ? "ogg" : "webm");
          setUrl((u) => { if (u) URL.revokeObjectURL(u); return URL.createObjectURL(b); });
          setState("done");
          s.getTracks().forEach((t) => t.stop());
        };
        m.start(); mr.current = m; setErr(""); setState("rec");
        return true;
      } catch (e) { setErr("Chưa cấp quyền micro — bấm cho phép micro để ghi âm."); return false; }
    };
    const stop = () => { try { if (mr.current && mr.current.state !== "inactive") mr.current.stop(); } catch (e) {} };
    useEffect(() => () => { stop(); if (stream.current) stream.current.getTracks().forEach((t) => t.stop()); }, []);
    return { state, url, err, ext, start, stop, reset: () => { setState("idle"); } };
  }

  function CueCard({ card }) {
    return h("div", { className: "rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-floating" },
      h("p", { className: "font-bold leading-relaxed text-slate-900" }, card.topic),
      h("p", { className: "mt-3 text-sm font-semibold text-slate-600" }, "You should say:"),
      h("ul", { className: "mt-1 space-y-1" }, (card.points || []).map((p, i) => h("li", { key: i, className: "flex gap-2 text-sm text-slate-800" }, h("span", { className: "text-amber-600" }, "•"), p))),
      card.explain && h("p", { className: "mt-2 text-sm font-semibold text-slate-800" }, card.explain));
  }

  // Một câu luyện nói có bấm giờ + ghi âm
  function SpeakCard({ item, mode, prep, talk, target, checklist, storeKey }) {
    const [phase, setPhase] = useState("ready"); // ready | prep | talk | done
    const [left, setLeft] = useState(prep);
    const [spent, setSpent] = useState(0);
    const [notes, setNotes] = useState(() => { try { return localStorage.getItem(storeKey) || ""; } catch (e) { return ""; } });
    const [showHint, setShowHint] = useState(false);
    const [showSample, setShowSample] = useState(false);
    const [ticks, setTicks] = useState({});
    const rec = useRecorder();
    const isP2 = mode === "part2";
    useEffect(() => {
      if (phase === "prep") {
        if (left <= 0) { beginTalk(); return; }
        const t = setTimeout(() => setLeft((l) => l - 1), 1e3);
        return () => clearTimeout(t);
      }
      if (phase === "talk") {
        if (spent >= talk) { finish(); return; }
        const t = setTimeout(() => setSpent((s) => s + 1), 1e3);
        return () => clearTimeout(t);
      }
    }, [phase, left, spent]);
    const saveNotes = (v) => { setNotes(v); try { localStorage.setItem(storeKey, v); } catch (e) {} };
    const beginPrep = () => { setLeft(prep); setPhase("prep"); if (!isP2) speak(item.q, 0.9); };
    const beginTalk = () => { setSpent(0); setPhase("talk"); rec.start(); };
    const start = () => { setShowSample(false); setTicks({}); if (prep > 0) beginPrep(); else { if (item.q) speak(item.q, 0.9); setTimeout(beginTalk, item.q ? 300 : 0); } };
    const finish = () => { rec.stop(); setPhase("done"); };
    const goal = target || talk;
    const pct = Math.min(100, spent / talk * 100);
    return h("div", { className: "rounded-3xl border border-slate-200 bg-white p-5 shadow-floating sm:p-6" },
      isP2 && item.card ? h(CueCard, { card: item.card }) : h("div", { className: "text-center" },
        h("p", { className: "text-xl font-extrabold text-slate-900 sm:text-2xl" }, item.q),
        item.vi && h("p", { className: "mt-1 text-sm text-slate-400" }, item.vi),
        h(SpeakButton, { text: item.q, label: "Nghe câu hỏi", className: "mt-3" })),
      phase === "ready" && h("div", { className: "mt-5 text-center" },
        h("button", { onClick: start, className: "rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-premium hover:bg-primary-dark" },
          prep > 0 ? `Bắt đầu ${fmt(prep)} chuẩn bị` : `🎙 Bắt đầu nói (${fmt(talk)})`),
        h("p", { className: "mt-2 text-xs text-slate-400" }, prep > 0 ? "Hết giờ chuẩn bị sẽ tự chuyển sang nói và ghi âm." : "Bấm là bắt đầu ghi âm. Nói to như đang đi thi.")),
      phase === "prep" && h("div", { className: "mt-5" },
        h("div", { className: "flex items-center justify-between" },
          h("p", { className: "text-xs font-bold uppercase tracking-wide text-amber-600" }, "Chuẩn bị · ghi ý chính"),
          h("p", { className: "text-3xl font-extrabold tabular-nums text-amber-600" }, fmt(left))),
        h("textarea", { value: notes, onChange: (e) => saveNotes(e.target.value), rows: 4, placeholder: "Ghi từ khóa cho từng gợi ý, không viết cả câu…", className: "mt-2 w-full rounded-2xl border border-amber-200 bg-amber-50/50 p-3 text-sm outline-none focus:border-amber-400" }),
        h("div", { className: "mt-2 text-right" }, h("button", { onClick: beginTalk, className: "rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white" }, "Nói luôn →"))),
      phase === "talk" && h("div", { className: "mt-5" },
        isP2 && notes && h("p", { className: "mb-3 whitespace-pre-wrap rounded-2xl bg-amber-50 p-3 text-xs text-amber-800" }, notes),
        h("div", { className: "flex items-center justify-between" },
          h("p", { className: "flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-rose-500" },
            h("span", { className: `h-2.5 w-2.5 rounded-full bg-rose-500 ${rec.state === "rec" ? "animate-pulse" : "opacity-30"}` }), rec.state === "rec" ? "Đang ghi âm" : "Đang nói"),
          h("p", { className: `text-3xl font-extrabold tabular-nums ${spent >= goal ? "text-emerald-600" : "text-primary"}` }, fmt(spent), h("span", { className: "text-sm text-slate-400" }, " / ", fmt(talk)))),
        h("div", { className: "mt-2 h-2 w-full rounded-full bg-slate-100" }, h("div", { className: `h-2 rounded-full transition-all duration-1000 ${spent >= goal ? "bg-emerald-500" : "bg-primary"}`, style: { width: `${pct}%` } })),
        target && h("p", { className: "mt-1 text-[11px] text-slate-400" }, "Mục tiêu nói ít nhất ", fmt(target), spent >= target ? " — đạt rồi! ✓" : ""),
        rec.err && h("p", { className: "mt-2 text-xs text-rose-500" }, rec.err),
        h("div", { className: "mt-4 text-center" }, h("button", { onClick: finish, className: "rounded-full bg-rose-500 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-rose-600" }, "■ Dừng"))),
      phase === "done" && h("div", { className: "mt-5 space-y-4" },
        h("div", { className: "flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3" },
          h("p", { className: "text-sm font-semibold text-slate-700" }, "Bạn đã nói ", h("b", { className: spent >= goal ? "text-emerald-600" : "text-rose-500" }, fmt(spent)), target ? ` (mục tiêu ${fmt(target)})` : ""),
          h("button", { onClick: () => { setPhase("ready"); rec.reset(); }, className: "rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm" }, "↺ Nói lại")),
        rec.url && h("div", { className: "rounded-2xl border border-slate-200 p-3" },
          h("p", { className: "mb-2 text-xs font-bold uppercase tracking-wide text-slate-500" }, "🎧 Nghe lại bài nói"),
          h("audio", { controls: true, src: rec.url, className: "w-full" }),
          h("a", { href: rec.url, download: `${storeKey}.${rec.ext}`, className: "mt-2 inline-block text-xs font-semibold text-primary underline" }, "⬇ Tải file ghi âm để nộp bài")),
        checklist && checklist.length > 0 && h("div", { className: "rounded-2xl bg-primary-light p-4" },
          h("p", { className: "mb-2 text-xs font-bold uppercase tracking-wide text-primary" }, "Tự chấm khi nghe lại"),
          checklist.map((c, k) => h("label", { key: k, className: "flex cursor-pointer items-start gap-2 py-0.5 text-sm text-slate-700" },
            h("input", { type: "checkbox", checked: !!ticks[k], onChange: () => setTicks({ ...ticks, [k]: !ticks[k] }), className: "mt-1 accent-indigo-600" }), h("span", null, rich(c)))),
          h("p", { className: "mt-2 text-xs font-semibold text-primary" }, "Đạt ", Object.values(ticks).filter(Boolean).length, "/", checklist.length))),
      h("div", { className: "mt-4 flex flex-wrap justify-center gap-2 border-t border-slate-100 pt-4" },
        item.hints && h("button", { onClick: () => setShowHint(!showHint), className: "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700" }, showHint ? "Ẩn gợi ý" : "💡 Gợi ý ý tưởng"),
        item.sample && h("button", { onClick: () => setShowSample(!showSample), className: "rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700" }, showSample ? "Ẩn câu mẫu" : "📄 Xem câu mẫu")),
      showHint && item.hints && h("div", { className: "mt-3 flex flex-wrap justify-center gap-2" }, item.hints.map((f) => h("span", { key: f, className: "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700" }, rich(f)))),
      showSample && item.sample && h("div", { className: "mt-3 rounded-2xl bg-sky-50 p-4" },
        h("p", { className: "leading-relaxed text-slate-800" }, rich(item.sample)),
        h(SpeakButton, { text: String(item.sample).replace(/\*/g, ""), label: "Nghe mẫu", rate: 0.9, className: "mt-3 bg-white" })));
  }

  // Luyện nói: type "speak" — tabs:[{label, mode: part1|part2|part3, prep, talk, target, checklist, items:[{q, vi, hints, sample} | {card:{topic, points, explain}, sample}]}]
  function SpeakPractice({ tabs = [], lessonId, sectionId, lesson }) {
    const [tab, setTab] = useState(0);
    const [idx, setIdx] = useState(0);
    const t = tabs[tab] || tabs[0];
    if (!t) return null;
    const items = t.items || [];
    const it = items[idx] || items[0];
    const prep = t.prep != null ? t.prep : (t.mode === "part2" ? 60 : 0);
    const talk = t.talk != null ? t.talk : (t.mode === "part2" ? 120 : t.mode === "part3" ? 60 : 30);
    return h("div", { className: "mx-auto max-w-2xl" },
      tabs.length > 1 && h("div", { className: "mb-4 inline-flex flex-wrap rounded-3xl border border-slate-200 bg-white p-1 shadow-sm" }, tabs.map((x, k) => h("button", {
        key: k, onClick: () => { setTab(k); setIdx(0); },
        className: `rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === k ? "bg-primary text-white shadow-premium" : "text-slate-500 hover:text-slate-800"}`
      }, x.label))),
      t.intro && h("p", { className: "mb-4 rounded-3xl bg-primary-light p-4 text-sm leading-relaxed text-slate-700" }, rich(t.intro)),
      lesson && h(AiButton, { href: aiLinkFor(tabs, tab, lesson) }),
      items.length > 1 && h("div", { className: "mb-3 flex flex-wrap gap-1.5" }, items.map((_, k) => h("button", {
        key: k, onClick: () => setIdx(k),
        className: `h-8 w-8 rounded-full text-xs font-bold ${idx === k ? "bg-primary text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`
      }, k + 1))),
      h(SpeakCard, { key: `${tab}-${idx}`, item: it, mode: t.mode, prep, talk, target: t.target, checklist: t.checklist, storeKey: `night-speaking6-${lessonId}-${sectionId}-${tab}-${idx}` }),
      items.length > 1 && h("div", { className: "mt-4 flex justify-between" },
        h("button", { onClick: () => setIdx((idx - 1 + items.length) % items.length), className: "rounded-full px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100" }, "← Trước"),
        h("button", { onClick: () => setIdx((idx + 1) % items.length), className: "rounded-full bg-primary-light px-4 py-2 text-sm font-semibold text-primary hover:bg-indigo-100" }, "Câu tiếp →")));
  }
  /* =================== HẾT PHẦN SPEAKING 6.0 =================== */

  // Nút mở tool AI (speaking.html) — gói câu hỏi gửi kèm trong URL, lần mở đầu tiên tool tự lưu lên Firebase
  function b64url(str) {
    return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function itemToAiText(it) {
    if (it.card) return [it.card.topic, "You should say:"].concat(it.card.points || [], it.card.explain ? [it.card.explain] : []).join("\n");
    return it.q || "";
  }
  function aiLinkFor(tabs, k, lesson) {
    const t = tabs[k];
    if (!t || !t.ai) return null;
    const cfg = t.ai === true ? {} : t.ai;
    const partOf = (x) => x.mode === "part2" ? "2" : x.mode === "part3" ? "3" : "1";
    const group = Array.from(new Set([k].concat(cfg.merge || []))).sort((x, y) => x - y).map((i) => tabs[i]).filter(Boolean);
    const questions = [];
    group.forEach((x) => (x.items || []).forEach((it) => { const text = itemToAiText(it); if (text) questions.push({ part: partOf(x), text }); }));
    const parts = Array.from(new Set(questions.map((q) => q.part)));
    const part = parts.length > 1 ? parts.sort().join("-") : parts[0] || "1";
    const id = cfg.id || `${lesson.id}-p${k + 1}`;
    const title = cfg.title || `${lesson.session} · ${t.label}`;
    const base = lesson.aiTool || "../../speaking.html";
    return `${base}?packageId=${encodeURIComponent(id)}&pkg=${b64url(JSON.stringify({ title, part, questions }))}`;
  }
  function AiButton({ href }) {
    if (!href) return null;
    return h("a", { href, target: "_blank", rel: "noopener", className: "mb-4 flex items-center justify-between gap-3 rounded-3xl bg-gradient-to-r from-fuchsia-500 to-indigo-600 p-4 text-white shadow-premium transition hover:brightness-110" },
      h("span", null,
        h("span", { className: "block text-sm font-extrabold" }, "🤖 Luyện bộ câu này với AI chấm điểm"),
        h("span", { className: "block text-xs text-white/80" }, "Mở tool Speaking của Night IELTS — ghi âm, AI chấm theo 4 tiêu chí, thầy xem lại được.")),
      h("span", { className: "text-xl" }, "→"));
  }

  /* ===================== KHỐI CHO KHÓA WRITING (dùng được cho mọi khóa) =====================
     figure    — ảnh trang sách/biểu đồ: items:[{src, caption, wide}], note
     compare   — đặt các phiên bản bài viết cạnh nhau: intro, items:[{label, tone:"weak"|"ok"|"good", text, comment}], takeaway
     checklist — tự kiểm sau khi viết (tích được, lưu trên máy): groups:[{label, items:[...]}], note
     fill      — điền chỗ trống: items:[{text:"… [[đáp án|đáp án khác]] …", explain}]
     write     — ô viết có đếm từ, lưu nháp, xem bài mẫu: tasks:[{prompt, img, min, hint, frame, model, notes}]
     Section có band8:true → gom sau nút vàng "Band 8" (xem LessonApp). Section có sticker:"ten.webp" → ảnh Irasutoya cạnh tiêu đề. */
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  function Sticker({ ira, className = "" }) {
    const [bad, setBad] = useState(false);
    if (!ira || bad) return null;
    return h("img", { src: IRA_BASE + ira, alt: "", "aria-hidden": "true", loading: "lazy", draggable: false, onError: () => setBad(true), className: `pointer-events-none select-none object-contain ${className}` });
  }
  function Figures({ items = [], note, sticker }) {
    return h("div", { className: "space-y-4" },
      h("div", { className: "grid gap-4 sm:grid-cols-2" }, items.map((f, i) => h("figure", { key: i, className: `overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-floating ${f.wide ? "sm:col-span-2" : ""}` },
        h("a", { href: f.src, target: "_blank", rel: "noopener", title: "Mở ảnh to" }, h("img", { src: f.src, alt: f.caption || "", loading: "lazy", className: "mx-auto w-full rounded-2xl" })),
        f.caption && h("figcaption", { className: "mt-2 px-1 text-xs leading-relaxed text-slate-500" }, rich(f.caption))))),
      note && h("div", { className: "flex items-center gap-3 rounded-3xl bg-amber-50 p-4" },
        h(Sticker, { ira: sticker, className: "h-16 w-16 shrink-0" }),
        h("p", { className: "text-sm leading-relaxed text-amber-900" }, rich(note))));
  }
  const TONES = {
    weak: ["border-rose-200 bg-rose-50/60", "bg-rose-100 text-rose-700"],
    ok: ["border-sky-200 bg-sky-50/60", "bg-sky-100 text-sky-700"],
    good: ["border-emerald-200 bg-emerald-50/60", "bg-emerald-100 text-emerald-700"]
  };
  function Compare({ intro, items = [], takeaway }) {
    const cols = items.length >= 3 ? "lg:grid-cols-3" : "md:grid-cols-2";
    return h("div", { className: "space-y-4" },
      intro && h("p", { className: "rounded-3xl bg-primary-light p-4 text-sm leading-relaxed text-slate-700" }, rich(intro)),
      h("div", { className: `grid gap-4 ${cols}` }, items.map((v, i) => {
        const t = TONES[v.tone] || TONES.ok;
        return h("div", { key: i, className: `flex flex-col rounded-3xl border-2 p-5 ${t[0]}` },
          h("span", { className: `self-start rounded-full px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${t[1]}` }, v.label),
          h("div", { className: "mt-3 flex flex-1 flex-col" }, h(Cover, null, h("div", null,
            h("p", { className: "whitespace-pre-line text-sm leading-relaxed text-slate-800" }, rich(v.text)),
            v.comment && h("p", { className: "mt-3 border-t border-slate-200/70 pt-3 text-xs leading-relaxed text-slate-600" }, "💬 ", rich(v.comment))))));
      })),
      takeaway && h("p", { className: "rounded-2xl bg-amber-50 p-3 text-sm leading-relaxed text-amber-900" }, "💡 ", rich(takeaway)));
  }
  function Checklist({ groups = [], note, storeKey }) {
    const [done, setDone] = useState(() => lsGet(storeKey, {}));
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    const count = Object.values(done).filter(Boolean).length;
    const toggle = (k) => { const n = { ...done, [k]: !done[k] }; setDone(n); lsSet(storeKey, n); };
    let num = 0;
    return h("div", { className: "space-y-4" },
      h("div", { className: "grid gap-4 md:grid-cols-3" }, groups.map((g, gi) => h("div", { key: gi, className: "rounded-3xl border border-slate-200 bg-white p-5 shadow-floating" },
        h("p", { className: "mb-3 text-sm font-extrabold text-slate-900" }, g.label),
        h("ul", { className: "space-y-2" }, g.items.map((it) => {
          num += 1; const k = `${gi}-${num}`; const n = num;
          return h("li", { key: k }, h("label", { className: "flex cursor-pointer items-start gap-2 text-sm leading-relaxed text-slate-700" },
            h("input", { type: "checkbox", checked: !!done[k], onChange: () => toggle(k), className: "mt-1 h-4 w-4 shrink-0 accent-indigo-600" }),
            h("span", { className: done[k] ? "text-slate-400 line-through" : "" }, h("b", { className: "text-primary" }, n, ") "), rich(it))));
        }))))),
      h("div", { className: "flex items-center justify-between rounded-3xl bg-primary-light px-5 py-3 text-sm font-semibold text-primary" },
        h("span", null, "Đã kiểm ", count, "/", total), count > 0 && h("button", { onClick: () => { setDone({}); lsSet(storeKey, {}); }, className: "text-xs underline" }, "Bỏ tích hết")),
      note && h("p", { className: "rounded-2xl bg-amber-50 p-3 text-sm text-amber-800" }, "💡 ", rich(note)));
  }
  const normAns = (s) => String(s || "").toLowerCase().replace(/[’']/g, "'").replace(/[.,;:!?]+$/g, "").replace(/\s+/g, " ").trim();
  function FillItem({ it, i }) {
    const parts = String(it.text).split(/\[\[(.+?)\]\]/);
    const gaps = parts.filter((_, k) => k % 2 === 1).map((g) => g.split("|"));
    const [vals, setVals] = useState(gaps.map(() => ""));
    const [checked, setChecked] = useState(false);
    const [shown, setShown] = useState(false);
    const ok = gaps.map((g, k) => g.some((a) => normAns(a) === normAns(vals[k])));
    let gi = -1;
    return h("div", { className: "rounded-3xl border border-slate-200 bg-white p-5 shadow-floating" },
      h("p", { className: "text-sm leading-loose text-slate-800" }, h("span", { className: "mr-2 font-bold text-primary" }, i + 1, "."), parts.map((p, k) => {
        if (k % 2 === 0) return h(React.Fragment, { key: k }, rich(p));
        gi += 1; const g = gi;
        const st = !checked ? "border-slate-300 focus:border-primary" : ok[g] ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-rose-400 bg-rose-50 text-rose-700";
        return h("span", { key: k, className: "inline-flex items-baseline gap-1" },
          h("input", { value: shown ? gaps[g][0] : vals[g], readOnly: shown, onChange: (e) => { const n = vals.slice(); n[g] = e.target.value; setVals(n); setChecked(false); },
            "aria-label": `Chỗ trống ${g + 1}`, autoCapitalize: "off", autoComplete: "off", spellCheck: false,
            style: { width: `${Math.max(5, gaps[g][0].length + 2)}ch` },
            className: `mx-1 rounded-lg border-b-2 border-t-0 border-x-0 bg-slate-50 px-1.5 py-0.5 text-center text-sm font-semibold outline-none ${st}` }));
      })),
      h("div", { className: "mt-3 flex flex-wrap items-center gap-2" },
        h("button", { onClick: () => setChecked(true), className: "rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white" }, "Kiểm tra"),
        h("button", { onClick: () => setShown(!shown), className: "rounded-full bg-primary-light px-4 py-1.5 text-xs font-semibold text-primary" }, shown ? "Ẩn đáp án" : "Xem đáp án"),
        checked && h("span", { className: `text-xs font-bold ${ok.every(Boolean) ? "text-emerald-600" : "text-rose-600"}` }, ok.every(Boolean) ? "✓ Chính xác!" : `Đúng ${ok.filter(Boolean).length}/${gaps.length}`)),
      (checked || shown) && it.explain && h("p", { className: "mt-3 text-xs leading-relaxed text-slate-600" }, "💡 ", rich(it.explain)));
  }
  function Fill({ items = [], intro, img }) {
    return h("div", { className: "mx-auto max-w-3xl space-y-4" },
      intro && h("p", { className: "rounded-3xl bg-primary-light p-4 text-sm leading-relaxed text-slate-700" }, rich(intro)),
      img && h("figure", { className: "rounded-3xl border border-slate-200 bg-white p-3 shadow-floating" }, h("a", { href: img, target: "_blank", rel: "noopener", title: "Mở ảnh to" }, h("img", { src: img, alt: "", loading: "lazy", className: "mx-auto w-full rounded-2xl" }))),
      items.map((it, i) => h(FillItem, { key: i, it, i })));
  }
  const wordCount = (s) => (String(s).trim().match(/[A-Za-zÀ-ỹ0-9]+(?:['’-][A-Za-zÀ-ỹ0-9]+)*/g) || []).length;
  function WriteTask({ t, i, storeKey }) {
    const [txt, setTxt] = useState(() => lsGet(storeKey, ""));
    const [show, setShow] = useState(false);
    const n = wordCount(txt);
    const min = t.min || 0;
    return h("div", { className: "rounded-3xl border border-slate-200 bg-white p-5 shadow-floating" },
      h("p", { className: "text-sm font-bold leading-relaxed text-slate-900" }, h("span", { className: "mr-2 text-primary" }, "✍️ ", i + 1, "."), rich(t.prompt)),
      t.img && h("img", { src: t.img, alt: "", loading: "lazy", className: "mt-3 w-full rounded-2xl border border-slate-100" }),
      t.hint && h("p", { className: "mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600" }, "🧭 ", rich(t.hint)),
      h("textarea", { value: txt, rows: t.rows || 6, placeholder: t.frame || "Viết vào đây… (bài được lưu trên máy này)",
        onChange: (e) => { setTxt(e.target.value); lsSet(storeKey, e.target.value); },
        className: "mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-primary focus:bg-white" }),
      h("div", { className: "mt-2 flex flex-wrap items-center justify-between gap-2" },
        h("span", { className: `text-xs font-bold ${min && n < min ? "text-amber-600" : "text-emerald-600"}` }, n, " từ", min ? ` / tối thiểu ${min}` : ""),
        t.model && h("button", { onClick: () => setShow(!show), className: "rounded-full bg-primary-light px-4 py-1.5 text-xs font-semibold text-primary" }, show ? "Ẩn bài mẫu" : "Viết xong → xem bài mẫu")),
      show && t.model && h("div", { className: "mt-3 rounded-2xl bg-sky-50 p-4" },
        h("p", { className: "whitespace-pre-line text-sm leading-relaxed text-slate-800" }, rich(t.model)),
        t.notes && h("ul", { className: "mt-3 space-y-1" }, t.notes.map((x, k) => h("li", { key: k, className: "text-xs leading-relaxed text-slate-600" }, "▸ ", rich(x))))));
  }
  function WriteBox({ tasks = [], lessonId, sectionId, lesson }) {
    return h("div", { className: "mx-auto max-w-3xl space-y-4" }, tasks.map((t, i) => h(WriteTask, { key: i, t, i, storeKey: `night-${courseKeyOf(lesson)}-${lessonId}-${sectionId}-w${i}` })));
  }
  function Band8Gate({ open, onToggle, info = {}, count }) {
    return h("div", { id: "band8", className: "scroll-mt-24" },
      h("div", { className: "relative overflow-hidden rounded-[30px] bg-peach p-6 text-white shadow-floating sm:rounded-[36px] sm:p-8" },
        h("span", { "aria-hidden": "true", className: "pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border-[28px] border-white/15" }),
        h("span", { "aria-hidden": "true", className: "pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full border-[22px] border-white/10" }),
        h("div", { className: "relative flex flex-col items-center gap-5 sm:flex-row" },
          h("div", { className: "relative shrink-0" },
            h("span", { className: "absolute -left-2 -top-2 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-xl text-amber-300 shadow-lg" }, "★"),
            h("div", { className: "flex h-32 w-32 items-center justify-center rounded-[28px] bg-white/25" }, h(Sticker, { ira: info.sticker || "trophy_school_boy.webp", className: "nv-float h-28 w-28" }))),
          h("div", { className: "flex-1 text-center sm:text-left" },
            h("p", { className: "text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/80" }, "Nâng cao · ", count, " phần"),
            h("h2", { className: "mt-1 text-2xl font-extrabold leading-tight sm:text-3xl" }, info.title || "Nội dung Band 8"),
            h("p", { className: "mt-2 text-sm leading-relaxed text-white/90 [&_*]:!text-white [&_b]:underline [&_b]:decoration-white/50 [&_strong]:underline" }, rich(info.desc || "Dành cho bạn nhắm 7.0+. Học cùng thầy trên lớp hoặc tự đọc ở nhà.")),
            h("button", { onClick: onToggle, "aria-expanded": open,
              className: `mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-extrabold shadow-lg transition hover:-translate-y-0.5 ${open ? "bg-white text-peach-dark" : "bg-ink text-white"}` },
              open ? "Thu gọn Band 8" : "★ Mở nội dung Band 8", h("span", { "aria-hidden": "true" }, open ? "▴" : "▾"))))));
  }
  function SectionBody({ s, lesson }) {
    switch (s.type) {
      case "vowels":
      case "sounds":
        return /* @__PURE__ */ React.createElement(VowelChart, { mono: s.mono, diph: s.diph, tabs: s.tabs, hint: s.hint, mistakes: s.mistakes, mistakesTitle: s.mistakesTitle });
      case "stress":
        return /* @__PURE__ */ React.createElement(StressGrid, { groups: s.groups, intro: s.intro });
      case "phonics":
        return /* @__PURE__ */ React.createElement(PhonicsGrid, { groups: s.groups, rows: s.rows, intro: s.intro });
      case "pairs":
        return /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-xl" }, /* @__PURE__ */ React.createElement(MinimalPairQuiz, { pairs: s.pairs }));
      case "grammar":
        return /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, s.points.map((g, i) => /* @__PURE__ */ React.createElement(GrammarBlock, { key: i, index: i + 1, ...g })));
      case "quiz":
        return /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-2xl" }, /* @__PURE__ */ React.createElement(ChoiceQuiz, { items: s.items }));
      case "vocab":
        return /* @__PURE__ */ React.createElement("div", null, (s.groups || [{ cards: s.cards }]).map((g, gi) => /* @__PURE__ */ React.createElement("div", { key: gi, className: gi ? "mt-8" : "" }, g.label && /* @__PURE__ */ React.createElement("p", { className: "mb-3 flex items-center gap-2 text-sm font-bold text-slate-700" }, /* @__PURE__ */ React.createElement("span", { className: "h-2 w-2 rounded-full bg-vocab-front" }), g.label, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold text-slate-400" }, "· ", g.cards.length, " từ")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 justify-items-center gap-4 sm:grid-cols-3 md:grid-cols-4" }, g.cards.map((v) => /* @__PURE__ */ React.createElement(InteractiveVocab, { key: v.word, ...v, visual: (s.groups || [{ cards: s.cards }]).some((gg) => (gg.cards || []).some((c) => c.ira || c.img || c.emoji)) }))))), s.note && /* @__PURE__ */ React.createElement("div", { className: "mt-6 rounded-3xl border border-slate-200 bg-white p-5 text-sm shadow-floating" }, /* @__PURE__ */ React.createElement("p", { className: "mb-2 font-bold text-slate-700" }, s.note.title), /* @__PURE__ */ React.createElement("div", { className: "grid gap-2 sm:grid-cols-2" }, s.note.rows.map((r, i) => /* @__PURE__ */ React.createElement("p", { key: i }, rich(r))))));
      case "dialogue":
        return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "space-y-8" }, s.parts.map((p, i) => /* @__PURE__ */ React.createElement(ParagraphBlock, { key: i, index: i + 1, speakers: s.speakers, ...p }))), s.phrases && /* @__PURE__ */ React.createElement("div", { className: "mt-8" }, /* @__PURE__ */ React.createElement(PhraseBox, { ...s.phrases })));
      case "phrases":
        return /* @__PURE__ */ React.createElement(PhraseBox, { title: s.boxTitle, groups: s.groups, phrases: s.phrases });
      case "reflex":
        return /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-2xl" }, /* @__PURE__ */ React.createElement(ReflexDrill, { questions: s.questions }));
      case "homework":
        return /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-2xl" }, /* @__PURE__ */ React.createElement(Homework, { tasks: s.tasks, storageKey: `night-${courseKeyOf(lesson)}-${lesson.id}-homework` }));
      case "cards":
        return h(InfoCards, { cards: s.cards, cols: s.cols, intro: s.intro, img: s.img });
      case "criteria":
        return h(Criteria, { items: s.items, note: s.note, labels: s.labels });
      case "formula":
        return h(Formula, { formula: s.formula, steps: s.steps, examples: s.examples, note: s.note, img: s.img });
      case "models":
        return h("div", { className: "mx-auto max-w-3xl" }, h(ModelAnswers, { items: s.items }));
      case "speak":
        return h(SpeakPractice, { tabs: s.tabs, lessonId: lesson.id, sectionId: s.id, lesson });
      case "figure":
        return h(Figures, { items: s.items, note: s.note, sticker: s.noteSticker });
      case "compare":
        return h(Compare, { intro: s.intro, items: s.items, takeaway: s.takeaway });
      case "checklist":
        return h(Checklist, { groups: s.groups, note: s.note, storeKey: `night-${courseKeyOf(lesson)}-${lesson.id}-${s.id}-check` });
      case "fill":
        return h(Fill, { items: s.items, intro: s.intro, img: s.img });
      case "write":
        return h(WriteBox, { tasks: s.tasks, lessonId: lesson.id, sectionId: s.id, lesson });
      default:
        return null;
    }
  }
  /* ===================== PHỤ ĐỀ TRỰC TIẾP (CC) — nghe EN → dịch VI, hoặc nghe VI → dịch EN =====================
     Chuyển từ mindset0/docsach.html (giữ nguyên cách làm & các bản sửa lỗi ở đó). Bật bằng nút "CC" góc dưới.
     • 2 "động cơ" nghe micro:
       - 'speech' (mặc định): Web Speech API của Chrome/Edge — chữ hiện tức thời từng từ,
         không cần key. Tự chốt dòng khi ngừng nói ~1 giây hoặc câu dở quá dài.
       - 'whisper' (trình duyệt không có Web Speech như Safari/iPad): ghi âm từng
         đoạn ~2,5 giây rồi gửi Groq Whisper (dùng chung key Groq của cả web). Đoạn gần như im lặng thì bỏ qua.
     • "Âm thanh máy tính": lấy âm thanh hệ thống qua hộp thoại chia sẻ màn hình (getDisplayMedia), chạy 1 vòng
       Whisper RIÊNG song song — micro vẫn giữ động cơ nhanh, không bị chậm theo.
     • Dịch: Google Translate (không chính thức), lỗi thì MyMemory.
     • Ô ghi chú dùng micro (đọc chính tả) → phụ đề tạm nhường micro, ghi xong tự nghe tiếp. */
  const CC_MODE_KEY = "nightIeltsSubtitleMode"; // dùng chung với docsach.html
  const CC_SYS_AUDIO_WARN_KEY = "nightIeltsSystemAudioWarningSeen";
  const CC_WHISPER_EN = ["distil-whisper-large-v3-en", "whisper-large-v3-turbo", "whisper-large-v3"];
  const CC_WHISPER_MULTI = ["whisper-large-v3-turbo", "whisper-large-v3"];
  const CC_CHUNK_MS = 2500;
  const CC_PAUSE_MS = 1000;
  const CC_MAX_WORDS = 14;
  const CC_SILENCE_RMS = 0.008;
  const CC_HALLU_RE = /^\s*(you|bye|thank you( so much)?( for watching)?|thanks for watching|please subscribe|subscribe|cảm ơn (các bạn )?đã (theo dõi|xem)( video)?( này)?|hãy (đăng ký|subscribe) kênh.*|ghiền mì gõ.*)[\s.!]*$/i;
  function ccGroqKey() {
    const k = getGroqCfg().apiKey;
    if (k) return k;
    try { return localStorage.getItem("nightIeltsGroqApiKey") || ""; } catch (e) { return ""; }
  }
  function ccTranslateGoogle(text, sl, tl) {
    const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" + sl + "&tl=" + tl + "&dt=t&q=" + encodeURIComponent(text);
    return fetch(url).then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }).then((d) => {
      const out = d && d[0] ? d[0].map((c) => c[0] || "").join("") : "";
      if (!out) throw new Error("empty");
      return out;
    });
  }
  function ccTranslateMyMemory(text, sl, tl) {
    return fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=" + sl + "|" + tl)
      .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then((d) => { const t = d && d.responseData && d.responseData.translatedText; if (!t) throw new Error("empty"); return t; });
  }
  const ccTranslate = (text, sl, tl) => ccTranslateGoogle(text, sl, tl).catch(() => ccTranslateMyMemory(text, sl, tl));
  function ccPickMime() {
    for (const c of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) return c;
    }
    return "";
  }
  // Đồ thị âm thanh: nguồn → (destination để ghi âm + analyser đo độ lớn). Trả về { ctx, dest, peak(), reset(), close() }
  function ccAudioGraph(stream) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctor();
    if (ctx.state === "suspended") ctx.resume().catch(() => {}); // context "suspended" → ghi ra toàn im lặng
    const dest = ctx.createMediaStreamDestination();
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    const src = ctx.createMediaStreamSource(stream);
    src.connect(dest);
    src.connect(an);
    let peak = 0;
    const timer = setInterval(() => {
      const d = new Uint8Array(an.fftSize);
      an.getByteTimeDomainData(d);
      let s = 0;
      for (let i = 0; i < d.length; i++) { const v = (d[i] - 128) / 128; s += v * v; }
      const rms = Math.sqrt(s / d.length);
      if (rms > peak) peak = rms;
    }, 80);
    return {
      dest,
      peak: () => peak,
      reset: () => { peak = 0; },
      close: () => { clearInterval(timer); try { ctx.close(); } catch (e) {} },
    };
  }

  function LiveCaptions() {
    const [active, setActive] = useState(false);
    const [paused, setPaused] = useState(false);
    const [status, setStatus] = useState("idle"); // idle | listening | paused | yield | error
    const [error, setError] = useState("");
    const [needKey, setNeedKey] = useState(false);
    const [keyInput, setKeyInput] = useState("");
    const [mode, setMode] = useState(() => {
      try { const m = localStorage.getItem(CC_MODE_KEY); if (m === "en" || m === "vi") return m; } catch (e) {} // chế độ "auto" (VI⇄EN) đã bỏ → về EN→VI
      return "en";
    });
    const [lines, setLines] = useState([]);
    const [interim, setInterim] = useState("");
    const [interimTr, setInterimTr] = useState("");
    const [hasTab, setHasTab] = useState(false);
    const [silenceHint, setSilenceHint] = useState("");
    const [showWarn, setShowWarn] = useState(false);
    const barRef = useRef(null);
    const R = useRef({ active: false, paused: false, yielded: false, engine: "speech", mode, gen: 0, tabGen: 0, rec: null, mic: null, micGraph: null, micRec: null, tab: null, tabGraph: null, tabRec: null, hasTab: false, silent: 0 }).current;

    // Đẩy nút ✏️ và nội dung trang lên trên thanh phụ đề
    useEffect(() => {
      document.body.classList.toggle("night-cc-on", active);
      if (!active || !barRef.current || typeof ResizeObserver === "undefined") return;
      const ro = new ResizeObserver(() => { if (barRef.current) document.documentElement.style.setProperty("--night-cc-h", barRef.current.offsetHeight + "px"); });
      ro.observe(barRef.current);
      return () => ro.disconnect();
    }, [active]);

    const pushLine = useCallback((text, lang) => {
      const id = Date.now() + Math.random();
      setLines((p) => [...p, { id, text, lang, tr: "" }].slice(-2));
      ccTranslate(text, lang, lang === "vi" ? "en" : "vi")
        .then((tr) => setLines((p) => p.map((l) => l.id === id ? { ...l, tr } : l)))
        .catch(() => setLines((p) => p.map((l) => l.id === id ? { ...l, tr: "(chưa dịch được)" } : l)));
    }, []);

    // Dịch luôn câu đang nói dở sau ~0,5 giây ngừng đổi
    useEffect(() => {
      if (!interim) { setInterimTr(""); return; }
      const lang = R.mode === "vi" ? "vi" : "en";
      let off = false;
      const t = setTimeout(() => { ccTranslateGoogle(interim, lang, lang === "vi" ? "en" : "vi").then((tr) => { if (!off) setInterimTr(tr); }).catch(() => {}); }, 500);
      return () => { off = true; clearTimeout(t); };
    }, [interim]);

    const fail = (msg, key) => { setStatus("error"); setError(msg); setNeedKey(!!key); };

    const transcribe = useCallback(async (blob) => {
      const key = ccGroqKey();
      if (!key) { fail("Cần Groq API key (miễn phí, dùng chung cả web) — dán vào ô bên dưới.", true); return; }
      const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
      const m = R.mode;
      const models = m === "vi" ? CC_WHISPER_MULTI : CC_WHISPER_EN;
      for (let i = 0; i < models.length; i++) {
        const last = i === models.length - 1;
        try {
          const fd = new FormData();
          fd.append("file", blob, "chunk." + ext);
          fd.append("model", models[i]);
          fd.append("language", m === "vi" ? "vi" : "en");
          fd.append("response_format", "json");
          fd.append("temperature", "0");
          const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: "Bearer " + key }, body: fd });
          if (res.status === 401) { fail("Groq API key không hợp lệ — dán lại key đúng vào ô bên dưới.", true); return; }
          if (!res.ok) { if (!last && (res.status === 404 || res.status === 400)) continue; throw new Error("HTTP " + res.status); }
          const d = await res.json();
          const text = ((d && d.text) || "").trim();
          if (text) {
            setStatus((s) => (s === "error" ? "listening" : s)); setError("");
            if (!CC_HALLU_RE.test(text)) pushLine(text, m === "vi" ? "vi" : "en");
          }
          return;
        } catch (e) {
          if (last) fail("Lỗi kết nối tới Groq — đang tự thử lại…");
        }
      }
    }, [pushLine]);

    // Vòng ghi âm theo đoạn (micro ở chế độ whisper, hoặc âm thanh máy tính)
    const recordLoop = useCallback(async (which, gen) => {
      const graph = which === "mic" ? R.micGraph : R.tabGraph;
      const alive = () => R.active && !R.paused && (which === "mic" ? gen === R.gen && R.micGraph === graph : gen === R.tabGen && R.hasTab && R.tabGraph === graph);
      if (!graph || !alive()) return;
      let rec;
      try { const mt = ccPickMime(); rec = new MediaRecorder(graph.dest.stream, mt ? { mimeType: mt } : undefined); }
      catch (e) { if (which === "mic") fail("Trình duyệt này không ghi âm được (MediaRecorder)."); return; }
      if (which === "mic") R.micRec = rec; else R.tabRec = rec;
      graph.reset();
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      const stopped = new Promise((r) => { rec.onstop = r; });
      rec.start();
      await new Promise((r) => setTimeout(r, CC_CHUNK_MS));
      if (rec.state !== "inactive") rec.stop();
      await stopped;
      if (!alive()) return;
      if (graph.peak() >= CC_SILENCE_RMS && chunks.length) {
        if (which === "tab") { R.silent = 0; setSilenceHint(""); }
        transcribe(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
      } else if (which === "tab" && ++R.silent >= 4) {
        setSilenceHint("Chưa nghe thấy âm thanh máy tính — trong hộp thoại chia sẻ, chọn \"Toàn bộ màn hình\" và bật \"Also share system audio\"; kiểm tra máy có đang tắt tiếng không.");
      }
      recordLoop(which, gen);
    }, [transcribe]);

    const startSpeech = useCallback(() => {
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Ctor) return false;
      const r = new Ctor();
      const lang = R.mode === "vi" ? "vi" : "en";
      r.lang = lang === "vi" ? "vi-VN" : "en-US";
      r.continuous = true;
      r.interimResults = true;
      let committed = {}, pIdx = -1, pWords = null, timer = null;
      const flush = () => {
        if (timer) { clearTimeout(timer); timer = null; }
        if (R.rec !== r || pIdx < 0 || !pWords) return;
        const rest = pWords.slice(committed[pIdx] || 0);
        if (rest.length) { pushLine(rest.join(" "), lang); committed[pIdx] = pWords.length; }
        pIdx = -1; pWords = null; setInterim("");
      };
      r.onresult = (ev) => {
        const parts = [];
        let li = -1, lw = null;
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          const words = res[0].transcript.trim().split(/\s+/).filter(Boolean);
          const rest = words.slice(committed[i] || 0);
          if (res.isFinal) {
            if (rest.length) pushLine(rest.join(" "), lang);
            committed[i] = Math.max(committed[i] || 0, words.length);
            if (pIdx === i) { pIdx = -1; pWords = null; }
          } else { if (rest.length) parts.push(rest.join(" ")); li = i; lw = words; }
        }
        setInterim(parts.join(" "));
        setStatus("listening"); setError("");
        if (timer) { clearTimeout(timer); timer = null; }
        if (li >= 0) {
          pIdx = li; pWords = lw;
          if (lw.length - (committed[li] || 0) >= CC_MAX_WORDS) flush(); else timer = setTimeout(flush, CC_PAUSE_MS);
        }
      };
      r.onerror = (ev) => {
        if (ev.error === "no-speech" || ev.error === "aborted") return;
        if (ev.error === "not-allowed" || ev.error === "service-not-allowed") fail("Chưa cấp quyền micro — bấm biểu tượng ổ khóa cạnh thanh địa chỉ để cho phép.");
        else if (ev.error === "network") fail("Nhận diện giọng nói cần mạng internet.");
      };
      r.onend = () => { // Chrome tự ngắt sau một lúc im lặng → tự nghe lại
        flush(); committed = {};
        if (R.rec === r && R.active && !R.paused && !R.yielded && R.engine === "speech") { try { r.start(); } catch (e) {} }
      };
      try { r.start(); } catch (e) { return false; }
      R.rec = r;
      return true;
    }, [pushLine]);

    const startMic = useCallback(async () => {
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (Ctor) { R.engine = "speech"; if (startSpeech()) return; }
      R.engine = "whisper";
      if (!ccGroqKey()) {
        fail("Trình duyệt này không có nhận diện giọng nói tức thời (dùng Chrome/Edge), hoặc dán Groq API key để dùng chế độ theo đoạn.", true);
        return;
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { fail("Trình duyệt không cho dùng micro (cần mở trang qua https)."); return; }
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!R.active || R.paused) { s.getTracks().forEach((t) => t.stop()); return; }
        R.mic = s; R.micGraph = ccAudioGraph(s);
        recordLoop("mic", R.gen);
      } catch (e) { fail("Chưa cấp quyền micro — bấm biểu tượng ổ khóa cạnh thanh địa chỉ để cho phép."); }
    }, [startSpeech, recordLoop]);

    const stopMic = useCallback(() => {
      R.gen++;
      if (R.rec) { const r = R.rec; R.rec = null; try { r.onend = null; r.stop(); } catch (e) {} }
      if (R.micRec && R.micRec.state !== "inactive") { try { R.micRec.stop(); } catch (e) {} }
      R.micRec = null;
      if (R.mic) { R.mic.getTracks().forEach((t) => t.stop()); R.mic = null; }
      if (R.micGraph) { R.micGraph.close(); R.micGraph = null; }
      setInterim("");
    }, []);

    const stopTab = useCallback(() => {
      R.hasTab = false; R.tabGen++; setHasTab(false);
      if (R.tabRec && R.tabRec.state !== "inactive") { try { R.tabRec.stop(); } catch (e) {} }
      R.tabRec = null;
      if (R.tab) { R.tab.getTracks().forEach((t) => t.stop()); R.tab = null; }
      if (R.tabGraph) { R.tabGraph.close(); R.tabGraph = null; }
    }, []);

    const start = useCallback(async () => {
      if (R.active) return;
      Object.assign(R, { active: true, paused: false, yielded: false, silent: 0, hasTab: false });
      setActive(true); setPaused(false); setStatus("listening"); setError(""); setNeedKey(false);
      setLines([]); setInterim(""); setHasTab(false); setSilenceHint("");
      await startMic();
    }, [startMic]);

    const stop = useCallback(() => {
      Object.assign(R, { active: false, paused: false, yielded: false });
      stopMic(); stopTab();
      R.engine = "speech";
      setActive(false); setPaused(false); setStatus("idle"); setError(""); setNeedKey(false);
      setLines([]); setInterim(""); setSilenceHint("");
    }, [stopMic, stopTab]);

    const pause = useCallback(() => {
      if (!R.active || R.paused) return;
      R.paused = true; setPaused(true); setStatus("paused");
      stopMic();
      R.tabGen++;
      if (R.tabRec && R.tabRec.state !== "inactive") { try { R.tabRec.stop(); } catch (e) {} }
    }, [stopMic]);

    const resume = useCallback(async () => {
      if (!R.active || !R.paused) return;
      R.paused = false; R.silent = 0;
      setPaused(false); setStatus("listening"); setError(""); setNeedKey(false); setSilenceHint("");
      if (R.hasTab) recordLoop("tab", R.tabGen);
      await startMic();
    }, [startMic, recordLoop]);

    const switchMode = useCallback((m) => {
      if (m === R.mode) return;
      R.mode = m; setMode(m);
      try { localStorage.setItem(CC_MODE_KEY, m); } catch (e) {}
      if (R.active && !R.paused && !R.yielded) { stopMic(); setStatus("listening"); setError(""); setNeedKey(false); startMic(); }
    }, [stopMic, startMic]);

    const addTabAudio = useCallback(async () => {
      if (!R.active) return;
      if (!ccGroqKey()) { fail("Nghe âm thanh máy tính cần Groq API key miễn phí — dán vào ô bên dưới.", true); return; }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { fail("Trình duyệt này không lấy được âm thanh máy tính (dùng Chrome/Edge trên máy tính)."); return; }
      try {
        const ds = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: "monitor", frameRate: { ideal: 1, max: 5 } }, audio: { systemAudio: "include" }, preferCurrentTab: false });
        const tracks = ds.getAudioTracks();
        ds.getVideoTracks().forEach((t) => t.stop());
        if (!tracks.length) { setSilenceHint("Chưa lấy được âm thanh — trong hộp thoại, chọn \"Toàn bộ màn hình\" (Entire Screen) rồi bật \"Also share system audio\" trước khi bấm Chia sẻ."); return; }
        if (R.hasTab) stopTab();
        const s = new MediaStream(tracks);
        R.tab = s; R.tabGraph = ccAudioGraph(s); R.hasTab = true; R.silent = 0;
        setHasTab(true); setSilenceHint("");
        tracks[0].addEventListener("ended", stopTab); // bấm "Dừng chia sẻ" trên thanh của trình duyệt
        if (!R.paused) recordLoop("tab", R.tabGen);
      } catch (e) { /* bấm Hủy ở hộp thoại chia sẻ */ }
    }, [stopTab, recordLoop]);

    const clickTabAudio = () => {
      let seen = false;
      try { seen = localStorage.getItem(CC_SYS_AUDIO_WARN_KEY) === "1"; } catch (e) {}
      if (seen) addTabAudio(); else setShowWarn(true);
    };

    const saveKey = () => {
      const k = keyInput.trim();
      if (!k) return;
      saveGroqKey(k);
      setKeyInput(""); setNeedKey(false); setError(""); setStatus("listening");
      if (R.active && !R.paused) { stopMic(); startMic(); }
    };

    // Ô ghi chú bật đọc chính tả → nhường micro, xong thì nghe tiếp
    useEffect(() => {
      const onStart = () => {
        if (!R.active || R.paused || R.engine !== "speech") return;
        R.yielded = true; stopMic(); setStatus("yield");
      };
      const onEnd = () => {
        if (!R.yielded) return;
        R.yielded = false;
        if (R.active && !R.paused) { setStatus("listening"); startMic(); }
      };
      window.addEventListener("night-dictation-start", onStart);
      window.addEventListener("night-dictation-end", onEnd);
      return () => { window.removeEventListener("night-dictation-start", onStart); window.removeEventListener("night-dictation-end", onEnd); };
    }, [stopMic, startMic]);

    useEffect(() => () => stop(), [stop]); // rời trang → tắt micro

    const MODES = [
      { key: "en", label: "EN → VI", hint: "Nghe tiếng Anh, dịch sang tiếng Việt — chữ hiện tức thời" },
      { key: "vi", label: "VI → EN", hint: "Nghe tiếng Việt, dịch sang tiếng Anh — chữ hiện tức thời" },
    ];
    const statusText = { error: "Lỗi", paused: "Tạm dừng", yield: "Nhường mic cho ghi chú", listening: "Đang nghe", idle: "" }[status];
    const dot = status === "error" ? "bg-rose-500" : status === "paused" || status === "yield" ? "bg-amber-400" : "bg-emerald-400 animate-pulse";
    const tag = (lang, cls) => h("span", { className: "relative -top-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-extrabold " + cls }, lang === "vi" ? "VI" : "EN");

    if (!active) {
      return h("button", {
        onClick: start,
        title: "Phụ đề trực tiếp — nghe micro (và âm thanh máy tính), hiện chữ + bản dịch (EN → VI hoặc VI → EN)",
        className: "night-cc-btn fixed bottom-4 right-[4.75rem] z-[60] flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-extrabold tracking-wide text-slate-700 shadow-floating transition hover:border-primary hover:text-primary",
      }, "CC");
    }

    return h(React.Fragment, null,
      showWarn && h("div", { className: "fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm", onClick: () => setShowWarn(false) },
        h("div", { className: "w-full max-w-md space-y-3 rounded-3xl bg-white p-6 shadow-2xl", onClick: (e) => e.stopPropagation() },
          h("h3", { className: "text-lg font-extrabold text-slate-800" }, "⚠️ Lưu ý trước khi chia sẻ âm thanh"),
          h("p", { className: "text-sm leading-relaxed text-slate-600" }, "Hộp thoại chia sẻ màn hình sẽ hiện ra: chọn ", h("b", null, "Toàn bộ màn hình"), " và bật ", h("b", null, "Also share system audio"), " rồi bấm Chia sẻ. Trang chỉ lấy âm thanh, không ghi hình."),
          h("p", { className: "rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-semibold leading-relaxed text-rose-600" }, "Trên Mac, lần đầu dùng có thể phải cấp quyền \"Screen & System Audio Recording\" cho Chrome và Chrome sẽ tự khởi động lại. Ghi chú vẫn được lưu, nhưng bản ghi âm đang làm dở sẽ mất."),
          h("p", { className: "text-xs leading-relaxed text-slate-400" }, "Để không bị gián đoạn giữa buổi: vào System Settings → Privacy & Security → Screen & System Audio Recording, bật sẵn cho Chrome rồi mở lại Chrome một lần trước khi dạy."),
          h("button", {
            onClick: () => { try { localStorage.setItem(CC_SYS_AUDIO_WARN_KEY, "1"); } catch (e) {} setShowWarn(false); addTabAudio(); },
            className: "w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white hover:bg-amber-600",
          }, "Đã hiểu, chia sẻ âm thanh"))),
      h("div", { ref: barRef, className: "fixed bottom-0 left-0 right-0 z-[70] flex flex-col gap-1.5 border-t border-white/10 bg-slate-950/85 px-4 pb-3 pt-2 text-white shadow-[0_-4px_24px_rgba(0,0,0,0.25)] backdrop-blur-md sm:px-6" },
        h("div", { className: "flex flex-wrap items-center gap-2 sm:gap-3" },
          h("div", { className: "flex shrink-0 items-center gap-1.5" },
            h("span", { className: "h-2.5 w-2.5 rounded-full " + dot }),
            h("span", { className: "text-[11px] font-bold uppercase tracking-wide text-slate-300" }, statusText)),
          h("div", { className: "flex shrink-0 items-center rounded-full border border-white/15 bg-white/10 p-0.5", title: "Chọn chiều dịch" },
            MODES.map((m) => h("button", {
              key: m.key, onClick: () => switchMode(m.key), title: m.hint,
              className: "h-6 whitespace-nowrap rounded-full px-2.5 text-[11px] font-extrabold transition-colors " + (mode === m.key ? "bg-white text-slate-900" : "text-slate-300 hover:text-white"),
            }, m.label))),
          h("div", { className: "flex-1" }),
          h("div", { className: "flex shrink-0 items-center gap-2" },
            hasTab
              ? h("button", { onClick: stopTab, title: "Thôi nghe âm thanh máy tính", className: "flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 text-[11px] font-bold text-emerald-300" }, "🔊 ", h("span", { className: "hidden sm:inline" }, "Đang nghe máy tính"))
              : h("button", { onClick: clickTabAudio, title: "Nghe thêm âm thanh máy tính (video, nhạc, Zoom…) — cần Groq key", className: "flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-3 text-[11px] font-bold transition-colors hover:bg-white/20" }, "🔊 ", h("span", { className: "hidden sm:inline" }, "Âm thanh máy tính")),
            h("button", { onClick: stop, title: "Tắt phụ đề", className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs transition-colors hover:bg-rose-500" }, "✕"))),
        h("div", { className: "flex items-center gap-4" },
          h("div", { className: "mx-auto flex max-h-[24vh] min-w-0 max-w-4xl flex-1 flex-col justify-end gap-1.5 overflow-hidden text-left" },
            status === "error" && error
              ? h("div", { className: "space-y-2 text-center" },
                  h("p", { className: "text-sm font-bold text-rose-300 sm:text-base" }, error),
                  needKey && h("div", { className: "mx-auto flex max-w-lg gap-2" },
                    h("input", { value: keyInput, onChange: (e) => setKeyInput(e.target.value), onKeyDown: (e) => { if (e.key === "Enter") saveKey(); }, placeholder: "gsk_…", className: "min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white outline-none placeholder:text-slate-400 focus:border-white/50" }),
                    h("button", { onClick: saveKey, className: "rounded-xl bg-white px-3 py-1.5 text-sm font-bold text-slate-900 hover:bg-slate-200" }, "Lưu key")),
                  needKey && h("a", { href: "https://console.groq.com/keys", target: "_blank", rel: "noopener", className: "text-xs text-slate-400 underline" }, "Lấy key miễn phí ở console.groq.com/keys"))
              : h(React.Fragment, null,
                  lines.length === 0 && !interim && h("p", { className: "text-center text-sm " + (silenceHint ? "font-semibold text-amber-300" : "italic text-slate-400") },
                    status === "paused" ? "Đã tạm dừng — bấm nút micro để nghe tiếp, phụ đề vẫn giữ nguyên."
                      : status === "yield" ? "Ô ghi chú đang dùng micro — ghi xong phụ đề sẽ tự nghe tiếp."
                      : silenceHint || (mode === "vi" ? "Đang chờ tiếng Việt…" : "Đang chờ tiếng Anh…")),
                  lines.length > 0 && silenceHint && h("p", { className: "text-center text-xs font-semibold text-amber-300" }, silenceHint),
                  lines.map((l) => h("div", { key: l.id },
                    h("p", { className: "flex items-baseline gap-2 text-base font-bold leading-snug sm:text-lg" }, tag(l.lang, "bg-white/15 text-slate-300"), h("span", null, l.text)),
                    h("p", { className: "pl-8 text-sm font-semibold leading-snug text-orange-300 sm:text-base" }, l.tr || h("span", { className: "opacity-60" }, "đang dịch…")))),
                  interim && h("div", null,
                    h("p", { className: "flex items-baseline gap-2 text-base font-bold leading-snug text-sky-300 sm:text-lg" }, tag(mode === "vi" ? "vi" : "en", "bg-sky-400/20 text-sky-200"), h("span", null, interim)),
                    interimTr && h("p", { className: "pl-8 text-sm font-semibold leading-snug text-orange-300/80 sm:text-base" }, interimTr)))),
          h("button", {
            onClick: () => (paused ? resume() : pause()),
            title: paused ? "Nghe tiếp (bật lại micro)" : "Tạm dừng (tắt micro, giữ phụ đề đang hiện)",
            className: "flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-full shadow-lg transition-all active:scale-95 " + (paused ? "bg-emerald-500 text-white hover:bg-emerald-600" : "border border-white/20 bg-white/15 text-white hover:bg-white/25"),
          }, h("span", { className: "text-xl leading-none" }, paused ? "🎙️" : "⏸"), h("span", { className: "text-[8px] font-extrabold uppercase tracking-wide" }, paused ? "Nghe tiếp" : "Tạm dừng")))));
  }

  /* ===================== IN / LƯU PDF =====================
     Nút "🖨 In" trên thanh menu → mở màn hình soạn bản in (phiếu học tập) từ dữ liệu bài:
     • Chọn phần cần in, 1 hoặc 2 trang trên 1 mặt giấy (2 trang = A4 ngang chia đôi), cỡ chữ.
     • Từ vựng: hiện / ẩn nghĩa (để học viên tự điền), hiện / ẩn ảnh. Hiện / ẩn đáp án & câu mẫu, dòng kẻ để viết.
     • Bấm vào chữ để sửa trực tiếp; nút ✕ ở góc mỗi khối để bỏ khối đó khỏi bản in.
     • "In / Lưu PDF" mở hộp thoại in của trình duyệt — chọn máy in, hoặc "Lưu dưới dạng PDF".
     Chỉ dựng bằng DOM thường (không React) để chỉnh sửa tay không bị mất khi đổi tùy chọn. */
  const PRINT_CSS = `
  #np-root { position: fixed; inset: 0; z-index: 9999; display: flex; flex-direction: column; background: #e2e8f0; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #0f172a; }
  #np-root .np-bar { flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; padding: 10px 14px; background: #fff; border-bottom: 1px solid #cbd5e1; box-shadow: 0 4px 14px -8px rgba(15,23,42,.25); font-size: 13px; }
  #np-root .np-bar b { font-weight: 800; }
  #np-root .np-grp { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  #np-root .np-grp > span.np-lbl { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }
  #np-root .np-seg { display: inline-flex; background: #f1f5f9; border-radius: 999px; padding: 2px; }
  #np-root .np-seg button { border: 0; background: transparent; padding: 5px 11px; border-radius: 999px; font: inherit; font-size: 12px; font-weight: 700; color: #64748b; cursor: pointer; }
  #np-root .np-seg button.on { background: #fff; color: #4338ca; box-shadow: 0 1px 3px rgba(0,0,0,.15); }
  #np-root .np-chk { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer; white-space: nowrap; }
  #np-root .np-btn { border: 0; border-radius: 999px; padding: 8px 14px; font: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }
  #np-root .np-btn.main { background: #4338ca; color: #fff; box-shadow: 0 8px 20px -8px rgba(67,56,202,.7); }
  #np-root .np-btn.ghost { background: #f1f5f9; color: #334155; }
  #np-root .np-secs { display: flex; flex-wrap: wrap; gap: 4px 10px; padding: 8px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
  #np-root .np-tip { font-size: 11px; color: #64748b; padding: 6px 14px; background: #fffbeb; border-bottom: 1px solid #fde68a; }
  #np-root .np-scroll { flex: 1; overflow: auto; padding: 24px 12px 60px; }
  .np-sheet { --np-fs: 11pt; box-sizing: border-box; background: #fff; margin: 0 auto; width: 210mm; min-height: 297mm; padding: 14mm 14mm; box-shadow: 0 10px 40px -12px rgba(15,23,42,.35); font-size: var(--np-fs); line-height: 1.45; color: #0f172a; outline: none; }
  .np-sheet.two { width: 297mm; min-height: 210mm; padding: 10mm 10mm; column-count: 2; column-gap: 14mm; column-rule: 1px dashed #cbd5e1; font-size: calc(var(--np-fs) * .86); }
  .np-sheet * { box-sizing: border-box; }
  .np-sheet h1 { font-size: 1.65em; font-weight: 800; margin: .1em 0 .15em; line-height: 1.2; }
  .np-sheet h2 { font-size: 1.2em; font-weight: 800; margin: 0 0 .25em; color: #312e81; display: flex; gap: .45em; align-items: baseline; }
  .np-sheet h2 .np-num { font-size: .8em; color: #fff; background: #4338ca; border-radius: 6px; padding: 0 .4em; }
  .np-sheet h3 { font-size: 1em; font-weight: 800; margin: .7em 0 .3em; color: #334155; }
  .np-sheet p { margin: .2em 0; }
  .np-sheet ul, .np-sheet ol { margin: .2em 0 .2em 1.3em; padding: 0; }
  .np-sheet li { margin: .12em 0; }
  .np-sheet .np-head { border-bottom: 2px solid #4338ca; padding-bottom: .5em; margin-bottom: .8em; break-inside: avoid; }
  .np-sheet .np-brand { font-size: .78em; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #4338ca; }
  .np-sheet .np-meta { font-size: .85em; color: #475569; }
  .np-sheet .np-who { display: flex; gap: 1.5em; margin-top: .5em; font-size: .9em; }
  .np-sheet .np-who span { flex: 1; border-bottom: 1px dotted #94a3b8; padding-bottom: .15em; }
  .np-sheet .np-who span:first-child { flex: 2; }
  .np-sheet .np-sec { margin: 0 0 1.1em; }
  .np-sheet .np-desc { color: #475569; font-size: .9em; margin-bottom: .45em; }
  .np-sheet .np-blk { position: relative; }
  .np-sheet .np-avoid { break-inside: avoid; page-break-inside: avoid; }
  .np-sheet .np-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: .5em .7em; margin: .4em 0; }
  .np-sheet .np-box.np-avoid, .np-sheet .np-avoid .np-box { break-inside: avoid; page-break-inside: avoid; }
  .np-sheet ul { list-style: disc; } .np-sheet ol { list-style: decimal; }
  .np-sheet .np-soft { color: #64748b; font-size: .88em; }
  .np-sheet .np-ipa { color: #4338ca; font-size: .9em; }
  .np-sheet .np-tag { display: inline-block; font-size: .78em; font-weight: 800; background: #eef2ff; color: #4338ca; border-radius: 4px; padding: 0 .35em; margin-right: .3em; }
  .np-sheet table { width: 100%; border-collapse: collapse; font-size: .92em; margin: .3em 0; }
  .np-sheet th, .np-sheet td { border: 1px solid #cbd5e1; padding: .25em .4em; vertical-align: top; text-align: left; }
  .np-sheet th { background: #f1f5f9; font-weight: 800; }
  .np-sheet tr { break-inside: avoid; }
  .np-sheet .np-vgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .45em; }
  .np-sheet.two .np-vgrid { grid-template-columns: repeat(2, 1fr); }
  .np-sheet .np-v { border: 1px solid #cbd5e1; border-radius: 8px; padding: .35em .45em; display: flex; gap: .45em; align-items: flex-start; break-inside: avoid; }
  .np-sheet .np-v img { width: 3.6em; height: 3.6em; object-fit: contain; flex: none; }
  .np-sheet .np-v .np-w { font-weight: 800; line-height: 1.2; }
  .np-sheet .np-v .np-ex { font-style: italic; color: #475569; font-size: .85em; }
  .np-sheet .np-mean { color: #0369a1; font-weight: 600; font-size: .92em; }
  .np-sheet .np-blank { display: none; border-bottom: 1px solid #94a3b8; min-height: 1.3em; }
  .np-sheet.hide-mean .np-mean { display: none; }
  .np-sheet.hide-mean .np-blank { display: block; }
  .np-sheet.hide-img .np-v img { display: none; }
  .np-sheet .np-ans { color: #047857; }
  .np-sheet .np-anskey { border-top: 1px dashed #94a3b8; margin-top: .5em; padding-top: .3em; font-size: .88em; }
  .np-sheet.hide-ans .np-ans, .np-sheet.hide-ans .np-anskey { display: none; }
  .np-sheet .np-lines { display: none; }
  .np-sheet.show-lines .np-lines { display: block; }
  .np-sheet .np-lines div { border-bottom: 1px solid #cbd5e1; height: 1.75em; }
  .np-sheet .np-line { margin: .1em 0; }
  .np-sheet .np-line b.np-sp { display: inline-block; min-width: 3.2em; color: #4338ca; }
  .np-sheet .np-opts { margin: .1em 0 0 1.2em; } .np-sheet .np-opt { display: inline-block; margin-right: 1.6em; }
  .np-sheet .np-check::before { content: "☐ "; }
  .np-sheet u { text-decoration: none; background: #fde68a; border-radius: 2px; padding: 0 .05em; }
  .np-sheet .np-x { display: none; position: absolute; top: -.2em; right: -.2em; z-index: 2; width: 1.5em; height: 1.5em; border-radius: 999px; border: 0; background: #f43f5e; color: #fff; font-size: 12px; font-weight: 800; cursor: pointer; line-height: 1.5em; text-align: center; }
  .np-sheet.editing .np-blk:hover { outline: 1px dashed #a5b4fc; outline-offset: 2px; }
  .np-sheet.editing .np-blk:hover > .np-x { display: block; }
  .np-sheet .np-pb { break-before: page; }
  @media print {
    body.np-open > *:not(#np-root) { display: none !important; }
    body.np-open { padding: 0 !important; background: #fff !important; }
    #np-root { position: static !important; display: block !important; background: #fff !important; }
    #np-root .np-bar, #np-root .np-secs, #np-root .np-tip, .np-sheet .np-x { display: none !important; }
    #np-root .np-scroll { overflow: visible !important; padding: 0 !important; }
    .np-sheet, .np-sheet.two { width: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; outline: none !important; }
    .np-sheet .np-blk { outline: none !important; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }`;
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  // **đậm**, *nghiêng*, [chữ] → tô vàng (dùng cho bảng âm–chữ)
  const rh = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>").replace(/\[([^\]]+)\]/g, "<u>$1</u>");
  const blk = (inner, cls = "") => `<div class="np-blk ${cls}"><button class="np-x" contenteditable="false" title="Bỏ khối này khỏi bản in">✕</button>${inner}</div>`;
  const lines = (n) => `<div class="np-lines">${"<div></div>".repeat(n)}</div>`;
  const li = (arr, f = rh) => (arr && arr.length) ? `<ul>${arr.map((x) => `<li>${f(x)}</li>`).join("")}</ul>` : "";
  const ABC = "abcdefgh";

  function printGeneric(v, depth = 0) {
    if (v == null || depth > 5) return "";
    if (typeof v === "string") return /^(#|https?:|[\w-]+\.(webp|png|jpe?g|mp3))/.test(v) ? "" : `<p>${rh(v)}</p>`;
    if (typeof v === "number" || typeof v === "boolean") return "";
    if (Array.isArray(v)) return v.map((x) => printGeneric(x, depth + 1)).join("");
    const skip = new Set(["type", "id", "nav", "title", "desc", "ira", "img", "emoji", "ai", "mode", "talk", "target", "prep", "cols"]);
    return `<div class="np-box">${Object.entries(v).filter(([k]) => !skip.has(k)).map(([, x]) => printGeneric(x, depth + 1)).join("")}</div>`;
  }

  const PRINTERS = {
    vocab(s) {
      const groups = s.groups || [{ cards: s.cards || [] }];
      let out = groups.map((g) => blk(`${g.label ? `<h3>${rh(g.label)} <span class="np-soft">· ${g.cards.length} từ</span></h3>` : ""}<div class="np-vgrid">${g.cards.map((c) => blk(`<div class="np-v">${c.ira ? `<img src="${esc(IRA_BASE + c.ira)}" alt="">` : c.emoji ? `<span style="font-size:2em;line-height:1">${esc(c.emoji)}</span>` : ""}<div style="min-width:0;flex:1"><div class="np-w">${esc(c.word)}</div>${c.phonetic ? `<div class="np-ipa">${esc(c.phonetic)}</div>` : ""}<div class="np-mean">${rh(c.meaning)}</div><div class="np-blank"></div>${c.example ? `<div class="np-ex">${rh(c.example)}</div>` : ""}</div></div>`)).join("")}</div>`)).join("");
      if (s.note) out += blk(`<div class="np-box"><b>${rh(s.note.title)}</b>${li(s.note.rows)}</div>`);
      return out;
    },
    dialogue(s) {
      const sp = s.speakers || [];
      let out = (s.parts || []).map((p, i) => blk(`<div class="np-box">${p.heading ? `<h3 style="margin-top:0">${i + 1}. ${rh(p.heading)}</h3>` : ""}${p.text ? `<p>${rh(p.text)}</p>` : ""}${(p.lines || []).map((l) => `<p class="np-line"><b class="np-sp">${esc(l.who)}:</b> ${rh(l.line)}</p>`).join("")}${(p.vocabHighlights || []).length ? `<p class="np-soft" style="margin-top:.35em">📌 ${p.vocabHighlights.map((v) => `<b>${esc(v.word)}</b> <span class="np-ipa">${esc(v.phonetic || "")}</span> <span class="np-mean">${rh(v.meaning)}</span>`).join(" · ")}</p>` : ""}</div>`, "np-avoid")).join("");
      if (s.phrases) out += PRINTERS.phrases({ boxTitle: s.phrases.title, groups: s.phrases.groups, phrases: s.phrases.phrases });
      return out;
    },
    phrases(s) {
      const groups = s.groups || [{ phrases: s.phrases || [] }];
      return blk(`<div class="np-box">${s.boxTitle ? `<b>${rh(s.boxTitle)}</b>` : ""}${groups.map((g) => `${g.label ? `<h3>${rh(g.label)}</h3>` : ""}<ul>${(g.phrases || []).map((p) => typeof p === "string" ? `<li>${rh(p)}</li>` : `<li><b>${rh(p.phrase || p.en || "")}</b>${p.vi ? ` — ${rh(p.vi)}` : ""}${p.note ? ` <span class="np-soft">(${rh(p.note)})</span>` : ""}</li>`).join("")}</ul>`).join("")}</div>`);
    },
    grammar(s) {
      return (s.points || []).map((g, i) => blk(`<div class="np-box"><h3 style="margin-top:0">${i + 1}. ${rh(g.name)}</h3>${(g.forms || []).length ? `<table>${g.forms.map((f) => `<tr><th style="width:28%">${rh(f.label)}</th><td>${rh(f.pattern)}</td></tr>`).join("")}</table>` : ""}${(g.uses || []).length ? `<p><b>Cách dùng:</b></p>${li(g.uses)}` : ""}${(g.examples || []).length ? `<p><b>Ví dụ:</b></p><ul>${g.examples.map((e) => `<li>${rh(e.en)}${e.vi ? ` <span class="np-soft">— ${rh(e.vi)}</span>` : ""}</li>`).join("")}</ul>` : ""}${g.signals ? `<p><b>Dấu hiệu:</b> ${rh(g.signals)}</p>` : ""}${g.note ? `<p class="np-soft">💡 ${rh(g.note)}</p>` : ""}</div>`)).join("");
    },
    quiz(s) {
      const items = s.items || [];
      return items.map((q, i) => blk(`<div class="np-avoid" style="margin:.35em 0"><p><b>${i + 1}.</b> ${rh(q.q)}</p><p class="np-opts">${(q.options || []).map((o, k) => `<span class="np-opt">${ABC[k]}) ${rh(o)}</span>`).join("")}</p></div>`)).join("") +
        blk(`<div class="np-anskey"><b>Đáp án:</b> ${items.map((q, i) => `${i + 1}${ABC[q.answer] || ""}`).join(" · ")}${items.some((q) => q.explain) ? `<ol>${items.map((q) => `<li>${rh((q.options || [])[q.answer] || "")}${q.explain ? ` — <span class="np-soft">${rh(q.explain)}</span>` : ""}</li>`).join("")}</ol>` : ""}</div>`);
    },
    reflex(s) {
      return (s.questions || []).map((q, i) => blk(`<div class="np-box np-avoid"><p><b>${i + 1}. ${rh(q.q)}</b>${q.vi ? ` <span class="np-soft">(${rh(q.vi)})</span>` : ""}</p>${(q.frames || []).length ? `<p class="np-soft">Gợi ý: ${q.frames.map(rh).join(" · ")}</p>` : ""}${lines(2)}${q.sample ? `<p class="np-ans"><b>Mẫu:</b> ${rh(q.sample)}</p>` : ""}</div>`)).join("");
    },
    homework(s) {
      return blk(`<div class="np-box">${(s.tasks || []).map((t) => `<p class="np-check">${rh(typeof t === "string" ? t : t.text || t.title || "")}</p>`).join("")}</div>`);
    },
    stress(s) {
      return (s.intro ? blk(`<p>${rh(s.intro)}</p>`) : "") + blk(`<table><tr><th>Nhịp</th><th>Từ</th><th>Ghi chú</th></tr>${(s.groups || []).map((g) => `<tr><td><b>${esc(g.pattern)}</b><br><span class="np-soft">${rh(g.label)}</span></td><td>${(g.words || []).map(esc).join(" · ")}</td><td>${rh(g.tip || "")}</td></tr>`).join("")}</table>`);
    },
    phonics(s) {
      const groups = s.groups || [{ rows: s.rows || [] }];
      return (s.intro ? blk(`<p>${rh(s.intro)}</p>`) : "") + groups.map((g) => blk(`${g.label ? `<h3>${rh(g.label)}</h3>` : ""}<table><tr><th>Âm</th><th>Cách viết</th><th>Ghi chú</th></tr>${(g.rows || []).map((r) => `<tr><td class="np-ipa"><b>/${esc(r.ipa)}/</b></td><td>${(r.sp || []).map((x) => `<b>${esc(x[0])}</b>: ${rh(x[1])}`).join("<br>")}</td><td>${rh(r.tip || "")}</td></tr>`).join("")}</table>`)).join("");
    },
    vowels(s) {
      const tabs = s.tabs || [{ label: "Nguyên âm đơn", items: s.mono || [] }, { label: "Nguyên âm đôi", items: s.diph || [] }];
      let out = tabs.filter((t) => (t.items || []).length).map((t) => blk(`<h3>${rh(t.label)}</h3><table><tr><th>Âm</th><th>Từ ví dụ</th><th>Cách đọc</th><th>Thêm</th></tr>${t.items.map((x) => `<tr><td class="np-ipa"><b>/${esc(x.ipa)}/</b></td><td><b>${esc(x.job || x.word || "")}</b><br><span class="np-ipa">${esc(x.jobIpa || x.wordIpa || "")}</span></td><td>${rh(x.tip || "")}</td><td class="np-soft">${esc(x.more || "")}</td></tr>`).join("")}</table>`)).join("");
      if ((s.mistakes || []).length) out += blk(`<div class="np-box"><b>${rh(s.mistakesTitle || "Lỗi hay gặp")}</b><ul>${s.mistakes.map((m) => `<li>✗ ${rh(m.wrong)} → <span class="np-ans">${rh(m.fix)}</span></li>`).join("")}</ul></div>`);
      return out;
    },
    pairs(s) {
      return blk(`<table><tr><th>#</th><th>Từ A</th><th>Từ B</th></tr>${(s.pairs || []).map((p, i) => `<tr><td>${i + 1}</td><td><b>${esc(p.a)}</b> <span class="np-ipa">${esc(p.ai || "")}</span></td><td><b>${esc(p.b)}</b> <span class="np-ipa">${esc(p.bi || "")}</span></td></tr>`).join("")}</table>`);
    },
    cards(s) {
      return (s.intro ? blk(`<p>${rh(s.intro)}</p>`) : "") + (s.cards || []).map((c) => blk(`<div class="np-box np-avoid">${c.tag ? `<span class="np-tag">${rh(c.tag)}</span>` : ""}${c.sub ? `<span class="np-soft">${rh(c.sub)}</span>` : ""}${c.title ? `<p><b>${rh(c.title)}</b></p>` : ""}${c.body ? `<p>${rh(c.body)}</p>` : ""}${li(c.bullets)}${c.foot ? `<p class="np-soft">💡 ${rh(c.foot)}</p>` : ""}</div>`)).join("");
    },
    criteria(s) {
      return (s.items || []).map((c, i) => blk(`<div class="np-box np-avoid"><p><b>${i + 1}. ${rh(c.name)}</b> <span class="np-soft">${rh(c.en || "")}</span></p>${c.short ? `<p>${rh(c.short)}</p>` : ""}${li(c.check)}${c.band5 ? `<p><span class="np-tag">Band 5</span>${rh(c.band5)}</p>` : ""}${c.band6 ? `<p><span class="np-tag">Band 6</span>${rh(c.band6)}</p>` : ""}</div>`)).join("") + (s.note ? blk(`<p class="np-soft">💡 ${rh(s.note)}</p>`) : "");
    },
    formula(s) {
      return blk(`<div class="np-box" style="text-align:center"><b>${rh(s.formula)}</b></div>`) +
        (s.img ? blk(`<img src="${esc(s.img)}" alt="" style="max-width:100%;max-height:8cm">`) : "") +
        ((s.steps || []).length ? blk(`<table>${s.steps.map((st) => `<tr><th style="width:22%">${rh(st.tag)}</th><td><b>${rh(st.label || "")}</b>${st.text ? `<br><span class="np-soft">${rh(st.text)}</span>` : ""}</td></tr>`).join("")}</table>`) : "") +
        (s.examples || []).map((e) => blk(`<div class="np-box np-avoid np-ans"><p><b>${rh(e.q)}</b></p>${(e.parts || []).map((p) => `<p><span class="np-tag">${rh(p.tag)}</span>${rh(p.text)}</p>`).join("")}</div>`)).join("") +
        (s.note ? blk(`<p class="np-soft">💡 ${rh(s.note)}</p>`) : "");
    },
    speak(s) {
      return (s.tabs || []).map((t) => blk(`<h3>${rh(t.label)}</h3>${t.intro ? `<p class="np-soft">${rh(t.intro)}</p>` : ""}${(t.items || []).map((it, i) => it.card ? `<div class="np-box"><p><b>${rh(it.card.topic)}</b></p><p class="np-soft">You should say:</p>${li(it.card.points)}${it.card.explain ? `<p>${rh(it.card.explain)}</p>` : ""}${lines(6)}${it.sample ? `<p class="np-ans"><b>Bài mẫu:</b> ${rh(it.sample)}</p>` : ""}</div>` : `<div class="np-box np-avoid"><p><b>${i + 1}. ${rh(it.q)}</b>${it.vi ? ` <span class="np-soft">(${rh(it.vi)})</span>` : ""}</p>${(it.hints || []).length ? `<p class="np-soft">Gợi ý: ${it.hints.map(rh).join(" · ")}</p>` : ""}${lines(2)}${it.sample ? `<p class="np-ans"><b>Mẫu:</b> ${rh(it.sample)}</p>` : ""}</div>`).join("")}${(t.checklist || []).length ? `<div class="np-box"><b>Tự kiểm tra:</b>${t.checklist.map((c) => `<p class="np-check">${rh(c)}</p>`).join("")}</div>` : ""}`)).join("");
    }
  };
  PRINTERS.sounds = PRINTERS.vowels;
  PRINTERS.figure = (s) => blk(`<div class="np-box">${(s.items || []).map((f) => `<figure style="margin:.4em 0"><img src="${esc(f.src)}" alt="" style="max-width:100%;max-height:9cm">${f.caption ? `<figcaption class="np-soft">${rh(f.caption)}</figcaption>` : ""}</figure>`).join("")}${s.note ? `<p>💡 ${rh(s.note)}</p>` : ""}</div>`);
  PRINTERS.compare = (s) => (s.intro ? blk(`<p>${rh(s.intro)}</p>`) : "") + (s.items || []).map((v) => blk(`<div class="np-box np-avoid"><b>${rh(v.label)}</b><p>${rh(v.text)}</p>${v.comment ? `<p class="np-soft">💬 ${rh(v.comment)}</p>` : ""}</div>`)).join("") + (s.takeaway ? blk(`<p>💡 ${rh(s.takeaway)}</p>`) : "");
  PRINTERS.checklist = (s) => { let n = 0; return (s.groups || []).map((g) => blk(`<div class="np-box np-avoid"><b>${rh(g.label)}</b>${g.items.map((x) => `<p class="np-check">${++n}) ${rh(x)}</p>`).join("")}</div>`)).join(""); };
  PRINTERS.fill = (s) => { const items = s.items || []; return (s.intro ? blk(`<p>${rh(s.intro)}</p>`) : "") + (s.img ? blk(`<img src="${esc(s.img)}" alt="" style="max-width:100%;max-height:8cm">`) : "") + items.map((it, i) => blk(`<p class="np-avoid"><b>${i + 1}.</b> ${rh(String(it.text).replace(/\[\[(.+?)\]\]/g, "________"))}</p>`)).join("") + blk(`<div class="np-anskey"><b>Đáp án:</b> ${items.map((it, i) => `${i + 1}. ${(String(it.text).match(/\[\[(.+?)\]\]/g) || []).map((g) => esc(g.slice(2, -2).split("|")[0])).join(" / ")}`).join(" · ")}</div>`, "np-ans"); };
  PRINTERS.write = (s) => (s.tasks || []).map((t, i) => blk(`<div class="np-box"><p><b>✍️ ${i + 1}.</b> ${rh(t.prompt)}</p>${t.img ? `<img src="${esc(t.img)}" alt="" style="max-width:100%;max-height:8cm">` : ""}${t.hint ? `<p class="np-soft">${rh(t.hint)}</p>` : ""}${lines(t.lines || Math.max(4, Math.round((t.min || 60) / 12)))}</div>`) + (t.model ? blk(`<div class="np-anskey"><b>Bài mẫu:</b><p>${rh(t.model).replace(/\n/g, "<br>")}</p></div>`, "np-ans") : "")).join("");

  function buildPrintHtml(lesson, sections) {
    const head = `<div class="np-blk np-head"><button class="np-x" contenteditable="false" title="Bỏ khối này khỏi bản in">✕</button><div class="np-brand">Night IELTS · ${esc(lesson.course || "")}</div><h1>${esc(lesson.session ? lesson.session + ": " : "")}${rh(lesson.title || "")}</h1><div class="np-meta">${esc(lesson.unit || "")}${lesson.subtitle ? " — " + rh(lesson.subtitle) : ""}</div><div class="np-who"><span>Họ tên:</span><span>Lớp:</span><span>Ngày:</span></div></div>`;
    const goals = (lesson.goals || []).length ? blk(`<div class="np-box"><b>🎯 Sau buổi học, bạn sẽ:</b><ol>${lesson.goals.map((g) => `<li>${rh(g)}</li>`).join("")}</ol></div>`) : "";
    const body = sections.map((s, i) => {
      let inner = "";
      try { inner = (PRINTERS[s.type] || printGeneric)(s); } catch (e) { inner = printGeneric(s); }
      return `<section class="np-sec np-blk" data-sec="${esc(s.id)}"><button class="np-x" contenteditable="false" title="Bỏ cả phần này">✕</button><h2><span class="np-num">${String(i + 1).padStart(2, "0")}</span>${s.band8 ? "★ Band 8 · " : ""}${rh(s.title || s.nav || "")}</h2>${s.desc ? `<p class="np-desc">${rh(s.desc)}</p>` : ""}${inner}</section>`;
    }).join("");
    return head + goals + body;
  }

  const PRINT_PREF = "night-print-prefs-v1";
  function openPrintStudio(lesson) {
    if (document.getElementById("np-root")) return;
    if (!document.getElementById("np-style")) { const st = document.createElement("style"); st.id = "np-style"; st.textContent = PRINT_CSS; document.head.appendChild(st); }
    const sections = (lesson.sections || []).filter((s) => s && s.type);
    let pref = {};
    try { pref = JSON.parse(localStorage.getItem(PRINT_PREF) || "{}"); } catch (e) {}
    const opt = Object.assign({ two: false, fs: 11, mean: true, img: true, ans: false, lines: true }, pref.opt || {});
    const skipDefault = new Set(["pairs", "homework"]);
    const on = {}; sections.forEach((s) => { on[s.id] = !skipDefault.has(s.type); });
    const savePref = () => { try { localStorage.setItem(PRINT_PREF, JSON.stringify({ opt })); } catch (e) {} };

    const root = document.createElement("div");
    root.id = "np-root";
    root.innerHTML = `
      <div class="np-bar">
        <b>🖨 Bản in / PDF</b>
        <div class="np-grp"><span class="np-lbl">Mỗi mặt giấy</span><span class="np-seg" data-k="two"><button data-v="0">1 trang (A4 dọc)</button><button data-v="1">2 trang (A4 ngang)</button></span></div>
        <div class="np-grp"><span class="np-lbl">Cỡ chữ</span><span class="np-seg" data-k="fs"><button data-v="9.5">Nhỏ</button><button data-v="11">Vừa</button><button data-v="12.5">To</button></span></div>
        <div class="np-grp">
          <label class="np-chk"><input type="checkbox" data-o="mean"> Hiện nghĩa từ</label>
          <label class="np-chk"><input type="checkbox" data-o="img"> Ảnh minh họa</label>
          <label class="np-chk"><input type="checkbox" data-o="ans"> Đáp án & câu mẫu</label>
          <label class="np-chk"><input type="checkbox" data-o="lines"> Dòng kẻ để viết</label>
        </div>
        <div class="np-grp" style="margin-left:auto">
          <button class="np-btn ghost" data-act="reset" title="Bỏ mọi chỉnh sửa tay, tạo lại từ bài học">↺ Làm lại</button>
          <button class="np-btn ghost" data-act="close">Đóng</button>
          <button class="np-btn main" data-act="print">🖨 In / Lưu PDF</button>
        </div>
      </div>
      <div class="np-secs"><span class="np-lbl" style="font-weight:800;color:#64748b">PHẦN CẦN IN:</span>${sections.map((s) => `<label class="np-chk"><input type="checkbox" data-s="${esc(s.id)}"> ${esc(s.nav || s.title)}</label>`).join("")}</div>
      <div class="np-tip">✏️ Bấm vào chữ trên trang để sửa trực tiếp · rê chuột vào một khối rồi bấm <b style="color:#e11d48">✕</b> để bỏ khối đó · Muốn có file PDF: bấm "In / Lưu PDF" rồi ở mục <b>Máy in</b> chọn <b>Lưu dưới dạng PDF</b>.</div>
      <div class="np-scroll"><div class="np-sheet editing" contenteditable="true" spellcheck="false"></div><style class="np-page"></style><style class="np-hide"></style></div>`;
    document.body.appendChild(root);
    document.body.classList.add("np-open");
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const sheet = root.querySelector(".np-sheet");
    const pageStyle = root.querySelector(".np-page");
    const hideStyle = root.querySelector(".np-hide");
    const fill = () => { sheet.innerHTML = buildPrintHtml(lesson, sections); };
    const apply = () => {
      sheet.classList.toggle("two", !!opt.two);
      sheet.style.setProperty("--np-fs", opt.fs + "pt");
      sheet.classList.toggle("hide-mean", !opt.mean);
      sheet.classList.toggle("hide-img", !opt.img);
      sheet.classList.toggle("hide-ans", !opt.ans);
      sheet.classList.toggle("show-lines", !!opt.lines);
      pageStyle.textContent = `@page { size: A4 ${opt.two ? "landscape" : "portrait"}; margin: ${opt.two ? "9mm" : "12mm"}; }`;
      hideStyle.textContent = sections.filter((s) => !on[s.id]).map((s) => `.np-sheet [data-sec="${CSS.escape(s.id)}"]{display:none!important}`).join("\n");
      root.querySelectorAll(".np-seg").forEach((seg) => seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", String(seg.dataset.k === "two" ? (opt.two ? 1 : 0) : opt[seg.dataset.k]) === b.dataset.v)));
      root.querySelectorAll("[data-o]").forEach((c) => { c.checked = !!opt[c.dataset.o]; });
      root.querySelectorAll("[data-s]").forEach((c) => { c.checked = !!on[c.dataset.s]; });
    };
    const close = () => {
      root.remove();
      document.body.classList.remove("np-open");
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
    const onKey = (e) => { if (e.key === "Escape" && !sheet.contains(document.activeElement)) close(); };
    document.addEventListener("keydown", onKey);
    root.addEventListener("click", (e) => {
      const x = e.target.closest(".np-x");
      if (x) { e.preventDefault(); const b = x.parentElement; if (b) b.remove(); return; }
      const sb = e.target.closest(".np-seg button");
      if (sb) { const k = sb.parentElement.dataset.k; opt[k] = k === "two" ? sb.dataset.v === "1" : parseFloat(sb.dataset.v); apply(); savePref(); return; }
      const act = e.target.closest("[data-act]");
      if (!act) return;
      if (act.dataset.act === "close") close();
      else if (act.dataset.act === "reset") { if (confirm("Bỏ mọi chỉnh sửa tay và tạo lại bản in từ bài học?")) { fill(); apply(); } }
      else if (act.dataset.act === "print") {
        sheet.classList.remove("editing");
        const imgs = [...sheet.querySelectorAll("img")].filter((im) => !im.complete);
        Promise.race([Promise.all(imgs.map((im) => new Promise((r) => { im.onload = im.onerror = r; }))), new Promise((r) => setTimeout(r, 4000))])
          .then(() => { window.print(); sheet.classList.add("editing"); });
      }
    });
    root.addEventListener("change", (e) => {
      const t = e.target;
      if (t.dataset.o) { opt[t.dataset.o] = t.checked; apply(); savePref(); }
      else if (t.dataset.s) { on[t.dataset.s] = t.checked; apply(); }
    });
    fill();
    apply();
  }

  // Mã khóa = tên thư mục chứa trang (khoahoc/giaotiep/buoi-01.html → "giaotiep"); có thể ghi đè bằng lesson.courseKey
  function courseKeyOf(lesson) {
    if (lesson && lesson.courseKey) return lesson.courseKey;
    const parts = (location.pathname || "").split("/").filter(Boolean);
    const dir = parts.length >= 2 ? parts[parts.length - 2] : "";
    if (dir && dir !== "khoahoc") return dir;
    return lesson && /^sp6-/.test(lesson.id || "") ? "speaking6" : "giaotiep";
  }
  function LessonLink({ link, className = "", children, plain }) {
    const [ok, setOk] = useState(false);
    useEffect(() => {
      if (!link) return;
      let alive = true;
      if (location.protocol === "file:") {
        setOk(true);
        return;
      }
      fetch(link.href, { method: "HEAD", cache: "no-store" }).then((r) => {
        if (alive) setOk(r.ok);
      }).catch(() => {
      });
      return () => {
        alive = false;
      };
    }, [link && link.href]);
    if (!link || !ok) return /* @__PURE__ */ React.createElement("span", { className: "min-w-[6rem]" });
    return /* @__PURE__ */ React.createElement("a", { href: link.href, className: plain ? className : `rounded-full px-4 py-2 text-sm font-semibold ${className}` }, children);
  }
  /* ===================== CÔNG CỤ GIẢNG DẠY (nút 🎓 góc trái dưới) =====================
     ✏️ Bút vẽ đè (phím D, Z = hoàn tác) · 📽 Trình chiếu (P, ←/→) · 🙈 Che đáp án (C, N = mở câu kế tiếp) · ⏱ Đồng hồ (T)
     · Bôi đen chữ → in đậm / gạch chân / tô màu / chữ đỏ (dùng CSS Highlight API, không sửa nội dung trang).
     KHÔNG lưu gì: đóng hoặc tải lại trang là sạch, hôm sau dạy lớp khác. */
  const TeachCtx = React.createContext({ cover: false, gen: 0, all: false });
  function Cover({ children, className = "" }) {
    const { cover, gen, all } = React.useContext(TeachCtx);
    const [open, setOpen] = useState(false);
    useEffect(() => { setOpen(false); }, [gen]);
    if (!cover || open || all) return children;
    return h("div", { role: "button", tabIndex: 0, "data-night-cover": "1", title: "Bấm để mở",
      onClick: (e) => { e.stopPropagation(); setOpen(true); }, onKeyDown: (e) => { if (e.key === "Enter") setOpen(true); },
      className: `group relative min-w-0 flex-1 cursor-pointer rounded-xl ${className}` },
      h("div", { "aria-hidden": "true", className: "pointer-events-none select-none opacity-30 blur-[6px]" }, children),
      h("span", { className: "absolute inset-0 flex items-center justify-center" },
        h("span", { className: "rounded-full bg-slate-800/85 px-3 py-1 text-[11px] font-bold text-white shadow group-hover:bg-primary" }, "👆 Bấm để mở")));
  }
  function revealNextCover() {
    const els = [...document.querySelectorAll("[data-night-cover]")];
    if (!els.length) return;
    const el = els.find((x) => x.getBoundingClientRect().bottom > 70) || els[0];
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.click();
  }

  // Định dạng tạm khi bôi đen
  const HL_OK = typeof CSS !== "undefined" && !!CSS.highlights && typeof Highlight !== "undefined";
  const MARKS = [
    { k: "night-b", label: "B", title: "In đậm", cls: "font-black" },
    { k: "night-u", label: "U", title: "Gạch chân", cls: "underline decoration-rose-400 decoration-2 underline-offset-2" },
    { k: "night-hy", title: "Tô vàng", dot: "#fde047" },
    { k: "night-hg", title: "Tô xanh", dot: "#86efac" },
    { k: "night-hp", title: "Tô hồng", dot: "#f9a8d4" },
    { k: "night-red", label: "A", title: "Chữ đỏ", cls: "font-black text-rose-400" }
  ];
  const MARK_CSS = `
  ::highlight(night-b) { color: #0b1020; text-shadow: .4px 0 0 currentColor, -.4px 0 0 currentColor, 0 0 .6px currentColor; }
  ::highlight(night-u) { text-decoration-line: underline; text-decoration-color: #e11d48; text-decoration-thickness: 3px; }
  ::highlight(night-hy) { background-color: rgba(253, 224, 71, .7); }
  ::highlight(night-hg) { background-color: rgba(134, 239, 172, .75); }
  ::highlight(night-hp) { background-color: rgba(249, 168, 212, .75); }
  ::highlight(night-red) { color: #dc2626; }
  html.night-present { font-size: 18px; }
  @media (min-width: 1280px) { html.night-present { font-size: 20px; } }
  html.night-present body { padding-bottom: 5rem; }
`;
  function markRange(k, range) {
    if (!HL_OK || !range) return;
    let hl = CSS.highlights.get(k);
    if (!hl) { hl = new Highlight(); CSS.highlights.set(k, hl); }
    hl.add(range.cloneRange());
  }
  const rangesTouch = (a, b) => a.compareBoundaryPoints(Range.END_TO_START, b) < 0 && a.compareBoundaryPoints(Range.START_TO_END, b) > 0;
  function unmarkRange(range) {
    if (!HL_OK || !range) return;
    MARKS.forEach((m) => { const hl = CSS.highlights.get(m.k); if (!hl) return; [...hl].forEach((r) => { try { if (rangesTouch(r, range)) hl.delete(r); } catch (e) {} }); });
  }
  function clearMarks() { if (HL_OK) MARKS.forEach((m) => CSS.highlights.delete(m.k)); }

  // Đồng hồ
  function beep() {
    try {
      const C = window.AudioContext || window.webkitAudioContext; const ctx = new C();
      [0, 0.4, 0.8].forEach((t) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
        const t0 = ctx.currentTime + t;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
        o.start(t0); o.stop(t0 + 0.32);
      });
    } catch (e) {}
  }
  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  function TeachTimer({ onClose }) {
    const [total, setTotal] = useState(20 * 60);
    const [left, setLeft] = useState(20 * 60);
    const [run, setRun] = useState(false);
    const [big, setBig] = useState(false);
    const endAt = useRef(0);
    const leftRef = useRef(left); leftRef.current = left;
    useEffect(() => {
      if (!run) return;
      endAt.current = Date.now() + leftRef.current * 1000;
      const id = setInterval(() => {
        const l = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
        setLeft(l);
        if (l === 0) { setRun(false); beep(); }
      }, 250);
      return () => clearInterval(id);
    }, [run]);
    const preset = (m) => { setRun(false); setTotal(m * 60); setLeft(m * 60); };
    const adjust = (d) => {
      if (run) { endAt.current = Math.max(Date.now(), endAt.current + d * 60000); }
      setLeft((l) => Math.max(0, l + d * 60)); setTotal((t) => Math.max(60, t + d * 60));
    };
    const tone = left === 0 ? "text-rose-600 animate-pulse" : left <= 60 ? "text-rose-600" : left <= total * 0.2 ? "text-amber-600" : "text-slate-900";
    const bar = left <= 60 ? "bg-rose-500" : left <= total * 0.2 ? "bg-amber-500" : "bg-primary";
    const pct = total ? (left / total) * 100 : 0;
    if (big) return h("div", { className: "fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 bg-white/95 backdrop-blur", onClick: () => setBig(false) },
      h("p", { className: `font-extrabold tabular-nums leading-none ${tone}`, style: { fontSize: "min(28vw, 40vh)" } }, mmss(left)),
      h("div", { className: "h-3 w-3/4 max-w-3xl overflow-hidden rounded-full bg-slate-200" }, h("div", { className: `h-full ${bar} transition-all`, style: { width: pct + "%" } })),
      h("div", { className: "flex gap-3", onClick: (e) => e.stopPropagation() },
        h("button", { onClick: () => setRun(!run), className: "rounded-full bg-primary px-8 py-3 text-lg font-bold text-white" }, run ? "Tạm dừng" : left === 0 ? "Hết giờ" : "Bắt đầu"),
        h("button", { onClick: () => setBig(false), className: "rounded-full bg-slate-100 px-6 py-3 text-lg font-bold text-slate-600" }, "Thu nhỏ")));
    return h("div", { className: "fixed right-3 top-14 z-[56] w-60 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-floating backdrop-blur" },
      h("div", { className: "flex items-center justify-between" },
        h("span", { className: "text-[11px] font-bold uppercase tracking-wider text-slate-400" }, "⏱ Đồng hồ"),
        h("button", { onClick: onClose, className: "rounded-full px-2 text-slate-400 hover:bg-slate-100", "aria-label": "Đóng đồng hồ" }, "✕")),
      h("button", { onClick: () => setBig(true), title: "Phóng to", className: `mt-1 block w-full text-center text-5xl font-extrabold tabular-nums ${tone}` }, mmss(left)),
      h("div", { className: "mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" }, h("div", { className: `h-full ${bar} transition-all`, style: { width: pct + "%" } })),
      h("div", { className: "mt-3 grid grid-cols-6 gap-1" }, [1, 2, 5, 10, 20, 40].map((m) => h("button", { key: m, onClick: () => preset(m), className: `rounded-lg py-1 text-xs font-bold ${total === m * 60 ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-primary-light"}` }, m, "'"))),
      h("div", { className: "mt-2 flex items-center gap-1" },
        h("button", { onClick: () => adjust(-1), className: "rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-bold text-slate-600" }, "−1'"),
        h("button", { onClick: () => setRun(!run), disabled: left === 0 && !run, className: "flex-1 rounded-lg bg-primary py-1.5 text-sm font-bold text-white disabled:opacity-50" }, run ? "Tạm dừng" : "Bắt đầu"),
        h("button", { onClick: () => adjust(1), className: "rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-bold text-slate-600" }, "+1'"),
        h("button", { onClick: () => { setRun(false); setLeft(total); }, title: "Đặt lại", className: "rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-bold text-slate-600" }, "↺")));
  }

  // Bút vẽ đè: nét lưu theo toạ độ trang nên cuộn trang thì nét đi theo nội dung
  const PEN = { red: "#e11d48", blue: "#2563eb", green: "#16a34a", black: "#0f172a" };
  function DrawLayer({ on, tool, color, pageKey, cmd }) {
    const cv = useRef(null), store = useRef({}), cur = useRef(null), raf = useRef(0);
    const list = () => (store.current[pageKey] = store.current[pageKey] || []);
    const redraw = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const c = cv.current; if (!c) return;
        const dpr = window.devicePixelRatio || 1, w = window.innerWidth, hh = window.innerHeight;
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(hh * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(hh * dpr); }
        const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, hh);
        const sx = window.scrollX, sy = window.scrollY;
        (cur.current ? [...list(), cur.current] : list()).forEach((s) => {
          g.save(); g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = s.color; g.lineWidth = s.w; g.globalAlpha = s.a;
          if (s.hl) g.globalCompositeOperation = "multiply";
          g.beginPath();
          s.pts.forEach((p, i) => (i ? g.lineTo(p[0] - sx, p[1] - sy) : g.moveTo(p[0] - sx, p[1] - sy)));
          if (s.pts.length === 1) g.lineTo(s.pts[0][0] - sx + 0.1, s.pts[0][1] - sy);
          g.stroke(); g.restore();
        });
      });
    };
    useEffect(() => {
      window.addEventListener("scroll", redraw, { passive: true }); window.addEventListener("resize", redraw);
      redraw();
      return () => { window.removeEventListener("scroll", redraw); window.removeEventListener("resize", redraw); };
    }, [pageKey]);
    useEffect(() => {
      if (!cmd) return;
      if (cmd.t === "undo") list().pop();
      if (cmd.t === "clear") store.current[pageKey] = [];
      if (cmd.t === "clearAll") store.current = {};
      redraw();
    }, [cmd]);
    const pt = (e) => [e.clientX + window.scrollX, e.clientY + window.scrollY];
    const erase = (p) => { store.current[pageKey] = list().filter((s) => !s.pts.some((q) => Math.abs(q[0] - p[0]) < 16 && Math.abs(q[1] - p[1]) < 16)); redraw(); };
    const down = (e) => {
      if (!on) return; e.preventDefault();
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
      const p = pt(e);
      if (tool === "erase") { cur.current = { erasing: true }; erase(p); return; }
      const hl = tool === "hl";
      cur.current = { pts: [p], color: hl ? "#facc15" : PEN[color] || PEN.red, w: hl ? 22 : 3.5, a: hl ? 0.4 : 1, hl };
      redraw();
    };
    const move = (e) => {
      if (!on || !cur.current) return;
      const p = pt(e);
      if (cur.current.erasing) { erase(p); return; }
      cur.current.pts.push(p); redraw();
    };
    const up = () => { if (cur.current && !cur.current.erasing && cur.current.pts) list().push(cur.current); cur.current = null; redraw(); };
    return h("canvas", { ref: cv, onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up,
      style: { position: "fixed", inset: 0, width: "100vw", height: "100vh", zIndex: 45, pointerEvents: on ? "auto" : "none", touchAction: on ? "none" : "auto", cursor: on ? (tool === "erase" ? "cell" : "crosshair") : "default" } });
  }

  // Thanh công cụ giảng dạy
  function TeachBar({ t, set, present, onPresent, onClearAll, hasMarks }) {
    const btn = (active, onClick, icon, label, key, extra = "") => h("button", { onClick, title: `${label} (phím ${key})`,
      className: `flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-semibold transition ${active ? "bg-primary text-white shadow-premium" : "bg-white text-slate-700 hover:bg-primary-light"} ${extra}` },
      h("span", { className: "w-5 text-center" }, icon), h("span", { className: "flex-1" }, label), h("kbd", { className: `rounded px-1.5 text-[10px] font-bold ${active ? "bg-white/20" : "bg-slate-100 text-slate-400"}` }, key));
    return h("div", { className: "fixed z-[57] flex flex-col items-start gap-2", style: { left: "max(12px, env(safe-area-inset-left, 0px))", bottom: "calc(16px + env(safe-area-inset-bottom, 0px))" } },
      t.open && h("div", { className: "w-60 space-y-1.5 rounded-3xl border border-slate-200 bg-slate-50/95 p-2.5 shadow-floating backdrop-blur" },
        h("p", { className: "px-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400" }, "Công cụ giảng dạy"),
        btn(t.draw, () => set({ draw: !t.draw }), "✏️", "Bút vẽ", "D"),
        t.draw && h("div", { className: "flex flex-wrap items-center gap-1.5 rounded-2xl bg-white p-2" },
          Object.entries(PEN).map(([k, c]) => h("button", { key: k, onClick: () => set({ tool: "pen", color: k }), "aria-label": "Bút " + k,
            className: `h-7 w-7 rounded-full ring-offset-2 ${t.tool === "pen" && t.color === k ? "ring-2 ring-slate-500" : ""}`, style: { background: c } })),
          h("button", { onClick: () => set({ tool: "hl" }), title: "Bút dạ quang", className: `h-7 rounded-full px-2 text-xs font-bold ${t.tool === "hl" ? "bg-yellow-300 ring-2 ring-slate-500 ring-offset-2" : "bg-yellow-200"}` }, "🖍"),
          h("button", { onClick: () => set({ tool: "erase" }), title: "Tẩy (quẹt lên nét)", className: `h-7 rounded-full px-2 text-xs font-bold ${t.tool === "erase" ? "bg-slate-700 text-white" : "bg-slate-100"}` }, "🧽"),
          h("button", { onClick: () => set({ cmd: { t: "undo", n: Date.now() } }), title: "Hoàn tác (Z)", className: "h-7 rounded-full bg-slate-100 px-2 text-xs font-bold" }, "↶"),
          h("button", { onClick: () => set({ cmd: { t: "clear", n: Date.now() } }), title: "Xoá nét vẽ ở trang này", className: "h-7 rounded-full bg-slate-100 px-2 text-xs font-bold text-rose-600" }, "Xoá")),
        btn(present, onPresent, "📽", present ? "Thoát trình chiếu" : "Trình chiếu", "P"),
        btn(t.cover, () => set(t.cover ? { cover: false } : { cover: true, gen: t.gen + 1, all: false }), "🙈", "Che đáp án", "C"),
        t.cover && h("div", { className: "flex gap-1.5 px-1" },
          h("button", { onClick: revealNextCover, className: "flex-1 rounded-xl bg-white py-1.5 text-xs font-bold text-primary" }, "Mở câu kế (N)"),
          h("button", { onClick: () => set({ all: true }), className: "flex-1 rounded-xl bg-white py-1.5 text-xs font-bold text-slate-600" }, "Mở hết"),
          h("button", { onClick: () => set({ gen: t.gen + 1, all: false }), className: "rounded-xl bg-white px-2 py-1.5 text-xs font-bold text-slate-600", title: "Che lại tất cả" }, "↺")),
        btn(t.timer, () => set({ timer: !t.timer }), "⏱", "Đồng hồ", "T"),
        h("button", { onClick: onClearAll, className: "w-full rounded-2xl px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50" }, "🧹 Xoá hết đánh dấu & nét vẽ"),
        h("p", { className: "px-2 pb-1 text-[10px] leading-relaxed text-slate-400" }, HL_OK ? "Bôi đen chữ để in đậm, gạch chân, tô màu. " : "", "Không lưu gì: đóng trang là sạch.")),
      h("button", { onClick: () => set({ open: !t.open }), title: "Công cụ giảng dạy", "aria-label": "Công cụ giảng dạy",
        className: `flex h-12 w-12 items-center justify-center rounded-full text-xl shadow-premium transition ${t.open || t.draw || t.cover || present ? "bg-primary text-white" : "bg-white text-primary hover:bg-primary-light"}` }, "🎓"));
  }
  /* ===================== KHUNG TRANG (phong cách bento: viền tối, thẻ tím / cam) ===================== */
  function NvTopBar({ lesson, sections, navClick, accent, changeAccent, active }) {
    const ref = useRef(null);
    useEffect(() => {
      const c = ref.current; const a = c && c.querySelector('[data-active="1"]');
      if (a) c.scrollTo({ left: a.offsetLeft - c.clientWidth / 2 + a.offsetWidth / 2, behavior: "smooth" });
    }, [active]);
    return h("div", { className: "sticky top-1.5 z-40 rounded-[22px] bg-ink px-2 py-2 sm:top-2 sm:rounded-[34px] sm:px-3 sm:py-2.5" },
      h("div", { className: "flex items-center gap-2 sm:gap-3" },
        h("a", { href: lesson.roadmap || `../${courseKeyOf(lesson)}.html`, title: "Lộ trình khóa học", className: "flex shrink-0 items-center gap-2.5" },
          h("span", { className: "flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg ring-4 ring-white/10 sm:h-12 sm:w-12 sm:text-xl" }, "🌙"),
          h("span", { className: "hidden leading-tight lg:block" },
            h("b", { className: "block text-base font-extrabold text-white" }, "Night IELTS"),
            h("span", { className: "block max-w-[10rem] truncate text-[11px] font-medium text-white/45" }, lesson.course))),
        h("div", { ref, className: "nv-noscroll relative flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-full bg-black/35 p-1" },
          sections.map((s) => {
            const on = active === s.id;
            return h("a", { key: s.id, href: `#${s.id}`, onClick: navClick(s), "data-active": on ? "1" : "0",
              className: `flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition ${on ? (s.band8 ? "bg-amber-400 text-ink" : "bg-white text-ink shadow") : s.band8 ? "text-amber-300/80 hover:text-amber-200" : "text-white/55 hover:text-white"}` },
              on && h("span", { className: `h-2 w-2 rounded-full ${s.band8 ? "bg-ink" : "bg-primary"}` }), s.band8 ? "★ " : "", s.nav || s.title);
          })),
        h("button", { onClick: () => openPrintStudio(lesson), title: "In phiếu học tập / Lưu PDF", className: "flex h-10 shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/20" }, "🖨", h("span", { className: "hidden sm:inline" }, " In / PDF")),
        h("div", { className: "flex shrink-0 items-center rounded-full bg-white/10 p-1" }, [["en-GB", "UK"], ["en-US", "US"]].map(([k, l]) => h("button", { key: k, onClick: () => changeAccent(k), className: `rounded-full px-2.5 py-1.5 text-[11px] font-extrabold transition ${accent === k ? "bg-primary text-white" : "text-white/50 hover:text-white"}` }, l)))));
  }
  function NvStat({ label, value, icon, tone }) {
    const T = tone === "peach" ? ["border-peach bg-peach-light", "bg-peach/25 text-peach-dark"] : ["border-primary bg-primary-light", "bg-primary/20 text-primary"];
    return h("div", { className: `relative overflow-hidden rounded-[26px] border-2 p-4 pl-16 ${T[0]}` },
      h("span", { className: `absolute left-0 top-0 flex h-14 w-14 items-center justify-center rounded-br-[22px] text-xl ${T[1]}` }, icon),
      h("p", { className: "text-xs font-bold text-slate-500" }, label),
      h("p", { className: "mt-1 text-4xl font-extrabold leading-none tracking-tight text-ink" }, value));
  }
  function NvHero({ lesson, sections, b8count, firstId, present }) {
    const nMain = sections.length - b8count;
    const NV_DEFAULT_STICKER = { writing: "book_sakubun_kodomo_girl.webp", giaotiep: "kaisya_kaiwa_communication_6867.webp", speaking6: "speech_woman_1523.webp" };
    const sticker = lesson.heroSticker || (lesson.band8 && lesson.band8.sticker) || (sections.find((x) => x.sticker && !x.band8) || {}).sticker || NV_DEFAULT_STICKER[courseKeyOf(lesson)] || "book_2458.webp";
    const goals = lesson.goals || [];
    const NUM = ["bg-peach text-white", "bg-primary text-white", "bg-ink text-white", "bg-amber-300 text-ink"];
    return h("header", { className: "grid gap-4 lg:grid-cols-12" },
      h("div", { className: `relative flex flex-col overflow-hidden rounded-[30px] bg-primary p-6 text-white sm:p-8 ${goals.length ? "lg:col-span-7" : "lg:col-span-12"}` },
        h("span", { "aria-hidden": "true", className: "pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-white/10" }),
        ["top-6 right-1/3", "top-1/2 right-8", "bottom-8 right-1/4", "top-10 right-10"].map((pos, i) => h("span", { key: i, "aria-hidden": "true", className: `pointer-events-none absolute hidden sm:block ${pos} text-${i % 2 ? "amber-200" : "white/60"} text-lg` }, i % 2 ? "★" : "✦")),
        h("div", { className: `relative z-10 ${sticker ? "sm:pr-40" : ""}` },
          h("div", { className: "flex flex-wrap gap-2 text-[11px] font-bold" },
            lesson.session && h("span", { className: "rounded-full bg-ink px-3 py-1 text-white" }, lesson.session),
            lesson.course && h("span", { className: "rounded-full bg-white/20 px-3 py-1" }, lesson.course)),
          h("h1", { className: "mt-4 text-[1.9rem] font-extrabold leading-[1.12] tracking-tight sm:text-[2.6rem]" }, lesson.title),
          lesson.subtitle && h("p", { className: "mt-3 text-sm leading-relaxed text-white/85 sm:text-base" }, lesson.subtitle),
          lesson.unit && h("p", { className: "mt-3 text-xs font-semibold text-amber-200" }, "📖 ", lesson.unit)),
        h("div", { className: "relative z-10 mt-auto flex items-end justify-between gap-4 pt-6" },
          !present && firstId ? h("a", { href: "#" + firstId, "aria-label": "Vào bài", className: "nv-go relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink text-2xl text-white transition hover:scale-105" }, "→") : h("span"),
          sticker && h(Sticker, { ira: sticker, className: "nv-float -mb-3 -mr-2 h-32 w-32 sm:absolute sm:-bottom-4 sm:right-0 sm:mb-0 sm:h-44 sm:w-44" }))),
      goals.length > 0 && h("div", { className: "flex flex-col gap-4 lg:col-span-5" },
        h("div", { className: "grid grid-cols-2 gap-3 sm:gap-4" },
          h(NvStat, { label: "Phần học", value: nMain, icon: "📚", tone: "peach" }),
          h(NvStat, { label: b8count ? "Phần Band 8" : "Mục tiêu", value: b8count || goals.length, icon: b8count ? "★" : "🎯", tone: "lilac" })),
        h("div", { className: "flex-1 rounded-[30px] bg-panel p-4 sm:p-5" },
          h("p", { className: "mb-3 flex items-center gap-2 text-lg font-extrabold tracking-tight text-ink" }, "Sau buổi học, bạn sẽ ", h("span", { "aria-hidden": "true" }, "🎯")),
          h("ul", { className: "space-y-2" }, goals.map((g, i) => h("li", { key: i, className: "flex items-start gap-3 rounded-2xl bg-white p-3 text-sm leading-relaxed text-slate-600 shadow-sm" },
            h("span", { className: `flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${NUM[i % 4]}` }, i + 1),
            h("span", { className: "min-w-0 pt-0.5" }, rich(g))))),
          !TTS_OK && h("p", { className: "mt-3 text-xs text-rose-500" }, "Trình duyệt này chưa hỗ trợ giọng đọc — các nút 🔊 sẽ không hoạt động."))));
  }
  function NvFooter({ lesson }) {
    return h("footer", { className: "mt-16" },
      h("div", { className: "grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-4" },
        lesson.prev ? h(LessonLink, { link: lesson.prev, plain: true, className: "flex items-center gap-4 rounded-[28px] bg-primary-light p-4 text-ink transition hover:-translate-y-0.5 sm:p-5" },
          h("span", { className: "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-xl text-primary shadow-sm" }, "←"),
          h("span", { className: "min-w-0" }, h("span", { className: "block text-[11px] font-bold uppercase tracking-widest text-primary" }, "Buổi trước"), h("b", { className: "block truncate text-lg font-extrabold" }, lesson.prev.label))) : h("span"),
        h("a", { href: lesson.roadmap || `../${courseKeyOf(lesson)}.html`, className: "flex items-center justify-center gap-2 rounded-[28px] bg-panel px-6 py-4 text-sm font-extrabold text-slate-600 transition hover:bg-slate-200" }, "☰ Lộ trình"),
        lesson.next ? h(LessonLink, { link: lesson.next, plain: true, className: "nv-next relative flex items-center justify-between gap-4 overflow-hidden rounded-[28px] bg-ink p-4 text-white transition hover:-translate-y-0.5 sm:p-5" },
          h("span", { "aria-hidden": "true", className: "pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full border-[18px] border-white/5" }),
          h("span", { className: "relative min-w-0" }, h("span", { className: "block text-[11px] font-bold uppercase tracking-widest text-peach" }, "Buổi tiếp theo"), h("b", { className: "block truncate text-lg font-extrabold" }, lesson.next.label)),
          h("span", { className: "nv-arrow relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-xl text-ink ring-4 ring-peach transition" }, "→")) : h("span")),
      h("p", { className: "mt-6 text-center text-[11px] text-slate-400" }, "Night IELTS · by Mr. Night"));
  }
  function LessonApp({ lesson }) {
    const readingRef = useRef(null);
    const [accent, setAccent] = useState(ACCENT);
    const changeAccent = (a) => { ACCENT = a; setAccent(a); };
    const sections = lesson.sections || [];
    const B8KEY = `night-${courseKeyOf(lesson)}-${lesson.id}-band8`;
    const [b8open, setB8open] = useState(() => lsGet(B8KEY, false) || /^#b8-|^#band8$/.test(location.hash) || sections.some((x) => x.band8 && location.hash === "#" + x.id));
    const setB8 = (v) => { setB8open(v); lsSet(B8KEY, v); };
    const navClick = (s) => (e) => { if (s.band8 && !b8open) { e.preventDefault(); setB8(true); setTimeout(() => { const el = document.getElementById(s.id); if (el) el.scrollIntoView({ behavior: "smooth" }); }, 60); } };

    // Công cụ giảng dạy — chỉ giữ trong bộ nhớ, không lưu
    const [t, setT] = useState({ open: false, draw: false, tool: "pen", color: "red", cover: false, gen: 0, all: false, timer: false, cmd: null });
    const set = (patch) => setT((o) => ({ ...o, ...patch }));
    const [present, setPresent] = useState(false);
    const [slide, setSlide] = useState(0);

    // Danh sách "trang" theo đúng thứ tự hiển thị: tiêu đề, các phần, cổng Band 8, các phần Band 8 (nếu đã mở)
    const items = [];
    let gateDone = false;
    const b8count = sections.filter((x) => x.band8).length;
    sections.forEach((s, i) => {
      if (s.band8 && !gateDone) { gateDone = true; items.push({ k: "gate", label: "Band 8" }); }
      if (s.band8 && !b8open) return;
      items.push({ k: "sec", s, i, label: s.nav || s.title });
    });
    const slides = [{ k: "title", label: lesson.title }, ...items];
    const cur = Math.min(slide, slides.length - 1);
    const go = (d) => setSlide((x) => Math.max(0, Math.min(slides.length - 1, Math.min(x, slides.length - 1) + d)));
    const togglePresent = () => {
      setPresent((p) => {
        const np = !p;
        if (np) {
          // bắt đầu từ phần đang xem
          const ids = slides.map((x) => (x.k === "sec" ? x.s.id : x.k === "gate" ? "band8" : null));
          let start = 0;
          ids.forEach((id, k) => { const el = id && document.getElementById(id); if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) start = k; });
          setSlide(start);
        }
        return np;
      });
    };
    useEffect(() => {
      document.documentElement.classList.toggle("night-present", present);
      window.scrollTo(0, 0);
      if (!present && document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) {} }
    }, [present]);
    useEffect(() => { if (present) window.scrollTo(0, 0); }, [cur, present]);
    const fullscreen = () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (e) {} };
    const clearAll = () => { clearMarks(); set({ cmd: { t: "clearAll", n: Date.now() } }); };

    // Phím tắt (bỏ qua khi đang gõ chữ)
    const keyRef = useRef(null);
    keyRef.current = (e) => {
      const tg = e.target;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
      const k = e.key;
      if (k === "d" || k === "D") set({ draw: !t.draw });
      else if (k === "p" || k === "P") togglePresent();
      else if (k === "c" || k === "C") set(t.cover ? { cover: false } : { cover: true, gen: t.gen + 1, all: false });
      else if ((k === "n" || k === "N") && t.cover) revealNextCover();
      else if (k === "t" || k === "T") set({ timer: !t.timer });
      else if ((k === "z" || k === "Z") && t.draw) set({ cmd: { t: "undo", n: Date.now() } });
      else if (k === "Escape") { if (t.draw) set({ draw: false }); else if (present) setPresent(false); }
      else if (present && (k === "ArrowRight" || k === "PageDown")) { e.preventDefault(); go(1); }
      else if (present && (k === "ArrowLeft" || k === "PageUp")) { e.preventDefault(); go(-1); }
      else return;
    };
    useEffect(() => { const f = (e) => keyRef.current(e); window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, []);

    const renderItem = (it) => it.k === "gate"
      ? h(Band8Gate, { key: "band8-gate", open: b8open, onToggle: () => setB8(!b8open), info: lesson.band8, count: b8count })
      : h(Section, { key: it.s.id, id: it.s.id, step: String(it.i + 1).padStart(2, "0"), title: it.s.title, desc: it.s.desc, sticker: it.s.sticker, band8: it.s.band8 }, h(SectionBody, { s: it.s, lesson }));
    const showTitle = !present || slides[cur].k === "title";
    const [active, setActive] = useState(null);
    useEffect(() => {
      if (present || typeof IntersectionObserver === "undefined") return;
      const io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }), { rootMargin: "-25% 0px -65% 0px" });
      sections.forEach((s) => { const el = document.getElementById(s.id); if (el) io.observe(el); });
      return () => io.disconnect();
    }, [present, b8open, sections.length]);
    const firstSec = items.find((x) => x.k === "sec");

    return h(TeachCtx.Provider, { value: { cover: t.cover, gen: t.gen, all: t.all } },
      h("div", { className: `relative min-h-screen pb-24 ${present ? "" : "px-1.5 pt-1.5 sm:px-4 sm:pt-4 lg:px-6 lg:pt-6"}` },
        h("div", { className: present ? "" : "mx-auto max-w-6xl rounded-[28px] bg-ink p-1.5 shadow-2xl sm:rounded-[44px] sm:p-2.5" },
          !present && h(NvTopBar, { lesson, sections, navClick, accent, changeAccent, active }),
          h("div", { className: present ? "" : "mt-1.5 rounded-[22px] bg-white px-3 pb-10 pt-4 sm:mt-2.5 sm:rounded-[36px] sm:px-8 sm:pt-8" },
            showTitle && h("div", { className: present ? "mx-auto max-w-5xl px-4 pt-12" : "" }, h(NvHero, { lesson, sections, b8count, firstId: firstSec && firstSec.s.id, present })),
            h("main", { ref: readingRef, className: `mx-auto max-w-5xl space-y-12 ${present ? "mt-10 px-4" : "mt-10 sm:mt-14"}` },
              present ? (slides[cur].k === "title" ? null : renderItem(slides[cur])) : items.map(renderItem)),
            !present && h(NvFooter, { lesson }))),
        h(SelectionTranslateTooltip, { containerRef: readingRef }),
        h(NotesLayer, { lessonId: lesson.id }),
        h(LiveCaptions, null),
        present && h("div", { className: "fixed inset-x-0 z-[50] flex justify-center px-20", style: { bottom: "calc(16px + env(safe-area-inset-bottom, 0px))" } },
          h("div", { className: "flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1.5 shadow-floating backdrop-blur" },
            h("button", { onClick: () => go(-1), disabled: cur === 0, "aria-label": "Phần trước", className: "rounded-full px-4 py-2 text-lg font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30" }, "←"),
            h("span", { className: "min-w-0 truncate px-2 text-xs font-semibold text-slate-500" }, h("b", { className: "text-primary" }, cur + 1, " / ", slides.length), " · ", slides[cur].label),
            h("button", { onClick: () => go(1), disabled: cur === slides.length - 1, "aria-label": "Phần sau", className: "rounded-full bg-primary px-4 py-2 text-lg font-bold text-white disabled:opacity-30" }, "→"),
            h("button", { onClick: fullscreen, title: "Toàn màn hình", className: "hidden rounded-full px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 sm:block" }, "⛶"),
            h("button", { onClick: () => setPresent(false), title: "Thoát trình chiếu (Esc)", className: "rounded-full px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100" }, "✕"))),
        h(DrawLayer, { on: t.draw, tool: t.tool, color: t.color, pageKey: present ? "slide-" + cur : "page", cmd: t.cmd }),
        t.timer && h(TeachTimer, { onClose: () => set({ timer: false }) }),
        h(TeachBar, { t, set, present, onPresent: togglePresent, onClearAll: clearAll })));
  }
  const ENGINE_CSS = `
  body { font-family: 'Plus Jakarta Sans', sans-serif; }
  html:not(.night-present) body { background-color: #B9BCF4; background-image: repeating-linear-gradient(118deg, rgba(255,255,255,.16) 0 140px, rgba(255,255,255,0) 140px 320px), linear-gradient(160deg, #CDD0FA 0%, #A7AAF0 60%, #9599EA 100%); min-height: 100vh; }
  html.night-present body { background: #fff; }
  .nv-noscroll { scrollbar-width: none; } .nv-noscroll::-webkit-scrollbar { display: none; }
  @keyframes nvFloat { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-10px) rotate(3deg); } }
  .nv-float { animation: nvFloat 5s ease-in-out infinite; }
  .nv-go { box-shadow: 0 0 0 6px rgba(255,255,255,.18); }
  .nv-go:after { content: ""; position: absolute; inset: -10px; border-radius: 999px; border: 3px solid transparent; border-top-color: #fff; border-left-color: rgba(255,255,255,.6); transform: rotate(-30deg); }
  .nv-next:hover .nv-arrow { transform: translateX(4px); }
  .perspective-1000 { perspective: 1000px; }
  .transform-style-3d { transform-style: preserve-3d; }
  .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
  .rotate-y-180 { transform: rotateY(180deg); }
  .night-note-ed img { max-width: 100%; height: auto; display: inline-block; vertical-align: bottom; border-radius: 6px; cursor: pointer; }
  .flip-card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1); transform-style: preserve-3d; }
  .flip-card-front, .flip-card-back { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
  .flip-card-back { transform: rotateY(180deg); }
  html { scroll-behavior: smooth; }
  body.night-cc-on { padding-bottom: var(--night-cc-h, 170px); }
  body.night-cc-on .night-fab { bottom: calc(var(--night-cc-h, 170px) + 12px); }
`;
  if (window.tailwind) {
    window.tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"] },
          colors: {
            primary: { DEFAULT: "#6C70DC", light: "#EDEEFD", dark: "#4A4EB8" },
            ink: { DEFAULT: "#24242A", soft: "#34343C" },
            peach: { DEFAULT: "#FF9E5E", light: "#FFF1E7", dark: "#E9782F" },
            panel: "#F4F4F7",
            vocab: { bg: "#FFE3A3", front: "#FBBF24", back: "#6C70DC" }
          },
          boxShadow: {
            floating: "0 1px 2px rgba(36,36,42,.04), 0 14px 32px -16px rgba(36,36,42,.22)",
            premium: "0 10px 28px -8px rgba(108, 112, 220, 0.45)"
          },
          borderRadius: { "3xl": "1.75rem" }
        }
      }
    };
  }
  window.NightLesson = {
    render(lesson) {
      const style = document.createElement("style");
      style.textContent = ENGINE_CSS + MARK_CSS;
      document.head.appendChild(style);
      if (!document.querySelector("link[data-night-font]")) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.dataset.nightFont = "1";
        link.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
        document.head.appendChild(link);
      }
      if (lesson.title) document.title = `Night IELTS — ${lesson.session ? lesson.session + ": " : ""}${lesson.title}`;
      let root = document.getElementById("root");
      if (!root) {
        root = document.createElement("div");
        root.id = "root";
        document.body.appendChild(root);
      }
      document.body.classList.add("text-slate-800", "antialiased");
      ReactDOM.createRoot(root).render(/* @__PURE__ */ React.createElement(LessonApp, { lesson }));
    }
  };
})();
