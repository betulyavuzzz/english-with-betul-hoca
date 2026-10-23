// =============================================================
//  Veri katmanı: Firebase (gerçek) veya DEMO (tarayıcı içi)
// =============================================================
import { FIREBASE_CONFIG, TEACHER_EMAILS, STUDENT_DOMAIN, DEMO } from "./config.js?v=14";
import { DEFAULT_SETTINGS } from "./defaults.js?v=14";
import { SEED_ASSIGNMENTS, SEED_WORDSETS } from "./seed.js?v=14";

const PIN_PREFIX = "ewbh-";            // Firebase en az 6 karakter istiyor
const TR = { "İ": "i", "I": "i", "ı": "i", "Ç": "c", "ç": "c", "Ğ": "g", "ğ": "g", "Ö": "o", "ö": "o", "Ş": "s", "ş": "s", "Ü": "u", "ü": "u" };
const ascii = (x) => String(x).replace(/[İIıÇçĞğÖöŞşÜü]/g, (c) => TR[c]).toLowerCase();
export const studentKey = (grade, section, no) => ascii(`${grade}${section}-${String(no).trim()}`);
const studentEmail = (grade, section, no) => `${studentKey(grade, section, no)}@${STUDENT_DOMAIN}`;
export const newPin = () => String(Math.floor(1000 + Math.random() * 9000));
export const isDemo = DEMO;

function mergeSettings(s) {
  const d = structuredClone(DEFAULT_SETTINGS);
  if (!s) return d;
  return { ...d, ...s, units: { ...d.units, ...(s.units || {}) }, sections: { ...d.sections, ...(s.sections || {}) }, currentUnit: { ...d.currentUnit, ...(s.currentUnit || {}) } };
}

function friendlyError(e) {
  const c = e?.code || "";
  if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found") || c.includes("invalid-login"))
    return "Bilgiler hatalı. Sınıf, şube, numara ve şifreni kontrol et.";
  if (c.includes("too-many-requests")) return "Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.";
  if (c.includes("network")) return "İnternet bağlantısı yok gibi görünüyor.";
  if (c.includes("permission-denied")) return "Bu işlem için yetkin yok.";
  return e?.message || "Bir hata oluştu.";
}
export { friendlyError };

