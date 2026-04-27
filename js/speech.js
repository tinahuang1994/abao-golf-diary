// Speech — Web Speech API wrapper for iOS Safari

export function createSpeechInput(micBtn, textarea, labelEl) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRec) {
    micBtn.style.display = 'none';
    if (labelEl) labelEl.style.display = 'none';
    return;
  }

  let rec = null;
  let listening = false;

  micBtn.addEventListener('click', () => {
    if (listening) {
      rec && rec.stop();
      return;
    }

    rec = new SpeechRec();
    rec.lang = 'zh-CN';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      listening = true;
      micBtn.classList.add('listening');
      micBtn.textContent = '🔴';
      if (labelEl) labelEl.textContent = '说完了就点我';
    };

    rec.onresult = e => {
      const text = e.results[0][0].transcript;
      textarea.value = (textarea.value ? textarea.value + ' ' : '') + text;
    };

    rec.onerror = () => {
      reset();
    };

    rec.onend = () => {
      reset();
    };

    rec.start();
  });

  function reset() {
    listening = false;
    micBtn.classList.remove('listening');
    micBtn.textContent = '🎙️';
    if (labelEl) labelEl.textContent = '点击说话';
  }
}
