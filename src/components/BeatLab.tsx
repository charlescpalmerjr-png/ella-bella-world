"use client";

// PASS 08 — Beat Lab: a real 16-step drum sequencer (Master Research spec, System 3).
// Edit the grid, set tempo and swing, play on the audio clock, save automatically,
// record the mix to an audio file, and export/import patterns as validated JSON.

import React, { useEffect, useRef, useState } from "react";
import { BeatEngine } from "@/lib/beat/engine";
import { BPM_MAX, BPM_MIN, DRUMS, PRESETS, STEPS, SWING_MAX, validatePattern, type BeatPattern, type DrumId } from "@/lib/beat/pattern";
import { loadPattern, savePattern } from "@/lib/beat/patternStore";

const DRUM_UI: Record<DrumId, { label: string; on: string }> = {
  kick: { label: "🥁 Kick", on: "bg-pink-500" },
  snare: { label: "🪘 Snare", on: "bg-cyan-500" },
  hat: { label: "✨ Hi-hat", on: "bg-amber-400" },
  clap: { label: "👏🏽 Clap", on: "bg-purple-500" },
};

type Props = { earnStars: (pts: number) => void };

export default function BeatLab({ earnStars }: Props) {
  const [pattern, setPattern] = useState<BeatPattern>(() => PRESETS[0].pattern());
  const patternRef = useRef(pattern);
  const engineRef = useRef<BeatEngine | null>(null);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState<string>("Tap squares to make your beat, then press Play!");
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const recordStarted = useRef(0);

  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);

  // Restore the last pattern once.
  useEffect(() => {
    let cancelled = false;
    loadPattern("current").then((p) => {
      if (cancelled) return;
      if (p) setPattern(p);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave (debounced) after edits.
  useEffect(() => {
    if (!loaded) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void savePattern("current", pattern), 300);
  }, [pattern, loaded]);

  // Stop audio when leaving the tab/component.
  useEffect(() => () => engineRef.current?.stop(), []);

  const ensureEngine = async () => {
    if (engineRef.current) return engineRef.current;
    const e = await BeatEngine.create(() => patternRef.current);
    if (!e) {
      setMessage("Sound isn't available in this browser.");
      return null;
    }
    e.onStep = setStep;
    engineRef.current = e;
    return e;
  };

  const update = (fn: (p: BeatPattern) => BeatPattern) =>
    setPattern((p) => ({ ...fn(p), updatedAt: new Date().toISOString() }));

  const toggleCell = async (drum: DrumId, i: number) => {
    update((p) => ({ ...p, tracks: { ...p.tracks, [drum]: p.tracks[drum].map((v, j) => (j === i ? !v : v)) } }));
    if (!patternRef.current.tracks[drum][i] && !playing) (await ensureEngine())?.preview(drum);
  };

  const togglePlay = async () => {
    const e = await ensureEngine();
    if (!e) return;
    if (e.playing) {
      if (e.recording) await finishRecording();
      e.stop();
      setPlaying(false);
    } else {
      e.start();
      setPlaying(true);
      setMessage("🎶 Playing! Change squares, tempo or swing while it plays.");
    }
  };

  const finishRecording = async () => {
    const e = engineRef.current;
    if (!e) return;
    const result = await e.stopRecording();
    setRecording(false);
    if (!result) {
      setMessage("Recording didn't capture any sound. Try again while the beat plays.");
      return;
    }
    const ext = result.mimeType.includes("mp4") ? "m4a" : result.mimeType.includes("ogg") ? "ogg" : "webm";
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ella-bella-beat.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (e.currentTime - recordStarted.current > 3) earnStars(25); // stars only for a real recording (3 s+)
    setMessage(`💾 Saved your beat as an audio file (${ext}).`);
  };

  const toggleRecord = async () => {
    const e = await ensureEngine();
    if (!e) return;
    if (e.recording) return finishRecording();
    if (!BeatEngine.recordingSupported() || !e.startRecording()) {
      setMessage("Recording isn't supported in this browser. You can still play and save your pattern.");
      return;
    }
    recordStarted.current = e.currentTime; // audio clock, seconds
    setRecording(true);
    if (!e.playing) {
      e.start();
      setPlaying(true);
    }
    setMessage("🔴 Recording… press Stop Recording when you're done.");
  };

  const loadPreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (preset) setPattern(preset.pattern());
  };

  const exportPattern = () => {
    const blob = new Blob([JSON.stringify(pattern, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ella-bella-beat-pattern.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importPattern = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 20_000) return setMessage("That file is too big to be a beat pattern.");
    try {
      const p = validatePattern(JSON.parse(await file.text()));
      if (!p) return setMessage("That file isn't a valid Ella Bella beat pattern.");
      setPattern(p);
      setMessage("✅ Pattern loaded!");
    } catch {
      setMessage("That file isn't a valid Ella Bella beat pattern.");
    }
  };

  const btn = "px-4 py-2 rounded-full font-black text-sm cursor-pointer border-2 border-white shadow disabled:opacity-50";

  return (
    <div className="bg-white rounded-[2rem] p-4 sm:p-5 border-4 border-purple-400 shadow-md space-y-3" data-testid="beat-lab">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg sm:text-xl font-black text-slate-900">🥁 Beat Lab: Make Your Own Beat</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={togglePlay} className={`${btn} ${playing ? "bg-rose-500 text-white" : "bg-teal-400 text-slate-950"}`} data-testid="beat-play">
            {playing ? "⏹️ Stop" : "▶️ Play"}
          </button>
          <button onClick={toggleRecord} className={`${btn} ${recording ? "bg-red-600 text-white animate-pulse" : "bg-slate-900 text-white"}`} data-testid="beat-record">
            {recording ? "⏺️ Stop Recording" : "🔴 Record"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Starter beats">
        {PRESETS.map((p) => (
          <button key={p.id} onClick={() => loadPreset(p.id)} className="px-3 py-1.5 rounded-full bg-purple-100 text-purple-900 font-black text-xs cursor-pointer">
            {p.name}
          </button>
        ))}
      </div>

      {/* Grid: scrolls sideways on narrow phones; beats shaded every 4 steps */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[640px] space-y-1.5" data-testid="beat-grid">
          {DRUMS.map((d) => (
            <div key={d} className="flex items-center gap-1">
              {/* Opaque sticky backing so scrolled steps never show behind the label */}
              <div className="sticky left-0 z-10 shrink-0 bg-white pr-1 self-stretch flex items-center shadow-[6px_0_6px_-4px_rgba(15,23,42,0.18)]">
                <button
                  onClick={async () => (await ensureEngine())?.preview(d)}
                  className="w-20 sm:w-24 text-left px-2 py-2 rounded-xl bg-slate-100 font-black text-[11px] sm:text-xs cursor-pointer"
                  aria-label={`Hear ${d}`}
                >
                  {DRUM_UI[d].label}
                </button>
              </div>
              {Array.from({ length: STEPS }, (_, i) => {
                const on = pattern.tracks[d][i];
                const isNow = step === i;
                return (
                  <button
                    key={i}
                    onClick={() => void toggleCell(d, i)}
                    aria-label={`${d} step ${i + 1} ${on ? "on" : "off"}`}
                    aria-pressed={on}
                    data-cell={`${d}-${i}`}
                    className={`flex-1 min-w-[30px] h-10 rounded-lg border-2 cursor-pointer transition ${
                      on ? `${DRUM_UI[d].on} border-white` : Math.floor(i / 4) % 2 === 0 ? "bg-slate-100 border-slate-200" : "bg-slate-200 border-slate-300"
                    } ${isNow ? "ring-4 ring-yellow-300 scale-105" : ""}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex items-center gap-3 bg-slate-50 rounded-2xl px-3 py-2">
          <span className="font-black text-xs w-24">Tempo {pattern.bpm} BPM</span>
          <input
            type="range"
            min={BPM_MIN}
            max={BPM_MAX}
            value={pattern.bpm}
            onChange={(e) => update((p) => ({ ...p, bpm: Number(e.target.value) }))}
            className="flex-1"
            aria-label="Tempo"
          />
        </label>
        <label className="flex items-center gap-3 bg-slate-50 rounded-2xl px-3 py-2">
          <span className="font-black text-xs w-24">Swing {Math.round(pattern.swing * 100)}%</span>
          <input
            type="range"
            min={0}
            max={Math.round(SWING_MAX * 100)}
            value={Math.round(pattern.swing * 100)}
            onChange={(e) => update((p) => ({ ...p, swing: Number(e.target.value) / 100 }))}
            className="flex-1"
            aria-label="Swing"
          />
        </label>
      </div>

      <p className="text-sm font-bold text-slate-700" data-testid="beat-message">{message}</p>

      <details className="bg-slate-50 rounded-2xl p-3 text-xs">
        <summary className="font-black cursor-pointer">👨‍👩‍👧 Grown-ups: save or load a pattern file</summary>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button onClick={exportPattern} className="px-3 py-1.5 rounded-full bg-slate-900 text-white font-black cursor-pointer">⬇️ Export pattern (.json)</button>
          <label className="px-3 py-1.5 rounded-full bg-slate-200 font-black cursor-pointer">
            ⬆️ Import pattern
            <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => void importPattern(e.target.files?.[0])} />
          </label>
          <span className="opacity-80">Your beat is also saved automatically on this device. Drum sounds are original, made in code.</span>
        </div>
      </details>
    </div>
  );
}
