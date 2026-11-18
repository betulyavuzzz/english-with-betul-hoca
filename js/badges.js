// Rozetler ve avatar kilit istatistikleri — öğrenci sayfası ve öğretmen paneli aynı hesabı kullanır
import { computeXP } from "./game.js?v=28";

// ctx: { assignments, subs: {aid: sub}, points, feedback, practice, profile, isStar }
const today = () => new Date().toISOString().slice(0, 10);
const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);
const scoreOf = (s) => s.best ?? s.percent;
const late = (ctx, a) => !ctx.subs[a.id] && a.dueDate && a.dueDate < today();

export function boxLeft(ctx) {
  const fixed = new Set(ctx.practice?.fixed || []); let n = 0;
  for (const a of ctx.assignments) { const s = ctx.subs[a.id]; if (!s?.correct) continue; a.items.forEach((it, i) => { const c = s.correct[i]; if (it.type !== "write" && c != null && c < 1 && !fixed.has(`${a.id}:${i}`)) n++; }); }
  return n;
}
export const holidayDone = (ctx) => ctx.assignments.filter((a) => /holiday challenge/i.test(a.title || "") && ctx.subs[a.id]).length;
function bestStreak(ctx) {
  let streak = 0, best = 0;
  for (const a of [...ctx.assignments].sort((a, b) => (a.week || 0) - (b.week || 0) || (a.createdAt || 0) - (b.createdAt || 0))) { if (ctx.subs[a.id]) { streak++; best = Math.max(best, streak); } else if (late(ctx, a)) streak = 0; }
  return best;
}
export const levelOf = (ctx) => computeXP({ subs: Object.values(ctx.subs), points: ctx.points, feedback: ctx.feedback, practice: ctx.practice }).level;

export function computeBadges(ctx) {
  const { assignments, subs, points = [], feedback = [], practice } = ctx;
  const done = Object.values(subs);
  const pcts = done.map(scoreOf);
  const plus = points.filter((p) => p.delta > 0).length;
  const find = (s) => assignments.find((x) => x.id === s.assignmentId);
  const listenAll = done.some((s) => { const a = find(s); return a && a.items.some((it) => it.type === "listen") && a.items.every((it, i) => it.type !== "listen" || s.correct?.[i] === 1); });
  const onTime = done.filter((s) => { const a = find(s); return a && (!a.dueDate || new Date(s.submittedAt).toISOString().slice(0, 10) <= a.dueDate); }).length;
  const lv = levelOf(ctx);
  const fixN = (practice?.fixed || []).length;
  const bs = bestStreak(ctx);
  const early = done.some((s) => { const a = find(s); return a?.createdAt && new Date(s.submittedAt).toDateString() === new Date(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt).toDateString(); });
  return [
    { e: "🚀", n: "İlk Adım", d: "İlk ödevini yap", on: done.length >= 1, c: "#ff6a88" },
    { e: "🐝", n: "Çalışkan Arı", d: "5 ödev tamamla", on: done.length >= 5, c: "#f6a04d" },
    { e: "🏆", n: "Şampiyon", d: "10 ödev tamamla", on: done.length >= 10, c: "#c9a227" },
    { e: "💯", n: "Kusursuz", d: "Bir ödevden 100 al", on: pcts.some((p) => p >= 100), c: "#43aa8b" },
    { e: "⭐", n: "Yıldız Öğrenci", d: "3+ ödevde ortalama 85", on: pcts.length >= 3 && avg(pcts) >= 85, c: "#f9c74f" },
    { e: "🎧", n: "Keskin Kulak", d: "Dinlemelerin hepsi doğru", on: listenAll, c: "#4cc9f0" },
    { e: "⏰", n: "Dakik", d: "3 ödevi zamanında yap", on: onTime >= 3, c: "#7f7fd5" },
    { e: "🙋", n: "Söz Ustası", d: "Derste 10 artı puan al", on: plus >= 10, c: "#e63946" },
    { e: "🌟", n: "Öğretmenin Yıldızı", d: "Haftalık 5 yıldız al", on: feedback.some((f) => f.stars >= 5), c: "#ff7eb3" },
    { e: "🃏", n: "Kelime Avcısı", d: "10 kelime oyununu başarıyla bitir", on: (practice?.xpGames || 0) >= 10, c: "#f3722c" },
    { e: "🌟", n: "Haftanın Yıldızı", d: "Haftanın yıldızları arasına gir", on: !!ctx.isStar || !!ctx.profile?.wasStar, c: "#c9a227" },
    { e: "🦸", n: "Hero", d: "6. seviyeye ulaş", on: lv >= 6, c: "#9d4edd" },
    { e: "🔁", n: "Hata Avcısı", d: "Tekrar kutusundan 10 soru düzelt", on: fixN >= 10, c: "#2b9348" },
    { e: "🧹", n: "Tertemiz", d: "Tekrar kutunu tamamen boşalt", on: fixN > 0 && !boxLeft(ctx), c: "#4cc9f0" },
    { e: "🔥", n: "Seri Ustası", d: "5 ödevi arka arkaya yap", on: bs >= 5, c: "#f3722c" },
    { e: "🐦", n: "Erken Kuş", d: "Bir ödevi verildiği gün yap", on: early, c: "#43aa8b" },
    { e: "💎", n: "Mükemmeliyetçi", d: "3 ödevden 100 al", on: pcts.filter((p) => p >= 100).length >= 3, c: "#7f7fd5" },
    { e: "📚", n: "Kitap Kurdu", d: "20 ödev tamamla", on: done.length >= 20, c: "#9d4edd" },
    { e: "🧠", n: "Hafıza Ustası", d: "25 kelime oyununu başarıyla bitir", on: (practice?.xpGames || 0) >= 25, c: "#ff6a88" },
    { e: "🎤", n: "Sınıfın Sesi", d: "Derste 20 artı puan al", on: plus >= 20, c: "#e63946" },
    { e: "👑", n: "Efsane", d: "8. seviyeye ulaş", on: lv >= 8, c: "#c9a227" },
    { e: "🏖️", n: "Holiday Hero", d: "4 tatil ödevinin hepsini yap", on: holidayDone(ctx) >= 4, c: "#4facfe" }
  ];
}

export function computeStats(ctx) {
  const done = Object.values(ctx.subs);
  return {
    lv: levelOf(ctx), hw: done.length, perfect: done.filter((x) => scoreOf(x) >= 100).length,
    games: ctx.practice?.xpGames || 0, plus: (ctx.points || []).filter((p) => p.delta > 0).reduce((x, p) => x + p.delta, 0),
    star: (ctx.profile?.wasStar || ctx.isStar) ? 1 : 0,
    streak: bestStreak(ctx), badges: computeBadges(ctx).filter((x) => x.on).length, fix: (ctx.practice?.fixed || []).length, holiday: holidayDone(ctx), owned: ctx.practice?.owned || []
  };
}
