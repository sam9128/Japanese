import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "nihongo-stairs-progress-v1";

function readProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? { ratings: {}, learned: 0, streak: 1 };
  } catch {
    return { ratings: {}, learned: 0, streak: 1 };
  }
}

export function useStudyState(data) {
  const [mode, setMode] = useState("vocab");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [progress, setProgress] = useState(readProgress);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const mistakes = useMemo(() => {
    const all = [...data.vocab, ...data.grammar];
    return all.filter((card) => progress.ratings[card.id] === "hard");
  }, [data, progress.ratings]);

  const cards = mode === "vocab" ? data.vocab : mode === "grammar" ? data.grammar : mistakes;
  const safeIndex = cards.length ? index % cards.length : 0;
  const card = cards[safeIndex] ?? null;

  function selectMode(nextMode) {
    setMode(nextMode);
    setIndex(0);
    setRevealed(false);
  }

  function move(delta) {
    if (!cards.length) return;
    setIndex((current) => (current + delta + cards.length) % cards.length);
    setRevealed(false);
  }

  function rate(value) {
    if (!card) return;
    setProgress((current) => ({
      ...current,
      learned: Math.min(100, current.learned + (value === "again" ? 0 : 1)),
      ratings: { ...current.ratings, [card.id]: value },
    }));
    move(1);
  }

  function resetProgress() {
    const next = { ratings: {}, learned: 0, streak: 1 };
    setProgress(next);
    setIndex(0);
    setRevealed(false);
  }

  return { mode, selectMode, index: safeIndex, cards, card, revealed, setRevealed, move, rate, progress, mistakes, resetProgress };
}
