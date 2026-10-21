// Oyunlaştırma: avatar, XP, seviye, rozetler
import { esc } from "./ui.js?v=12";

export const AV_BASES = ["🦊", "🐼", "🐯", "🦁", "🐸", "🐨", "🐰", "🐻", "🐵", "🦄", "🐧", "🐙", "🐶", "🐱", "🐲", "🦉", "🐬", "🦖", "🤖", "👽"];
export const AV_BGS = [
  ["#ff9a8b", "#ff6a88"], ["#a1c4fd", "#c2e9fb"], ["#84fab0", "#8fd3f4"], ["#fbc2eb", "#a6c1ee"],
  ["#fddb92", "#f6a04d"], ["#c3a6ff", "#7f7fd5"], ["#43e97b", "#38f9d7"], ["#142850", "#2b4c8c"],
  ["#f6d365", "#c9a227"], ["#ff758c", "#ff7eb3"]
];
// ---- Kilitli avatar eşyaları ----
// req: { lv } seviye · { hw } ödev sayısı · { perfect } 100 alınan ödev · { games } kelime oyunu
//      { plus } ders içi artı · { star } haftanın yıldızı · { streak } ödev serisi · { badges } rozet sayısı
export const LOCKED_BASES = [
  { e: "🐉", n: "Ejderha", req: { lv: 3 } }, { e: "🦩", n: "Flamingo", req: { hw: 3 } }, { e: "🐳", n: "Balina", req: { games: 5 } },
  { e: "🦕", n: "Dinozor", req: { lv: 4 } }, { e: "🦜", n: "Papağan", req: { plus: 5 } }, { e: "🐝", n: "Arı", req: { hw: 5 } },
  { e: "🦈", n: "Köpekbalığı", req: { streak: 3 } }, { e: "🐺", n: "Kurt", req: { lv: 5 } }, { e: "🧚", n: "Peri", req: { perfect: 1 } },
  { e: "🥷", n: "Ninja", req: { games: 15 } }, { e: "🧙", n: "Büyücü", req: { lv: 6 } }, { e: "🧑‍🚀", n: "Astronot", req: { hw: 10 } },
  { e: "🦸", n: "Süper Kahraman", req: { star: 1 } }, { e: "👸", n: "Prenses", req: { plus: 15 } }, { e: "🤴", n: "Prens", req: { plus: 15 } },
  { e: "🦚", n: "Tavus kuşu", req: { lv: 8 } }, { e: "🦅", n: "Kartal", req: { streak: 6 } }, { e: "🐆", n: "Çita", req: { badges: 6 } }
];
export const LOCKED_BGS = [
  { c: ["#0f0c29", "#302b63"], n: "Galaksi", fx: "stars", req: { lv: 3 } },
  { c: ["#ff9a9e", "#fad0c4"], n: "Gün batımı", req: { hw: 4 } },
  { c: ["#f093fb", "#f5576c"], n: "Şeker", req: { games: 8 } },
  { c: ["#4facfe", "#00f2fe"], n: "Okyanus", req: { plus: 8 } },
  { c: ["#ff0844", "#ffb199"], n: "Ateş", req: { streak: 4 } },
  { c: ["#e0c3fc", "#8ec5fc"], n: "Pamuk", req: { perfect: 1 } },
  { c: ["#f6d365", "#fda085"], n: "Altın", fx: "shine", req: { star: 1 } },
  { c: ["#ff0000", "#ffa500"], n: "Gökkuşağı", fx: "rainbow", req: { lv: 7 } }
];
export const AV_ACCS = [
  { e: "", n: "Yok", req: {} },
  { e: "🧢", n: "Şapka", req: {} }, { e: "🎀", n: "Fiyonk", req: {} },
  { e: "🕶️", n: "Gözlük", req: { lv: 2 } }, { e: "🌸", n: "Çiçek", req: { hw: 2 } },
  { e: "🎧", n: "Kulaklık", req: { lv: 3 } }, { e: "🪶", n: "Tüy", req: { plus: 5 } },
  { e: "🦋", n: "Kelebek", req: { games: 5 } }, { e: "🎩", n: "Silindir", req: { lv: 4 } },
  { e: "⚡", n: "Şimşek", req: { streak: 3 } }, { e: "🍀", n: "Yonca", req: { perfect: 1 } },
  { e: "🎓", n: "Kep", req: { lv: 5 } }, { e: "🌈", n: "Gökkuşağı", req: { badges: 5 } },
  { e: "🔥", n: "Alev", req: { plus: 12 } }, { e: "⭐", n: "Yıldız", req: { lv: 6 } },
  { e: "🌟", n: "Parlayan Yıldız", req: { star: 1 } }, { e: "💎", n: "Elmas", req: { hw: 12 } },
  { e: "🪐", n: "Gezegen", req: { games: 25 } }, { e: "👑", n: "Taç", req: { lv: 8 } }
];
// Yan eşya (avatarın sağ altında)
export const AV_SIDES = [
  { e: "", n: "Yok", req: {} },
  { e: "📚", n: "Kitaplar", req: {} }, { e: "✏️", n: "Kalem", req: {} },
  { e: "⚽", n: "Top", req: { hw: 1 } }, { e: "🎨", n: "Palet", req: { hw: 2 } },
  { e: "🎸", n: "Gitar", req: { lv: 2 } }, { e: "🏀", n: "Basketbol", req: { plus: 3 } },
  { e: "🎮", n: "Oyun kolu", req: { games: 3 } }, { e: "🍦", n: "Dondurma", req: { lv: 3 } },
  { e: "🛹", n: "Kaykay", req: { streak: 2 } }, { e: "🔭", n: "Teleskop", req: { lv: 4 } },
  { e: "🎯", n: "Hedef", req: { perfect: 1 } }, { e: "🚀", n: "Roket", req: { games: 12 } },
  { e: "🏆", n: "Kupa", req: { star: 1 } }, { e: "🦄", n: "Mini unicorn", req: { badges: 4 } },
  { e: "💰", n: "Hazine", req: { lv: 7 } }
];
// Çerçeve efektleri
export const AV_FRAMES = [
  { id: "", n: "Normal", req: {} },
  { id: "dots", n: "Puantiye", req: { hw: 2 } },
  { id: "glow", n: "Parıltı", req: { lv: 3 } },
  { id: "spin", n: "Dönen halka", req: { games: 10 } },
  { id: "sparkle", n: "Işıltı ✨", req: { perfect: 1 } },
  { id: "fire", n: "Alev halkası", req: { streak: 5 } },
  { id: "gold", n: "Altın çerçeve", req: { star: 1 } },
  { id: "rainbow", n: "Gökkuşağı", req: { lv: 6 } }
];
const REQ_TXT = { lv: (n) => `Lv${n}`, hw: (n) => `${n} ödev`, perfect: () => "💯", games: (n) => `${n} oyun`, plus: (n) => `+${n}`, star: () => "⭐ yıldız", streak: (n) => `🔥${n} seri`, badges: (n) => `${n} rozet` };
const REQ_LONG = { lv: (n) => `${n}. seviyeye ulaş`, hw: (n) => `${n} ödev tamamla`, perfect: () => "bir ödevden 100 al", games: (n) => `${n} kelime oyunu oyna`, plus: (n) => `derste ${n} artı puan topla`, star: () => "haftanın yıldızları arasına gir", streak: (n) => `${n} ödevi arka arkaya yap`, badges: (n) => `${n} rozet kazan` };
export const reqShort = (r) => Object.entries(r || {}).map(([k, v]) => REQ_TXT[k](v)).join(" ");
export const reqLong = (r) => Object.entries(r || {}).map(([k, v]) => REQ_LONG[k](v)).join(" ve ");
export const isUnlocked = (r, st) => Object.entries(r || {}).every(([k, v]) => (st[k] || 0) >= v);
export const LEVELS = ["Starter", "Explorer", "Adventurer", "Rising Star", "Super Star", "Hero", "Super Hero", "Legend", "Champion", "Master"];
export const LEVEL_COLORS = ["#9aa5b8", "#4cc9f0", "#43aa8b", "#f9c74f", "#f8961e", "#f3722c", "#e63946", "#9d4edd", "#c9a227", "#142850"];
const XP_PER_LEVEL = 100;

