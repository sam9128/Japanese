export function getJapaneseVoices() {
  if (!("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith("ja"));
}

export function speakJapanese(text, { rate = 0.85, voiceURI = "" } = {}) {
  if (!("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = rate;
  const voice = getJapaneseVoices().find((item) => item.voiceURI === voiceURI) || getJapaneseVoices()[0];
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeech() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
