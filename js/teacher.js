import { api, isDemo, friendlyError } from "./api.js";
import { SITE } from "./config.js";
import { ITEM_TYPES, SKILLS, COMMENT_TEMPLATES } from "./defaults.js";
import { SEED_ASSIGNMENTS } from "./seed.js";
import { $, $$, esc, toast, fmtDate, pctClass, modal, download } from "./ui.js";
import { play, computeResult, itemSummary, answerText, correctText, itemPoints } from "./player.js";

const app = $("#app");
let settings, grade, view = "home";
let students = [], assignments = [], submissions = [], feedback = [];
let secFilter = "";

if (isDemo) $("#demoBand").classList.remove("hidden");
$("#logout").onclick = () => api.logout();

settings = await api.getSettings();
grade = settings.activeGrades[0] || 5;

api.onAuth(async (s) => {
  if (s.role === "teacher") { $("#logout").classList.remove("hidden"); await reload(); shell(); }
  else if (s.role === "student") location.href = "./";
  else { $("#logout").classList.add("hidden"); login(); }
});

async function reload() {
  [students, assignments, submissions, feedback] = await Promise.all([
    api.listStudents(grade), api.listAssignments(grade), api.listSubmissions(grade), api.listFeedback(grade)
  ]);
  students.sort((a, b) => a.section.localeCompare(b.section, "tr") || Number(a.no) - Number(b.no));
}

// ---------------------------------------------------------------- Giriş
function login() {
  let signup = false;
  app.innerHTML = `<div class="wrap narrow"><div class="hero"><h1>Öğretmen <span>girişi</span></h1><p>${SITE.name}</p></div>
    <form class="card" id="tf">
      <div class="field"><label>E-posta</label><input id="em" type="email" required autocomplete="username"></div>
      <div class="field"><label>Şifre</label><input id="pw" type="password" required minlength="6" autocomplete="current-password"></div>
      <div class="err" id="terr"></div>
      <button class="btn gold block lg" id="tb">Giriş yap</button>
      <p class="small center" style="margin:14px 0 0"><a href="#" id="sw">İlk kez mi giriyorsunuz? Hesap oluşturun</a></p>
    </form></div>`;
  $("#sw").onclick = (e) => { e.preventDefault(); signup = !signup; $("#tb").textContent = signup ? "Hesap oluştur" : "Giriş yap"; $("#sw").textContent = signup ? "Hesabım var, giriş yap" : "İlk kez mi giriyorsunuz? Hesap oluşturun"; };
  $("#tf").onsubmit = async (e) => {
    e.preventDefault(); $("#terr").textContent = "";
    try { signup ? await api.teacherSignup($("#em").value.trim(), $("#pw").value) : await api.teacherLogin($("#em").value.trim(), $("#pw").value); }
    catch (err) { $("#terr").textContent = err.code === "auth/email-already-in-use" ? "Bu hesap zaten var, giriş yapın." : friendlyError(err); }
  };
}

// ---------------------------------------------------------------- İskelet
const NAV = [["home", "🏠", "Genel bakış"], ["hw", "📝", "Ödevler"], ["res", "📊", "Sonuçlar"], ["fb", "💬", "Geri bildirim"], ["gb", "📒", "Not defteri"], ["st", "👥", "Öğrenciler"], ["set", "⚙️", "Ayarlar"]];
function shell() {
  app.innerHTML = `<div class="tlayout"><nav class="side">
      <div class="gsel"><select id="gs">${[5, 6, 7, 8].map((g) => `<option value="${g}" ${g === grade ? "selected" : ""}>${g}. sınıflar${settings.activeGrades.includes(g) ? "" : " (kapalı)"}</option>`).join("")}</select></div>
      ${NAV.map(([k, i, t]) => `<button data-v="${k}">${i} ${t}</button>`).join("")}
    </nav><main class="main" id="main"></main></div>`;
  $("#gs").onchange = async (e) => { grade = Number(e.target.value); secFilter = ""; await reload(); draw(); };
  $$(".side [data-v]").forEach((b) => b.onclick = () => { view = b.dataset.v; draw(); });
  draw();
}
function draw() {
  $$(".side [data-v]").forEach((b) => b.classList.toggle("on", b.dataset.v === view));
  const m = $("#main");
  ({ home: vHome, hw: vHw, res: vRes, fb: vFb, gb: vGb, st: vSt, set: vSet })[view](m);
  window.scrollTo(0, 0);
}
const sections = () => settings.sections[grade] || [];
const secSelect = (id = "sf", allLabel = "Tüm şubeler") => `<select id="${id}" style="width:auto">${[["", allLabel], ...sections().map((s) => [s, `${grade}-${s}`])].map(([v, t]) => `<option value="${v}" ${v === secFilter ? "selected" : ""}>${t}</option>`).join("")}</select>`;
const bindSec = (cb) => { const s = $("#sf"); if (s) s.onchange = (e) => { secFilter = e.target.value; cb(); }; };
const subOf = (aid, uid) => submissions.find((s) => s.assignmentId === aid && s.uid === uid);
const best = (s) => (s ? s.best ?? s.percent : null);
const forSec = (a, sec) => !a.sections?.length || a.sections.includes(sec);
const unitName = (u) => (settings.units[grade] || [])[u - 1] || "";
const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
const visStudents = () => students.filter((s) => !secFilter || s.section === secFilter);