export function defaultAvatar(seed = "") {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { base: AV_BASES[h % AV_BASES.length], bg: h % AV_BGS.length, acc: "" };
}

const bgOf = (i) => (i >= AV_BGS.length ? LOCKED_BGS[i - AV_BGS.length] : { c: AV_BGS[i] || AV_BGS[0] });
export const ALL_BGS_COUNT = () => AV_BGS.length + LOCKED_BGS.length;
export function avatarHtml(av, size = 64, level = null) {
  av = av || defaultAvatar();
  const bg = bgOf(av.bg ?? 0);
  const [c1, c2] = bg.c;
  const ring = level ? LEVEL_COLORS[Math.min(level, LEVEL_COLORS.length) - 1] : "#fff";
  const bgCss = bg.fx === "rainbow" ? "conic-gradient(#ff595e,#ffca3a,#8ac926,#1982c4,#6a4c93,#ff595e)" : `linear-gradient(135deg,${c1},${c2})`;
  return `<span class="av ${av.frame ? "fr-" + av.frame : ""} ${bg.fx ? "fx-" + bg.fx : ""}" style="--s:${size}px;background:${bgCss};box-shadow:0 0 0 ${Math.max(2, size / 22)}px ${ring}">
    <span class="av-b">${esc(av.base)}</span>${av.acc ? `<span class="av-a">${esc(av.acc)}</span>` : ""}${av.side ? `<span class="av-s">${esc(av.side)}</span>` : ""}${level ? `<span class="av-l" style="background:${ring}">${level}</span>` : ""}</span>`;
}

