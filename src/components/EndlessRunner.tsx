"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

export type WordToken = {
  es: string;
  en: string;
  emoji: string;
  color: string;
  fact: string;
};

export const WORD_BANK: WordToken[] = [
  {
    es: "¡El Ritmo!",
    en: "The Rhythm",
    emoji: "🎤",
    color: "#ec4899",
    fact: "Hip-Hop began at Black and Afro-Latino block parties in the 1970s!",
  },
  {
    es: "¡Salta!",
    en: "Jump High",
    emoji: "👟",
    color: "#06b6d4",
    fact: "Double-jumping helps Ella Bella reach high floating Spanish words!",
  },
  {
    es: "¡La Estrella!",
    en: "Shining Star",
    emoji: "⭐",
    color: "#f59e0b",
    fact: "Dr. Ellen Ochoa was the first Latina astronaut to fly into space!",
  },
  {
    es: "¡La Historia!",
    en: "History",
    emoji: "🧭",
    color: "#8b5cf6",
    fact: "Arturo Schomburg collected thousands of books on Afro-Latino and Black history!",
  },
  {
    es: "¡La Cultura!",
    en: "The Culture",
    emoji: "🌎",
    color: "#10b981",
    fact: "Being bilingual exercises your brain and connects communities together!",
  },
  {
    es: "¡La Música!",
    en: "The Music",
    emoji: "🎧",
    color: "#f43f5e",
    fact: "Salsa, Reggaeton, and Hip-Hop share West African and Caribbean drum rhythms!",
  },
];

type WorldConfig = {
  id: number;
  name: string;
  esName: string;
  skyTop: string;
  skyMid: string;
  skyBot: string;
  hillColor: string;
  floorColor: string;
  isPro: boolean;
};

const WORLDS: WorldConfig[] = [
  {
    id: 1,
    name: "World 1: Rainbow Park",
    esName: "Parque Arcoíris",
    skyTop: "#38bdf8",
    skyMid: "#f472b6",
    skyBot: "#fef08a",
    hillColor: "#c084fc",
    floorColor: "#581c87",
    isPro: false,
  },
  {
    id: 2,
    name: "World 2: NJ Hip-Hop Block",
    esName: "Barrio Hip-Hop NJ",
    skyTop: "#1e1b4b",
    skyMid: "#be185d",
    skyBot: "#f59e0b",
    hillColor: "#312e81",
    floorColor: "#0f172a",
    isPro: true,
  },
  {
    id: 3,
    name: "World 3: Maya Space Salsa",
    esName: "Espacio Maya",
    skyTop: "#022c22",
    skyMid: "#0f766e",
    skyBot: "#2dd4bf",
    hillColor: "#115e59",
    floorColor: "#042f2e",
    isPro: true,
  },
];

type SpeedMode = {
  id: "chill" | "groove" | "turbo";
  label: string;
  baseSpeed: number;
  maxSpeed: number;
};

const SPEED_MODES: SpeedMode[] = [
  { id: "chill", label: "🐢 Chill", baseSpeed: 185, maxSpeed: 240 },
  { id: "groove", label: "🎵 Groove", baseSpeed: 240, maxSpeed: 310 },
  { id: "turbo", label: "🚀 Turbo", baseSpeed: 310, maxSpeed: 400 },
];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
};

type Props = {
  isProUnlocked: boolean;
  onUnlockPro: () => void;
  speakInstant: (text: string, lang?: "en-US" | "es-US") => void;
  spriteSrc: string;
  onEarnStars: (pts: number) => void;
};

