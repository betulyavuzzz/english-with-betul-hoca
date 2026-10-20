import { api, isDemo, friendlyError } from "./api.js?v=7";
import { SITE } from "./config.js?v=7";
import { SKILLS } from "./defaults.js?v=7";
import { $, $$, esc, toast, fmtDate, pctClass } from "./ui.js?v=7";
import { play, computeResult, itemSummary, answerText, correctText } from "./player.js?v=7";
import { AV_BASES, AV_BGS, AV_ACCS, avatarHtml, defaultAvatar, computeXP, LEVELS, dayKey } from "./game.js?v=7";
import { wordsHome } from "./words.js?v=7";

const app = $("#app");
let settings = null;
let me = null;
let profile = null;
let assignments = [], subs = {}, feedback = [], points = [], classStats = [], wordsets = [], practice = null, stars = null;
let tab = "hw";

if (isDemo) $("#demoBand").classList.remove("hidden");
$("#logout").onclick = async () => { await api.logout(); };

settings = await api.getSettings();
api.onAuth(async (s) => {
  if (s.role === "student") {
    me = s.student;
    app.innerHTML = `<p class="center muted" style="padding:60px">Yükleniyor…</p>`;
    await loadMine();
    if (!profile) avatarBuilder(true); else showHome();
  } else if (s.role === "teacher") location.href = "ogretmen.html";
  else { me = null; showLogin(s.orphan); }
});

