import { api, isDemo, friendlyError } from "./api.js";
import { SITE } from "./config.js";
import { $, $$, esc, toast, fmtDate, pctClass } from "./ui.js";
import { play, computeResult, itemSummary, answerText, correctText } from "./player.js";

const app = $("#app");
let settings = null;
let me = null;          // öğrenci kaydı
let assignments = [];
let subs = {};          // assignmentId -> submission
let feedback = [];
let tab = "hw";

if (isDemo) $("#demoBand").classList.remove("hidden");
$("#logout").onclick = async () => { await api.logout(); };

settings = await api.getSettings();
api.onAuth(async (s) => {
  if (s.role === "student") { me = s.student; await loadMine(); showHome(); }
  else if (s.role === "teacher") { location.href = "ogretmen.html"; }
  else { me = null; showLogin(s.orphan); }
});

// ---------------------------------------------------------------- Giriş
function showLogin(orphan) {
  $("#who").classList.add("hidden"); $("#logout").classList.add("hidden");
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem("ewbh-last") || "{}"); } catch {}
  let grade = saved.grade && settings.activeGrades.includes(saved.grade) ? saved.grade : settings.activeGrades[0];
  app.className = "wrap narrow";
  app.innerHTML = `
    <div class="hero"><h1>Hello! <span>👋</span></h1><p>Ödevlerine ulaşmak için giriş yap.</p></div>
    <form class="card" id="lf" autocomplete="off">
      <label>Sınıfın</label>
      <div class="grade-pick">${[5, 6, 7, 8].map((g) => {
        const on = settings.activeGrades.includes(g);
        return `<button type="button" class="grade-btn" data-g="${g}" ${on ? "" : "disabled"}>${g}<small>${on ? "sınıf" : "yakında"}</small></button>`;
      }).join("")}</div>
      <div class="row" style="gap:12px">
        <div class="field" style="flex:1"><label for="sec">Şuben</label><select id="sec"></select></div>
        <div class="field" style="flex:1.3"><label for="no">Okul numaran</label><input id="no" type="tel" inputmode="numeric" maxlength="6" placeholder="Örn. 245" value="${esc(saved.no || "")}"></div>
      </div>
      <div class="field"><label for="pin">Şifren (4 rakam)</label><input id="pin" class="pin-input" type="password" inputmode="numeric" maxlength="4" placeholder="••••"></div>
      <div class="err" id="lerr">${orphan ? "Hesabın bulunamadı, öğretmenine haber ver." : ""}</div>
      <button class="btn gold lg block" id="lbtn">Giriş yap →</button>
      <p class="small muted center" style="margin:14px 0 0">Şifreni unuttuysan öğretmenine sor.</p>
    </form>
    <div class="foot">${SITE.school} · <b>${SITE.slogan}</b><br><a href="ogretmen.html" class="small">Öğretmen girişi</a></div>`;
  const setGrade = (g) => {
    grade = g;
    $$(".grade-btn").forEach((b) => b.classList.toggle("on", Number(b.dataset.g) === g));
    $("#sec").innerHTML = (settings.sections[g] || []).map((s) => `<option ${s === saved.section ? "selected" : ""}>${s}</option>`).join("");
  };
  $$(".grade-btn").forEach((b) => b.onclick = () => setGrade(Number(b.dataset.g)));
  setGrade(grade);
  $("#pin").oninput = (e) => (e.target.value = e.target.value.replace(/\D/g, ""));
  $("#lf").onsubmit = async (e) => {
    e.preventDefault();
    const no = $("#no").value.trim(), pin = $("#pin").value.trim(), section = $("#sec").value;
    if (!no || pin.length !== 4) { $("#lerr").textContent = "Numaranı ve 4 haneli şifreni yaz."; return; }
    $("#lbtn").disabled = true; $("#lbtn").textContent = "Giriş yapılıyor…"; $("#lerr").textContent = "";
    try {
      await api.studentLogin({ grade, section, no, pin });
      try { localStorage.setItem("ewbh-last", JSON.stringify({ grade, section, no })); } catch {}
    } catch (err) {
      $("#lerr").textContent = friendlyError(err);
      $("#lbtn").disabled = false; $("#lbtn").textContent = "Giriş yap →";
    }
  };
}

