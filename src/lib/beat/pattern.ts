// PASS 08 — Beat Lab pattern model + timing math (pure; unit-tested).
// Master Research spec System 3 §3, §5. The swing model and BPM/swing ranges are product
// design choices (not W3C requirements); the step/bar formulas are standard 4/4 math.

export const DRUMS = ["kick", "snare", "hat", "clap"] as const;
export type DrumId = (typeof DRUMS)[number];
export const STEPS = 16;
export const BPM_MIN = 70;
export const BPM_MAX = 140;
export const SWING_MAX = 0.45;

export type BeatPattern = {
  version: 1;
  bpm: number;
  swing: number; // 0..0.45 of one step
  tracks: Record<DrumId, boolean[]>; // exactly 16 each
  samplePackId: string;
  createdAt: string;
  updatedAt: string;
};

/** One sixteenth-note step: 60 / (4 * BPM) seconds. */
export const stepDuration = (bpm: number) => 60 / (4 * bpm);
/** One 4/4 bar of 16 steps: 240 / BPM seconds. */
export const barDuration = (bpm: number) => 240 / bpm;
/** Swing delays odd steps by swing * stepDuration; the grid (and bar length) is unchanged. */
export const swingOffset = (step: number, bpm: number, swing: number) => (step % 2 === 1 ? swing * stepDuration(bpm) : 0);

const row = (s: string) => s.split("").map((c) => c === "x");

export function makePattern(rows: Record<DrumId, string>, bpm = 92, swing = 0, now = new Date()): BeatPattern {
  const tracks = Object.fromEntries(DRUMS.map((d) => [d, row(rows[d].padEnd(STEPS, "."))])) as Record<DrumId, boolean[]>;
  const t = now.toISOString();
  return { version: 1, bpm, swing, tracks, samplePackId: "synth-v1", createdAt: t, updatedAt: t };
}

export const PRESETS: { id: string; name: string; pattern: () => BeatPattern }[] = [
  {
    id: "boom-bap",
    name: "🎤 Boom Bap",
    pattern: () => makePattern({ kick: "x.....x...x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", clap: "................" }, 90, 0.2),
  },
  {
    id: "dembow",
    name: "💃🏽 Dembow",
    pattern: () => makePattern({ kick: "x...x...x...x...", snare: "...x..x....x..x.", hat: "x.x.x.x.x.x.x.x.", clap: "................" }, 96, 0),
  },
  {
    id: "clap-party",
    name: "👏🏽 Clap Party",
    pattern: () => makePattern({ kick: "x.......x.......", snare: "................", hat: "xxxxxxxxxxxxxxxx", clap: "....x.......x..x" }, 110, 0.1),
  },
  {
    id: "empty",
    name: "🧹 Empty",
    pattern: () => makePattern({ kick: "", snare: "", hat: "", clap: "" }, 92, 0),
  },
];

/** Validate an imported/stored pattern. Returns a clean copy or null (never trusts input). */
export function validatePattern(input: unknown): BeatPattern | null {
  if (!input || typeof input !== "object") return null;
  const p = input as Record<string, unknown>;
  if (p.version !== 1) return null;
  if (typeof p.bpm !== "number" || !Number.isFinite(p.bpm) || p.bpm < BPM_MIN || p.bpm > BPM_MAX) return null;
  if (typeof p.swing !== "number" || !Number.isFinite(p.swing) || p.swing < 0 || p.swing > SWING_MAX) return null;
  if (!p.tracks || typeof p.tracks !== "object") return null;
  const tracks = {} as Record<DrumId, boolean[]>;
  for (const d of DRUMS) {
    const t = (p.tracks as Record<string, unknown>)[d];
    if (!Array.isArray(t) || t.length !== STEPS || !t.every((v) => typeof v === "boolean")) return null;
    tracks[d] = t.slice();
  }
  const str = (v: unknown, fallback: string) => (typeof v === "string" && v.length < 64 ? v : fallback);
  const now = new Date().toISOString();
  return {
    version: 1,
    bpm: Math.round(p.bpm),
    swing: p.swing,
    tracks,
    samplePackId: str(p.samplePackId, "synth-v1"),
    createdAt: str(p.createdAt, now),
    updatedAt: str(p.updatedAt, now),
  };
}

// ---- Scheduler core (Chris Wilson, "A Tale of Two Clocks"; MDN "Creating and sequencing audio") ----
export const LOOKAHEAD_MS = 25;
export const SCHEDULE_AHEAD_S = 0.1;

export type SchedulerState = { nextStep: number; nextStepTime: number };
export type ScheduledStep = { step: number; time: number };

/**
 * Pure scheduling step: return every step whose (grid) time falls before now + ahead,
 * with swing applied, and the advanced state. If the clock has run past the next step
 * (e.g. the tab was hidden and timers were throttled), realign to just ahead of now
 * instead of playing the missed steps in a burst.
 */
export function scheduleWindow(
  state: SchedulerState,
  now: number,
  bpm: number,
  swing: number,
  ahead = SCHEDULE_AHEAD_S
): { events: ScheduledStep[]; state: SchedulerState; realigned: boolean } {
  let { nextStep, nextStepTime } = state;
  let realigned = false;
  if (nextStepTime < now - 0.05) {
    nextStepTime = now + 0.05;
    realigned = true;
  }
  const events: ScheduledStep[] = [];
  while (nextStepTime < now + ahead) {
    events.push({ step: nextStep, time: nextStepTime + swingOffset(nextStep, bpm, swing) });
    nextStep = (nextStep + 1) % STEPS;
    nextStepTime += stepDuration(bpm);
  }
  return { events, state: { nextStep, nextStepTime }, realigned };
}