// ---------------------------------------------------------------- Genel bakış
function vHome(m) {
  const pub = assignments.filter((a) => a.published);
  const last = pub[0];
  const studs = visStudents();
  let lastRow = "";
  if (last) {
    const target = studs.filter((s) => forSec(last, s.section));
    const done = target.filter((s) => subOf(last.id, s.uid));
    const missing = target.filter((s) => !subOf(last.id, s.uid));
    const bySec = sections().map((sec) => {
      const t = students.filter((s) => s.section === sec && forSec(last, sec));
      if (!t.length) return "";
      const d = t.filter((s) => subOf(last.id, s.uid));
      const p = Math.round((d.length / t.length) * 100);
      const av = avg(d.map((s) => best(subOf(last.id, s.uid))));
      return `<tr><td><b>${grade}-${sec}</b></td><td style="width:40%"><div class="meter"><span style="width:${p}%"></span></div></td><td class="c">${d.length}/${t.length}</td><td class="c">${av != null ? `<span class="cell-score score ${pctClass(av)}">${av}</span>` : "–"}</td></tr>`;
    }).join("");
    lastRow = `<div class="card"><div class="row between"><h3 style="margin:0">Son ödev: ${esc(last.title)}</h3><span class="muted small">${last.dueDate ? "Son gün " + fmtDate(last.dueDate) : ""}</span></div>
      <div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><tr><th>Şube</th><th>Tamamlama</th><th class="c">Yapan</th><th class="c">Ortalama</th></tr>${bySec}</table></div></div>
      <div class="card"><div class="row between"><h3 style="margin:0">Yapmayanlar (${missing.length})</h3><button class="btn ghost sm" id="cp">📋 Listeyi kopyala</button></div>
      <p class="muted small">Kopyalayıp sınıf WhatsApp grubuna atabilirsiniz.</p>
      <div>${missing.length ? missing.map((s) => `<span class="badge" style="margin:3px">${s.section}·${s.no} ${esc(s.name)}</span>`).join("") : "Herkes yaptı 🎉"}</div></div>`;
    setTimeout(() => { const b = $("#cp"); if (b) b.onclick = () => { navigator.clipboard?.writeText(`📝 "${last.title}" ödevini henüz yapmayanlar:\n` + missing.map((s) => `• ${grade}-${s.section} ${s.no} ${s.name}`).join("\n")); toast("Kopyalandı", "ok"); }; });
    void done;
  }
  const allP = submissions.filter((s) => studs.some((x) => x.uid === s.uid)).map(best);
  const writePending = submissions.filter((s) => s.writeTotal && !s.writingGraded).length;
  m.innerHTML = `<div class="row between"><h2>${grade}. sınıflar · Genel bakış</h2>${secSelect()}</div>
    <div class="kpis">
      <div class="kpi"><b>${studs.length}</b><span>öğrenci</span></div>
      <div class="kpi"><b>${pub.length}</b><span>yayındaki ödev</span></div>
      <div class="kpi"><b>${avg(allP) ?? "–"}</b><span>genel ortalama</span></div>
      <div class="kpi"><b>${writePending}</b><span>puanlanacak yazma</span></div>
    </div>
    ${!students.length ? `<div class="card empty"><div class="big">👥</div><p>Önce öğrencileri ekleyin.</p><button class="btn gold" onclick="document.querySelector('[data-v=st]').click()">Öğrenci ekle</button></div>` : ""}
    ${!assignments.length ? `<div class="card empty"><div class="big">📝</div><p>Henüz ödev yok.</p><button class="btn gold" onclick="document.querySelector('[data-v=hw]').click()">Ödev ekle</button></div>` : ""}
    <div class="grid">${lastRow}${skillCard(studs)}</div>`;
  bindSec(() => vHome(m));
}
function skillCard(studs) {
  const tally = {};
  submissions.filter((s) => studs.some((x) => x.uid === s.uid)).forEach((s) => {
    const a = assignments.find((x) => x.id === s.assignmentId); if (!a) return;
    a.items.forEach((it, i) => { if (it.type === "write" || s.correct?.[i] == null) return; const k = it.skill || "V"; tally[k] = tally[k] || [0, 0]; tally[k][0] += s.correct[i]; tally[k][1]++; });
  });
  const ks = Object.keys(tally); if (!ks.length) return "";
  return `<div class="card"><h3>Beceri bazında başarı</h3><p class="muted small">Tüm ödevlerdeki doğru cevap oranı</p>${ks.map((k) => { const p = Math.round((tally[k][0] / tally[k][1]) * 100); return `<div style="margin:10px 0"><div class="row between small"><b>${SKILLS[k] || k}</b><span>%${p}</span></div><div class="meter"><span style="width:${p}%;background:${p < 50 ? "var(--red)" : p < 70 ? "var(--orange)" : "var(--green)"}"></span></div></div>`; }).join("")}</div>`;
}

// ---------------------------------------------------------------- Ödevler
function vHw(m) {
  m.innerHTML = `<div class="row between"><h2>${grade}. sınıf ödevleri</h2><div class="row">
      <button class="btn ghost sm" id="imp">⬇ JSON ile ekle</button>
      ${grade === 5 ? `<button class="btn ghost sm" id="seed">⭐ Hazır ödevleri yükle</button>` : ""}
      <button class="btn gold" id="nw">+ Yeni ödev</button></div></div>
    ${assignments.length ? `<div class="tbl-wrap"><table class="tbl"><tr><th>Hafta</th><th>Ödev</th><th>Ünite</th><th>Şubeler</th><th>Son gün</th><th class="c">Yapan</th><th class="c">Durum</th><th></th></tr>
      ${assignments.map((a) => { const n = submissions.filter((s) => s.assignmentId === a.id).length; const t = students.filter((s) => forSec(a, s.section)).length; return `<tr>
        <td class="c">${a.week || "–"}</td><td><b>${esc(a.title)}</b><br><span class="small muted">${a.items.length} soru</span></td><td class="small">${a.unit}. ${esc(unitName(a.unit))}</td>
        <td class="small">${a.sections?.length ? a.sections.join(", ") : "Hepsi"}</td><td class="small">${a.dueDate ? fmtDate(a.dueDate) : "–"}</td><td class="c">${n}/${t}</td>
        <td class="c"><button class="btn sm ${a.published ? "" : "ghost"}" data-pub="${a.id}">${a.published ? "Yayında" : "Taslak"}</button></td>
        <td><button class="btn ghost sm" data-pv="${a.id}">👁</button> <button class="btn ghost sm" data-ed="${a.id}">✏️</button> <button class="btn ghost sm" data-cp="${a.id}">⧉</button> <button class="btn ghost sm" data-del="${a.id}">🗑</button></td></tr>`; }).join("")}
    </table></div>` : `<div class="card empty"><div class="big">📝</div><p>Henüz ödev yok. "Yeni ödev" ile başlayın${grade === 5 ? " ya da hazır ödevi yükleyin" : ""}.</p></div>`}
    <p class="small muted">"Taslak" ödevleri öğrenciler görmez. Yayına almak için düğmeye basın.</p>`;
  $("#nw").onclick = () => editor({ grade, unit: settings.currentUnit[grade] || 1, week: (Math.max(0, ...assignments.map((a) => a.week || 0)) + 1), title: "", description: "", sections: [], dueDate: "", attempts: settings.defaultAttempts, items: [], published: false });
  if ($("#seed")) $("#seed").onclick = async () => {
    for (const a of SEED_ASSIGNMENTS) if (!assignments.some((x) => x.title === a.title)) await api.saveAssignment({ ...structuredClone(a), published: false });
    await reload(); vHw(m); toast("Hazır ödev taslak olarak eklendi", "ok");
  };
  $("#imp").onclick = importJson;
  $$("[data-pub]").forEach((b) => b.onclick = async () => { const a = assignments.find((x) => x.id === b.dataset.pub); a.published = !a.published; await api.saveAssignment(a); vHw(m); toast(a.published ? "Ödev yayında" : "Taslağa alındı", "ok"); });
  $$("[data-ed]").forEach((b) => b.onclick = () => editor(structuredClone(assignments.find((x) => x.id === b.dataset.ed))));
  $$("[data-cp]").forEach((b) => b.onclick = () => { const a = structuredClone(assignments.find((x) => x.id === b.dataset.cp)); delete a.id; delete a.createdAt; a.title += " (kopya)"; a.published = false; editor(a); });
  $$("[data-pv]").forEach((b) => b.onclick = () => preview(assignments.find((x) => x.id === b.dataset.pv)));
  $$("[data-del]").forEach((b) => b.onclick = async () => { if (!confirm("Bu ödev silinsin mi? Öğrenci cevapları kalır ama ödev listeden kalkar.")) return; await api.deleteAssignment(b.dataset.del); await reload(); vHw(m); });
}

