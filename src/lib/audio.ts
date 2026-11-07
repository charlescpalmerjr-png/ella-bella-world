// PASS 03 — one shared Web Audio context for the whole app.
// MDN (Web Audio API best practices; AudioContext.resume(); BaseAudioContext.state):
// browsers may start a context "suspended" until a user gesture, and iOS Safari can
// move it to "interrupted" after app switches / screen lock. Creating a new context
// per sound (the previous behaviour) leaks resources, so every sound reuses this one.

type AudioCtxCtor = typeof AudioContext;

let sharedContext: AudioContext | null = null;

function getCtor(): AudioCtxCtor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioCtxCtor }).webkitAudioContext ||
    null
  );
}

/** Ask a non-running context to resume. Rejections are ignored; the next gesture retries. */
function requestResume(ctx: AudioContext) {
  if (ctx.state !== "running" && ctx.state !== "closed") {
    void ctx.resume().catch(() => {});
  }
}

/**
 * Returns the shared AudioContext, creating it on first use (or if it was closed),
 * and nudges it to resume if suspended/interrupted. Returns null if Web Audio is unavailable.
 */
export function getAudioContext(): AudioContext | null {
  const Ctor = getCtor();
  if (!Ctor) return null;
  try {
    if (!sharedContext || sharedContext.state === "closed") {
      sharedContext = new Ctor();
    }
    requestResume(sharedContext);
    return sharedContext;
  } catch {
    return null;
  }
}

/**
 * Call directly from a user gesture (pointerdown / keydown). Creates or resumes the
 * shared context so later sounds - including ones fired from timers or the game loop - can play.
 */
export function unlockAudio(): void {
  getAudioContext();
}
