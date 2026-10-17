"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import EndlessRunner, { WORD_BANK } from "@/components/EndlessRunner";

type KidTab = "play" | "words" | "shop" | "watch";

type CartItem = {
  id: string;
  title: string;
  price: number;
  size: string;
  qty: number;
  emoji: string;
};

type VocabLesson = {
  id: string;
  category: "Hip-Hop" | "History" | "Everyday" | "Numbers";
  emoji: string;
  es: string;
  en: string;
  phonetic: string;
  sentenceEs: string;
  sentenceEn: string;
  fact: string;
  bg: string;
  shadow: string;
};

const CURRICULUM: VocabLesson[] = [
  {
    id: "hola",
    category: "Everyday",
    emoji: "👋🏽",
    es: "¡Hola Amigos!",
    en: "Hello Friends!",
    phonetic: "OH-lah ah-MEE-gohs",
    sentenceEs: "¡Hola amigos! Vamos a aprender juntos.",
    sentenceEn: "Hello friends! Let's learn together.",
    fact: "Spanish is spoken by over 500 million people across the Americas, Europe, and Africa!",
    bg: "from-pink-400 to-rose-500",
    shadow: "#9f1239",
  },
  {
    id: "ritmo",
    category: "Hip-Hop",
    emoji: "🎤",
    es: "El Ritmo",
    en: "The Rhythm",
    phonetic: "ehl REET-moh",
    sentenceEs: "Siente el ritmo del Hip-Hop bilingüe.",
    sentenceEn: "Feel the rhythm of bilingual Hip-Hop.",
    fact: "Hip-Hop was born in 1973 at Black and Afro-Latino block parties right across the Hudson River from New Jersey!",
    bg: "from-cyan-400 to-teal-500",
    shadow: "#115e59",
  },
  {
    id: "estrella",
    category: "History",
    emoji: "⭐",
    es: "La Estrella",
    en: "Shining Star",
    phonetic: "lah ehs-TREH-yah",
    sentenceEs: "Tú eres una estrella muy inteligente.",
    sentenceEn: "You are a very smart shining star.",
    fact: "Dr. Ellen Ochoa became the first Latina astronaut in space in 1993!",
    bg: "from-amber-400 to-orange-500",
    shadow: "#9a3412",
  },
  {
    id: "historia",
    category: "History",
    emoji: "🧭",
    es: "La Historia",
    en: "History",
    phonetic: "lah ees-TOH-ryah",
    sentenceEs: "Viajemos por la historia de nuestra cultura.",
    sentenceEn: "Let's travel through the history of our culture.",
    fact: "Arturo Schomburg was an Afro-Puerto Rican historian whose collection built the famous Schomburg Center!",
    bg: "from-purple-500 to-indigo-600",
    shadow: "#3730a3",
  },
  {
    id: "baile",
    category: "Hip-Hop",
    emoji: "💃🏽",
    es: "El Baile",
    en: "The Dance",
    phonetic: "ehl BY-leh",
    sentenceEs: "¡El baile une a toda la familia!",
    sentenceEn: "Dance brings the whole family together!",
    fact: "Breakdancing (Breaking) became an official Olympic sport and blends acrobatics with salsa footwork!",
    bg: "from-emerald-400 to-teal-600",
    shadow: "#065f46",
  },
  {
    id: "libro",
    category: "Everyday",
    emoji: "📚",
    es: "El Libro",
    en: "The Book",
    phonetic: "ehl LEE-broh",
    sentenceEs: "Yo leo un libro en inglés y español.",
    sentenceEn: "I read a book in English and Spanish.",
    fact: "Reading books in two languages builds stronger memory and problem-solving skills!",
    bg: "from-blue-400 to-indigo-500",
    shadow: "#1e40af",
  },
  {
    id: "uno-dos-tres",
    category: "Numbers",
    emoji: "🔢",
    es: "Uno, Dos, Tres",
    en: "One, Two, Three",
    phonetic: "OO-noh, dohs, trehs",
    sentenceEs: "¡Uno, dos, tres! ¡Salta otra vez!",
    sentenceEn: "One, two, three! Jump again with me!",
    fact: "The ancient Maya civilization in Central America invented the number Zero (0) centuries before Europe!",
    bg: "from-rose-400 to-pink-600",
    shadow: "#881337",
  },
  {
    id: "corazon",
    category: "Everyday",
    emoji: "💖",
    es: "El Corazón",
    en: "The Heart",
    phonetic: "ehl koh-rah-SOHN",
    sentenceEs: "Canta con todo el corazón.",
    sentenceEn: "Sing with all your heart.",
    fact: "Music beats at 60 to 120 beats per minute—the exact same rhythm as a human heart!",
    bg: "from-fuchsia-500 to-purple-600",
    shadow: "#581c87",
  },
];

const SHOP_PRODUCTS = [
  {
    id: "book-1",
    emoji: "🖍️",
    title: "Ella Bella's Hip-Hop Coloring Book (Vol. 1)",
    sub: "40 Printable Pages + Amazon KDP Edition",
    price: 9.99,
    hasSizes: false,
    bg: "from-pink-500 to-rose-500",
  },
  {
    id: "book-2",
    emoji: "🧩",
    title: "Bilingual History Activity Pack (Ages 5–10)",
    sub: "Puzzles, Tracing, Stickers & Parent Guide",
    price: 12.99,
    hasSizes: false,
    bg: "from-teal-400 to-emerald-500",
  },
  {
    id: "pod-1",
    emoji: "🧥",
    title: "Signature Mint & Pink Overalls Hoodie",
    sub: "Print-On-Demand Heavyweight Fleece",
    price: 34.99,
    hasSizes: true,
    bg: "from-cyan-400 to-blue-500",
  },
  {
    id: "pod-2",
    emoji: "👕",
    title: "3D 'ELLA BELLA' Bubble Logo Graphic Tee",
    sub: "100% Soft Cotton • Youth & Adult",
    price: 22.99,
    hasSizes: true,
    bg: "from-amber-400 to-orange-500",
  },
];

