// PASS 08 — Beat Lab audio engine (Master Research spec System 3 §1, §2, §4).
// - Drum sounds: original sounds synthesized ONCE into AudioBuffers with OfflineAudioContext
//   (no third-party samples, no licensing). Each hit = new AudioBufferSourceNode.start(when).
//   A verified CC0 sample pack can replace these buffers later without changing the scheduler.
// - Timing: 25 ms setTimeout lookahead scheduling 100 ms ahead on AudioContext.currentTime.
// - Recording: master -> MediaStreamAudioDestinationNode -> MediaRecorder (app audio only, no mic).
// MDN: OfflineAudioContext, AudioBufferSourceNode, MediaStreamAudioDestinationNode, MediaRecorder.

import { getAudioContext } from "@/lib/audio";
import { DRUMS, LOOKAHEAD_MS, scheduleWindow, type BeatPattern, type DrumId, type SchedulerState, type ScheduledStep } from "./pattern";

type Synth = (ctx: OfflineAudioContext) => void;

function noiseBuffer(ctx: BaseAudioContext, seconds: number) {
  const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

const SYNTHS: Record<DrumId, Synth> = {
  kick: (ctx) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, 0);
    o.frequency.exponentialRampToValueAtTime(45, 0.13);
    g.gain.setValueAtTime(1, 0);
    g.gain.exponentialRampToValueAtTime(0.001, 0.42);
    o.connect(g).connect(ctx.destination);
    o.start(0);
    o.stop(0.45);
  },
  snare: (ctx) => {
    const n = ctx.createBufferSource();
    n.buffer = noiseBuffer(ctx, 0.25);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1200;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.7, 0);
    ng.gain.exponentialRampToValueAtTime(0.001, 0.2);
    n.connect(hp).connect(ng).connect(ctx.destination);
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = 185;
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.5, 0);
    og.gain.exponentialRampToValueAtTime(0.001, 0.1);
    o.connect(og).connect(ctx.destination);
    n.start(0);
    o.start(0);
    o.stop(0.12);
  },
  hat: (ctx) => {
    const n = ctx.createBufferSource();
    n.buffer = noiseBuffer(ctx, 0.08);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, 0);
    g.gain.exponentialRampToValueAtTime(0.001, 0.06);
    n.connect(hp).connect(g).connect(ctx.destination);
    n.start(0);
  },
  clap: (ctx) => {
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1500;
    bp.Q.value = 0.8;
    bp.connect(ctx.destination);
    for (const [t, len, amp] of [[0, 0.02, 0.8], [0.012, 0.02, 0.7], [0.024, 0.18, 0.6]] as const) {
      const n = ctx.createBufferSource();
      n.buffer = noiseBuffer(ctx, len);
      const g = ctx.createGain();
      g.gain.setValueAtTime(amp, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + len);
      n.connect(g).connect(bp);
      n.start(t);
    }
  },
};

async function renderDrum(sampleRate: number, synth: Synth): Promise<AudioBuffer> {
  const off = new OfflineAudioContext(1, Math.ceil(sampleRate * 0.5), sampleRate);
  synth(off);
  return off.startRendering();
}

export type StepListener = (step: number) => void;

export class BeatEngine {
  private ctx: AudioContext;
  private master: GainNode;
  private buffers = new Map<DrumId, AudioBuffer>();
  private timer: number | undefined;
  private raf = 0;
  private state: SchedulerState = { nextStep: 0, nextStepTime: 0 };
  private visualQueue: ScheduledStep[] = [];
  private live = new Set<AudioBufferSourceNode>();
  private recDest: MediaStreamAudioDestinationNode | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  getPattern: () => BeatPattern;
  onStep: StepListener = () => {};
  playing = false;

