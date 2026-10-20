// =============================================================
//  English with Betül Hoca — site ayarları
//  Firebase bilgileri boşsa site DEMO modunda çalışır
//  (veriler sadece o tarayıcıda tutulur, deneme amaçlıdır).
// =============================================================
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB9KWv5BFFQQLX7HHHg2CbktIr4x4hSqNw",
  authDomain: "english-with-betul-hoca.firebaseapp.com",
  projectId: "english-with-betul-hoca",
  storageBucket: "english-with-betul-hoca.firebasestorage.app",
  messagingSenderId: "906570797630",
  appId: "1:906570797630:web:54ccdbb894bfe8973d376f"
};

// Öğretmen paneline girebilecek e-posta adres(ler)i
export const TEACHER_EMAILS = ["betul-donmez@hotmail.com"];

// Öğrenci hesaplarının arka planda kullandığı sahte alan adı (değiştirmeyin)
export const STUDENT_DOMAIN = "ogrenci.ewbh.app";

export const SITE = {
  name: "English with Betül Hoca",
  school: "Kocatepe Ortaokulu",
  teacher: "Betül Dönmez",
  slogan: "Kocatepe fark yaratır"
};

export const DEMO = !FIREBASE_CONFIG.apiKey || new URLSearchParams(location.search).has("demo");