// -------------------------------------------------------------
//  DEMO arka ucu (localStorage)
// -------------------------------------------------------------
function demoBackend() {
  const KEY = "ewbh-demo-v1";
  const SKEY = "ewbh-demo-session";
  let listeners = [];
  const load = () => {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch {}
    if (!d) {
      d = { settings: mergeSettings(null), students: {}, assignments: {}, submissions: {}, feedback: {} };
      const names = ["Ali Yılmaz", "Ayşe Demir", "Mehmet Kaya", "Zeynep Çelik", "Emir Şahin", "Elif Arslan"];
      names.forEach((n, i) => {
        const uid = "demo-" + (i + 1);
        d.students[uid] = { uid, grade: 5, section: "A", no: String(101 + i), name: n, pin: "1234", key: studentKey(5, "A", 101 + i), scores: {} };
      });
      SEED_ASSIGNMENTS.forEach((a, i) => {
        const id = "seed-" + (i + 1);
        d.assignments[id] = { ...structuredClone(a), id, published: true, createdAt: Date.now() };
      });
      save(d);
    }
    d.profiles = d.profiles || {}; d.points = d.points || {}; d.classStats = d.classStats || {};
    d.practice = d.practice || {}; d.stars = d.stars || {};
    if (!d.wordsets) { d.wordsets = {}; SEED_WORDSETS.forEach((w, i) => (d.wordsets["ws-" + (i + 1)] = { ...structuredClone(w), id: "ws-" + (i + 1), published: true })); save(d); }
    return d;
  };
  const save = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} };
  const session = () => { try { return JSON.parse(sessionStorage.getItem(SKEY)); } catch { return null; } };
  const setSession = (s) => { try { s ? sessionStorage.setItem(SKEY, JSON.stringify(s)) : sessionStorage.removeItem(SKEY); } catch {} ; emit(); };
  const emit = () => { const s = current(); listeners.forEach((f) => f(s)); };
  const current = () => {
    const s = session();
    if (!s) return { role: null };
    const d = load();
    if (s.role === "student") { const st = d.students[s.uid]; return st ? { role: "student", uid: s.uid, student: st } : { role: null }; }
    const isAdmin = TEACHER_EMAILS.map((x) => x.toLowerCase()).includes(s.email.toLowerCase()) || !TEACHER_EMAILS.length || s.email === "admin";
    const t = (d.teachers || {})[s.email.toLowerCase()];
    return { role: "teacher", uid: "teacher", email: s.email, teacher: { admin: isAdmin || !t, sections: t?.sections || [], name: t?.name || "" } };
  };
  const id = () => Math.random().toString(36).slice(2, 10);

  return {
    async init() {},
    onAuth(cb) { listeners.push(cb); setTimeout(() => cb(current()), 0); },
    async studentLogin({ grade, section, no, pin }) {
      const d = load();
      const st = Object.values(d.students).find((s) => s.key === studentKey(grade, section, no));
      if (!st || st.pin !== String(pin)) throw { code: "auth/invalid-credential" };
      setSession({ role: "student", uid: st.uid });
    },
    async teacherLogin(email) { setSession({ role: "teacher", email }); },
    async listTeachers() { return Object.values(load().teachers || {}); },
    async saveTeacher(t) { const d = load(); d.teachers = d.teachers || {}; d.teachers[t.email] = t; save(d); },
    async deleteTeacher(email) { const d = load(); delete (d.teachers || {})[email]; save(d); },
    async teacherSignup(email) { setSession({ role: "teacher", email }); },
    async logout() { setSession(null); },
    async getSettings() { return mergeSettings(load().settings); },
    async saveSettings(s) { const d = load(); d.settings = s; save(d); },
    async listStudents(grade) { return Object.values(load().students).filter((s) => !grade || s.grade === grade); },
    async addStudents(list, onProgress) {
      const d = load(); const out = { added: [], skipped: [], failed: [] };
      for (const [i, s] of list.entries()) {
        const key = studentKey(s.grade, s.section, s.no);
        if (Object.values(d.students).some((x) => x.key === key)) out.skipped.push(s);
        else { const uid = "demo-" + id(); d.students[uid] = { ...s, uid, key, pin: newPin(), scores: {} }; out.added.push(d.students[uid]); }
        onProgress?.(i + 1, list.length);
      }
      save(d); return out;
    },
    async updateStudent(uid, patch) { const d = load(); Object.assign(d.students[uid], patch); save(d); },
    async resetPin(st) { const d = load(); const p = newPin(); d.students[st.uid].pin = p; save(d); return p; },
    async removeStudent(st) { const d = load(); delete d.students[st.uid]; save(d); },
    async listAssignments(grade, { publishedOnly = false } = {}) {
      return Object.values(load().assignments).filter((a) => (!grade || a.grade === grade) && (!publishedOnly || a.published))
        .sort((a, b) => (b.week || 0) - (a.week || 0) || (b.createdAt || 0) - (a.createdAt || 0));
    },
    async saveAssignment(a) { const d = load(); a.id = a.id || id(); a.createdAt = a.createdAt || Date.now(); d.assignments[a.id] = a; save(d); return a.id; },
    async deleteAssignment(aid) { const d = load(); delete d.assignments[aid]; save(d); },
    async mySubmissions(uid) { return Object.values(load().submissions).filter((s) => s.uid === uid); },
    async saveSubmission(sub) { const d = load(); sub.id = `${sub.assignmentId}_${sub.uid}`; d.submissions[sub.id] = { ...(d.submissions[sub.id] || {}), ...sub }; save(d); },
    async listSubmissions(grade) { return Object.values(load().submissions).filter((s) => !grade || s.grade === grade); },
    async setWritingPoints(subId, points) { const d = load(); d.submissions[subId].writingPoints = points; save(d); },
    async myFeedback(uid) { return Object.values(load().feedback).filter((f) => f.uid === uid); },
    async listFeedback(grade) { return Object.values(load().feedback).filter((f) => !grade || f.grade === grade); },
    async saveFeedback(f) { const d = load(); f.id = `${f.uid}_${f.week}`; f.updatedAt = Date.now(); d.feedback[f.id] = f; save(d); },
    async saveScore(uid, col, val) { const d = load(); d.students[uid].scores = { ...(d.students[uid].scores || {}), [col]: val }; save(d); },
    async getProfile(uid) { return load().profiles[uid] || null; },
    async saveProfile(p) { const d = load(); d.profiles[p.uid] = p; save(d); },
    async listProfiles(grade) { return Object.values(load().profiles).filter((p) => !grade || p.grade === grade); },
    async addPoint(pt) {
      const d = load(); const pid = id(); d.points[pid] = { ...pt, id: pid, at: Date.now() };
      const k = `${pt.grade}${pt.section}`; d.classStats[k] = { id: k, grade: pt.grade, section: pt.section, total: (d.classStats[k]?.total || 0) + pt.delta };
      save(d); return d.points[pid];
    },
    async deletePoint(pt) {
      const d = load(); delete d.points[pt.id];
      const k = `${pt.grade}${pt.section}`; if (d.classStats[k]) d.classStats[k].total -= pt.delta; save(d);
    },
    async myPoints(uid) { return Object.values(load().points).filter((p) => p.uid === uid); },
    async listPoints(grade) { return Object.values(load().points).filter((p) => !grade || p.grade === grade); },
    async listClassStats(grade) { return Object.values(load().classStats).filter((c) => c.grade === grade); },
    async listWordsets(grade, { publishedOnly = false } = {}) { return Object.values(load().wordsets).filter((w) => w.grade === grade && (!publishedOnly || w.published)).sort((a, b) => a.unit - b.unit); },
    async saveWordset(w) { const d = load(); w.id = w.id || id(); d.wordsets[w.id] = w; save(d); return w.id; },
    async deleteWordset(wid) { const d = load(); delete d.wordsets[wid]; save(d); },
    async getPractice(uid) { return load().practice[uid] || null; },
    async savePractice(p) { const d = load(); d.practice[p.uid] = p; save(d); },
    async listPractice(grade) { return Object.values(load().practice).filter((p) => p.grade === grade); },
    async saveWeekly(e) { const d = load(); d.weekly = d.weekly || {}; d.weekly[`${e.grade}${e.section}_${e.uid}`] = e; save(d); },
    async listWeekly(grade, section, week) { return Object.values(load().weekly || {}).filter((e) => e.grade === grade && e.section === section && e.week === week); },
    async resetDemo() { try { localStorage.removeItem(KEY); } catch {} setSession(null); }
  };
}

