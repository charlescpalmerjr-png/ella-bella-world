// PASS 06 — Learn & Quiz teaching engine: Leitner-style spaced retrieval (pure logic).
//
// Evidence vs. product policy (per Master Research spec, Nov 2026):
//  - Research supports REPEATED SPACED RETRIEVAL for young children (Leonard et al. 2021, 2024;
//    Gordon & Lowry 2024). It does NOT prove any specific interval schedule is optimal.
//  - The box intervals, mastery threshold and new-word limits below are Ella Bella PRODUCT
//    SETTINGS to validate with real children, not research findings or ACTFL rules.

export const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30] as const; // product setting
export const RECOGNITION_MASTERY_BOX = 4; // reached after independent success at the 1-, 3- and 7-day reviews
export const NEW_WORDS_PER_SESSION = { "5-6": 3, "7-8": 4 } as const; // product setting (spec range: 2-3 / 3-5)
export const MIN_ITEMS_BEFORE_RETRY = 2; // a missed item returns after at least two other items

export type Box = 0 | 1 | 2 | 3 | 4 | 5;
export type AgeBand = keyof typeof NEW_WORDS_PER_SESSION;

export type WordProgress = {
  profileId: string;
  wordId: string;
  curriculumVersion: number;
  box: Box;
  recognitionMastered: boolean;
  productionVerified: boolean; // never set from multiple choice; no verified speech assessment exists yet
  independentCorrect: number;
  assistedCorrect: number;
  incorrect: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
};

export type Attempt = { correct: boolean; assisted: boolean };

const DAY_MS = 24 * 60 * 60 * 1000;

export function newProgress(profileId: string, wordId: string, curriculumVersion: number): WordProgress {
  return {
    profileId,
    wordId,
    curriculumVersion,
    box: 0,
    recognitionMastered: false,
    productionVerified: false,
    independentCorrect: 0,
    assistedCorrect: 0,
    incorrect: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
  };
}

/**
 * Apply one scored retrieval attempt.
 *  - independent correct: advance one box; next review = now + that box's interval
 *  - correct after a hint: counted, but the box does not advance
 *  - incorrect: back to the learning stage (box 0), due again now
 * Intervals count from the actual review time, not the originally scheduled date.
 */
export function recordAttempt(p: WordProgress, a: Attempt, now: Date): WordProgress {
  const next: WordProgress = { ...p, lastReviewedAt: now.toISOString() };
  // Spacing guard: a word only advances when it is actually due (or brand new). A second
  // correct answer in the same session counts, but cannot skip ahead a box.
  const eligible = p.nextReviewAt === null || isDue(p, now);
  if (a.correct && !a.assisted && !eligible) {
    next.independentCorrect = p.independentCorrect + 1;
  } else if (a.correct && !a.assisted) {
    const box = Math.min(p.box + 1, 5) as Box;
    next.box = box;
    next.independentCorrect = p.independentCorrect + 1;
    next.nextReviewAt = new Date(now.getTime() + BOX_INTERVAL_DAYS[box] * DAY_MS).toISOString();
    if (box >= RECOGNITION_MASTERY_BOX) next.recognitionMastered = true;
  } else if (a.correct && a.assisted) {
    next.assistedCorrect = p.assistedCorrect + 1;
    next.nextReviewAt = p.nextReviewAt ?? now.toISOString();
  } else {
    next.incorrect = p.incorrect + 1;
    next.box = 0;
    next.nextReviewAt = now.toISOString();
    // A failed maintenance review means "needs practice", not "never learned":
    // recognitionMastered stays true as history; status() reports needs-practice.
  }
  return next;
}

export type WordStatus = "new" | "learning" | "reviewing" | "mastered" | "needs-practice";

export function status(p: WordProgress | undefined): WordStatus {
  if (!p || (p.lastReviewedAt === null && p.box === 0)) return "new";
  if (p.box === 0) return p.recognitionMastered ? "needs-practice" : "learning";
  if (p.box >= RECOGNITION_MASTERY_BOX) return "mastered";
  return "reviewing";
}

export function isDue(p: WordProgress, now: Date): boolean {
  return p.nextReviewAt !== null && new Date(p.nextReviewAt).getTime() <= now.getTime();
}

export type Step = "hear" | "match" | "recall";
export type SessionItem = { wordId: string; step: Step };

/**
 * Build today's session. Due reviews come first (most overdue first), then up to
 * `newLimit` new words. New words go Hear -> Match -> Recall; reviews go Match -> Recall.
 */
export function buildSession(
  wordIds: readonly string[],
  progress: ReadonlyMap<string, WordProgress>,
  now: Date,
  newLimit: number
): SessionItem[] {
  const due = wordIds
    .map((id) => progress.get(id))
    .filter((p): p is WordProgress => !!p && p.lastReviewedAt !== null && isDue(p, now))
    .sort((a, b) => new Date(a.nextReviewAt!).getTime() - new Date(b.nextReviewAt!).getTime());
  const fresh = wordIds.filter((id) => !progress.get(id) || progress.get(id)!.lastReviewedAt === null).slice(0, newLimit);

  const items: SessionItem[] = [];
  for (const p of due) items.push({ wordId: p.wordId, step: "match" }, { wordId: p.wordId, step: "recall" });
  for (const id of fresh) items.push({ wordId: id, step: "hear" }, { wordId: id, step: "match" }, { wordId: id, step: "recall" });
  return items;
}

/** After a miss, put the item back at least MIN_ITEMS_BEFORE_RETRY items later (or at the end). */
export function requeueAfterMiss(queue: SessionItem[], index: number): SessionItem[] {
  const item = queue[index];
  const copy = queue.slice();
  const insertAt = Math.min(index + 1 + MIN_ITEMS_BEFORE_RETRY, copy.length);
  copy.splice(insertAt, 0, item);
  return copy;
}

/** Earliest upcoming review across all words (for the "come back on..." message). */
export function nextReviewDate(progress: ReadonlyMap<string, WordProgress>, now: Date): Date | null {
  let best: number | null = null;
  for (const p of progress.values()) {
    if (!p.nextReviewAt) continue;
    const t = new Date(p.nextReviewAt).getTime();
    if (t > now.getTime() && (best === null || t < best)) best = t;
  }
  return best === null ? null : new Date(best);
}