// ---------------------------------------------------------------- Veri
async function loadMine() {
  const [as, ss, fb] = await Promise.all([
    api.listAssignments(me.grade, { publishedOnly: true }),
    api.mySubmissions(me.uid),
    api.myFeedback(me.uid)
  ]);
  assignments = as.filter((a) => !a.sections?.length || a.sections.includes(me.section));
  subs = Object.fromEntries(ss.map((s) => [s.assignmentId, s]));
  feedback = fb.sort((a, b) => b.week - a.week);
}

const today = () => new Date().toISOString().slice(0, 10);
function status(a) {
  const s = subs[a.id];
  if (s) return { done: true, s };
  if (a.dueDate && a.dueDate < today()) return { late: true };
  return { open: true };
}
function badgesFor() {
  const done = Object.values(subs);
  const pcts = done.map((s) => s.best ?? s.percent);
  const listenAll = done.some((s) => { const a = assignments.find((x) => x.id === s.assignmentId); return a && a.items.some((it) => it.type === "listen") && a.items.every((it, i) => it.type !== "listen" || s.correct?.[i] === 1); });
  const onTime = done.filter((s) => { const a = assignments.find((x) => x.id === s.assignmentId); return a && (!a.dueDate || new Date(s.submittedAt).toISOString().slice(0, 10) <= a.dueDate); }).length;
  return [
    { e: "🚀", n: "İlk Adım", d: "İlk ödevini yaptın", on: done.length >= 1 },
    { e: "📚", n: "Çalışkan Arı", d: "5 ödev tamamla", on: done.length >= 5 },
    { e: "🏆", n: "Şampiyon", d: "10 ödev tamamla", on: done.length >= 10 },
    { e: "💯", n: "Kusursuz", d: "Bir ödevden 100 al", on: pcts.some((p) => p >= 100) },
    { e: "⭐", n: "Yıldız Öğrenci", d: "Ortalaman 85 ve üstü", on: pcts.length >= 3 && avg(pcts) >= 85 },
    { e: "🎧", n: "Keskin Kulak", d: "Dinleme sorularının hepsi doğru", on: listenAll },
    { e: "⏰", n: "Dakik", d: "3 ödevi zamanında yap", on: onTime >= 3 },
    { e: "🌟", n: "Öğretmenin Yıldızı", d: "Haftalık 5 yıldız al", on: feedback.some((f) => f.stars >= 5) }
  ];
}
const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);

// ---------------------------------------------------------------- Ana sayfa
function showHome() {
  app.className = "wrap";
  $("#who").classList.remove("hidden"); $("#logout").classList.remove("hidden");
  $("#who").innerHTML = `<b>${esc(me.name.split(" ")[0])}</b> <span>· ${me.grade}-${me.section}</span>`;
  const done = Object.values(subs);
  const pcts = done.map((s) => s.best ?? s.percent);
  const pending = assignments.filter((a) => status(a).open).length;
  const nb = badgesFor().filter((b) => b.on).length;
  app.innerHTML = `
    <section class="welcome">
      <h2>Hello, ${esc(me.name.split(" ")[0])}! 👋</h2>
      <p>${pending ? `Seni bekleyen <b>${pending}</b> ödev var. Hadi başlayalım!` : "Tüm ödevlerini bitirdin, harikasın! 🎉"}</p>
      <div class="stats">
        <div class="stat"><b>${done.length}</b><span>tamamlanan ödev</span></div>
        <div class="stat"><b>${pcts.length ? avg(pcts) : "–"}</b><span>ortalama puan</span></div>
        <div class="stat"><b>${nb}</b><span>rozet</span></div>
      </div>
    </section>
    <nav class="tabs">
      <button class="tab" data-t="hw">📝 Ödevlerim</button>
      <button class="tab" data-t="fb">💬 Geri bildirimler</button>
      <button class="tab" data-t="bd">🏅 Rozetlerim</button>
    </nav>
    <section id="tabBody"></section>`;
  $$(".tab").forEach((b) => b.onclick = () => { tab = b.dataset.t; drawTab(); });
  drawTab();
}

function drawTab() {
  $$(".tab").forEach((b) => b.classList.toggle("on", b.dataset.t === tab));
  const body = $("#tabBody");
  if (tab === "hw") body.innerHTML = hwList();
  if (tab === "fb") body.innerHTML = fbView();
  if (tab === "bd") body.innerHTML = `<div class="badges">${badgesFor().map((b) => `<div class="bdg ${b.on ? "" : "off"}"><div class="e">${b.e}</div><b>${b.n}</b><small>${b.d}</small></div>`).join("")}</div>`;
  $$("[data-start]").forEach((b) => b.onclick = () => start(b.dataset.start));
  $$("[data-review]").forEach((b) => b.onclick = () => review(b.dataset.review));
}

