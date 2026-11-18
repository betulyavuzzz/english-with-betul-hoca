// Evcil hayvan çizimi (SVG): tür + aşama + ruh hali
// mood: "happy" | "hungry" | "sad"   stage: 0 yumurta … 5 efsane
export const PET_TYPES = {
  "🐱": { n: "Kedi", body: "#f6a04d", belly: "#ffe3c2", ear: "#f6a04d", inner: "#ffb3a7", kind: "cat" },
  "🐶": { n: "Köpek", body: "#d9a066", belly: "#fff0dc", ear: "#8b5a2b", inner: "#8b5a2b", kind: "dog" },
  "🐰": { n: "Tavşan", body: "#f4f1f6", belly: "#ffffff", ear: "#f4f1f6", inner: "#ffc0d0", kind: "bunny" },
  "🦊": { n: "Tilki", body: "#f08a3c", belly: "#fff6ec", ear: "#f08a3c", inner: "#5a2e14", kind: "fox" },
  "🐼": { n: "Panda", body: "#fbfbfb", belly: "#ffffff", ear: "#2a2a35", inner: "#2a2a35", kind: "panda" },
  "🐲": { n: "Ejderha", body: "#5cc46b", belly: "#dff7b0", ear: "#5cc46b", inner: "#3e9a4c", kind: "dragon" },
  "🦄": { n: "Unicorn", body: "#fff7fb", belly: "#ffffff", ear: "#fff7fb", inner: "#ffc6e6", kind: "unicorn" },
  "🐧": { n: "Penguen", body: "#2f3d5c", belly: "#ffffff", ear: "#2f3d5c", inner: "#2f3d5c", kind: "penguin" },
  "🐢": { n: "Kaplumbağa", body: "#9fd77f", belly: "#e8f7c8", ear: "#9fd77f", inner: "#9fd77f", kind: "turtle" },
  "🦖": { n: "Dinozor", body: "#7cc6a4", belly: "#e3f8ec", ear: "#7cc6a4", inner: "#7cc6a4", kind: "dino" },
  "🐨": { n: "Koala", body: "#aab4c3", belly: "#e7ebf1", ear: "#aab4c3", inner: "#f5c6d6", kind: "koala" },
  "🐯": { n: "Kaplan", body: "#f7a531", belly: "#fff4df", ear: "#f7a531", inner: "#ffd0a0", kind: "tiger" }
};
const INK = "#2a2438";