function importJson() {
  const { el, close } = modal(`<h3>JSON ile ödev ekle</h3><p class="small muted">Claude'un hazırladığı ödev kodunu buraya yapıştırın. Birden fazla ödev de olabilir.</p><textarea id="js" rows="12" style="font-family:monospace;font-size:.8rem"></textarea><div class="err" id="je"></div><button class="btn gold" id="jo">Ekle</button>`);
  el.querySelector("#jo").onclick = async () => {
    try {
      let d = JSON.parse(el.querySelector("#js").value);
      if (!Array.isArray(d)) d = [d];
      for (const a of d) { if (!a.items?.length) throw new Error("Ödevde soru yok"); a.grade = a.grade || grade; a.published = false; delete a.id; await api.saveAssignment(a); }
      close(); await reload(); draw(); toast(`${d.length} ödev taslak olarak eklendi`, "ok");
    } catch (e) { el.querySelector("#je").textContent = "Kod okunamadı: " + e.message; }
  };
}

function preview(a) {
  const { el, close } = modal(`<div id="pvbox"></div>`, { wide: true });
  play(el.querySelector("#pvbox"), a, { onExit: close, onFinish: (ans) => { const r = computeResult(a, Object.fromEntries(ans.map((v, i) => [i, v]))); el.querySelector("#pvbox").innerHTML = `<div class="result"><div class="big">👀</div><h2>Önizleme bitti</h2><p>Puan: <b>${r.percent}</b> (kaydedilmedi)</p><button class="btn gold">Kapat</button></div>`; el.querySelector(".result .btn").onclick = close; } });
}

