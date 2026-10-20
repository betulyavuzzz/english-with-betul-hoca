// Dönem sonu karnesi (öğretmen paneli ve veli sayfası ortak kullanır)
import { esc } from "./ui.js?v=7";
import { SITE } from "./config.js?v=7";
import { SKILLS } from "./defaults.js?v=7";
import { avatarHtml, computeXP } from "./game.js?v=7";

export const TERMS = () => {
  const now = new Date();
  const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1; // eğitim yılının başladığı yıl
  return [
    { key: "1", label: `${y}-${y + 1} 1. Dönem`, from: new Date(y, 8, 1).getTime(), to: new Date(y + 1, 0, 31, 23, 59).getTime() },
    { key: "2", label: `${y}-${y + 1} 2. Dönem`, from: new Date(y + 1, 1, 1).getTime(), to: new Date(y + 1, 6, 1).getTime() },
    { key: "all", label: `${y}-${y + 1} Tüm yıl`, from: new Date(y, 8, 1).getTime(), to: new Date(y + 1, 6, 1).getTime() }
  ];
};
export const currentTerm = () => (new Date().getMonth() >= 1 && new Date().getMonth() <= 6 ? "2" : "1");

const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
const sc = (s) => s.best ?? s.percent;

export function reportData({ student, assignments, subs, points, feedback, practice, term }) {
  const inT = (t) => t >= term.from && t <= term.to;
  const as = assignments.filter((a) => a.published && (!a.sections?.length || a.sections.includes(student.section)) && inT(a.createdAt || 0))
    .sort((a, b) => (a.week || 0) - (b.week || 0) || (a.createdAt || 0) - (b.createdAt || 0));
  const subMap = Object.fromEntries(subs.map((s) => [s.assignmentId, s]));
  const done = as.filter((a) => subMap[a.id]);
  const pcts = done.map((a) => sc(subMap[a.id]));
  const tally = {};
  done.forEach((a) => { const s = subMap[a.id]; a.items.forEach((it, i) => { if (it.type === "write" || s.correct?.[i] == null) return; const k = it.skill || "V"; tally[k] = tally[k] || [0, 0]; tally[k][0] += s.correct[i]; tally[k][1]++; }); });
  const skills = Object.entries(tally).map(([k, [c, n]]) => ({ k, name: SKILLS[k] || k, p: Math.round((c / n) * 100) })).sort((a, b) => b.p - a.p);
  const pts = points.filter((p) => inT(p.at || 0));
  const plus = pts.filter((p) => p.delta > 0).reduce((x, p) => x + p.delta, 0);
  const minus = pts.filter((p) => p.delta < 0).reduce((x, p) => x + p.delta, 0);
  const reasons = {};
  pts.filter((p) => p.delta > 0).forEach((p) => (reasons[p.reason] = (reasons[p.reason] || 0) + p.delta));
  const topReason = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0]?.[0];
  const fbs = feedback.filter((f) => inT(f.updatedAt || 0)).sort((a, b) => a.week - b.week);
  const stars = avg(fbs.map((f) => f.stars || 0).filter(Boolean));
  const X = computeXP({ subs, points, feedback, practice });
  return { as, subMap, done, pcts, average: avg(pcts), skills, plus, minus, topReason, fbs, stars, X, games: practice?.games || 0 };
}

export function observation(student, d) {
  const first = student.name.split(" ")[0];
  const parts = [];
  const rate = d.as.length ? Math.round((d.done.length / d.as.length) * 100) : null;
  if (rate == null) parts.push(`${first} bu dönem için henüz ödev kaydı bulunmamaktadır.`);
  else if (rate >= 90) parts.push(`${first} bu dönem verilen ödevlerin neredeyse tamamını (${d.done.length}/${d.as.length}) düzenli olarak yapmıştır.`);
  else if (rate >= 60) parts.push(`${first} bu dönem ödevlerinin büyük kısmını (${d.done.length}/${d.as.length}) tamamlamıştır; ödevlerini daha düzenli yapması başarısını artıracaktır.`);
  else parts.push(`${first} bu dönem ödevlerinin ${d.done.length}/${d.as.length} kadarını yapmıştır; ödev takibinde desteğe ihtiyaç duymaktadır.`);
  if (d.average != null) parts.push(d.average >= 85 ? `Ödev ortalaması ${d.average} ile oldukça başarılıdır.` : d.average >= 65 ? `Ödev ortalaması ${d.average} olup iyi bir düzeydedir.` : `Ödev ortalaması ${d.average} olup konu tekrarı yapması önerilir.`);
  if (d.skills.length >= 2) parts.push(`En güçlü olduğu alan ${d.skills[0].name.toLocaleLowerCase("tr")} (%${d.skills[0].p}); geliştirmesi gereken alan ${d.skills[d.skills.length - 1].name.toLocaleLowerCase("tr")} (%${d.skills[d.skills.length - 1].p}) olarak görülmektedir.`);
  else if (d.skills.length === 1) parts.push(`${d.skills[0].name} alanında başarısı %${d.skills[0].p} düzeyindedir.`);
  if (d.plus || d.minus) parts.push(d.plus >= Math.abs(d.minus) * 2 ? `Derse katılımı olumludur${d.topReason ? `; özellikle "${d.topReason.toLocaleLowerCase("tr")}" konusunda öne çıkmaktadır` : ""}.` : `Ders içi davranışlarında gelişime açık yönleri bulunmaktadır.`);
  if (d.games >= 10) parts.push(`Kelime oyunlarıyla ders dışında da İngilizce çalışmaktadır.`);
  return parts.join(" ");
}

