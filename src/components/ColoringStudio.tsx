"use client";

// PASS 07 — professional coloring studio (Master Research spec, System 2).
// Layers: paint canvas (bottom) + line-art canvas (top, pointer-events: none), both at a
// fixed 1280x960 document size and displayed at 4:3 so nothing is stretched.
// Input: Pointer Events (mouse, finger, pen) on the stage only (touch-action: none),
// pointer capture, coalesced events where available, pen pressure, best-effort palm rejection.
// Tools: brush, bucket (scanline fill bounded by the line art), eraser.
// History: one undo step per gesture, region patches, 30 steps / 32 MiB.
// Autosave per page to IndexedDB; PNG download via toBlob. No upload, no external sharing.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { boundaryMask, floodFill, hexToRgb, type Rect } from "@/lib/coloring/fill";
import { History } from "@/lib/coloring/history";
import { DOC_H, DOC_W, TEMPLATES, svgDataUrl } from "@/lib/coloring/templates";
import { deleteArt, loadArt, saveArt } from "@/lib/coloring/artStore";
import type { SpeechLang, SpeechSegment } from "@/lib/speech";

type Tool = "brush" | "bucket" | "eraser";
const SIZES = [
  { id: "S", px: 10, label: "Fine" },
  { id: "M", px: 26, label: "Medium" },
  { id: "L", px: 56, label: "Thick" },
] as const;

type Props = {
  palette: string[];
  speakInstant: (input: string | SpeechSegment[], lang?: SpeechLang) => void;
  earnStars: (pts: number) => void;
};

function crop(full: Uint8ClampedArray, r: Rect): Uint8ClampedArray {
  const out = new Uint8ClampedArray(r.w * r.h * 4);
  for (let row = 0; row < r.h; row++) {
    const src = ((r.y + row) * DOC_W + r.x) * 4;
    out.set(full.subarray(src, src + r.w * 4), row * r.w * 4);
  }
  return out;
}

function clampRect(x0: number, y0: number, x1: number, y1: number): Rect {
  const x = Math.max(0, Math.floor(x0));
  const y = Math.max(0, Math.floor(y0));
  const xe = Math.min(DOC_W, Math.ceil(x1));
  const ye = Math.min(DOC_H, Math.ceil(y1));
  return { x, y, w: Math.max(1, xe - x), h: Math.max(1, ye - y) };
}

