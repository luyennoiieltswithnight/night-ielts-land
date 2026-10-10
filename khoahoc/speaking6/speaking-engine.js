/* Night IELTS · IELTS Speaking 6.0 — khung bài học dùng chung (speaking-engine.js).
   Dựa trên giaotiep-engine.js (giữ nguyên giọng đọc, dịch khi bôi đen, ô ghi chú, quiz, từ vựng...)
   + thêm: cards, criteria, formula, models, speak (bấm giờ + ghi âm + nút AI). Mỗi buổi gọi NightLesson.render({...}). */
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
  function NoteBox({ note, onChange, onDelete, ipaOn }) {
    const ref = useRef(null);
    const [focused, setFocused] = useState(false);
    useEffect(() => {
      if (ref.current) ref.current.innerHTML = note.html || "";
    }, []);
    const save = () => {
      if (ref.current) onChange(note.id, { html: ref.current.innerHTML });
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
          onChange(note.id, { size: clampN(note.size + 2, 10, 120) });
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          onChange(note.id, { size: clampN(note.size - 2, 10, 120) });
        }
      }
    };
    const onInput = () => {
      if (ipaOn) expandIpaAtCaret();
      save();
    };
    const Btn = ({ title, onClick, children, className = "" }) => /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        title,
        onMouseDown: keep,
        onClick,
        className: `flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg px-1.5 text-sm text-slate-700 hover:bg-slate-100 ${className}`
      },
      children
    );
    return /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", left: note.x, top: note.y, width: note.w, zIndex: focused ? 36 : 35 } }, focused && /* @__PURE__ */ React.createElement("div", { className: "absolute -top-11 left-0 flex flex-wrap items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-floating", style: { minWidth: "max-content" } }, /* @__PURE__ */ React.createElement(Btn, { title: "In đậm (Cmd+B)", onClick: () => cmd("bold") }, /* @__PURE__ */ React.createElement("b", null, "B")), /* @__PURE__ */ React.createElement(Btn, { title: "In nghiêng (Cmd+I)", onClick: () => cmd("italic") }, /* @__PURE__ */ React.createElement("i", { className: "font-serif" }, "I")), /* @__PURE__ */ React.createElement(Btn, { title: "Gạch chân (Cmd+U)", onClick: () => cmd("underline") }, /* @__PURE__ */ React.createElement("u", null, "U")), /* @__PURE__ */ React.createElement("span", { className: "mx-1 h-5 w-px bg-slate-200" }), NOTE_COLORS.map((c) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: c,
        type: "button",
        title: "Màu chữ",
        onMouseDown: keep,
        onClick: () => cmd("foreColor", c),
        className: "mx-0.5 h-5 w-5 rounded-full ring-2 ring-white",
        style: { background: c, boxShadow: "0 0 0 1px #cbd5e1" }
      }
    )), /* @__PURE__ */ React.createElement(Btn, { title: "Tô nền chữ (highlight)", onClick: () => cmd("hiliteColor", "#fde047") }, /* @__PURE__ */ React.createElement("span", { className: "rounded bg-yellow-300 px-1 text-xs font-bold" }, "ab")), /* @__PURE__ */ React.createElement(Btn, { title: "Bỏ định dạng", onClick: () => cmd("removeFormat") }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold" }, "T", /* @__PURE__ */ React.createElement("sub", null, "×"))), /* @__PURE__ */ React.createElement("span", { className: "mx-1 h-5 w-px bg-slate-200" }), /* @__PURE__ */ React.createElement(Btn, { title: "Giảm cỡ chữ (Cmd -)", onClick: () => onChange(note.id, { size: clampN(note.size - 2, 10, 120) }) }, "A−"), /* @__PURE__ */ React.createElement("span", { className: "w-7 text-center text-xs tabular-nums text-slate-400" }, note.size), /* @__PURE__ */ React.createElement(Btn, { title: "Tăng cỡ chữ (Cmd +)", onClick: () => onChange(note.id, { size: clampN(note.size + 2, 10, 120) }) }, "A+"), /* @__PURE__ */ React.createElement("span", { className: "mx-1 h-5 w-px bg-slate-200" }), NOTE_BGS.map((c) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: c,
        type: "button",
        title: "Màu nền ô",
        onMouseDown: keep,
        onClick: () => onChange(note.id, { bg: c }),
        className: "mx-0.5 h-5 w-5 rounded-md",
        style: { background: c, boxShadow: "0 0 0 1px #cbd5e1" }
      }
    ))), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "flex flex-col overflow-hidden rounded-2xl border-2 shadow-floating",
        style: { height: note.h, background: note.bg, borderColor: focused ? "#4338CA" : "#e2e8f0" }
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          onPointerDown: (e) => startDrag(e, "move"),
          className: "flex h-6 flex-shrink-0 cursor-move items-center justify-between bg-slate-900/5 px-2",
          style: { touchAction: "none" }
        },
        /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-bold tracking-widest text-slate-400" }, "⋮⋮ KÉO ĐỂ DI CHUYỂN"),
        /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onPointerDown: (e) => e.stopPropagation(),
            onClick: () => onDelete(note.id),
            className: "text-xs font-bold text-slate-400 hover:text-rose-500",
            title: "Xóa ô này"
          },
          "✕"
        )
      ),
      /* @__PURE__ */ React.createElement(
        "div",
        {
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
          className: "flex-1 overflow-auto px-3 py-2 leading-snug text-slate-900 outline-none",
          style: { fontSize: note.size, fontFamily: "'Plus Jakarta Sans', 'Segoe UI', 'Arial Unicode MS', sans-serif" }
        }
      )
    ), /* @__PURE__ */ React.createElement(
      "div",
      {
        onPointerDown: (e) => startDrag(e, "resize"),
        title: "Kéo để đổi kích thước",
        className: "absolute -bottom-1 -right-1 h-5 w-5 cursor-nwse-resize rounded-br-2xl",
        style: { touchAction: "none" }
      },
      /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 20 20", className: "h-5 w-5 text-slate-400" }, /* @__PURE__ */ React.createElement("path", { d: "M18 8v10H8M18 13v5h-5", stroke: "currentColor", strokeWidth: "2", fill: "none", strokeLinecap: "round" }))
    ));
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
    useEffect(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(notes));
      } catch (e) {
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
    return /* @__PURE__ */ React.createElement(React.Fragment, null, !hidden && notes.map((n) => /* @__PURE__ */ React.createElement(NoteBox, { key: n.id, note: n, onChange: update, onDelete: remove, ipaOn })), sheet && /* @__PURE__ */ React.createElement(IpaCheatSheet, { onClose: () => setSheet(false) }), /* @__PURE__ */ React.createElement("div", { className: "fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2" }, open && /* @__PURE__ */ React.createElement("div", { className: "w-60 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-floating" }, /* @__PURE__ */ React.createElement(Item, { onClick: add }, "＋ Thêm ô ghi chú"), /* @__PURE__ */ React.createElement(Item, { onClick: () => {
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
  /* ===================== SPEAKING 6.0 — các khối riêng ===================== */
  const h = React.createElement;
  const fmt = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

  // Thẻ thông tin: type "cards" — cards:[{tag, title, sub, body, bullets:[], foot}], cols
  function InfoCards({ cards = [], cols = 3, intro }) {
    const grid = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[cols] || "sm:grid-cols-2 lg:grid-cols-3";
    return h("div", null,
      intro && h("p", { className: "mb-4 rounded-3xl bg-primary-light p-4 text-sm leading-relaxed text-slate-700" }, rich(intro)),
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
  function Criteria({ items = [], note }) {
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
          h("div", { className: "rounded-2xl bg-slate-50 p-4" }, h("p", { className: "text-[11px] font-bold uppercase tracking-wide text-slate-500" }, "Band 5.0 thường là"), h("p", { className: "mt-1 text-sm leading-relaxed text-slate-700" }, rich(items[open].band5))),
          h("div", { className: "rounded-2xl bg-emerald-50 p-4" }, h("p", { className: "text-[11px] font-bold uppercase tracking-wide text-emerald-700" }, "Band 6.0 cần"), h("p", { className: "mt-1 text-sm leading-relaxed text-slate-800" }, rich(items[open].band6))))),
      note && h("p", { className: "mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800" }, "💡 ", rich(note))
    );
  }

  // Công thức trả lời: type "formula" — formula, steps:[{tag, label, text}], examples:[{q, parts:[{tag, text}]}]
  const STEP_COLORS = ["bg-cyan-100 text-cyan-800", "bg-indigo-100 text-indigo-800", "bg-amber-100 text-amber-800", "bg-emerald-100 text-emerald-800", "bg-pink-100 text-pink-800"];
  function Formula({ formula, steps = [], examples = [], note }) {
    const colorOf = (tag) => STEP_COLORS[Math.max(0, steps.findIndex((s) => s.tag === tag)) % STEP_COLORS.length];
    return h("div", { className: "space-y-5" },
      formula && h("div", { className: "rounded-3xl bg-primary p-5 text-center text-white shadow-premium" },
        h("p", { className: "text-[11px] font-bold uppercase tracking-widest text-white/70" }, "Công thức"),
        h("p", { className: "mt-1 text-lg font-extrabold sm:text-xl" }, rich(formula))),
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
          h("p", { className: "text-sm leading-relaxed text-slate-800" }, rich(p.text))))),
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
        return /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-2xl" }, /* @__PURE__ */ React.createElement(Homework, { tasks: s.tasks, storageKey: `night-speaking6-${lesson.id}-homework` }));
      case "cards":
        return h(InfoCards, { cards: s.cards, cols: s.cols, intro: s.intro });
      case "criteria":
        return h(Criteria, { items: s.items, note: s.note });
      case "formula":
        return h(Formula, { formula: s.formula, steps: s.steps, examples: s.examples, note: s.note });
      case "models":
        return h("div", { className: "mx-auto max-w-3xl" }, h(ModelAnswers, { items: s.items }));
      case "speak":
        return h(SpeakPractice, { tabs: s.tabs, lessonId: lesson.id, sectionId: s.id, lesson });
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
    return /* @__PURE__ */ React.createElement("div", { className: "relative min-h-screen pb-24" }, /* @__PURE__ */ React.createElement("nav", { className: "sticky top-0 z-40 border-b border-slate-200/70 bg-white/70 backdrop-blur-md" }, /* @__PURE__ */ React.createElement("div", { className: "mx-auto flex max-w-4xl items-center gap-2 overflow-x-auto px-4 py-2" }, sections.map((s) => /* @__PURE__ */ React.createElement("a", { key: s.id, href: `#${s.id}`, className: "flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-primary-light hover:text-primary" }, s.nav || s.title)), /* @__PURE__ */ React.createElement("div", { className: "ml-auto flex flex-shrink-0 items-center gap-1 rounded-full bg-slate-100 p-0.5" }, [["en-GB", "UK"], ["en-US", "US"]].map(([k, l]) => /* @__PURE__ */ React.createElement("button", { key: k, onClick: () => changeAccent(k), className: `rounded-full px-2.5 py-1 text-[11px] font-bold ${accent === k ? "bg-white text-primary shadow-sm" : "text-slate-400"}` }, l))))), /* @__PURE__ */ React.createElement("header", { className: "mx-auto max-w-3xl px-4 pt-10 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold uppercase tracking-widest text-primary" }, "Night IELTS"), /* @__PURE__ */ React.createElement("p", { className: "mt-3 inline-flex flex-wrap justify-center gap-2 text-[11px] font-semibold" }, /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-primary-light px-3 py-1 text-primary" }, lesson.course), /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-amber-100 px-3 py-1 text-amber-700" }, lesson.session, " · ", lesson.unit)), /* @__PURE__ */ React.createElement("h1", { className: "mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl" }, lesson.title), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-slate-500" }, lesson.subtitle)), lesson.goals && /* @__PURE__ */ React.createElement("div", { className: "mx-auto mt-8 max-w-3xl px-4" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-floating" }, /* @__PURE__ */ React.createElement("p", { className: "mb-3 text-sm font-bold text-slate-700" }, "🎯 Sau buổi học, bạn sẽ:"), /* @__PURE__ */ React.createElement("ul", { className: "space-y-2" }, lesson.goals.map((g, i) => /* @__PURE__ */ React.createElement("li", { key: i, className: "flex gap-2 text-sm text-slate-600" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-primary" }, i + 1, "."), /* @__PURE__ */ React.createElement("span", null, rich(g))))), !TTS_OK && /* @__PURE__ */ React.createElement("p", { className: "mt-3 text-xs text-rose-500" }, "Trình duyệt này chưa hỗ trợ giọng đọc — các nút 🔊 sẽ không hoạt động."))), /* @__PURE__ */ React.createElement("main", { ref: readingRef, className: "mx-auto mt-12 max-w-4xl space-y-16 px-4" }, sections.map((s, i) => /* @__PURE__ */ React.createElement(Section, { key: s.id, id: s.id, step: String(i + 1).padStart(2, "0"), title: s.title, desc: s.desc }, /* @__PURE__ */ React.createElement(SectionBody, { s, lesson })))), /* @__PURE__ */ React.createElement(SelectionTranslateTooltip, { containerRef: readingRef }), /* @__PURE__ */ React.createElement(NotesLayer, { lessonId: lesson.id }), /* @__PURE__ */ React.createElement("footer", { className: "mx-auto mt-16 max-w-3xl px-4 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "mb-6 flex flex-wrap items-center justify-between gap-3" }, /* @__PURE__ */ React.createElement(LessonLink, { link: lesson.prev, className: "bg-white text-slate-600 shadow-sm" }, "← ", lesson.prev && lesson.prev.label), /* @__PURE__ */ React.createElement("a", { href: lesson.roadmap || "../speaking6.html", className: "rounded-full px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100" }, "☰ Lộ trình"), /* @__PURE__ */ React.createElement(LessonLink, { link: lesson.next, className: "bg-primary text-white shadow-premium" }, lesson.next && lesson.next.label, " →")), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-400" }, "Night IELTS · by Mr. Night")));
  }
  const ENGINE_CSS = `
  body { font-family: 'Plus Jakarta Sans', sans-serif; }
  .perspective-1000 { perspective: 1000px; }
  .transform-style-3d { transform-style: preserve-3d; }
  .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
  .rotate-y-180 { transform: rotateY(180deg); }
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
