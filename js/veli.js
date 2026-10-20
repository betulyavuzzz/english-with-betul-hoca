// Veli sayfası: çocuğun bilgileriyle giriş, salt okunur özet + karne
import { api, isDemo, friendlyError } from "./api.js?v=5";
import { SITE } from "./config.js?v=5";
import { $, $$, esc, fmtDate, pctClass } from "./ui.js?v=5";
import { avatarHtml, computeXP } from "./game.js?v=5";
import { reportHtml, TERMS, currentTerm } from "./report.js?v=5";

const app = $("#app");
let settings = await api.getSettings();
let me, data;
if (isDemo) $("#demoBand").classList.remove("hidden");
$("#logout").onclick = () => api.logout();

api.onAuth(async (s) => {
  if (s.role === "student") { me = s.student; await load(); home(); }
  else if (s.role === "teacher") location.href = "ogretmen.html";
  else login();
});

function login() {
  $("#who").classList.add("hidden"); $("#logout").classList.add("hidden");
  let grade = settings.activeGrades[0];
  app.className = "wrap narrow";
  app.innerHTML = `<div class="hero"><div style="font-size:56px">👪</div><h1>Veli <span>sayfası</span></h1><p>Çocuğunuzun İngilizce ödevlerini, puanlarını ve öğretmen notlarını buradan takip edebilirsiniz.</p></div>
    <form class="card" id="lf">
      <label>Çocuğunuzun sınıfı</label>
      <div class="grade-pick">${[5, 6, 7, 8].map((g) => `<button type="button" class="grade-btn" data-g="${g}" ${settings.activeGrades.includes(g) ? "" : "disabled"}>${g}<small>sınıf</small></button>`).join("")}</div>
      <div class="row" style="gap:12px"><div class="field" style="flex:1"><label>Şube</label><select id="sec"></select></div>
      <div class="field" style="flex:1.3"><label>Okul numarası</label><input id="no" type="tel" inputmode="numeric"></div></div>
      <div class="field"><label>Şifre (çocuğunuzun 4 haneli şifresi)</label><input id="pin" class="pin-input" type="password" inputmode="numeric" maxlength="4"></div>
      <div class="err" id="lerr"></div>
      <button class="btn gold lg block" id="lbtn">Giriş yap</button>
    </form><div class="foot">${SITE.school} · <b>${SITE.slogan}</b></div>`;
  const setG = (g) => { grade = g; $$(".grade-btn").forEach((b) => b.classList.toggle("on", Number(b.dataset.g) === g)); $("#sec").innerHTML = (settings.sections[g] || []).map((s) => `<option>${s}</option>`).join(""); };
  $$(".grade-btn").forEach((b) => b.onclick = () => setG(Number(b.dataset.g))); setG(grade);
  $("#lf").onsubmit = async (e) => {
    e.preventDefault(); $("#lerr").textContent = "";
    try { await api.studentLogin({ grade, section: $("#sec").value, no: $("#no").value.trim(), pin: $("#pin").value.trim() }); }
    catch (err) { $("#lerr").textContent = friendlyError(err); }
  };
}

async function load() {
  const [as, subs, fb, pts, prof, pr] = await Promise.all([
    api.listAssignments(me.grade, { publishedOnly: true }), api.mySubmissions(me.uid), api.myFeedback(me.uid),
    api.myPoints(me.uid).catch(() => []), api.getProfile(me.uid).catch(() => null), api.getPractice(me.uid).catch(() => null)
  ]);
  data = { assignments: as.filter((a) => !a.sections?.length || a.sections.includes(me.section)), subs, feedback: fb, points: pts.sort((a, b) => b.at - a.at), avatar: prof?.avatar, practice: pr };
}

