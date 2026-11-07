"use client";

// PASS 06 — Learn & Quiz teaching session (Master Research spec, System 1).
// Flow per word: Hear (guided, unscored) -> Match (hear Spanish, pick the meaning)
// -> Recall (see the meaning, pick the Spanish; hint = assisted, does not advance).
// "Say it" is model-and-repeat practice only: it never awards mastery.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildSession,
  newProgress,
  nextReviewDate,
  recordAttempt,
  requeueAfterMiss,
  status,
  NEW_WORDS_PER_SESSION,
  type AgeBand,
  type SessionItem,
  type WordProgress,
  type WordStatus,
} from "@/lib/learning/scheduler";
import { loadProgress, requestPersistence, resetProgress, saveProgress } from "@/lib/learning/store";
import { buildQuizOptions } from "@/lib/words";
import type { SpeechLang, SpeechSegment } from "@/lib/speech";

export type LearnWord = { id: string; es: string; en: string; emoji: string };

type Props = {
  words: LearnWord[];
  curriculumVersion: number;
  speakInstant: (input: string | SpeechSegment[], lang?: SpeechLang) => void;
  earnStars: (pts: number) => void;
  startMicPractice: (targetEs: string) => void;
  micStatus: string;
};

const PROFILE_ID = "default"; // one local learner; no names or personal data stored
const AGE_KEY = "ella_age_band";

const STATUS_LABEL: Record<WordStatus, string> = {
  new: "🆕 New",
  learning: "🌱 Learning",
  reviewing: "🔁 Reviewing",
  mastered: "⭐ Mastered",
  "needs-practice": "💪 Needs practice",
};

type Phase = "loading" | "home" | "session" | "done";
type Feedback = { correct: boolean; assisted: boolean } | null;

