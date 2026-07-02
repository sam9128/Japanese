import { useEffect, useRef, useState } from "react";
import { SpeakerIcon } from "./icons";

export default function SpeakerButton({ text }) {
  const [playing, setPlaying] = useState(false);
  const utteranceRef = useRef(null);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function play() {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/～/g, ""));
    utterance.lang = "ja-JP";
    utterance.rate = 0.82;
    const japaneseVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("ja"));
    if (japaneseVoice) utterance.voice = japaneseVoice;
    utterance.onstart = () => setPlaying(true);
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className={`speaker-wrap ${playing ? "is-playing" : ""}`}>
      <button className="speaker-button" onClick={play} aria-label={`播放日文發音：${text}`} type="button">
        <SpeakerIcon size={42} />
      </button>
      <span>{playing ? "發音播放中  0.8×" : "播放日文發音"}</span>
    </div>
  );
}