// XP: her ödev 10 XP + başarı (en fazla 20) · sınıf puanı ±5 XP · haftalık yıldız 3 XP
export function computeXP({ subs = [], points = [], feedback = [], practice = null }) {
  let xp = 0;
  xp += Math.min(practice?.xpGames || 0, 60) * 2; // kelime oyunları: sadece başarılı oyunlar, oyun başına 2 XP (en fazla 120)
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

// Haftanın başlangıcı (Pazartesi 00:00)
export function weekStart(d = new Date()) {
  const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - day); return x;
}
export const dayKey = (d = new Date()) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
// Bu haftaki XP (Haftanın yıldızları için)
export function weeklyXP({ subs = [], points = [], practice = null }, from = weekStart()) {
  const t = from.getTime(); let xp = 0;
  subs.forEach((s) => { if ((s.submittedAt || 0) >= t) xp += 10 + Math.round((s.best ?? s.percent ?? 0) / 5); });
  points.forEach((p) => { if ((p.at || 0) >= t) xp += (p.delta || 0) * 5; });
  Object.entries(practice?.xpLog || {}).forEach(([k, n]) => { if (new Date(k + "T12:00:00").getTime() >= t) xp += Math.min(n, GAME_DAILY_XP_LIMIT) * 2; });
  return Math.max(0, xp);
}

export const weekKey = () => dayKey(weekStart());
export const weekLabel = () => { const a = weekStart(); const b = new Date(a); b.setDate(b.getDate() + 6); const f = (d) => d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" }); return `${f(a)} – ${f(b)}`; };
export const shortName = (n) => { const p = String(n).trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; };
// Haftalık sıralama kaydı (öğrenci kendi kaydını, öğretmen herkesinkini yazar)
export function weeklyEntry(student, avatar, data) {
  return { uid: student.uid, grade: student.grade, section: student.section, week: weekKey(), name: shortName(student.name), avatar: avatar || defaultAvatar(student.uid), xp: weeklyXP(data), updatedAt: Date.now() };
}

// Podyum: 3. solda (alçak), 1. ortada (en yüksek), 2. sağda
export function podiumHtml(list, meUid = null, dark = false) {
  const top = list.slice(0, 3);
  const slot = (rank) => {
    const x = top[rank - 1];
    if (!x) return `<div class="pd-col r${rank} empty"><div class="pd-block"><span class="pd-num">${rank}</span></div></div>`;
    return `<div class="pd-col r${rank} ${x.uid === meUid ? "me" : ""}">
      ${rank === 1 ? `<div class="pd-crown">👑</div>` : ""}
      <div class="pd-av">${avatarHtml(x.avatar, rank === 1 ? 72 : 58)}<span class="pd-medal">${["🥇", "🥈", "🥉"][rank - 1]}</span></div>
      <b class="pd-name">${esc(x.name)}</b><span class="pd-xp">${x.xp} XP</span>
      <div class="pd-block"><span class="pd-num">${rank}</span></div></div>`;
  };
  return `<div class="pd ${dark ? "dark" : ""}">${slot(3)}${slot(1)}${slot(2)}</div>`;
}

// ---- Kelime oyunu XP kuralları (bakmadan basmayı engellemek için) ----
export const GAME_DAILY_XP_LIMIT = 4;     // günde en fazla 4 oyun XP kazandırır
export const QUIZ_MIN_CORRECT = 0.75;     // Dinle-Seç: en az %75 doğru (8'de 6)
export const QUIZ_MIN_MS = 1500;          // soru başına ortalama en az 1,5 saniye
export const MEMORY_MIN_STARS = 2;        // Hafıza: en az 2 yıldız (az hamle)
