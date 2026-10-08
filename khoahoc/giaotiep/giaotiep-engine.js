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
      const u = new SpeechSynthesisUtterance(text);
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
    return /* @__PURE__ */ React.createElement("section", { id, className: "scroll-mt-20" }, /* @__PURE__ */ React.createElement("div", { className: "mb-5 flex items-end gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-4xl font-extrabold leading-none text-primary/15" }, step), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-extrabold text-slate-900 sm:text-2xl" }, title), desc && /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm text-slate-500" }, desc))), children);
  }
  function VowelCard({ v }) {
    const [open, setOpen] = useState(false);
    const badge = v.type === "long" ? "bg-indigo-100 text-primary" : v.type === "short" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700";
    const badgeText = v.type === "long" ? "Dài" : v.type === "short" ? "Ngắn" : "Đôi";
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        onClick: () => {
          setOpen(!open);
          speak(v.job, 0.8);
        },
        className: `cursor-pointer rounded-3xl border bg-white p-4 shadow-floating transition hover:-translate-y-0.5 ${open ? "border-primary/40" : "border-slate-200"}`
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "font-serif text-3xl font-bold text-slate-900" }, "/", v.ipa, "/"), /* @__PURE__ */ React.createElement("span", { className: `rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badge}` }, badgeText)),
      /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-base font-bold text-primary" }, v.job),
      /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400" }, v.jobIpa),
      open && /* @__PURE__ */ React.createElement("div", { className: "mt-3 border-t border-slate-100 pt-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs leading-relaxed text-slate-600" }, v.tip), /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex flex-wrap gap-1.5" }, v.more.split(" · ").map((w) => /* @__PURE__ */ React.createElement(SpeakButton, { key: w, text: w, label: w, rate: 0.8 }))))
    );
  }
  function VowelChart({ mono = [], diph = [], mistakes = [] }) {
    const [tab, setTab] = useState("mono");
    const list = tab === "mono" ? mono : diph;
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "mb-4 inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm" }, [["mono", `${mono.length} nguyên âm đơn`], ["diph", `${diph.length} nguyên âm đôi`]].map(([k, label]) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: k,
        onClick: () => setTab(k),
        className: `rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === k ? "bg-primary text-white shadow-premium" : "text-slate-500 hover:text-slate-800"}`
      },
      label
    ))), /* @__PURE__ */ React.createElement("p", { className: "mb-4 text-sm text-slate-500" }, "Chạm vào từng thẻ để nghe từ ví dụ (tên một nghề) và xem mẹo khẩu hình."), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" }, list.map((v) => /* @__PURE__ */ React.createElement(VowelCard, { key: v.ipa, v }))), mistakes.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-6 rounded-3xl border border-rose-100 bg-rose-50/60 p-5" }, /* @__PURE__ */ React.createElement("p", { className: "mb-3 text-sm font-bold text-rose-600" }, "Lỗi người Việt hay gặp"), /* @__PURE__ */ React.createElement("div", { className: "grid gap-3 sm:grid-cols-2" }, mistakes.map((m, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "rounded-2xl bg-white p-3 text-sm shadow-sm" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-slate-800" }, "✗ ", m.wrong), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-slate-600" }, "✓ ", m.fix))))));
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
  function SectionBody({ s, lesson }) {
    switch (s.type) {
      case "vowels":
        return /* @__PURE__ */ React.createElement(VowelChart, { mono: s.mono, diph: s.diph, mistakes: s.mistakes });
      case "pairs":
        return /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-xl" }, /* @__PURE__ */ React.createElement(MinimalPairQuiz, { pairs: s.pairs }));
      case "grammar":
        return /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, s.points.map((g, i) => /* @__PURE__ */ React.createElement(GrammarBlock, { key: i, index: i + 1, ...g })));
      case "quiz":
        return /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-2xl" }, /* @__PURE__ */ React.createElement(ChoiceQuiz, { items: s.items }));
      case "vocab":
        return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 justify-items-center gap-4 sm:grid-cols-3" }, s.cards.map((v) => /* @__PURE__ */ React.createElement(InteractiveVocab, { key: v.word, ...v }))), s.note && /* @__PURE__ */ React.createElement("div", { className: "mt-6 rounded-3xl border border-slate-200 bg-white p-5 text-sm shadow-floating" }, /* @__PURE__ */ React.createElement("p", { className: "mb-2 font-bold text-slate-700" }, s.note.title), /* @__PURE__ */ React.createElement("div", { className: "grid gap-2 sm:grid-cols-2" }, s.note.rows.map((r, i) => /* @__PURE__ */ React.createElement("p", { key: i }, rich(r))))));
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
  function LessonApp({ lesson }) {
    const readingRef = useRef(null);
    const [accent, setAccent] = useState(ACCENT);
    const changeAccent = (a) => {
      ACCENT = a;
      setAccent(a);
    };
    const sections = lesson.sections || [];
    return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen pb-24" }, /* @__PURE__ */ React.createElement("nav", { className: "sticky top-0 z-40 border-b border-slate-200/70 bg-white/70 backdrop-blur-md" }, /* @__PURE__ */ React.createElement("div", { className: "mx-auto flex max-w-4xl items-center gap-2 overflow-x-auto px-4 py-2" }, sections.map((s) => /* @__PURE__ */ React.createElement("a", { key: s.id, href: `#${s.id}`, className: "flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-primary-light hover:text-primary" }, s.nav || s.title)), /* @__PURE__ */ React.createElement("div", { className: "ml-auto flex flex-shrink-0 items-center gap-1 rounded-full bg-slate-100 p-0.5" }, [["en-GB", "UK"], ["en-US", "US"]].map(([k, l]) => /* @__PURE__ */ React.createElement("button", { key: k, onClick: () => changeAccent(k), className: `rounded-full px-2.5 py-1 text-[11px] font-bold ${accent === k ? "bg-white text-primary shadow-sm" : "text-slate-400"}` }, l))))), /* @__PURE__ */ React.createElement("header", { className: "mx-auto max-w-3xl px-4 pt-10 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold uppercase tracking-widest text-primary" }, "Night IELTS"), /* @__PURE__ */ React.createElement("p", { className: "mt-3 inline-flex flex-wrap justify-center gap-2 text-[11px] font-semibold" }, /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-primary-light px-3 py-1 text-primary" }, lesson.course), /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-amber-100 px-3 py-1 text-amber-700" }, lesson.session, " · ", lesson.unit)), /* @__PURE__ */ React.createElement("h1", { className: "mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl" }, lesson.title), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-slate-500" }, lesson.subtitle)), lesson.goals && /* @__PURE__ */ React.createElement("div", { className: "mx-auto mt-8 max-w-3xl px-4" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-floating" }, /* @__PURE__ */ React.createElement("p", { className: "mb-3 text-sm font-bold text-slate-700" }, "🎯 Sau buổi học, bạn sẽ:"), /* @__PURE__ */ React.createElement("ul", { className: "space-y-2" }, lesson.goals.map((g, i) => /* @__PURE__ */ React.createElement("li", { key: i, className: "flex gap-2 text-sm text-slate-600" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-primary" }, i + 1, "."), /* @__PURE__ */ React.createElement("span", null, rich(g))))), !TTS_OK && /* @__PURE__ */ React.createElement("p", { className: "mt-3 text-xs text-rose-500" }, "Trình duyệt này chưa hỗ trợ giọng đọc — các nút 🔊 sẽ không hoạt động."))), /* @__PURE__ */ React.createElement("main", { ref: readingRef, className: "mx-auto mt-12 max-w-4xl space-y-16 px-4" }, sections.map((s, i) => /* @__PURE__ */ React.createElement(Section, { key: s.id, id: s.id, step: String(i + 1).padStart(2, "0"), title: s.title, desc: s.desc }, /* @__PURE__ */ React.createElement(SectionBody, { s, lesson })))), /* @__PURE__ */ React.createElement(SelectionTranslateTooltip, { containerRef: readingRef }), /* @__PURE__ */ React.createElement("footer", { className: "mx-auto mt-16 max-w-3xl px-4 text-center" }, (lesson.prev || lesson.next) && /* @__PURE__ */ React.createElement("div", { className: "mb-6 flex justify-between gap-3" }, lesson.prev ? /* @__PURE__ */ React.createElement("a", { href: lesson.prev.href, className: "rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm" }, "← ", lesson.prev.label) : /* @__PURE__ */ React.createElement("span", null), lesson.next ? /* @__PURE__ */ React.createElement("a", { href: lesson.next.href, className: "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-premium" }, lesson.next.label, " →") : /* @__PURE__ */ React.createElement("span", null)), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-400" }, "Night IELTS · by Mr. Night")));
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