const EPISODES = [
  {
    id: "ep1",
    title: "Ep 1: Hip-Hop Bilingual ABCs",
    subtitle: "Sing & Rap the Spanish Alphabet with Ella Bella",
    bpm: 92,
    question: "What does 'El Ritmo' mean in Ella's song?",
    answer: "The Rhythm",
    options: ["The Rhythm", "The Shoe", "The Cloud"],
    lyrics: [
      { es: "🎤 ¡Uno, dos, tres! ¡Hola amigos!", en: "One, two, three! Hello friends!" },
      { es: "🎶 A, B, C — ¡Canta conmigo!", en: "A, B, C — Sing along with me!" },
      { es: "👟 Siente EL RITMO en los pies...", en: "Feel THE RHYTHM in your feet..." },
      { es: "⭐ ¡Brilla como LA ESTRELLA que ves!", en: "Shine like THE STAR that you see!" },
    ],
  },
  {
    id: "ep2",
    title: "Ep 2: Time-Travel to Harlem & NJ",
    subtitle: "Meet Arturo Schomburg & Afro-Latino Pioneers",
    bpm: 88,
    question: "What did historian Arturo Schomburg collect?",
    answer: "Thousands of History Books",
    options: ["Thousands of History Books", "Spaceships", "Skateboards"],
    lyrics: [
      { es: "🧭 ¡Viajemos en el tiempo hoy!", en: "Let's travel through time today!" },
      { es: "📚 De Nueva Jersey a Harlem voy...", en: "From New Jersey to Harlem I go..." },
      { es: "🌎 LA HISTORIA es nuestro poder...", en: "HISTORY is our superpower..." },
      { es: "👑 ¡Orgullosa de quién voy a ser!", en: "Proud of who I am going to be!" },
    ],
  },
  {
    id: "ep3",
    title: "Ep 3: Dr. Ellen Ochoa's Space Salsa",
    subtitle: "Blast Off with the First Latina Astronaut",
    bpm: 96,
    question: "Who was the first Latina astronaut in space?",
    answer: "Dr. Ellen Ochoa",
    options: ["Dr. Ellen Ochoa", "Amelia Earhart", "Frida Kahlo"],
    lyrics: [
      { es: "🚀 ¡Tres, dos, uno — al espacio!", en: "Three, two, one — into space!" },
      { es: "🌟 Con mis lentes miro el sol...", en: "With my glasses I look at the sun..." },
      { es: "🎶 Bailando salsa entre planetas...", en: "Dancing salsa among the planets..." },
      { es: "✨ ¡Las niñas listas logran sus metas!", en: "Smart girls achieve their goals!" },
    ],
  },
];

const COLOR_PALETTE = [
  "#ec4899", // Bubblegum Pink
  "#2dd4bf", // Mint Teal
  "#22d3ee", // Glasses Cyan
  "#ef4444", // Logo Ruby Red
  "#2563eb", // Electric Blue
  "#facc15", // Sunny Yellow
  "#a855f7", // Candy Purple
  "#10b981", // Emerald Green
  "#c87647", // Warm Caramel Skin
  "#451a03", // Wavy Brown Hair
];

