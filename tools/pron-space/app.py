"""Night IELTS - máy chấm phát âm từng âm (phoneme).
POST /score  (multipart): audio = file ghi âm (webm/m4a/wav...), text = lời học sinh nói (bản AI nghe ra)
Trả về: điểm tổng + từng chữ + từng âm (đúng / gần đúng / sai thành âm khác / thiếu) + âm thừa.
Mô hình nhận dạng âm: facebook/wav2vec2-lv-60-espeak-cv-ft ; phiên âm chuẩn: espeak-ng (en-us)."""
import os, re, subprocess, tempfile, time, threading
from functools import lru_cache

import numpy as np
import torch
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoModelForCTC, AutoProcessor
from phonemizer.backend import EspeakBackend
from phonemizer.separator import Separator

MODEL = os.environ.get("PRON_MODEL", "facebook/wav2vec2-lv-60-espeak-cv-ft")
MAX_SEC = 150
torch.set_num_threads(int(os.environ.get("THREADS", "2")))  # máy free 2 nhân: đặt nhiều luồng hơn sẽ chậm hơn

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://(nightielts\.id\.vn|www\.nightielts\.id\.vn|luyennoiieltswithnight\.github\.io)|http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["GET", "POST"], allow_headers=["*"],
)

_proc = _model = None
_lock = threading.Lock()
_espeak = EspeakBackend("en-us", with_stress=False, language_switch="remove-flags")
SEP = Separator(phone=" ", word="|")


def load():
    global _proc, _model
    if _model is None:
        with _lock:
            if _model is None:
                _proc = AutoProcessor.from_pretrained(MODEL)
                m = AutoModelForCTC.from_pretrained(MODEL).eval()
                _model = torch.quantization.quantize_dynamic(m, {torch.nn.Linear}, dtype=torch.qint8)  # nhanh gấp 2-3 lần trên CPU
    return _proc, _model


@app.on_event("startup")
def _warm():
    threading.Thread(target=load, daemon=True).start()


# ---------- phiên âm chuẩn ----------
@lru_cache(maxsize=20000)
def ref_phones(word):
    out = _espeak.phonemize([word], separator=SEP, strip=True)[0]
    return tuple(p for p in out.replace("|", " ").split() if p)


# ---------- so âm ----------
def norm(p):
    p = p.replace("ˈ", "").replace("ˌ", "").replace("ː", "").replace("ʲ", "")
    return {"r": "ɹ", "ɾ": "t", "ɚ": "ə", "ɝ": "ɜ", "ɐ": "ə", "ᵻ": "ɪ", "ɫ": "l", "o": "oʊ", "e": "eɪ", "ɡ": "g", "ä": "a", "oɹ": "ɔɹ"}.get(p, p)


REDUCED = {"ə", "ʌ", "ɪ", "ɜ", "ʊ", "ɛ"}
VOWELS = REDUCED | {"i", "u", "æ", "ɑ", "ɔ", "a", "aɪ", "aʊ", "eɪ", "oʊ", "ɔɪ", "ɪɹ", "ɛɹ", "ʊɹ", "ɑɹ", "ɔɹ"}
NEAR = [{"i", "ɪ"}, {"u", "ʊ"}, {"ɑ", "ɔ", "a"}, {"æ", "ɛ"}, {"t", "d"}, {"iə", "i", "ɪɹ", "ɪ"}, {"eə", "ɛɹ", "ɛ"}, {"ʊə", "ʊɹ", "ʊ"}, {"eɪ", "ɛ"}, {"oʊ", "ɔ"}, {"ɔɹ", "ɔ"}, {"ɑɹ", "ɑ"}, {"ɛɹ", "ɛ"}, {"ɪɹ", "ɪ"}, {"ʊɹ", "ʊ"}]
FUNCTION = set("a an the to of and in on at is are was were be it its for that this with as by or but from i you he she we they my your our his her their me him us them do does did have has had not no so if than then there will can would could should".split())


def sub_cost(a, b, fn=False):
    if a == b:
        return 0.0
    if a in VOWELS and b in VOWELS and (fn or (a in REDUCED and b in REDUCED)):
        return 0.25
    for g in NEAR:
        if a in g and b in g:
            return 0.5
    return 1.0


