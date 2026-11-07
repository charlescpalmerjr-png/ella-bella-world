// PASS 05 — honest pronunciation check (pure, unit-tested).
// The old mic feature praised the child in every case: no recognizer, recognizer error,
// or any words at all. Now feedback depends on how closely what was heard matches the target.

/** Lowercase, strip accents, punctuation and emoji; collapse spaces. */
export function normalizeSpeech(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** 0..1 similarity between what was heard and the target phrase. */
export function similarity(heard: string, target: string): number {
  const h = normalizeSpeech(heard);
  const t = normalizeSpeech(target);
  if (!h || !t) return 0;
  if (h === t || h.includes(t)) return 1;
  return 1 - levenshtein(h, t) / Math.max(h.length, t.length);
}

export type PronunciationVerdict = "match" | "close" | "miss";

/** Best verdict across the recognizer's alternatives. */
export function judgePronunciation(alternatives: string[], target: string): { verdict: PronunciationVerdict; heard: string; score: number } {
  let best = { heard: alternatives[0] ?? "", score: 0 };
  for (const alt of alternatives) {
    const score = similarity(alt, target);
    if (score > best.score) best = { heard: alt, score };
  }
  const verdict: PronunciationVerdict = best.score >= 0.8 ? "match" : best.score >= 0.5 ? "close" : "miss";
  return { verdict, ...best };
}