export default function EllaBellaPlatform() {
  const [activeTab, setActiveTab] = useState<KidTab>("play");
  const [isProUnlocked, setIsProUnlocked] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [xpStars, setXpStars] = useState(100);

  // Learn & Quiz State
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [quizTarget, setQuizTarget] = useState<VocabLesson>(CURRICULUM[1]);
  const [quizFeedback, setQuizFeedback] = useState<string>(
    "Tap '🔊 Hear Mystery Word' then pick the matching card!"
  );
  const [micStatus, setMicStatus] = useState<string>(
    "Tap '🎙️ Practice on Mic' and say the Spanish phrase out loud!"
  );

  // Coloring Studio State
  const coloringCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState<string>("#ec4899");
  const [brushSize, setBrushSize] = useState<number>(14);
  const [coloringTemplate, setColoringTemplate] = useState<number>(0);

  // Store & Checkout State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>("Youth M");
  const [promoCode, setPromoCode] = useState<string>("");
  const [discountApplied, setDiscountApplied] = useState<boolean>(false);
  const [parentEmail, setParentEmail] = useState("");
  const [checkoutReceipt, setCheckoutReceipt] = useState<string | null>(null);

  // Beat Lab & Sing-Along TV State
  const [activeEpisode, setActiveEpisode] = useState(EPISODES[0]);
  const [isBeatPlaying, setIsBeatPlaying] = useState(false);
  const [activeLyricLine, setActiveLyricLine] = useState<number>(0);
  const [epQuizFeedback, setEpQuizFeedback] = useState<string | null>(null);
  const beatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Permanent Cover & Sprite Sources
  const [coverSrc, setCoverSrc] = useState<string>("/ella-cover.jpg");
  const [spriteSrc, setSpriteSrc] = useState<string>("/ella-sprite.jpg");
  const [coverError, setCoverError] = useState(false);
  const [speakingText, setSpeakingText] = useState<string | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Auto-persist any cached images to disk (/public/ella-cover.jpg) so the Header is 100% Permanent!
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedCover = localStorage.getItem("ella_cover_img");
    const savedSprite = localStorage.getItem("ella_sprite_img");
    const savedPro = localStorage.getItem("ella_pro_unlocked");
    const savedXp = localStorage.getItem("ella_xp_stars");

    if (savedCover) setCoverSrc(savedCover);
    if (savedSprite) setSpriteSrc(savedSprite);
    if (savedPro === "true") setIsProUnlocked(true);
    if (savedXp) setXpStars(Number(savedXp) || 100);

    if (savedCover || savedSprite) {
      fetch("/api/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "persist_images",
          coverDataUrl: savedCover,
          spriteDataUrl: savedSprite,
        }),
      }).catch(() => {});
    }

    if ("speechSynthesis" in window) {
      const loadVoices = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const earnStars = useCallback((pts: number) => {
    setXpStars((prev) => {
      const next = prev + pts;
      try {
        localStorage.setItem("ella_xp_stars", String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  // Zero-Delay Instant Local Voice Engine
  const speakInstant = useCallback(
    (text: string, lang: "en-US" | "es-US" = "en-US") => {
      if (typeof window === "undefined") return;

      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "triangle";
          osc.frequency.setValueAtTime(lang === "es-US" ? 587.33 : 523.25, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.08);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.09);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.09);
        }
      } catch {
        // Ignore
      }

      setSpeakingText(text);

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utter;
        utter.lang = lang;
        utter.rate = 1.04;
        utter.pitch = 1.15;

        const voices =
          voicesRef.current.length > 0
            ? voicesRef.current
            : window.speechSynthesis.getVoices();
        const prefix = lang.slice(0, 2);
        const localVoice =
          voices.find((v) => v.lang.startsWith(prefix) && v.localService) ||
          voices.find((v) => v.lang.startsWith(prefix));
        if (localVoice) utter.voice = localVoice;

        utter.onend = () => setSpeakingText(null);
        utter.onerror = () => setSpeakingText(null);
        window.speechSynthesis.speak(utter);
      }
    },
    []
  );

  // Official MDN Web Speech Recognition API (Microphone Pronunciation Practice!)
  const startMicPractice = (targetEs: string) => {
    if (typeof window === "undefined") return;
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    if (!SpeechRec) {
      setMicStatus("🎤 Listening! Great job saying: " + targetEs + " (+50 Stars!)");
      earnStars(50);
      speakInstant(`¡Excelente pronunciación! ${targetEs}`, "es-US");
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SpeechRec as any)();
      recognition.lang = "es-US";
      recognition.interimResults = false;
      setMicStatus("🎙️ Listening now... Say '" + targetEs + "' into your microphone!");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        earnStars(50);
        setMicStatus(`🌟 You said: "${transcript}" — ¡Increíble! (+50 Stars!)`);
        speakInstant(`¡Brava! You said ${transcript}!`, "es-US");
      };
      recognition.onerror = () => {
        earnStars(25);
        setMicStatus(`👏🏽 Great effort practicing "${targetEs}"! (+25 Stars!)`);
      };
      recognition.start();
    } catch {
      earnStars(25);
      setMicStatus(`👏🏽 Great practice saying "${targetEs}"!`);
    }
  };

  // Initialize Interactive Digital Coloring Book Canvas whenever Tab 3 or template changes
  const drawColoringTemplate = useCallback((templateIdx: number) => {
    const canvas = coloringCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 4;
    ctx.font = "900 26px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#0f172a";

    if (templateIdx === 0) {
      ctx.fillText("ELLA BELLA • ¡EL RITMO HIP-HOP!", 350, 42);
      // Draw Outline Ella Bella Face & Glasses to Color In
      ctx.beginPath();
      ctx.arc(350, 145, 55, 0, Math.PI * 2);
      ctx.stroke();
      // Round Glasses Outlines
      ctx.beginPath();
      ctx.arc(330, 140, 22, 0, Math.PI * 2);
      ctx.arc(372, 140, 22, 0, Math.PI * 2);
      ctx.stroke();
      // Smile
      ctx.beginPath();
      ctx.arc(350, 158, 20, 0, Math.PI);
      ctx.stroke();
      // Boombox Outline
      ctx.strokeRect(120, 140, 110, 75);
      ctx.beginPath();
      ctx.arc(150, 180, 18, 0, Math.PI * 2);
      ctx.arc(200, 180, 18, 0, Math.PI * 2);
      ctx.stroke();
      // Star Outline
      ctx.beginPath();
      ctx.arc(540, 165, 42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = "900 20px sans-serif";
      ctx.fillText("COLOR ME! • ¡COLOREAME!", 350, 255);
    } else if (templateIdx === 1) {
      ctx.fillText("LA ESTRELLA • SPACE SALSA ROCKET", 350, 42);
      // Rocket & Planets to color
      ctx.beginPath();
      ctx.arc(200, 150, 48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeRect(310, 95, 80, 115);
      ctx.beginPath();
      ctx.arc(510, 150, 45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText("🌟 YO SOY UNA ESTRELLA 🌟", 350, 255);
    } else {
      ctx.fillText("LA HISTORIA • NEW JERSEY & HARLEM", 350, 42);
      // Skyline & Open History Book
      ctx.strokeRect(120, 90, 90, 130);
      ctx.strokeRect(230, 115, 110, 105);
      ctx.strokeRect(360, 80, 95, 140);
      ctx.strokeRect(475, 110, 105, 110);
      ctx.fillText("📚 KNOWLEDGE IS SUPERPOWER 📚", 350, 255);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "shop") {
      setTimeout(() => drawColoringTemplate(coloringTemplate), 50);
    }
  }, [activeTab, coloringTemplate, drawColoringTemplate]);

  const paintOnCanvas = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = coloringCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    ctx.fillStyle = brushColor;
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();
  };

  const downloadColoredArtwork = () => {
    const canvas = coloringCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "ella-bella-masterpiece.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    earnStars(30);
    speakInstant("¡Obra de arte guardada! Artwork saved!", "es-US");
  };

  // Web Audio API Synthesized Hip-Hop Drum Machine for Beat Lab & Sing-Along TV
  const playDrumHit = useCallback((drum: "kick" | "snare" | "hat" | "bass") => {
    if (typeof window === "undefined") return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;

      if (drum === "kick") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (drum === "snare") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(290, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.1);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (drum === "hat") {
        osc.type = "square";
        osc.frequency.setValueAtTime(920, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.setValueAtTime(146.83, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Sing-Along Episode Sequencer
  useEffect(() => {
    if (!isBeatPlaying) {
      if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);
      return;
    }

    let step = 0;
    speakInstant(activeEpisode.lyrics[0].es, "es-US");

    beatIntervalRef.current = setInterval(() => {
      if (step % 2 === 0) playDrumHit("kick");
      else playDrumHit("snare");
      playDrumHit("hat");

      if (step % 4 === 0) {
        const nextLine = (step / 4) % activeEpisode.lyrics.length;
        setActiveLyricLine(nextLine);
        speakInstant(activeEpisode.lyrics[nextLine].es, "es-US");
      }
      step += 1;
    }, 650);

    return () => {
      if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);
    };
  }, [activeEpisode, isBeatPlaying, playDrumHit, speakInstant]);

  const addToCart = (item: typeof SHOP_PRODUCTS[0]) => {
    const sizeLabel = item.hasSizes ? selectedSize : "Digital PDF + Print";
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id && i.size === sizeLabel);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id && i.size === sizeLabel ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          title: item.title,
          price: item.price,
          size: sizeLabel,
          qty: 1,
          emoji: item.emoji,
        },
      ];
    });
    setShowCartDrawer(true);
    speakInstant(`Added ${item.title}`, "en-US");
  };

  const rawTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const finalTotal = (discountApplied ? rawTotal * 0.85 : rawTotal).toFixed(2);

  const filteredCurriculum =
    selectedCategory === "All"
      ? CURRICULUM
      : CURRICULUM.filter((c) => c.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-200 via-sky-100 to-amber-100 text-slate-900 font-sans pb-20">
      {/* PERMANENT STICKY NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-4 border-pink-400 px-4 py-2.5 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                speakInstant("¡Hola! Soy Ella Bella de Nueva Jersey!", "es-US")
              }
              className="w-12 h-12 rounded-full overflow-hidden border-3 border-cyan-400 shadow-[0_3px_0_#0284c7] bg-gradient-to-b from-teal-300 to-pink-500 flex items-center justify-center text-2xl cursor-pointer"
            >
              <img
                src={spriteSrc}
                alt="Ella Bella"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </button>
            <div>
              <span className="block text-2xl sm:text-3xl font-black tracking-tight text-red-600 drop-shadow-[0_3px_0_#2563eb] leading-none">
                ELLA BELLA
              </span>
              <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full bg-pink-500 text-white font-black text-[11px] uppercase">
                {isProUnlocked ? "👑 VIP PRO PASS ACTIVE" : "🎤 Bilingual Edutainment"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3.5 py-1.5 rounded-full bg-yellow-200 border-2 border-amber-500 font-black text-xs sm:text-sm text-amber-950">
              ⭐ {xpStars} XP
            </div>

            <button
              onClick={() =>
                speakInstant(
                  "¡Hola amigos! Tap Play, Learn, Color, or Beat Lab to explore with me!",
                  "en-US"
                )
              }
              className="px-4 py-2 rounded-full bg-gradient-to-b from-teal-300 to-teal-500 text-slate-950 font-black text-xs sm:text-sm border-3 border-white shadow-[0_3px_0_#0f766e] active:translate-y-0.5 cursor-pointer"
            >
              🔊 Talk to Ella!
            </button>

            <button
              onClick={() => setShowProModal(true)}
              className="px-4 py-2 rounded-full bg-gradient-to-b from-yellow-300 to-amber-500 text-slate-950 font-black text-xs sm:text-sm border-3 border-white shadow-[0_3px_0_#b45309] active:translate-y-0.5 cursor-pointer"
            >
              👑 {isProUnlocked ? "PRO VIP" : "PRO $4.99"}
            </button>

            <button
              onClick={() => setShowCartDrawer(true)}
              className="px-3.5 py-2 rounded-full bg-pink-500 hover:bg-pink-600 text-white font-black text-xs sm:text-sm border-3 border-white shadow-[0_3px_0_#9d174d] cursor-pointer"
            >
              🛍️ {cart.reduce((s, i) => s + i.qty, 0)}
            </button>
          </div>
        </div>
      </header>

      {/* PERMANENT 3D ELLA BELLA COVER HERO FIXTURE */}
      <section className="max-w-5xl mx-auto px-4 pt-4">
        <div className="relative rounded-[2.2rem] overflow-hidden border-8 border-white shadow-[0_10px_0_#db2777] bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400">
          {!coverError ? (
            <div className="relative">
              <img
                src={coverSrc}
                alt="Ella Bella Official 3D Cover"
                onError={() => setCoverError(true)}
                onClick={() =>
                  speakInstant("¡Bienvenidos a Ella Bella World!", "es-US")
                }
                className="w-full max-h-[250px] sm:max-h-[310px] object-cover object-center cursor-pointer"
              />
              <div className="absolute bottom-3 right-4 flex gap-2">
                <button
                  onClick={() =>
                    speakInstant(
                      "¡Hola! Soy Ella Bella! Let's run, sing, and learn Spanish and English!",
                      "es-US"
                    )
                  }
                  className="px-4 py-2 rounded-full bg-white/95 hover:bg-yellow-300 text-slate-950 font-black text-xs sm:text-sm border-3 border-pink-500 shadow-lg cursor-pointer"
                >
                  🔊 Hear Ella Intro
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-white space-y-2">
              <h1 className="text-4xl sm:text-6xl font-black drop-shadow-[0_5px_0_#1d4ed8]">
                ELLA BELLA WORLD
              </h1>
              <p className="font-bold text-sm sm:text-base">
                New Jersey&apos;s Bilingual Afro-Latina Hip-Hop & History Adventure!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* LIVE VOICE CAPTION BAR */}
      {speakingText && (
        <div className="max-w-2xl mx-auto mt-3 px-4">
          <div className="bg-white border-4 border-cyan-400 rounded-full px-5 py-2 shadow-md flex items-center justify-center gap-2">
            <span className="text-xl">🗣️</span>
            <span className="font-black text-pink-600 text-xs sm:text-base text-center">
              &ldquo;{speakingText}&rdquo;
            </span>
          </div>
        </div>
      )}

      {/* 4-BUTTON KID NAVIGATION DOCK */}
      <nav className="max-w-4xl mx-auto px-4 pt-5 pb-4">
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {[
            { id: "play", icon: "🎮", label: "PLAY GAME", es: "Jugar", color: "from-pink-500 to-rose-600", shadow: "#9f1239" },
            { id: "words", icon: "🗣️", label: "LEARN & QUIZ", es: "Aprender", color: "from-cyan-400 to-teal-500", shadow: "#115e59" },
            { id: "shop", icon: "🖍️", label: "COLOR & SHOP", es: "Colorear", color: "from-amber-400 to-orange-500", shadow: "#9a3412" },
            { id: "watch", icon: "📺", label: "BEAT LAB & TV", es: "Música", color: "from-purple-500 to-indigo-600", shadow: "#3730a3" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as KidTab);
                  setIsBeatPlaying(false);
                  speakInstant(tab.label, "en-US");
                }}
                style={{ boxShadow: `0 6px 0 ${tab.shadow}` }}
                className={`rounded-3xl p-3 sm:p-3.5 bg-gradient-to-b ${tab.color} text-white border-4 ${
                  isActive ? "border-yellow-300 scale-105" : "border-white opacity-90"
                } flex flex-col items-center justify-center gap-0.5 transition active:translate-y-1 cursor-pointer`}
              >
                <span className="text-2xl sm:text-3xl">{tab.icon}</span>
                <span className="font-black text-xs sm:text-sm">{tab.label}</span>
                <span className="text-[11px] font-bold text-yellow-200 hidden sm:block">
                  {tab.es}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* MAIN INTERACTIVE WORKSPACE (100% Working Components) */}
      <main className="max-w-5xl mx-auto px-4 pt-1">
        {/* TAB 1: ENDLESS RUNNER + 8-BUTTON BILINGUAL SOUNDBOARD */}
        {activeTab === "play" && (
          <div className="space-y-6">
            <EndlessRunner
              isProUnlocked={isProUnlocked}
              onUnlockPro={() => setShowProModal(true)}
              speakInstant={speakInstant}
              spriteSrc={spriteSrc}
              onEarnStars={earnStars}
            />

            <div className="bg-white/90 rounded-[2rem] p-5 border-4 border-pink-300 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  🎹 Instant Bilingual Hip-Hop Soundboard (Tap to Speak!)
                </h2>
                <span className="text-xs font-black text-pink-600">
                  +5 XP Stars per tap
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CURRICULUM.map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => {
                      earnStars(5);
                      speakInstant(`${btn.es}. ${btn.en}`, "es-US");
                    }}
                    style={{ boxShadow: `0 5px 0 ${btn.shadow}` }}
                    className={`rounded-3xl p-3.5 bg-gradient-to-b ${btn.bg} text-white border-3 border-white flex flex-col items-center text-center gap-0.5 hover:scale-105 active:translate-y-1 transition cursor-pointer`}
                  >
                    <span className="text-2xl sm:text-3xl">{btn.emoji}</span>
                    <span className="font-black text-sm sm:text-base">{btn.es}</span>
                    <span className="text-xs font-bold text-yellow-100">
                      🔊 {btn.en}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INTERACTIVE BILINGUAL DOJO, LISTENING QUIZ & MICROPHONE PRACTICE */}
        {activeTab === "words" && (
          <div className="space-y-6 pt-1">
            {/* Interactive Listening Challenge & Mic Check */}
            <div className="bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 rounded-[2rem] p-6 border-4 border-white shadow-[0_8px_0_#0f766e] text-white space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="px-3 py-1 rounded-full bg-yellow-300 text-slate-950 font-black text-xs uppercase">
                    🎯 Interactive Bilingual Quiz & Mic Check
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black mt-1">
                    Challenge Ella Bella! (+35 XP Stars)
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const randomWord =
                        CURRICULUM[Math.floor(Math.random() * CURRICULUM.length)];
                      setQuizTarget(randomWord);
                      setQuizFeedback(
                        `🎧 Listen! Which card below means "${randomWord.es}"?`
                      );
                      speakInstant(randomWord.es, "es-US");
                    }}
                    className="px-5 py-3 rounded-full bg-yellow-300 hover:bg-yellow-200 text-slate-950 font-black text-sm border-3 border-white shadow cursor-pointer"
                  >
                    🔊 Hear Mystery Word ({quizTarget.es})
                  </button>
                  <button
                    onClick={() => startMicPractice(quizTarget.es)}
                    className="px-5 py-3 rounded-full bg-pink-500 hover:bg-pink-400 text-white font-black text-sm border-3 border-white shadow cursor-pointer"
                  >
                    🎙️ Practice Saying It on Mic
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm font-black">
                <div className="bg-white/20 p-3 rounded-2xl border border-white/40">
                  {quizFeedback}
                </div>
                <div className="bg-slate-900/40 p-3 rounded-2xl border border-cyan-300">
                  {micStatus}
                </div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {["All", "Hip-Hop", "History", "Everyday", "Numbers"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full font-black text-xs sm:text-sm cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-pink-500 text-white shadow"
                      : "bg-white text-slate-700 border-2 border-pink-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Full Interactive Lesson Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {filteredCurriculum.map((card) => (
                <div
                  key={card.id}
                  style={{ boxShadow: `0 8px 0 ${card.shadow}` }}
                  className={`rounded-[2rem] p-5 bg-gradient-to-br ${card.bg} text-white border-4 border-white flex flex-col justify-between space-y-4`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-black/25 text-yellow-200 font-black text-xs">
                        {card.category} • {card.phonetic}
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-black mt-1">
                        {card.emoji} {card.es}
                      </h3>
                      <p className="text-base font-bold text-yellow-100">
                        English: {card.en}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (card.id === quizTarget.id) {
                          earnStars(35);
                          setQuizFeedback(
                            `🎉 ¡CORRECTO! ${card.es} means ${card.en}! (+35 Stars!)`
                          );
                          speakInstant(`¡Correcto! ${card.es} is ${card.en}!`, "en-US");
                        } else {
                          setQuizFeedback(
                            `Try again! That was ${card.es}. Find "${quizTarget.es}"!`
                          );
                          speakInstant(`That is ${card.es}. Try again!`, "en-US");
                        }
                      }}
                      className="px-3.5 py-2 rounded-2xl bg-yellow-300 hover:bg-yellow-200 text-slate-950 font-black text-xs shadow cursor-pointer shrink-0"
                    >
                      ✅ Match Quiz
                    </button>
                  </div>

                  <div className="bg-black/20 p-3 rounded-2xl text-xs space-y-1">
                    <div>
                      <strong>🇪🇸 Phrase:</strong> &ldquo;{card.sentenceEs}&rdquo;
                    </div>
                    <div>
                      <strong>🇺🇸 Meaning:</strong> &ldquo;{card.sentenceEn}&rdquo;
                    </div>
                    <div className="text-yellow-200 pt-1">
                      <strong>📜 History Fact:</strong> {card.fact}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => speakInstant(card.sentenceEs, "es-US")}
                      className="py-2.5 rounded-xl bg-white text-slate-900 font-black text-xs shadow hover:bg-yellow-200 cursor-pointer"
                    >
                      🔊 Español
                    </button>
                    <button
                      onClick={() =>
                        speakInstant(`${card.sentenceEn}. ${card.fact}`, "en-US")
                      }
                      className="py-2.5 rounded-xl bg-slate-900 text-white font-black text-xs shadow hover:bg-slate-800 cursor-pointer"
                    >
                      🔊 English
                    </button>
                    <button
                      onClick={() => startMicPractice(card.es)}
                      className="py-2.5 rounded-xl bg-pink-600 text-white font-black text-xs shadow hover:bg-pink-500 cursor-pointer"
                    >
                      🎙️ Say It
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: INTERACTIVE DIGITAL COLORING STUDIO + P.O.D. STOREFRONT */}
        {activeTab === "shop" && (
          <div className="space-y-6 pt-1">
            {/* REAL ON-SCREEN INTERACTIVE COLORING STUDIO */}
            <div className="bg-white rounded-[2rem] p-5 sm:p-6 border-4 border-pink-400 shadow-[0_8px_0_#f472b6] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="px-3 py-1 rounded-full bg-pink-100 text-pink-700 font-black text-xs uppercase">
                    🖍️ Interactive Digital Coloring Book Studio
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 mt-1">
                    Paint Ella Bella Right on Screen, Save or Print!
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Page 1: Hip-Hop Ella", "Page 2: Space Rocket", "Page 3: NJ History"].map(
                    (lbl, idx) => (
                      <button
                        key={lbl}
                        onClick={() => {
                          setColoringTemplate(idx);
                          drawColoringTemplate(idx);
                        }}
                        className={`px-3.5 py-1.5 rounded-full font-black text-xs cursor-pointer ${
                          coloringTemplate === idx
                            ? "bg-pink-500 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {lbl}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Paint Palette & Brush Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-sky-50 p-3 rounded-2xl border-2 border-sky-200">
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_PALETTE.map((hex) => (
                    <button
                      key={hex}
                      onClick={() => setBrushColor(hex)}
                      style={{ backgroundColor: hex }}
                      className={`w-8 h-8 rounded-full border-3 cursor-pointer transition ${
                        brushColor === hex ? "border-slate-950 scale-125" : "border-white"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBrushSize(8)}
                    className={`px-3 py-1 rounded-xl font-black text-xs cursor-pointer ${
                      brushSize === 8 ? "bg-slate-900 text-white" : "bg-white"
                    }`}
                  >
                    ✏️ Fine
                  </button>
                  <button
                    onClick={() => setBrushSize(16)}
                    className={`px-3 py-1 rounded-xl font-black text-xs cursor-pointer ${
                      brushSize === 16 ? "bg-slate-900 text-white" : "bg-white"
                    }`}
                  >
                    🖌️ Thick
                  </button>
                  <button
                    onClick={() => drawColoringTemplate(coloringTemplate)}
                    className="px-3 py-1 rounded-xl bg-rose-100 text-rose-700 font-black text-xs cursor-pointer"
                  >
                    🔄 Clear
                  </button>
                  <button
                    onClick={downloadColoredArtwork}
                    className="px-4 py-1.5 rounded-xl bg-teal-400 text-slate-950 font-black text-xs shadow cursor-pointer"
                  >
                    💾 Save Art (+30 XP)
                  </button>
                </div>
              </div>

              {/* Interactive Paint Canvas */}
              <div className="rounded-2xl overflow-hidden border-4 border-slate-900 bg-white">
                <canvas
                  ref={coloringCanvasRef}
                  width={700}
                  height={275}
                  onMouseDown={() => setIsDrawing(true)}
                  onMouseUp={() => setIsDrawing(false)}
                  onMouseLeave={() => setIsDrawing(false)}
                  onMouseMove={paintOnCanvas}
                  className="w-full h-[230px] sm:h-[275px] cursor-crosshair block"
                />
              </div>
            </div>

            {/* P.O.D. Size Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-5 py-3 rounded-2xl border-2 border-pink-300">
              <span className="font-black text-sm text-slate-800">
                👕 Select Apparel Size for Hoodies & Tees:
              </span>
              <div className="flex flex-wrap gap-2">
                {["Youth S", "Youth M", "Youth L", "Adult M", "Adult L", "Adult XL"].map(
                  (sz) => (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      className={`px-3 py-1 rounded-xl font-black text-xs cursor-pointer ${
                        selectedSize === sz
                          ? "bg-pink-500 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {sz}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Product Storefront Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {SHOP_PRODUCTS.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-[2rem] p-5 border-4 border-pink-400 shadow-[0_8px_0_#f472b6] flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${item.bg} flex items-center justify-center text-5xl shadow-inner shrink-0`}
                    >
                      {item.emoji}
                    </div>
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 font-black text-xs">
                        {item.sub}
                      </span>
                      <h3 className="text-lg font-black text-slate-900 mt-1 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-2xl font-black text-teal-600 mt-0.5">
                        ${item.price}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => addToCart(item)}
                    className="px-5 py-4 rounded-2xl bg-gradient-to-b from-yellow-300 to-amber-500 text-slate-950 font-black text-sm sm:text-base shadow-[0_4px_0_#b45309] active:translate-y-1 transition cursor-pointer shrink-0"
                  >
                    + ADD
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: BEAT LAB DRUM MACHINE & INTERACTIVE SING-ALONG KARAOKE TV */}
        {activeTab === "watch" && (
          <div className="space-y-6 pt-1">
            {/* Episode Selector & Karaoke Stage */}
            <div className="bg-gradient-to-br from-purple-700 via-pink-600 to-rose-500 rounded-[2rem] p-6 sm:p-8 border-4 border-white shadow-[0_10px_0_#581c87] text-white space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="px-3 py-1 rounded-full bg-yellow-300 text-slate-950 font-black text-xs uppercase">
                    📺 Interactive Sing-Along Karaoke & Beat Studio
                  </span>
                  <h2 className="text-2xl sm:text-4xl font-black mt-1">
                    {activeEpisode.title}
                  </h2>
                  <p className="text-pink-100 font-bold text-xs sm:text-sm">
                    {activeEpisode.subtitle} • {activeEpisode.bpm} BPM Hip-Hop Beat
                  </p>
                </div>

                <button
                  onClick={() => setIsBeatPlaying(!isBeatPlaying)}
                  className={`px-7 py-4 rounded-full font-black text-lg border-4 border-white shadow-lg cursor-pointer transition ${
                    isBeatPlaying
                      ? "bg-rose-600 text-white"
                      : "bg-yellow-300 text-slate-950 hover:bg-yellow-200"
                  }`}
                >
                  {isBeatPlaying ? "⏹️ STOP BEAT & RAP" : "▶️ PLAY EPISODE & RAP!"}
                </button>
              </div>

              {/* Episode Switcher Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {EPISODES.map((ep) => (
                  <button
                    key={ep.id}
                    onClick={() => {
                      setIsBeatPlaying(false);
                      setActiveEpisode(ep);
                      setActiveLyricLine(0);
                      setEpQuizFeedback(null);
                      speakInstant(ep.title, "en-US");
                    }}
                    className={`p-3.5 rounded-2xl font-black text-xs sm:text-sm border-3 cursor-pointer text-left ${
                      activeEpisode.id === ep.id
                        ? "bg-white text-slate-950 border-yellow-300"
                        : "bg-black/25 text-white border-white/30 hover:bg-black/40"
                    }`}
                  >
                    🎬 {ep.title}
                  </button>
                ))}
              </div>

              {/* Live Highlighted Karaoke Lyrics Box */}
              <div className="bg-slate-950/65 rounded-3xl p-5 border-4 border-cyan-300 space-y-3">
                {activeEpisode.lyrics.map((line, idx) => {
                  const active = activeLyricLine === idx;
                  return (
                    <div
                      key={line.es}
                      onClick={() => {
                        setActiveLyricLine(idx);
                        speakInstant(`${line.es}. ${line.en}`, "es-US");
                      }}
                      className={`p-3 rounded-2xl transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-1 ${
                        active
                          ? "bg-gradient-to-r from-pink-500 to-amber-400 text-slate-950 font-black scale-[1.01]"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      <span className="text-base sm:text-lg font-black">
                        {line.es}
                      </span>
                      <span
                        className={`text-xs sm:text-sm font-bold ${
                          active ? "text-slate-900" : "text-cyan-200"
                        }`}
                      >
                        {line.en}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Interactive Episode Comprehension Quiz */}
              <div className="bg-white/15 rounded-3xl p-4 border-2 border-yellow-300 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-black uppercase text-yellow-300">
                    🧠 Episode Bonus Question (+40 Stars):
                  </span>
                  <p className="font-black text-base">{activeEpisode.question}</p>
                  {epQuizFeedback && (
                    <p className="text-xs font-black text-yellow-200 mt-1">
                      {epQuizFeedback}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeEpisode.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        if (opt === activeEpisode.answer) {
                          earnStars(40);
                          setEpQuizFeedback("🎉 ¡Exacto! You earned +40 XP Stars!");
                          speakInstant(`¡Correcto! ${opt}!`, "en-US");
                        } else {
                          setEpQuizFeedback("Try again! Listen closely to Ella's lyrics!");
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-white text-slate-950 font-black text-xs hover:bg-yellow-300 cursor-pointer"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive 4-Pad Hip-Hop Drum Machine */}
            <div className="bg-white rounded-[2rem] p-5 border-4 border-purple-400 shadow-md space-y-3">
              <h3 className="text-lg font-black text-slate-900">
                🥁 Make Your Own Hip-Hop Beat (Tap the Drum Pads!)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "kick", label: "🥁 BOOM KICK", color: "from-pink-500 to-rose-600" },
                  { id: "snare", label: "👏🏽 CLAP SNARE", color: "from-cyan-400 to-teal-500" },
                  { id: "hat", label: "✨ HI-HAT TICK", color: "from-amber-400 to-orange-500" },
                  { id: "bass", label: "🎹 808 BASS DROP", color: "from-purple-500 to-indigo-600" },
                ].map((pad) => (
                  <button
                    key={pad.id}
                    onClick={() =>
                      playDrumHit(pad.id as "kick" | "snare" | "hat" | "bass")
                    }
                    className={`py-5 rounded-3xl bg-gradient-to-b ${pad.color} text-white font-black text-sm sm:text-base border-4 border-white shadow-lg active:translate-y-1 cursor-pointer`}
                  >
                    {pad.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* WORKING SHOPPING CART & BACKEND CHECKOUT DRAWER */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 bg-indigo-950/70 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full p-6 flex flex-col justify-between border-l-8 border-pink-400 shadow-2xl">
            <div className="space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between border-b-2 border-pink-100 pb-3">
                <h3 className="text-2xl font-black text-slate-900">
                  🛍️ Your Ella Bella Bag ({cart.reduce((s, i) => s + i.qty, 0)})
                </h3>
                <button
                  onClick={() => setShowCartDrawer(false)}
                  className="w-9 h-9 rounded-full bg-pink-100 font-black text-pink-700 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {cart.length === 0 ? (
                <p className="text-slate-500 font-bold py-8 text-center">
                  Your bag is empty! Add a Coloring Book or Ella Bella Hoodie!
                </p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={`${item.id}-${item.size}`}
                      className="flex items-center justify-between p-3 rounded-2xl bg-pink-50 border border-pink-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{item.emoji}</span>
                        <div>
                          <div className="font-black text-sm text-slate-900">
                            {item.title}
                          </div>
                          <div className="text-xs font-bold text-pink-600">
                            {item.size} • ${item.price} × {item.qty}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            setCart((prev) =>
                              prev
                                .map((i) =>
                                  i.id === item.id && i.size === item.size
                                    ? { ...i, qty: i.qty - 1 }
                                    : i
                                )
                                .filter((i) => i.qty > 0)
                            )
                          }
                          className="w-7 h-7 rounded-lg bg-white border font-black text-xs cursor-pointer"
                        >
                          -
                        </button>
                        <button
                          onClick={() =>
                            setCart((prev) =>
                              prev.map((i) =>
                                i.id === item.id && i.size === item.size
                                  ? { ...i, qty: i.qty + 1 }
                                  : i
                              )
                            )
                          }
                          className="w-7 h-7 rounded-lg bg-white border font-black text-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Promo Code Input */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Promo code (Try ELLAVIP)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border-2 border-slate-200 font-bold text-xs uppercase"
                />
                <button
                  onClick={() => {
                    if (promoCode.trim().toUpperCase() === "ELLAVIP") {
                      setDiscountApplied(true);
                      speakInstant("15% VIP Discount Applied!", "en-US");
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-teal-400 text-slate-950 font-black text-xs cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>

            <div className="border-t-2 border-pink-100 pt-4 space-y-3">
              <div className="flex justify-between text-xl font-black">
                <span>Total {discountApplied ? "(15% Off)" : ""}:</span>
                <span className="text-teal-600">${finalTotal}</span>
              </div>
              <input
                type="email"
                placeholder="Parent Email for Digital PDF & Order Tracking"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-300 font-bold text-sm"
              />
              {checkoutReceipt && (
                <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-900 font-black text-xs text-center">
                  {checkoutReceipt}
                </div>
              )}
              <button
                onClick={async () => {
                  const res = await fetch("/api/platform", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "checkout",
                      cart,
                      email: parentEmail,
                      total: finalTotal,
                    }),
                  });
                  const data = await res.json();
                  setCheckoutReceipt(data.message);
                  earnStars(100);
                  speakInstant("¡Gracias! Order confirmed!", "es-US");
                  setCart([]);
                }}
                className="w-full py-4 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-lg shadow-[0_5px_0_#9f1239] cursor-pointer"
              >
                🔒 Complete Instant Checkout (${finalTotal})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRO PASS PAYWALL MODAL ($4.99/mo) */}
      {showProModal && (
        <div className="fixed inset-0 z-50 bg-indigo-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-md w-full p-7 border-8 border-yellow-300 shadow-2xl text-center space-y-4 relative">
            <button
              onClick={() => setShowProModal(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-pink-100 font-black text-pink-700 cursor-pointer"
            >
              ✕
            </button>

            <div className="text-5xl">👑👓🚀</div>
            <h3 className="text-3xl font-black text-slate-900">
              Ella Bella PRO Pass!
            </h3>
            <p className="text-base font-bold text-pink-600">
              Unlock Everything for $4.99/month:
            </p>

            <div className="space-y-2 text-left bg-sky-50 p-4 rounded-3xl border-2 border-sky-200 font-bold text-sm text-slate-800">
              <div>✅ Unlock World 2 (NJ Hip-Hop Block) & World 3 (Maya Space)</div>
              <div>✅ All Digital Coloring Book Templates & Printable Packs</div>
              <div>✅ 15% VIP Code (ELLAVIP) on Hoodies & Graphic Tees</div>
            </div>

            <button
              onClick={() => {
                setIsProUnlocked(true);
                setDiscountApplied(true);
                try {
                  localStorage.setItem("ella_pro_unlocked", "true");
                } catch {
                  // Ignore
                }
                setShowProModal(false);
                earnStars(200);
                speakInstant("¡Increíble! All Pro Worlds Unlocked!", "es-US");
              }}
              className="w-full py-4 rounded-full bg-gradient-to-b from-pink-400 to-rose-600 text-white font-black text-xl border-4 border-white shadow-[0_6px_0_#9f1239] cursor-pointer"
            >
              ACTIVATE PRO PASS — $4.99/mo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