def align(ref, hyp, fnmask):
    """Levenshtein có trọng số: ref = âm chuẩn, hyp = âm nghe được. Trả về danh sách (i_ref|None, j_hyp|None)."""
    n, m = len(ref), len(hyp)
    D = np.zeros((n + 1, m + 1), dtype=np.float32)
    D[:, 0] = np.arange(n + 1)
    D[0, :] = np.arange(m + 1)
    B = np.zeros((n + 1, m + 1), dtype=np.int8)  # 0 diag, 1 del (thiếu), 2 ins (thừa)
    B[1:, 0] = 1
    B[0, 1:] = 2
    for i in range(1, n + 1):
        r, f = ref[i - 1], fnmask[i - 1]
        Di, Dp = D[i], D[i - 1]
        for j in range(1, m + 1):
            d = Dp[j - 1] + sub_cost(r, hyp[j - 1], f)
            de = Dp[j] + (0.6 if f else 1.0)
            ins = Di[j - 1] + 0.8
            if d <= de and d <= ins:
                Di[j], B[i, j] = d, 0
            elif de <= ins:
                Di[j], B[i, j] = de, 1
            else:
                Di[j], B[i, j] = ins, 2
    i, j, path = n, m, []
    while i > 0 or j > 0:
        b = B[i, j]
        if b == 0:
            path.append((i - 1, j - 1)); i -= 1; j -= 1
        elif b == 1:
            path.append((i - 1, None)); i -= 1
        else:
            path.append((None, j - 1)); j -= 1
    return path[::-1]


def decode_audio(raw):
    with tempfile.NamedTemporaryFile(suffix=".bin") as f:
        f.write(raw); f.flush()
        pcm = subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-i", f.name, "-t", str(MAX_SEC), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                             capture_output=True, timeout=60).stdout
    return np.frombuffer(pcm, dtype=np.float32)


def recognize(wav):
    """Trả về (danh sách âm, mốc thời gian [bắt đầu, kết thúc] giây của từng âm)."""
    proc, model = load()
    tok = proc.tokenizer
    skip = {tok.pad_token, "|", " ", "<s>", "</s>", "<unk>", None}
    out, times = [], []
    step = 16000 * 30  # cắt 30 giây / đoạn cho nhẹ máy
    for s in range(0, len(wav), step):
        seg = wav[s:s + step]
        if len(seg) < 1600:
            continue
        inp = proc(seg, sampling_rate=16000, return_tensors="pt")
        with torch.inference_mode():
            ids = model(inp.input_values).logits.argmax(-1)[0].tolist()
        toks = tok.convert_ids_to_tokens(ids)
        fr = len(seg) / 16000 / max(1, len(ids))  # ~0.02 giây / khung
        off = s / 16000
        prev = None
        for f, t in enumerate(toks):
            if t != prev and t not in skip:
                out.append(t); times.append([off + f * fr, off + (f + 1) * fr])
            elif t == prev and t not in skip and times:
                times[-1][1] = off + (f + 1) * fr
            prev = t
    return out, times


WORD_RE = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")


@app.get("/")
def health():
    return {"ok": True, "ready": _model is not None}


