// Oyunlaştırma: avatar, XP, seviye, rozetler
import { esc } from "./ui.js";

export const AV_BASES = ["🦊", "🐼", "🐯", "🦁", "🐸", "🐨", "🐰", "🐻", "🐵", "🦄", "🐧", "🐙", "🐶", "🐱", "🐲", "🦉", "🐬", "🦖", "🤖", "👽"];
export const AV_BGS = [
  ["#ff9a8b", "#ff6a88"], ["#a1c4fd", "#c2e9fb"], ["#84fab0", "#8fd3f4"], ["#fbc2eb", "#a6c1ee"],
  ["#fddb92", "#f6a04d"], ["#c3a6ff", "#7f7fd5"], ["#43e97b", "#38f9d7"], ["#142850", "#2b4c8c"],
  ["#f6d365", "#c9a227"], ["#ff758c", "#ff7eb3"]
];
// Aksesuarlar seviyeyle açılır
export const AV_ACCS = [
  { e: "", n: "Yok", lv: 1 },
  { e: "🧢", n: "Şapka", lv: 1 },
  { e: "🎀", n: "Fiyonk", lv: 1 },
  { e: "🕶️", n: "Gözlük", lv: 2 },
  { e: "🎧", n: "Kulaklık", lv: 3 },
  { e: "🎩", n: "Silindir", lv: 4 },
  { e: "🎓", n: "Kep", lv: 5 },
  { e: "⭐", n: "Yıldız", lv: 6 },
  { e: "👑", n: "Taç", lv: 8 }
];
export const LEVELS = ["Starter", "Explorer", "Adventurer", "Rising Star", "Super Star", "Hero", "Super Hero", "Legend", "Champion", "Master"];
export const LEVEL_COLORS = ["#9aa5b8", "#4cc9f0", "#43aa8b", "#f9c74f", "#f8961e", "#f3722c", "#e63946", "#9d4edd", "#c9a227", "#142850"];
const XP_PER_LEVEL = 100;

export function defaultAvatar(seed = "") {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { base: AV_BASES[h % AV_BASES.length], bg: h % AV_BGS.length, acc: "" };
}

export function avatarHtml(av, size = 64, level = null) {
  av = av || defaultAvatar();
  const [c1, c2] = AV_BGS[av.bg] || AV_BGS[0];
  const ring = level ? LEVEL_COLORS[Math.min(level, LEVEL_COLORS.length) - 1] : "#fff";
  return `<span class="av" style="--s:${size}px;background:linear-gradient(135deg,${c1},${c2});box-shadow:0 0 0 ${Math.max(2, size / 22)}px ${ring}">
    <span class="av-b">${esc(av.base)}</span>${av.acc ? `<span class="av-a">${esc(av.acc)}</span>` : ""}${level ? `<span class="av-l" style="background:${ring}">${level}</span>` : ""}</span>`;
}

// XP: her ödev 10 XP + başarı (en fazla 20) · sınıf puanı ±5 XP · haftalık yıldız 3 XP
export function computeXP({ subs = [], points = [], feedback = [] }) {
  let xp = 0;
  subs.forEach((s) => { xp += 10 + Math.round((s.best ?? s.percent ?? 0) / 5); });
  points.forEach((p) => { xp += (p.delta || 0) * 5; });
  feedback.forEach((f) => { xp += (f.stars || 0) * 3; });
  xp = Math.max(0, xp);
  const level = Math.min(LEVELS.length, Math.floor(xp / XP_PER_LEVEL) + 1);
  const into = level === LEVELS.length ? XP_PER_LEVEL : xp % XP_PER_LEVEL;
  return { xp, level, name: LEVELS[level - 1], into, need: XP_PER_LEVEL, color: LEVEL_COLORS[level - 1] };
}

export const POINT_REASONS = {
  plus: [["🙋", "Derse katılım"], ["🗣️", "İngilizce konuştu"], ["🤝", "Yardımlaştı"], ["📒", "Ödevini getirdi"], ["🌟", "Harika cevap"], ["🎯", "Odaklandı"]],
  minus: [["🔊", "Gürültü"], ["📕", "Kitap/defter yok"], ["⏰", "Geç kaldı"], ["😴", "Derse ilgisiz"], ["📱", "Kurallara uymadı"]]
};