function backParts(t) {
  const { kind, ear, inner } = t;
  switch (kind) {
    case "cat": case "tiger": return `<path d="M52 72 L62 22 L92 52 Z" fill="${ear}"/><path d="M148 72 L138 22 L108 52 Z" fill="${ear}"/><path d="M60 62 L65 34 L83 52 Z" fill="${inner}"/><path d="M140 62 L135 34 L117 52 Z" fill="${inner}"/>`;
    case "fox": return `<path d="M48 76 L56 14 L94 50 Z" fill="${ear}"/><path d="M152 76 L144 14 L106 50 Z" fill="${ear}"/><path d="M58 64 L61 30 L82 50 Z" fill="${inner}"/><path d="M142 64 L139 30 L118 50 Z" fill="${inner}"/>`;
    case "bunny": return `<ellipse cx="78" cy="30" rx="15" ry="40" fill="${ear}" transform="rotate(-10 78 30)"/><ellipse cx="122" cy="30" rx="15" ry="40" fill="${ear}" transform="rotate(10 122 30)"/><ellipse cx="78" cy="32" rx="7" ry="28" fill="${inner}" transform="rotate(-10 78 32)"/><ellipse cx="122" cy="32" rx="7" ry="28" fill="${inner}" transform="rotate(10 122 32)"/>`;
    case "panda": return `<circle cx="56" cy="50" r="20" fill="${ear}"/><circle cx="144" cy="50" r="20" fill="${ear}"/>`;
    case "koala": return `<circle cx="50" cy="62" r="28" fill="${ear}"/><circle cx="150" cy="62" r="28" fill="${ear}"/><circle cx="52" cy="64" r="16" fill="${inner}"/><circle cx="148" cy="64" r="16" fill="${inner}"/>`;
    case "dragon": return `<path d="M40 150 C10 120 18 96 30 92 C40 112 52 118 60 128 Z" fill="#8f6ad8"/><path d="M160 150 C190 120 182 96 170 92 C160 112 148 118 140 128 Z" fill="#8f6ad8"/><path d="M70 50 L66 18 L86 44 Z" fill="#ffd166"/><path d="M130 50 L134 18 L114 44 Z" fill="#ffd166"/>`;
    case "unicorn": return `<path d="M100 8 L88 50 L112 50 Z" fill="#ffd166"/><path d="M92 40 L108 34 M90 30 L106 24" stroke="#f0a500" stroke-width="3"/><path d="M60 64 L66 30 L88 52 Z" fill="${ear}"/><path d="M140 64 L134 30 L112 52 Z" fill="${ear}"/>`;
    case "turtle": return `<ellipse cx="100" cy="150" rx="70" ry="46" fill="#6b9a3a"/><path d="M60 140 L80 122 L120 122 L140 140 L120 160 L80 160 Z" fill="#82b44a" stroke="#56802b" stroke-width="3"/>`;
    case "dino": return `<path d="M56 70 L44 56 L62 58 L58 40 L74 50 L78 32 L90 46 L98 28 L104 46" fill="#f59e2b"/>`;
    default: return "";
  }
}
function frontParts(t) {
  const { kind, ear } = t;
  switch (kind) {
    case "dog": return `<ellipse cx="50" cy="92" rx="16" ry="32" fill="${ear}" transform="rotate(18 50 92)"/><ellipse cx="150" cy="92" rx="16" ry="32" fill="${ear}" transform="rotate(-18 150 92)"/>`;
    case "panda": return `<ellipse cx="76" cy="96" rx="15" ry="18" fill="#2a2a35" transform="rotate(-20 76 96)"/><ellipse cx="124" cy="96" rx="15" ry="18" fill="#2a2a35" transform="rotate(20 124 96)"/>`;
    case "tiger": return `<path d="M92 46 l8 14 l8 -14 M70 56 l10 10 M130 56 l-10 10" stroke="#5a3200" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    case "fox": return `<path d="M58 104 Q100 150 142 104 Q130 132 100 136 Q70 132 58 104 Z" fill="#fff6ec"/>`;
    case "koala": return `<ellipse cx="100" cy="112" rx="11" ry="14" fill="#3b3550"/>`;
    case "penguin": return `<path d="M60 92 Q100 40 140 92 Q140 132 100 140 Q60 132 60 92 Z" fill="#fff"/><path d="M93 112 L107 112 L100 121 Z" fill="#f59e2b"/>`;
    case "unicorn": return `<path d="M58 70 Q40 90 52 112 Q48 92 64 84 Q56 100 66 112 Q66 92 76 82" fill="#c58cff"/><path d="M62 60 Q56 74 66 80" stroke="#7fd3ff" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    default: return "";
  }
}
function face(mood, kind, big = false) {
  const e = big ? 1.15 : 1, ey = 98;
  const blush = `<ellipse cx="66" cy="114" rx="10" ry="6" fill="#ff8fab" opacity=".55"/><ellipse cx="134" cy="114" rx="10" ry="6" fill="#ff8fab" opacity=".55"/>`;
  const dark = kind === "panda";
  const eyeHi = dark ? "#fff" : "#fff";
  if (mood === "happy") {
    return blush + `<circle cx="78" cy="${ey}" r="${9 * e}" fill="${INK}"/><circle cx="122" cy="${ey}" r="${9 * e}" fill="${INK}"/><circle cx="81" cy="${ey - 3}" r="${3.4 * e}" fill="${eyeHi}"/><circle cx="125" cy="${ey - 3}" r="${3.4 * e}" fill="${eyeHi}"/><circle cx="75" cy="${ey + 3}" r="1.6" fill="${eyeHi}"/><circle cx="119" cy="${ey + 3}" r="1.6" fill="${eyeHi}"/>`
      + (kind === "penguin" ? `<path d="M88 124 Q100 136 112 124" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>` : `<path d="M86 116 Q100 136 114 116 Z" fill="#7a2335"/><path d="M92 124 Q100 132 108 124 Q100 128 92 124 Z" fill="#ff7a8a"/>`);
  }
  if (mood === "hungry") {
    return `<ellipse cx="66" cy="114" rx="9" ry="5" fill="#ff8fab" opacity=".3"/><ellipse cx="134" cy="114" rx="9" ry="5" fill="#ff8fab" opacity=".3"/>`
      + `<circle cx="78" cy="${ey}" r="${8 * e}" fill="${INK}"/><circle cx="122" cy="${ey}" r="${8 * e}" fill="${INK}"/><circle cx="81" cy="${ey - 4}" r="3" fill="${eyeHi}"/><circle cx="125" cy="${ey - 4}" r="3" fill="${eyeHi}"/>`
      + `<path d="M68 84 L88 88 M132 84 L112 88" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`
      + `<path d="M86 124 q7 -6 14 0 q7 6 14 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`
      + `<path d="M150 70 q8 12 0 18 q-8 -6 0 -18 Z" fill="#7fd3ff"><animateTransform attributeName="transform" type="translate" values="0 0;0 5;0 0" dur="1.6s" repeatCount="indefinite"/></path>`;
  }
  // sad
  return `<path d="M68 90 Q78 84 88 92 M112 92 Q122 84 132 90" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`
    + `<path d="M70 100 Q78 94 86 100" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M114 100 Q122 94 130 100" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`
    + `<path d="M86 128 Q100 116 114 128" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`
    + [[76, 0], [124, .7]].map(([x, d]) => `<path d="M${x} 104 q-5 9 0 13 q5 -4 0 -13 Z" fill="#5ab8ff"><animateTransform attributeName="transform" type="translate" values="0 0;0 26" dur="1.4s" begin="${d}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;1;0" dur="1.4s" begin="${d}s" repeatCount="indefinite"/></path>`).join("");
}
function extras(mood) {
  if (mood === "happy") return [[30, 0], [168, 1]].map(([x, d]) => `<path d="M${x} 60 c-6 -8 -16 -2 -10 6 l10 10 l10 -10 c6 -8 -4 -14 -10 -6 Z" fill="#ff5d8f"><animateTransform attributeName="transform" type="translate" values="0 10;0 -26" dur="2.2s" begin="${d}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur="2.2s" begin="${d}s" repeatCount="indefinite"/></path>`).join("");
  if (mood === "hungry") return `<g><circle cx="166" cy="40" r="22" fill="#fff" stroke="#e2dccb" stroke-width="2"/><circle cx="146" cy="68" r="5" fill="#fff" stroke="#e2dccb" stroke-width="2"/><circle cx="138" cy="80" r="3" fill="#fff" stroke="#e2dccb" stroke-width="2"/><circle cx="166" cy="44" r="11" fill="#e63946"/><path d="M166 33 q4 -6 9 -5 q-2 5 -9 5 Z" fill="#43aa8b"/><path d="M166 33 v-5" stroke="#7a4b2a" stroke-width="2"/><animateTransform attributeName="transform" type="translate" values="0 0;0 -4;0 0" dur="2s" repeatCount="indefinite"/></g>`;
  return `<g><ellipse cx="40" cy="30" rx="26" ry="14" fill="#9aa5b8"/><circle cx="28" cy="26" r="12" fill="#9aa5b8"/><circle cx="50" cy="22" r="14" fill="#9aa5b8"/>${[24, 40, 56].map((x, i) => `<path d="M${x} 46 l-3 8" stroke="#5ab8ff" stroke-width="3" stroke-linecap="round"><animateTransform attributeName="transform" type="translate" values="0 0;-3 14" dur="0.9s" begin="${i * 0.3}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="0.9s" begin="${i * 0.3}s" repeatCount="indefinite"/></path>`).join("")}</g>`;
}
function stageGear(stage) {
  if (stage === 1) return `<path d="M100 40 q-14 -10 -4 -22 q4 10 4 22" fill="#ffb703"/>`;                                  // bebek perçemi
  if (stage === 3) return `<path d="M58 140 Q100 158 142 140 L142 152 Q100 170 58 152 Z" fill="#e63946"/><path d="M128 150 l14 26 l-14 -4 z" fill="#c1121f"/>`; // atkı
  if (stage === 4) return `<path d="M54 52 L100 34 L146 52 L100 70 Z" fill="${INK}"/><rect x="80" y="54" width="40" height="14" rx="4" fill="${INK}"/><path d="M146 52 v22" stroke="#ffd166" stroke-width="3"/><circle cx="146" cy="76" r="4" fill="#ffd166"/>`; // kep
  if (stage === 5) return `<path d="M64 46 L74 16 L88 36 L100 10 L112 36 L126 16 L136 46 Z" fill="#ffd166" stroke="#e0a800" stroke-width="3"/><circle cx="100" cy="22" r="4" fill="#e63946"/><circle cx="76" cy="30" r="3" fill="#4cc9f0"/><circle cx="124" cy="30" r="3" fill="#4cc9f0"/>`; // taç
  return "";
}
function aura() {
  return `<circle cx="100" cy="120" r="96" fill="#ffd166" opacity=".18"><animate attributeName="r" values="90;100;90" dur="2.4s" repeatCount="indefinite"/></circle>`
    + [[24, 100], [176, 90], [40, 190], [164, 186]].map(([x, y], i) => `<path d="M${x} ${y - 8} L${x + 3} ${y - 2} L${x + 9} ${y} L${x + 3} ${y + 2} L${x} ${y + 8} L${x - 3} ${y + 2} L${x - 9} ${y} L${x - 3} ${y - 2} Z" fill="#ffd166"><animate attributeName="opacity" values="0;1;0" dur="1.8s" begin="${i * 0.45}s" repeatCount="indefinite"/></path>`).join("");
}
function egg(t, mood) {
  const sad = mood === "sad";
  return `<g class="egg-wob"><path d="M100 30 C140 30 160 100 160 140 C160 180 134 200 100 200 C66 200 40 180 40 140 C40 100 60 30 100 30 Z" fill="#fff6e3" stroke="#e7d7b4" stroke-width="3"/>
    <circle cx="74" cy="90" r="9" fill="${t.body}" opacity=".7"/><circle cx="130" cy="120" r="12" fill="${t.body}" opacity=".7"/><circle cx="84" cy="168" r="8" fill="${t.body}" opacity=".7"/><circle cx="128" cy="70" r="6" fill="${t.body}" opacity=".7"/>
    <path d="M62 110 l12 -8 l10 10 l12 -10 l12 10 l12 -10 l12 8" stroke="#d9c49a" stroke-width="3" fill="none"/>
    <g transform="translate(0 32)">${face(mood, "egg")}</g>${sad ? "" : ""}</g>`;
}
// Ana fonksiyon
export function petSVG(sp, stage = 2, mood = "happy", px = 160) {
  const t = PET_TYPES[sp] || PET_TYPES["🐱"];
  const cls = `pet-svg ${mood}`;
  if (stage === 0) return `<svg class="${cls}" viewBox="-10 0 220 230" width="${px}" height="${px * 1.05}" aria-label="yumurta">${extras(mood)}${egg(t, mood)}</svg>`;
  const sc = [1, .78, .86, .93, 1, 1][stage];
  const body = `<ellipse cx="100" cy="160" rx="54" ry="44" fill="${t.body}"/><ellipse cx="100" cy="168" rx="34" ry="28" fill="${t.belly}"/>
    <ellipse cx="66" cy="196" rx="16" ry="10" fill="${t.kind === "penguin" ? "#f59e2b" : t.body}"/><ellipse cx="134" cy="196" rx="16" ry="10" fill="${t.kind === "penguin" ? "#f59e2b" : t.body}"/>
    <ellipse cx="54" cy="156" rx="11" ry="18" fill="${t.kind === "panda" ? "#2a2a35" : t.body}" transform="rotate(${mood === "sad" ? 10 : -25} 54 156)"/><ellipse cx="146" cy="156" rx="11" ry="18" fill="${t.kind === "panda" ? "#2a2a35" : t.body}" transform="rotate(${mood === "sad" ? -10 : 25} 146 156)"/>`;
  const tail = t.kind === "fox" ? `<path d="M150 180 C196 170 196 120 170 118 C176 140 160 160 140 170 Z" fill="${t.body}"/><path d="M178 122 C188 128 186 142 180 150 C178 138 172 128 170 118 Z" fill="#fff"/>`
    : t.kind === "cat" || t.kind === "tiger" ? `<path d="M148 186 C190 186 186 140 168 136" stroke="${t.body}" stroke-width="12" fill="none" stroke-linecap="round"/>`
    : t.kind === "dino" || t.kind === "dragon" ? `<path d="M146 176 C186 182 194 150 186 140 C178 160 164 164 146 160 Z" fill="${t.body}"/>` : "";
  const head = `<circle cx="100" cy="100" r="58" fill="${t.body}"/>`;
  return `<svg class="${cls}" viewBox="-10 -6 220 236" width="${px}" height="${px * 1.07}" aria-label="${t.n}">
    ${stage === 5 ? aura() : ""}${extras(mood)}
    <g transform="translate(100 210) scale(${sc}) translate(-100 -210)">${tail}${backParts(t)}${body}${head}${frontParts(t)}${face(mood, t.kind, stage === 1)}${stageGear(stage)}</g></svg>`;
}