export default function ColoringStudio({ palette, speakInstant, earnStars }: Props) {
  const paintRef = useRef<HTMLCanvasElement | null>(null);
  const artRef = useRef<HTMLCanvasElement | null>(null);
  const maskRef = useRef<Uint8Array | null>(null);
  const historyRef = useRef(new History());
  const strokeRef = useRef<{
    pointerId: number;
    pointerType: string;
    snapshot: Uint8ClampedArray;
    last: { x: number; y: number };
    minX: number; minY: number; maxX: number; maxY: number;
    maxW: number;
  } | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const rewardedRef = useRef(new Set<string>());

  const [templateIdx, setTemplateIdx] = useState(0);
  const [tool, setTool] = useState<Tool>("bucket");
  const [color, setColor] = useState(palette[0] ?? "#ec4899");
  const [size, setSize] = useState<number>(SIZES[1].px);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [ready, setReady] = useState(false);

  const template = TEMPLATES[templateIdx];
  const paintCtx = () => paintRef.current?.getContext("2d", { willReadFrequently: true }) ?? null;
  const syncHistory = () => setHistoryState({ canUndo: historyRef.current.canUndo, canRedo: historyRef.current.canRedo });

  const scheduleSave = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    setSaveState("saving");
    const id = template.id;
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = undefined;
      paintRef.current?.toBlob(async (blob) => {
        if (!blob) return setSaveState("error");
        setSaveState((await saveArt(id, blob)) ? "saved" : "error");
      }, "image/png");
    }, 400);
  }, [template.id]);

  // Load a page: draw its line art, build the fill mask, restore saved paint.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setReady(false);
      const art = artRef.current?.getContext("2d", { willReadFrequently: true });
      const paint = paintCtx();
      if (!art || !paint) return;
      const img = new Image();
      img.width = DOC_W;
      img.height = DOC_H;
      img.src = svgDataUrl(template.svg);
      try {
        await img.decode();
      } catch {
        return;
      }
      if (cancelled) return;
      art.clearRect(0, 0, DOC_W, DOC_H);
      art.drawImage(img, 0, 0, DOC_W, DOC_H);
      maskRef.current = boundaryMask(art.getImageData(0, 0, DOC_W, DOC_H).data, DOC_W, DOC_H);

      paint.globalCompositeOperation = "source-over";
      paint.fillStyle = "#ffffff";
      paint.fillRect(0, 0, DOC_W, DOC_H);
      const saved = await loadArt(template.id);
      if (cancelled) return;
      if (saved) {
        try {
          const bmp = await createImageBitmap(saved.paint);
          paint.drawImage(bmp, 0, 0, DOC_W, DOC_H);
          bmp.close();
        } catch {
          // corrupt save: start fresh
        }
      }
      historyRef.current.clear();
      syncHistory();
      setSaveState(saved ? "saved" : "idle");
      setReady(true);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [template]);

  const toDoc = (e: { clientX: number; clientY: number }) => {
    const r = paintRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * DOC_W, y: ((e.clientY - r.top) / r.height) * DOC_H };
  };

  const strokeWidth = (e: React.PointerEvent | PointerEvent) =>
    e.pointerType === "pen" && e.pressure > 0 ? size * (0.4 + e.pressure * 1.2) : size;

  const drawSegment = (from: { x: number; y: number }, to: { x: number; y: number }, width: number) => {
    const ctx = paintCtx();
    if (!ctx) return;
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ready) return;
    if (!e.isPrimary) return; // ignore extra fingers
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.pointerType === "touch" && strokeRef.current?.pointerType === "pen") return; // palm rejection
    const ctx = paintCtx();
    const mask = maskRef.current;
    if (!ctx || !mask) return;
    const p = toDoc(e);

    if (tool === "bucket") {
      const img = ctx.getImageData(0, 0, DOC_W, DOC_H);
      const before = img.data.slice();
      const rect = floodFill(img.data, mask, DOC_W, DOC_H, p.x, p.y, hexToRgb(color));
      if (!rect) return;
      ctx.putImageData(img, 0, 0, rect.x, rect.y, rect.w, rect.h);
      historyRef.current.push({ ...rect, before: crop(before, rect), after: crop(img.data, rect) });
      syncHistory();
      scheduleSave();
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    const w = strokeWidth(e);
    strokeRef.current = {
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      snapshot: ctx.getImageData(0, 0, DOC_W, DOC_H).data,
      last: p,
      minX: p.x, minY: p.y, maxX: p.x, maxY: p.y,
      maxW: w,
    };
    drawSegment(p, p, w); // a tap makes a dot
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = strokeRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    const native = e.nativeEvent as PointerEvent;
    const samples = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
    const events = samples.length ? samples : [native];
    for (const ev of events) {
      const p = toDoc(ev);
      const w = strokeWidth(ev);
      drawSegment(s.last, p, w);
      s.last = p;
      s.maxW = Math.max(s.maxW, w);
      s.minX = Math.min(s.minX, p.x); s.minY = Math.min(s.minY, p.y);
      s.maxX = Math.max(s.maxX, p.x); s.maxY = Math.max(s.maxY, p.y);
    }
  };

  const endStroke = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = strokeRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    strokeRef.current = null;
    const ctx = paintCtx();
    if (!ctx) return;
    const pad = s.maxW / 2 + 2;
    const rect = clampRect(s.minX - pad, s.minY - pad, s.maxX + pad, s.maxY + pad);
    historyRef.current.push({ ...rect, before: crop(s.snapshot, rect), after: ctx.getImageData(rect.x, rect.y, rect.w, rect.h).data });
    syncHistory();
    scheduleSave();
  };

  const applyPatch = (which: "undo" | "redo") => {
    const ctx = paintCtx();
    if (!ctx) return;
    const p = which === "undo" ? historyRef.current.undo() : historyRef.current.redo();
    if (!p) return;
    const data = which === "undo" ? p.before : p.after;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(data), p.w, p.h), p.x, p.y);
    syncHistory();
    scheduleSave();
  };

  const clearPage = async () => {
    const ctx = paintCtx();
    if (!ctx) return;
    const before = ctx.getImageData(0, 0, DOC_W, DOC_H).data;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, DOC_W, DOC_H);
    const after = ctx.getImageData(0, 0, DOC_W, DOC_H).data;
    historyRef.current.push({ x: 0, y: 0, w: DOC_W, h: DOC_H, before, after }); // Clear is undoable
    syncHistory();
    await deleteArt(template.id);
    setSaveState("idle");
  };

  const download = () => {
    const paint = paintRef.current;
    const art = artRef.current;
    if (!paint || !art) return;
    const out = document.createElement("canvas");
    out.width = DOC_W;
    out.height = DOC_H;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(paint, 0, 0);
    ctx.drawImage(art, 0, 0);
    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ella-bella-${template.id}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (!rewardedRef.current.has(template.id)) {
        rewardedRef.current.add(template.id);
        earnStars(30);
      }
      speakInstant([{ text: "¡Obra de arte guardada!", lang: "es-US" }, { text: "Artwork saved!", lang: "en-US" }]);
    }, "image/png");
  };

  // Save immediately if the child switches away or closes the tab mid-wait (no lost strokes).
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState !== "hidden" || saveTimer.current === undefined) return;
      window.clearTimeout(saveTimer.current);
      saveTimer.current = undefined;
      const id = template.id;
      paintRef.current?.toBlob((blob) => {
        if (blob) void saveArt(id, blob);
      }, "image/png");
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [template.id]);

  // Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" || k === "y") {
        e.preventDefault();
        applyPatch(k === "y" || e.shiftKey ? "redo" : "undo");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const btn = "px-3 py-2 rounded-xl font-black text-xs sm:text-sm cursor-pointer border-2 disabled:opacity-40 disabled:cursor-not-allowed";
  const toolBtn = (t: Tool, label: string) => (
    <button
      key={t}
      onClick={() => setTool(t)}
      aria-pressed={tool === t}
      className={`${btn} ${tool === t ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800 border-slate-200"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-white rounded-[2rem] p-4 sm:p-6 border-4 border-pink-400 shadow-[0_8px_0_#f472b6] space-y-3" data-testid="coloring-studio">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="px-3 py-1 rounded-full bg-pink-100 text-pink-700 font-black text-xs uppercase">🖍️ Coloring Studio</span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {template.title} • <span lang="es">{template.titleEs}</span>
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setTemplateIdx(i)}
              className={`px-3 py-1.5 rounded-full font-black text-xs cursor-pointer ${i === templateIdx ? "bg-pink-500 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              {t.title}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-sky-50 p-2 sm:p-3 rounded-2xl border-2 border-sky-200">
        <div className="flex gap-1.5" role="group" aria-label="Tools">
          {toolBtn("bucket", "🪣 Fill")}
          {toolBtn("brush", "🖌️ Brush")}
          {toolBtn("eraser", "🧽 Eraser")}
        </div>
        {tool !== "bucket" && (
          <div className="flex gap-1.5" role="group" aria-label="Brush size">
            {SIZES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSize(s.px)}
                aria-pressed={size === s.px}
                className={`${btn} ${size === s.px ? "bg-sky-500 text-white border-sky-500" : "bg-white text-slate-800 border-slate-200"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-1.5 ml-auto">
          <button onClick={() => applyPatch("undo")} disabled={!historyState.canUndo} className={`${btn} bg-white border-slate-200`} aria-label="Undo">
            ↩️ Undo
          </button>
          <button onClick={() => applyPatch("redo")} disabled={!historyState.canRedo} className={`${btn} bg-white border-slate-200`} aria-label="Redo">
            ↪️ Redo
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Colors">
        {[...palette, "#ffffff"].map((hex) => (
          <button
            key={hex}
            onClick={() => {
              setColor(hex);
              if (tool === "eraser") setTool("brush");
            }}
            aria-label={`Color ${hex}`}
            aria-pressed={color === hex}
            style={{ backgroundColor: hex }}
            className={`w-9 h-9 rounded-full border-4 cursor-pointer transition ${color === hex ? "border-slate-950 scale-110" : "border-slate-200"}`}
          />
        ))}
      </div>

      <div
        className="relative w-full rounded-2xl overflow-hidden border-4 border-slate-900 bg-white select-none"
        style={{ aspectRatio: `${DOC_W} / ${DOC_H}`, touchAction: "none", cursor: tool === "bucket" ? "cell" : "crosshair" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        data-testid="coloring-stage"
      >
        <canvas ref={paintRef} width={DOC_W} height={DOC_H} className="absolute inset-0 w-full h-full" aria-label={`${template.title} coloring page`} role="img" />
        <canvas ref={artRef} width={DOC_W} height={DOC_H} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden />
        {!ready && <div className="absolute inset-0 flex items-center justify-center font-black text-slate-500">Loading page…</div>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-500" data-testid="save-state">
          {saveState === "saving" && "Saving…"}
          {saveState === "saved" && "✓ Saved on this device"}
          {saveState === "error" && "Couldn't save on this device (storage full or private mode)"}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (window.confirm("Start this page over? (You can undo.)")) void clearPage();
            }}
            className={`${btn} bg-rose-100 text-rose-700 border-rose-200`}
          >
            🔄 Start over
          </button>
          <button onClick={download} className={`${btn} bg-teal-400 text-slate-950 border-teal-500`}>
            💾 Download picture
          </button>
        </div>
      </div>
    </div>
  );
}