function home() {
  app.className = "wrap";
  $("#who").classList.remove("hidden"); $("#logout").classList.remove("hidden");
  $("#who").innerHTML = `<span>👪 ${esc(me.name)} velisi</span>`;
  const { assignments, subs, feedback, points, avatar, practice } = data;
  const sm = Object.fromEntries(subs.map((s) => [s.assignmentId, s]));
  const today = new Date().toISOString().slice(0, 10);
  const chrono = [...assignments].sort((a, b) => (b.week || 0) - (a.week || 0) || (b.createdAt || 0) - (a.createdAt || 0));
  const done = chrono.filter((a) => sm[a.id]);
  const late = chrono.filter((a) => !sm[a.id] && a.dueDate && a.dueDate < today);
  const open = chrono.filter((a) => !sm[a.id] && !(a.dueDate && a.dueDate < today));
  const pcts = done.map((a) => sm[a.id].best ?? sm[a.id].percent);
  const avg = pcts.length ? Math.round(pcts.reduce((x, y) => x + y, 0) / pcts.length) : null;
  const X = computeXP({ subs, points, feedback, practice });
  const net = points.reduce((x, p) => x + p.delta, 0);
  let term = currentTerm();
  app.innerHTML = `
    <section class="card row" style="gap:18px;flex-wrap:nowrap">${avatarHtml(avatar, 76, X.level)}<div><h2 style="margin:0">${esc(me.name)}</h2><p class="muted" style="margin:2px 0 0">${me.grade}-${esc(me.section)} · No ${esc(me.no)} · Seviye ${X.level} (${X.name})</p></div></section>
    <div class="tiles" style="margin-top:14px">
      <div class="tile t1"><span>📚</span><b>${done.length}/${chrono.length}</b><small>yapılan ödev</small></div>
      <div class="tile t2"><span>🎯</span><b>${avg ?? "–"}</b><small>ödev ortalaması</small></div>
      <div class="tile t3"><span>🙋</span><b>${net > 0 ? "+" : ""}${net}</b><small>ders içi puan</small></div>
      <div class="tile t4"><span>${late.length ? "⚠️" : "✅"}</span><b>${late.length}</b><small>kaçırılan ödev</small></div>
    </div>
    ${open.length ? `<div class="remind" style="margin-top:14px">⏳ <div><b>Bekleyen ödevler:</b> ${open.map((a) => `"${esc(a.title)}"${a.dueDate ? ` (son gün ${fmtDate(a.dueDate)})` : ""}`).join(", ")}</div></div>` : ""}
    <div class="grid" style="margin-top:14px">
      <div class="card"><h3>📝 Ödevler</h3>${chrono.length ? `<div class="tbl-wrap"><table class="tbl"><tr><th>Ödev</th><th>Son gün</th><th class="c">Durum</th></tr>${chrono.map((a) => { const s = sm[a.id]; const p = s ? s.best ?? s.percent : null; return `<tr><td><b>${esc(a.title)}</b><br><span class="small muted">Ünite ${a.unit}${a.week ? ` · ${a.week}. hafta` : ""}</span></td><td class="small">${a.dueDate ? fmtDate(a.dueDate) : "–"}</td><td class="c">${s ? `<span class="cell-score score ${pctClass(p)}">${p}</span><br><span class="small muted">${new Date(s.submittedAt).toLocaleDateString("tr-TR")}</span>` : a.dueDate && a.dueDate < today ? `<span class="badge late">Yapılmadı</span>` : `<span class="badge ok">Bekliyor</span>`}</td></tr>`; }).join("")}</table></div>` : `<p class="muted">Henüz ödev yok.</p>`}</div>
      <div class="card"><h3>💬 Öğretmen notları</h3>${feedback.length ? feedback.sort((a, b) => b.week - a.week).map((f) => `<div class="item-ed"><div class="row between"><b>${f.week}. hafta</b><span class="stars">${"★".repeat(f.stars || 0)}${"☆".repeat(5 - (f.stars || 0))}</span></div>${f.note ? `<p style="margin:6px 0 0">${esc(f.note)}</p>` : ""}${f.strength ? `<p class="small" style="margin:4px 0 0">💪 ${esc(f.strength)}</p>` : ""}${f.work ? `<p class="small" style="margin:2px 0 0">🎯 ${esc(f.work)}</p>` : ""}</div>`).join("") : `<p class="muted">Henüz not yok.</p>`}</div>
      <div class="card"><h3>🙋 Ders içi puanlar</h3>${points.length ? `<div class="plist">${points.slice(0, 15).map((p) => `<div class="pitem ${p.delta > 0 ? "plus" : "minus"}"><span class="pe">${esc(p.emoji || "")}</span><span style="flex:1">${esc(p.reason || "")}</span><b>${p.delta > 0 ? "+" : ""}${p.delta}</b><small>${new Date(p.at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</small></div>`).join("")}</div>` : `<p class="muted">Henüz puan yok.</p>`}</div>
      <div class="card"><div class="row between"><h3 style="margin:0">📄 Karne</h3><span class="row"><select id="kt" style="width:auto">${TERMS().map((t) => `<option value="${t.key}" ${t.key === term ? "selected" : ""}>${t.label}</option>`).join("")}</select><button class="btn gold sm" id="kp">🖨 Yazdır / PDF</button></span></div><div id="kbox" style="margin-top:12px"></div></div>
    </div>
    <p class="small muted center" style="margin-top:20px">Sorularınız için: ${SITE.teacher} · İngilizce Öğretmeni</p>`;
  const drawK = () => { $("#kbox").innerHTML = reportHtml({ student: me, avatar, settings, term: TERMS().find((t) => t.key === term), assignments, subs, points, feedback, practice }); };
  $("#kt").onchange = (e) => { term = e.target.value; drawK(); };
  $("#kp").onclick = () => { document.body.classList.add("print-karne"); window.print(); document.body.classList.remove("print-karne"); };
  drawK();
}
