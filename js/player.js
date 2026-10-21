// Etkinlik oynatıcı ve puanlama
import { esc, shuffle, speak } from "./ui.js?v=9";

export const itemPoints = (it) => (it.type === "write" ? Number(it.points || 3) : Number(it.points || 1));

export function scoreItem(it, ans) {
  if (ans == null) return 0;
  switch (it.type) {
    case "mcq": case "listen": case "fill": return ans === it.answer ? 1 : 0;
    case "tf": return ans === it.answer ? 1 : 0;
    case "match": { const n = it.pairs.length; let c = 0; for (let i = 0; i < n; i++) if (ans[i] === i) c++; return c / n; }
    case "order": return norm(ans.join(" ")) === norm(it.words.join(" ")) ? 1 : 0;
    default: return 0;
  }
}
const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function computeResult(a, answers, writingPoints = null) {
  let auto = 0, autoTotal = 0, writeTotal = 0;
  const correct = a.items.map((it, i) => {
    if (it.type === "write") { writeTotal += itemPoints(it); return null; }
    const s = scoreItem(it, answers[i]) * itemPoints(it);
    auto += s; autoTotal += itemPoints(it); return Math.round((s / itemPoints(it)) * 100) / 100;
  });
  const wp = writingPoints ? Object.values(writingPoints).reduce((x, y) => x + Number(y || 0), 0) : 0;
  const writingGraded = writeTotal === 0 || (writingPoints && a.items.every((it, i) => it.type !== "write" || writingPoints[i] != null));
  const total = autoTotal + writeTotal;
  const percent = writingGraded ? Math.round(((auto + wp) / (total || 1)) * 100) : Math.round((auto / (autoTotal || 1)) * 100);
  return { correct, auto: Math.round(auto * 100) / 100, autoTotal, writeTotal, percent, writingGraded };
}

// Soru metni (öğretmen incelemesi ve önizleme için)
export function itemSummary(it) {
  if (it.type === "fill") return `${it.text}`;
  if (it.type === "listen") return `🔊 "${it.audio}" — ${it.prompt}`;
  return `${it.emoji ? it.emoji + " " : ""}${it.prompt || ""}`;
}
export function answerText(it, ans) {
  if (ans == null || ans === "") return "—";
  switch (it.type) {
    case "mcq": case "listen": case "fill": return it.options[ans] ?? "—";
    case "tf": return ans ? "True" : "False";
    case "match": return it.pairs.map((p, i) => `${p.l} → ${it.pairs[ans[i]]?.r ?? "?"}`).join(", ");
    case "order": return ans.join(" ");
    case "write": return ans;
  }
}
export function correctText(it) {
  switch (it.type) {
    case "mcq": case "listen": case "fill": return it.options[it.answer];
    case "tf": return it.answer ? "True" : "False";
    case "match": return it.pairs.map((p) => `${p.l} → ${p.r}`).join(", ");
    case "order": return it.words.join(" ");
    default: return "";
  }
}

