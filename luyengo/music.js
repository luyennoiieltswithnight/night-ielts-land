/* Night IELTS — nhạc nền kiểu game (tự tạo bằng Web Audio, không dùng file nhạc có bản quyền).
   Hộp nhạc + đệm hợp âm êm, vòng 8 ô nhịp, lặp vô hạn. Tự nhỏ lại khi có giọng đọc (NVMusic.duck()).
   NVMusic.start() / stop() / toggle() / on() — nhớ lựa chọn bật/tắt trong máy (localStorage 'nv-music'). */
(function () {
  var silent = null, ctx = null, master = null, timer = 0, step = 0, nextT = 0, playing = false, duckT = 0;
  var BPM = 84, SPB = 60 / BPM / 2; /* 1 bước = nốt móc đơn */
  /* vòng hợp âm (giọng F trưởng): F – C/E – Dm – Bb – F – C – Bb – C */
  var CH = [[53, 57, 60], [52, 55, 60], [50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55], [46, 50, 53], [48, 52, 55]];
  /* giai điệu hộp nhạc (ngũ cung F: F G A C D), 16 bước / ô nhịp, -1 = nghỉ */
  var MEL = [
    [77, -1, 81, -1, 84, -1, 81, 79, 77, -1, -1, -1, 74, -1, 77, -1],
    [76, -1, 79, -1, 84, -1, 79, -1, 76, -1, 74, -1, 72, -1, -1, -1],
    [74, -1, 77, -1, 81, -1, 77, 76, 74, -1, -1, -1, 69, -1, 72, -1],
    [70, -1, 74, -1, 77, -1, 79, -1, 81, -1, 79, -1, 77, -1, -1, -1],
    [77, -1, 81, -1, 84, -1, 86, -1, 84, -1, 81, -1, 79, -1, 77, -1],
    [76, -1, 79, -1, 84, -1, -1, 81, 79, -1, 76, -1, 72, -1, -1, -1],
    [74, -1, 77, -1, 82, -1, 81, -1, 79, -1, 77, -1, 74, -1, 70, -1],
    [72, -1, 76, -1, 79, -1, 84, -1, 81, -1, 79, -1, 76, -1, -1, -1]
  ];
  var hz = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
  function init() {
    if (ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    /* vang nhẹ bằng delay phản hồi */
    var dly = ctx.createDelay(1); dly.delayTime.value = SPB * 3;
    var fbk = ctx.createGain(); fbk.gain.value = 0.32;
    var wet = ctx.createGain(); wet.gain.value = 0.35;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    master.connect(lp); lp.connect(ctx.destination);
    master.connect(dly); dly.connect(fbk); fbk.connect(dly); dly.connect(wet); wet.connect(lp);
  }
  function bell(m, t, vol, dur) {
    var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = hz(m); o2.type = 'sine'; o2.frequency.value = hz(m) * 2.01;
    var g2 = ctx.createGain(); g2.gain.value = 0.18;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(master);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function pad(notes, t, dur) {
    notes.forEach(function (m) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = hz(m); o.detune.value = (Math.random() - 0.5) * 8;
      o.connect(g); g.connect(master);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + 0.6); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur + 0.1);
    });
  }
  function bass(m, t) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = hz(m - 12);
    o.connect(g); g.connect(master);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + SPB * 3.5);
    o.start(t); o.stop(t + SPB * 4);
  }
  function tick() {
    while (nextT < ctx.currentTime + 0.25) {
      var bar = Math.floor(step / 16) % 8, s = step % 16, ch = CH[bar];
      if (s === 0) pad(ch, nextT, SPB * 16);
      if (s === 0 || s === 8) bass(ch[0], nextT);
      if (s % 4 === 2) bell(ch[(s / 4 | 0) % 3] + 12, nextT, 0.025, 0.5); /* rải hợp âm nhẹ */
      var n = MEL[bar][s]; if (n > 0) bell(n, nextT, 0.07, 1.4);
      nextT += SPB; step++;
    }
  }
  function fade(v, sec) { if (!master) return; var t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(v, t + sec); }
  var VOL = 0.55;
  var api = {
    start: function () {
      init(); if (!ctx || playing) return;
      /* iPhone/iPad: phát 1 file im lặng lặp lại để nhạc vẫn kêu khi gạt nút im lặng (âm thanh web chuyển sang kênh "media") */
      try { if (!silent) { silent = new Audio('data:audio/wav;base64,UklGRvQHAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YdAHAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=='); silent.loop = true; silent.setAttribute('playsinline', ''); silent.volume = 0.01; } silent.play().catch(function () {}); } catch (e) {}
      if (ctx.state === 'suspended') ctx.resume();
      playing = true; nextT = ctx.currentTime + 0.1;
      timer = setInterval(tick, 60); tick(); fade(VOL, 1.5);
    },
    stop: function () { if (!playing) return; playing = false; try { silent && silent.pause(); } catch (e) {} fade(0, 0.6); setTimeout(function () { if (!playing) clearInterval(timer); }, 700); },
    on: function () { try { return localStorage.getItem('nv-music') !== '0'; } catch (e) { return true; } },
    toggle: function () { var v = !api.on(); try { localStorage.setItem('nv-music', v ? '1' : '0'); } catch (e) {} if (v) api.start(); else api.stop(); return v; },
    /* nhỏ nhạc lại khi giọng đọc phát (~2,5 giây) */
    duck: function (ms) { if (!playing) return; fade(0.12, 0.15); clearTimeout(duckT); duckT = setTimeout(function () { if (playing) fade(VOL, 0.8); }, ms || 2500); },
    playing: function () { return playing; }
  };
  window.NVMusic = api;
  /* trình duyệt chỉ cho phát âm thanh sau lần chạm / bấm đầu tiên */
  var first = function () { document.removeEventListener('pointerdown', first, true); document.removeEventListener('keydown', first, true); if (api.on()) api.start(); };
  document.addEventListener('pointerdown', first, true); document.addEventListener('keydown', first, true);
  document.addEventListener('visibilitychange', function () { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (playing) ctx.resume(); });
})();