export default function EndlessRunner({
  isProUnlocked,
  onUnlockPro,
  speakInstant,
  spriteSrc,
  onEarnStars,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spriteImgRef = useRef<HTMLImageElement | null>(null);
  const [spriteLoaded, setSpriteLoaded] = useState(false);
  const [usePhotoSprite, setUsePhotoSprite] = useState(false);

  const [selectedWorld, setSelectedWorld] = useState<WorldConfig>(WORLDS[0]);
  const [speedMode, setSpeedMode] = useState<SpeedMode>(SPEED_MODES[1]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [popWord, setPopWord] = useState<string>("Tap Screen or Press SPACE to Jump!");
  const [quizWord, setQuizWord] = useState<WordToken | null>(null);

  useEffect(() => {
    const savedCustomSprite =
      typeof window !== "undefined" ? localStorage.getItem("ella_sprite_img") : null;
    const activeSrc = savedCustomSprite || spriteSrc;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      spriteImgRef.current = img;
      setSpriteLoaded(true);
    };
    img.onerror = () => setSpriteLoaded(false);
    img.src = activeSrc;
  }, [spriteSrc]);

  const handleDirectSpriteUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        spriteImgRef.current = img;
        setSpriteLoaded(true);
        setUsePhotoSprite(true);
      };
      img.src = dataUrl;
      try {
        localStorage.setItem("ella_sprite_img", dataUrl);
      } catch {
        // Ignore quota errors
      }
      fetch("/api/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "persist_images", spriteDataUrl: dataUrl }),
      }).catch(() => {});
      speakInstant("¡Lista! Photo sprite loaded and facing forward!", "es-US");
    };
    reader.readAsDataURL(file);
  };

  const stateRef = useRef({
    lastTime: 0,
    runCycle: 0,
    ellaY: 205,
    ellaVy: 0,
    jumpsLeft: 2,
    squashX: 1,
    squashY: 1,
    obstacleX: 820,
    tokenX: 460,
    tokenY: 110,
    tokenIndex: 0,
    speed: 240,
    distance: 0,
    currentScore: 0,
    currentStreak: 0,
    particles: [] as Particle[],
    bubbles: [
      { x: 140, y: 55, r: 18, c: "#f43f5e", s: 0.35 },
      { x: 360, y: 40, r: 14, c: "#38bdf8", s: 0.5 },
      { x: 580, y: 68, r: 22, c: "#a855f7", s: 0.3 },
      { x: 730, y: 45, r: 16, c: "#facc15", s: 0.45 },
    ],
  });

  const playSound = useCallback((type: "jump" | "double" | "coin" | "gameover") => {
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

      if (type === "jump" || type === "double") {
        osc.type = "sine";
        const f = type === "jump" ? 330 : 460;
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(f * 1.9, now + 0.14);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === "coin") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.07);
        osc.frequency.setValueAtTime(1174.66, now + 0.14);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.24);
        osc.start(now);
        osc.stop(now + 0.24);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(70, now + 0.25);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.26);
        osc.start(now);
        osc.stop(now + 0.26);
      }
    } catch {
      // Ignore audio block
    }
  }, []);

  const spawnBurst = (x: number, y: number, color: string) => {
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const spd = 80 + Math.random() * 140;
      stateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 5 + Math.random() * 4,
        color: i % 2 === 0 ? color : "#fde047",
        life: 1,
      });
    }
  };

  const triggerJump = useCallback(() => {
    if (quizWord) return;
    const s = stateRef.current;
    if (!isPlaying) {
      s.lastTime = performance.now();
      s.ellaY = 205;
      s.ellaVy = 0;
      s.jumpsLeft = 2;
      s.squashX = 1;
      s.squashY = 1;
      s.obstacleX = 820;
      s.tokenX = 480;
      s.tokenY = 110;
      s.speed = speedMode.baseSpeed;
      s.currentScore = 0;
      s.currentStreak = 0;
      s.particles = [];
      setScore(0);
      setStreak(0);
      setGameOver(false);
      setIsPlaying(true);
      setPopWord("¡Vamos! Jump & Catch Bilingual Words!");
      playSound("jump");
      speakInstant("¡Vamos a correr!", "es-US");
      return;
    }

    if (s.jumpsLeft > 0) {
      const first = s.jumpsLeft === 2;
      s.ellaVy = first ? -535 : -485;
      s.jumpsLeft -= 1;
      s.squashX = 0.88;
      s.squashY = 1.14;
      playSound(first ? "jump" : "double");
      spawnBurst(135, s.ellaY + 45, "#22d3ee");
    }
  }, [isPlaying, playSound, quizWord, speakInstant, speedMode.baseSpeed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        triggerJump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [triggerJump]);

  // Main 60FPS Game Loop — High-Res Chibi/Pixar Ella Bella Sprite Matching Uploaded Art!
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const GROUND_Y = 205;

    const drawPill = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      fill: string,
      stroke?: string,
      lineW = 3
    ) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.lineWidth = lineW;
        ctx.strokeStyle = stroke;
        ctx.stroke();
      }
    };

    const render = (timestamp: number) => {
      const s = stateRef.current;
      if (!s.lastTime) s.lastTime = timestamp;
      const dt = Math.min((timestamp - s.lastTime) / 1000, 0.05);
      s.lastTime = timestamp;

      // 1. Background Sky
      const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
      sky.addColorStop(0, selectedWorld.skyTop);
      sky.addColorStop(0.55, selectedWorld.skyMid);
      sky.addColorStop(1, selectedWorld.skyBot);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Rainbow Vertical Ribbons (From Ella Bella Jumping Art)
      const cols = [
        "rgba(244,63,94,0.22)",
        "rgba(56,189,248,0.22)",
        "rgba(74,222,128,0.22)",
        "rgba(250,204,21,0.22)",
      ];
      cols.forEach((c, idx) => {
        ctx.fillStyle = c;
        ctx.fillRect(160 + idx * 125, 0, 125, GROUND_Y + 55);
      });

      // Floating 3D Spheres
      s.bubbles.forEach((b) => {
        if (isPlaying && !quizWord) {
          b.x -= s.speed * b.s * dt;
          if (b.x < -40) b.x = canvas.width + 40;
        }
        const by = b.y + Math.sin(timestamp * 0.003 + b.x) * 5;
        ctx.beginPath();
        ctx.arc(b.x, by, b.r, 0, Math.PI * 2);
        ctx.fillStyle = b.c;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(b.x - b.r * 0.3, by - b.r * 0.3, b.r * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.fill();
      });

      // Rolling Candy Park Hills
      ctx.fillStyle = selectedWorld.hillColor;
      for (let i = 0; i < 6; i++) {
        const hx = ((i * 220 - ((s.distance * 0.3) % 1320) + 1320) % 1320) - 180;
        ctx.beginPath();
        ctx.arc(hx, GROUND_Y + 60, 115, Math.PI, 0);
        ctx.fill();
      }

      // Purple Track Floor
      ctx.fillStyle = selectedWorld.floorColor;
      ctx.fillRect(0, GROUND_Y + 50, canvas.width, 70);
      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(0, GROUND_Y + 50, canvas.width, 6);

      for (let i = 0; i < 12; i++) {
        const sx = ((i * 90 - ((s.distance * 0.9) % 1080) + 1080) % 1080) - 60;
        drawPill(sx, GROUND_Y + 65, 42, 6, 3, "rgba(255,255,255,0.35)");
      }

      // 2. Paced Kid-Friendly Physics
      if (isPlaying && !quizWord) {
        s.distance += s.speed * dt;
        s.runCycle += dt * (s.speed * 0.045);

        s.ellaY += s.ellaVy * dt;
        s.ellaVy += 1250 * dt;

        s.squashX += (1 - s.squashX) * 12 * dt;
        s.squashY += (1 - s.squashY) * 12 * dt;

        if (s.ellaY >= GROUND_Y) {
          if (s.ellaVy > 180) {
            s.squashX = 1.12;
            s.squashY = 0.88;
          }
          s.ellaY = GROUND_Y;
          s.ellaVy = 0;
          s.jumpsLeft = 2;
        }

        // Obstacle Movement
        s.obstacleX -= s.speed * dt;
        if (s.obstacleX < -70) {
          s.obstacleX = canvas.width + 180 + Math.random() * 240;
          s.currentScore += 15;
          setScore(s.currentScore);
          onEarnStars(5);
          s.speed = Math.min(
            speedMode.maxSpeed,
            speedMode.baseSpeed + s.currentScore * 0.12
          );
        }

        // Bilingual Word Token Movement
        s.tokenX -= s.speed * 0.92 * dt;
        if (s.tokenX < -90) {
          s.tokenX = canvas.width + 140 + Math.random() * 180;
          s.tokenY = 90 + Math.random() * 55;
          s.tokenIndex = (s.tokenIndex + 1) % WORD_BANK.length;
        }

        // Word Token Catch
        const ellaCenterX = 135;
        const ellaCenterY = s.ellaY - 5;
        if (Math.hypot(ellaCenterX - s.tokenX, ellaCenterY - s.tokenY) < 62) {
          const w = WORD_BANK[s.tokenIndex];
          s.currentScore += 50;
          s.currentStreak += 1;
          setScore(s.currentScore);
          setStreak(s.currentStreak);
          onEarnStars(25);
          setPopWord(`${w.emoji} ${w.es} = ${w.en} (+50!)`);
          playSound("coin");
          speakInstant(`${w.es}. ${w.en}`, "es-US");
          spawnBurst(s.tokenX, s.tokenY, w.color);

          if (s.currentStreak > 0 && s.currentStreak % 5 === 0) {
            setQuizWord(w);
          }

          s.tokenX = canvas.width + 220;
          s.tokenY = 90 + Math.random() * 55;
          s.tokenIndex = (s.tokenIndex + 1) % WORD_BANK.length;
        }

        // Forgiving Obstacle Hitbox
        const hitX = 135 + 14 > s.obstacleX + 10 && 135 - 14 < s.obstacleX + 42;
        const hitY = s.ellaY + 44 > GROUND_Y + 50 - 42;
        if (hitX && hitY) {
          playSound("gameover");
          spawnBurst(135, s.ellaY + 25, "#f43f5e");
          setIsPlaying(false);
          setGameOver(true);
          setHighScore((prev) => Math.max(prev, s.currentScore));
          speakInstant("¡Buen intento! Tap to run again!", "en-US");
        }
      } else {
        s.runCycle += dt * 3.5;
      }

      // 3. Draw Floating Bilingual Word Pill
      const token = WORD_BANK[s.tokenIndex];
      const bobY = s.tokenY + Math.sin(timestamp * 0.005) * 6;
      drawPill(s.tokenX - 56, bobY - 20, 112, 40, 20, token.color, "#fef08a");
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${token.emoji} ${token.es}`, s.tokenX, bobY + 5);

      // 4. Draw Hip-Hop Boombox Obstacle
      const obsY = GROUND_Y + 50 - 44;
      const pulse = 1 + Math.sin(timestamp * 0.015) * 0.05;
      ctx.save();
      ctx.translate(s.obstacleX + 25, obsY + 22);
      ctx.scale(pulse, 2 - pulse);
      drawPill(-25, -22, 50, 44, 11, "#f43f5e", "#fde047");
      drawPill(-13, -29, 26, 7, 3, "#fde047");
      ctx.fillStyle = "#1e1b4b";
      ctx.beginPath();
      ctx.arc(-10, 2, 8, 0, Math.PI * 2);
      ctx.arc(10, 2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath();
      ctx.arc(-10, 2, 3.5, 0, Math.PI * 2);
      ctx.arc(10, 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 5. DRAW ELLA BELLA (PIXAR/CHIBI PROPORTIONS MATCHING UPLOADED ART!)
      const inAir = s.ellaY < GROUND_Y - 2;
      const stride = isPlaying
        ? inAir
          ? 0.82
          : Math.sin(s.runCycle) * 0.78
        : Math.sin(s.runCycle) * 0.12;
      const bounceY = isPlaying && !inAir ? Math.abs(Math.cos(s.runCycle)) * -7 : 0;

      // Ground Shadow
      const shadowScale = Math.max(0.4, 1 - (GROUND_Y - s.ellaY) / 180);
      ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
      ctx.beginPath();
      ctx.ellipse(135, GROUND_Y + 50, 34 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(135, s.ellaY + 50 + bounceY);
      ctx.scale(s.squashX, s.squashY);

      if (usePhotoSprite && spriteLoaded && spriteImgRef.current) {
        // PHOTO SPRITE MODE: Mirror-Flipped to Face RIGHT + Silhouette Cutout (Zero Slicing Distortion!)
        const img = spriteImgRef.current;
        ctx.save();
        ctx.translate(0, -54);
        // Athletic forward runner tilt to the right
        ctx.rotate(inAir ? -0.1 : Math.sin(s.runCycle) * 0.09);
        // Mirror horizontally so Ella Bella faces RIGHT (direction of motion)
        ctx.scale(-1, 1);

        // Crop tightly around Ella in center of 16:9 frame
        const sw = img.width * 0.56;
        const sh = img.height * 0.96;
        const sx = (img.width - sw) / 2;
        const sy = img.height * 0.02;

        // Custom Chibi Silhouette Path (Trims away outer purple/green background corners)
        ctx.beginPath();
        ctx.arc(0, -14, 38, 0, Math.PI * 2); // Big Head & Wavy Hair Halo
        ctx.arc(-24, 14, 18, 0, Math.PI * 2); // Left Pumped Arm
        ctx.arc(24, 14, 18, 0, Math.PI * 2); // Right Pumped Arm
        ctx.arc(0, 26, 28, 0, Math.PI * 2); // Overalls & Kicking Sneakers
        ctx.closePath();

        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 8;
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.clip();

        ctx.drawImage(img, sx, sy, sw, sh, -52, -54, 104, 108);
        ctx.restore();
      } else {
        // DEFAULT PIXAR/CHIBI 3D RIG: Large Expressive Head, Big Brown Eyes, Clean Sky-Blue Glasses!
        ctx.rotate(isPlaying ? (inAir ? -0.06 : 0.08) : 0);

        const drawSneakerLeg = (angle: number, isFront: boolean) => {
          ctx.save();
          ctx.translate(isFront ? 6 : -6, -24);
          ctx.rotate(angle);
          // Bubblegum-Pink Rolled Overalls Leg (#F472B6)
          drawPill(-7, 0, 15, 18, 7, isFront ? "#f472b6" : "#db2777");
          // Pink Cuffed Hem
          drawPill(-8, 12, 17, 6, 3, "#f9a8d4");
          // Oversized Mint-Teal & White High-Top Sneaker (Matches Art!)
          ctx.translate(1, 16);
          ctx.rotate(angle * 0.3);
          // Sneaker Upper (Mint Teal)
          drawPill(-8, 0, 24, 11, 5, "#4fd1c5", "#ffffff", 2.5);
          // White Toe Cap & Laces
          drawPill(6, 1, 10, 8, 4, "#ffffff");
          // Dark Espresso-Brown Treaded Sole
          drawPill(-8, 8, 24, 4, 2, "#451a03");
          ctx.restore();
        };

        const drawSweaterArm = (angle: number, isFront: boolean) => {
          ctx.save();
          ctx.translate(isFront ? 10 : -10, -44);
          ctx.rotate(angle);
          // Mint-Teal Ribbed Sweater Sleeve (#4FD1C5)
          drawPill(-6, 0, 13, 20, 6, isFront ? "#4fd1c5" : "#319795");
          // Ribbed Cuff
          drawPill(-6.5, 15, 14, 5, 2.5, "#81e6d9");
          // Warm Clenched Runner Fist
          ctx.fillStyle = "#e89b6c";
          ctx.beginPath();
          ctx.arc(0.5, 22, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        };

        // 1. Back Arm & Back Leg
        drawSweaterArm(stride * 0.95, false);
        drawSneakerLeg(-stride, false);

        // 2. Torso: Mint-Teal Sweater + Bubblegum-Pink Overalls + Bronze Clasps
        drawPill(-17, -49, 34, 28, 12, "#4fd1c5");
        // Ribbed Crewneck Collar
        drawPill(-10, -51, 20, 6, 3, "#81e6d9");
        // Pink Overalls Bib & Pants
        drawPill(-15, -40, 30, 21, 9, "#f472b6");
        // Overalls Shoulder Straps
        drawPill(-12, -49, 6, 13, 3, "#ec4899");
        drawPill(6, -49, 6, 13, 3, "#ec4899");
        // Bronze/Gold Clasps
        ctx.fillStyle = "#d97706";
        ctx.beginPath();
        ctx.arc(-9, -39, 2.8, 0, Math.PI * 2);
        ctx.arc(9, -39, 2.8, 0, Math.PI * 2);
        ctx.fill();

        // 3. Front Leg & Front Arm
        drawSneakerLeg(stride, true);
        drawSweaterArm(-stride * 0.95, true);

        // 4. LARGE CHIBI/PIXAR HEAD (Matches Uploaded Ella Bella Art!)
        ctx.save();
        ctx.translate(2, -78 + Math.sin(s.runCycle * 2) * 2);
        // Joyful head tilt
        ctx.rotate(-0.04);

        // A. Back Wavy Chestnut-Brown Hair with Flared Side Tips!
        ctx.fillStyle = "#4a210b";
        ctx.beginPath();
        // Crown volume
        ctx.arc(0, -6, 28, 0, Math.PI * 2);
        // Left flared hair wave
        ctx.ellipse(-24, 0, 14, 9, -0.35, 0, Math.PI * 2);
        // Right flared hair wave
        ctx.ellipse(25, -2, 14, 9, 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Warm Hair Midtone Waves
        ctx.fillStyle = "#6e3517";
        ctx.beginPath();
        ctx.arc(-14, -12, 16, 0, Math.PI * 2);
        ctx.arc(12, -12, 16, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.fillStyle = "#e09163";
        ctx.beginPath();
        ctx.arc(-21, 4, 6, 0, Math.PI * 2);
        ctx.arc(23, 4, 6, 0, Math.PI * 2);
        ctx.fill();

        // B. 3D Shaded Warm Peach-Caramel Face (23px radius — Huge & Clear!)
        const faceGrad = ctx.createRadialGradient(4, -2, 3, 2, 2, 24);
        faceGrad.addColorStop(0, "#fbd3b7");
        faceGrad.addColorStop(0.65, "#eb9f72");
        faceGrad.addColorStop(1, "#c97849");
        ctx.fillStyle = faceGrad;
        ctx.beginPath();
        ctx.ellipse(2, 3, 23, 21, 0, 0, Math.PI * 2);
        ctx.fill();

        // Soft Rosy Cheeks
        ctx.fillStyle = "rgba(244, 63, 94, 0.28)";
        ctx.beginPath();
        ctx.arc(-10, 9, 5.5, 0, Math.PI * 2);
        ctx.arc(16, 9, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Expressive Arched Dark-Brown Eyebrows
        ctx.strokeStyle = "#3b1506";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(-7, -3, 8, Math.PI * 1.15, Math.PI * 1.8);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(13, -3, 8, Math.PI * 1.2, Math.PI * 1.85);
        ctx.stroke();

        // C. HUGE PIXAR EYES (White Sclera -> Honey-Amber Iris -> Deep Pupil -> Star Catchlights)
        const drawPixarEye = (ex: number, ey: number) => {
          // Bright White Sclera
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.ellipse(ex, ey, 7.2, 7.8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Warm Honey-Brown Iris (#9A4B1A)
          ctx.fillStyle = "#9a4b1a";
          ctx.beginPath();
          ctx.arc(ex + 1, ey, 5.2, 0, Math.PI * 2);
          ctx.fill();

          // Deep Espresso Pupil
          ctx.fillStyle = "#1e0b04";
          ctx.beginPath();
          ctx.arc(ex + 1.2, ey, 3.1, 0, Math.PI * 2);
          ctx.fill();

          // Big Pixar White Star Catchlights
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(ex - 0.8, ey - 2.2, 1.9, 0, Math.PI * 2);
          ctx.arc(ex + 2.8, ey + 1.8, 0.9, 0, Math.PI * 2);
          ctx.fill();
        };

        drawPixarEye(-7, 1);
        drawPixarEye(13, 1);

        // Cute Button Nose
        ctx.fillStyle = "#d97757";
        ctx.beginPath();
        ctx.ellipse(3, 5.5, 2.8, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // D. Joyful Wide Open Smile with White Teeth & Pink Tongue!
        ctx.fillStyle = "#691122";
        ctx.beginPath();
        ctx.arc(3, 10, 8.5, 0.05, Math.PI - 0.05);
        ctx.fill();
        // Top White Teeth
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-3.5, 10, 13, 3);
        // Pink Tongue
        ctx.fillStyle = "#fb7185";
        ctx.beginPath();
        ctx.arc(3, 16, 4.5, Math.PI, 0);
        ctx.fill();

        // E. SIGNATURE OVERSIZED SKY-BLUE GLASSES (Frames *Around* the Eyes Cleanly!)
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.roundRect(-18.5, -9, 22, 19, 8);
        ctx.roundRect(2.5, -9, 22, 19, 8);
        ctx.stroke();

        // Glasses Bridge
        ctx.beginPath();
        ctx.moveTo(2.5, -1);
        ctx.lineTo(3.5, -1);
        ctx.stroke();

        // Glossy White Highlight on Top of Glasses Frames
        ctx.strokeStyle = "#cffafe";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-14, -7.5);
        ctx.lineTo(-2, -7.5);
        ctx.moveTo(7, -7.5);
        ctx.lineTo(19, -7.5);
        ctx.stroke();

        // F. Swooping Parted Front Hair Bangs (With Caramel Highlights!)
        ctx.fillStyle = "#5a2810";
        ctx.beginPath();
        // Left swoopbang
        ctx.ellipse(-10, -16, 18, 7.5, -0.28, 0, Math.PI * 2);
        // Right swoopbang
        ctx.ellipse(14, -15, 15, 7, 0.32, 0, Math.PI * 2);
        ctx.fill();

        // Glossy Hair Highlight Ribbon
        ctx.strokeStyle = "#9c4a21";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(-9, -15, 11, Math.PI * 1.1, Math.PI * 1.75);
        ctx.stroke();

        ctx.restore();
      }

      ctx.restore();

      // 6. Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt * 2.2;
        if (p.life <= 0) {
          s.particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    isPlaying,
    onEarnStars,
    playSound,
    quizWord,
    selectedWorld,
    speakInstant,
    speedMode.baseSpeed,
    speedMode.maxSpeed,
    spriteLoaded,
    usePhotoSprite,
  ]);

  const selectWorld = (w: WorldConfig) => {
    if (w.isPro && !isProUnlocked) {
      onUnlockPro();
      return;
    }
    setSelectedWorld(w);
    speakInstant(w.esName, "es-US");
  };

  return (
    <div className="space-y-3 scroll-mt-24">
      {/* Top Arcade Controls: World Selector + Speed Selector + Photo Sprite Loader */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white/95 p-3 rounded-3xl border-4 border-pink-300 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {WORLDS.map((w) => {
            const active = selectedWorld.id === w.id;
            const locked = w.isPro && !isProUnlocked;
            return (
              <button
                key={w.id}
                onClick={() => selectWorld(w)}
                className={`px-3.5 py-1.5 rounded-full font-black text-xs transition cursor-pointer ${
                  active
                    ? "bg-teal-400 text-slate-950 border-2 border-slate-900 shadow"
                    : locked
                    ? "bg-amber-300 hover:bg-amber-200 text-slate-950 border-2 border-amber-600"
                    : "bg-pink-500 text-white"
                }`}
              >
                {locked ? "🔒 " : "🌈 "}
                {w.name}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {SPEED_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setSpeedMode(m);
                stateRef.current.speed = m.baseSpeed;
              }}
              className={`px-3 py-1 rounded-full font-black text-xs cursor-pointer ${
                speedMode.id === m.id
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {m.label}
            </button>
          ))}

          {spriteLoaded && (
            <button
              onClick={() => setUsePhotoSprite(!usePhotoSprite)}
              className="px-3 py-1 rounded-full bg-teal-100 hover:bg-teal-200 text-teal-950 font-black text-xs border border-teal-400 cursor-pointer"
            >
              {usePhotoSprite ? "🎨 Use Pixar 3D Rig" : "🖼️ Use Photo Sprite"}
            </button>
          )}

          <label className="px-3 py-1 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-900 font-black text-xs border border-purple-400 cursor-pointer">
            📸 Load Sprite .JPG
            <input
              type="file"
              accept="image/*"
              onChange={handleDirectSpriteUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Live Score & Streak Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="text-xs sm:text-sm font-black text-pink-700 bg-pink-100 px-4 py-1.5 rounded-full border-2 border-pink-300">
          🗣️ {popWord}
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1 rounded-full bg-pink-500 text-white font-black text-xs sm:text-sm shadow">
            🔥 Streak: {streak}
          </div>
          <div className="px-3.5 py-1 rounded-full bg-white border-2 border-cyan-400 font-black text-xs sm:text-sm text-slate-900 shadow">
            ⭐ Score: {score}
          </div>
          <div className="px-3.5 py-1 rounded-full bg-yellow-300 border-2 border-amber-500 font-black text-xs sm:text-sm text-slate-900 shadow">
            🏆 Best: {highScore}
          </div>
        </div>
      </div>

      {/* Interactive Game Stage */}
      <div
        onClick={triggerJump}
        className="relative rounded-[2rem] overflow-hidden border-8 border-cyan-400 shadow-[0_10px_0_#0284c7] cursor-pointer select-none bg-sky-300"
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={265}
          className="w-full h-[245px] sm:h-[285px] block"
        />

        {/* In-Game Bilingual Checkpoint Pop-Quiz (Every 5 Words Caught!) */}
        {quizWord && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 bg-indigo-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center space-y-3"
          >
            <span className="px-3 py-1 rounded-full bg-yellow-300 text-slate-950 font-black text-xs uppercase">
              🌟 5-Word Streak Bonus Quiz! (+100 Stars)
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              What does <span className="text-yellow-300">{quizWord.es}</span> mean in English?
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {WORD_BANK.slice(0, 3).map((option) => {
                const isWinner = option.es === quizWord.es;
                return (
                  <button
                    key={option.es}
                    onClick={() => {
                      if (isWinner) {
                        stateRef.current.currentScore += 100;
                        setScore(stateRef.current.currentScore);
                        onEarnStars(100);
                        playSound("coin");
                        speakInstant(`¡Correcto! ${quizWord.es} means ${quizWord.en}!`, "en-US");
                      } else {
                        speakInstant(`Close! ${quizWord.es} means ${quizWord.en}!`, "en-US");
                      }
                      setQuizWord(null);
                      stateRef.current.lastTime = performance.now();
                    }}
                    className="px-5 py-3 rounded-2xl bg-white hover:bg-teal-300 text-slate-900 font-black text-base border-4 border-pink-400 shadow cursor-pointer"
                  >
                    {option.emoji} {option.en}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Start / Game Over Overlay */}
        {!isPlaying && !quizWord && (
          <div className="absolute inset-0 bg-indigo-950/50 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center space-y-4">
            <h3 className="text-3xl sm:text-5xl font-black text-yellow-300 drop-shadow-[0_4px_0_#991b1b]">
              {gameOver ? `¡Brava! Score: ${score} ⭐` : "¡Vamos a Correr!"}
            </h3>
            <p className="text-white font-bold text-xs sm:text-sm max-w-md bg-black/35 px-4 py-1.5 rounded-full">
              Speed: {speedMode.label} • Tap Screen or Press SPACEBAR to Jump & Double-Jump!
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerJump();
                }}
                className="px-8 py-4 rounded-full bg-gradient-to-b from-teal-300 to-teal-500 hover:from-teal-200 hover:to-teal-400 text-slate-950 font-black text-xl sm:text-2xl border-4 border-white shadow-[0_6px_0_#0f766e] active:translate-y-1 transition cursor-pointer"
              >
                {gameOver ? "🔄 PLAY AGAIN!" : "▶️ TAP TO RUN!"}
              </button>

              {!isProUnlocked && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnlockPro();
                  }}
                  className="px-6 py-4 rounded-full bg-gradient-to-b from-yellow-300 to-amber-500 text-slate-950 font-black text-lg sm:text-xl border-4 border-white shadow-[0_6px_0_#92400e] active:translate-y-1 transition cursor-pointer"
                >
                  👑 UNLOCK ALL WORLDS
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