// -------------------------------------------------------------
//  FIREBASE arka ucu
// -------------------------------------------------------------
async function firebaseBackend() {
  const V = "10.12.2";
  const base = `https://www.gstatic.com/firebasejs/${V}`;
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`${base}/firebase-app.js`), import(`${base}/firebase-auth.js`), import(`${base}/firebase-firestore.js`)
  ]);
  const app = initializeApp(FIREBASE_CONFIG);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  // Öğrenci hesabı oluşturmak için ikinci (gizli) bağlantı: öğretmenin oturumu kapanmasın
  const helperApp = initializeApp(FIREBASE_CONFIG, "helper");
  const helperAuth = A.getAuth(helperApp);
  A.setPersistence(helperAuth, A.inMemoryPersistence);

  const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp } = F;
  const all = async (q) => (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() }));
  const isTeacherEmail = (e) => TEACHER_EMAILS.map((x) => x.toLowerCase()).includes((e || "").toLowerCase());
  let state = { role: null };

  return {
    async init() {},
    onAuth(cb) {
      A.onAuthStateChanged(auth, async (u) => {
        if (!u) { state = { role: null }; return cb(state); }
        const em = (u.email || "").toLowerCase();
        if (isTeacherEmail(em)) {
          let t = null; try { const td = await getDoc(doc(db, "teachers", em)); t = td.exists() ? td.data() : null; } catch {}
          state = { role: "teacher", uid: u.uid, email: em, teacher: { admin: true, sections: t?.sections || [], name: t?.name || "" } }; return cb(state);
        }
        if (!em.endsWith("@" + STUDENT_DOMAIN)) {
          try {
            const td = await getDoc(doc(db, "teachers", em));
            if (td.exists()) { state = { role: "teacher", uid: u.uid, email: em, teacher: { admin: false, ...td.data() } }; return cb(state); }
          } catch {}
          await A.signOut(auth); state = { role: null, notTeacher: true }; return cb(state);
        }
        try {
          const s = await getDoc(doc(db, "students", u.uid));
          state = s.exists() ? { role: "student", uid: u.uid, student: { uid: u.uid, ...s.data() } } : { role: null, orphan: true };
          if (!s.exists()) await A.signOut(auth);
        } catch { state = { role: null }; }
        cb(state);
      });
    },
    async studentLogin({ grade, section, no, pin }) {
      await A.signInWithEmailAndPassword(auth, studentEmail(grade, section, no), PIN_PREFIX + pin);
    },
    async teacherLogin(email, pw) { await A.signInWithEmailAndPassword(auth, email.trim().toLowerCase(), pw); },
    async teacherSignup(email, pw) { await A.createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), pw); },
    async listTeachers() { return all(collection(db, "teachers")); },
    async saveTeacher(t) { await setDoc(doc(db, "teachers", t.email), t); },
    async deleteTeacher(email) { await deleteDoc(doc(db, "teachers", email)); },
    async logout() { await A.signOut(auth); },
    async getSettings() {
      try { const s = await getDoc(doc(db, "settings", "site")); return mergeSettings(s.exists() ? s.data() : null); }
      catch { return mergeSettings(null); }
    },
    async saveSettings(s) { await setDoc(doc(db, "settings", "site"), s); },
    async listStudents(grade) {
      const r = grade ? await all(query(collection(db, "students"), where("grade", "==", grade))) : await all(collection(db, "students"));
      return r.map((s) => ({ ...s, uid: s.id }));
    },
    async addStudents(list, onProgress) {
      const existing = new Set((await this.listStudents()).map((s) => s.key));
      const out = { added: [], skipped: [], failed: [], stoppedForLimit: false };
      for (const [i, s] of list.entries()) {
        const key = studentKey(s.grade, s.section, s.no);
        if (existing.has(key)) { out.skipped.push(s); onProgress?.(i + 1, list.length); continue; }
        const pin = newPin();
        try {
          const cred = await A.createUserWithEmailAndPassword(helperAuth, studentEmail(s.grade, s.section, s.no), PIN_PREFIX + pin);
          const st = { grade: s.grade, section: s.section, no: String(s.no), name: s.name, key, pin, scores: {} };
          await setDoc(doc(db, "students", cred.user.uid), st);
          await A.signOut(helperAuth);
          out.added.push({ uid: cred.user.uid, ...st }); existing.add(key);
        } catch (e) {
          if ((e.code || "").includes("too-many-requests") || (e.code || "").includes("quota")) {
            out.stoppedForLimit = true; out.failed.push(...list.slice(i).map((x) => ({ ...x, reason: "Saatlik limit" }))); break;
          }
          out.failed.push({ ...s, reason: e.code === "auth/email-already-in-use" ? "Hesap zaten var (önceki yarım kalmış kayıt)" : friendlyError(e) });
        }
        onProgress?.(i + 1, list.length);
      }
      return out;
    },
    async updateStudent(uid, patch) { await updateDoc(doc(db, "students", uid), patch); },
    async resetPin(st) {
      const p = newPin();
      const cred = await A.signInWithEmailAndPassword(helperAuth, studentEmail(st.grade, st.section, st.no), PIN_PREFIX + st.pin);
      await A.updatePassword(cred.user, PIN_PREFIX + p);
      await A.signOut(helperAuth);
      await updateDoc(doc(db, "students", st.uid), { pin: p });
      return p;
    },
    async removeStudent(st) {
      try {
        const cred = await A.signInWithEmailAndPassword(helperAuth, studentEmail(st.grade, st.section, st.no), PIN_PREFIX + st.pin);
        await A.deleteUser(cred.user);
      } catch {}
      await deleteDoc(doc(db, "students", st.uid));
    },
    async listAssignments(grade, { publishedOnly = false } = {}) {
      const cs = [collection(db, "assignments")];
      if (grade) cs.push(where("grade", "==", grade));
      if (publishedOnly) cs.push(where("published", "==", true));
      const r = await all(query(...cs));
      return r.sort((a, b) => (b.week || 0) - (a.week || 0) || (b.createdAt || 0) - (a.createdAt || 0));
    },
    async saveAssignment(a) {
      const ref = a.id ? doc(db, "assignments", a.id) : doc(collection(db, "assignments"));
      const data = { ...a, id: ref.id, createdAt: a.createdAt || Date.now() };
      await setDoc(ref, data); return ref.id;
    },
    async deleteAssignment(id) { await deleteDoc(doc(db, "assignments", id)); },
    async mySubmissions(uid) { return all(query(collection(db, "submissions"), where("uid", "==", uid))); },
    async saveSubmission(sub) {
      const id = `${sub.assignmentId}_${sub.uid}`;
      await setDoc(doc(db, "submissions", id), { ...sub, id, updatedAt: serverTimestamp() }, { merge: true });
    },
    async listSubmissions(grade) {
      return grade ? all(query(collection(db, "submissions"), where("grade", "==", grade))) : all(collection(db, "submissions"));
    },
    async setWritingPoints(subId, points) { await updateDoc(doc(db, "submissions", subId), { writingPoints: points }); },
    async myFeedback(uid) { return all(query(collection(db, "feedback"), where("uid", "==", uid))); },
    async listFeedback(grade) {
      return grade ? all(query(collection(db, "feedback"), where("grade", "==", grade))) : all(collection(db, "feedback"));
    },
    async saveFeedback(f) { const id = `${f.uid}_${f.week}`; await setDoc(doc(db, "feedback", id), { ...f, id, updatedAt: Date.now() }); },
    async saveScore(uid, col, val) { await updateDoc(doc(db, "students", uid), new F.FieldPath("scores", col), val); },
    async getProfile(uid) { const s = await getDoc(doc(db, "profiles", uid)); return s.exists() ? s.data() : null; },
    async saveProfile(p) { await setDoc(doc(db, "profiles", p.uid), p); },
    async listProfiles(grade) { return all(query(collection(db, "profiles"), where("grade", "==", grade))); },
    async addPoint(pt) {
      const ref = doc(collection(db, "points"));
      const data = { ...pt, id: ref.id, at: Date.now() };
      const b = F.writeBatch(db);
      b.set(ref, data);
      b.set(doc(db, "classStats", `${pt.grade}${pt.section}`), { grade: pt.grade, section: pt.section, total: F.increment(pt.delta) }, { merge: true });
      await b.commit(); return data;
    },
    async deletePoint(pt) {
      const b = F.writeBatch(db);
      b.delete(doc(db, "points", pt.id));
      b.set(doc(db, "classStats", `${pt.grade}${pt.section}`), { total: F.increment(-pt.delta) }, { merge: true });
      await b.commit();
    },
    async myPoints(uid) { return all(query(collection(db, "points"), where("uid", "==", uid))); },
    async listPoints(grade) { return all(query(collection(db, "points"), where("grade", "==", grade))); },
    async listClassStats(grade) { return all(query(collection(db, "classStats"), where("grade", "==", grade))); },
    async listWordsets(grade, { publishedOnly = false } = {}) {
      const cs = [collection(db, "wordsets"), where("grade", "==", grade)];
      if (publishedOnly) cs.push(where("published", "==", true));
      return (await all(query(...cs))).sort((a, b) => a.unit - b.unit);
    },
    async saveWordset(w) { const ref = w.id ? doc(db, "wordsets", w.id) : doc(collection(db, "wordsets")); await setDoc(ref, { ...w, id: ref.id }); return ref.id; },
    async deleteWordset(id) { await deleteDoc(doc(db, "wordsets", id)); },
    async getPractice(uid) { const s = await getDoc(doc(db, "practice", uid)); return s.exists() ? s.data() : null; },
    async savePractice(p) { await setDoc(doc(db, "practice", p.uid), p); },
    async listPractice(grade) { return all(query(collection(db, "practice"), where("grade", "==", grade))); },
    async saveWeekly(e) { await setDoc(doc(db, "weekly", `${e.grade}${e.section}_${e.uid}`), e); },
    async listWeekly(grade, section, week) { return all(query(collection(db, "weekly"), where("grade", "==", grade), where("section", "==", section), where("week", "==", week))); }
  };
}

export const api = DEMO ? demoBackend() : await firebaseBackend();