function hwList() {
  if (!assignments.length) return `<div class="card empty"><div class="big">📭</div><p>Henüz ödev yok. Öğretmenin ödev verince burada göreceksin.</p></div>`;
  const units = settings.units[me.grade] || [];
  const order = [...assignments].sort((a, b) => (status(a).done - status(b).done) || (b.week - a.week));
  return order.map((a) => {
    const st = status(a);
    const s = st.s;
    const used = s?.attempts || 0;
    const allowed = a.attempts || settings.defaultAttempts || 1;
    const right = st.done
      ? `<div class="row" style="justify-content:flex-end"><span class="score ${pctClass(s.best ?? s.percent)}">${s.best ?? s.percent}</span>
         ${used < allowed ? `<button class="btn ghost sm" data-start="${a.id}">Tekrar çöz</button>` : ""}
         <button class="btn ghost sm" data-review="${a.id}">Cevaplarım</button></div>`
      : `<button class="btn gold" data-start="${a.id}">${st.late ? "Geç de olsa yap" : "Başla →"}</button>`;
    return `<article class="hw ${st.done ? "done" : ""}">
      <div class="ic">${st.done ? "✅" : st.late ? "⏰" : "📝"}</div>
      <div class="meta">
        <h3>${esc(a.title)}</h3>
        <p>${a.week ? `${a.week}. hafta · ` : ""}Ünite ${a.unit}: ${esc(units[a.unit - 1] || "")} · ${a.items.length} soru</p>
        <p>${a.dueDate ? (st.late ? `<span class="badge late">Süresi geçti: ${fmtDate(a.dueDate)}</span>` : `Son gün: <b>${fmtDate(a.dueDate)}</b>`) : ""}
        ${s && !s.writingGraded && s.writeTotal ? ` <span class="badge ok">Yazma kısmı puanlanıyor</span>` : ""}</p>
      </div>
      ${right}
    </article>`;
  }).join("");
}

function fbView() {
  const done = assignments.filter((a) => subs[a.id]).sort((a, b) => a.week - b.week || a.createdAt - b.createdAt);
  const chart = done.length ? `<div class="card"><h3>📈 Ödev puanlarım</h3>
      <div class="bars">${done.map((a) => { const p = subs[a.id].best ?? subs[a.id].percent; return `<div class="bar" style="height:${Math.max(p, 3)}%"><span>${p}</span></div>`; }).join("")}</div>
      <div class="bar-labels">${done.map((a) => `<span>${a.week ? a.week + ".h" : "•"}</span>`).join("")}</div></div>` : "";
  const cols = settings.gradeColumns || [];
  const sc = me.scores || {};
  const grades = cols.some((c) => sc[c] != null && sc[c] !== "") ? `<div class="card"><h3>📒 Notlarım</h3><div class="tbl-wrap"><table class="tbl"><tr>${cols.map((c) => `<th class="c">${esc(c)}</th>`).join("")}</tr><tr>${cols.map((c) => `<td class="c"><b>${sc[c] ?? "–"}</b></td>`).join("")}</tr></table></div></div>` : "";
  const notes = feedback.length ? feedback.map((f) => `<article class="card fbcard">
      <h3><span>${f.week}. hafta</span><span class="stars">${"★".repeat(f.stars || 0)}${"☆".repeat(5 - (f.stars || 0))}</span></h3>
      ${f.note ? `<p style="margin:0 0 8px;font-size:1.05rem">${esc(f.note)}</p>` : ""}
      ${f.strength ? `<p class="small" style="margin:0">💪 <b>Güçlü yanın:</b> ${esc(f.strength)}</p>` : ""}
      ${f.work ? `<p class="small" style="margin:4px 0 0">🎯 <b>Çalışman gereken:</b> ${esc(f.work)}</p>` : ""}
      <p class="small muted" style="margin:10px 0 0">— ${SITE.teacher}</p>
    </article>`).join("") : `<div class="card empty"><div class="big">💬</div><p>Öğretmeninin yazdığı geri bildirimler burada görünecek.</p></div>`;
  return `<div class="grid">${chart}${grades}${notes}</div>`;
}

