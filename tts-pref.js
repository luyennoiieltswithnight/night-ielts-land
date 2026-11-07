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
      var text = String(u.text || ''), parts = [], m, re = /[^.!?。！？;；,，]+[.!?。！？;；,，]*\s*/g;
      while ((m = re.exec(text))) { var x = m[0]; while (x.length > 180) { var cut = x.lastIndexOf(' ', 180); if (cut < 40) cut = 180; parts.push(x.slice(0, cut)); x = x.slice(cut); } if (x.trim()) parts.push(x); }
      if (!parts.length) parts = [text];
      var slow = (u.rate || 1) < 0.8, i = 0, me = { u: u, a: null };
      cur = me;
      function next() {
        if (cur !== me) return;
        if (i >= parts.length) { cur = null; if (u.onend) try { u.onend({}); } catch (e) {} return; }
        var a = new Audio('https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' + tl + '&ttsspeed=' + (slow ? '0.4' : '1') + '&q=' + encodeURIComponent(parts[i++].trim()));
        me.a = a; a.onended = next; a.onerror = function () { cur = null; orig(u); };
        if (i === 1 && u.onstart) try { u.onstart({}); } catch (e) {}
        a.play().catch(function () { if (cur === me) { cur = null; orig(u); } });
      }
      next();
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