export function reportHtml({ student, avatar, settings, term, ...rest }) {
  const d = reportData({ student, term, ...rest });
  const grade = student.grade;
  const cols = settings.gradeColumns || [];
  const scores = student.scores || {};
  const lastNote = [...d.fbs].reverse().find((f) => f.note)?.note;
  const color = (p) => (p == null ? "#ccc" : p >= 85 ? "#2b9348" : p >= 70 ? "#4361ee" : p >= 50 ? "#f8961e" : "#d64545");
  return `<article class="karne">
    <header class="k-head"><div class="k-logo">B</div><div style="flex:1"><div class="k-title">İngilizce Gelişim Karnesi</div><div class="k-sub">${esc(SITE.school)} · ${esc(term.label)}</div></div>${avatarHtml(avatar, 64, d.X.level)}</header>
    <div class="k-id"><div><small>Öğrenci</small><b>${esc(student.name)}</b></div><div><small>Sınıf / No</small><b>${grade}-${esc(student.section)} / ${esc(student.no)}</b></div><div><small>Seviye</small><b>Lv ${d.X.level} · ${d.X.name}</b></div></div>
    <div class="k-tiles">
      <div style="--k:#ff6a88"><b>${d.done.length}/${d.as.length}</b><small>Yapılan ödev</small></div>
      <div style="--k:#4361ee"><b>${d.average ?? "–"}</b><small>Ödev ortalaması</small></div>
      <div style="--k:#2b9348"><b>+${d.plus} / ${d.minus}</b><small>Ders içi puan</small></div>
      <div style="--k:#c9a227"><b>${d.stars ? "★".repeat(Math.round(d.stars)) : "–"}</b><small>Haftalık yıldız ort.</small></div>
    </div>
    <div class="k-grid">
      <section><h4>Ödev puanları</h4>${d.as.length ? `<div class="k-bars">${d.as.map((a) => { const s = d.subMap[a.id]; const p = s ? sc(s) : null; return `<div class="k-bar" title="${esc(a.title)}"><span style="height:${p == null ? 4 : Math.max(p, 4)}%;background:${p == null ? "repeating-linear-gradient(45deg,#eee,#eee 4px,#ddd 4px,#ddd 8px)" : color(p)}"></span><small>${p ?? "✗"}</small></div>`; }).join("")}</div>` : `<p class="muted small">Ödev yok.</p>`}</section>
      <section><h4>Beceri analizi</h4>${d.skills.length ? d.skills.map((s) => `<div class="k-sk"><span>${esc(s.name)}</span><div><i style="width:${s.p}%;background:${color(s.p)}"></i></div><b>%${s.p}</b></div>`).join("") : `<p class="muted small">Veri yok.</p>`}</section>
    </div>
    ${cols.length ? `<section><h4>Notlar</h4><table class="k-tbl"><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}<th>Ödev ort.</th></tr><tr>${cols.map((c) => `<td>${scores[c] ?? "–"}</td>`).join("")}<td>${d.average ?? "–"}</td></tr></table></section>` : ""}
    <section class="k-obs"><h4>Öğretmen görüşü</h4><p>${esc(observation(student, d))}</p>${lastNote ? `<p class="k-note">"${esc(lastNote)}"</p>` : ""}</section>
    <footer class="k-foot"><div>Hazırlayan<br><b>${esc(SITE.teacher)}</b><br>İngilizce Öğretmeni</div><div class="k-slogan">${esc(SITE.slogan)}</div><div>Veli imzası<br><br>..........................</div></footer>
  </article>`;
}
