/* Night IELTS · Chữ ↔ Âm — lõi phân tích (chu-am-core.js)
   Ghép từng CỤM CHỮ của một từ với ÂM nó thật sự đọc trong từ đó, kèm mọi âm cụm chữ ấy CÓ THỂ đọc.
   Dùng chung cho trình duyệt (window.ChuAm) và node (module.exports) để kiểm thử. */
(function (root) {
  // ---- Bảng cụm chữ → các âm có thể có: [âm, ghi chú, "ví dụ, ví dụ"] (âm "" = câm) ----
  const G = {
    // Nguyên âm đơn
    a: [["æ", "", "cat, plan, happy"], ["eɪ", "a + phụ âm + e câm", "cake, make, table"], ["ɑː", "", "father, last, glass"], ["ɒ", "sau w, qu", "want, watch, quality"], ["ɔː", "a + l / ll", "all, ball, talk"], ["ə", "âm không nhấn", "about, banana, sofa"], ["e", "ngoại lệ", "any, many"], ["ɪ", "đuôi -age, -ate", "village, private"], ["eə", "", "various, Mary"], ["", "nuốt âm — viết nhưng không đọc", "usually, musically"]],
    e: [["e", "", "bed, help, desk"], ["iː", "", "he, these, evening"], ["ɪ", "không nhấn", "begin, return, pretty"], ["ə", "không nhấn", "open, problem, garden"], ["", "e câm", "make, home, were"], ["i", "không nhấn", "create, react"], ["eɪ", "gốc Pháp", "café, fiancé"], ["ɪə", "", "period, serious"], ["ɒ", "ngoại lệ", "encore"]],
    i: [["ɪ", "", "sit, big, city"], ["aɪ", "i + phụ âm + e câm", "time, kind, island"], ["iː", "gốc nước ngoài", "police, machine, ski"], ["ə", "không nhấn", "family, possible"], ["j", "trước nguyên âm", "onion, opinion"], ["i", "không nhấn", "radio, variety"], ["ɪə", "", "material, experience"], ["aɪə", "", "diet, science, quiet"], ["", "nuốt âm — viết nhưng không đọc", "business, family"]],
    o: [["ɒ", "", "hot, job, doctor"], ["əʊ", "", "go, home, open"], ["ʌ", "gần m, n, v", "come, money, love"], ["uː", "", "do, who, move"], ["ʊ", "", "woman, wolf"], ["ə", "không nhấn", "police, second, today"], ["ɪ", "ngoại lệ", "women"], ["wʌ", "ngoại lệ", "one, once"], ["ɔː", "", "story, glory"], ["ɜː", "", "attorney"], ["", "nuốt âm — viết nhưng không đọc", "chocolate, comfortable"]],
    u: [["ʌ", "", "cup, run, study"], ["juː", "", "music, use, student"], ["uː", "", "rule, June, true"], ["ʊ", "", "put, full, push"], ["ə", "không nhấn", "support, album, minus"], ["ɪ", "ngoại lệ", "busy, minute"], ["e", "ngoại lệ", "bury"], ["w", "sau q, g", "quick, language"], ["", "câm", "guess, build, guitar"], ["jʊ", "không nhấn", "regular, particular"], ["jə", "không nhấn", "popular, accurate"], ["ʊə", "", "during, plural"], ["jʊə", "", "curious, furious"], ["jɔː", "giọng Anh hiện đại", "cure, pure"], ["ɔː", "giọng Anh hiện đại", "sure, during"], ["ɜː", "", "Thursday"]],
    y: [["j", "đầu từ", "yes, you, year"], ["aɪ", "cuối từ ngắn", "my, why, try"], ["i", "cuối từ dài", "happy, city, very"], ["ɪ", "giữa từ", "gym, myth"], ["ə", "không nhấn", "analysis, vinyl"], ["aɪə", "", "lyre, tyre"]],
    // Cụm nguyên âm
    ai: [["eɪ", "", "rain, wait, train"], ["e", "ngoại lệ", "said, again"], ["ə", "không nhấn", "certain, captain"], ["ɪ", "không nhấn", "captain, bargain"]],
    ay: [["eɪ", "", "day, play, stay"], ["e", "ngoại lệ", "says"], ["i", "không nhấn", "Monday, holiday"]],
    ee: [["iː", "", "see, meet, need"], ["ɪ", "không nhấn", "coffee, committee"]],
    ea: [["iː", "", "teach, read, speak"], ["e", "", "head, bread, ready"], ["eɪ", "ngoại lệ", "great, break, steak"], ["ɪə", "", "idea, real"], ["iːə", "", "area, theatre"], ["ɜː", "", "search, heard"]],
    ie: [["aɪ", "cuối từ ngắn", "lie, tie, die"], ["iː", "giữa từ", "piece, field"], ["e", "ngoại lệ", "friend"], ["i", "không nhấn", "movie, cookie"], ["aɪə", "", "science, diet"], ["ɪ", "", "sieve, mischief"]],
    ei: [["eɪ", "", "eight, vein"], ["iː", "sau c", "receive, ceiling"], ["aɪ", "", "either, height"], ["e", "ngoại lệ", "leisure"], ["ə", "không nhấn", "foreign"], ["ɪ", "", "forfeit, counterfeit"]],
    ey: [["eɪ", "", "they, grey"], ["iː", "", "key"], ["i", "cuối từ dài", "money, honey, journey"], ["aɪ", "", "eye"]],
    oa: [["əʊ", "", "boat, road, coat"], ["ɔː", "hiếm", "board, broad"]],
    oo: [["uː", "oo dài", "food, school, cool"], ["ʊ", "oo ngắn", "book, good, cook"], ["ʌ", "ngoại lệ", "blood, flood"], ["ɔː", "", "door, floor"], ["əʊ", "", "brooch"]],
    ou: [["aʊ", "", "out, house, mountain"], ["ʌ", "", "country, young, touch"], ["uː", "", "you, group, soup"], ["ʊ", "ould", "could, should, would"], ["ə", "không nhấn", "famous, colour"], ["ɔː", "", "four, course, pour"], ["əʊ", "", "soul, shoulder, though"], ["", "nuốt âm — viết nhưng không đọc", "favourite, generous"]],
    ow: [["aʊ", "", "now, town, flower"], ["əʊ", "", "show, know, slow"], ["ɒ", "", "knowledge"], ["ə", "không nhấn", "borrow (Mỹ), towards"]],
    oi: [["ɔɪ", "", "point, choice, join"], ["wɑː", "gốc Pháp", "memoir, reservoir"], ["waɪə", "", "choir"]], oy: [["ɔɪ", "", "boy, enjoy, employ"]],
    au: [["ɔː", "", "author, cause, August"], ["ɒ", "ngoại lệ", "because, sausage"], ["ɑː", "giọng Anh", "aunt, laugh"], ["eɪ", "ngoại lệ", "gauge"], ["əʊ", "gốc Pháp", "mauve, chauffeur"]],
    aw: [["ɔː", "", "law, draw, awful"]],
    ew: [["uː", "", "new, crew, flew"], ["juː", "", "few, view, news"], ["əʊ", "ngoại lệ", "sew"]],
    ue: [["uː", "", "blue, true, glue"], ["juː", "", "rescue, value"], ["", "câm (cuối từ)", "league, unique"]],
    ui: [["uː", "", "fruit, juice, suit"], ["ɪ", "", "build, guitar, biscuit"], ["aɪ", "", "guide, quite"], ["juː", "", "nuisance"], ["wɪ", "", "penguin, linguist"]],
    ia: [["ə", "không nhấn", "special, crucial"], ["iə", "", "media, India"], ["aɪə", "", "diary, giant"]],
    ian: [["ən", "", "Christian, musician"], ["iən", "", "Indian, Italian"]],
    io: [["ə", "không nhấn", "region, cushion"], ["iəʊ", "", "radio, studio"], ["aɪə", "", "violin, biology"]],
    ier: [["ɪə", "", "easier, cheesier"], ["aɪə", "", "drier, flier"], ["iə", "", "easier"]],
    ire: [["aɪə", "", "fire, tired, hire"]],
    oar: [["ɔː", "", "board, coarse, roar"]],
    igh: [["aɪ", "", "high, night, light"]], eigh: [["eɪ", "", "eight, weight"], ["aɪ", "", "height"]],
    ough: [["ɔː", "", "thought, bought"], ["ʌf", "", "enough, tough, rough"], ["ɒf", "", "cough"], ["əʊ", "", "though, although"], ["uː", "", "through"], ["aʊ", "", "plough"], ["ə", "", "thorough, borough"]],
    augh: [["ɔː", "", "taught, daughter"], ["ɑːf", "", "laugh"]],
    eau: [["əʊ", "", "plateau"], ["juː", "", "beautiful"]],
    // Nguyên âm + r (giọng Anh không đọc r cuối)
    ar: [["ɑː", "", "car, start, garden"], ["ɑːr", "r nối khi có nguyên âm theo sau", "starring, safari"], ["ær", "", "carry, marriage"], ["ər", "không nhấn", "particular, popular"], ["ɔː", "sau w, qu", "warm, quarter"], ["ə", "không nhấn", "sugar, regular"], ["eər", "", "parent, various"], ["", "nuốt âm — viết nhưng không đọc", "library (nói nhanh)"]],
    er: [["ɜː", "nhấn", "person, her, serve"], ["ə", "không nhấn", "teacher, water, sister"], ["er", "", "very, America, merit"], ["ər", "không nhấn + r nối", "different, interest"], ["ɜːr", "r nối", "referring"], ["ɪər", "", "period, series"]],
    ir: [["ɜː", "", "bird, first, girl"], ["ə", "không nhấn", "confirm"], ["ɪr", "", "miracle, spirit"], ["aɪər", "", "irony, virus"]],
    ur: [["ɜː", "", "nurse, turn, Thursday"], ["ə", "không nhấn", "Saturday, surprise"], ["ʌr", "", "hurry, current"], ["ʊər", "", "during, jury"], ["ər", "", "surround"]],
    yr: [["ɜː", "", "myrtle"]],
    or: [["ɔː", "", "short, sport, morning"], ["ɒr", "", "sorry, horror, foreign"], ["ɔːr", "r nối", "story, glory"], ["ər", "không nhấn", "memory, history"], ["ɜː", "sau w", "work, word, world"], ["ə", "không nhấn", "doctor, actor, forget"]],
    ore: [["ɔː", "", "more, before, store"]],
    ear: [["ɪə", "", "near, clear, year"], ["ɪər", "r nối", "nearer, dearest"], ["ɜː", "", "learn, early, earth"], ["eə", "", "bear, wear"], ["ɑː", "", "heart"]],
    eer: [["ɪə", "", "career, engineer, beer"]],
    ere: [["ɪə", "", "here, sincere"], ["eə", "", "there, where"], ["ɜː", "", "were"]],
    air: [["eə", "", "hair, chair, fair"], ["eər", "r nối", "fairy, despairing"]],
    are: [["eə", "", "care, share, square"], ["ɑː", "", "are"], ["ə", "không nhấn", "software, welfare"]],
    our: [["ɔː", "", "four, your, course"], ["aʊə", "", "hour, our, flour"], ["ə", "không nhấn", "colour, favour"], ["ʊə", "", "tour"]],
    oor: [["ɔː", "", "door, floor"], ["ʊə", "", "poor, moor"]],
    ure: [["ʊə", "", "sure, cure"], ["ʊər", "r nối", "during"], ["jʊər", "", "curious"], ["ɔː", "", "sure"], ["jʊə", "", "pure"], ["ə", "không nhấn", "figure, measure"]],
    // Phụ âm
    b: [["b", "", "book, job, baby"], ["", "câm (mb, bt)", "climb, debt"]], bb: [["b", "", "hobby, rabbit"]],
    c: [["k", "trước a, o, u, phụ âm", "cat, cold, class"], ["s", "trước e, i, y", "city, face, cycle"], ["ʃ", "ci + nguyên âm", "special, social"], ["tʃ", "gốc Ý", "cello"], ["", "câm", "muscle, indict"]],
    cc: [["k", "", "accommodation, occur"], ["ks", "trước e, i", "accept, success"], ["tʃ", "gốc Ý", "cappuccino"]],
    ck: [["k", "", "back, quick, pocket"]],
    ch: [["tʃ", "", "chair, teacher, lunch"], ["k", "gốc Hy Lạp", "school, chaos, stomach"], ["ʃ", "gốc Pháp", "chef, machine"], ["dʒ", "", "sandwich, spinach (một số người)"], ["", "câm", "yacht"]],
    tch: [["tʃ", "", "watch, kitchen"]],
    d: [["d", "", "day, garden, bed"], ["dʒ", "d + u", "education, schedule"], ["t", "", "-ed sau âm vô thanh"], ["", "câm", "Wednesday, handsome, sandwich"]],
    dd: [["d", "", "middle, address"]], dge: [["dʒ", "", "bridge, knowledge"]],
    ed: [["ɪd", "sau /t/, /d/", "wanted, needed"], ["t", "sau âm vô thanh", "worked, helped, watched"], ["d", "sau âm hữu thanh", "played, lived, called"]],
    f: [["f", "", "fun, life, office"], ["v", "ngoại lệ", "of"]], ff: [["f", "", "coffee, stuff"]],
    g: [["ɡ", "trước a, o, u, phụ âm", "go, big, green"], ["dʒ", "trước e, i, y", "page, giant, gym"], ["ʒ", "gốc Pháp", "garage, beige"], ["", "câm (gn)", "sign, design"]],
    gg: [["ɡ", "", "bigger, egg"]], gh: [["ɡ", "đầu từ", "ghost"], ["f", "cuối từ", "laugh, enough"], ["", "câm", "night, though"]],
    gn: [["n", "", "sign, design, foreign"], ["ɡn", "giữa từ", "signal, ignore"], ["nj", "gốc Pháp/Ý", "champagne (cũ), lasagne"]], gu: [["ɡ", "", "guess, guitar"], ["ɡw", "", "language"]],
    h: [["h", "", "home, happy"], ["", "câm", "hour, honest, what"]],
    j: [["dʒ", "", "job, enjoy, June"]], k: [["k", "", "kind, make, ask"], ["", "câm (kn)", "know, knife"]], kn: [["n", "", "know, knife, knee"]],
    l: [["l", "", "learn, plan, school"], ["", "câm", "talk, walk, half, could"], ["əl", "âm tiết nhẹ", "pedal, travelling"]], ll: [["l", "", "hello, full, really"]],
    le: [["əl", "cuối từ", "table, people, little"], ["l", "cuối từ", "table, people, little"]],
    m: [["m", "", "man, time"]], mm: [["m", "", "summer, comment"]], mb: [["m", "b câm", "climb, thumb, comb"]],
    n: [["n", "", "no, plan"], ["ŋ", "trước k, g", "think, bank, English"], ["ən", "âm tiết nhẹ", "garden, listen"]], nn: [["n", "", "dinner, tennis"]],
    ng: [["ŋ", "", "sing, morning, long"], ["ŋɡ", "", "finger, English, longer"], ["ndʒ", "nge", "change, orange"]],
    p: [["p", "", "pen, help"], ["", "câm", "psychology, receipt"]], pp: [["p", "", "happy, apple"]], ph: [["f", "", "phone, photo, graph"], ["v", "ngoại lệ", "Stephen, nephew (Anh cổ)"], ["p", "ngoại lệ", "shepherd"]],
    qu: [["kw", "", "quick, question, quite"], ["k", "", "unique, technique"]],
    r: [["r", "", "red, very, around"], ["", "giọng Anh không đọc r", "barred, mirror"]], rr: [["r", "", "sorry, carry"]], wr: [["r", "w câm", "write, wrong"]],
    s: [["s", "", "sun, study, bus"], ["z", "giữa nguyên âm / cuối từ", "busy, is, plays"], ["ʃ", "", "sure, sugar"], ["ʒ", "s + u, ion", "usually, decision"], ["", "câm", "island, aisle"]],
    ss: [["s", "", "class, miss"], ["ʃ", "", "pressure, mission"]],
    sh: [["ʃ", "", "ship, shop, fish"]], sc: [["s", "trước e, i, y", "science, scene"], ["sk", "trước a, o, u, r", "school, scan"]],
    t: [["t", "", "time, water, start"], ["ʃ", "ti + on, al", "nation, potential"], ["tʃ", "t + ure, ual", "picture, actually"], ["", "câm", "listen, castle, often"], ["ʒ", "", "equation"], ["d", "nói nhanh (Mỹ)", "water, better"]],
    tt: [["t", "", "better, letter"]],
    th: [["θ", "vô thanh", "think, month, birthday"], ["ð", "hữu thanh", "the, this, mother"], ["t", "ngoại lệ", "Thomas, Thailand"]],
    v: [["v", "", "very, live, seven"]],
    w: [["w", "", "we, water, work"], ["", "câm", "write, answer, two"]],
    wh: [["w", "", "what, where, why"], ["h", "trước o", "who, whole"]],
    x: [["ks", "", "box, six, next"], ["ɡz", "ex + nguyên âm nhấn", "exam, example"], ["z", "đầu từ", "xylophone"], ["kʃ", "", "anxious"], ["k", "xc", "excite, excellent"], ["ɡʒ", "", "luxurious"]],
    z: [["z", "", "zoo, size"], ["s", "", "pizza, waltz"], ["ts", "gốc Ý/Đức", "pizza, waltz"], ["ʒ", "", "seizure, azure"]], zz: [["z", "", "puzzle, jazz"]],
    // Đuôi từ thường gặp
    sm: [["zəm", "đuôi -ism", "tourism, racism"], ["zm", "", "tourism"]],
    tion: [["ʃən", "", "nation, station, competition"], ["ʃn", "", "nation, station"], ["tʃən", "", "question"]],
    sion: [["ʃən", "", "mission, extension"], ["ʒən", "", "decision, television"], ["ʃn", "", "mission"], ["ʒn", "", "decision"]],
    ture: [["tʃə", "", "picture, nature, future"]],
    ous: [["əs", "", "famous, nervous, delicious"]],
  };

  // ---- Tách chuỗi IPA thành từng âm; đánh dấu âm được nhấn ----
  const MULTI = ["tʃ", "dʒ", "eɪ", "aɪ", "ɔɪ", "aʊ", "əʊ", "ɪə", "eə", "ʊə", "iː", "ɑː", "ɔː", "uː", "ɜː"];
  const VOWELS = new Set(["iː", "ɪ", "e", "æ", "ʌ", "ɑː", "ɒ", "ɔː", "ʊ", "uː", "ɜː", "ə", "i", "u", "eɪ", "aɪ", "ɔɪ", "aʊ", "əʊ", "ɪə", "eə", "ʊə"]);
  function normIpa(s) {
    return String(s || "").split(",")[0].replace(/[\/\[\]\s.]/g, "")
      .replace(/ɐ/g, "ə").replace(/ɛ/g, "e").replace(/ɹ/g, "r").replace(/ɚ/g, "ə").replace(/ᵻ/g, "ɪ").replace(/g/g, "ɡ")
      .replace(/oʊ/g, "əʊ").replace(/ɜ(?!ː)/g, "ɜː").replace(/ɑ(?!ː)/g, "ɑː").replace(/ɔ(?![ːɪ])/g, "ɔː").replace(/ɾ/g, "t")
      .replace(/a(?![ɪʊ])/g, "æ").replace(/ʔ/g, "t").replace(/ˑ/g, "").replace(/[ʰ̩̃]/g, "").replace(/'/g, "ˈ");
  }
  function tokenize(ipa) {
    const s = normIpa(ipa), out = [];
    let stress = 0;
    for (let i = 0; i < s.length;) {
      const c = s[i];
      if (c === "ˈ") { stress = 1; i++; continue; }
      if (c === "ˌ") { stress = 2; i++; continue; }
      const m = MULTI.find((x) => s.startsWith(x, i));
      const t = m || c; i += t.length;
      const isV = VOWELS.has(t);
      out.push({ p: t, stress: isV && stress ? stress : 0 });
      if (isV) stress = 0;
    }
    // dấu nhấn đặt trước phụ âm đầu âm tiết (kiểu chuẩn) → chuyển cho nguyên âm kế tiếp
    return out;
  }
  function tokenizeStress(ipa) {
    // giữ dấu nhấn cho nguyên âm đứng SAU nó dù có phụ âm xen giữa
    const s = normIpa(ipa), out = []; let pending = 0;
    for (let i = 0; i < s.length;) {
      const c = s[i];
      if (c === "ˈ") { pending = 1; i++; continue; }
      if (c === "ˌ") { pending = pending || 2; i++; continue; }
      const m = MULTI.find((x) => s.startsWith(x, i));
      const t = m || c; i += t.length;
      const isV = VOWELS.has(t);
      out.push({ p: t, stress: isV ? pending : 0 });
      if (isV) pending = 0;
    }
    return out;
  }
  const splitSound = (snd) => snd ? tokenizeStress(snd).map((x) => x.p) : [];

  // ---- Ghép chữ ↔ âm bằng quy hoạch động ----
  const KEYS = Object.keys(G).sort((a, b) => b.length - a.length);
  const VOWEL_LETTERS = /^[aeiouy]+$/;
  function align(word, ipa) {
    const L = word.toLowerCase().replace(/[^a-z]/g, "");
    const P = tokenizeStress(ipa);
    const PP = P.map((x) => x.p);
    const n = L.length, m = PP.length, INF = 1e9;
    const best = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(INF));
    const back = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null));
    best[0][0] = 0;
    const relax = (i, j, ni, nj, cost, info) => {
      if (ni > n || nj > m) return;
      const c = best[i][j] + cost;
      if (c < best[ni][nj]) { best[ni][nj] = c; back[ni][nj] = { i, j, ...info }; }
    };
    for (let i = 0; i < n; i++) for (let j = 0; j <= m; j++) {
      if (best[i][j] >= INF) continue;
      let matched = false;
      for (const g of KEYS) {
        if (!L.startsWith(g, i)) continue;
        if ((g === "ed" || g === "ous" || g === "ture") && i + g.length !== n) continue;
        if (g === "le" && !(i + 2 === n || (i + 3 === n && /[sd]/.test(L[n - 1])) || L[i + 2] === "w")) continue;
        G[g].forEach(([snd], k) => {
          const seq = splitSound(snd);
          if (seq.every((t, q) => PP[j + q] === t)) {
            matched = true;
            const silent = seq.length === 0;
            const lenBonus = (g.length - 1) * 0.6;
            let cost = 1 + k * 0.15 - lenBonus + (silent ? 1.6 : 0);
            if (g === "e" && silent && i === n - 1) cost -= 1.2; // e câm cuối từ: rất thường gặp
            relax(i, j, i + g.length, j + seq.length, cost, { g, snd, known: true });
          }
        });
      }
      // dự phòng: nuốt nguyên âm (comf-or-table) hoặc chữ ghép lạ
      if (VOWEL_LETTERS.test(L[i])) {
        const g2 = L.slice(i, i + 2);
        relax(i, j, i + 1, j, 4, { g: L[i], snd: "", known: false, note: "nuốt âm — không đọc" });
        if (G[g2] || /^[aeiou]r$/.test(g2)) relax(i, j, i + 2, j, 3.5, { g: g2, snd: "", known: false, note: "nuốt âm — không đọc" });
      }
      if (j < m) {
        relax(i, j, i + 1, j + 1, 6, { g: L[i], snd: PP[j], known: false });
        if (j + 1 < m) relax(i, j, i + 1, j + 2, 7.5, { g: L[i], snd: PP[j] + PP[j + 1], known: false });
      }
      relax(i, j, i + 1, j, 8, { g: L[i], snd: "", known: false, note: "câm" });
    }
    if (best[n][m] >= INF) return null;
    const chunks = [];
    let i = n, j = m;
    while (i > 0 || j > 0) {
      const b = back[i][j]; if (!b) return null;
      const seqLen = splitSound(b.snd).length;
      chunks.unshift({ g: b.g, snd: b.snd, known: b.known, note: b.note || "", stress: P.slice(b.j, b.j + seqLen).reduce((s, x) => s || x.stress, 0) });
      i = b.i; j = b.j;
    }
    // e câm "phép thuật": a_e, i_e, o_e, u_e, e_e
    const LONG = { a: ["eɪ"], i: ["aɪ"], o: ["əʊ"], u: ["juː", "uː"], e: ["iː"] };
    const last = chunks[chunks.length - 1];
    if (chunks.length >= 3 && last.g === "e" && last.snd === "") {
      const v = chunks[chunks.length - 3], cons = chunks[chunks.length - 2];
      if (LONG[v.g] && LONG[v.g].includes(v.snd) && !/[aeiouy]/.test(cons.g)) {
        last.magic = v.g; v.magicE = true;
        last.note = `e câm — “phép thuật”: làm ${v.g} đọc thành /${v.snd}/ (${v.g}_e)`;
      }
    }
    return { word, letters: L, ipa: normIpa(ipa), chunks: chunks.map((c) => ({ ...c, options: optionsFor(c) })) };
  }
  function optionsFor(c) {
    const list = (G[c.g] || []).map(([snd, note, ex]) => ({ snd, note, ex }));
    if (!list.some((o) => o.snd === c.snd)) list.push({ snd: c.snd, note: c.note || "ngoại lệ của từ này", ex: "", odd: true });
    return list;
  }

  const api = { G, align, normIpa, tokenize: tokenizeStress };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ChuAm = api;
})(typeof window !== "undefined" ? window : this);
