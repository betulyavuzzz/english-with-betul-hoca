// Oyun dünyası: altın, günlük seri, haftalık görevler, evcil hayvan, kelime albümü
import { dayKey, weekStart, weekKey } from "./game.js?v=33";

const DAY = 86400000;
const keyToDate = (k) => new Date(k + "T12:00:00");
const sumSince = (log, from) => Object.entries(log || {}).reduce((x, [k, n]) => x + (keyToDate(k) >= from ? n : 0), 0);

// ---- Günlük giriş serisi
export function streakInfo(practice) {
  const days = [...new Set(practice?.days || [])].sort();
  let run = 0, prev = null, gold = 0;
  for (const k of days) {
    const d = keyToDate(k);
    run = prev && Math.round((d - prev) / DAY) === 1 ? run + 1 : 1;
    gold += 2 + Math.min(run - 1, 5);           // 1. gün 2, 2. gün 3 … en fazla 7 altın
    prev = d;
  }
  const t = dayKey(), y = dayKey(new Date(Date.now() - DAY));
  const last = days[days.length - 1];
  const current = last === t || last === y ? run : 0;
  return { current, gold, todayDone: last === t, nextGold: 2 + Math.min(current, 5) };
}

// ---- Kelime albümü
export const albumSet = (practice) => new Set(practice?.album || []);
export const wordKey = (en) => String(en || "").trim().toLowerCase();
export function albumGold(practice, wordsets) {
  const have = albumSet(practice);
  const full = wordsets.filter((w) => w.words?.length && w.words.every((x) => have.has(wordKey(x.en)))).length;
  return have.size + full * 10;                   // her kelime 1, tamamlanan her set +10
}

// ---- Haftalık görevler
const POOL = [
  { id: "hw1", e: "📝", t: "Bu hafta 1 ödev yap", target: 1, prog: (c) => Object.values(c.subs).filter((s) => s.submittedAt >= c.fromMs).length },
  { id: "game3", e: "🃏", t: "3 kelime oyununu başarıyla bitir", target: 3, prog: (c) => sumSince(c.practice?.xpLog, c.from) },
  { id: "fix5", e: "🔁", t: "Tekrar kutusundan 5 soru düzelt", target: 5, prog: (c) => sumSince(c.practice?.fixedLog, c.from) + (c.boxLeft === 0 ? 5 : 0) },
  { id: "day3", e: "📅", t: "3 farklı gün siteye gir", target: 3, prog: (c) => (c.practice?.days || []).filter((k) => keyToDate(k) >= c.from).length },
  { id: "hi90", e: "🎯", t: "Bir ödevden 90 ve üstü al", target: 1, prog: (c) => Object.values(c.subs).filter((s) => s.submittedAt >= c.fromMs && (s.best ?? s.percent) >= 90).length },
  { id: "word10", e: "📒", t: "Albümüne 10 yeni kelime ekle", target: 10, prog: (c) => sumSince(c.practice?.albumLog, c.from) }
];
export const QUEST_GOLD = 5, QUEST_BONUS = 15;
export function weeklyQuests(ctx) {
  const wk = weekKey(); let h = 0; for (const ch of wk) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rest = POOL.slice(1), a = h % rest.length, b = (a + 1 + (h >> 4) % (rest.length - 1)) % rest.length;
  const from = weekStart(), c = { ...ctx, from, fromMs: from.getTime() };
  return [POOL[0], rest[a], rest[b]].map((q) => { const p = q.prog(c); return { ...q, p: Math.min(p, q.target), done: p >= q.target }; });
}
export function questGold(practice) {
  return Object.values(practice?.quests || {}).reduce((x, w) => x + (w.done?.length || 0) * QUEST_GOLD + (w.bonus ? QUEST_BONUS : 0), 0);
}

// ---- Altın
export function goldInfo(ctx) {
  const { subs, practice, wordsets = [] } = ctx;
  const parts = {
    hw: Object.keys(subs).length * 10,
    fix: (practice?.fixed || []).length,
    games: (practice?.xpGames || 0) * 2,
    days: streakInfo(practice).gold,
    quests: questGold(practice),
    album: albumGold(practice, wordsets)
  };
  const earned = Object.values(parts).reduce((x, y) => x + y, 0);
  const spent = practice?.spent || 0;
  return { parts, earned, spent, balance: Math.max(0, earned - spent) };
}

// ---- Evcil hayvan
export const PET_SPECIES = ["🐶", "🐱", "🐰", "🦊", "🐼", "🐲", "🦄", "🐧", "🐢", "🦖", "🐨", "🐯"];
export const PET_STAGES = [
  { n: "Yumurta", min: 0, size: 56 }, { n: "Bebek", min: 2, size: 48 }, { n: "Minik", min: 10, size: 60 },
  { n: "Genç", min: 25, size: 74 }, { n: "Yetişkin", min: 50, size: 88 }, { n: "Efsane", min: 90, size: 100 }
];
export const PET_FOOD = 3;
export function petInfo(ctx) {
  const { subs, practice } = ctx;
  const pet = practice?.pet || null;
  const gp = Object.keys(subs).length * 2 + Math.floor((practice?.fixed || []).length / 5) + Math.floor((practice?.xpGames || 0) / 3) + (practice?.pet?.feeds || 0);
  let st = 0; PET_STAGES.forEach((s, i) => { if (gp >= s.min) st = i; });
  const next = PET_STAGES[st + 1];
  const fed = pet?.fed ? Math.round((keyToDate(dayKey()) - keyToDate(pet.fed)) / DAY) : 99;
  const mood = fed <= 1 ? { k: "happy", e: "😊", t: "Mutlu" } : fed <= 3 ? { k: "hungry", e: "😐", t: "Acıktı" } : { k: "sad", e: "😢", t: "Çok aç, onu besle!" };
  return { pet, gp, curMin: PET_STAGES[st].min, stage: st, stageName: PET_STAGES[st].n, size: PET_STAGES[st].size, next, toNext: next ? next.min - gp : 0, mood, fedToday: pet?.fed === dayKey() };
}
