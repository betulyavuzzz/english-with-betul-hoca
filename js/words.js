// Kelime kartları, hafıza oyunu, dinle-seç
import { esc, shuffle, speak } from "./ui.js?v=5";

export function wordsHome(root, sets, practice, onPlayed, units = []) {
  if (!sets.length) { root.innerHTML = `<div class="card empty"><div class="big">🃏</div><p>Öğretmenin kelime seti ekleyince burada oyun oynayabileceksin.</p></div>`; return; }
  const best = practice?.best || {};
  root.innerHTML = `<p class="muted" style="margin-top:0">Bir kelime seti seç, kartlarla çalış ya da oyun oyna. Her bitirdiğin oyun <b>+2 XP</b>! 🎮</p>
    <div class="grid g2">${sets.map((w, i) => `<div class="wset" style="--wc:${["#ff6a88", "#4cc9f0", "#43aa8b", "#f6a04d", "#9d4edd", "#e63946"][i % 6]}">
      <div class="wset-top"><span class="wset-e">${esc(w.words[0]?.e || "🃏")}</span><div><b>${esc(w.title)}</b><small>Ünite ${w.unit}${units[w.unit - 1] ? " · " + esc(units[w.unit - 1]) : ""} · ${w.words.length} kelime</small></div></div>
      <div class="wset-btns">
        <button class="wbtn" data-m="cards" data-w="${w.id}">🃏<span>Kartlar</span></button>
        <button class="wbtn" data-m="memory" data-w="${w.id}">🧠<span>Hafıza</span>${best[w.id + "_memory"] ? `<i>⭐${best[w.id + "_memory"]}</i>` : ""}</button>
        <button class="wbtn" data-m="quiz" data-w="${w.id}">🎧<span>Dinle-Seç</span>${best[w.id + "_quiz"] != null ? `<i>${best[w.id + "_quiz"]}/8</i>` : ""}</button>
      </div></div>`).join("")}</div>`;
  root.querySelectorAll("[data-m]").forEach((b) => b.onclick = () => {
    const w = sets.find((x) => x.id === b.dataset.w);
    const back = () => wordsHome(root, sets, practice, onPlayed, units);
    ({ cards, memory, quiz })[b.dataset.m](root, w, back, onPlayed);
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function head(w, title, back) {
  return `<div class="row between" style="margin-bottom:12px"><h3 style="margin:0">${title} · <span class="muted">${esc(w.title)}</span></h3><button class="btn ghost sm" data-back>← Setler</button></div>`;
}

function cards(root, w, back) {
  let i = 0, flipped = false; const order = shuffle(w.words);
  const draw = () => {
    const x = order[i];
    root.innerHTML = head(w, "🃏 Kartlar", back) + `
      <div class="fcard ${flipped ? "flip" : ""}" id="fc"><div class="fc-in">
        <div class="fc-f"><div class="fc-e">${esc(x.e || "")}</div><div class="fc-w">${esc(x.en)}</div><small>Çevirmek için dokun</small></div>
        <div class="fc-b"><div class="fc-e">${esc(x.e || "")}</div><div class="fc-w">${esc(x.tr)}</div><small>${esc(x.en)}</small></div>
      </div></div>
      <div class="row" style="justify-content:center;margin-top:16px">
        <button class="btn ghost" id="pv" ${i === 0 ? "disabled" : ""}>←</button>
        <button class="btn gold" id="sp">🔊 Dinle</button>
        <span class="pcount">${i + 1}/${order.length}</span>
        <button class="btn ghost" id="nx">${i === order.length - 1 ? "🔀 Baştan" : "→"}</button>
      </div>`;
    root.querySelector("[data-back]").onclick = back;
    root.querySelector("#fc").onclick = () => { flipped = !flipped; root.querySelector("#fc").classList.toggle("flip", flipped); };
    root.querySelector("#sp").onclick = () => speak(x.en);
    root.querySelector("#pv").onclick = () => { i--; flipped = false; draw(); };
    root.querySelector("#nx").onclick = () => { if (i === order.length - 1) { i = 0; order.sort(() => Math.random() - .5); } else i++; flipped = false; draw(); };
    speak(x.en);
  };
  draw();
}

function memory(root, w, back, onPlayed) {
  const pick = shuffle(w.words).slice(0, Math.min(6, w.words.length));
  const deck = shuffle(pick.flatMap((x, k) => [{ k, t: "en", v: x.en }, { k, t: "pic", v: (x.e ? x.e + " " : "") + x.tr }]));
  let open = [], matched = new Set(), moves = 0, lock = false; const t0 = Date.now();
  const draw = () => {
    root.innerHTML = head(w, "🧠 Hafıza oyunu", back) + `<p class="small muted center" style="margin-top:-4px">İngilizce kelimeyi anlamıyla eşleştir · Hamle: <b>${moves}</b></p>
      <div class="mem">${deck.map((c, i) => `<button class="mc ${open.includes(i) || matched.has(c.k) ? "up" : ""} ${matched.has(c.k) ? "ok" : ""} ${c.t}" data-i="${i}"><span class="mc-back">?</span><span class="mc-front">${esc(c.v)}</span></button>`).join("")}</div>`;
    root.querySelector("[data-back]").onclick = back;
    root.querySelectorAll(".mc").forEach((b) => b.onclick = () => {
      const i = Number(b.dataset.i); const c = deck[i];
      if (lock || open.includes(i) || matched.has(c.k)) return;
      open.push(i); if (c.t === "en") speak(c.v);
      if (open.length === 2) {
        moves++; const [a, bb] = open.map((j) => deck[j]);
        if (a.k === bb.k && a.t !== bb.t) { matched.add(a.k); open = []; draw(); if (matched.size === pick.length) setTimeout(done, 400); return; }
        lock = true; draw(); setTimeout(() => { open = []; lock = false; draw(); }, 900); return;
      }
      draw();
    });
  };
  const done = () => {
    const sec = Math.round((Date.now() - t0) / 1000);
    const stars = moves <= pick.length + 2 ? 3 : moves <= pick.length * 2 ? 2 : 1;
    root.innerHTML = `<div class="card result"><div class="big">${"⭐".repeat(stars)}</div><h2>Well done!</h2><p>${moves} hamlede, ${sec} saniyede bitirdin.</p><p class="badge ok">+2 XP</p>
      <div class="row" style="justify-content:center;margin-top:14px"><button class="btn ghost" id="ag">🔁 Tekrar</button><button class="btn gold" id="bk">← Setler</button></div></div>`;
    root.querySelector("#ag").onclick = () => memory(root, w, back, onPlayed);
    root.querySelector("#bk").onclick = back;
    onPlayed?.({ setId: w.id, mode: "memory", score: stars });
  };
  draw();
}

function quiz(root, w, back, onPlayed) {
  const qs = shuffle(w.words).slice(0, Math.min(8, w.words.length));
  let i = 0, score = 0;
  const draw = () => {
    const x = qs[i];
    const opts = shuffle([x, ...shuffle(w.words.filter((y) => y !== x)).slice(0, 3)]);
    root.innerHTML = head(w, "🎧 Dinle-Seç", back) + `<div class="qcard"><div class="qprompt"><button class="listen-btn" id="ls">🔊</button><p>Duyduğun kelimenin anlamı ne?</p><p class="small">${i + 1}/${qs.length} · Puan: ${score}</p></div>
      <div class="opts">${opts.map((o) => `<button class="opt" data-ok="${o === x ? 1 : 0}">${esc((o.e ? o.e + " " : "") + o.tr)}</button>`).join("")}</div></div>`;
    root.querySelector("[data-back]").onclick = back;
    root.querySelector("#ls").onclick = () => speak(x.en);
    setTimeout(() => speak(x.en), 300);
    root.querySelectorAll(".opt").forEach((b) => b.onclick = () => {
      root.querySelectorAll(".opt").forEach((o) => { o.disabled = true; if (o.dataset.ok === "1") o.classList.add("right"); });
      if (b.dataset.ok === "1") score++; else b.classList.add("wrong");
      setTimeout(() => { i++; i < qs.length ? draw() : done(); }, 900);
    });
  };
  const done = () => {
    root.innerHTML = `<div class="card result"><div class="big">${score >= qs.length - 1 ? "🏆" : score >= qs.length / 2 ? "🌟" : "💪"}</div><h2>${score}/${qs.length}</h2><p class="badge ok">+2 XP</p>
      <div class="row" style="justify-content:center;margin-top:14px"><button class="btn ghost" id="ag">🔁 Tekrar</button><button class="btn gold" id="bk">← Setler</button></div></div>`;
    root.querySelector("#ag").onclick = () => quiz(root, w, back, onPlayed);
    root.querySelector("#bk").onclick = back;
    onPlayed?.({ setId: w.id, mode: "quiz", score });
  };
  draw();
}