// Ödev düzenleyici
function editor(a) {
  const m = $("#main");
  const units = settings.units[grade] || [];
  const blank = {
    mcq: { type: "mcq", skill: "V", prompt: "", emoji: "", options: ["", "", "", ""], answer: 0 },
    listen: { type: "listen", skill: "L", audio: "", prompt: "Listen and choose.", options: ["", "", "", ""], answer: 0 },
    tf: { type: "tf", skill: "R", prompt: "", emoji: "", answer: true },
    fill: { type: "fill", skill: "G", prompt: "Choose the correct word.", text: "", options: ["", "", ""], answer: 0 },
    match: { type: "match", skill: "V", prompt: "Match.", pairs: [{ l: "", r: "" }, { l: "", r: "" }, { l: "", r: "" }, { l: "", r: "" }] },
    order: { type: "order", skill: "G", prompt: "Put the words in order.", words: [] },
    write: { type: "write", skill: "W", prompt: "", minWords: 5, points: 3 }
  };
  const itemHtml = (it, i) => {
    const skillSel = `<select data-f="skill">${Object.entries(SKILLS).map(([k, v]) => `<option value="${k}" ${it.skill === k ? "selected" : ""}>${v}</option>`).join("")}</select>`;
    let body = "";
    const opts = () => `<div class="small muted" style="margin:8px 0 4px">Seçenekler (doğru olanı işaretleyin)</div>${it.options.map((o, k) => `<div class="row" style="margin-bottom:6px"><input type="radio" name="ans${i}" data-ans="${k}" ${it.answer === k ? "checked" : ""} style="width:auto;flex:none"><input type="text" data-opt="${k}" value="${esc(o)}"></div>`).join("")}<button class="btn ghost sm" data-addopt>+ seçenek</button>`;
    if (it.type === "mcq") body = `<div class="row"><input type="text" data-f="prompt" placeholder="Soru" value="${esc(it.prompt)}"><input type="text" data-f="emoji" placeholder="Emoji (isteğe bağlı) 📏" value="${esc(it.emoji || "")}" style="max-width:150px"></div>${opts()}`;
    if (it.type === "listen") body = `<input type="text" data-f="audio" placeholder="Seslendirilecek İngilizce cümle" value="${esc(it.audio)}"><input type="text" data-f="prompt" placeholder="Yönerge" value="${esc(it.prompt)}" style="margin-top:6px">${opts()}`;
    if (it.type === "fill") body = `<input type="text" data-f="text" placeholder="Cümle — boşluk için ___ yazın. Örn: Can I ___ out?" value="${esc(it.text)}">${opts()}`;
    if (it.type === "tf") body = `<div class="row"><input type="text" data-f="prompt" placeholder="İfade" value="${esc(it.prompt)}"><input type="text" data-f="emoji" placeholder="Emoji" value="${esc(it.emoji || "")}" style="max-width:120px"><select data-f="answer" style="max-width:140px"><option value="true" ${it.answer ? "selected" : ""}>Doğru (True)</option><option value="false" ${!it.answer ? "selected" : ""}>Yanlış (False)</option></select></div>`;
    if (it.type === "match") body = `<input type="text" data-f="prompt" value="${esc(it.prompt)}">${it.pairs.map((p, k) => `<div class="row" style="margin-top:6px"><input type="text" data-pl="${k}" placeholder="Sol (kelime)" value="${esc(p.l)}"><span>↔</span><input type="text" data-pr="${k}" placeholder="Sağ (resim/anlam)" value="${esc(p.r)}"></div>`).join("")}<button class="btn ghost sm" data-addpair style="margin-top:6px">+ çift</button>`;
    if (it.type === "order") body = `<input type="text" data-f="prompt" value="${esc(it.prompt)}"><input type="text" data-words placeholder="Doğru cümle (kelimeler karışık gösterilir)" value="${esc((it.words || []).join(" "))}" style="margin-top:6px">`;
    if (it.type === "write") body = `<input type="text" data-f="prompt" placeholder="Yazma görevi" value="${esc(it.prompt)}"><div class="row" style="margin-top:6px"><label class="small" style="margin:0">En az kelime</label><input type="number" data-f="minWords" value="${it.minWords || 1}" style="max-width:90px"><label class="small" style="margin:0">Puan</label><input type="number" data-f="points" value="${it.points || 3}" style="max-width:90px"></div>`;
    return `<div class="item-ed" data-i="${i}"><div class="row between" style="margin-bottom:8px"><span><span class="tag">${i + 1}</span> <b>${ITEM_TYPES[it.type]}</b></span>
      <span class="row" style="gap:6px">${skillSel}<button class="btn ghost sm" data-up>↑</button><button class="btn ghost sm" data-dn>↓</button><button class="btn ghost sm" data-rm>🗑</button></span></div>${body}</div>`;
  };
  const render = () => {
    m.innerHTML = `<div class="row between"><h2>${a.id ? "Ödevi düzenle" : "Yeni ödev"}</h2><div class="row"><button class="btn ghost" id="cn">Vazgeç</button><button class="btn ghost" id="pv">👁 Önizle</button><button class="btn gold" id="sv">Kaydet</button></div></div>
    <div class="card stack">
      <div class="row"><div style="flex:3;min-width:220px"><label>Başlık</label><input type="text" id="t" value="${esc(a.title)}" placeholder="Örn. Classroom Life — Word Practice"></div>
      <div style="flex:1;min-width:100px"><label>Hafta</label><input type="number" id="w" value="${a.week || ""}"></div></div>
      <div class="row"><div style="flex:2;min-width:200px"><label>Ünite</label><select id="u">${units.map((n, k) => `<option value="${k + 1}" ${a.unit === k + 1 ? "selected" : ""}>${k + 1}. ${esc(n)}</option>`).join("")}</select></div>
      <div style="flex:1;min-width:150px"><label>Son gün</label><input type="date" id="d" value="${a.dueDate || ""}"></div>
      <div style="flex:1;min-width:110px"><label>Çözme hakkı</label><input type="number" id="at" min="1" max="9" value="${a.attempts || 1}"></div></div>
      <div><label>Şubeler <span class="muted small">(hiçbiri seçili değilse hepsi)</span></label><div class="row">${sections().map((s) => `<label class="badge" style="margin:0;cursor:pointer"><input type="checkbox" data-sec="${s}" ${a.sections?.includes(s) ? "checked" : ""} style="width:auto"> ${grade}-${s}</label>`).join("")}</div></div>
      <div><label>Açıklama</label><input type="text" id="ds" value="${esc(a.description || "")}"></div>
    </div>
    <h3 style="margin-top:22px">Sorular (${a.items.length})</h3>
    <div id="items">${a.items.map(itemHtml).join("")}</div>
    <div class="card" style="margin-top:14px"><b>Soru ekle:</b><div class="row" style="margin-top:8px">${Object.entries(ITEM_TYPES).map(([k, v]) => `<button class="btn ghost sm" data-add="${k}">+ ${v}</button>`).join("")}</div></div>`;
    $("#cn").onclick = () => draw();
    $("#pv").onclick = () => { collect(); preview(a); };
    $("#sv").onclick = save;
    $$("[data-add]").forEach((b) => b.onclick = () => { collect(); a.items.push(structuredClone(blank[b.dataset.add])); render(); $("#items").lastElementChild?.scrollIntoView({ behavior: "smooth" }); });
    $$(".item-ed").forEach((box) => {
      const i = Number(box.dataset.i);
      box.querySelector("[data-up]").onclick = () => { collect(); if (i > 0) [a.items[i - 1], a.items[i]] = [a.items[i], a.items[i - 1]]; render(); };
      box.querySelector("[data-dn]").onclick = () => { collect(); if (i < a.items.length - 1) [a.items[i + 1], a.items[i]] = [a.items[i], a.items[i + 1]]; render(); };
      box.querySelector("[data-rm]").onclick = () => { collect(); a.items.splice(i, 1); render(); };
      const ao = box.querySelector("[data-addopt]"); if (ao) ao.onclick = () => { collect(); a.items[i].options.push(""); render(); };
      const ap = box.querySelector("[data-addpair]"); if (ap) ap.onclick = () => { collect(); a.items[i].pairs.push({ l: "", r: "" }); render(); };
    });
  };
  const collect = () => {
    a.title = $("#t").value.trim(); a.week = Number($("#w").value) || 0; a.unit = Number($("#u").value); a.dueDate = $("#d").value;
    a.attempts = Math.max(1, Number($("#at").value) || 1); a.description = $("#ds").value.trim();
    a.sections = $$("[data-sec]").filter((c) => c.checked).map((c) => c.dataset.sec);
    $$(".item-ed").forEach((box) => {
      const it = a.items[Number(box.dataset.i)];
      box.querySelectorAll("[data-f]").forEach((f) => { const k = f.dataset.f; let v = f.value; if (k === "answer") v = v === "true"; if (k === "minWords" || k === "points") v = Number(v) || 1; it[k] = v; });
      if (it.options) { it.options = [...box.querySelectorAll("[data-opt]")].map((x) => x.value); const r = box.querySelector("[data-ans]:checked"); it.answer = r ? Number(r.dataset.ans) : 0; }
      if (it.pairs) it.pairs = [...box.querySelectorAll("[data-pl]")].map((x, k) => ({ l: x.value, r: box.querySelector(`[data-pr="${k}"]`).value }));
      const w = box.querySelector("[data-words]"); if (w) it.words = w.value.trim().split(/\s+/).filter(Boolean);
      if (!it.emoji) delete it.emoji;
    });
  };
  const save = async () => {
    collect();
    if (!a.title) return toast("Başlık yazın", "bad");
    if (!a.items.length) return toast("En az bir soru ekleyin", "bad");
    a.items.forEach((it) => { if (it.options) it.options = it.options.filter((o, k) => o.trim() || k === it.answer); if (it.pairs) it.pairs = it.pairs.filter((p) => p.l.trim() && p.r.trim()); });
    $("#sv").disabled = true;
    try { await api.saveAssignment(a); await reload(); view = "hw"; draw(); toast("Ödev kaydedildi", "ok"); }
    catch (e) { toast(friendlyError(e), "bad"); $("#sv").disabled = false; }
  };
  render();
}

