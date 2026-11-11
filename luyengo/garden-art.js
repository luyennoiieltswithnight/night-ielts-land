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
    { k: 'hydra', n: 'Cẩm tú cầu', c: '#8FB8FF' },
    { k: 'mai', n: 'Hoa mai', c: '#FFD43B' },
    { k: 'dao', n: 'Hoa đào', c: '#FF8FB1' },
    { k: 'ly', n: 'Hoa ly', c: '#FFE3EC' },
    { k: 'vantho', n: 'Vạn thọ', c: '#FF9F1C' },
    { k: 'maudon', n: 'Mẫu đơn', c: '#F48FB1' },
    { k: 'bocong', n: 'Bồ công anh', c: '#FFFFFF' },
    { k: 'tao', n: 'Cây táo', c: '#E63946', g: 'tree' },
    { k: 'cam', n: 'Cây cam', c: '#FB8500', g: 'tree' },
    { k: 'chanh', n: 'Cây chanh', c: '#C9E265', g: 'tree' },
    { k: 'xoai', n: 'Cây xoài', c: '#FFB703', g: 'tree' },
    { k: 'dau', n: 'Dâu tây', c: '#E5383B', g: 'veg' },
    { k: 'cachua', n: 'Cà chua', c: '#EF3B2D', g: 'veg' },
    { k: 'bingo', n: 'Bí ngô', c: '#F4842B', g: 'veg' },
    { k: 'carot', n: 'Cà rốt', c: '#F77F00', g: 'veg' }
  ];
  FLOWERS.forEach(function (f) { f.g = f.g || 'flower'; });
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
      case 'mai':
        for (i = 0; i < 5; i++) h += rot(i * 72, '<ellipse cx="0" cy="-9" rx="7" ry="8.5" fill="#FFD43B" stroke="' + OL + '" stroke-width="1.3"/><path d="M0 -3 L0 -12" stroke="#F4B400" stroke-width="1"/>');
        h += '<circle r="4" fill="#F59F00" stroke="' + OL + '" stroke-width="1.1"/>';
        for (i = 0; i < 8; i++) h += '<path d="M0 0 L' + r(Math.cos(i * .785) * 8) + ' ' + r(Math.sin(i * .785) * 8) + '" stroke="#C77700" stroke-width=".9"/><circle cx="' + r(Math.cos(i * .785) * 8) + '" cy="' + r(Math.sin(i * .785) * 8) + '" r="1.1" fill="#E8590C"/>';
        return h;
      case 'dao':
        for (i = 0; i < 5; i++) h += rot(i * 72, '<path d="M0 -1 C-8 -5 -8 -15 -2.5 -16 Q0 -14 2.5 -16 C8 -15 8 -5 0 -1Z" fill="#FF9DBB" stroke="' + OL + '" stroke-width="1.3"/><path d="M0 -3 Q-1 -8 0 -12" stroke="#FFD0DF" stroke-width="2" fill="none"/>');
        h += '<circle r="4" fill="#D6336C"/>';
        for (i = 0; i < 7; i++) h += '<circle cx="' + r(Math.cos(i * .9) * 6) + '" cy="' + r(Math.sin(i * .9) * 6) + '" r="1" fill="#FFE066"/>';
        return h;
      case 'ly':
        for (i = 0; i < 6; i++) h += rot(i * 60 + 30, '<path d="M0 0 C-6 -6 -5 -15 0 -21 C5 -15 6 -6 0 0Z" fill="' + (i % 2 ? '#FFE3EC' : '#FFF4F7') + '" stroke="' + OL + '" stroke-width="1.3"/><path d="M0 -3 L0 -15" stroke="#F783AC" stroke-width="1.4"/><circle cx="-1.6" cy="-8" r=".9" fill="#E64980"/><circle cx="1.5" cy="-11" r=".8" fill="#E64980"/>');
        for (i = 0; i < 5; i++) h += rot(i * 72, '<path d="M0 0 L0 -9" stroke="#8F6B3E" stroke-width="1"/><ellipse cx="0" cy="-10" rx="1.2" ry="2" fill="#B5651D"/>');
        return h;
      case 'vantho':
        [[16, 13, '#E8590C'], [11, 10, '#FF922B'], [6, 7, '#FFB703']].forEach(function (g) { for (var q = 0; q < g[1]; q++) h += rot(q * 360 / g[1], '<circle cx="0" cy="' + (-g[0] * .62) + '" r="' + r(g[0] * .42) + '" fill="' + g[2] + '" stroke="' + OL + '" stroke-width="1"/>'); });
        return h + '<circle r="3" fill="#FFD43B"/>';
      case 'maudon':
        [[14, 9, '#F8BBD0'], [10, 7, '#F48FB1'], [6, 5, '#EC6A9C']].forEach(function (g, j) { for (var q = 0; q < g[1]; q++) h += rot(q * 360 / g[1] + j * 17, '<ellipse cx="0" cy="' + (-g[0] * .55) + '" rx="' + r(g[0] * .5) + '" ry="' + r(g[0] * .62) + '" fill="' + g[2] + '" stroke="' + OL + '" stroke-width="1.1"/>'); });
        return h + '<circle r="2.6" fill="#FFE066"/>';
      case 'bocong':
        for (i = 0; i < 26; i++) { var a = i * 13.85 * Math.PI / 180, L = 14 + (i % 3) * 2; h += '<path d="M0 0 L' + r(Math.cos(a) * L) + ' ' + r(Math.sin(a) * L) + '" stroke="#E9ECEF" stroke-width=".9"/><circle cx="' + r(Math.cos(a) * L) + '" cy="' + r(Math.sin(a) * L) + '" r="1.7" fill="#FFFFFF" stroke="#ADB5BD" stroke-width=".5"/>'; }
        return '<circle r="17" fill="#FFFFFF" opacity=".35"/>' + h + '<circle r="3.4" fill="#C5A880" stroke="' + OL + '" stroke-width="1"/>';
      case 'tao': return fruit('tao', 0, 0, 2.1);
      case 'cam': return fruit('cam', 0, 0, 2.1);
      case 'chanh': return fruit('chanh', 0, 0, 2.1);
      case 'xoai': return fruit('xoai', 0, 0, 2.1);
      case 'dau': return fruit('dau', 0, 0, 2.2);
      case 'cachua': return fruit('cachua', 0, 0, 2.1);
      case 'bingo': return fruit('bingo', 0, 2, 1.8);
      case 'carot': return '<g transform="rotate(25)"><path d="M-5 -6 L5 -6 L1 18 Q0 20 -1 18Z" fill="#F77F00" stroke="' + OL + '" stroke-width="1.4" stroke-linejoin="round"/><path d="M-3 0 L0 0 M-1 6 L2 6" stroke="#C25E00" stroke-width="1"/>' + frond(0, -6, .7) + '</g>';
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
  /* ---------- quả, rau ---------- */
  function fruit(k, x, y, s) {
    var g = '<g transform="translate(' + x + ',' + y + ') scale(' + (s || 1) + ')">', e = '</g>', o = ' stroke="' + OL + '" stroke-width="' + r(1.2 / (s || 1) + .4) + '"';
    switch (k) {
      case 'tao': return g + '<path d="M0 -3 C-3 -6 -8 -5 -8 0 C-8 5 -4 8 0 7 C4 8 8 5 8 0 C8 -5 3 -6 0 -3Z" fill="#E63946"' + o + '/><path d="M0 -3 L1 -7" stroke="#6B4226" stroke-width="1.2"/><path d="M1 -6 Q5 -9 6 -6 Q3 -4 1 -6Z" fill="#6CC56B"/><ellipse cx="-4" cy="-1" rx="1.6" ry="2.4" fill="#FF8A8A"/>' + e;
      case 'cam': return g + '<circle r="7.4" fill="#FB8500"' + o + '/><circle cx="-2.6" cy="-2.6" r="1.8" fill="#FFB703"/><path d="M0 -7 L.5 -9" stroke="#6B4226" stroke-width="1.1"/><path d="M.5 -8.5 Q4 -10 5 -7.5 Q2.5 -6.5 .5 -8.5Z" fill="#6CC56B"/>' + e;
      case 'chanh': return g + '<path d="M-9 0 C-7 -6 7 -6 9 0 C7 6 -7 6 -9 0Z" fill="#C9E265"' + o + '/><ellipse cx="-2" cy="-1.8" rx="3" ry="1.2" fill="#E9F5A8"/>' + e;
      case 'xoai': return g + '<path d="M-4 -7 C4 -9 9 -2 7 4 C5 9 -3 9 -6 4 C-8 0 -8 -5 -4 -7Z" fill="#FFB703"' + o + '/><path d="M-4 -6 C-1 -7 2 -6 3 -4" stroke="#FB8500" stroke-width="2" fill="none"/><ellipse cx="-2" cy="0" rx="1.5" ry="2.6" fill="#FFE08A"/>' + e;
      case 'dau': return g + '<path d="M0 8 C-7 3 -7 -4 -4 -5 C-2 -6 2 -6 4 -5 C7 -4 7 3 0 8Z" fill="#E5383B"' + o + '/><path d="M-5 -5 L-2 -8 L0 -5 L2 -8 L5 -5 Q0 -3 -5 -5Z" fill="#4CAF50" stroke="' + OL + '" stroke-width=".8"/><circle cx="-2" cy="-1" r=".6" fill="#FFE066"/><circle cx="2" cy="1" r=".6" fill="#FFE066"/><circle cx="-1" cy="3" r=".6" fill="#FFE066"/><circle cx="2" cy="-2" r=".6" fill="#FFE066"/>' + e;
      case 'cachua': return g + '<circle r="7" fill="#EF3B2D"' + o + '/><path d="M-4 -6 L-1 -5 L0 -8 L1 -5 L4 -6 L2 -3 Q0 -4 -2 -3Z" fill="#3E9B4A"/><ellipse cx="-3" cy="-1" rx="1.4" ry="2" fill="#FF8A80"/>' + e;
      case 'bingo': return g + '<ellipse cx="-5" cy="0" rx="5" ry="7" fill="#F4842B"' + o + '/><ellipse cx="5" cy="0" rx="5" ry="7" fill="#F4842B"' + o + '/><ellipse cx="0" cy="0" rx="4.6" ry="7.6" fill="#F79A44"' + o + '/><path d="M0 -7 Q1 -11 3 -11" stroke="#5B8A3C" stroke-width="2" fill="none"/>' + e;
    }
    return '';
  }
  function frond(x, y, s) { var h = '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">'; [-40, -15, 10, 35].forEach(function (a) { h += '<g transform="rotate(' + a + ')"><path d="M0 0 L0 -20" stroke="#3E8E41" stroke-width="1.6"/>' + [6, 11, 16].map(function (yy) { return '<ellipse cx="-2.6" cy="' + -yy + '" rx="3" ry="1.6" fill="#6CC56B" transform="rotate(-30 -2.6 ' + -yy + ')"/><ellipse cx="2.6" cy="' + -yy + '" rx="3" ry="1.6" fill="#6CC56B" transform="rotate(30 2.6 ' + -yy + ')"/>'; }).join('') + '</g>'; }); return h + '</g>'; }
  function crown(cx, cy, R, dark) {
    var h = '', pts = [[0, 0, 1], [-.75, .2, .7], [.75, .2, .7], [-.45, -.55, .72], [.45, -.55, .72], [0, -.8, .6], [-.95, -.25, .5], [.95, -.25, .5]];
    pts.forEach(function (p) { h += '<circle cx="' + r(cx + p[0] * R) + '" cy="' + r(cy + p[1] * R) + '" r="' + r(p[2] * R * .62) + '" fill="' + (dark || '#4CAF50') + '" stroke="' + OL + '" stroke-width="1.6"/>'; });
    pts.forEach(function (p) { h += '<circle cx="' + r(cx + p[0] * R) + '" cy="' + r(cy + p[1] * R) + '" r="' + r(p[2] * R * .62 - 1) + '" fill="' + (dark || '#4CAF50') + '"/>'; });
    pts.slice(0, 6).forEach(function (p) { h += '<circle cx="' + r(cx + p[0] * R - R * .12) + '" cy="' + r(cy + p[1] * R - R * .14) + '" r="' + r(p[2] * R * .34) + '" fill="#7CCB6F" opacity=".9"/>'; });
    return h;
  }
  function trunk(top, w) { var d = 'M' + (50 - w) + ' 104 Q' + (50 - w * .6) + ' ' + ((104 + top) / 2) + ' ' + (50 - w * .4) + ' ' + top + ' L' + (50 + w * .4) + ' ' + top + ' Q' + (50 + w * .6) + ' ' + ((104 + top) / 2) + ' ' + (50 + w) + ' 104Z'; return '<path d="' + d + '" fill="#8D5A3B" stroke="' + OL + '" stroke-width="1.8" stroke-linejoin="round"/><path d="M' + (50 - w * .2) + ' 100 Q' + (50 - w * .3) + ' ' + ((104 + top) / 2) + ' ' + (50 - w * .1) + ' ' + (top + 6) + '" stroke="#B07A54" stroke-width="1.6" fill="none"/>'; }
  function treeBody(k, st) {
    var R = st === 3 ? 22 : st === 4 ? 27 : 31, cy = st === 3 ? 58 : st === 4 ? 52 : 47, h = trunk(cy + 6, st === 5 ? 7 : 5.5);
    h += '<path d="M50 ' + (cy + 18) + ' L' + (50 - R * .6) + ' ' + (cy + 4) + ' M50 ' + (cy + 14) + ' L' + (50 + R * .6) + ' ' + (cy + 2) + '" stroke="#5E3B24" stroke-width="4" stroke-linecap="round"/><path d="M50 ' + (cy + 18) + ' L' + (50 - R * .6) + ' ' + (cy + 4) + ' M50 ' + (cy + 14) + ' L' + (50 + R * .6) + ' ' + (cy + 2) + '" stroke="#8D5A3B" stroke-width="2.2" stroke-linecap="round"/>';
    h += crown(50, cy, R);
    if (st === 3) [[-12, -6], [8, -12], [14, 4], [-4, 6], [0, -18]].forEach(function (p) { h += '<g transform="translate(' + (50 + p[0]) + ',' + (cy + p[1]) + ') scale(.32)">' + bloom('sakura') + '</g>'; });
    var F = st === 4 ? [[-12, 2], [10, -8], [4, 10]] : st === 5 ? [[-18, 4], [-8, -12], [8, -16], [18, 0], [-2, 10], [12, 12], [-14, -4], [2, -2]] : [];
    F.forEach(function (p) { h += fruit(k, 50 + p[0], cy + p[1], st === 5 ? .9 : .8); });
    if (st === 5) h += fruit(k, 30, 101, .75);
    return h;
  }
  function vegBody(k, st) {
    var h = '';
    if (k === 'carot') {
      h = frond(50, 104, st === 3 ? .9 : st === 4 ? 1.15 : 1.35);
      if (st >= 4) h += '<path d="M43 ' + (st === 5 ? 92 : 102) + ' L57 ' + (st === 5 ? 92 : 102) + ' L53 110 L47 110Z" fill="#F77F00" stroke="' + OL + '" stroke-width="1.6" stroke-linejoin="round"/>';
      if (st === 5) h += '<path d="M46 98 L50 98 M48 103 L52 103" stroke="#C25E00" stroke-width="1.2"/>';
      return h;
    }
    if (k === 'bingo') {
      h = '<path d="M50 104 C40 90 24 96 18 84 M50 104 C62 92 80 98 84 86" stroke="' + OL + '" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M50 104 C40 90 24 96 18 84 M50 104 C62 92 80 98 84 86" stroke="#5B8A3C" stroke-width="3" fill="none" stroke-linecap="round"/>';
      h += leaf(24, 90, -150, .9) + leaf(74, 92, -40, .9) + leaf(46, 96, -110, 1) + leaf(56, 94, -70, .8);
      if (st === 3) h += '<g transform="translate(62,82) scale(.5)">' + bloom('mai') + '</g>';
      if (st >= 4) h += fruit('bingo', st === 5 ? 50 : 66, st === 5 ? 92 : 94, st === 5 ? 1.7 : 1);
      return h;
    }
    if (k === 'cachua') {
      h = '<path d="M62 104 L62 40" stroke="#C49A6C" stroke-width="3" stroke-linecap="round"/>' + stem(50, 104, 52, st === 3 ? 58 : 46, 6, 3.2) + leaf(51, 92, -160, .75) + leaf(51, 84, -20, .7) + leaf(52, 72, -150, .65) + leaf(52, 64, -30, .6);
      if (st === 3) [[44, 70], [58, 62]].forEach(function (p) { h += '<g transform="translate(' + p[0] + ',' + p[1] + ') scale(.3)">' + bloom('mai') + '</g>'; });
      (st === 4 ? [[42, 78, 0], [60, 66, 1]] : st === 5 ? [[40, 80, 1], [60, 70, 1], [44, 60, 1], [58, 52, 1], [50, 86, 1]] : []).forEach(function (p) { h += p[2] ? fruit('cachua', p[0], p[1], .85) : '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5.6" fill="#8BC34A" stroke="' + OL + '" stroke-width="1.3"/>'; });
      return h;
    }
    /* dâu tây: bụi lá 3 thuỳ, hoa trắng, quả đỏ thõng xuống */
    [[-150, 1], [-30, 1], [-100, .9], [-70, .95], [-125, .8], [-55, .8]].forEach(function (a) { h += stem(50, 104, r(50 + Math.cos(a[0] * Math.PI / 180) * 26), r(102 + Math.sin(a[0] * Math.PI / 180) * 30), 0, 2) + leaf(r(50 + Math.cos(a[0] * Math.PI / 180) * 26), r(102 + Math.sin(a[0] * Math.PI / 180) * 30), a[0], a[1] * .75); });
    if (st === 3) [[38, 82], [60, 78]].forEach(function (p) { h += '<g transform="translate(' + p[0] + ',' + p[1] + ') scale(.32)">' + bloom('daisy') + '</g>'; });
    (st === 4 ? [[34, 100], [66, 98]] : st === 5 ? [[30, 100], [44, 104], [58, 103], [70, 99], [50, 84]] : []).forEach(function (p) { h += fruit('dau', p[0], p[1], .95); });
    return h;
  }
  function bud(k, x, y) {
    var c = (ALL[k] || {}).c || '#FF9EC4';
    if (k === 'lav') return '<g transform="translate(' + x + ',' + y + ')"><ellipse cx="0" cy="0" rx="3" ry="7" fill="' + c + '" stroke="' + OL + '" stroke-width="1.2"/></g>';
    return '<g transform="translate(' + x + ',' + y + ')"><path d="M0 -12 C6 -8 7 0 0 4 C-7 0 -6 -8 0 -12Z" fill="' + c + '" stroke="' + OL + '" stroke-width="1.4"/><path d="M-6 0 Q-3 6 0 4 Q3 6 6 0 Q2 3 0 1 Q-2 3 -6 0Z" fill="#5DB65B" stroke="' + OL + '" stroke-width="1.1"/></g>';
  }
  var POT = '<path d="M29 112 L71 112 L66 138 Q65 141 62 141 L38 141 Q35 141 34 138Z" fill="#D9814F" stroke="' + OL + '" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<rect x="24" y="103" width="52" height="11" rx="5" fill="#E8935F" stroke="' + OL + '" stroke-width="1.8"/>' +
    '<ellipse cx="50" cy="105.5" rx="21" ry="3" fill="#7A4B30"/><path d="M37 118 L35.5 133" stroke="#F2AE82" stroke-width="3" stroke-linecap="round"/><path d="M28 106 L36 106" stroke="#F6B88E" stroke-width="2" stroke-linecap="round"/>';

  function body(k, st) {
    var h = '';
    if (st === 'wilt') {
      return stem(50, 104, 64, 66, -18, 3.4) + leaf(52, 92, 200, .7, '#B7A35A') + leaf(55, 82, -30, .6, '#A89150') +
        '<g transform="translate(70,74) rotate(150)"><path d="M0 -10 C5 -7 6 0 0 3 C-6 0 -5 -7 0 -10Z" fill="#B98A6A" stroke="' + OL + '" stroke-width="1.3"/></g>';
    }
    var grp = (ALL[k] || {}).g;
    if (st >= 3 && grp === 'tree') return treeBody(k, st);
    if (st >= 3 && grp === 'veg') return vegBody(k, st);
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

  /* ---------- NÉT IRASUTOYA: viền = màu nền đậm hơn (không dùng 1 màu nâu chung), nét hơi rung như vẽ tay,
     thêm hạt li ti như giấy. Mỗi hình được đóng thành 1 ảnh (data URI) và trình duyệt chỉ vẽ 1 lần rồi dùng lại → vườn vẫn nhẹ. ---------- */
  function dk(hex) {
    if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    var n = parseInt(hex.slice(1), 16), R = n >> 16, G = n >> 8 & 255, B = n & 255, L = (R * .3 + G * .59 + B * .11) / 255, f = L > .88 ? .74 : L > .6 ? .66 : .62;
    return '#' + [R, G, B].map(function (c) { return ('0' + Math.round(c * f).toString(16)).slice(-2); }).join('');
  }
  function ira(svg) {
    return svg.replace(/<(path|ellipse|circle|rect|polygon)\b([^>]*)>/g, function (m, tag, at) {
      if (at.indexOf('stroke="' + OL + '"') < 0) return m;
      var f = /fill="(#[0-9a-fA-F]{3,6})"/.exec(at), c = f ? dk(f[1]) : /fill="url/.test(at) ? '#A65A32' : '#3F7F35';
      return m.replace('stroke="' + OL + '"', 'stroke="' + c + '"');
    });
  }
  var URI = {};
  function uri(key, vb, inner, o) {
    if (URI[key]) return URI[key]; o = o || {};
    var flt = '<filter id="ira" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="' + (o.wf || .07) + '" numOctaves="2" seed="4" result="w"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="w" scale="' + (o.ws || 1.6) + '" xChannelSelector="R" yChannelSelector="G" result="d"/>' +
      '<feTurbulence type="fractalNoise" baseFrequency="' + (o.gf || .9) + '" numOctaves="1" seed="9" result="n"/>' +
      '<feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -14 0 0 0 6.3" result="sp"/>' +
      '<feComponentTransfer in="sp" result="sp1"><feFuncA type="linear" slope="' + (o.ga || .12) + '"/></feComponentTransfer>' +
      '<feComposite in="sp1" in2="d" operator="in" result="sp2"/><feMerge><feMergeNode in="d"/><feMergeNode in="sp2"/></feMerge></filter>';
    var doc = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '"' + (o.none ? ' preserveAspectRatio="none"' : '') + '><defs>' + flt + '</defs><g filter="url(#ira)">' + ira(inner) + '</g></svg>';
    return (URI[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(doc));
  }
  function img(u, x, y, w, h, none) { return '<image href="' + u + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' + (none ? ' preserveAspectRatio="none"' : '') + '/>'; }
  var PV = '-12 -14 124 172';
  /* 1 cây trong chậu. stage 0..5 hoặc 'wilt'. Thân (không gồm chậu) đung đưa nhờ class .ga-sway */
  function plant(k, stage, o) {
    o = o || {};
    if (!ALL[k]) k = 'sun';
    return '<svg class="ga" viewBox="0 0 100 145" aria-hidden="true" style="overflow:visible">' + img(uri('pot', PV, POT), -12, -14, 124, 172) +
      '<g class="ga-sway"' + (o.delay ? ' style="animation-delay:' + o.delay + 's"' : '') + '>' + img(uri('p' + k + stage, PV, body(k, stage)), -12, -14, 124, 172) + '</g>' +
      (o.special ? '<g class="ga-spark"><path d="M18 40 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#FFF6B0"/><path d="M82 28 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" fill="#E6F6FF"/><circle cx="74" cy="86" r="2" fill="#FFF"/></g>' : '') + '</svg>';
  }
  /* bông hoa / quả nhỏ (nút chọn loài): đặt trong <svg viewBox="-22 -26 44 44"> */
  function bloomImg(k) { return img(uri('c' + k, '-25 -29 50 50', bloom(k), { wf: .1, ws: .9, gf: 1.3 }), -25, -29, 50, 50); }
  function chip(k) { return '<svg viewBox="-22 -26 44 44" class="ga-chip" aria-hidden="true" style="overflow:visible">' + bloomImg(k) + '</svg>'; }

  /* ---------- đảo mây: viền nhấp nhô mềm + dây leo treo ---------- */
  function rng(seed) { var s = seed * 9301 + 49297; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  /* Đảo mây có chiều sâu: lớp mây sau (đậm) · thân mây · các cục bông phía trên tô sáng dần
     · bụng mây bo tròn phía dưới · viền mềm (filter) · dây leo treo · mây nhỏ trôi bên cạnh */
  function cloudRaw(seed) {
    var R = rng(seed + 3), id = 'gc' + seed, i, x, h = '';
    var puff = function (cx, cy, rx, ry, fill, extra) { return '<ellipse cx="' + r(cx) + '" cy="' + r(cy) + '" rx="' + r(rx) + '" ry="' + r(ry) + '" fill="' + fill + '"' + (extra || '') + '/>'; };
    /* dây leo (vẽ trước để chui ra từ bụng mây) */
    var vines = '';
    for (i = 0; i < 5; i++) {
      x = 120 + i * 190 + R() * 60; var L = 34 + R() * 44, sw = (R() - .5) * 40, y0 = 128;
      var vp = 'M' + r(x) + ' ' + y0 + ' q' + r(sw) + ' ' + r(L / 2) + ' ' + r(sw / 3) + ' ' + r(L);
      vines += '<path d="' + vp + '" stroke="' + OL + '" stroke-width="5" fill="none" stroke-linecap="round"/><path d="' + vp + '" stroke="#5DB65B" stroke-width="3" fill="none" stroke-linecap="round"/>';
      for (var j = 1; j <= 3; j++) vines += leaf(r(x + sw * j / 5), r(y0 + L * j / 3.4), j % 2 ? 30 : 150, .5);
      vines += '<path d="M' + r(x + sw / 3) + ' ' + r(y0 + L) + ' q4 6 0 9 q-4 2 -3 -2" stroke="#5DB65B" stroke-width="1.6" fill="none"/>';
    }
    /* lớp sau: cao hơn, đậm hơn → tạo chiều sâu */
    var back = '';
    for (i = 0; i < 8; i++) { x = 70 + i * 122 + R() * 30; back += puff(x, 46 + R() * 12, 70 + R() * 30, 34 + R() * 12, 'var(--cl3)', ' opacity=".75"'); }
    /* thân + cục bông trên + bụng dưới */
    var body = '<rect x="40" y="62" width="920" height="66" rx="33" fill="url(#' + id + 'b)"/>';
    for (i = 0; i < 9; i++) { x = 50 + i * 112 + R() * 20; body += puff(x, 128 + R() * 6, 62 + R() * 18, 22 + R() * 8, 'url(#' + id + 'u)'); }
    var tops = [];
    for (i = 0; i < 12; i++) { x = 40 + i * 84 + R() * 24; var ry = 30 + R() * 22; tops.push([x, 72 - R() * 10, 52 + R() * 26, ry]); }
    tops.forEach(function (p) { body += puff(p[0], p[1], p[2], p[3], 'url(#' + id + 't)'); });
    tops.forEach(function (p, k) { if (k % 2 === 0) body += puff(p[0] - p[2] * .3, p[1] - p[3] * .45, p[2] * .34, p[3] * .22, '#fff', ' opacity=".75"'); });
    /* bóng mềm dưới các chậu */
    /* mây nhỏ trôi kế bên */
    var mini = '<g class="ga-mini">' + puff(-18, 150, 30, 15, 'url(#' + id + 't)') + puff(4, 144, 22, 14, 'url(#' + id + 't)') + '</g>' +
      '<g class="ga-mini" style="animation-delay:-3s">' + puff(1012, 40, 26, 13, 'url(#' + id + 't)') + puff(1032, 46, 18, 10, 'url(#' + id + 't)') + '</g>';
    return '<svg class="ga-cloud" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true"><defs>' +
      '<radialGradient id="' + id + 't" cx=".38" cy=".3" r=".8"><stop offset="0" style="stop-color:var(--cl1,#fff)"/><stop offset=".55" style="stop-color:var(--cl1,#fff)"/><stop offset="1" style="stop-color:var(--cl2,#EEF0FF)"/></radialGradient>' +
      '<linearGradient id="' + id + 'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--cl2,#EEF0FF)"/><stop offset="1" style="stop-color:var(--cl3,#C9CDF5)"/></linearGradient>' +
      '<radialGradient id="' + id + 'u" cx=".5" cy=".2" r=".9"><stop offset="0" style="stop-color:var(--cl2,#EEF0FF)"/><stop offset="1" style="stop-color:var(--cl3,#C9CDF5)"/></radialGradient>' +
      '<filter id="' + id + 'o" x="-3%" y="-15%" width="106%" height="130%"><feMorphology in="SourceAlpha" operator="dilate" radius="2.4" result="d"/><feFlood style="flood-color:var(--clo,#8E93CC)" result="c"/><feComposite in="c" in2="d" operator="in" result="ol"/><feGaussianBlur in="ol" stdDeviation=".7" result="os"/><feMerge><feMergeNode in="os"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '</defs>' + vines + '<g>' + back + '</g><g filter="url(#' + id + 'o)">' + body + '</g>' + mini + '</svg>';
  }

  function pal() {
    var d = { cl1: '#F6F6FF', cl2: '#DCDFFF', cl3: '#A9AEE8', clo: '#6E73B8' };
    try { var cs = getComputedStyle(document.documentElement); Object.keys(d).forEach(function (k) { var v = cs.getPropertyValue('--' + k).trim(); if (/^#[0-9a-fA-F]{6}$/.test(v)) d[k] = v; }); } catch (e) {}
    return d;
  }
  function cloud(seed) {
    var P = pal(), raw = cloudRaw(seed), inner = raw.slice(raw.indexOf('>') + 1, raw.lastIndexOf('</svg>'));
    inner = inner.replace(/var\(--(cl1|cl2|cl3|clo)(,[^)]*)?\)/g, function (m, k) { return P[k]; });
    var u = uri('cl' + seed + P.cl1 + P.cl3 + P.clo, '-60 -20 1120 280', inner, { none: 1, wf: .018, ws: 5, gf: .32, ga: .1 });
    return '<svg class="ga-cloud" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true" style="overflow:visible">' + img(u, -60, -20, 1120, 280, 1) + '</svg>';
  }

  /* ---------- Cây đậu thần ở giữa vườn: 3 dây xoắn vào nhau, gốc to → ngọn nhỏ dần, cuộn tròn ở đỉnh;
     lá to hình tim, tua cuốn nhỏ dọc thân ---------- */
  function stalk(H) {
    H = Math.max(400, Math.round(H)); var W = 240, cx = 120, top = 60, out = '';
    var strand = function (ph, amp, wB, wT, col) {
      var L = [], Rr = [], y, step = 10;
      for (y = H; y >= top; y -= step) {
        var t = (H - y) / (H - top), a = amp * (1 - t * .55), x = cx + Math.sin(y / 120 + ph) * a, w = (wT + (wB - wT) * Math.pow(1 - t, 1.3)) / 2;
        var x2 = cx + Math.sin((y - 1) / 120 + ph) * a, dx = x2 - x, n = Math.sqrt(dx * dx + 1);
        L.push([x - w / n, y + dx * w / n]); Rr.push([x + w / n, y - dx * w / n]);
      }
      var d = 'M' + L.map(function (p) { return r(p[0]) + ' ' + r(p[1]); }).join(' L') + ' L' + Rr.reverse().map(function (p) { return r(p[0]) + ' ' + r(p[1]); }).join(' L') + 'Z';
      return '<path d="' + d + '" fill="' + col + '" stroke="' + OL + '" stroke-width="2.2" stroke-linejoin="round"/>';
    };
    var hi = function (ph, amp) { var d = '', y; for (y = H - 10; y >= top + 40; y -= 14) { var t = (H - y) / (H - top), x = cx + Math.sin(y / 120 + ph) * amp * (1 - t * .55) - 3 * (1 - t); d += (d ? ' L' : 'M') + r(x) + ' ' + y; } return '<path d="' + d + '" stroke="#A5DE8F" stroke-width="2.4" fill="none" opacity=".75" stroke-linecap="round"/>'; };
    var curl = function (x, y, s, dir) { var d = '', k; for (k = 0; k <= 26; k++) { var a = k * .42, rr = s * (1 - k / 30); d += (k ? ' L' : 'M') + r(x + Math.cos(a) * rr * dir) + ' ' + r(y - Math.sin(a) * rr); } return '<path d="' + d + '" stroke="' + OL + '" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="' + d + '" stroke="#66BB6A" stroke-width="1.8" fill="none" stroke-linecap="round"/>'; };
    var heart = function (x, y, ang, s) { return '<g transform="translate(' + r(x) + ',' + r(y) + ') rotate(' + ang + ') scale(' + r(s) + ')"><path d="M0 0 C6 -10 22 -14 30 -6 C36 0 32 10 22 12 C14 14 6 8 0 0Z" fill="#5DB65B" stroke="' + OL + '" stroke-width="1.8" stroke-linejoin="round"/><path d="M2 0 C10 -2 20 -2 28 -4" stroke="#3E8E41" stroke-width="1.2" fill="none"/><path d="M12 -2 L16 -8 M18 -3 L23 -9 M12 -1 L17 5" stroke="#3E8E41" stroke-width=".9"/><path d="M8 -6 C14 -10 20 -10 24 -7" stroke="#A5DE8F" stroke-width="1.6" fill="none" opacity=".8"/></g>'; };
    var leavesB = '', leavesF = '', y, i = 0;
    for (y = H - 70; y > top + 70; y -= 52, i++) {
      var t = (H - y) / (H - top), x = cx + Math.sin(y / 120) * 40 * (1 - t * .55), s = 1.7 - t * .9, side = i % 2 ? 1 : -1;
      var leafH = heart(x + side * 6, y, side > 0 ? -20 + (i % 3) * 10 : 200 - (i % 3) * 10, s);
      if (i % 3 === 1) leavesB += leafH; else leavesF += leafH;
      if (i % 2 === 0) leavesF += curl(x - side * 10, y - 26, 9 * s + 3, side);
      if (i % 4 === 3) leavesF += '<path d="M' + r(x) + ' ' + (y - 10) + ' q' + (side * 16) + ' -4 ' + (side * 20) + ' -16" stroke="' + OL + '" stroke-width="3" fill="none"/><path d="M' + r(x) + ' ' + (y - 10) + ' q' + (side * 16) + ' -4 ' + (side * 20) + ' -16" stroke="#7CCB6F" stroke-width="1.4" fill="none"/>' + leaf(r(x + side * 20), y - 26, side > 0 ? -60 : -120, .5);
    }
    out += strand(2.2, 46, 26, 4, '#3E9B4A') + leavesB + strand(4.3, 42, 22, 4, '#4CAF50') + strand(0, 40, 44, 6, '#5DB65B') + hi(0, 40) + leavesF;
    out += curl(cx + Math.sin(top / 120) * 40 * .45, top + 4, 26, 1) + curl(cx + Math.sin(top / 120 + 2.2) * 46 * .45 - 4, top + 28, 14, -1);
    /* rễ to bám vào mây dưới cùng */
    out += '<path d="M' + (cx - 16) + ' ' + H + ' q-18 -6 -30 2 M' + (cx + 16) + ' ' + H + ' q18 -6 30 2" stroke="' + OL + '" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M' + (cx - 16) + ' ' + H + ' q-18 -6 -30 2 M' + (cx + 16) + ' ' + H + ' q18 -6 30 2" stroke="#5DB65B" stroke-width="5.5" fill="none" stroke-linecap="round"/>';
    var u = uri('st' + H, '0 0 ' + W + ' ' + (H + 6), out, { wf: .035, ws: 3.2, gf: .55, ga: .1 });
    return '<svg viewBox="0 0 ' + W + ' ' + (H + 6) + '" width="' + W + '" height="' + (H + 6) + '" aria-hidden="true" style="overflow:visible">' + img(u, 0, 0, W, H + 6) + '</svg>';
  }

  /* ---------- Ngôi sao (nhặt trong vườn) ---------- */
  function star(sz) { return '<svg viewBox="-13 -13 26 26" width="' + (sz || 26) + '" height="' + (sz || 26) + '" aria-hidden="true">' + img(uri('star', '-14 -14 28 28', starRaw(), { wf: .15, ws: .6, gf: 2 }), -14, -14, 28, 28) + '</svg>'; }
  function starRaw() { return '<path d="M0 -11 L3.2 -3.6 L11 -3.4 L4.9 1.6 L7 9.4 L0 5 L-7 9.4 L-4.9 1.6 L-11 -3.4 L-3.2 -3.6Z" fill="#FFD43B" stroke="' + OL + '" stroke-width="1.6" stroke-linejoin="round"/><path d="M-1 -6 L1 -1.4 L-3 -1.4Z" fill="#FFF3B0"/><circle cx="-3" cy="2" r="1" fill="#E8590C" opacity=".6"/><circle cx="3" cy="2" r="1" fill="#E8590C" opacity=".6"/>'; }

  /* ---------- Thú giữ vườn (vẽ tay, quay mặt sang phải) ---------- */
  var ANIMALS = [
    { k: 'ga', n: 'Gà con', p: 10 }, { k: 'vit', n: 'Vịt', p: 15 }, { k: 'ech', n: 'Ếch', p: 15 }, { k: 'tho', n: 'Thỏ', p: 20 },
    { k: 'nhim', n: 'Nhím', p: 25 }, { k: 'meo', n: 'Mèo', p: 30 }, { k: 'cho', n: 'Cún', p: 35 }, { k: 'cao', n: 'Cáo', p: 45 },
    { k: 'cu', n: 'Cú đêm', p: 50 }, { k: 'panda', n: 'Gấu trúc', p: 60 }
  ];
  /* Vẽ lại kiểu Irasutoya: thân tròn mũm mĩm, mắt chấm đen, má hồng, viền cùng tông màu lông */
  function animal(k) {
    var S = ' stroke="' + OL + '" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"';
    var E = function (x, y) { return '<ellipse cx="' + x + '" cy="' + y + '" rx="1.5" ry="2" fill="#3B2A20"/>'; };
    var B = function (x, y) { return '<ellipse cx="' + x + '" cy="' + y + '" rx="2.6" ry="1.6" fill="#FF9EAA" opacity=".75"/>'; };
    var LEG = function (c, xs) { return xs.map(function (x) { return '<rect x="' + x + '" y="41" width="4.6" height="7" rx="2.2" fill="' + c + '"' + S + '/>'; }).join(''); };
    var TAIL = function (d, c1, c2) { return '<path d="' + d + '" stroke="' + c1 + '" stroke-width="6.2" fill="none" stroke-linecap="round"/><path d="' + d + '" stroke="' + c2 + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>'; };
    var b = '';
    switch (k) {
      case 'ga': b = '<path d="M27 46 l-2 4 M27 46 l1 4 M34 46 l-1 4 M34 46 l2 4" stroke="#F59F00" stroke-width="1.6" stroke-linecap="round"/>' +
        '<path d="M16 34 C16 22 24 15 33 15 C42 15 47 22 47 30 C47 40 40 47 31 47 C22 47 16 42 16 34Z" fill="#FFE45C"' + S + '/>' +
        '<path d="M31 15 C30 11 32 9 34 10 C33 12 34 13 35 12" fill="none" stroke="#E0B400" stroke-width="1.4" stroke-linecap="round"/>' +
        '<path d="M20 33 C22 28 29 29 30 34 C28 38 22 38 20 33Z" fill="#FFD43B"' + S + '/><path d="M46 27 L52 29 L46 31Z" fill="#FF922B"' + S + '/>' + E(40, 25) + B(41, 31); break;
      case 'vit': b = '<path d="M24 45 l-2 4 h4 M33 45 l-2 4 h4" stroke="#FF922B" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M14 33 L7 27 L16 29Z" fill="#FFFFFF"' + S + '/><ellipse cx="28" cy="36" rx="17" ry="10" fill="#FFFFFF"' + S + '/>' +
        '<circle cx="40" cy="21" r="9" fill="#FFFFFF"' + S + '/><path d="M47 19 C53 18 55 21 54 23 C52 25 48 24 47 23Z" fill="#FFA94D"' + S + '/>' +
        '<path d="M19 34 C23 29 31 30 33 35 C29 39 23 39 19 34Z" fill="#F1F3F5"' + S + '/>' + E(42, 19) + B(43, 24); break;
      case 'ech': b = '<ellipse cx="16" cy="47" rx="5" ry="2.4" fill="#8CE99A"' + S + '/><ellipse cx="44" cy="47" rx="5" ry="2.4" fill="#8CE99A"' + S + '/>' +
        '<path d="M12 42 C10 32 18 26 30 26 C42 26 50 32 48 42 C46 47 14 47 12 42Z" fill="#8CE99A"' + S + '/>' +
        '<circle cx="22" cy="25" r="6" fill="#8CE99A"' + S + '/><circle cx="38" cy="25" r="6" fill="#8CE99A"' + S + '/><ellipse cx="30" cy="42" rx="10" ry="3.4" fill="#D3F9D8"/>' +
        '<ellipse cx="22" cy="25" rx="1.9" ry="2.3" fill="#3B2A20"/><ellipse cx="38" cy="25" rx="1.9" ry="2.3" fill="#3B2A20"/>' +
        '<path d="M24 35 Q30 39.5 36 35" stroke="#2F9E44" stroke-width="1.5" fill="none" stroke-linecap="round"/>' + B(18, 36) + B(42, 36); break;
      case 'tho': b = '<circle cx="12" cy="36" r="4.4" fill="#FFFFFF"' + S + '/><path d="M35 20 C32 8 36 3 38.5 8 C39.5 12 39 17 38.5 20Z" fill="#FFFFFF"' + S + '/><path d="M41.5 19 C42 7 47.5 4 47.5 10 C47.5 14 44.5 18 43.5 20Z" fill="#FFFFFF"' + S + '/>' +
        '<ellipse cx="36.6" cy="12.5" rx="1.2" ry="4" fill="#FFC9D2" transform="rotate(-8 36.6 12.5)"/><ellipse cx="45" cy="12" rx="1.2" ry="4" fill="#FFC9D2" transform="rotate(18 45 12)"/>' +
        '<ellipse cx="18" cy="45.5" rx="5.4" ry="2.6" fill="#FFFFFF"' + S + '/><ellipse cx="26" cy="38" rx="14" ry="9" fill="#FFFFFF"' + S + '/><ellipse cx="36" cy="46" rx="4" ry="2.3" fill="#FFFFFF"' + S + '/>' +
        '<circle cx="41" cy="28" r="10" fill="#FFFFFF"' + S + '/>' + E(44, 27) + '<ellipse cx="50" cy="29.5" rx="1.3" ry="1" fill="#FF8FA3"/>' + B(44, 32); break;
      case 'nhim': b = '<ellipse cx="20" cy="45.5" rx="3.6" ry="2.2" fill="#F3D9B1"' + S + '/><ellipse cx="36" cy="45.5" rx="3.6" ry="2.2" fill="#F3D9B1"' + S + '/>' +
        '<path d="M10 42 C8 34 10 26 16 22 Q15 17 20 18 Q21 13 26 15 Q29 11 32 15 Q37 13 37 18 Q42 18 41 23 C44 28 44 36 40 42Z" fill="#A9805E"' + S + '/>' +
        '<path d="M18 28 l4 -3 M24 24 l4 -3 M30 23 l4 -2 M20 35 l4 -3 M28 31 l4 -3 M15 33 l3 -2" stroke="#7A5638" stroke-width="1.2" stroke-linecap="round"/>' +
        '<path d="M38 42 C36 34 40 28 46 30 C50 31 53 34 55 37 C53 41 46 43 38 42Z" fill="#F3D9B1"' + S + '/><circle cx="55" cy="37" r="1.6" fill="#3B2A20"/>' + E(46, 34) + B(46.5, 39); break;
      case 'meo': b = TAIL('M12 34 C4 32 4 22 9 19', '#C9702A', '#FFB067') + LEG('#FFB067', [16, 21.5, 30, 35.5]) +
        '<ellipse cx="26" cy="37" rx="15" ry="9" fill="#FFB067"' + S + '/><path d="M21 30 q1.4 3 0 6 M26.5 29 q1.4 3 0 6" stroke="#E8590C" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
        '<path d="M33 22 L33 12 L40.5 17Z" fill="#FFB067"' + S + '/><path d="M44.5 16 L51.5 11 L51.5 21Z" fill="#FFB067"' + S + '/>' +
        '<path d="M30 28 C30 20 36 16 42 16 C49 16 53 21 53 27 C53 33 48 36 42 36 C35 36 30 33 30 28Z" fill="#FFB067"' + S + '/>' +
        '<path d="M41 17 l.6 3.4 M44 17 l-.4 3.2" stroke="#E8590C" stroke-width="1.3" stroke-linecap="round"/>' + E(37.5, 26) + E(46.5, 26) +
        '<path d="M39.6 30 q1.4 1.6 2.6 0 q1.2 1.6 2.6 0" stroke="#8B4513" stroke-width="1.1" fill="none" stroke-linecap="round"/>' + B(35, 30.5) + B(49.5, 30.5); break;
      case 'cho': b = TAIL('M12 30 C6 28 6 20 12 20 C16 20 16 25 13 26', '#B86B2E', '#F2B272') + LEG('#F2B272', [16, 21.5, 31, 36.5]) +
        '<ellipse cx="27" cy="36" rx="16" ry="9.5" fill="#F2B272"' + S + '/><path d="M18 40 Q27 46 37 40 Q35 44.5 27 44.5 Q19 44.5 18 40Z" fill="#FFF4E6"/>' +
        '<path d="M34 19 L35 9 L41 15Z" fill="#F2B272"' + S + '/><path d="M44 15 L50 9 L51 19Z" fill="#F2B272"' + S + '/><circle cx="42" cy="26" r="10.5" fill="#F2B272"' + S + '/>' +
        '<path d="M44 29 C46 34 54 34 54 29 C54 26 48 25 44 29Z" fill="#FFF4E6"' + S + '/><ellipse cx="53" cy="28.4" rx="1.7" ry="1.3" fill="#3B2A20"/>' + E(43, 23.5) + B(39.5, 30) +
        '<path d="M32.5 30 Q36 33 34.5 36.5" stroke="#E03131" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="34.6" cy="37.4" r="1.8" fill="#FFD43B"' + S + '/>'; break;
      case 'cao': b = LEG('#8C4A22', [17, 22.5, 30, 35.5]) + '<path d="M14 36 C2 38 -2 26 6 20 C10 26 12 30 18 32Z" fill="#FF8A3D"' + S + '/><path d="M6 20 C3 22 2 26 4 28.5 C6.5 26.5 7.4 23 6 20Z" fill="#FFFFFF"/>' +
        '<ellipse cx="27" cy="37" rx="14" ry="8.5" fill="#FF8A3D"' + S + '/>' +
        '<path d="M37 21 L37 11 L43 17Z" fill="#FF8A3D"' + S + '/><path d="M44 17 L48 9 L50 19Z" fill="#FF8A3D"' + S + '/>' +
        '<path d="M34 30 C33 21 40 16 46 18 C50 19 52 23 54 27 L59 30 C55 33 48 34 42 33 C38 33 35 32 34 30Z" fill="#FF8A3D"' + S + '/>' +
        '<path d="M44 30 L58.5 30 C55 33.5 48 34 44 30Z" fill="#FFFFFF"/><circle cx="59" cy="30" r="1.5" fill="#3B2A20"/>' + E(46, 24) + B(45, 28.6); break;
      case 'cu': b = '<path d="M25 47.5 l0 3 M28 48 l0 3 M32 48 l0 3 M35 47.5 l0 3" stroke="#F59F00" stroke-width="1.8" stroke-linecap="round"/>' +
        '<path d="M19 16 L18 8.5 L24.5 13.5Z" fill="#A47551"' + S + '/><path d="M41 16 L42 8.5 L35.5 13.5Z" fill="#A47551"' + S + '/>' +
        '<path d="M16 32 C16 18 22 12 30 12 C38 12 44 18 44 32 C44 42 38 48 30 48 C22 48 16 42 16 32Z" fill="#A47551"' + S + '/>' +
        '<ellipse cx="30" cy="37" rx="9" ry="9.6" fill="#F1E3D3"/><path d="M25.5 34 q2 1.6 4 0 M30.5 34 q2 1.6 4 0 M28 39 q2 1.6 4 0" stroke="#C9A27E" stroke-width="1.1" fill="none" stroke-linecap="round"/>' +
        '<path d="M17 28 C12 32 13 40 19 42 C18 36 18 32 17 28Z" fill="#8C6239"' + S + '/><path d="M43 28 C48 32 47 40 41 42 C42 36 42 32 43 28Z" fill="#8C6239"' + S + '/>' +
        '<circle cx="24" cy="24" r="6" fill="#FFF8EC"' + S + '/><circle cx="36" cy="24" r="6" fill="#FFF8EC"' + S + '/>' +
        '<ellipse cx="24.6" cy="24.2" rx="2.2" ry="2.6" fill="#3B2A20"/><ellipse cx="35.4" cy="24.2" rx="2.2" ry="2.6" fill="#3B2A20"/><path d="M28.4 27.6 L30 31 L31.6 27.6Z" fill="#FAB005"' + S + '/>'; break;
      case 'panda': b = LEG('#3B3B3B', [16, 21.5, 31, 36.5]) + '<ellipse cx="28" cy="35" rx="16" ry="10.5" fill="#FFFFFF"' + S + '/><path d="M20 27.5 C24 31 32 31 36 27.5 L37 38 C33 41 23 41 19 38Z" fill="#3B3B3B"/>' +
        '<circle cx="34.5" cy="14.5" r="4" fill="#3B3B3B"' + S + '/><circle cx="49.5" cy="14.5" r="4" fill="#3B3B3B"' + S + '/><circle cx="42" cy="24" r="11" fill="#FFFFFF"' + S + '/>' +
        '<ellipse cx="38.4" cy="23" rx="3.2" ry="4" fill="#3B3B3B" transform="rotate(-20 38.4 23)"/><ellipse cx="46.6" cy="23" rx="3.2" ry="4" fill="#3B3B3B" transform="rotate(20 46.6 23)"/>' +
        '<circle cx="39" cy="22.6" r="1" fill="#FFFFFF"/><circle cx="46" cy="22.6" r="1" fill="#FFFFFF"/><ellipse cx="42.5" cy="27.6" rx="1.9" ry="1.3" fill="#3B3B3B"/>' +
        '<path d="M41 29.5 q1.5 1.4 3 0" stroke="#3B3B3B" stroke-width="1" fill="none" stroke-linecap="round"/>' + B(35.6, 28.6) + B(49.4, 28.6) +
        '<path d="M50 40 L56 24" stroke="#5FB86A" stroke-width="2.8" stroke-linecap="round"/><path d="M52.4 33.6 l3 -.6 M54 29 l3 -.4" stroke="#3F8A4A" stroke-width="1"/><path d="M55.6 25 C59 23 60 20 58.4 19 C57 21 56 22.4 55.6 25Z" fill="#8CE99A"/>'; break;
    }
    return '<svg viewBox="0 0 60 52" class="ga-an" aria-hidden="true" style="overflow:visible">' + img(uri('a' + k, '-6 -6 72 64', b, { wf: .09, ws: 1.1, gf: 1.1 }), -6, -6, 72, 64) + '</svg>';
  }

  window.GardenArt = { FLOWERS: FLOWERS, SPECIALS: SPECIALS, ALL: ALL, ANIMALS: ANIMALS, plant: plant, chip: chip, cloud: cloud, bloom: bloomImg, stalk: stalk, star: star, animal: animal };
})();
