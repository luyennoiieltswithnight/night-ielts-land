/* Night IELTS — Khu vườn từ vựng: bộ hình vẽ tay (SVG) cho cây, chậu, đảo mây.
   Mỗi cây = 1 <symbol> (loài hoa × bậc lớn) dựng 1 lần rồi dùng lại bằng <use>, nên vườn vài trăm cây vẫn nhẹ.
   GardenArt.FLOWERS   : các loài hoa học sinh chọn được
   GardenArt.SPECIALS  : hoa đặc biệt (đổi bằng phép màu khi giữ chuỗi ngày)
   GardenArt.plant(type, stage, opts) -> chuỗi <svg> 1 cây trong chậu
   GardenArt.cloud(seed) -> chuỗi <svg> 1 đảo mây mềm có dây leo */
(function () {
  var OL = '#4A3426'; /* nét viền nâu đậm như tranh vẽ tay */
  var FLOWERS = [
    { k: 'sun', n: 'Hướng dương', c: '#FFC93C' },
    { k: 'lotus', n: 'Sen', c: '#FFA9C8' },
    { k: 'rose', n: 'Hồng', c: '#E5484D' },
    { k: 'tulip', n: 'Tulip', c: '#FF6F91' },
    { k: 'daisy', n: 'Cúc hoạ mi', c: '#FFFFFF' },
    { k: 'lav', n: 'Oải hương', c: '#9B7BEA' },
    { k: 'sakura', n: 'Anh đào', c: '#FFC1D6' },
    { k: 'hydra', n: 'Cẩm tú cầu', c: '#8FB8FF' }
  ];
  var SPECIALS = [
    { k: 'moon', n: 'Hoa Ánh Trăng', c: '#DDF3FF', d: 'Toả sáng dịu như trăng rằm' },
    { k: 'rainbow', n: 'Hoa Cầu Vồng', c: '#FF9EC4', d: 'Bảy cánh bảy màu' },
    { k: 'crystal', n: 'Hoa Pha Lê', c: '#BFEFFF', d: 'Lấp lánh như băng' }
  ];
  var ALL = {}; FLOWERS.concat(SPECIALS).forEach(function (f) { ALL[f.k] = f; });

  function r(n) { return Math.round(n * 10) / 10; }
  function rot(deg, inner) { return '<g transform="rotate(' + r(deg) + ')">' + inner + '</g>'; }

  /* ---------- bông hoa theo loài, tâm (0,0), bán kính ~16 ---------- */
  function bloom(k) {
    var h = '', i;
    switch (k) {
      case 'sun':
        for (i = 0; i < 16; i++) h += rot(i * 22.5, '<ellipse cx="0" cy="-11.5" rx="3.8" ry="8.5" fill="' + (i % 2 ? '#FFB627' : '#FFD04D') + '" stroke="' + OL + '" stroke-width="1.3"/>');
        h += '<circle r="8.2" fill="#7A4A22" stroke="' + OL + '" stroke-width="1.5"/><circle r="5" fill="#5A3416"/>';
        for (i = 0; i < 7; i++) h += '<circle cx="' + r(Math.cos(i) * 4.6) + '" cy="' + r(Math.sin(i) * 4.6) + '" r=".9" fill="#C08A4E"/>';
        return h;
      case 'daisy':
        for (i = 0; i < 13; i++) h += rot(i * 27.7, '<ellipse cx="0" cy="-10" rx="3.4" ry="8.6" fill="#FFFFFF" stroke="' + OL + '" stroke-width="1.2"/>');
        return h + '<circle r="5.4" fill="#FFC93C" stroke="' + OL + '" stroke-width="1.4"/><circle cx="-1.6" cy="-1.6" r="1.6" fill="#FFE58A"/>';
      case 'sakura':
        for (i = 0; i < 5; i++) h += rot(i * 72, '<path d="M0 0 C-8 -4 -9 -13 -3.4 -16.5 L0 -13.6 L3.4 -16.5 C9 -13 8 -4 0 0Z" fill="#FFC9DB" stroke="' + OL + '" stroke-width="1.3" stroke-linejoin="round"/><path d="M0 -3 L0 -9" stroke="#F48FB1" stroke-width="1.2"/>');
        h += '<circle r="3.4" fill="#F06292"/>';
        for (i = 0; i < 6; i++) h += '<circle cx="' + r(Math.cos(i * 1.05) * 5.4) + '" cy="' + r(Math.sin(i * 1.05) * 5.4) + '" r="1" fill="#FFE082"/>';
        return h;
      case 'rose':
        return '<path d="M-15 2 C-17 -9 -8 -15 0 -14 C8 -15 17 -9 15 2 C13 12 -13 12 -15 2Z" fill="#D93A44" stroke="' + OL + '" stroke-width="1.5"/>' +
          '<path d="M-10 -2 C-11 -10 -3 -12 1 -11 C8 -11 11 -5 9 1 C7 7 -8 7 -10 -2Z" fill="#EF5A62" stroke="' + OL + '" stroke-width="1.1"/>' +
          '<path d="M-1 -3 a3 3 0 1 1 3.2 3 a6 6 0 1 1 -7.4 -5.6 a8.6 8.6 0 0 1 11 2" fill="none" stroke="#9E1F2A" stroke-width="1.5" stroke-linecap="round"/>';
      case 'tulip':
        return '<path d="M-12 -4 C-15 -14 -10 -20 -5 -19 C-2 -12 -2 -2 -4 6 Q-11 4 -12 -4Z" fill="#F0507A" stroke="' + OL + '" stroke-width="1.4" stroke-linejoin="round"/>' +
          '<path d="M12 -4 C15 -14 10 -20 5 -19 C2 -12 2 -2 4 6 Q11 4 12 -4Z" fill="#F0507A" stroke="' + OL + '" stroke-width="1.4" stroke-linejoin="round"/>' +
          '<path d="M-8 6 C-11 -6 -6 -17 0 -20 C6 -17 11 -6 8 6 Q0 10 -8 6Z" fill="#FF7A9C" stroke="' + OL + '" stroke-width="1.5" stroke-linejoin="round"/>' +
          '<path d="M-3 -12 Q-4 -4 -2 2" stroke="#FFC2D2" stroke-width="2" fill="none" stroke-linecap="round"/>';
      case 'lotus':
        [-64, 64, -40, 40, -18, 18, 0].forEach(function (a, j) { h += rot(a, '<path d="M0 5 C-7 -2 -6.4 -13 0 -21 C6.4 -13 7 -2 0 5Z" fill="' + (j < 2 ? '#F78DB4' : j < 4 ? '#FFA9C8' : '#FFC6DA') + '" stroke="' + OL + '" stroke-width="1.3" stroke-linejoin="round"/><path d="M0 -3 L0 -14" stroke="#F06C9B" stroke-width="1"/>'); });
        return '<g transform="translate(0,4)">' + h + '<ellipse cx="0" cy="3" rx="5" ry="2.4" fill="#FFD95A" stroke="' + OL + '" stroke-width="1"/></g>';
      case 'lav':
        for (i = 0; i < 8; i++) { var y = 8 - i * 4.4, s = 1 - i * .07; h += '<ellipse cx="' + (i % 2 ? 2.6 : -2.6) + '" cy="' + r(y) + '" rx="' + r(3.6 * s) + '" ry="' + r(3 * s) + '" fill="' + (i % 2 ? '#8E6BE0' : '#A98BF0') + '" stroke="' + OL + '" stroke-width="1.1"/>'; }
        return '<path d="M0 14 L0 -24" stroke="#5C9E4F" stroke-width="2.2"/>' + h + '<ellipse cx="0" cy="-26" rx="2.4" ry="2.2" fill="#B9A0F5" stroke="' + OL + '" stroke-width="1"/>';
      case 'hydra':
        [[0, 0], [-8, -3], [8, -3], [-4, -10], [5, -10], [-9, 6], [9, 6], [0, 9], [0, -16]].forEach(function (p, j) {
          var c = ['#8FB8FF', '#B39CFF', '#A6C8FF', '#C6B3FF'][j % 4], f = '';
          for (var q = 0; q < 4; q++) f += rot(q * 90 + 45, '<ellipse cx="0" cy="-2.6" rx="2.4" ry="3" fill="' + c + '" stroke="' + OL + '" stroke-width=".9"/>');
          h += '<g transform="translate(' + p[0] + ',' + p[1] + ')">' + f + '<circle r="1" fill="#FFF"/></g>';
        });
        return h;
      case 'moon':
        for (i = 0; i < 8; i++) h += rot(i * 45, '<path d="M0 0 C-6 -5 -6 -14 0 -18 C6 -14 6 -5 0 0Z" fill="#E6F6FF" stroke="#7FB6E0" stroke-width="1.3"/>');
        return '<circle r="19" fill="#CFEAFF" opacity=".35"/>' + h + '<circle r="5" fill="#FFF3B0" stroke="#E0B84E" stroke-width="1.2"/><path d="M2 -3 a3.4 3.4 0 1 0 0 6 a2.6 2.6 0 1 1 0 -6Z" fill="#E7C760"/>';
      case 'rainbow':
        ['#FF6B6B', '#FFA94D', '#FFE066', '#69DB7C', '#4DABF7', '#748FFC', '#DA77F2'].forEach(function (c, j) { h += rot(j * 51.4, '<ellipse cx="0" cy="-10" rx="4.6" ry="9" fill="' + c + '" stroke="' + OL + '" stroke-width="1.2"/>'); });
        return h + '<circle r="5" fill="#FFFFFF" stroke="' + OL + '" stroke-width="1.3"/><circle cx="-1.5" cy="-1.5" r="1.5" fill="#FFF3B0"/>';
      case 'crystal':
        for (i = 0; i < 6; i++) h += rot(i * 60, '<path d="M0 0 L-5.5 -9 L0 -19 L5.5 -9Z" fill="#C9F1FF" stroke="#4E9BC9" stroke-width="1.3" stroke-linejoin="round"/><path d="M0 -2 L0 -17 M0 -9 L-4 -9" stroke="#FFFFFF" stroke-width="1.1"/>');
        return h + '<path d="M0 -5 L1.6 -1.6 L5 0 L1.6 1.6 L0 5 L-1.6 1.6 L-5 0 L-1.6 -1.6Z" fill="#FFFFFF" stroke="#4E9BC9" stroke-width=".8"/>';
    }
    return '';
  }

  /* ---------- các phần của cây ---------- */
  function stem(x1, y1, x2, y2, bend, w) {
    var cx = (x1 + x2) / 2 + bend, cy = (y1 + y2) / 2, d = 'M' + x1 + ' ' + y1 + ' Q' + r(cx) + ' ' + r(cy) + ' ' + x2 + ' ' + y2;
    return '<path d="' + d + '" stroke="' + OL + '" stroke-width="' + (w + 2.4) + '" fill="none" stroke-linecap="round"/><path d="' + d + '" stroke="#4CAF50" stroke-width="' + w + '" fill="none" stroke-linecap="round"/>';
  }
  function leaf(x, y, ang, s, col) {
    return '<g transform="translate(' + x + ',' + y + ') rotate(' + ang + ') scale(' + s + ')"><path d="M0 0 C5 -7 15 -8 22 -2 C15 5 6 6 0 0Z" fill="' + (col || '#6CC56B') + '" stroke="' + OL + '" stroke-width="1.4" stroke-linejoin="round"/><path d="M2 -.5 Q11 -2.5 19 -2" stroke="#3E8E41" stroke-width="1" fill="none"/></g>';
  }
  function bud(k, x, y) {
    var c = (ALL[k] || {}).c || '#FF9EC4';
    if (k === 'lav') return '<g transform="translate(' + x + ',' + y + ')"><ellipse cx="0" cy="0" rx="3" ry="7" fill="' + c + '" stroke="' + OL + '" stroke-width="1.2"/></g>';
    return '<g transform="translate(' + x + ',' + y + ')"><path d="M0 -12 C6 -8 7 0 0 4 C-7 0 -6 -8 0 -12Z" fill="' + c + '" stroke="' + OL + '" stroke-width="1.4"/><path d="M-6 0 Q-3 6 0 4 Q3 6 6 0 Q2 3 0 1 Q-2 3 -6 0Z" fill="#5DB65B" stroke="' + OL + '" stroke-width="1.1"/></g>';
  }
  var POT = '<defs><linearGradient id="gaPot" x1="0" x2="1"><stop offset="0" stop-color="#E9955F"/><stop offset=".55" stop-color="#D47544"/><stop offset="1" stop-color="#B35A2E"/></linearGradient></defs>' +
    '<path d="M29 112 L71 112 L66 138 Q65 141 62 141 L38 141 Q35 141 34 138Z" fill="url(#gaPot)" stroke="' + OL + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<rect x="24" y="103" width="52" height="11" rx="5" fill="#E68A55" stroke="' + OL + '" stroke-width="2"/>' +
    '<ellipse cx="50" cy="105.5" rx="21" ry="3" fill="#5B3A26"/><path d="M36 118 L34 134" stroke="#F7B98F" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>';

  function body(k, st) {
    var h = '';
    if (st === 'wilt') {
      return stem(50, 104, 64, 66, -18, 3.4) + leaf(52, 92, 200, .7, '#B7A35A') + leaf(55, 82, -30, .6, '#A89150') +
        '<g transform="translate(70,74) rotate(150)"><path d="M0 -10 C5 -7 6 0 0 3 C-6 0 -5 -7 0 -10Z" fill="#B98A6A" stroke="' + OL + '" stroke-width="1.3"/></g>';
    }
    if (st === 0) return '<ellipse cx="50" cy="104" rx="14" ry="5" fill="#6E4630"/><g transform="translate(50,101) rotate(-20)"><ellipse rx="6" ry="4.2" fill="#C68B4F" stroke="' + OL + '" stroke-width="1.5"/><path d="M-2 -1 Q1 -3 3 0" stroke="#7A4E28" stroke-width="1.2" fill="none"/></g>';
    if (st === 1) return stem(50, 104, 50, 86, 2, 3) + leaf(50, 87, -150, .62) + leaf(50, 87, -30, .62);
    if (st === 2) return stem(50, 104, 50, 66, 5, 3.4) + leaf(50, 94, -160, .7) + leaf(50, 88, -20, .74) + leaf(51, 76, -150, .62) + leaf(51, 70, -35, .6);
    if (st === 3) return stem(50, 104, 50, 56, 4, 3.6) + leaf(50, 96, -165, .78) + leaf(50, 90, -15, .8) + leaf(51, 78, -150, .66) + leaf(51, 72, -30, .62) + bud(k, 50, 54);
    var top = st === 5 ? 44 : 50;
    h = stem(50, 104, 50, top, 4, 3.8) + leaf(50, 98, -165, .82) + leaf(50, 92, -15, .84) + leaf(51, 80, -150, .7) + leaf(51, 74, -30, .66);
    if (st === 5) {
      h += stem(50, 90, 26, 62, -6, 2.6) + stem(50, 86, 75, 58, 6, 2.6) +
        '<g transform="translate(25,60) scale(.58)">' + bloom(k) + '</g><g transform="translate(76,56) scale(.58)">' + bloom(k) + '</g>';
    }
    return h + '<g transform="translate(50,' + top + ') scale(' + (st === 5 ? 1.12 : 1) + ')">' + bloom(k) + '</g>';
  }

  /* ---------- sprite: dựng symbol khi cần ---------- */
  var made = {}, sprite = null;
  function ensure(id, k, st) {
    if (made[id]) return; made[id] = 1;
    if (!sprite) {
      sprite = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      sprite.setAttribute('aria-hidden', 'true'); sprite.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      sprite.innerHTML = '<defs></defs>';
      document.body.insertBefore(sprite, document.body.firstChild);
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'symbol'); p.id = 'ga-pot'; p.setAttribute('viewBox', '0 0 100 145'); p.innerHTML = POT; sprite.firstChild.appendChild(p);
    }
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
    s.id = id; s.setAttribute('viewBox', '0 0 100 145'); s.setAttribute('overflow', 'visible');
    s.innerHTML = body(k, st);
    sprite.firstChild.appendChild(s);
  }
  /* 1 cây trong chậu. stage 0..5 hoặc 'wilt'. Thân (không gồm chậu) đung đưa nhờ class .ga-sway */
  function plant(k, stage, o) {
    o = o || {};
    if (!ALL[k]) k = 'sun';
    var id = 'ga-' + k + '-' + stage; ensure(id, k, stage);
    return '<svg class="ga" viewBox="0 0 100 145" aria-hidden="true"><use href="#ga-pot"/><g class="ga-sway"' + (o.delay ? ' style="animation-delay:' + o.delay + 's"' : '') + '><use href="#' + id + '"/></g>' +
      (o.special ? '<g class="ga-spark"><path d="M18 40 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#FFF6B0"/><path d="M82 28 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" fill="#E6F6FF"/><circle cx="74" cy="86" r="2" fill="#FFF"/></g>' : '') + '</svg>';
  }
  /* bông hoa nhỏ để làm nút chọn loài */
  function chip(k) { return '<svg viewBox="-22 -26 44 44" class="ga-chip" aria-hidden="true">' + bloom(k) + '</svg>'; }

  /* ---------- đảo mây: viền nhấp nhô mềm + dây leo treo ---------- */
  function rng(seed) { var s = seed * 9301 + 49297; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  function cloud(seed) {
    var R = rng(seed + 3), W = 1000, top = 46, n = 11, i, x, d = 'M30 ' + (top + 30);
    /* mép trên: các "cục bông" to nhỏ xen kẽ */
    var xs = []; for (i = 0; i <= n; i++) xs.push(30 + i * (W - 60) / n);
    d += ' C10 ' + (top + 6) + ' 40 ' + (top - 18) + ' ' + r(xs[1] - 20) + ' ' + (top - 8);
    for (i = 1; i < n; i++) { var a = xs[i], b = xs[i + 1], up = 18 + R() * 22; d += ' C' + r(a + 8) + ' ' + r(top - up) + ' ' + r(b - 30) + ' ' + r(top - up) + ' ' + r(b - 20) + ' ' + r(top - 6 - R() * 6); }
    d += ' C' + (W + 6) + ' ' + (top - 6) + ' ' + (W + 10) + ' ' + (top + 34) + ' ' + (W - 34) + ' ' + (top + 44);
    /* mép dưới: tròn trịa, phồng xuống ở giữa */
    for (i = 6; i > 0; i--) { x = 40 + i * (W - 80) / 6; var dn = 20 + Math.sin(i / 6 * Math.PI) * 26 + R() * 8; d += ' C' + r(x + 30) + ' ' + r(top + 44 + dn) + ' ' + r(x - (W - 80) / 6 - 30) + ' ' + r(top + 44 + dn) + ' ' + r(x - (W - 80) / 6) + ' ' + r(top + 44 + (i > 1 ? 6 : 0)); }
    d += ' C0 ' + (top + 50) + ' 0 ' + (top + 34) + ' 30 ' + (top + 30) + 'Z';
    var g = 'gc' + seed, vines = '';
    for (i = 0; i < 5; i++) {
      x = 120 + i * 190 + R() * 60; var L = 40 + R() * 46, sw = (R() - .5) * 40, y0 = top + 52 + Math.sin((x / W) * Math.PI) * 20;
      var vp = 'M' + r(x) + ' ' + r(y0) + ' q' + r(sw) + ' ' + r(L / 2) + ' ' + r(sw / 3) + ' ' + r(L);
      vines += '<path d="' + vp + '" stroke="' + OL + '" stroke-width="5.4" fill="none" stroke-linecap="round"/><path d="' + vp + '" stroke="#5DB65B" stroke-width="3.2" fill="none" stroke-linecap="round"/>';
      for (var j = 1; j <= 3; j++) vines += leaf(r(x + sw * j / 5), r(y0 + L * j / 3.6), j % 2 ? 30 : 150, .55);
    }
    return '<svg class="ga-cloud" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true"><defs>' +
      '<linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--cl1,#FFFFFF)"/><stop offset=".55" style="stop-color:var(--cl2,#EEF0FF)"/><stop offset="1" style="stop-color:var(--cl3,#C9CDF5)"/></linearGradient></defs>' +
      vines + '<path d="' + d + '" fill="url(#' + g + ')" style="stroke:var(--clo,#8E93CC)" stroke-width="3.2" stroke-linejoin="round"/>' +
      '<path d="M90 ' + (top + 20) + ' Q500 ' + (top + 2) + ' 910 ' + (top + 20) + '" style="stroke:var(--cl1,#fff)" stroke-width="8" fill="none" stroke-linecap="round" opacity=".8"/>' +
      '<path d="M140 ' + (top + 62) + ' Q500 ' + (top + 86) + ' 860 ' + (top + 62) + '" style="stroke:var(--cl3,#C9CDF5)" stroke-width="10" fill="none" stroke-linecap="round" opacity=".55"/></svg>';
  }

  window.GardenArt = { FLOWERS: FLOWERS, SPECIALS: SPECIALS, ALL: ALL, plant: plant, chip: chip, cloud: cloud, bloom: bloom };
})();
