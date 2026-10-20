// Küçük arayüz yardımcıları
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function toast(msg, kind = "") {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
  t.textContent = msg; t.className = "show " + kind;
  clearTimeout(t._h); t._h = setTimeout(() => (t.className = ""), 2800);
}

export function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

export function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB"; u.rate = 0.85;
    const v = speechSynthesis.getVoices().find((v) => /en[-_]GB/i.test(v.lang)) || speechSynthesis.getVoices().find((v) => /^en/i.test(v.lang));
    if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch { toast("Bu cihazda ses çalınamıyor."); }
}

export function fmtDate(d) {
  if (!d) return "";
  const x = new Date(d);
  return isNaN(x) ? d : x.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
}

export function pctClass(p) { return p == null ? "" : p >= 85 ? "great" : p >= 70 ? "good" : p >= 50 ? "ok" : "low"; }

export function modal(html, { wide = false } = {}) {
  const w = document.createElement("div");
  w.className = "modal-back";
  w.innerHTML = `<div class="modal ${wide ? "wide" : ""}" role="dialog"><button class="modal-x" aria-label="Kapat">✕</button>${html}</div>`;
  document.body.appendChild(w);
  const close = () => w.remove();
  w.addEventListener("click", (e) => { if (e.target === w || e.target.classList.contains("modal-x")) close(); });
  return { el: w.querySelector(".modal"), close };
}

export function download(filename, text, type = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿" + text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
