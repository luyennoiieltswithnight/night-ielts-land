/* Night IELTS — giọng đọc thầy/trò tự chọn ở /giong-doc.html (lưu localStorage nightVoice_en / _zh / _vi).
   Bọc speechSynthesis.speak: câu tiếng nào thì dùng giọng đã chọn cho tiếng đó. */
(function () {
  try {
    if (window.__nightVoicePref || !window.speechSynthesis) return;
    window.__nightVoicePref = 1;
    var orig = speechSynthesis.speak.bind(speechSynthesis), origCancel = speechSynthesis.cancel.bind(speechSynthesis);
    var cur = null;
    function stopG() { if (cur) { try { cur.a.pause(); } catch (e) {} var c = cur; cur = null; if (c.u.onend) try { c.u.onend({}); } catch (e) {} } }
    // Giọng Google (online, miễn phí) — phát từng đoạn ≤180 ký tự
    function speakGoogle(u, k) {
      stopG();
      var tl = k === 'zh' ? 'zh-CN' : k === 'vi' ? 'vi' : (/gb/i.test(u.lang || '') ? 'en-GB' : 'en-US');
      var text = String(u.text || ''), parts = [], m, re = /[^.!?。！？]+[.!?。！？]*\s*/g;
      while ((m = re.exec(text))) { var x = m[0]; while (x.length > 180) { var cut = x.lastIndexOf(' ', 180); if (cut < 40) cut = 180; parts.push(x.slice(0, cut)); x = x.slice(cut); } if (x.trim()) parts.push(x); }
      if (!parts.length) parts = [text];
      var slow = (u.rate || 1) < 0.8, i = 0, h = 0, me = { u: u, a: null };
      var HOSTS = [
        function (q) { return 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' + tl + '&ttsspeed=' + (slow ? '0.4' : '1') + '&q=' + encodeURIComponent(q); },
        function (q) { return 'https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=' + tl + '&ttsspeed=' + (slow ? '0.4' : '1') + '&q=' + encodeURIComponent(q); }
      ];
      var a = me.a = new Audio(); // 1 phần tử dùng lại cho mọi đoạn — iOS chỉ cho phát khi tạo trong lúc bấm
      a.preload = 'auto';
      cur = me;
      function noRef(on) { // Google chặn khi có Referer → tạm tắt Referer trong lúc tải tiếng
        try { var m = document.getElementById('nv-noref'); if (on && !m) { m = document.createElement('meta'); m.id = 'nv-noref'; m.name = 'referrer'; m.content = 'no-referrer'; document.head.appendChild(m); } if (!on && m) m.remove(); } catch (e) {}
      }
      function report(t) { window.__nightTTSLast = t; try { window.dispatchEvent(new CustomEvent('night-tts-status', { detail: t })); } catch (e) {} }
      function giveUp(why) { noRef(false); report('lỗi: ' + why); if (cur === me) { cur = null; try { orig(u); } catch (e) {} } }
      function load() {
        noRef(true);
        a.src = HOSTS[h](parts[i].trim());
        var pr = a.play();
        if (pr && pr.catch) pr.catch(function (e) { if (cur !== me) return; if (h + 1 < HOSTS.length && !/NotAllowed/i.test(e && e.name || '')) { h++; load(); } else giveUp((e && e.name) || 'play'); });
      }
      a.onplaying = function () { noRef(false); report('đang đọc (Google ' + (h + 1) + ')'); if (i === 0 && u.onstart) try { u.onstart({}); } catch (e) {} };
      a.onerror = function () { if (cur !== me) return; var c = a.error ? a.error.code : '?'; if (h + 1 < HOSTS.length) { h++; load(); } else giveUp('mã ' + c); };
      a.onended = function () { if (cur !== me) return; i++; if (i >= parts.length) { cur = null; report('xong'); if (u.onend) try { u.onend({}); } catch (e) {} return; } load(); };
      load();
    }
    speechSynthesis.cancel = function () { stopG(); return origCancel(); };
    speechSynthesis.speak = function (u) {
      try {
        var l = String(u.lang || (u.voice && u.voice.lang) || '').toLowerCase();
        var k = /^zh|^cmn/.test(l) ? 'zh' : /^vi/.test(l) ? 'vi' : /^en/.test(l) ? 'en' : '';
        var want = k && localStorage.getItem('nightVoice_' + k);
        if (want === '__google') { speakGoogle(u, k); return; }
        if (want) {
          var v = (speechSynthesis.getVoices() || []).find(function (x) { return x.voiceURI === want || x.name === want; });
          if (v) { u.voice = v; u.lang = v.lang; }
        }
      } catch (e) {}
      return orig(u);
    };
    speechSynthesis.getVoices();
  } catch (e) {}
})();
