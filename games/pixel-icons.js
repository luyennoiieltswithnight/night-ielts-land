/* Night IELTS — pixel-icons.js: bộ icon pixel tự vẽ (thay cho emoji) dùng chung cho Night Arcade.
   PXI.html(name, heightPx, {q:'#màu'}) → <img> pixel sắc nét;  PXI.hearts(còn, tối đa, cao);  <i data-px="deer" data-h="40"></i> tự thay khi tải trang. */
(function () {
  var PAL = { k: '#24242A', r: '#EF4444', R: '#B91C1C', w: '#FFFFFF', y: '#FFD66B', Y: '#F59E0B', o: '#FB923C', O: '#EA580C', g: '#22C55E', G: '#86EFAC', h: '#15803D',
    b: '#7E82E6', B: '#6C70DC', a: '#7A5530', d: '#5B3A21', n: '#A8673A', l: '#E2B07A', p: '#F4A6A6', e: '#D9D9E3', E: '#B8B8C6', s: '#7DD3FC', S: '#0EA5E9', c: '#FFF6E6', v: '#C4B5FD', V: '#8B5CF6', q: '#FFFFFF' };
  var SP = {
    heart: ['.kkk.kkk.', 'krrrkrrrk', 'krwrrrrrk', 'krrrrrrrk', '.krrrrrk.', '..krrrk..', '...krk...', '....k....'],
    heart0: ['.kkk.kkk.', 'keeekeeek', 'keeeeeeek', 'keeeeeeek', '.keeeeek.', '..keeek..', '...kek...', '....k....'],
    spk: ['.....q......', '....qq...y..', '...qqq.y..y.', 'qqqqqq..y.y.', 'qqqqqq..y.y.', 'qqqqqq..y.y.', 'qqqqqq..y.y.', '...qqq.y..y.', '....qq...y..', '.....q......'],
    mute: ['.....q......', '....qq......', '...qqq......', 'qqqqqq.r...r', 'qqqqqq..r.r.', 'qqqqqq...r..', 'qqqqqq..r.r.', '...qqq.r...r', '....qq......', '.....q......'],
    mic: ['...kkkk...', '..kqqqqk..', '..kqqwqk..', '..kqqwqk..', '..kqqqqk..', 'k.kqqqqk.k', 'k..kkkk..k', '.k......k.', '..kkkkkk..', '....kk....', '..kkkkkk..'],
    lock: ['..kkkk..', '.k....k.', '.k....k.', 'kkkkkkkk', 'kyyyyyyk', 'kyykkyyk', 'kyykkyyk', 'kyyyyyyk', 'kkkkkkkk'],
    trophy: ['kkkkkkkkkk', 'kyywyyyyyk', 'kyywyyyyYk', '.kywyyyYk.', '.kyyyyyYk.', '..kyyyYk..', '...kyYk...', '....kk....', '....kk....', '..kkkkkk..', '..kOOOOk..', '..kkkkkk..'],
    sprout: ['.kk...kk.', 'kGGk.kGgk', 'kGggkggGk', '.kggkggk.', '..kkhkk..', '....h....', '.kkkkkkk.', '.kooooOk.', '..kooOk..', '..kkkkk..'],
    check: ['.......kk', '......kgk', '.....kgk.', 'kk..kgk..', 'kgkkgk...', '.kggk....', '..kk.....'],
    star: ['....k....', '...kyk...', 'kkkkykkkk', 'kyyyyyyyk', '.kyywyyk.', '..kyyyk..', '.kyykyyk.', '.kyk.kyk.', '.kk...kk.'],
    snake: ['............', '...kkkkkk...', '..kggggggk..', '.kgwkggwkgk.', '.kgkkggkkgk.', '.kggpggpggk.', '..kggggggk..', '...kkrrkk...', '....krrk....', '..kkkkkkkk..', '.kgGgGgGgGk.', '.kkkkkkkkkk.'],
    balloon: ['...kkkkk....', '..krrrrrk...', '.krwwrrrrk..', '.krwrrrrRk..', '.krrrrrrRk..', '.krrrrrRRk..', '..krrrRRk...', '...krRRk....', '....kkk.....', '.....k......', '....k.......', '.....k......'],
    cards: ['.kkkkkkkk...', '.kbBbBbBk...', '.kBbBbBbkkk.', '.kbBbBbBkwk.', '.kBbBbBbkwk.', '.kbBbBbBkwk.', '.kBbBbBbkwk.', '.kkkkkkkkwk.', '...kwwwwwwk.', '...kkkkkkkk.'],
    brick: ['kkkkkkkkkkkk', 'kooooookoook', 'kOOOOOOkOOOk', 'kkkkkkkkkkkk', 'kookoooooook', 'kOOkOOOOOOOk', 'kkkkkkkkkkkk', 'kooooookoook', 'kOOOOOOkOOOk', 'kkkkkkkkkkkk'],
    deerhead: ['.a.a....a.a.', '.aaa....aaa.', '..a......a..', '..akkkkkka..', '.knnnnnnnnk.', 'knnknnnnknnk', 'knnknnnnknnk', 'kpnnnnnnnnpk', '.knnnkknnnk.', '..knnllnnk..', '...kkkkkk...'],
    deer: ['................a..a..', '...............a..a...', '...............aaaa...', '................nnn...', '...............nnknn..', '..............pnnnnnnd', '...............nnnnn..', '...............nnnl...', '..............nnnl....', '..wnnnnnnnnnnnnnnl....', '.wwnnwnnnnwnnnnnn.....', '..nnnnnnwnnnnwnnn.....', '..nllllllllllllnn.....', '..nn.n.........n.nn...', '.n...d.........d...n..'],
    ear: ['..kkkkk...', '.kpppppk..', 'kppkkkppk.', 'kpk...kpk.', 'kpk..kppk.', '.k..kppk..', '...kppk...', '...kpk....', '..kppk....', '..kkk.....'],
    duo: ['.kkk...kkk.', 'kyyyk.kssk.', 'kywyk.kswk.', 'kyyyk.kssk.', '.kkk...kkk.', '.kyk...ksk.', 'kyyyk.kssk.', 'kyyyk.kssk.', 'kkkkk.kkkk.'],
    play: ['kk......', 'kgk.....', 'kggk....', 'kgggk...', 'kggggk..', 'kgggk...', 'kggk....', 'kgk.....', 'kk......'],
    bolt: ['...kkkk', '..kyyk.', '.kyyk..', 'kyyyykk', 'kkkyyk.', '..kyk..', '.kyk...', '.kk....'],
    turtle: ['.....kkk...', '....kgGgk..', '...kgGgGgkk', '..kGgGgGgkw', '.kkkkkkkkkk', '.kg.kg..kg.'],
    door: ['kkkkkkk', 'kvvvvvk', 'kvVVVvk', 'kvVVVvk', 'kvVVyvk', 'kvVVVvk', 'kvVVVvk', 'kkkkkkk']
  };
  var cache = {};
  function url(name, over) {
    var key = name + JSON.stringify(over || {}); if (cache[key]) return cache[key];
    var rows = SP[name] || SP.star, w = 0; rows.forEach(function (r) { w = Math.max(w, r.length); });
    var c = document.createElement('canvas'); c.width = w; c.height = rows.length; var g = c.getContext('2d');
    rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) { var ch = r[x], col = (over && over[ch]) || PAL[ch]; if (ch !== '.' && col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } } });
    return (cache[key] = c.toDataURL());
  }
  function size(name) { var r = SP[name] || SP.star, w = 0; r.forEach(function (x) { w = Math.max(w, x.length); }); return [w, r.length]; }
  function html(name, h, over, cls) {
    var s = size(name), px = Math.max(1, Math.round((h || 24) / s[1])), H = s[1] * px, W = s[0] * px;
    return '<img class="pxi ' + (cls || '') + '" src="' + url(name, over) + '" width="' + W + '" height="' + H + '" alt="" style="image-rendering:pixelated;image-rendering:crisp-edges;vertical-align:middle;display:inline-block">';
  }
  function hearts(n, max, h) { var o = ''; for (var i = 0; i < (max || 3); i++) o += html(i < n ? 'heart' : 'heart0', h || 18, null, 'pxh'); return o; }
  function scan(root) { (root || document).querySelectorAll('[data-px]').forEach(function (el) { var o = null; if (el.dataset.q) o = { q: el.dataset.q }; el.outerHTML = html(el.dataset.px, +el.dataset.h || 24, o, el.className); }); }
  window.PXI = { url: url, html: html, hearts: hearts, scan: scan, SP: SP };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { scan(); }); else scan();
})();
