// PASS 04 — bilingual speech with per-language voice selection.
// MDN: SpeechSynthesis (getVoices, speak, cancel, voiceschanged), SpeechSynthesisUtterance
// (lang, voice, rate, pitch, onend/onerror), SpeechSynthesisVoice (name, lang, localService).
//
// Two fixes over the original engine:
//  1. It picked the FIRST voice for a language (on Windows Chrome: "Microsoft David", male).
//     Now voices are ranked by a preference list of female voices per platform.
//  2. Mixed lines ("El Ritmo. The Rhythm") were read entirely by one voice, so English came
//     out in a Spanish accent. Now each segment is spoken by a voice for its own language.
// Browser voices differ by device; this is the best available without recorded audio.

export type SpeechLang = "en-US" | "es-US";
export type SpeechSegment = { text: string; lang: SpeechLang };

// Ordered by preference. Matched as case/accent-insensitive substrings of voice.name.
const PREFERRED: Record<"en" | "es", string[]> = {
  en: [
    "ana", // Microsoft Ana (Edge, child voice)
    "jenny", "aria", "michelle", // Microsoft natural (Edge)
    "google us english", // Chrome (female)
    "zira", // Windows desktop
    "samantha", "ava", "allison", "susan", // Apple
    "karen", "moira", "tessa", "victoria",
    "libby", "sonia", "hazel",
  ],
  es: [
    "paloma", "dalia", "elvira", "ximena", "salome", // Microsoft natural (Edge)
    "google espanol de estados unidos", "google espanol", // Chrome (female)
    "sabina", "helena", "laura", // Windows desktop
    "paulina", "monica", "marisol", "angelica", // Apple
  ],
};

// Known male voices: never picked while any other voice for the language exists.
const MALE = [
  "david", "mark", "guy", "davis", "tony", "jason", "brandon", "christopher", "eric", "roger", "steffan", "andrew", "brian",
  "raul", "pablo", "alvaro", "jorge", "juan", "diego", "gerardo", "alonso", "tomas", "carlos", "enrique",
  "daniel", "fred", "alex", "tom", "aaron", "arthur", "rishi", "oliver", "thomas", "male",
];

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Pick the best voice for a language from a list (pure; exported for tests). */
export function pickVoice<T extends { name: string; lang: string }>(voices: T[], lang: SpeechLang): T | null {
  const prefix = lang.slice(0, 2) as "en" | "es";
  const forLang = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(prefix));
  if (!forLang.length) return null;
  for (const want of PREFERRED[prefix]) {
    const re = new RegExp(`\\b${want}\\b`);
    const hit = forLang.find((v) => re.test(normalize(v.name)));
    if (hit) return hit;
  }
  const isMale = (v: T) => MALE.some((m) => new RegExp(`\\b${m}\\b`).test(normalize(v.name)));
  // Prefer the requested region (es-US / en-US), then any non-male voice, then anything.
  return (
    forLang.find((v) => v.lang.replace("_", "-") === lang && !isMale(v)) ||
    forLang.find((v) => !isMale(v)) ||
    forLang[0]
  );
}

/** Remove emoji so they are not read aloud ("micrófono", "estrella brillante"...). */
export function stripForSpeech(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

let voices: SpeechSynthesisVoice[] = [];
let listening = false;

function loadVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  voices = window.speechSynthesis.getVoices();
  if (!listening) {
    listening = true;
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      voices = window.speechSynthesis.getVoices();
    });
  }
}

/** Call once on mount so voices are ready before the first tap. */
export function initSpeech() {
  loadVoices();
}

/**
 * Speak segments in order, each with a voice for its own language. Cancels anything
 * already speaking. `onDone` fires once after the last segment ends (or on error).
 */
export function speakSegments(segments: SpeechSegment[], onDone?: () => void): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  if (!voices.length) loadVoices();
  const parts = segments
    .map((s) => ({ ...s, text: stripForSpeech(s.text) }))
    .filter((s) => s.text.length > 0);
  if (!parts.length) return false;

  const synth = window.speechSynthesis;
  synth.cancel();
  let finished = false;
  const done = () => {
    if (!finished) {
      finished = true;
      onDone?.();
    }
  };
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part.text);
    u.lang = part.lang;
    const v = pickVoice(voices, part.lang);
    if (v) u.voice = v;
    u.rate = part.lang === "es-US" ? 0.9 : 0.95; // a little slower: clear for young learners
    u.pitch = 1.1;
    if (i === parts.length - 1) u.onend = done;
    u.onerror = done;
    synth.speak(u); // utterances queue and play in order
  });
  return true;
}