export default function LearnSession({ words, curriculumVersion, speakInstant, earnStars, startMicPractice, micStatus }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState<Map<string, WordProgress>>(new Map());
  const [age, setAge] = useState<AgeBand>("5-6");
  const [queue, setQueue] = useState<SessionItem[]>([]);
  const [index, setIndex] = useState(0);
  const [options, setOptions] = useState<LearnWord[]>([]);
  const [hintUsed, setHintUsed] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, assisted: 0, missed: 0 });

  const byId = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);
  const wordIds = useMemo(() => words.map((w) => w.id), [words]);

  // Load saved progress + age setting once.
  useEffect(() => {
    let cancelled = false;
    void requestPersistence();
    loadProgress(PROFILE_ID).then((p) => {
      if (cancelled) return;
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(AGE_KEY);
      } catch {
        // ignore
      }
      if (saved === "5-6" || saved === "7-8") setAge(saved);
      setProgress(p);
      setPhase("home");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const now = () => new Date();
  const plan = useMemo(() => buildSession(wordIds, progress, new Date(), NEW_WORDS_PER_SESSION[age]), [wordIds, progress, age]);
  const dueCount = new Set(plan.filter((i) => i.step !== "hear" && progress.get(i.wordId)?.lastReviewedAt).map((i) => i.wordId)).size;
  const newCount = new Set(plan.filter((i) => i.step === "hear").map((i) => i.wordId)).size;
  const masteredCount = wordIds.filter((id) => status(progress.get(id)) === "mastered").length;

  const current = queue[index];
  const word = current ? byId.get(current.wordId) : undefined;

  const prepareItem = useCallback(
    (item: SessionItem | undefined) => {
      setFeedback(null);
      setPicked(null);
      setHintUsed(false);
      if (!item) return;
      const w = byId.get(item.wordId);
      if (!w) return;
      if (item.step === "hear") {
        speakInstant([{ text: w.es, lang: "es-US" }, { text: w.en, lang: "en-US" }]);
      } else {
        setOptions(buildQuizOptions(w, words));
        if (item.step === "match") speakInstant(w.es, "es-US");
        else speakInstant([{ text: "How do you say", lang: "en-US" }, { text: `${w.en}?`, lang: "en-US" }]);
      }
    },
    [byId, speakInstant, words]
  );

  const start = () => {
    if (!plan.length) return;
    setQueue(plan);
    setIndex(0);
    setSessionStats({ correct: 0, assisted: 0, missed: 0 });
    setPhase("session");
    prepareItem(plan[0]);
  };

  const advance = () => {
    const nextIndex = index + 1;
    if (nextIndex >= queue.length) {
      setPhase("done");
      speakInstant([{ text: "¡Muy bien!", lang: "es-US" }, { text: "Practice complete!", lang: "en-US" }]);
      return;
    }
    setIndex(nextIndex);
    prepareItem(queue[nextIndex]);
  };

  const answer = (choice: LearnWord) => {
    if (!current || !word || feedback) return;
    const correct = choice.id === word.id;
    const assisted = hintUsed;
    setPicked(choice.id);
    setFeedback({ correct, assisted });

    const before = progress.get(word.id) ?? newProgress(PROFILE_ID, word.id, curriculumVersion);
    const after = recordAttempt(before, { correct, assisted }, now());
    const nextMap = new Map(progress);
    nextMap.set(word.id, after);
    setProgress(nextMap);
    void saveProgress(after);

    if (correct && !assisted) {
      earnStars(10);
      setSessionStats((s) => ({ ...s, correct: s.correct + 1 }));
      speakInstant([{ text: "¡Correcto!", lang: "es-US" }, { text: word.es, lang: "es-US" }, { text: `means ${word.en}.`, lang: "en-US" }]);
    } else if (correct) {
      earnStars(3);
      setSessionStats((s) => ({ ...s, assisted: s.assisted + 1 }));
      speakInstant([{ text: "Good!", lang: "en-US" }, { text: word.es, lang: "es-US" }]);
    } else {
      setSessionStats((s) => ({ ...s, missed: s.missed + 1 }));
      setQueue((q) => requeueAfterMiss(q, index)); // try again after two other items
      speakInstant([{ text: "Not quite. This one is", lang: "en-US" }, { text: word.es, lang: "es-US" }, { text: `${word.en}.`, lang: "en-US" }]);
    }
  };

  const useHint = () => {
    if (!word || feedback) return;
    setHintUsed(true);
    speakInstant(word.es, "es-US");
  };

  const reset = async () => {
    if (!window.confirm("Grown-ups: reset all Learn & Quiz progress on this device?")) return;
    await resetProgress(PROFILE_ID);
    setProgress(new Map());
    setPhase("home");
  };

  const changeAge = (a: AgeBand) => {
    setAge(a);
    try {
      localStorage.setItem(AGE_KEY, a);
    } catch {
      // ignore
    }
  };

  const nextDate = nextReviewDate(progress, new Date());
  const shell = "bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 rounded-[2rem] p-5 sm:p-6 border-4 border-white shadow-[0_8px_0_#0f766e] text-white space-y-4";
  const choiceBase = "w-full px-4 py-3 rounded-2xl font-black text-base sm:text-lg border-4 shadow cursor-pointer transition";

  if (phase === "loading") {
    return <div className={shell}>Loading your practice…</div>;
  }

  if (phase === "session" && current && word) {
    const stepLabel = current.step === "hear" ? "👂 Listen & learn" : current.step === "match" ? "🎧 What does it mean?" : "🧠 How do you say it?";
    return (
      <div className={shell} data-testid="learn-session">
        <div className="flex items-center justify-between gap-2 text-xs font-black">
          <span className="px-3 py-1 rounded-full bg-yellow-300 text-slate-950 uppercase">{stepLabel}</span>
          <span data-testid="session-progress">
            {index + 1} / {queue.length}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/25 overflow-hidden">
          <div className="h-full bg-yellow-300 transition-all" style={{ width: `${((index + 1) / queue.length) * 100}%` }} />
        </div>

        {current.step === "hear" && (
          <div className="text-center space-y-3 py-2">
            <div className="text-6xl" aria-hidden>{word.emoji}</div>
            <div lang="es" className="text-4xl font-black">{word.es}</div>
            <div className="text-xl font-bold text-yellow-100">{word.en}</div>
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => speakInstant([{ text: word.es, lang: "es-US" }, { text: word.en, lang: "en-US" }])} className="px-5 py-3 rounded-full bg-white/20 font-black cursor-pointer">
                🔊 Hear again
              </button>
              <button onClick={advance} className="px-6 py-3 rounded-full bg-yellow-300 text-slate-950 font-black cursor-pointer">
                Got it ➜
              </button>
            </div>
          </div>
        )}

        {current.step !== "hear" && (
          <div className="space-y-3">
            <div className="text-center space-y-1">
              {current.step === "match" ? (
                <>
                  <button onClick={() => speakInstant(word.es, "es-US")} className="px-5 py-3 rounded-full bg-white/20 font-black cursor-pointer">
                    🔊 Listen again
                  </button>
                  <p className="text-sm font-bold">Which one did you hear?</p>
                </>
              ) : (
                <>
                  <div className="text-5xl" aria-hidden>{word.emoji}</div>
                  <p className="text-xl font-black">
                    How do you say <span className="text-yellow-200">&ldquo;{word.en}&rdquo;</span> in Spanish?
                  </p>
                  {!feedback && (
                    <button onClick={useHint} disabled={hintUsed} className="px-4 py-2 rounded-full bg-white/20 font-black text-sm cursor-pointer disabled:opacity-50">
                      💡 {hintUsed ? "Hint used" : "Hint (hear it)"}
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" data-testid="choices">
              {options.map((o) => {
                const isAnswer = o.id === word.id;
                const state = !feedback ? "idle" : isAnswer ? "right" : picked === o.id ? "wrong" : "dim";
                const cls =
                  state === "right" ? "bg-emerald-300 text-slate-950 border-white" :
                  state === "wrong" ? "bg-rose-300 text-slate-950 border-white" :
                  state === "dim" ? "bg-white/40 text-slate-700 border-transparent" :
                  "bg-white text-slate-900 border-pink-300 hover:bg-yellow-100";
                return (
                  <button key={o.id} data-answer={isAnswer ? "1" : "0"} onClick={() => answer(o)} disabled={!!feedback} className={`${choiceBase} ${cls}`}>
                    {current.step === "match" ? (
                      <>
                        {o.emoji} {o.en}
                      </>
                    ) : (
                      <span lang="es">{o.es}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {feedback && (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-black/20 rounded-2xl p-3" data-testid="feedback">
                <span className="font-black">
                  {feedback.correct && !feedback.assisted && "🎉 ¡Correcto! +10 ⭐"}
                  {feedback.correct && feedback.assisted && "👍 Good, with a hint! +3 ⭐"}
                  {!feedback.correct && (
                    <>
                      Not quite: <span lang="es">{word.es}</span> = {word.en}. We&apos;ll try it again soon.
                    </>
                  )}
                </span>
                <div className="flex gap-2">
                  {current.step === "recall" && feedback.correct && (
                    <button onClick={() => startMicPractice(word.es)} className="px-4 py-2 rounded-full bg-pink-500 font-black text-sm cursor-pointer">
                      🎙️ Say it
                    </button>
                  )}
                  <button onClick={advance} className="px-5 py-2 rounded-full bg-yellow-300 text-slate-950 font-black cursor-pointer">
                    Next ➜
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs font-bold bg-slate-900/40 rounded-2xl p-2">{micStatus}</p>
          </div>
        )}
      </div>
    );
  }

  // home + done
  return (
    <div className={shell} data-testid="learn-home">
      {phase === "done" && (
        <div className="bg-white/20 rounded-2xl p-3 font-black" data-testid="session-summary">
          ¡Muy bien! You got {sessionStats.correct} right on your own
          {sessionStats.assisted > 0 && `, ${sessionStats.assisted} with a hint`}
          {sessionStats.missed > 0 && `, and practiced ${sessionStats.missed} tricky one${sessionStats.missed > 1 ? "s" : ""}`}.
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="px-3 py-1 rounded-full bg-yellow-300 text-slate-950 font-black text-xs uppercase">🎯 Today&apos;s Practice</span>
          <h2 className="text-2xl sm:text-3xl font-black mt-1">
            {plan.length ? "Ready to practice with Ella!" : "All caught up!"}
          </h2>
          <p className="text-sm font-bold" data-testid="plan-summary">
            {dueCount} review{dueCount === 1 ? "" : "s"} • {newCount} new word{newCount === 1 ? "" : "s"} • {masteredCount}/{words.length} mastered
          </p>
          {!plan.length && nextDate && (
            <p className="text-sm font-bold text-yellow-100">Next review: {nextDate.toLocaleDateString()}</p>
          )}
        </div>
        <button
          onClick={start}
          disabled={!plan.length}
          className="px-6 py-4 rounded-full bg-yellow-300 hover:bg-yellow-200 text-slate-950 font-black text-lg border-4 border-white shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ▶️ {phase === "done" && plan.length ? "Keep going" : "Start practice"}
        </button>
      </div>

      <details className="bg-slate-900/30 rounded-2xl p-3 text-sm">
        <summary className="font-black cursor-pointer">👨‍👩‍👧 Grown-ups: progress & settings</summary>
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold">Age:</span>
            {(["5-6", "7-8"] as AgeBand[]).map((a) => (
              <button
                key={a}
                onClick={() => changeAge(a)}
                className={`px-3 py-1 rounded-full font-black text-xs cursor-pointer ${age === a ? "bg-yellow-300 text-slate-950" : "bg-white/20"}`}
              >
                {a} ({NEW_WORDS_PER_SESSION[a]} new words/session)
              </button>
            ))}
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1" data-testid="progress-list">
            {words.map((w) => {
              const p = progress.get(w.id);
              return (
                <li key={w.id} className="flex justify-between gap-2 bg-white/10 rounded-xl px-3 py-1.5">
                  <span>
                    {w.emoji} <span lang="es">{w.es}</span>
                  </span>
                  <span className="font-black">{STATUS_LABEL[status(p)]}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-xs opacity-90">
            Words advance only on independent correct answers at spaced reviews (1, 3, 7, 14, 30 days). &ldquo;Mastered&rdquo; means
            recognized correctly at the 1-, 3- and 7-day reviews without hints. These schedules are starting settings, not proven
            optimal. Speaking practice is never counted as mastery. Progress is saved only on this device.
          </p>
          <button onClick={reset} className="px-4 py-2 rounded-full bg-rose-500 font-black text-xs cursor-pointer">
            Reset progress on this device
          </button>
        </div>
      </details>
    </div>
  );
}