// ---------------------------------------------------------------- Ödev çözme
function start(id) {
  const a = assignments.find((x) => x.id === id);
  app.className = "wrap";
  window.scrollTo(0, 0);
  const finish = async (answers) => {
      const ans = Object.fromEntries(answers.map((v, i) => [i, Array.isArray(v) ? [...v] : v]));
      const prev = subs[id];
      const r = computeResult(a, ans, null);
      const sub = {
        assignmentId: id, uid: me.uid, grade: me.grade, section: me.section, no: me.no, name: me.name,
        week: a.week || 0, unit: a.unit, answers: ans, correct: r.correct, auto: r.auto, autoTotal: r.autoTotal,
        writeTotal: r.writeTotal, percent: r.percent, writingGraded: r.writeTotal === 0, writingPoints: null,
        best: Math.max(r.percent, prev?.best ?? 0), attempts: (prev?.attempts || 0) + 1, submittedAt: Date.now()
      };
      app.innerHTML = `<div class="card result"><div class="big">⏳</div><p>Kaydediliyor…</p></div>`;
      try {
        await api.saveSubmission(sub);
        subs[id] = { ...prev, ...sub };
        resultScreen(a, r);
      } catch (e) {
        app.innerHTML = `<div class="card result"><div class="big">⚠️</div><h2>Kaydedilemedi</h2><p>${esc(friendlyError(e))}</p><button class="btn gold" id="retry">Tekrar dene</button></div>`;
        $("#retry").onclick = () => finish(answers);
      }
  };
  play(app, a, { onExit: showHome, onFinish: finish });
}

function resultScreen(a, r) {
  const p = r.percent;
  const msg = p >= 90 ? ["🏆", "Outstanding!", "Muhteşemsin!"] : p >= 70 ? ["🌟", "Great job!", "Çok iyi iş çıkardın!"] : p >= 50 ? ["👍", "Good effort!", "Güzel, biraz daha tekrar edersen süper olacak."] : ["💪", "Keep going!", "Pes etmek yok, tekrar dene!"];
  app.innerHTML = `<div class="card result">
    <div class="big">${msg[0]}</div>
    <h2>${msg[1]}</h2>
    <div class="pct">${p}<small style="font-size:1.4rem">/100</small></div>
    <p class="muted">${msg[2]}</p>
    ${r.writeTotal ? `<p class="small"><span class="badge ok">Yazma bölümünü öğretmenin puanlayacak; puanın değişebilir.</span></p>` : ""}
    <div class="row" style="justify-content:center;margin-top:18px">
      <button class="btn ghost" id="rv">Cevaplarımı gör</button>
      <button class="btn gold" id="hm">Ana sayfa</button>
    </div></div>`;
  $("#hm").onclick = showHome;
  $("#rv").onclick = () => review(a.id);
}

function review(id) {
  const a = assignments.find((x) => x.id === id);
  const s = subs[id];
  const rows = a.items.map((it, i) => {
    const c = s.correct?.[i];
    const icon = it.type === "write" ? "✍️" : c === 1 ? "✅" : c > 0 ? "🟡" : "❌";
    const wp = s.writingPoints?.[i];
    return `<div class="item-ed"><div class="row between"><b>${i + 1}. ${esc(itemSummary(it))}</b><span>${icon}</span></div>
      <p class="small" style="margin:6px 0 0">Senin cevabın: <b>${esc(answerText(it, s.answers?.[i]))}</b></p>
      ${it.type === "write" ? `<p class="small" style="margin:2px 0 0">Öğretmen puanı: <b>${wp != null ? `${wp}/${it.points || 3}` : "bekleniyor"}</b></p>` : c !== 1 ? `<p class="small" style="margin:2px 0 0;color:var(--green)">Doğrusu: <b>${esc(correctText(it))}</b></p>` : ""}</div>`;
  }).join("");
  app.innerHTML = `<div class="row between" style="margin-bottom:14px"><h2 style="margin:0">${esc(a.title)}</h2><button class="btn ghost" id="bk">← Geri</button></div>
    <p class="muted">Puanın: <span class="score ${pctClass(s.best ?? s.percent)}">${s.best ?? s.percent}</span> ${s.attempts > 1 ? `(son denemen: ${s.percent})` : ""}</p>${rows}`;
  $("#bk").onclick = showHome;
  window.scrollTo(0, 0);
}
