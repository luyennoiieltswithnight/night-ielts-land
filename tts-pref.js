/* Night IELTS — giọng đọc thầy/trò tự chọn ở /giong-doc.html (lưu localStorage nightVoice_en / _zh / _vi).
   Bọc speechSynthesis.speak: câu tiếng nào thì dùng giọng đã chọn cho tiếng đó. */
(function () {
  try {
    if (window.__nightVoicePref || !window.speechSynthesis) return;
    window.__nightVoicePref = 1;
    var orig = speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak = function (u) {
      try {
        var l = String(u.lang || (u.voice && u.voice.lang) || '').toLowerCase();
        var k = /^zh|^cmn/.test(l) ? 'zh' : /^vi/.test(l) ? 'vi' : /^en/.test(l) ? 'en' : '';
        var want = k && localStorage.getItem('nightVoice_' + k);
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