// ---------------------------------------------------------------- Sonuçlar
function vRes(m) {
  const as = assignments.filter((a) => a.published).slice().reverse();
  const studs = visStudents();
  m.innerHTML = `<div class="row between"><h2>Sonuçlar</h2><div class="row">${secSelect()}<button class="btn ghost sm" id="csv">⬇ Excel (CSV)</button></div></div>
    <p class="small muted">Hücreye tıklayarak öğrencinin cevaplarını görebilir, yazma sorularını puanlayabilirsiniz. ✍️ = puanlanmayı bekleyen yazma.</p>
    ${!as.length || !studs.length ? `<div class="card empty"><p>Gösterilecek sonuç yok.</p></div>` : `<div class="tbl-wrap"><table class="tbl"><tr><th>Şube</th><th>No</th><th>Ad Soyad</th>${as.map((a) => `<th class="c" title="${esc(a.title)}">${a.week ? a.week + ". hf" : ""}<br><span class="small">${esc(a.title.slice(0, 18))}</span></th>`).join("")}<th class="c">Ort.</th></tr>
    ${studs.map((s) => { const ps = []; return `<tr><td>${s.section}</td><td>${s.no}</td><td>${esc(s.name)}</td>${as.map((a) => { if (!forSec(a, s.section)) return `<td class="c muted">·</td>`; const x = subOf(a.id, s.uid); if (!x) return `<td class="c"><span class="muted">–</span></td>`; ps.push(best(x)); return `<td class="c"><span class="cell-score score ${pctClass(best(x))}" data-sub="${a.id}|${s.uid}">${best(x)}${x.writeTotal && !x.writingGraded ? " ✍️" : ""}</span></td>`; }).join("")}<td class="c"><b>${avg(ps) ?? "–"}</b></td></tr>`; }).join("")}
    <tr><td colspan="3"><b>Ortalama</b></td>${as.map((a) => { const v = avg(studs.map((s) => subOf(a.id, s.uid)).filter(Boolean).map(best)); return `<td class="c"><b>${v ?? "–"}</b></td>`; }).join("")}<td></td></tr></table></div>`}`;
  bindSec(() => vRes(m));
  $$("[data-sub]").forEach((c) => c.onclick = () => { const [aid, uid] = c.dataset.sub.split("|"); subModal(aid, uid); });
  $("#csv").onclick = () => {
    const rows = [["Şube", "No", "Ad Soyad", ...as.map((a) => a.title), "Ortalama"]];
    studs.forEach((s) => { const ps = as.map((a) => best(subOf(a.id, s.uid))); rows.push([`${grade}-${s.section}`, s.no, s.name, ...ps.map((p) => p ?? ""), avg(ps.filter((p) => p != null)) ?? ""]); });
    download(`sonuclar-${grade}${secFilter}.csv`, rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n"));
  };
}

function subModal(aid, uid) {
  const a = assignments.find((x) => x.id === aid), s = students.find((x) => x.uid === uid), sub = subOf(aid, uid);
  const wp = { ...(sub.writingPoints || {}) };
  const { el, close } = modal(`<h3>${esc(s.name)} · ${esc(a.title)}</h3>
    <p class="small muted">${sub.attempts} deneme · en iyi ${best(sub)} · son ${sub.percent} · ${new Date(sub.submittedAt).toLocaleString("tr-TR")}</p>
    ${a.items.map((it, i) => { const c = sub.correct?.[i]; return `<div class="item-ed"><div class="row between"><b class="small">${i + 1}. ${esc(itemSummary(it))}</b><span>${it.type === "write" ? "✍️" : c === 1 ? "✅" : c > 0 ? "🟡" : "❌"}</span></div>
      <p class="small" style="margin:4px 0 0">Cevap: <b>${esc(answerText(it, sub.answers?.[i]))}</b></p>
      ${it.type === "write" ? `<div class="row" style="margin-top:6px"><label class="small" style="margin:0">Puan (0–${itemPoints(it)})</label><input type="number" min="0" max="${itemPoints(it)}" data-wp="${i}" value="${wp[i] ?? ""}" style="max-width:90px"></div>` : c !== 1 ? `<p class="small" style="margin:2px 0 0;color:var(--green)">Doğrusu: ${esc(correctText(it))}</p>` : ""}</div>`; }).join("")}
    ${a.items.some((it) => it.type === "write") ? `<button class="btn gold" id="swp" style="margin-top:12px">Yazma puanını kaydet</button>` : ""}`, { wide: true });
  const b = el.querySelector("#swp");
  if (b) b.onclick = async () => {
    el.querySelectorAll("[data-wp]").forEach((x) => { if (x.value !== "") wp[x.dataset.wp] = Math.min(Number(x.max), Math.max(0, Number(x.value))); });
    const r = computeResult(a, sub.answers || {}, wp);
    const patch = { writingPoints: wp, writingGraded: r.writingGraded, percent: r.percent, best: r.percent };
    try { await api.saveSubmission({ ...sub, ...patch }); Object.assign(sub, patch); close(); vRes($("#main")); toast("Puan kaydedildi", "ok"); }
    catch (e) { toast(friendlyError(e), "bad"); }
  };
}

// ---------------------------------------------------------------- Geri bildirim
function vFb(m) {
  const weeks = [...new Set(assignments.map((a) => a.week).filter(Boolean))].sort((x, y) => y - x);
  let week = Number(m.dataset.week) || weeks[0] || 1;
  const studs = visStudents();
  const wAs = assignments.filter((a) => a.week === week && a.published);
  m.innerHTML = `<div class="row between"><h2>Haftalık geri bildirim</h2><div class="row">${secSelect()}
      <select id="wk" style="width:auto">${[...new Set([...weeks, week])].sort((x, y) => y - x).map((w) => `<option value="${w}" ${w === week ? "selected" : ""}>${w}. hafta</option>`).join("")}<option value="new">+ başka hafta</option></select>
      <button class="btn ghost sm" id="auto">✨ Boşları otomatik doldur</button><button class="btn ghost sm" id="prt">🖨 Kartları yazdır</button><button class="btn gold" id="sall">Hepsini kaydet</button></div></div>
    <p class="small muted">Öğrenciler yazdıklarınızı kendi sayfalarındaki "Geri bildirimler" bölümünde görür. Hızlı yorum için çiplere dokunun.</p>
    <div class="stack">${studs.map((s) => {
      const f = feedback.find((x) => x.uid === s.uid && x.week === week) || {};
      const sc = wAs.filter((a) => forSec(a, s.section)).map((a) => { const x = subOf(a.id, s.uid); return x ? `<span class="badge ${pctClass(best(x))}">${best(x)}</span>` : `<span class="badge late">yapmadı</span>`; }).join(" ");
      return `<div class="card" data-fu="${s.uid}" style="padding:16px"><div class="row between"><b>${s.section}·${s.no} ${esc(s.name)}</b><span>${sc || '<span class="muted small">bu hafta ödev yok</span>'}</span></div>
        <div class="row" style="margin-top:8px"><span class="stars" style="font-size:1.5rem;cursor:pointer" data-stars="${f.stars || 0}">${[1, 2, 3, 4, 5].map((k) => `<span data-k="${k}">${k <= (f.stars || 0) ? "★" : "☆"}</span>`).join("")}</span>
        <input type="text" data-n placeholder="Öğretmen notu" value="${esc(f.note || "")}" style="flex:3;min-width:220px"></div>
        <div class="row" style="margin-top:6px"><input type="text" data-s placeholder="💪 Güçlü yanı" value="${esc(f.strength || "")}" style="flex:1;min-width:160px"><input type="text" data-w placeholder="🎯 Çalışması gereken" value="${esc(f.work || "")}" style="flex:1;min-width:160px"></div>
        <div class="row" style="margin-top:6px;gap:4px">${COMMENT_TEMPLATES.map((t, k) => `<button class="btn ghost sm" data-tpl="${k}" style="font-size:.75rem;padding:3px 8px">${esc(t.slice(0, 28))}…</button>`).join("")}</div></div>`;
    }).join("") || `<div class="card empty"><p>Öğrenci yok.</p></div>`}</div>`;
  bindSec(() => vFb(m));
  $("#wk").onchange = (e) => { let v = e.target.value; if (v === "new") v = prompt("Hafta numarası?", String(week + 1)); if (v) { m.dataset.week = v; vFb(m); } };
  $$("[data-stars]").forEach((st) => st.querySelectorAll("[data-k]").forEach((x) => x.onclick = () => { const k = Number(x.dataset.k); st.dataset.stars = st.dataset.stars == k ? 0 : k; st.querySelectorAll("[data-k]").forEach((y) => (y.textContent = Number(y.dataset.k) <= Number(st.dataset.stars) ? "★" : "☆")); }));
  $$("[data-tpl]").forEach((b) => b.onclick = () => { const inp = b.closest("[data-fu]").querySelector("[data-n]"); const t = COMMENT_TEMPLATES[b.dataset.tpl]; inp.value = inp.value ? inp.value + " " + t : t; });
  $("#auto").onclick = () => {
    $$("[data-fu]").forEach((box) => {
      const s = students.find((x) => x.uid === box.dataset.fu);
      const ps = wAs.filter((a) => forSec(a, s.section)).map((a) => best(subOf(a.id, s.uid)));
      const done = ps.filter((p) => p != null); const p = avg(done);
      const stars = box.querySelector("[data-stars]");
      if (!box.querySelector("[data-n]").value) box.querySelector("[data-n]").value = !ps.length ? "" : !done.length ? COMMENT_TEMPLATES[5] : p >= 85 ? COMMENT_TEMPLATES[0] : p >= 60 ? "Güzel bir hafta! Yanlış yaptığın soruları bir kez daha incele." : COMMENT_TEMPLATES[2];
      if (Number(stars.dataset.stars) === 0 && ps.length) { const k = !done.length ? 1 : p >= 90 ? 5 : p >= 75 ? 4 : p >= 60 ? 3 : 2; stars.dataset.stars = k; stars.querySelectorAll("[data-k]").forEach((y) => (y.textContent = Number(y.dataset.k) <= k ? "★" : "☆")); }
    });
    toast("Boş olanlar dolduruldu, kontrol edip kaydedin");
  };
  $("#sall").onclick = async () => {
    $("#sall").disabled = true; let n = 0;
    try {
      for (const box of $$("[data-fu]")) {
        const s = students.find((x) => x.uid === box.dataset.fu);
        const f = { uid: s.uid, grade, section: s.section, week, stars: Number(box.querySelector("[data-stars]").dataset.stars) || 0, note: box.querySelector("[data-n]").value.trim(), strength: box.querySelector("[data-s]").value.trim(), work: box.querySelector("[data-w]").value.trim() };
        const old = feedback.find((x) => x.uid === s.uid && x.week === week);
        if (!f.stars && !f.note && !f.strength && !f.work && !old) continue;
        if (old && old.stars === f.stars && old.note === f.note && old.strength === f.strength && old.work === f.work) continue;
        await api.saveFeedback(f); n++;
      }
      feedback = await api.listFeedback(grade); toast(`${n} geri bildirim kaydedildi`, "ok");
    } catch (e) { toast(friendlyError(e), "bad"); }
    $("#sall").disabled = false;
  };
  $("#prt").onclick = () => printCards(week, studs, wAs);
}
function printCards(week, studs, wAs) {
  const html = studs.map((s) => {
    const f = feedback.find((x) => x.uid === s.uid && x.week === week) || {};
    const ps = wAs.filter((a) => forSec(a, s.section)).map((a) => `${esc(a.title)}: <b>${best(subOf(a.id, s.uid)) ?? "yapılmadı"}</b>`).join("<br>");
    return `<div class="pincard" style="border-style:solid;border-color:var(--gold)"><b>${esc(s.name)}</b> · ${grade}-${s.section} · ${week}. hafta<br><span class="stars">${"★".repeat(f.stars || 0)}${"☆".repeat(5 - (f.stars || 0))}</span><br><span class="small">${ps}</span>${f.note ? `<p style="margin:6px 0 0">${esc(f.note)}</p>` : ""}${f.work ? `<p class="small" style="margin:4px 0 0">🎯 ${esc(f.work)}</p>` : ""}<p class="small muted" style="margin:6px 0 0">— ${SITE.teacher}</p></div>`;
  }).join("");
  const { close } = modal(`<div class="noprint row between"><h3>Geri bildirim kartları</h3><button class="btn gold" id="pp">Yazdır</button></div><div class="pincards" style="grid-template-columns:repeat(2,1fr)">${html}</div>`, { wide: true });
  $("#pp").onclick = () => { document.body.classList.add("printing"); window.print(); document.body.classList.remove("printing"); };
  void close;
}

// ---------------------------------------------------------------- Not defteri
function vGb(m) {
  const studs = visStudents();
  const cols = settings.gradeColumns || [];
  const pub = assignments.filter((a) => a.published);
  m.innerHTML = `<div class="row between"><h2>Not defteri</h2><div class="row">${secSelect()}<button class="btn ghost sm" id="csv">⬇ Excel (CSV)</button></div></div>
    <p class="small muted">Notları yazıp başka kutuya geçtiğinizde otomatik kaydedilir. Öğrenci kendi notlarını görür. Sütun adlarını Ayarlar'dan değiştirebilirsiniz.</p>
    <div class="tbl-wrap"><table class="tbl"><tr><th>Şube</th><th>No</th><th>Ad Soyad</th><th class="c">Yapılan ödev</th><th class="c">Ödev ort.</th>${cols.map((c) => `<th class="c">${esc(c)}</th>`).join("")}</tr>
    ${studs.map((s) => { const mine = pub.filter((a) => forSec(a, s.section)); const ps = mine.map((a) => best(subOf(a.id, s.uid))).filter((p) => p != null); return `<tr><td>${s.section}</td><td>${s.no}</td><td>${esc(s.name)}</td><td class="c">${ps.length}/${mine.length}</td><td class="c"><b>${avg(ps) ?? "–"}</b></td>${cols.map((c) => `<td class="c"><input type="number" min="0" max="100" data-sc="${s.uid}" data-col="${esc(c)}" value="${s.scores?.[c] ?? ""}"></td>`).join("")}</tr>`; }).join("")}</table></div>`;
  bindSec(() => vGb(m));
  $$("[data-sc]").forEach((inp) => inp.onchange = async () => {
    const s = students.find((x) => x.uid === inp.dataset.sc); const v = inp.value === "" ? null : Number(inp.value);
    try { await api.saveScore(s.uid, inp.dataset.col, v); s.scores = { ...(s.scores || {}), [inp.dataset.col]: v }; inp.style.background = "var(--green-soft)"; }
    catch (e) { toast(friendlyError(e), "bad"); inp.style.background = "var(--red-soft)"; }
  });
  $("#csv").onclick = () => {
    const rows = [["Şube", "No", "Ad Soyad", "Ödev ortalaması", ...cols]];
    studs.forEach((s) => { const ps = pub.filter((a) => forSec(a, s.section)).map((a) => best(subOf(a.id, s.uid))).filter((p) => p != null); rows.push([`${grade}-${s.section}`, s.no, s.name, avg(ps) ?? "", ...cols.map((c) => s.scores?.[c] ?? "")]); });
    download(`not-defteri-${grade}${secFilter}.csv`, rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n"));
  };
}

// ---------------------------------------------------------------- Öğrenciler
function vSt(m) {
  const studs = visStudents();
  m.innerHTML = `<div class="row between"><h2>${grade}. sınıf öğrencileri (${studs.length})</h2><div class="row">${secSelect()}<button class="btn ghost sm" id="cards">🖨 Şifre kartları</button><button class="btn gold" id="add">+ Toplu öğrenci ekle</button></div></div>
    ${studs.length ? `<div class="tbl-wrap"><table class="tbl"><tr><th>Şube</th><th>No</th><th>Ad Soyad</th><th class="c">Şifre</th><th></th></tr>
    ${studs.map((s) => `<tr><td>${s.section}</td><td>${s.no}</td><td>${esc(s.name)}</td><td class="c"><code>${s.pin}</code></td><td><button class="btn ghost sm" data-rp="${s.uid}">Şifre yenile</button> <button class="btn ghost sm" data-rn="${s.uid}">✏️</button> <button class="btn ghost sm" data-rm="${s.uid}">🗑</button></td></tr>`).join("")}</table></div>` : `<div class="card empty"><div class="big">👥</div><p>Bu sınıf düzeyinde öğrenci yok. "Toplu öğrenci ekle" ile e-Okul listesinden yapıştırabilirsiniz.</p></div>`}`;
  bindSec(() => vSt(m));
  $("#add").onclick = addStudents;
  $("#cards").onclick = () => {
    const { el } = modal(`<div class="noprint row between"><h3>Şifre kartları ${secFilter ? grade + "-" + secFilter : ""}</h3><button class="btn gold" id="pp">Yazdır</button></div>
      <p class="noprint small muted">Keserek öğrencilere dağıtın.</p><div class="pincards">${studs.map((s) => `<div class="pincard"><b>${SITE.name}</b><br>${esc(s.name)}<br>Sınıf: <b>${grade}-${s.section}</b> · No: <b>${s.no}</b><br>Şifre: <span class="pin">${s.pin}</span><br><span class="small">Adres: ${esc(location.origin + location.pathname.replace(/ogretmen\.html$/, ""))}</span></div>`).join("")}</div>`, { wide: true });
    el.querySelector("#pp").onclick = () => { document.body.classList.add("printing"); window.print(); document.body.classList.remove("printing"); };
  };
  $$("[data-rp]").forEach((b) => b.onclick = async () => {
    const s = students.find((x) => x.uid === b.dataset.rp); if (!confirm(`${s.name} için yeni şifre oluşturulsun mu?`)) return;
    try { s.pin = await api.resetPin(s); vSt(m); toast(`Yeni şifre: ${s.pin}`, "ok"); } catch (e) { toast(friendlyError(e), "bad"); }
  });
  $$("[data-rn]").forEach((b) => b.onclick = async () => {
    const s = students.find((x) => x.uid === b.dataset.rn); const n = prompt("Ad soyad", s.name); if (!n) return;
    await api.updateStudent(s.uid, { name: n.trim() }); s.name = n.trim(); vSt(m);
  });
  $$("[data-rm]").forEach((b) => b.onclick = async () => {
    const s = students.find((x) => x.uid === b.dataset.rm); if (!confirm(`${s.name} silinsin mi? Öğrenci artık giriş yapamaz.`)) return;
    try { await api.removeStudent(s); await reload(); vSt(m); } catch (e) { toast(friendlyError(e), "bad"); }
  });
}
function addStudents() {
  const { el, close } = modal(`<h3>Toplu öğrenci ekle</h3>
    <div class="field"><label>Şube</label><select id="as">${sections().map((s) => `<option ${s === secFilter ? "selected" : ""}>${s}</option>`).join("")}</select></div>
    <div class="field"><label>Liste</label><textarea id="al" rows="10" placeholder="Her satıra: numara ad soyad&#10;245 Ali Yılmaz&#10;312 Ayşe Demir&#10;&#10;e-Okul Excel'inden numara ve ad sütunlarını kopyalayıp yapıştırabilirsiniz."></textarea></div>
    <p class="small muted">Her öğrenciye otomatik 4 haneli şifre verilir. Firebase bir saatte en fazla ~100 hesap açmaya izin verir; liste uzunsa kalanları 1 saat sonra aynı listeyle tekrar ekleyin (eklenmiş olanlar atlanır).</p>
    <div class="err" id="ae"></div><div id="ap" class="small"></div><button class="btn gold" id="ao">Ekle</button>`);
  el.querySelector("#ao").onclick = async () => {
    const section = el.querySelector("#as").value;
    const list = el.querySelector("#al").value.split(/\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
      const parts = l.split(/\t|\s{2,}|;|,/).map((x) => x.trim()).filter(Boolean);
      let no = null, name = [];
      (parts.length > 1 ? parts : l.split(/\s+/)).forEach((p) => { if (no == null && /^\d{1,6}$/.test(p)) no = p; else if (!/^\d+$/.test(p) && !/^\d+\s*[\/-]?\s*[A-ZÇĞİÖŞÜ]$/i.test(p)) name.push(p); });
      return no && name.length ? { grade, section, no, name: name.join(" ").replace(/\s+/g, " ") } : null;
    });
    const bad = list.filter((x) => !x).length; const ok = list.filter(Boolean);
    if (!ok.length) { el.querySelector("#ae").textContent = "Satırlar okunamadı. Her satırda numara ve ad olmalı."; return; }
    el.querySelector("#ao").disabled = true;
    const r = await api.addStudents(ok, (i, n) => (el.querySelector("#ap").textContent = `Ekleniyor… ${i}/${n}`));
    el.querySelector("#ap").innerHTML = `✅ ${r.added.length} eklendi · ${r.skipped.length} zaten vardı${bad ? ` · ${bad} satır okunamadı` : ""}${r.failed.length ? `<br>⚠️ ${r.failed.length} eklenemedi${r.stoppedForLimit ? " (saatlik limit doldu; 1 saat sonra aynı listeyle tekrar deneyin)" : ""}: ${r.failed.slice(0, 5).map((f) => esc(f.no + " " + f.name + " – " + f.reason)).join("; ")}` : ""}`;
    await reload(); secFilter = section; vSt($("#main"));
    el.querySelector("#ao").textContent = "Kapat"; el.querySelector("#ao").disabled = false; el.querySelector("#ao").onclick = close;
  };
}

// ---------------------------------------------------------------- Ayarlar
function vSet(m) {
  m.innerHTML = `<h2>Ayarlar</h2><div class="grid g2">
    <div class="card stack"><h3>Açık sınıf düzeyleri</h3><p class="small muted">Öğrenciler sadece açık düzeylerle giriş yapabilir.</p>
      <div class="row">${[5, 6, 7, 8].map((g) => `<label class="badge" style="margin:0;cursor:pointer;font-size:.95rem"><input type="checkbox" data-ag="${g}" ${settings.activeGrades.includes(g) ? "checked" : ""} style="width:auto"> ${g}. sınıf</label>`).join("")}</div>
      <h3>Şubeler</h3>${[5, 6, 7, 8].map((g) => `<div class="row"><b style="width:70px">${g}. sınıf</b><input type="text" data-secs="${g}" value="${(settings.sections[g] || []).join(", ")}" style="flex:1"></div>`).join("")}
      <h3>Not defteri sütunları</h3><input type="text" id="gc" value="${esc((settings.gradeColumns || []).join(", "))}">
      <div class="row"><label style="margin:0">Varsayılan çözme hakkı</label><input type="number" id="da" min="1" max="9" value="${settings.defaultAttempts}" style="max-width:90px"></div></div>
    <div class="card stack"><h3>${grade}. sınıf üniteleri</h3><p class="small muted">Her satır bir ünite. Şu anki ünite yeni ödevlerde varsayılan olarak seçilir.</p>
      <textarea id="un" rows="9">${esc((settings.units[grade] || []).join("\n"))}</textarea>
      <div class="row"><label style="margin:0">Şu anki ünite</label><input type="number" id="cu" min="1" value="${settings.currentUnit[grade] || 1}" style="max-width:90px"></div></div>
  </div><div class="row" style="margin-top:16px"><button class="btn gold" id="ss">Ayarları kaydet</button>${isDemo ? `<button class="btn danger" id="rd">Deneme verilerini sıfırla</button>` : ""}</div>`;
  $("#ss").onclick = async () => {
    const s = structuredClone(settings);
    s.activeGrades = $$("[data-ag]").filter((c) => c.checked).map((c) => Number(c.dataset.ag));
    if (!s.activeGrades.length) return toast("En az bir sınıf düzeyi açık olmalı", "bad");
    $$("[data-secs]").forEach((i) => (s.sections[i.dataset.secs] = i.value.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean)));
    s.gradeColumns = $("#gc").value.split(",").map((x) => x.trim().replace(/\./g, "")).filter(Boolean);
    s.defaultAttempts = Math.max(1, Number($("#da").value) || 1);
    s.units[grade] = $("#un").value.split("\n").map((x) => x.trim()).filter(Boolean);
    s.currentUnit[grade] = Number($("#cu").value) || 1;
    try { await api.saveSettings(s); settings = s; shell(); view = "set"; draw(); toast("Ayarlar kaydedildi", "ok"); } catch (e) { toast(friendlyError(e), "bad"); }
  };
  if ($("#rd")) $("#rd").onclick = async () => { if (confirm("Tüm deneme verileri silinsin mi?")) { await api.resetDemo(); location.reload(); } };
}
