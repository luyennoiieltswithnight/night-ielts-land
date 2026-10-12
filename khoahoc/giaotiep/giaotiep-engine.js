/* Night IELTS · Giao tiếp Thực chiến — khung bài học dùng chung (giaotiep-engine.js). Mỗi buổi gọi NightLesson.render({...}). */
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
  function InteractiveVocab({ word, phonetic, meaning, example }) {
    const [flipped, setFlipped] = useState(false);
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "perspective-1000 h-44 w-full max-w-[220px] cursor-pointer select-none",
        onClick: () => setFlipped(!flipped)
      },
      /* @__PURE__ */ React.createElement("div", { className: `flip-card-inner ${flipped ? "rotate-y-180" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "flip-card-front flex h-full flex-col items-center justify-center rounded-3xl border border-amber-200 bg-vocab-bg p-4 text-center shadow-floating" }, /* @__PURE__ */ React.createElement("p", { className: "text-lg font-bold text-slate-800" }, word), phonetic && /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm text-slate-600" }, phonetic), /* @__PURE__ */ React.createElement(SpeakButton, { text: word, className: "mt-2 bg-white/70" }), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500" }, "Chạm để xem nghĩa")), /* @__PURE__ */ React.createElement("div", { className: "flip-card-back flex h-full flex-col items-center justify-center rounded-3xl border border-sky-200 bg-vocab-back/90 p-4 text-center text-white shadow-floating" }, /* @__PURE__ */ React.createElement("p", { className: "text-base font-bold" }, meaning), example && /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-xs italic text-sky-50" }, '"', example, '"')))
    );
  }
  function ParagraphBlock({ index, heading, text, lines, speakers = [], vocabHighlights = [], inlineImage }) {
    const alignRight = index % 2 === 0;
    const fullText = lines ? lines.map((l) => l.line).join(" ") : text;
    return /* @__PURE__ */ React.createElement("div", { className: `flex flex-col gap-6 md:flex-row ${alignRight ? "md:flex-row-reverse" : ""} items-start` }, /* @__PURE__ */ React.createElement("div", { className: "w-full flex-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-floating" }, /* @__PURE__ */ React.createElement("div", { className: "mb-3 flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white" }, index), heading && /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-slate-700" }, heading), /* @__PURE__ */ React.createElement("div", { className: "h-px flex-1 bg-slate-100" }), /* @__PURE__ */ React.createElement(SpeakButton, { text: fullText, rate: 0.85, label: "Cả đoạn" })), text && /* @__PURE__ */ React.createElement("p", { className: "leading-relaxed text-slate-700" }, text), lines && /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, lines.map((l, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: `flex items-start gap-3 ${l.who === speakers[0] ? "" : "flex-row-reverse text-right"}` }, /* @__PURE__ */ React.createElement("span", { className: `mt-0.5 flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${l.who === speakers[0] ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}` }, l.who), /* @__PURE__ */ React.createElement("p", { className: "flex-1 leading-relaxed text-slate-700" }, l.line, " ", /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !TTS_OK, onClick: () => speak(l.line, 0.85), className: "text-xs text-primary/70 hover:text-primary disabled:opacity-30", "aria-label": "Nghe câu này" }, "🔊"))))), inlineImage && /* @__PURE__ */ React.createElement("figure", { className: "mt-4" }, /* @__PURE__ */ React.createElement("img", { src: inlineImage.src, alt: inlineImage.caption || "", className: "w-full rounded-2xl object-cover" }), inlineImage.caption && /* @__PURE__ */ React.createElement("figcaption", { className: "mt-2 text-center text-xs text-slate-400" }, inlineImage.caption))), vocabHighlights.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "grid w-full flex-shrink-0 grid-cols-2 gap-3 sm:flex sm:flex-wrap md:w-56" }, vocabHighlights.map((v, i) => /* @__PURE__ */ React.createElement(InteractiveVocab, { key: i, ...v }))));
  }
  function SelectionTranslateTooltip({ containerRef }) {
    const [tooltip, setTooltip] = useState(null);
    const btnRef = useRef(null);
    const readSelection = useCallback(() => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : "";
      if (!text || !containerRef.current || sel.rangeCount === 0) {
        setTooltip(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!containerRef.current.contains(range.commonAncestorContainer)) {
        setTooltip(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setTooltip(null);
        return;
      }
      setTooltip({
        top: rect.bottom + window.scrollY + 10,
        left: rect.left + window.scrollX + rect.width / 2,
        text
      });
    }, [containerRef]);
    useEffect(() => {
      const onMouseUp = () => setTimeout(readSelection, 0);
      const onTouchEnd = () => setTimeout(readSelection, 10);
      const onSelectionChange = () => {
        const sel = window.getSelection();
        if (!sel || sel.toString().trim() === "") setTooltip(null);
      };
      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("touchend", onTouchEnd);
      document.addEventListener("selectionchange", onSelectionChange);
      return () => {
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("touchend", onTouchEnd);
        document.removeEventListener("selectionchange", onSelectionChange);
      };
    }, [readSelection]);
    const openTranslate = () => {
      if (!tooltip) return;
      const url = `https://translate.google.com/?sl=auto&tl=vi&text=${encodeURIComponent(tooltip.text)}&op=translate`;
      window.open(url, "_blank", "noopener");
    };
    if (!tooltip) return null;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        ref: btnRef,
        style: { position: "absolute", top: tooltip.top, left: tooltip.left, transform: "translateX(-50%)" },
        className: "z-[60] flex flex-col items-center",
        onClick: openTranslate,
        onTouchEnd: (e) => {
          e.preventDefault();
          e.stopPropagation();
          openTranslate();
        }
      },
      /* @__PURE__ */ React.createElement("span", { className: "-mb-1 text-sm leading-none text-primary" }, "▲"),
      /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-premium" }, "Dịch")
    );
  }
  function Section({ id, step, title, desc, children }) {
    return /* @__PURE__ */ React.createElement("section", { id, className: "scroll-mt-20" }, /* @__PURE__ */ React.createElement("div", { className: "mb-5 flex items-end gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-4xl font-extrabold leading-none text-primary/15" }, step), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-extrabold text-slate-900 sm:text-2xl" }, title), desc && /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm text-slate-500" }, rich(desc)))), children);
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
    return /* @__PURE__ */ React.createElement("div", { className: "rounded-3xl border border-slate-200 bg-white p-6 shadow-floating" }, /* @__PURE__ */ React.createElement("div", { className: "mb-4 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-slate-500" }, "Hoàn thành ", done.length, "/", HOMEWORK.length), done.length === HOMEWORK.length && /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold text-emerald-600" }, "Xuất sắc! 🎉")), /* @__PURE__ */ React.createElement("ul", { className: "space-y-2" }, HOMEWORK.map((h, i) => /* @__PURE__ */ React.createElement("li", { key: i }, /* @__PURE__ */ React.createElement("label", { className: "flex cursor-pointer items-start gap-3 rounded-2xl p-2 hover:bg-slate-50" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: done.includes(i), onChange: () => toggle(i), className: "mt-1 h-4 w-4 accent-primary" }), /* @__PURE__ */ React.createElement("span", { className: `text-sm leading-relaxed ${done.includes(i) ? "text-slate-400 line-through" : "text-slate-700"}` }, h))))));
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
          recRef.current = null; setRec(null);
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
        try { r.start(); setRec("live"); } catch (e) { live.remove(); flash("Không bật được micro.", "error"); }
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
    const [notes, setNotes] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem(KEY)) || [];
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
        localStorage.setItem(KEY, JSON.stringify(notes));
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
    return /* @__PURE__ */ React.createElement(React.Fragment, null, !hidden && notes.map((n) => /* @__PURE__ */ React.createElement(NoteBox, { key: n.id, note: n, onChange: update, onDelete: remove, ipaOn })), sheet && /* @__PURE__ */ React.createElement(IpaCheatSheet, { onClose: () => setSheet(false) }), /* @__PURE__ */ React.createElement("div", { className: "fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2" }, storeFull && /* @__PURE__ */ React.createElement("p", { className: "max-w-xs rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-floating" }, "⚠️ Bộ nhớ trình duyệt đã đầy — ghi chú mới chưa được lưu. Xóa bớt ảnh hoặc thu nhỏ ảnh trong ghi chú."), open && /* @__PURE__ */ React.createElement("div", { className: "w-60 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-floating" }, /* @__PURE__ */ React.createElement(Item, { onClick: add }, "＋ Thêm ô ghi chú"), /* @__PURE__ */ React.createElement(Item, { onClick: () => {
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
  function rich(text) {
    if (!text) return null;
    const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**")) return /* @__PURE__ */ React.createElement("b", { key: i, className: "font-bold text-primary" }, p.slice(2, -2));
      if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return /* @__PURE__ */ React.createElement("i", { key: i }, p.slice(1, -1));
      return /* @__PURE__ */ React.createElement(React.Fragment, { key: i }, p);
    });
  }
  function GrammarBlock({ index, name, forms = [], uses = [], examples = [], signals, note }) {
    return /* @__PURE__ */ React.createElement("div", { className: "rounded-3xl border border-slate-200 bg-white p-6 shadow-floating" }, /* @__PURE__ */ React.createElement("div", { className: "mb-4 flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white" }, index), /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-extrabold text-slate-900" }, name)), forms.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mb-4 grid gap-2 sm:grid-cols-3" }, forms.map((f, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "rounded-2xl bg-primary-light p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wide text-primary/70" }, f.label), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm font-semibold text-slate-800" }, rich(f.pattern))))), uses.length > 0 && /* @__PURE__ */ React.createElement("ul", { className: "mb-4 space-y-1.5" }, uses.map((u, i) => /* @__PURE__ */ React.createElement("li", { key: i, className: "flex gap-2 text-sm leading-relaxed text-slate-700" }, /* @__PURE__ */ React.createElement("span", { className: "text-primary" }, "▸"), /* @__PURE__ */ React.createElement("span", null, rich(u))))), examples.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, examples.map((e, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-slate-800" }, rich(e.en)), e.vi && /* @__PURE__ */ React.createElement("p", { className: "mt-0.5 text-xs text-slate-500" }, e.vi)), /* @__PURE__ */ React.createElement(SpeakButton, { text: String(e.en).replace(/\*/g, ""), rate: 0.85 })))), signals && /* @__PURE__ */ React.createElement("p", { className: "mt-4 text-xs text-slate-500" }, /* @__PURE__ */ React.createElement("b", { className: "text-slate-700" }, "Dấu hiệu:"), " ", rich(signals)), note && /* @__PURE__ */ React.createElement("p", { className: "mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800" }, "💡 ", rich(note)));
  }
  function ChoiceQuiz({ items = [] }) {
    const [picked, setPicked] = useState({});
    const answered = Object.keys(picked).length;
    const correct = items.filter((it, i) => picked[i] === it.answer).length;
    return /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, items.map((it, i) => {
      const p = picked[i];
      return /* @__PURE__ */ React.createElement("div", { key: i, className: "rounded-3xl border border-slate-200 bg-white p-5 shadow-floating" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-slate-800" }, /* @__PURE__ */ React.createElement("span", { className: "mr-2 text-primary" }, i + 1, "."), rich(it.q)), /* @__PURE__ */ React.createElement("div", { className: "mt-3 flex flex-wrap gap-2" }, it.options.map((o, k) => {
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
        return /* @__PURE__ */ React.createElement("div", null, (s.groups || [{ cards: s.cards }]).map((g, gi) => /* @__PURE__ */ React.createElement("div", { key: gi, className: gi ? "mt-8" : "" }, g.label && /* @__PURE__ */ React.createElement("p", { className: "mb-3 flex items-center gap-2 text-sm font-bold text-slate-700" }, /* @__PURE__ */ React.createElement("span", { className: "h-2 w-2 rounded-full bg-vocab-front" }), g.label, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold text-slate-400" }, "· ", g.cards.length, " từ")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 justify-items-center gap-4 sm:grid-cols-3 md:grid-cols-4" }, g.cards.map((v) => /* @__PURE__ */ React.createElement(InteractiveVocab, { key: v.word, ...v }))))), s.note && /* @__PURE__ */ React.createElement("div", { className: "mt-6 rounded-3xl border border-slate-200 bg-white p-5 text-sm shadow-floating" }, /* @__PURE__ */ React.createElement("p", { className: "mb-2 font-bold text-slate-700" }, s.note.title), /* @__PURE__ */ React.createElement("div", { className: "grid gap-2 sm:grid-cols-2" }, s.note.rows.map((r, i) => /* @__PURE__ */ React.createElement("p", { key: i }, rich(r))))));
      case "dialogue":
        return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "space-y-8" }, s.parts.map((p, i) => /* @__PURE__ */ React.createElement(ParagraphBlock, { key: i, index: i + 1, speakers: s.speakers, ...p }))), s.phrases && /* @__PURE__ */ React.createElement("div", { className: "mt-8" }, /* @__PURE__ */ React.createElement(PhraseBox, { ...s.phrases })));
      case "phrases":
        return /* @__PURE__ */ React.createElement(PhraseBox, { title: s.boxTitle, groups: s.groups, phrases: s.phrases });
      case "reflex":
        return /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-2xl" }, /* @__PURE__ */ React.createElement(ReflexDrill, { questions: s.questions }));
      case "homework":
        return /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-2xl" }, /* @__PURE__ */ React.createElement(Homework, { tasks: s.tasks, storageKey: `night-giaotiep-${lesson.id}-homework` }));
      default:
        return null;
    }
  }
  function LessonLink({ link, className = "", children }) {
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
    return /* @__PURE__ */ React.createElement("a", { href: link.href, className: `rounded-full px-4 py-2 text-sm font-semibold ${className}` }, children);
  }
  function LessonApp({ lesson }) {
    const readingRef = useRef(null);
    const [accent, setAccent] = useState(ACCENT);
    const changeAccent = (a) => {
      ACCENT = a;
      setAccent(a);
    };
    const sections = lesson.sections || [];
    return /* @__PURE__ */ React.createElement("div", { className: "relative min-h-screen pb-24" }, /* @__PURE__ */ React.createElement("nav", { className: "sticky top-0 z-40 border-b border-slate-200/70 bg-white/70 backdrop-blur-md" }, /* @__PURE__ */ React.createElement("div", { className: "mx-auto flex max-w-4xl items-center gap-2 overflow-x-auto px-4 py-2" }, sections.map((s) => /* @__PURE__ */ React.createElement("a", { key: s.id, href: `#${s.id}`, className: "flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-primary-light hover:text-primary" }, s.nav || s.title)), /* @__PURE__ */ React.createElement("div", { className: "ml-auto flex flex-shrink-0 items-center gap-1 rounded-full bg-slate-100 p-0.5" }, [["en-GB", "UK"], ["en-US", "US"]].map(([k, l]) => /* @__PURE__ */ React.createElement("button", { key: k, onClick: () => changeAccent(k), className: `rounded-full px-2.5 py-1 text-[11px] font-bold ${accent === k ? "bg-white text-primary shadow-sm" : "text-slate-400"}` }, l))))), /* @__PURE__ */ React.createElement("header", { className: "mx-auto max-w-3xl px-4 pt-10 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold uppercase tracking-widest text-primary" }, "Night IELTS"), /* @__PURE__ */ React.createElement("p", { className: "mt-3 inline-flex flex-wrap justify-center gap-2 text-[11px] font-semibold" }, /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-primary-light px-3 py-1 text-primary" }, lesson.course), /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-amber-100 px-3 py-1 text-amber-700" }, lesson.session, " · ", lesson.unit)), /* @__PURE__ */ React.createElement("h1", { className: "mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl" }, lesson.title), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-slate-500" }, lesson.subtitle)), lesson.goals && /* @__PURE__ */ React.createElement("div", { className: "mx-auto mt-8 max-w-3xl px-4" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-floating" }, /* @__PURE__ */ React.createElement("p", { className: "mb-3 text-sm font-bold text-slate-700" }, "🎯 Sau buổi học, bạn sẽ:"), /* @__PURE__ */ React.createElement("ul", { className: "space-y-2" }, lesson.goals.map((g, i) => /* @__PURE__ */ React.createElement("li", { key: i, className: "flex gap-2 text-sm text-slate-600" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-primary" }, i + 1, "."), /* @__PURE__ */ React.createElement("span", null, rich(g))))), !TTS_OK && /* @__PURE__ */ React.createElement("p", { className: "mt-3 text-xs text-rose-500" }, "Trình duyệt này chưa hỗ trợ giọng đọc — các nút 🔊 sẽ không hoạt động."))), /* @__PURE__ */ React.createElement("main", { ref: readingRef, className: "mx-auto mt-12 max-w-4xl space-y-16 px-4" }, sections.map((s, i) => /* @__PURE__ */ React.createElement(Section, { key: s.id, id: s.id, step: String(i + 1).padStart(2, "0"), title: s.title, desc: s.desc }, /* @__PURE__ */ React.createElement(SectionBody, { s, lesson })))), /* @__PURE__ */ React.createElement(SelectionTranslateTooltip, { containerRef: readingRef }), /* @__PURE__ */ React.createElement(NotesLayer, { lessonId: lesson.id }), /* @__PURE__ */ React.createElement("footer", { className: "mx-auto mt-16 max-w-3xl px-4 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "mb-6 flex flex-wrap items-center justify-between gap-3" }, /* @__PURE__ */ React.createElement(LessonLink, { link: lesson.prev, className: "bg-white text-slate-600 shadow-sm" }, "← ", lesson.prev && lesson.prev.label), /* @__PURE__ */ React.createElement("a", { href: lesson.roadmap || "../giaotiep.html", className: "rounded-full px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100" }, "☰ Lộ trình"), /* @__PURE__ */ React.createElement(LessonLink, { link: lesson.next, className: "bg-primary text-white shadow-premium" }, lesson.next && lesson.next.label, " →")), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-400" }, "Night IELTS · by Mr. Night")));
  }
  const ENGINE_CSS = `
  body { font-family: 'Plus Jakarta Sans', sans-serif; }
  .perspective-1000 { perspective: 1000px; }
  .transform-style-3d { transform-style: preserve-3d; }
  .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
  .rotate-y-180 { transform: rotateY(180deg); }
  .night-note-ed img { max-width: 100%; height: auto; display: inline-block; vertical-align: bottom; border-radius: 6px; cursor: pointer; }
  .flip-card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1); transform-style: preserve-3d; }
  .flip-card-front, .flip-card-back { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
  .flip-card-back { transform: rotateY(180deg); }
  html { scroll-behavior: smooth; }
`;
  if (window.tailwind) {
    window.tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"] },
          colors: {
            primary: { DEFAULT: "#4338CA", light: "#EEF2FF", dark: "#312E81" },
            vocab: { bg: "#FDE68A", front: "#FBBF24", back: "#0EA5E9" }
          },
          boxShadow: {
            floating: "0 20px 45px -12px rgba(30, 41, 59, 0.25)",
            premium: "0 10px 35px -8px rgba(67, 56, 202, 0.35)"
          },
          borderRadius: { "3xl": "1.5rem" }
        }
      }
    };
  }
  window.NightLesson = {
    render(lesson) {
      const style = document.createElement("style");
      style.textContent = ENGINE_CSS;
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
      document.body.classList.add("bg-slate-50", "text-slate-800", "antialiased");
      ReactDOM.createRoot(root).render(/* @__PURE__ */ React.createElement(LessonApp, { lesson }));
    }
  };
})();
