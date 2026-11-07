// PASS 07 — original line-art coloring pages (SVG masters, rendered to the line-art layer).
// MDN "SVG as an image": explicit width/height, no scripts or external resources,
// same-origin data so the canvas is never tainted and can be exported.

export const DOC_W = 1280;
export const DOC_H = 960;

export type ColoringTemplate = { id: string; title: string; titleEs: string; svg: string };

const S = 'fill="none" stroke="#111827" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"';

function star(cx: number, cy: number, r: number, inner = 0.45, points = 5) {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" ${S}/>`;
}

function note(x: number, y: number) {
  return `<ellipse cx="${x}" cy="${y}" rx="26" ry="19" ${S}/><path d="M${x + 24} ${y - 4} V${y - 110} L${x + 70} ${y - 90} V${y - 60} L${x + 24} ${y - 76}" ${S}/>`;
}

const wrap = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${DOC_W}" height="${DOC_H}" viewBox="0 0 ${DOC_W} ${DOC_H}">${body}</svg>`;

const ella = wrap(`
  <!-- hair -->
  <path d="M400 430 C380 250 520 150 640 160 C780 165 900 260 880 440 C930 520 900 620 840 640 L440 640 C380 620 350 520 400 430 Z" ${S}/>
  <!-- face -->
  <ellipse cx="640" cy="460" rx="190" ry="200" ${S}/>
  <!-- bangs -->
  <path d="M470 360 C540 300 600 330 640 290 C690 330 760 300 810 360" ${S}/>
  <!-- glasses -->
  <circle cx="565" cy="450" r="62" ${S}/>
  <circle cx="715" cy="450" r="62" ${S}/>
  <path d="M627 450 Q640 430 653 450" ${S}/>
  <circle cx="565" cy="455" r="20" ${S}/>
  <circle cx="715" cy="455" r="20" ${S}/>
  <!-- cheeks + smile -->
  <circle cx="505" cy="545" r="26" ${S}/>
  <circle cx="775" cy="545" r="26" ${S}/>
  <path d="M570 560 Q640 640 710 560 Z" ${S}/>
  <!-- overalls -->
  <path d="M470 650 L810 650 L860 940 L420 940 Z" ${S}/>
  <rect x="540" y="700" width="200" height="140" rx="20" ${S}/>
  <circle cx="520" cy="690" r="18" ${S}/>
  <circle cx="760" cy="690" r="18" ${S}/>
  ${star(190, 220, 110)}
  ${star(1090, 250, 90)}
  ${note(170, 700)}
  ${note(1040, 720)}
`);

const rocket = wrap(`
  <!-- rocket body -->
  <path d="M640 110 C760 230 790 420 760 640 L520 640 C490 420 520 230 640 110 Z" ${S}/>
  <circle cx="640" cy="360" r="70" ${S}/>
  <circle cx="640" cy="360" r="40" ${S}/>
  <path d="M520 520 L410 680 L520 640 Z" ${S}/>
  <path d="M760 520 L870 680 L760 640 Z" ${S}/>
  <path d="M560 640 L600 760 L640 690 L680 760 L720 640 Z" ${S}/>
  <path d="M600 640 L640 860 L680 640" ${S}/>
  <!-- planets -->
  <circle cx="230" cy="300" r="120" ${S}/>
  <ellipse cx="230" cy="300" rx="200" ry="45" ${S}/>
  <circle cx="1060" cy="650" r="130" ${S}/>
  <circle cx="1020" cy="610" r="30" ${S}/>
  <circle cx="1100" cy="700" r="22" ${S}/>
  ${star(1050, 200, 80)}
  ${star(250, 720, 70)}
  ${star(420, 160, 45)}
  ${star(880, 860, 50)}
`);

const skyline = wrap(`
  <!-- sun -->
  <circle cx="1080" cy="170" r="90" ${S}/>
  <!-- buildings -->
  <rect x="90" y="330" width="190" height="420" ${S}/>
  <rect x="300" y="230" width="170" height="520" ${S}/>
  <path d="M300 230 L385 140 L470 230" ${S}/>
  <rect x="490" y="380" width="200" height="370" ${S}/>
  <rect x="710" y="270" width="160" height="480" ${S}/>
  <rect x="890" y="420" width="250" height="330" ${S}/>
  <!-- windows -->
  ${[130, 200].map((x) => [380, 470, 560, 650].map((y) => `<rect x="${x}" y="${y}" width="44" height="54" ${S}/>`).join("")).join("")}
  ${[335, 405].map((x) => [300, 400, 500, 600].map((y) => `<rect x="${x}" y="${y}" width="40" height="60" ${S}/>`).join("")).join("")}
  ${[740, 810].map((x) => [330, 430, 530, 630].map((y) => `<rect x="${x}" y="${y}" width="36" height="56" ${S}/>`).join("")).join("")}
  <rect x="560" y="640" width="60" height="110" ${S}/>
  <!-- open book -->
  <path d="M340 940 C460 860 560 860 640 900 C720 860 820 860 940 940 L940 800 C820 730 720 740 640 780 C560 740 460 730 340 800 Z" ${S}/>
  <path d="M640 780 L640 900" ${S}/>
  <!-- ground -->
  <path d="M40 750 L1240 750" ${S}/>
  ${star(170, 150, 60)}
  ${star(600, 120, 50)}
`);

export const TEMPLATES: ColoringTemplate[] = [
  { id: "ella-v1", title: "Ella Bella", titleEs: "Ella Bella", svg: ella },
  { id: "rocket-v1", title: "Space Salsa Rocket", titleEs: "El Cohete", svg: rocket },
  { id: "skyline-v1", title: "NJ & Harlem Skyline", titleEs: "La Ciudad", svg: skyline },
];

export function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
