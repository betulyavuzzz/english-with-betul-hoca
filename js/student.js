import { api, isDemo, friendlyError } from "./api.js?v=32";
import { SITE } from "./config.js?v=32";
import { SKILLS } from "./defaults.js?v=32";
import { $, $$, esc, toast, fmtDate, pctClass } from "./ui.js?v=32";
import { play, computeResult, itemSummary, answerText, correctText, scoreItem, autoWritePoints } from "./player.js?v=32";
import { AV_BASES, AV_BGS, AV_ACCS, AV_SIDES, AV_FRAMES, LOCKED_BASES, LOCKED_BGS, isUnlocked, reqShort, reqLong, avatarHtml, defaultAvatar, computeXP, LEVELS, dayKey, GAME_DAILY_XP_LIMIT, QUIZ_MIN_CORRECT, QUIZ_MIN_MS, MEMORY_MIN_STARS, weeklyEntry, weekKey, weekLabel, podiumHtml, BOX_XP, SHOP } from "./game.js?v=32";
import { computeBadges, computeStats } from "./badges.js?v=32";
import { streakInfo, goldInfo, weeklyQuests, QUEST_GOLD, QUEST_BONUS, petInfo, PET_SPECIES, PET_FOOD, albumSet, wordKey } from "./fun.js?v=32";
import { petSVG, PET_TYPES } from "./petart.js?v=32";
import { wordsHome } from "./words.js?v=32";

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
    Promise.resolve(null)
  ]);
  wordsets = ws; practice = pr;
  assignments = as.filter((a) => !a.sections?.length || a.sections.includes(me.section));
  subs = Object.fromEntries(ss.map((s) => [s.assignmentId, s]));
  feedback = fb.sort((a, b) => b.week - a.week);
  points = pts.sort((a, b) => b.at - a.at);
  profile = prof;
  classStats = cs;
  rememberMe();
  await refreshStars();
  if (stars?.list?.slice(0, 3).some((x) => x.uid === me.uid) && prof && !prof.wasStar) { prof.wasStar = true; api.saveProfile(prof).catch(() => {}); }
  markDay();
}
const pr0 = () => practice || { uid: me.uid, grade: me.grade, section: me.section, games: 0, log: {}, best: {} };
async function savePr(p) { p.updatedAt = Date.now(); practice = p; try { await api.savePractice(p); return true; } catch (e) { toast("Kaydedilemedi: " + friendlyError(e), "bad"); return false; } }
function markDay() {
  const k = dayKey(), p = pr0();
  if ((p.days || []).includes(k)) return;
  const before = streakInfo(p).current;
  p.days = [...(p.days || []), k].slice(-120);
  const si = streakInfo(p);
  savePr(p).then((ok) => { if (ok) setTimeout(() => toast(`🔥 Günlük seri: ${si.current}. gün! +${si.gold - streakInfo({ days: (p.days || []).slice(0, -1) }).gold} 🪙`, "ok"), 900); });
  void before;
}
const goldNow = () => goldInfo({ subs, practice, wordsets });
// Kendi haftalık XP kaydını yaz, sonra şubenin ilk 3'ünü oku
async function refreshStars() {
  try {
    const e = weeklyEntry(me, profile?.avatar, { subs: Object.values(subs), points, practice });
    if (e.xp > 0) await api.saveWeekly(e);
    const all = (await api.listWeekly(me.grade, me.section, weekKey())).filter((x) => x.xp > 0).sort((a, b) => b.xp - a.xp);
    const myXp = e.xp, above = all.filter((x) => x.xp > myXp && x.uid !== me.uid);
    const next = above.length ? Math.min(...above.map((x) => x.xp)) : null;
    stars = { label: weekLabel(), list: all.slice(0, 3), myXp, rank: myXp > 0 ? above.length + 1 : null, gap: next != null ? next - myXp + 1 : null };
  } catch (err) { console.warn("Haftanın yıldızları alınamadı", err); stars = null; }
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

const bctx = () => ({ assignments, subs, points, feedback, practice, profile, isStar: !!stars?.list?.slice(0, 3).some((x) => x.uid === me.uid) });
function badgesFor() { return computeBadges(bctx()); }

// ---------------------------------------------------------------- Avatar oluşturucu
function avatarStats() { return computeStats(bctx()); }
function avatarCatalog() {
  const free = (e) => ({ e, n: "", req: {} });
  return {
    base: [...AV_BASES.map(free), ...LOCKED_BASES],
    bg: [...AV_BGS.map((c, i) => ({ i, c, req: {} })), ...LOCKED_BGS.map((x, k) => ({ ...x, i: AV_BGS.length + k }))],
    acc: AV_ACCS, side: AV_SIDES, frame: AV_FRAMES
  };
}
function unlockedCount() { const st = avatarStats(); const c = avatarCatalog(); return Object.values(c).flat().filter((x) => isUnlocked(x.req, st)).length; }

let avTab = "base";
function avatarBuilder(first = false) {
  const st = avatarStats();
  const lv = st.lv;
  const C = avatarCatalog();
  let av = { acc: "", side: "", frame: "", ...structuredClone(profile?.avatar || defaultAvatar(me.uid)) };
  app.className = "wrap narrow";
  const TABS = [["base", "🦊", "Karakter"], ["bg", "🎨", "Renk"], ["acc", "🎩", "Şapka"], ["side", "🎸", "Eşya"], ["frame", "✨", "Çerçeve"]];
  const lockedCount = Object.values(C).flat().filter((x) => !isUnlocked(x.req, st)).length;
  const draw = () => {
    const list = C[avTab];
    const cell = (x, sel, attr, inner) => { const lk = !isUnlocked(x.req, st); return `<button class="pick ${sel ? "on" : ""} ${lk ? "locked" : ""}" ${attr} ${lk ? `data-lock="${esc(reqLong(x.req))}" data-name="${esc(x.n || "")}"` : ""} title="${esc(x.n || "")}">${inner}${lk ? `<small>🔒 ${esc(reqShort(x.req))}</small>` : ""}</button>`; };
    let grid = "";
    if (avTab === "base") grid = list.map((x) => cell(x, av.base === x.e, `data-v="${x.e}"`, x.e)).join("");
    if (avTab === "bg") grid = list.map((x) => cell(x, av.bg === x.i, `data-v="${x.i}"`, `<span class="sw-in ${x.fx ? "fx-" + x.fx : ""}" style="background:${x.fx === "rainbow" ? "conic-gradient(#ff595e,#ffca3a,#8ac926,#1982c4,#6a4c93,#ff595e)" : `linear-gradient(135deg,${x.c[0]},${x.c[1]})`}"></span>`)).join("");
    if (avTab === "acc" || avTab === "side") grid = list.map((x) => cell(x, av[avTab] === x.e, `data-v="${x.e}"`, x.e || "∅")).join("");
    if (avTab === "frame") grid = list.map((x) => cell(x, av.frame === x.id, `data-v="${x.id}"`, `<span class="fr-prev">${avatarHtml({ ...av, frame: x.id, acc: "", side: "" }, 34)}</span>`)).join("");
    app.innerHTML = `<div class="card builder">
      <h2 class="center">${first ? "🎨 Avatarını oluştur!" : "🎨 Avatarım"}</h2>
      <p class="center muted" style="margin-top:-6px">${first ? "Seni temsil edecek karakteri seç." : ""} 🔒 Kilitli <b>${lockedCount}</b> eşya var: ödev yap, oyun oyna, derste artı al, kilitleri aç!</p>
      <div class="center" style="margin:22px 0 18px"><div class="bounce">${avatarHtml(av, 130, lv)}</div></div>
      <div class="av-tabs">${TABS.map(([k, e, n]) => `<button class="av-tab ${avTab === k ? "on" : ""}" data-t="${k}"><span>${e}</span>${n}</button>`).join("")}</div>
      <div class="pick-grid">${grid}</div>
      <button class="btn gold lg block" id="avs" style="margin-top:20px">${first ? "Hadi başlayalım! 🚀" : "Kaydet"}</button>
      ${first ? "" : `<button class="btn ghost block" id="avc" style="margin-top:8px">Vazgeç</button>`}
    </div>`;
    $$(".av-tab").forEach((b) => b.onclick = () => { avTab = b.dataset.t; draw(); });
    $$(".pick-grid .pick").forEach((b) => b.onclick = () => {
      if (b.dataset.lock) return toast(`🔒 ${b.dataset.name ? b.dataset.name + ": " : ""}Açmak için ${b.dataset.lock}! 💪`);
      const v = b.dataset.v;
      if (avTab === "base") av.base = v; else if (avTab === "bg") av.bg = Number(v); else av[avTab] = v;
      draw();
    });
    $("#avs").onclick = async () => {
      $("#avs").disabled = true;
      try {
        profile = { ...(profile || {}), uid: me.uid, grade: me.grade, section: me.section, avatar: av, updatedAt: Date.now() };
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
        <div class="fun-chips"><span class="fchip gold">🪙 ${goldNow().balance} altın</span><span class="fchip fire">🔥 ${streakInfo(practice).current} gün seri</span>${practice?.pet ? `<span class="fchip">${petInfo({ subs, practice }).stage ? practice.pet.sp : "🥚"} ${esc(practice.pet.name || "")} ${petInfo({ subs, practice }).mood.e}</span>` : ""}</div>
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
      <button class="tab" data-t="fun">🌍 Dünyam</button>
    </nav>
    <section id="tabBody"></section>`;
  $("#editAv").onclick = () => avatarBuilder(false);
  try {
    const k = "ewbh-unl-" + me.uid, n = unlockedCount(), prev = Number(localStorage.getItem(k) || 0);
    if (prev && n > prev) { setTimeout(() => toast(`🎁 ${n - prev} yeni avatar eşyası açıldı! Avatarına dokun.`, "ok"), 600); $("#editAv").classList.add("has-new"); }
    localStorage.setItem(k, String(n));
  } catch {}
  $$(".tab").forEach((b) => b.onclick = () => { tab = b.dataset.t; drawTab(); });
  drawTab();
}

function drawTab() {
  $$(".tab").forEach((b) => b.classList.toggle("on", b.dataset.t === tab));
  const body = $("#tabBody");
  if (tab === "wd") return wordsHome(body, wordsets, practice, onPlayed, settings.units[me.grade] || []);
  body.innerHTML = ({ hw: hwList, pr: progressView, fb: fbView, bd: badgesView, fun: funView })[tab]();
  if (tab === "fun") bindFun();
  $$("[data-start]").forEach((b) => b.onclick = () => start(b.dataset.start));
  $$("[data-review]").forEach((b) => b.onclick = () => review(b.dataset.review));
  $$("[data-box]").forEach((b) => b.onclick = startBox);
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
function rankLine() {
  if (!stars) return "";
  const r = stars.rank;
  const msg = !r ? `Bu hafta henüz XP kazanmadın. Bir ödev yap, sıralamaya gir! 🚀`
    : r === 1 ? `Bu hafta sınıfında <b>1. sıradasın</b>! 🏆 Yerini koru!`
    : `Bu hafta sınıfında <b>${r}. sıradasın</b>. ${stars.gap} XP daha kazanırsan bir üst sıraya çıkarsın! 💪`;
  return `<div class="remind" style="margin-top:10px">📈 <div>${msg}${r ? ` <span class="small muted">(Bu haftaki XP'n: ${stars.myXp})</span>` : ""}</div></div>`;
}
function starsCard() {
  if (!stars?.list?.length) return rankLine();
  return `<div class="stars-card"><div class="sc-head"><b>🌟 Haftanın Yıldızları · ${me.grade}-${me.section}</b><small>${esc(stars.label || "")}</small></div>
    ${podiumHtml(stars.list, me.uid, true)}
    ${stars.list.slice(0, 3).some((x) => x.uid === me.uid) ? `<p class="center" style="margin:8px 0 0;font-weight:800">Bu hafta sen de yıldızlar arasındasın! 🎉</p>` : `<p class="center small" style="margin:8px 0 0;opacity:.85">Ödev yap, kelime oyunu oyna, derste katıl; gelecek hafta sen de burada ol!</p>`}</div>` + (stars.rank && stars.rank <= 3 ? "" : rankLine());
}
function hwList() {
  const urgent = assignments.filter((a) => status(a).open && daysLeft(a.dueDate) != null && daysLeft(a.dueDate) <= 2);
  const top = starsCard() + (urgent.length ? `<div class="remind">⏰ <div><b>Unutma!</b> ${urgent.map((a) => `"${esc(a.title)}" ${daysLeft(a.dueDate) === 0 ? "bugün" : daysLeft(a.dueDate) === 1 ? "yarın" : "2 gün sonra"}`).join(", ")} bitiyor.</div></div>` : "");
  return top + boxCard() + hwListInner();
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
      <p class="small muted" style="margin:12px 0 0">💡 Her ödev +10 XP, başarı puanına göre +20 XP'ye kadar; derste aldığın her artı +5 XP, öğretmeninin verdiği her yıldız +3 XP, başarıyla bitirdiğin her kelime oyunu +2 XP (günde en fazla 4).</p>
    </div>

    <div class="tiles">
      <div class="tile t1"><span>📚</span><b>${doneN}/${chrono.length}</b><small>ödev yapıldı</small></div>
      <div class="tile t2"><span>🎯</span><b>${pcts.length ? avg(pcts) : "–"}</b><small>ortalama puan</small></div>
      <div class="tile t3"><span>🔥</span><b>${streak}</b><small>ödev serisi</small></div>
      <div class="tile t4"><span>${missed ? "😬" : "🛡️"}</span><b>${missed}</b><small>kaçırılan ödev</small></div>
      <div class="tile t5"><span>🎮</span><b>${practice?.xpGames || 0}</b><small>başarılı kelime oyunu</small></div>
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

// ---------------------------------------------------------------- Dünyam: görevler, altın, hayvan, mağaza, albüm
let funSub = "quest";
function funView() {
  const G = goldNow(), S = streakInfo(practice);
  const subTabs = [["quest", "🎯 Görevler"], ["pet", "🐣 Hayvanım"], ["shop", "🛒 Mağaza"], ["album", "📒 Albüm"]];
  const top = `<div class="fun-top"><div class="fun-gold"><span>🪙</span><b>${G.balance}</b><small>altın</small></div>
    <div class="fun-streak"><span>🔥</span><b>${S.current}</b><small>gün seri</small></div>
    <p class="small muted" style="flex:1 1 260px;margin:0">Altın kazanmak için: ödev yap (+10), tekrar kutusundan soru düzelt (+1), kelime oyunu kazan (+2), her gün gir (+2…+7), görevleri bitir, albüme kelime ekle (+1).</p></div>
    <div class="fun-tabs">${subTabs.map(([k, t]) => `<button class="ftab ${funSub === k ? "on" : ""}" data-fs="${k}">${t}</button>`).join("")}</div>`;
  return top + `<div id="funBody">${({ quest: questView, pet: petView, shop: shopView, album: albumView })[funSub]()}</div>`;
}
function questView() {
  const qs = weeklyQuests({ subs, practice, boxLeft: boxItems().length });
  const n = qs.filter((q) => q.done).length;
  return `<div class="card"><div class="row between"><h3 style="margin:0">🎯 Bu haftanın görevleri</h3><span class="small muted">${weekLabel()}</span></div>
    <p class="small muted" style="margin:4px 0 12px">Her görev <b>+${QUEST_GOLD} 🪙</b>, üçü birden <b>+${QUEST_BONUS} 🪙 bonus</b>. Görevler her pazartesi yenilenir.</p>
    ${qs.map((q) => `<div class="quest ${q.done ? "done" : ""}"><span class="qe">${q.done ? "✅" : q.e}</span><div style="flex:1"><b>${q.t}</b><div class="xp-bar" style="margin-top:6px"><span style="width:${(q.p / q.target) * 100}%"></span></div></div><b class="qn">${q.p}/${q.target}</b></div>`).join("")}
    ${n === 3 ? `<div class="remind" style="margin-top:12px">🏆 <div><b>Haftanın tüm görevlerini bitirdin!</b> Bonus altının hesabında.</div></div>` : ""}</div>`;
}
function claimQuests() {
  const qs = weeklyQuests({ subs, practice, boxLeft: boxItems().length });
  const wk = weekKey(), p = pr0(), w = { ...((p.quests || {})[wk] || { done: [] }) };
  const newly = qs.filter((q) => q.done && !w.done.includes(q.id));
  if (!newly.length && !(qs.every((q) => q.done) && !w.bonus)) return;
  w.done = [...w.done, ...newly.map((q) => q.id)];
  let g = newly.length * QUEST_GOLD;
  if (qs.every((q) => q.done) && !w.bonus) { w.bonus = true; g += QUEST_BONUS; }
  p.quests = { ...(p.quests || {}), [wk]: w };
  savePr(p).then((ok) => { if (ok) { toast(`🎯 Görev tamamlandı! +${g} 🪙`, "ok"); confetti(); } });
}
function petView() {
  const P = petInfo({ subs, practice });
  if (!P.pet) return `<div class="card center"><h3>🥚 Bir yumurtan var!</h3><p class="muted">Bir hayvan seç ve ona isim ver. Ödev yaptıkça büyüyecek: yumurta → bebek → minik → genç → yetişkin → efsane!</p>
    <div class="pet-pick">${PET_SPECIES.map((e, i) => `<button class="pet-opt ${i === 0 ? "on" : ""}" data-sp="${e}">${petSVG(e, 2, "happy", 84)}<small>${PET_TYPES[e]?.n || ""}</small></button>`).join("")}</div>
    <input id="petName" maxlength="12" placeholder="Hayvanının adı (örn. Pamuk)" style="max-width:260px;margin:0 auto 12px;display:block;text-align:center">
    <button class="btn gold" id="petGo">🥚 Yumurtamı al</button></div>`;
  const pet = P.pet;
  return `<div class="card center pet-card">
    <div class="pet-say ${P.mood.k}">${({ happy: P.stage ? "Seninle çok mutluyum! 💛" : "Yakında çıkıyorum! 🥚✨", hungry: "Karnım guruldadı… bir elma? 🍎", sad: "Çok acıktım… beni unutma 😢" })[P.mood.k]}</div>
    <div class="pet-stage pet-${P.mood.k}">${petSVG(pet.sp, P.stage, P.mood.k, [150, 130, 150, 170, 190, 210][P.stage])}</div>
    <h2 style="margin:6px 0 0">${esc(pet.name || "Hayvanım")}</h2>
    <p class="muted" style="margin:4px 0">${P.stageName} · ${P.mood.e} ${P.mood.t}</p>
    ${P.next ? `<div style="max-width:320px;margin:10px auto"><div class="xp-top small"><span>${P.next.n} olmasına</span><b>${P.toNext} büyüme puanı</b></div><div class="xp-bar"><span style="width:${Math.max(4, Math.round(((P.gp - P.curMin) / (P.next.min - P.curMin)) * 100))}%"></span></div></div>` : `<p><b>🏆 Hayvanın efsane oldu!</b></p>`}
    <button class="btn gold" id="petFeed" ${P.fedToday ? "disabled" : ""}>${P.fedToday ? "😋 Bugün doydu" : `🍎 Besle (${PET_FOOD} 🪙)`}</button>
    <p class="small" style="margin:8px 0 0;color:#2b62c4"><b>👆 Hayvanına dokun, sana İngilizce bir şey söylesin!</b></p>
    <p class="small muted" style="margin-top:10px">Büyüme puanı: her ödev +2, her 5 düzeltilen soru +1, her 3 kelime oyunu +1, her besleme +1. Beslemezsen acıkır ve üzülür!</p></div>`;
}
function shopView() {
  const G = goldNow(), owned = new Set(practice?.owned || []);
  const kinds = [["base", "🐾 Karakterler"], ["acc", "🎩 Şapka / takı"], ["side", "🎒 Yan eşyalar"], ["bg", "🎨 Arka planlar"]];
  return kinds.map(([k, t]) => `<div class="card"><h3>${t}</h3><div class="shop-grid">${SHOP.filter((x) => x.kind === k).map((x) => {
    const has = owned.has(x.id), can = G.balance >= x.price;
    const vis = x.kind === "bg" ? `<span class="sw-in" style="display:inline-block;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,${x.c[0]},${x.c[1]})"></span>` : `<span style="font-size:40px">${x.e}</span>`;
    return `<div class="shop-item ${has ? "own" : ""}">${vis}<b>${esc(x.n)}</b>${has ? `<span class="badge ok">✓ Senin</span>` : `<button class="btn ${can ? "gold" : "ghost"} sm" data-buy="${x.id}" ${can ? "" : "disabled"}>🪙 ${x.price}</button>`}</div>`; }).join("")}</div></div>`).join("") +
    `<p class="small muted center">Aldığın eşyayı giymek için avatarına dokun.</p>`;
}
function albumView() {
  const have = albumSet(practice);
  const sets = wordsets.filter((w) => w.words?.length);
  if (!sets.length) return `<div class="card empty"><p>Henüz kelime seti yok.</p></div>`;
  const tot = sets.reduce((x, w) => x + w.words.length, 0), got = sets.reduce((x, w) => x + w.words.filter((y) => have.has(wordKey(y.en))).length, 0);
  return `<div class="card"><h3 style="margin:0">📒 Kelime albümüm · ${got}/${tot}</h3><p class="small muted" style="margin:4px 0 0">Kelime oyunlarında doğru bildiğin her kelime albüme çıkartma olarak yapışır (+1 🪙). Bir seti tamamlarsan <b>+10 🪙</b>!</p></div>` +
    sets.map((w) => { const n = w.words.filter((y) => have.has(wordKey(y.en))).length; return `<div class="card"><div class="row between"><h3 style="margin:0">${esc(w.title)}</h3><b class="${n === w.words.length ? "" : "muted"}">${n === w.words.length ? "🏆 " : ""}${n}/${w.words.length}</b></div>
      <div class="stickers">${w.words.map((y) => have.has(wordKey(y.en)) ? `<div class="stk on" title="${esc(y.tr)}"><span>${y.e || "⭐"}</span><b>${esc(y.en)}</b><small>${esc(y.tr)}</small></div>` : `<div class="stk"><span>❔</span><b>?</b><small>&nbsp;</small></div>`).join("")}</div></div>`; }).join("");
}
function bindFun() {
  $$("[data-fs]").forEach((b) => b.onclick = () => { funSub = b.dataset.fs; drawTab(); });
  if (funSub === "quest") claimQuests();
  if ($("#petGo")) {
    let sp = PET_SPECIES[0];
    $$("[data-sp]").forEach((b) => b.onclick = () => { sp = b.dataset.sp; $$("[data-sp]").forEach((x) => x.classList.toggle("on", x === b)); });
    $("#petGo").onclick = async () => { const p = pr0(); p.pet = { sp, name: ($("#petName").value || "").trim().slice(0, 12) || "Minik", born: dayKey(), fed: dayKey(), feeds: 0 }; if (await savePr(p)) { confetti(); drawTab(); } };
  }
  const ps = $(".pet-stage");
  if (ps && practice?.pet) ps.onclick = () => {
    const P = petInfo({ subs, practice }), words = [...(practice?.album || [])];
    const w = words.length ? words[Math.floor(Math.random() * words.length)] : null;
    const lines = { happy: ["Hello! 👋", "I love English! 💛", "Let's play! 🎮", "You are my best friend! 🤗", w ? `I know the word “${w}”! 📒` : "Teach me new words! 📒", "Do your homework, I grow! 🌱"], hungry: ["I'm hungry! 🍎", "Can I have an apple, please? 🍎", "Yummy food? 😋"], sad: ["I'm so hungry… 😢", "Please feed me! 🍎", "I miss you! 💧"] }[P.mood.k];
    const say = $(".pet-say"); if (say) say.textContent = lines[Math.floor(Math.random() * lines.length)];
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(say.textContent.replace(/[^\p{L}\p{N}\s'!?.,]/gu, "")); u.lang = "en-GB"; u.pitch = 1.6; u.rate = 1.05; speechSynthesis.speak(u); } catch {}
    ps.classList.remove("tap"); void ps.offsetWidth; ps.classList.add("tap");
  };
  if ($("#petFeed")) $("#petFeed").onclick = async () => {
    if (goldNow().balance < PET_FOOD) return toast(`Beslemek için ${PET_FOOD} 🪙 lazım. Ödev yap, altın kazan! 💪`);
    const p = pr0(); p.spent = (p.spent || 0) + PET_FOOD; p.pet = { ...p.pet, fed: dayKey(), feeds: (p.pet.feeds || 0) + 1 };
    if (await savePr(p)) { toast("😋 Afiyet olsun! +1 büyüme", "ok"); drawTab(); }
  };
  $$("[data-buy]").forEach((b) => b.onclick = async () => {
    const it = SHOP.find((x) => x.id === b.dataset.buy); if (!it) return;
    if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Emin misin? ✓"; return; }
    if (goldNow().balance < it.price) return toast("Yeterli altının yok.");
    const p = pr0(); p.spent = (p.spent || 0) + it.price; p.owned = [...new Set([...(p.owned || []), it.id])];
    if (await savePr(p)) { confetti(); toast(`🎉 ${it.n} senin! Avatarına dokunup giyebilirsin.`, "ok"); drawTab(); }
  });
}

function badgesView() {
  const bs = badgesFor(); const n = bs.filter((b) => b.on).length;
  return `<p class="muted"><b>${n}/${bs.length}</b> rozet kazandın${n === bs.length ? " — hepsini topladın! 🏆" : ". Hepsini toplayabilir misin?"}</p>
    <div class="badges">${bs.map((b) => `<div class="bdg ${b.on ? "" : "off"}" style="--bc:${b.c}"><div class="e">${b.on ? b.e : "🔒"}</div><b>${b.n}</b><small>${b.d}</small></div>`).join("")}</div>`;
}

// ---------------------------------------------------------------- Tekrar kutusu: ödevlerdeki yanlışlar
const BOX_SIZE = 10;
function boxItems() {
  const fixed = new Set(practice?.fixed || []);
  const out = [];
  for (const a of assignments) {
    const s = subs[a.id]; if (!s?.correct) continue;
    a.items.forEach((it, i) => {
      const c = s.correct[i];
      if (it.type !== "write" && c != null && c < 1 && !fixed.has(`${a.id}:${i}`)) out.push({ key: `${a.id}:${i}`, it });
    });
  }
  return out;
}
function boxCard() {
  const n = boxItems().length, f = (practice?.fixed || []).length;
  if (!n && !f) return "";
  if (!n) return `<div class="remind" style="margin-top:10px">🔁 <div><b>Tekrar kutun boş!</b> Ödevlerdeki tüm yanlışlarını düzelttin (${f} soru). Harikasın! 🎉</div></div>`;
  return `<div class="card box-card" style="margin-top:12px;border:3px solid var(--gold,#c9a227)"><div class="row between" style="gap:12px;flex-wrap:wrap">
    <div><h3 style="margin:0">🔁 Tekrar kutusu</h3><p class="small muted" style="margin:4px 0 0">Ödevlerde yanlış yaptığın <b>${n}</b> soru seni bekliyor. Doğru yaptığın her soru kutudan çıkar ve <b>+${BOX_XP} XP</b> kazandırır!${f ? ` · Şimdiye kadar ${f} soruyu düzelttin 💪` : ""}</p></div>
    <button class="btn gold" data-box>Başla (${Math.min(n, BOX_SIZE)} soru) →</button></div></div>`;
}
function startBox() {
  const pool = boxItems().sort(() => Math.random() - 0.5).slice(0, BOX_SIZE);
  if (!pool.length) return showHome();
  app.className = "wrap"; window.scrollTo(0, 0);
  const a = { id: "box", title: "Tekrar kutusu", items: pool.map((x) => x.it) };
  play(app, a, {
    practice: true, onExit: showHome,
    onFinish: async (answers) => {
      const ok = pool.filter((x, i) => scoreItem(x.it, answers[i]) === 1).map((x) => x.key);
      const p = practice || { uid: me.uid, grade: me.grade, section: me.section, games: 0, log: {}, best: {} };
      const before = (p.fixed || []).length;
      p.fixed = [...new Set([...(p.fixed || []), ...ok])];
      const gained = p.fixed.length - before, k = dayKey();
      if (gained) p.fixedLog = { ...(p.fixedLog || {}), [k]: ((p.fixedLog || {})[k] || 0) + gained };
      p.updatedAt = Date.now(); practice = p;
      try { await api.savePractice(p); await refreshStars(); } catch (e) { toast("Kaydedilemedi: " + friendlyError(e), "bad"); }
      const left = boxItems().length;
      if (ok.length) confetti();
      app.innerHTML = `<div class="card result"><div class="big">${left ? "🔁" : "🏆"}</div>
        <h2>${ok.length}/${pool.length} soruyu düzelttin!</h2>${gained ? `<div class="levelup" style="margin:8px auto">+${gained * BOX_XP} XP kazandın! ⭐</div>` : ""}
        <p class="muted">${left ? `Kutunda <b>${left}</b> soru kaldı. Yanlış yaptıkların kutuda kalır, tekrar dene!` : "Tekrar kutun bomboş! Tüm yanlışlarını düzelttin. 🎉"}</p>
        <div class="row" style="justify-content:center;margin-top:18px">${left ? `<button class="btn gold" id="again">🔁 Devam et</button>` : ""}<button class="btn ghost" id="hm">🏠 Ana sayfa</button></div></div>`;
      $("#hm").onclick = showHome; if (left) $("#again").onclick = startBox;
    }
  });
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
    const awp = a.items.some((it) => it.type === "write") ? autoWritePoints(a, ans) : null;
    const r = computeResult(a, ans, awp);
    const sub = {
      assignmentId: id, uid: me.uid, grade: me.grade, section: me.section, no: me.no, name: me.name,
      week: a.week || 0, unit: a.unit, answers: ans, correct: r.correct, auto: r.auto, autoTotal: r.autoTotal,
      writeTotal: r.writeTotal, percent: r.percent, writingGraded: true, writingPoints: null, autoWP: awp,
      best: Math.max(r.percent, prev?.best ?? 0), attempts: (prev?.attempts || 0) + 1, submittedAt: Date.now()
    };
    app.innerHTML = `<div class="card result"><div class="big spin">⭐</div><p>Kaydediliyor…</p></div>`;
    try {
      await api.saveSubmission(sub);
      subs[id] = { ...prev, ...sub };
      await refreshStars();
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
    ${r.writeTotal ? `<p class="small"><span class="badge ok">Yazma bölümü otomatik puanlandı; öğretmenin puanı değiştirebilir.</span></p>` : ""}
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
    const wp = s.writingPoints?.[i] ?? s.autoWP?.[i];
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

async function onPlayed({ setId, mode, score, total, moves, pairs, ms, learned = [] }) {
  const lvBefore = xpNow().level;
  const p = practice || { uid: me.uid, grade: me.grade, section: me.section, games: 0, log: {}, best: {} };
  const k = dayKey();
  p.games = (p.games || 0) + 1;
  p.log = { ...(p.log || {}), [k]: ((p.log || {})[k] || 0) + 1 };
  const bk = `${setId}_${mode}`; p.best = { ...(p.best || {}), [bk]: Math.max(score, (p.best || {})[bk] ?? 0) };
  // Başarı kontrolü
  let ok = true, msg = "";
  if (mode === "quiz") {
    p.quizRight = (p.quizRight || 0) + score; p.quizTotal = (p.quizTotal || 0) + total;
    if (score / total < QUIZ_MIN_CORRECT) { ok = false; msg = `XP için en az ${Math.ceil(total * QUIZ_MIN_CORRECT)} doğru gerekiyor. Kartlarla çalışıp tekrar dene! 💪`; }
    else if (ms / total < QUIZ_MIN_MS) { ok = false; msg = "Çok hızlı bastın! Dinleyip düşünerek cevap verirsen XP kazanırsın. 🎧"; }
  }
  if (mode === "memory" && score < MEMORY_MIN_STARS) { ok = false; msg = `XP için en az ${MEMORY_MIN_STARS} yıldız gerekiyor; daha az hamlede bitirmeye çalış! 🧠`; }
  let newWords = 0;
  if (ok && learned.length) {
    const have = new Set(p.album || []); const add = learned.map(wordKey).filter((w) => w && !have.has(w));
    if (add.length) { newWords = add.length; p.album = [...have, ...add]; p.albumLog = { ...(p.albumLog || {}), [k]: ((p.albumLog || {})[k] || 0) + add.length }; }
  }
  const today = (p.xpLog || {})[k] || 0;
  const doneKeys = p.xpDay === k ? (p.xpKeys || []) : [];
  if (ok && doneKeys.includes(bk)) { ok = false; msg = "Bu oyundan bugün XP aldın. Başka bir set ya da oyun dene! 🔁"; }
  if (ok && today >= GAME_DAILY_XP_LIMIT) { ok = false; msg = `Bugünlük oyun XP'si tamam (${GAME_DAILY_XP_LIMIT}/${GAME_DAILY_XP_LIMIT}). Yarın yine gel! 🌙`; }
  if (ok) {
    p.xpGames = (p.xpGames || 0) + 1;
    p.xpLog = { ...(p.xpLog || {}), [k]: today + 1 };
    p.xpDay = k; p.xpKeys = [...doneKeys, bk];
    msg = `+2 XP kazandın! (Bugün ${today + 1}/${GAME_DAILY_XP_LIMIT})`;
  }
  p.updatedAt = Date.now();
  practice = p;
  try { await api.savePractice(p); } catch (e) { toast("Oyun kaydedilemedi: " + friendlyError(e), "bad"); }
  if (ok) confetti();
  refreshStars();
  if (xpNow().level > lvBefore) toast(`⬆️ LEVEL UP! Lv ${xpNow().level} · ${xpNow().name}`, "ok");
  if (newWords) msg += ` · 📒 Albümüne ${newWords} yeni kelime eklendi!`;
  return { xp: ok ? 2 : 0, msg };
}