// ---------------------------------------------------------------
//  Oynatıcı: root içine ödevi soru soru çizer; bitince onFinish(answers)
// ---------------------------------------------------------------
export function play(root, a, { onFinish, onExit, practice = false }) {
  const answers = new Array(a.items.length).fill(null);
  let idx = 0;
  let checked = false;

  function frame(inner, canCheck) {
    const pct = Math.round((idx / a.items.length) * 100);
    root.innerHTML = `
      <div class="player">
        <div class="player-top">
          <button class="btn ghost sm" data-exit>✕ Çık</button>
          <div class="pbar"><span style="width:${pct}%"></span></div>
          <div class="pcount">${idx + 1}/${a.items.length}</div>
        </div>
        <div class="qcard">${inner}</div>
        <div class="player-foot">
          <div class="fb" aria-live="polite"></div>
          <button class="btn gold lg" data-next ${canCheck ? "" : "disabled"}>Kontrol et</button>
        </div>
      </div>`;
    root.querySelector("[data-exit]").onclick = () => { if (confirm("Ödevden çıkmak istiyor musun? Cevapların kaydedilmez.")) onExit?.(); };
    root.querySelector("[data-next]").onclick = next;
    checked = false;
  }
  const enable = (on = true) => { const b = root.querySelector("[data-next]"); if (b) b.disabled = !on; };

  function next() {
    const it = a.items[idx];
    const btn = root.querySelector("[data-next]");
    if (!checked) {
      checked = true;
      root.querySelector(".qcard").classList.add("locked");
      const fb = root.querySelector(".fb");
      if (it.type === "write") {
        fb.innerHTML = `<span class="fb-ok">✍️ Cevabın kaydedildi. Öğretmenin puanlayacak.</span>`;
      } else {
        const s = scoreItem(it, answers[idx]);
        if (s === 1) fb.innerHTML = `<span class="fb-ok">${pick(["Great job!", "Excellent!", "Well done!", "Super!", "Perfect!"])} 🎉</span>`;
        else fb.innerHTML = `<span class="fb-no">${s > 0 ? "Neredeyse!" : "Oops!"} Doğru cevap: <b>${esc(correctText(it))}</b></span>`;
        markCorrect(it);
      }
      btn.textContent = idx === a.items.length - 1 ? "Bitir ✓" : "Devam →";
      btn.disabled = false;
      return;
    }
    idx++;
    if (idx >= a.items.length) return onFinish(answers);
    render();
  }
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function markCorrect(it) {
    const card = root.querySelector(".qcard");
    if (["mcq", "listen", "fill", "tf"].includes(it.type)) {
      card.querySelectorAll("[data-v]").forEach((b) => {
        const v = it.type === "tf" ? b.dataset.v === "true" : Number(b.dataset.v);
        if (v === it.answer) b.classList.add("right");
        else if (b.classList.contains("sel")) b.classList.add("wrong");
      });
    }
    if (it.type === "match") {
      card.querySelectorAll(".mleft").forEach((b) => b.classList.add(answers[idx][Number(b.dataset.i)] === Number(b.dataset.i) ? "right" : "wrong"));
    }
    if (it.type === "order") card.querySelector(".order-ans").classList.add(scoreItem(it, answers[idx]) ? "right" : "wrong");
  }

  function render() {
    const it = a.items[idx];
    const head = (txt) => `<div class="qprompt">${it.emoji ? `<div class="qemoji">${it.emoji}</div>` : ""}<p>${esc(txt)}</p></div>`;
    if (it.type === "mcq" || it.type === "listen" || it.type === "fill") {
      const order = shuffle(it.options.map((_, i) => i));
      let top = head(it.prompt || "");
      if (it.type === "listen") top = `<div class="qprompt"><button class="listen-btn" data-say>🔊</button><p>${esc(it.prompt || "Listen and choose.")}</p><button class="btn ghost sm" data-slow>🐢 Yavaş dinle</button></div>`;
      if (it.type === "fill") top = `<div class="qprompt"><p class="small">${esc(it.prompt || "Choose the correct word.")}</p><p class="fill-text">${esc(it.text).replace("___", '<span class="blank">____</span>')}</p></div>`;
      frame(`${top}<div class="opts">${order.map((i) => `<button class="opt" data-v="${i}">${esc(it.options[i])}</button>`).join("")}</div>`, false);
      const card = root.querySelector(".qcard");
      card.querySelectorAll(".opt").forEach((b) => b.onclick = () => {
        if (checked) return;
        card.querySelectorAll(".opt").forEach((x) => x.classList.remove("sel"));
        b.classList.add("sel"); answers[idx] = Number(b.dataset.v); enable();
        if (it.type === "fill") card.querySelector(".blank").textContent = it.options[answers[idx]];
      });
      if (it.type === "listen") {
        card.querySelector("[data-say]").onclick = () => speak(it.audio);
        card.querySelector("[data-slow]").onclick = () => { const u = new SpeechSynthesisUtterance(it.audio); u.lang = "en-GB"; u.rate = 0.6; speechSynthesis.cancel(); speechSynthesis.speak(u); };
        setTimeout(() => speak(it.audio), 400);
      }
    } else if (it.type === "tf") {
      frame(`${head(it.prompt)}<div class="opts two"><button class="opt tf" data-v="true">👍 True</button><button class="opt tf" data-v="false">👎 False</button></div>`, false);
      const card = root.querySelector(".qcard");
      card.querySelectorAll(".opt").forEach((b) => b.onclick = () => {
        if (checked) return;
        card.querySelectorAll(".opt").forEach((x) => x.classList.remove("sel"));
        b.classList.add("sel"); answers[idx] = b.dataset.v === "true"; enable();
      });
    } else if (it.type === "match") {
      const rights = shuffle(it.pairs.map((_, i) => i));
      answers[idx] = new Array(it.pairs.length).fill(null);
      frame(`${head(it.prompt || "Match.")}<div class="match">
        <div class="mcol">${it.pairs.map((p, i) => `<button class="mleft" data-i="${i}">${esc(p.l)}</button>`).join("")}</div>
        <div class="mcol">${rights.map((j) => `<button class="mright" data-j="${j}">${esc(it.pairs[j].r)}</button>`).join("")}</div>
      </div><p class="hint">Önce soldan bir kelimeye, sonra sağdan eşine dokun.</p>`, false);
      const card = root.querySelector(".qcard");
      const colors = ["c1", "c2", "c3", "c4", "c5", "c6"];
      let selL = null;
      const paint = () => {
        card.querySelectorAll(".mleft,.mright").forEach((b) => b.className = b.className.replace(/\bc\d\b/g, "").replace(/\bsel\b/g, "").trim());
        answers[idx].forEach((j, i) => {
          if (j == null) return;
          card.querySelector(`.mleft[data-i="${i}"]`).classList.add(colors[i % 6]);
          card.querySelector(`.mright[data-j="${j}"]`).classList.add(colors[i % 6]);
        });
        if (selL != null) card.querySelector(`.mleft[data-i="${selL}"]`).classList.add("sel");
        enable(answers[idx].every((x) => x != null));
      };
      card.querySelectorAll(".mleft").forEach((b) => b.onclick = () => { if (checked) return; selL = Number(b.dataset.i); answers[idx][selL] = null; paint(); });
      card.querySelectorAll(".mright").forEach((b) => b.onclick = () => {
        if (checked || selL == null) return;
        const j = Number(b.dataset.j);
        answers[idx] = answers[idx].map((x) => (x === j ? null : x));
        answers[idx][selL] = j; selL = null; paint();
      });
    } else if (it.type === "order") {
      const pool = shuffle(it.words.map((w, i) => ({ w, i })));
      answers[idx] = [];
      frame(`${head(it.prompt || "Put the words in order.")}<div class="order-ans" aria-label="Cümlen"></div><div class="order-pool"></div><p class="hint">Kelimelere sırayla dokun. Geri almak için üstteki kelimeye dokun.</p>`, false);
      const card = root.querySelector(".qcard");
      const used = new Set();
      const draw = () => {
        card.querySelector(".order-ans").innerHTML = answers[idx].length ? answers[idx].map((w, k) => `<button class="chip on" data-k="${k}">${esc(w)}</button>`).join("") : `<span class="ph">Cümlen burada oluşacak…</span>`;
        card.querySelector(".order-pool").innerHTML = pool.map((p) => `<button class="chip" data-i="${p.i}" ${used.has(p.i) ? "disabled" : ""}>${esc(p.w)}</button>`).join("");
        card.querySelectorAll(".order-pool .chip").forEach((b) => b.onclick = () => { if (checked) return; const i = Number(b.dataset.i); used.add(i); answers[idx].push(it.words[i]); answers[idx]._ids = [...(answers[idx]._ids || []), i]; draw(); });
        card.querySelectorAll(".order-ans .chip").forEach((b) => b.onclick = () => { if (checked) return; const k = Number(b.dataset.k); const ids = answers[idx]._ids; used.delete(ids[k]); ids.splice(k, 1); answers[idx].splice(k, 1); answers[idx]._ids = ids; draw(); });
        enable(answers[idx].length === it.words.length);
      };
      draw();
    } else if (it.type === "write") {
      frame(`${head(it.prompt)}<textarea class="write" rows="6" placeholder="Write here… (İngilizce yaz)"></textarea><div class="wc">0 kelime</div>`, false);
      const ta = root.querySelector("textarea");
      ta.oninput = () => {
        const n = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
        root.querySelector(".wc").textContent = `${n} kelime${it.minWords ? ` (en az ${it.minWords})` : ""}`;
        answers[idx] = ta.value; enable(n >= (it.minWords || 1));
      };
    }
  }
  render();
}