  private constructor(ctx: AudioContext, getPattern: () => BeatPattern) {
    this.ctx = ctx;
    this.getPattern = getPattern;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);
  }

  /** Create the engine and pre-render all drum buffers (call from a user gesture). */
  static async create(getPattern: () => BeatPattern): Promise<BeatEngine | null> {
    const ctx = getAudioContext();
    if (!ctx) return null;
    const engine = new BeatEngine(ctx, getPattern);
    const rendered = await Promise.all(DRUMS.map((d) => renderDrum(ctx.sampleRate, SYNTHS[d])));
    DRUMS.forEach((d, i) => engine.buffers.set(d, rendered[i]));
    return engine;
  }

  /** Play one drum now (row-label preview taps). */
  preview(drum: DrumId) {
    this.playAt(drum, this.ctx.currentTime);
  }

  private playAt(drum: DrumId, when: number) {
    const buf = this.buffers.get(drum);
    if (!buf) return;
    const src = this.ctx.createBufferSource(); // single-use node per hit (MDN)
    src.buffer = buf;
    src.connect(this.master);
    src.onended = () => this.live.delete(src);
    this.live.add(src);
    src.start(when);
  }

  private tick = () => {
    if (!this.playing) return;
    const p = this.getPattern();
    const r = scheduleWindow(this.state, this.ctx.currentTime, p.bpm, p.swing);
    this.state = r.state;
    for (const ev of r.events) {
      for (const d of DRUMS) if (p.tracks[d][ev.step]) this.playAt(d, ev.time);
      this.visualQueue.push(ev);
    }
    this.timer = window.setTimeout(this.tick, LOOKAHEAD_MS);
  };

  private draw = () => {
    if (!this.playing) return;
    const now = this.ctx.currentTime;
    let latest: ScheduledStep | undefined;
    while (this.visualQueue.length && this.visualQueue[0].time <= now) latest = this.visualQueue.shift();
    if (latest) this.onStep(latest.step);
    this.raf = requestAnimationFrame(this.draw);
  };

  start() {
    if (this.playing) return; // no duplicate scheduler loops
    void this.ctx.resume().catch(() => {});
    this.playing = true;
    this.state = { nextStep: 0, nextStepTime: this.ctx.currentTime + 0.06 };
    this.visualQueue = [];
    this.tick();
    this.raf = requestAnimationFrame(this.draw);
  }

  stop() {
    this.playing = false;
    window.clearTimeout(this.timer);
    cancelAnimationFrame(this.raf);
    const now = this.ctx.currentTime;
    for (const src of this.live) {
      try {
        src.stop(now); // silence already-scheduled future hits
      } catch {
        // already ended
      }
    }
    this.live.clear();
    this.visualQueue = [];
    this.onStep(-1);
  }

  get currentTime() {
    return this.ctx.currentTime;
  }

  // ---- Recording the app's own mix (no microphone) ----
  static recordingSupported() {
    return typeof window !== "undefined" && typeof MediaRecorder !== "undefined";
  }

  startRecording(): boolean {
    if (!BeatEngine.recordingSupported() || this.recorder) return false;
    if (!this.recDest) {
      this.recDest = this.ctx.createMediaStreamDestination();
      this.master.connect(this.recDest);
    }
    // PASS 08.1: prefer MP4/AAC (.m4a) - plays natively on iPhone/iPad, Mac, Windows, Android.
    // WebM is only a fallback: iOS can record it but cannot play it from Files.
    const mimeType = ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((t) =>
      MediaRecorder.isTypeSupported(t)
    );
    try {
      this.recorder = mimeType ? new MediaRecorder(this.recDest.stream, { mimeType }) : new MediaRecorder(this.recDest.stream);
    } catch {
      this.recorder = null;
      return false;
    }
    this.chunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data.size) this.chunks.push(e.data);
    };
    this.recorder.start();
    return true;
  }

  /** Stops recording; resolves with the file and its real MIME type (never assumed). */
  stopRecording(): Promise<{ blob: Blob; mimeType: string } | null> {
    const rec = this.recorder;
    if (!rec) return Promise.resolve(null);
    return new Promise((resolve) => {
      rec.onstop = () => {
        const mimeType = rec.mimeType || "audio/webm";
        const blob = new Blob(this.chunks, { type: mimeType });
        this.recorder = null;
        this.chunks = [];
        resolve(blob.size ? { blob, mimeType } : null);
      };
      rec.stop();
    });
  }

  get recording() {
    return this.recorder !== null;
  }
}