// ---------------------------------------------------------------- Giriş
function showLogin(orphan) {
  $("#who").classList.add("hidden"); $("#logout").classList.add("hidden");
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem("ewbh-last") || "{}"); } catch {}
  let grade = saved.grade && settings.activeGrades.includes(saved.grade) ? saved.grade : settings.activeGrades[0];
  app.className = "wrap narrow";
  const floaters = ["🦊", "📚", "⭐", "🐼", "✏️", "🎧", "🦄", "🏆"];
  app.innerHTML = `
    <div class="floaters" aria-hidden="true">${floaters.map((f, i) => `<span style="left:${(i * 13 + 4) % 96}%;animation-delay:${i * 0.7}s">${f}</span>`).join("")}</div>
    <div class="hero"><div class="hero-av">${saved.av ? avatarHtml(saved.av, 84) : `<span class="wave">👋</span>`}</div><h1>${saved.name ? `Welcome back, <span>${esc(saved.name)}</span>!` : `Hello, <span>friend</span>!`}</h1><p>Ödevlerine ulaşmak için giriş yap.</p></div>
    <form class="card login-card" id="lf" autocomplete="off">
      <label>Sınıfın</label>
      <div class="grade-pick">${[5, 6, 7, 8].map((g) => {
        const on = settings.activeGrades.includes(g);
        return `<button type="button" class="grade-btn g${g}" data-g="${g}" ${on ? "" : "disabled"}>${g}<small>${on ? "sınıf" : "yakında"}</small></button>`;
      }).join("")}</div>
      <div class="row" style="gap:12px">
        <div class="field" style="flex:1"><label for="sec">Şuben</label><select id="sec"></select></div>
        <div class="field" style="flex:1.3"><label for="no">Okul numaran</label><input id="no" type="tel" inputmode="numeric" maxlength="6" placeholder="Örn. 245" value="${esc(saved.no || "")}"></div>
      </div>
      <div class="field"><label for="pin">Şifren (4 rakam)</label><input id="pin" class="pin-input" type="password" inputmode="numeric" maxlength="4" placeholder="••••"></div>
      <div class="err" id="lerr">${orphan ? "Hesabın bulunamadı, öğretmenine haber ver." : ""}</div>
      <button class="btn gold lg block" id="lbtn">Let's go! 🚀</button>
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
      try { localStorage.setItem("ewbh-last", JSON.stringify({ ...saved, grade, section, no })); } catch {}
    } catch (err) {
      $("#lerr").textContent = friendlyError(err);
      $("#lbtn").disabled = false; $("#lbtn").textContent = "Let's go! 🚀";
    }
  };
}

// ---------------------------------------------------------------- Veri
async function loadMine() {
  const [as, ss, fb, pts, prof, cs, ws, pr, st] = await Promise.all([
    api.listAssignments(me.grade, { publishedOnly: true }),
    api.mySubmissions(me.uid),
    api.myFeedback(me.uid),
    api.myPoints(me.uid).catch(() => []),
    api.getProfile(me.uid).catch(() => null),
    api.listClassStats(me.grade).catch(() => []),
    api.listWordsets(me.grade, { publishedOnly: true }).catch(() => []),
    api.getPractice(me.uid).catch(() => null),
    api.getStars(me.grade, me.section).catch(() => null)
  ]);
  wordsets = ws; practice = pr; stars = st;
  if (stars?.list?.slice(0, 3).some((x) => x.uid === me.uid) && prof && !prof.wasStar) { prof.wasStar = true; api.saveProfile(prof).catch(() => {}); }
  assignments = as.filter((a) => !a.sections?.length || a.sections.includes(me.section));
  subs = Object.fromEntries(ss.map((s) => [s.assignmentId, s]));
  feedback = fb.sort((a, b) => b.week - a.week);
  points = pts.sort((a, b) => b.at - a.at);
  profile = prof;
  classStats = cs;
  rememberMe();
}
function rememberMe() {
  try {
    const s = JSON.parse(localStorage.getItem("ewbh-last") || "{}");
    localStorage.setItem("ewbh-last", JSON.stringify({ ...s, name: me.name.split(" ")[0], av: profile?.avatar }));
  } catch {}
}
const xpNow = () => computeXP({ subs: Object.values(subs), points, feedback, practice });
const today = () => new Date().toISOString().slice(0, 10);
const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);
const scoreOf = (s) => s.best ?? s.percent;
function status(a) {
  const s = subs[a.id];
  if (s) return { done: true, s };
  if (a.dueDate && a.dueDate < today()) return { late: true };
  return { open: true };
}

function badgesFor() {
  const done = Object.values(subs);
  const pcts = done.map(scoreOf);
  const plus = points.filter((p) => p.delta > 0).length;
  const listenAll = done.some((s) => { const a = assignments.find((x) => x.id === s.assignmentId); return a && a.items.some((it) => it.type === "listen") && a.items.every((it, i) => it.type !== "listen" || s.correct?.[i] === 1); });
  const onTime = done.filter((s) => { const a = assignments.find((x) => x.id === s.assignmentId); return a && (!a.dueDate || new Date(s.submittedAt).toISOString().slice(0, 10) <= a.dueDate); }).length;
  const lv = xpNow().level;
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
    { e: "🃏", n: "Kelime Avcısı", d: "10 kelime oyunu oyna", on: (practice?.games || 0) >= 10, c: "#f3722c" },
    { e: "🌟", n: "Haftanın Yıldızı", d: "Haftanın yıldızları arasına gir", on: !!stars?.list?.slice(0, 3).some((x) => x.uid === me.uid) || !!profile?.wasStar, c: "#c9a227" },
    { e: "🦸", n: "Hero", d: "6. seviyeye ulaş", on: lv >= 6, c: "#9d4edd" }
  ];
}

// ---------------------------------------------------------------- Avatar oluşturucu
function avatarBuilder(first = false) {
  const lv = xpNow().level;
  let av = structuredClone(profile?.avatar || defaultAvatar(me.uid));
  app.className = "wrap narrow";
  const draw = () => {
    app.innerHTML = `<div class="card builder">
      <h2 class="center">${first ? "🎨 Avatarını oluştur!" : "🎨 Avatarım"}</h2>
      ${first ? `<p class="center muted" style="margin-top:-6px">Seni temsil edecek karakteri seç. Seviye atladıkça yeni aksesuarlar açılacak!</p>` : ""}
      <div class="center" style="margin:14px 0 18px"><div class="bounce">${avatarHtml(av, 130, lv)}</div></div>
      <label>Karakter</label>
      <div class="pick-grid">${AV_BASES.map((b) => `<button class="pick ${av.base === b ? "on" : ""}" data-b="${b}">${b}</button>`).join("")}</div>
      <label style="margin-top:14px">Arka plan</label>
      <div class="pick-grid">${AV_BGS.map(([c1, c2], i) => `<button class="pick sw ${av.bg === i ? "on" : ""}" data-bg="${i}" style="background:linear-gradient(135deg,${c1},${c2})" aria-label="Renk ${i + 1}"></button>`).join("")}</div>
      <label style="margin-top:14px">Aksesuar</label>
      <div class="pick-grid">${AV_ACCS.map((a) => { const locked = lv < a.lv; return `<button class="pick ${av.acc === a.e ? "on" : ""} ${locked ? "locked" : ""}" data-acc="${a.e}" ${locked ? `data-lv="${a.lv}"` : ""} title="${a.n}">${a.e || "∅"}${locked ? `<small>🔒 Lv${a.lv}</small>` : ""}</button>`; }).join("")}</div>
      <button class="btn gold lg block" id="avs" style="margin-top:20px">${first ? "Hadi başlayalım! 🚀" : "Kaydet"}</button>
      ${first ? "" : `<button class="btn ghost block" id="avc" style="margin-top:8px">Vazgeç</button>`}
    </div>`;
    $$("[data-b]").forEach((b) => b.onclick = () => { av.base = b.dataset.b; draw(); });
    $$("[data-bg]").forEach((b) => b.onclick = () => { av.bg = Number(b.dataset.bg); draw(); });
    $$("[data-acc]").forEach((b) => b.onclick = () => { if (b.dataset.lv) return toast(`Bu aksesuar ${b.dataset.lv}. seviyede açılır. Ödev yaparak XP kazan! 💪`); av.acc = b.dataset.acc; draw(); });
    $("#avs").onclick = async () => {
      $("#avs").disabled = true;
      try {
        profile = { uid: me.uid, grade: me.grade, section: me.section, avatar: av, updatedAt: Date.now() };
        await api.saveProfile(profile); rememberMe();
        if (first) confetti();
        showHome();
      } catch (e) { toast(friendlyError(e), "bad"); $("#avs").disabled = false; }
    };
    if ($("#avc")) $("#avc").onclick = showHome;
  };
  draw();
}

// ---------------------------------------------------------------- Ana sayfa
function showHome() {
  app.className = "wrap";
  const X = xpNow();
  const av = profile?.avatar;
  $("#who").classList.remove("hidden"); $("#logout").classList.remove("hidden");
  $("#who").innerHTML = `<span class="who-av">${avatarHtml(av, 34)}</span> <span>${esc(me.name.split(" ")[0])} · ${me.grade}-${me.section}</span>`;
  const done = Object.values(subs);
  const pending = assignments.filter((a) => status(a).open).length;
  const plusTotal = points.reduce((x, p) => x + p.delta, 0);
  app.innerHTML = `
    <section class="welcome lv${X.level}">
      <div class="w-av" id="editAv" title="Avatarını değiştir">${avatarHtml(av, 92, X.level)}<span class="w-edit">✏️</span></div>
      <div class="w-txt">
        <h2>Hello, ${esc(me.name.split(" ")[0])}! 👋</h2>
        <p>${pending ? `Seni bekleyen <b>${pending}</b> ödev var. Hadi başlayalım!` : "Tüm ödevlerini bitirdin, harikasın! 🎉"}</p>
        <div class="xp"><div class="xp-top"><b>Lv ${X.level} · ${X.name}</b><span>${X.into}/${X.need} XP</span></div><div class="xp-bar"><span style="width:${(X.into / X.need) * 100}%"></span></div></div>
      </div>
      <div class="stats">
        <div class="stat s1"><b>${done.length}</b><span>ödev bitti</span></div>
        <div class="stat s2"><b>${done.length ? avg(done.map(scoreOf)) : "–"}</b><span>ortalama</span></div>
        <div class="stat s3"><b>${plusTotal > 0 ? "+" : ""}${plusTotal}</b><span>sınıf puanı</span></div>
        <div class="stat s4"><b>${badgesFor().filter((b) => b.on).length}</b><span>rozet</span></div>
      </div>
    </section>
    <nav class="tabs">
      <button class="tab" data-t="hw">📝 Ödevler</button>
      <button class="tab" data-t="wd">🃏 Kelimeler</button>
      <button class="tab" data-t="pr">🚀 Gelişimim</button>
      <button class="tab" data-t="fb">💬 Geri bildirim</button>
      <button class="tab" data-t="bd">🏅 Rozetler</button>
    </nav>
    <section id="tabBody"></section>`;
  $("#editAv").onclick = () => avatarBuilder(false);
  $$(".tab").forEach((b) => b.onclick = () => { tab = b.dataset.t; drawTab(); });
  drawTab();
}

function drawTab() {
  $$(".tab").forEach((b) => b.classList.toggle("on", b.dataset.t === tab));
  const body = $("#tabBody");
  if (tab === "wd") return wordsHome(body, wordsets, practice, onPlayed, settings.units[me.grade] || []);
  body.innerHTML = ({ hw: hwList, pr: progressView, fb: fbView, bd: badgesView })[tab]();
  $$("[data-start]").forEach((b) => b.onclick = () => start(b.dataset.start));
  $$("[data-review]").forEach((b) => b.onclick = () => review(b.dataset.review));
}

const HW_COLORS = ["#ff6a88", "#4cc9f0", "#43aa8b", "#f6a04d", "#9d4edd", "#e63946", "#2b9348", "#7f7fd5"];
function daysLeft(due) {
  if (!due) return null;
  const d = Math.round((new Date(due + "T00:00:00") - new Date(today() + "T00:00:00")) / 86400000);
  return d;
}
function dueChip(a) {
  const d = daysLeft(a.dueDate);
  if (d == null) return "";
  if (d === 0) return `<span class="due hot">🔥 Bugün son gün!</span>`;
  if (d === 1) return `<span class="due warm">⏰ Yarın son gün</span>`;
  if (d <= 3) return `<span class="due warm">⏳ ${d} gün kaldı</span>`;
  return `<span class="due">📅 ${d} gün kaldı · ${fmtDate(a.dueDate)}</span>`;
}
function starsCard() {
  if (!stars?.list?.length) return "";
  return `<div class="stars-card"><div class="sc-head"><b>🌟 Haftanın Yıldızları · ${me.grade}-${me.section}</b><small>${esc(stars.label || "")}</small></div>
    <div class="podium">${stars.list.slice(0, 3).map((x, i) => `<div class="pod p${i + 1} ${x.uid === me.uid ? "me" : ""}">${avatarHtml(x.avatar, i === 0 ? 70 : 56)}<b>${esc(x.name)}</b><span>${["🥇", "🥈", "🥉"][i]} ${x.xp} XP</span></div>`).join("")}</div>
    ${stars.list.slice(0, 3).some((x) => x.uid === me.uid) ? `<p class="center" style="margin:8px 0 0;font-weight:800">Bu hafta sen de yıldızlar arasındasın! 🎉</p>` : `<p class="center small" style="margin:8px 0 0;opacity:.85">Ödev yap, kelime oyunu oyna, derste katıl; gelecek hafta sen de burada ol!</p>`}</div>`;
}
function hwList() {
  const urgent = assignments.filter((a) => status(a).open && daysLeft(a.dueDate) != null && daysLeft(a.dueDate) <= 2);
  const top = starsCard() + (urgent.length ? `<div class="remind">⏰ <div><b>Unutma!</b> ${urgent.map((a) => `"${esc(a.title)}" ${daysLeft(a.dueDate) === 0 ? "bugün" : daysLeft(a.dueDate) === 1 ? "yarın" : "2 gün sonra"}`).join(", ")} bitiyor.</div></div>` : "");
  return top + hwListInner();
}
function hwListInner() {
  if (!assignments.length) return `<div class="card empty"><div class="big">📭</div><p>Henüz ödev yok. Öğretmenin ödev verince burada göreceksin.</p></div>`;
  const units = settings.units[me.grade] || [];
  const order = [...assignments].sort((a, b) => (status(a).done - status(b).done) || (b.week - a.week));
  return order.map((a) => {
    const st = status(a), s = st.s;
    const used = s?.attempts || 0, allowed = a.attempts || settings.defaultAttempts || 1;
    const col = HW_COLORS[(a.unit - 1) % HW_COLORS.length];
    const right = st.done
      ? `<div class="hw-act"><span class="score ${pctClass(scoreOf(s))}">${scoreOf(s)}</span>
         ${used < allowed ? `<button class="btn ghost sm" data-start="${a.id}">🔁 Tekrar</button>` : ""}
         <button class="btn ghost sm" data-review="${a.id}">👀 Cevaplarım</button></div>`
      : `<button class="btn gold" data-start="${a.id}">${st.late ? "Geç de olsa yap" : "Başla →"}</button>`;
    return `<article class="hw ${st.done ? "done" : ""}" style="--hc:${col}">
      <div class="ic">${st.done ? "✅" : st.late ? "⏰" : ["📝", "🎯", "🧩", "🎧", "✏️"][a.items.length % 5]}</div>
      <div class="meta">
        <h3>${esc(a.title)}</h3>
        <p><span class="unit-chip" style="background:${col}">Ünite ${a.unit}</span> ${esc(units[a.unit - 1] || "")} · ${a.items.length} soru${a.week ? ` · ${a.week}. hafta` : ""}</p>
        <p>${a.dueDate ? (st.late ? `<span class="badge late">Süresi geçti: ${fmtDate(a.dueDate)}</span>` : st.done ? "" : dueChip(a)) : ""}
        ${s && !s.writingGraded && s.writeTotal ? ` <span class="badge ok">Yazma kısmı puanlanıyor</span>` : ""}</p>
      </div>
      ${right}
    </article>`;
  }).join("");
}

// ---------------------------------------------------------------- Gelişimim
function progressView() {
  const X = xpNow();
  const chrono = [...assignments].sort((a, b) => (a.week || 0) - (b.week || 0) || (a.createdAt || 0) - (b.createdAt || 0));
  const doneN = chrono.filter((a) => subs[a.id]).length;
  const missed = chrono.filter((a) => status(a).late).length;
  const pcts = Object.values(subs).map(scoreOf);
  let streak = 0; for (const a of [...chrono].reverse()) { if (subs[a.id]) streak++; else if (status(a).late) break; }
  // beceri
  const tally = {};
  Object.values(subs).forEach((s) => {
    const a = assignments.find((x) => x.id === s.assignmentId); if (!a) return;
    a.items.forEach((it, i) => { if (it.type === "write" || s.correct?.[i] == null) return; const k = it.skill || "V"; tally[k] = tally[k] || [0, 0]; tally[k][0] += s.correct[i]; tally[k][1]++; });
  });
  const SK = { V: ["📖", "#ff6a88"], G: ["🧩", "#7f7fd5"], R: ["👓", "#43aa8b"], L: ["🎧", "#4cc9f0"], W: ["✍️", "#f6a04d"], S: ["🗣️", "#e63946"] };
  const plusT = points.filter((p) => p.delta > 0).reduce((x, p) => x + p.delta, 0);
  const minusT = points.filter((p) => p.delta < 0).reduce((x, p) => x + p.delta, 0);
  const maxCs = Math.max(1, ...classStats.map((c) => Math.abs(c.total || 0)));
  const nextLv = X.level < LEVELS.length ? LEVELS[X.level] : null;

  return `<div class="grid">
    <div class="card level-card" style="--lc:${X.color}">
      <div class="row" style="gap:18px;flex-wrap:nowrap">
        ${avatarHtml(profile?.avatar, 86, X.level)}
        <div style="flex:1;min-width:0"><div class="lv-name">Level ${X.level}: ${X.name}</div>
          <div class="xp-bar big"><span style="width:${(X.into / X.need) * 100}%"></span></div>
          <p class="small" style="margin:6px 0 0">Toplam <b>${X.xp} XP</b>${nextLv ? ` · <b>${nextLv}</b> olmana ${X.need - X.into} XP kaldı!` : " · En üst seviyedesin! 👑"}</p></div>
      </div>
      <p class="small muted" style="margin:12px 0 0">💡 Her ödev +10 XP, başarı puanına göre +20 XP'ye kadar; derste aldığın her artı +5 XP, öğretmeninin verdiği her yıldız +3 XP, her kelime oyunu +2 XP.</p>
    </div>

    <div class="tiles">
      <div class="tile t1"><span>📚</span><b>${doneN}/${chrono.length}</b><small>ödev yapıldı</small></div>
      <div class="tile t2"><span>🎯</span><b>${pcts.length ? avg(pcts) : "–"}</b><small>ortalama puan</small></div>
      <div class="tile t3"><span>🔥</span><b>${streak}</b><small>ödev serisi</small></div>
      <div class="tile t4"><span>${missed ? "😬" : "🛡️"}</span><b>${missed}</b><small>kaçırılan ödev</small></div>
      <div class="tile t5"><span>🎮</span><b>${practice?.games || 0}</b><small>kelime oyunu</small></div>
    </div>

    <div class="card"><h3>🗺️ Ödev yolculuğum</h3>
      ${chrono.length ? `<div class="journey">${chrono.map((a, i) => { const st = status(a); const s = subs[a.id];
        return `<div class="step ${st.done ? "ok" : st.late ? "miss" : "open"}" title="${esc(a.title)}"><div class="dot">${st.done ? scoreOf(s) : st.late ? "✗" : "?"}</div><small>${a.week ? a.week + ".h" : i + 1}</small></div>`; }).join('<div class="link"></div>')}</div>
      <div class="legend"><span><i class="ok"></i>Yapıldı</span><span><i class="open"></i>Bekliyor</span><span><i class="miss"></i>Kaçırıldı</span></div>` : `<p class="muted">Henüz ödev yok.</p>`}
    </div>

    <div class="card"><h3>📈 Puanlarım</h3>
      ${pcts.length ? `<div class="bars">${chrono.filter((a) => subs[a.id]).map((a) => { const p = scoreOf(subs[a.id]); return `<div class="bar ${pctClass(p)}" style="height:${Math.max(p, 4)}%"><span>${p}</span></div>`; }).join("")}</div>
      <div class="bar-labels">${chrono.filter((a) => subs[a.id]).map((a) => `<span>${a.week ? a.week + ".h" : "•"}</span>`).join("")}</div>` : `<p class="muted">İlk ödevini yapınca grafiğin burada çıkacak.</p>`}
    </div>

    <div class="card"><h3>💪 Becerilerim</h3>
      ${Object.keys(tally).length ? Object.keys(tally).map((k) => { const p = Math.round((tally[k][0] / tally[k][1]) * 100); const [e, c] = SK[k] || ["⭐", "#c9a227"];
        return `<div class="skill"><span class="sk-e" style="background:${c}22">${e}</span><div style="flex:1"><div class="row between small"><b>${SKILLS[k] || k}</b><b style="color:${c}">%${p}</b></div><div class="sk-bar"><span style="width:${p}%;background:${c}"></span></div></div></div>`; }).join("") : `<p class="muted">Ödev yaptıkça hangi becerilerde güçlü olduğunu burada göreceksin.</p>`}
    </div>

    <div class="card"><h3>🙋 Ders içi puanlarım</h3>
      <div class="row" style="gap:10px;margin-bottom:10px"><span class="pm plus">+${plusT}</span><span class="pm minus">${minusT}</span></div>
      ${points.length ? `<div class="plist">${points.slice(0, 12).map((p) => `<div class="pitem ${p.delta > 0 ? "plus" : "minus"}"><span class="pe">${esc(p.emoji || (p.delta > 0 ? "👍" : "👎"))}</span><span style="flex:1">${esc(p.reason || "")}</span><b>${p.delta > 0 ? "+" : ""}${p.delta}</b><small>${new Date(p.at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</small></div>`).join("")}</div>` : `<p class="muted small">Derste katıldıkça öğretmenin sana artı puan verecek!</p>`}
    </div>

    ${classStats.length ? `<div class="card"><h3>🏁 Şube yarışı</h3><p class="small muted" style="margin-top:-4px">Şubelerin toplam ders içi puanı</p>
      ${[...classStats].sort((a, b) => (b.total || 0) - (a.total || 0)).map((c, i) => `<div class="race ${c.section === me.section ? "mine" : ""}"><b>${["🥇", "🥈", "🥉"][i] || "🏳️"} ${c.grade}-${c.section}</b><div class="race-bar"><span style="width:${(Math.max(0, c.total || 0) / maxCs) * 100}%"></span></div><b>${c.total || 0}</b></div>`).join("")}</div>` : ""}
  </div>`;
}

// ---------------------------------------------------------------- Geri bildirim
const FB_COLORS = [["#ff9a8b", "#ff6a88"], ["#a1c4fd", "#6c8cff"], ["#84fab0", "#43aa8b"], ["#fddb92", "#f6a04d"], ["#c3a6ff", "#7f7fd5"], ["#fbc2eb", "#ff7eb3"]];
function fbView() {
  const cols = settings.gradeColumns || [];
  const sc = me.scores || {};
  const grades = cols.some((c) => sc[c] != null && sc[c] !== "") ? `<div class="card"><h3>📒 Notlarım</h3><div class="note-tiles">${cols.map((c, i) => `<div class="note-tile" style="background:linear-gradient(135deg,${FB_COLORS[i % 6][0]},${FB_COLORS[i % 6][1]})"><small>${esc(c)}</small><b>${sc[c] ?? "–"}</b></div>`).join("")}</div></div>` : "";
  const notes = feedback.length ? feedback.map((f, i) => { const [c1, c2] = FB_COLORS[i % FB_COLORS.length]; return `<article class="fbc" style="--c1:${c1};--c2:${c2}">
      <div class="fbc-head"><span class="wk">${f.week}. hafta</span><span class="stars big">${"★".repeat(f.stars || 0)}<i>${"★".repeat(5 - (f.stars || 0))}</i></span></div>
      <div class="bubble-row"><span class="t-av">B</span><div class="bubble">${f.note ? esc(f.note) : "Bu hafta için yıldızların var! ⭐"}</div></div>
      ${f.strength ? `<div class="fbc-chip"><span>💪</span><div><small>Güçlü yanın</small><b>${esc(f.strength)}</b></div></div>` : ""}
      ${f.work ? `<div class="fbc-chip"><span>🎯</span><div><small>Bu hafta çalış</small><b>${esc(f.work)}</b></div></div>` : ""}
    </article>`; }).join("") : `<div class="card empty"><div class="big">💌</div><p>Öğretmeninin sana yazdığı mesajlar burada görünecek.</p></div>`;
  return `<div class="grid">${grades}${notes}</div>`;
}

function badgesView() {
  const bs = badgesFor(); const n = bs.filter((b) => b.on).length;
  return `<p class="muted"><b>${n}/${bs.length}</b> rozet kazandın${n === bs.length ? " — hepsini topladın! 🏆" : ". Hepsini toplayabilir misin?"}</p>
    <div class="badges">${bs.map((b) => `<div class="bdg ${b.on ? "" : "off"}" style="--bc:${b.c}"><div class="e">${b.on ? b.e : "🔒"}</div><b>${b.n}</b><small>${b.d}</small></div>`).join("")}</div>`;
}

// ---------------------------------------------------------------- Ödev çözme
function start(id) {
  const a = assignments.find((x) => x.id === id);
  app.className = "wrap";
  window.scrollTo(0, 0);
  const lvBefore = xpNow().level;
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
    app.innerHTML = `<div class="card result"><div class="big spin">⭐</div><p>Kaydediliyor…</p></div>`;
    try {
      await api.saveSubmission(sub);
      subs[id] = { ...prev, ...sub };
      resultScreen(a, r, lvBefore);
    } catch (e) {
      app.innerHTML = `<div class="card result"><div class="big">⚠️</div><h2>Kaydedilemedi</h2><p>${esc(friendlyError(e))}</p><button class="btn gold" id="retry">Tekrar dene</button></div>`;
      $("#retry").onclick = () => finish(answers);
    }
  };
  play(app, a, { onExit: showHome, onFinish: finish });
}

function resultScreen(a, r, lvBefore) {
  const p = r.percent, X = xpNow();
  const up = X.level > lvBefore;
  const msg = p >= 90 ? ["🏆", "Outstanding!", "Muhteşemsin!"] : p >= 70 ? ["🌟", "Great job!", "Çok iyi iş çıkardın!"] : p >= 50 ? ["👍", "Good effort!", "Güzel, biraz daha tekrar edersen süper olacak."] : ["💪", "Keep going!", "Pes etmek yok, tekrar dene!"];
  app.innerHTML = `<div class="card result">
    ${up ? `<div class="levelup">⬆️ LEVEL UP! <b>Lv ${X.level} · ${X.name}</b></div>` : ""}
    <div class="center">${avatarHtml(profile?.avatar, 100, X.level)}</div>
    <h2 style="margin-top:12px">${msg[0]} ${msg[1]}</h2>
    <div class="pct ${pctClass(p)}">${p}<small>/100</small></div>
    <p class="muted">${msg[2]}</p>
    <div class="xp" style="max-width:320px;margin:10px auto"><div class="xp-top"><b>Lv ${X.level}</b><span>${X.into}/${X.need} XP</span></div><div class="xp-bar"><span style="width:${(X.into / X.need) * 100}%"></span></div></div>
    ${r.writeTotal ? `<p class="small"><span class="badge ok">Yazma bölümünü öğretmenin puanlayacak; puanın değişebilir.</span></p>` : ""}
    <div class="row" style="justify-content:center;margin-top:18px">
      <button class="btn ghost" id="rv">👀 Cevaplarımı gör</button>
      <button class="btn gold" id="hm">🏠 Ana sayfa</button>
    </div></div>`;
  if (p >= 70 || up) confetti();
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
    return `<div class="item-ed rv ${it.type === "write" ? "" : c === 1 ? "ok" : "no"}"><div class="row between"><b>${i + 1}. ${esc(itemSummary(it))}</b><span>${icon}</span></div>
      <p class="small" style="margin:6px 0 0">Senin cevabın: <b>${esc(answerText(it, s.answers?.[i]))}</b></p>
      ${it.type === "write" ? `<p class="small" style="margin:2px 0 0">Öğretmen puanı: <b>${wp != null ? `${wp}/${it.points || 3}` : "bekleniyor"}</b></p>` : c !== 1 ? `<p class="small" style="margin:2px 0 0;color:var(--green)">Doğrusu: <b>${esc(correctText(it))}</b></p>` : ""}</div>`;
  }).join("");
  app.innerHTML = `<div class="row between" style="margin-bottom:14px"><h2 style="margin:0">${esc(a.title)}</h2><button class="btn ghost" id="bk">← Geri</button></div>
    <p class="muted">Puanın: <span class="score ${pctClass(scoreOf(s))}">${scoreOf(s)}</span> ${s.attempts > 1 ? `(son denemen: ${s.percent})` : ""}</p>${rows}`;
  $("#bk").onclick = showHome;
  window.scrollTo(0, 0);
}

function confetti() {
  const box = document.createElement("div"); box.className = "confetti";
  const bits = ["🎉", "⭐", "✨", "🎊", "💛", "🌟"];
  for (let i = 0; i < 36; i++) { const s = document.createElement("span"); s.textContent = bits[i % bits.length]; s.style.left = Math.random() * 100 + "%"; s.style.animationDelay = Math.random() * 0.8 + "s"; s.style.fontSize = 16 + Math.random() * 20 + "px"; box.appendChild(s); }
  document.body.appendChild(box); setTimeout(() => box.remove(), 3500);
}

async function onPlayed({ setId, mode, score }) {
  const lvBefore = xpNow().level;
  const p = practice || { uid: me.uid, grade: me.grade, section: me.section, games: 0, log: {}, best: {} };
  p.games = (p.games || 0) + 1;
  const k = dayKey(); p.log = { ...(p.log || {}), [k]: ((p.log || {})[k] || 0) + 1 };
  const bk = `${setId}_${mode}`; p.best = { ...(p.best || {}), [bk]: Math.max(score, (p.best || {})[bk] ?? 0) };
  p.updatedAt = Date.now();
  practice = p;
  try { await api.savePractice(p); } catch (e) { toast("Oyun kaydedilemedi: " + friendlyError(e), "bad"); }
  confetti();
  if (xpNow().level > lvBefore) toast(`⬆️ LEVEL UP! Lv ${xpNow().level} · ${xpNow().name}`, "ok");
}
