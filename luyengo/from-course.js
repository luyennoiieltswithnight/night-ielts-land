/* Night IELTS — lấy từ vựng + mẫu câu từ các khoá học (khoahoc/<khoá>/buoi-XX.html) để luyện Nghe – Gõ.
   Đọc thẳng dữ liệu của bài (NightLesson.render({...})), nên bài mới thầy đăng lên sẽ tự có bài luyện gõ, không cần soạn lại.
   NVCourse.COURSES · NVCourse.roadmap(key) · NVCourse.lesson(key, n) → { title, items, lang } */
(function (root) {
  var COURSES = {
    en: [
      { key: 'giaotiep', name: 'Giao tiếp Thực chiến', sub: 'Outcomes · từ vựng đời sống + mẫu câu hội thoại', col: '#FF9E5E', pic: 'kaisya_kaiwa_communication_6867' },
      { key: 'speaking6', name: 'IELTS Speaking 6.0', sub: 'Từ vựng theo chủ đề Part 1 · 2 · 3', col: '#6C70DC', pic: 'speech_woman_1523' },
      { key: 'writing', name: 'IELTS Writing 6.0 → 8.0', sub: 'Từ vựng Task 1 · Task 2 · Band 8', col: '#F59E0B', pic: 'book_sakubun_kodomo_girl' },
      { key: 'chuyende', name: '25 Chuyên đề THPT', sub: 'Phát âm · ngữ pháp · cụm hay gặp', col: '#10B981', pic: 'study_night_boy_0934' }
    ],
    zh: [
      { key: 'tiengtrung', name: 'Tiếng Trung Quyển 1', sub: 'Từ mới + câu mẫu từng bài', col: '#C8102E', pic: 'zh_student' }
    ]
  };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var md = function (t) { return String(t == null ? '' : t).replace(/\*\*|__|\*|`/g, '').replace(/\s+/g, ' ').trim(); };

  /* Chạy đoạn <script> gọi X.render({...}) với một hàm giả để bắt lấy dữ liệu */
  function capture(html, fnName) {
    var scripts = [], re = /<script>([\s\S]*?)<\/script>/g, m;
    while ((m = re.exec(html))) if (m[1].indexOf(fnName + '.render(') >= 0) scripts.push(m[1]);
    var got = null, stub = { render: function (d) { got = d; } };
    scripts.forEach(function (code) {
      try { new Function(fnName, 'window', 'document', code)(stub, { NightLesson: stub, NightRoadmap: stub }, { getElementById: function () { return null; } }); } catch (e) { console.warn('[NVCourse]', e); }
    });
    return got;
  }
  function get(url) { return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }); }

  function roadmap(key, base) {
    base = base || '';
    return get(base + 'khoahoc/' + key + '.html').then(function (html) {
      var cfg = capture(html, 'NightRoadmap') || {}, out = [];
      (cfg.phases || []).forEach(function (ph) { (ph.sessions || []).forEach(function (s) { out.push({ n: s.n, title: md(s.title), tag: md(s.tag || ''), phase: md(ph.label || '') }); }); });
      return out;
    });
  }

  /* ---------- Pinyin: tách đúng 1 âm tiết cho mỗi chữ Hán (máy luyện cần vậy) ---------- */
  var SYL = ('a ai an ang ao ba bai ban bang bao bei ben beng bi bian biao bie bin bing bo bu pa pai pan pang pao pei pen peng pi pian piao pie pin ping po pou pu ' +
    'ma mai man mang mao me mei men meng mi mian miao mie min ming miu mo mou mu fa fan fang fei fen feng fo fou fu da dai dan dang dao de dei den deng di dia dian diao die ding diu dong dou du duan dui dun duo ' +
    'ta tai tan tang tao te tei teng ti tian tiao tie ting tong tou tu tuan tui tun tuo na nai nan nang nao ne nei nen neng ni nian niang niao nie nin ning niu nong nou nu nuan nun nuo nv nve ' +
    'la lai lan lang lao le lei leng li lia lian liang liao lie lin ling liu lo long lou lu luan lun luo lv lve ga gai gan gang gao ge gei gen geng gong gou gu gua guai guan guang gui gun guo ' +
    'ka kai kan kang kao ke kei ken keng kong kou ku kua kuai kuan kuang kui kun kuo ha hai han hang hao he hei hen heng hong hou hu hua huai huan huang hui hun huo ' +
    'ji jia jian jiang jiao jie jin jing jiong jiu ju juan jue jun qi qia qian qiang qiao qie qin qing qiong qiu qu quan que qun xi xia xian xiang xiao xie xin xing xiong xiu xu xuan xue xun ' +
    'zha zhai zhan zhang zhao zhe zhei zhen zheng zhi zhong zhou zhu zhua zhuai zhuan zhuang zhui zhun zhuo cha chai chan chang chao che chen cheng chi chong chou chu chua chuai chuan chuang chui chun chuo ' +
    'sha shai shan shang shao she shei shen sheng shi shou shu shua shuai shuan shuang shui shun shuo ra ran rang rao re ren reng ri rong rou ru rua ruan rui run ruo ' +
    'za zai zan zang zao ze zei zen zeng zi zong zou zu zuan zui zun zuo ca cai can cang cao ce cen ceng ci cong cou cu cuan cui cun cuo sa sai san sang sao se sen seng si song sou su suan sui sun suo ' +
    'ya yan yang yao ye yi yin ying yo yong you yu yuan yue yun wa wai wan wang wei wen weng wo wu e ei en eng er o ou r m n ng hm').split(' ');
  var SYLSET = {}; SYL.forEach(function (x) { SYLSET[x] = 1; });
  var BASE = { 'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a', 'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e', 'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i', 'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
    'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u', 'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v', 'ü': 'v', 'ń': 'n', 'ň': 'n', 'ǹ': 'n', 'ḿ': 'm' };
  var HAN = /[㐀-䶿一-鿿]/g;
  var hanCount = function (s) { return (String(s || '').match(HAN) || []).length; };
  /* mọi cách tách 1 từ (không dấu cách) thành âm tiết: trả về {số âm tiết: [vị trí cắt]} */
  function splits(word) {
    var low = word.toLowerCase(), b = '';
    for (var i = 0; i < low.length; i++) b += BASE[low[i]] || low[i];
    var L = b.length, memo = [];
    function go(i) {
      if (i === L) return { 0: [] };
      if (memo[i]) return memo[i];
      var res = {};
      for (var j = Math.min(L, i + 6); j > i; j--) {
        if (!SYLSET[b.slice(i, j)]) continue;
        var rest = go(j);
        for (var k in rest) { var c = +k + 1; if (!res[c]) res[c] = [j].concat(rest[k]); }
      }
      return (memo[i] = res);
    }
    var r = go(0), out = {};
    for (var k in r) { var cuts = r[k], parts = [], p = 0; cuts.forEach(function (c) { parts.push(low.slice(p, c)); p = c; }); out[k] = parts; }
    return out;
  }
  function segPinyin(zh, py) {
    var need = hanCount(zh); if (!need) return '';
    var words = String(py || '').split(/[^A-Za-zÀ-ɏḀ-ỿ]+/).filter(Boolean);
    var opts = words.map(splits);
    if (opts.some(function (o) { return !Object.keys(o).length; })) return '';
    var dp = [{ 0: [] }];
    for (var i = 0; i < opts.length; i++) {
      var nx = {};
      for (var t in dp[i]) for (var c in opts[i]) { var tot = +t + +c; if (tot <= need && !nx[tot]) nx[tot] = dp[i][t].concat(opts[i][c]); }
      dp.push(nx);
    }
    var fin = dp[opts.length][need];
    return fin ? fin.join(' ') : '';
  }

  /* ---------- Gom từ + câu trong bài ---------- */
  function walk(o, fn, sec) {
    if (Array.isArray(o)) return o.forEach(function (x) { walk(x, fn, sec); });
    if (!o || typeof o !== 'object') return;
    if (o.type && typeof o.type === 'string') sec = o.type;
    fn(o, sec);
    for (var k in o) if (o[k] && typeof o[k] === 'object') walk(o[k], fn, sec);
  }
  function extractEN(L) {
    var items = [], seen = {};
    var add = function (it) { var k = it.phrase.toLowerCase(); if (!it.phrase || seen[k] || it.phrase.length > 120) return; seen[k] = 1; items.push(it); };
    walk(L.sections || [], function (o, sec) {
      if (o.word && o.meaning && !o.ipa) {
        var w = md(o.word), ex = md(o.example || '');
        add({ phrase: w, meaningVi: md(o.meaning), sentence: ex || w, sentenceVi: md(o.exampleVi || o.example_vi || o.vi || '') || md(o.meaning), kind: 'vocab' });
      } else if (o.phrase && typeof o.phrase === 'string' && sec !== 'formula') {
        var ph = md(o.phrase).split(' / ')[0].replace(/\s*\/\s*$/, '').trim(), note = md(o.note || '');
        var vi = (note.split(' — ').pop() || note).replace(/^\/[^/]+\/\s*/, '').slice(0, 90);
        if (!/[A-Za-z]/.test(ph) || /\.\.\.|…|_{2,}/.test(ph)) return;
        add({ phrase: ph, meaningVi: vi || 'mẫu câu', sentence: ph, sentenceVi: vi || '', kind: 'phrase' });
      }
    });
    /* cụm từ trước, mẫu câu sau */
    return items.filter(function (x) { return x.kind === 'vocab'; }).concat(items.filter(function (x) { return x.kind === 'phrase'; }));
  }
  function extractZH(L) {
    var items = [], seen = {}, skipped = 0;
    var add = function (zh, py, vi, szh, spy, svi) {
      zh = String(zh || '').trim(); if (!zh || seen[zh] || !hanCount(zh)) return;
      var p = segPinyin(zh, py), sp = segPinyin(szh, spy);
      if (!p || !sp) { skipped++; return; }
      seen[zh] = 1;
      items.push({ hanzi: zh, pinyinRaw: p, meaningVi: md(vi), sentenceHanzi: String(szh).trim(), sentencePinyinRaw: sp, sentenceVi: md(svi || vi) });
    };
    var sentences = [];
    walk(L.sections || [], function (o, sec) {
      if (!o.zh || !o.py) return;
      if (Array.isArray(o.ex) || o.pos || o.hv) {
        var ex = (Array.isArray(o.ex) ? o.ex : []).filter(function (e) { return e && e.zh && e.py; })
          .sort(function (a, b) { return hanCount(a.zh) - hanCount(b.zh); })[0];
        add(o.zh, o.py, o.vi, ex ? ex.zh : o.zh, ex ? ex.py : o.py, ex ? ex.vi : o.vi);
      } else if ((sec === 'zhgrammar' || sec === 'zhspeak') && hanCount(o.zh) >= 3) sentences.push(o);
    });
    sentences.forEach(function (o) { add(o.zh, o.py, o.vi, o.zh, o.py, o.vi); });
    return { items: items, skipped: skipped };
  }
  function lesson(key, n, base) {
    base = base || '';
    return get(base + 'khoahoc/' + key + '/buoi-' + pad(n) + '.html').then(function (html) {
      var L = capture(html, 'NightLesson');
      if (!L) throw new Error('Không đọc được dữ liệu bài');
      var zh = key === 'tiengtrung' || L.lang === 'zh', r = zh ? extractZH(L) : { items: extractEN(L), skipped: 0 };
      var title = (L.session ? L.session + ' · ' : '') + md(L.titleZh ? L.titleZh + ' ' + L.title : L.title);
      return { title: title, items: r.items, skipped: r.skipped, lang: zh ? 'zh' : 'en' };
    });
  }
  root.NVCourse = { COURSES: COURSES, roadmap: roadmap, lesson: lesson, segPinyin: segPinyin, _capture: capture, _en: extractEN, _zh: extractZH };
})(typeof window !== 'undefined' ? window : globalThis);
