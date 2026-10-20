// Varsayılan site ayarları (öğretmen panelindeki Ayarlar'dan değiştirilebilir)
// Ünite adları Türkiye Yüzyılı Maarif Modeli İngilizce programındaki temalardır.
export const DEFAULT_SETTINGS = {
  activeGrades: [5],
  sections: { 5: ["A", "B", "C", "D", "E"], 6: ["A", "B", "C", "D", "E"], 7: ["A", "B", "C", "D", "E"], 8: ["A", "B", "C", "D", "E"] },
  currentUnit: { 5: 2, 6: 1, 7: 1, 8: 1 },
  units: {
    5: ["School Life", "Classroom Life", "Personal Life", "Family Life", "Life in the Neighbourhood & City", "Life in the World", "Life in Nature", "Life in the Universe & Future"],
    6: ["School Life", "Classroom Life", "Personal Life", "Family Life", "Life in the Neighbourhood & City", "Life in the World & Culture", "Life in Nature & Global Problems", "Life in the Universe & Future"],
    7: ["School Life & Education", "Classroom Life & Learning", "Personal Life & Well-being", "Family Life & Home", "Neighbourhood, City & Social Life", "Life in the World & Culture", "Life in Nature", "Life in the Universe & Future"],
    8: ["School Life & Education", "Classroom Life & Learning", "Personal Life & Well-being", "Family Life & Home", "Neighbourhood, City & Social Life", "Life in the World & Culture", "Life in Nature & Global Problems", "Life in the Universe & Future"]
  },
  // Not defterindeki elle girilen sütunlar
  gradeColumns: ["Performans 1", "Performans 2", "Proje"],
  defaultAttempts: 2
};

// Beceri kodları (TYMM öğrenme çıktısı kodlarının son kısmı)
export const SKILLS = {
  V: "Kelime bilgisi",
  G: "Dil bilgisi",
  R: "Okuma",
  L: "Dinleme",
  W: "Yazma",
  S: "Konuşma"
};

export const ITEM_TYPES = {
  mcq: "Çoktan seçmeli",
  listen: "Dinle ve seç",
  tf: "Doğru / Yanlış",
  fill: "Boşluk doldurma",
  match: "Eşleştirme",
  order: "Cümle kurma",
  write: "Yazma (öğretmen puanlar)"
};

export const COMMENT_TEMPLATES = [
  "Harika bir hafta geçirdin, aynen devam! 🌟",
  "Ödevini zamanında yaptığın için teşekkürler.",
  "Kelimeleri tekrar etmeni öneririm, sesli okumayı dene.",
  "Dinleme sorularında çok iyisin!",
  "Yazma bölümünde cümlelerini daha uzun kurmayı dene.",
  "Bu hafta ödevini kaçırdın, bir sonrakinde seni bekliyorum.",
  "Derste daha çok söz alırsan çok sevinirim."
];