@app.post("/score")
async def score(audio: UploadFile = File(...), text: str = Form(...)):
    t0 = time.time()
    raw = await audio.read()
    if len(raw) > 12_000_000:
        return {"error": "File ghi âm quá dài."}
    FILL = {"um", "umm", "uh", "uhm", "er", "erm", "err", "ah", "ahh", "hmm", "hm", "mm", "mmm", "eh"}
    words = [w for w in WORD_RE.findall(text or "") if w.lower() not in FILL][:400]   # bỏ tiếng ngập ngừng, không chấm
    if not words:
        return {"error": "Thiếu lời nói để so."}
    wav = decode_audio(raw)
    if len(wav) < 8000:
        return {"error": "Bài ghi âm quá ngắn."}
    t1 = time.time()
    heard, htimes = recognize(wav)
    t2 = time.time()
    # gộp nguyên âm + ɹ mà máy tách rời (ɑ ɹ -> ɑɹ) cho khớp cách espeak viết (ɑːɹ)
    RC = {"ɑ": "ɑːɹ", "ɔ": "ɔːɹ", "o": "oːɹ", "ɛ": "ɛɹ", "ɪ": "ɪɹ", "ʊ": "ʊɹ"}
    h2, tm2 = [], []
    for k, p in enumerate(heard):
        b = p.replace("ː", "")
        if h2 and p == "ɹ" and h2[-1].replace("ː", "") in RC:
            h2[-1] = RC[h2[-1].replace("ː", "")]; tm2[-1] = [tm2[-1][0], htimes[k][1]]; continue
        h2.append(p); tm2.append(list(htimes[k]))
    heard, htimes = h2, tm2
    hyp = [norm(p) for p in heard]

    ref, owner, fn, disp = [], [], [], []
    for wi, w in enumerate(words):
        ph = ref_phones(w.lower())
        isfn = w.lower() in FUNCTION
        for p in ph:
            ref.append(norm(p)); owner.append(wi); fn.append(isfn); disp.append(p)
    path = align(ref, hyp, fn)

    W = [{"w": w, "ph": [], "extra": []} for w in words]
    stat, gotl = [None] * len(ref), [""] * len(ref)
    extra_after = {}
    last_i = -1
    for i, j in path:
        if i is None:
            extra_after.setdefault(last_i, []).append(heard[j])
            continue
        last_i = i
        if j is not None:
            tw = W[owner[i]]
            tw["s"] = min(tw.get("s", 1e9), htimes[j][0]); tw["e"] = max(tw.get("e", 0), htimes[j][1])
            c = sub_cost(ref[i], hyp[j], fn[i])
            stat[i] = "ok" if c == 0 else "near" if c <= 0.5 else "sub"
            gotl[i] = heard[j]
        else:
            stat[i] = "miss"

    # ---- Hiện tượng nói nối tự nhiên: hiện ra cho học sinh biết nhưng KHÔNG trừ điểm ----
    #  weak  = giảm âm ở từ chức năng (a, and, of, to, have, can…: nguyên âm thành /ə/, bỏ /h/, bỏ /d/ của and…)
    #  link  = nối âm: phụ âm giống nhau giữa 2 từ chỉ đọc 1 lần (went to)
    #  elide = nuốt âm tự nhiên: /t/ /d/ kẹp giữa 2 phụ âm (next day, must be, exactly), /ə/ không nhấn giữa 2 phụ âm (family, different)
    def is_c(k):
        return 0 <= k < len(ref) and ref[k] not in VOWELS
    for i in range(len(ref)):
        st = stat[i]
        if st in (None, "ok"):
            continue
        r = ref[i]
        # nối âm: 2 phụ âm giống nhau ở ranh giới 2 từ chỉ đọc 1 lần (went to, big girl)
        if st == "miss" and i > 0 and owner[i - 1] != owner[i] and ref[i - 1] == r and stat[i - 1] in ("ok", "near"):
            stat[i] = "link"; continue
        if st == "miss" and i + 1 < len(ref) and owner[i + 1] != owner[i] and ref[i + 1] == r and stat[i + 1] in ("ok", "near"):
            stat[i] = "link"; continue
        if fn[i] and (r in VOWELS or r in ("h", "d", "v", "t", "ð") and st == "miss" or r in ("h",)):
            if st == "miss" or r in VOWELS or (r == "ð" and gotl[i] in ("d", "n")):
                stat[i] = "weak"; continue
        if st == "miss" and r in ("t", "d") and is_c(i - 1) and is_c(i + 1):
            stat[i] = "elide"; continue
        if st == "miss" and r in ("ə", "ɪ") and is_c(i - 1) and is_c(i + 1) and owner[i - 1] == owner[i] and owner[i + 1] == owner[i] \
                and sum(1 for k in range(len(ref)) if owner[k] == owner[i] and k != i and ref[k] in VOWELS) >= 2:
            stat[i] = "elide"; continue
    for i in range(len(ref)):
        W[owner[i]]["ph"].append({"p": disp[i], "st": stat[i] or "miss", "got": gotl[i]})
        for x in extra_after.get(i, []):
            W[owner[i]]["extra"].append(x)
    for x in extra_after.get(-1, []):
        W[0]["extra"].append(x)

    tot_w = tot_s = 0.0
    for x in W:
        n = len(x["ph"]) or 1
        good = sum(1 if p["st"] in ("ok", "weak", "elide", "link") else 0.75 if p["st"] == "near" else 0 for p in x["ph"])
        x["score"] = round(100 * max(0.0, good - 0.5 * len(x["extra"])) / n)
        x["fn"] = x["w"].lower() in FUNCTION
        if "s" in x:
            x["s"], x["e"] = round(x["s"], 2), round(x["e"], 2)
        wt = 0.4 if x["fn"] else 1.0
        tot_w += wt * n; tot_s += wt * n * x["score"]
    return {"ok": True, "score": round(tot_s / tot_w) if tot_w else 0, "words": W, "heard": " ".join(heard),
            "sec": round(len(wav) / 16000, 1), "ms": int((time.time() - t0) * 1000), "ms_model": int((t2 - t1) * 1000)}
