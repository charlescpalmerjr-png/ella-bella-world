// PASS 04 — word variety and quiz options for the runner (pure functions, unit-tested).

type Rand = () => number;

export function shuffle<T>(items: readonly T[], rand: Rand = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Shuffle-bag of indexes 0..size-1: every word appears once before any repeats, and the
 * first word of a new round is never the same as the last word of the previous round.
 */
export function createWordBag(size: number, rand: Rand = Math.random) {
  let bag: number[] = [];
  let last = -1;
  return function next(): number {
    if (bag.length === 0) {
      bag = shuffle(Array.from({ length: size }, (_, i) => i), rand);
      if (size > 1 && bag[bag.length - 1] === last) {
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
    }
    last = bag.pop() as number;
    return last;
  };
}

/** Quiz choices: always the correct item plus (count - 1) different random items, shuffled. */
export function buildQuizOptions<T>(correct: T, pool: readonly T[], count = 3, rand: Rand = Math.random): T[] {
  const others = shuffle(pool.filter((item) => item !== correct), rand).slice(0, count - 1);
  return shuffle([correct, ...others], rand);
}
