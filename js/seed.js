// Hazır ödevler (öğretmen panelinden "Hazır ödevleri yükle" ile eklenir)
export const SEED_ASSIGNMENTS = [
  {
    grade: 5,
    unit: 2,
    week: 1,
    title: "Classroom Life — In Our Classroom",
    description: "Sınıf eşyaları, sınıf içi yönergeler ve 'Can I...?' ile izin isteme.",
    sections: [],
    dueDate: "",
    attempts: 2,
    items: [
      { type: "mcq", skill: "V", code: "ENG.5.2.V1", emoji: "📏", prompt: "What is this?", options: ["a ruler", "a rubber", "a pencil case", "a notebook"], answer: 0 },
      { type: "mcq", skill: "V", code: "ENG.5.2.V1", emoji: "✂️", prompt: "What is this?", options: ["glue", "scissors", "a board", "a desk"], answer: 1 },
      { type: "listen", skill: "L", audio: "Open your book, please.", prompt: "Listen and choose the picture.", options: ["📖 Open your book", "🚪 Close the door", "🪑 Sit down", "🙋 Raise your hand"], answer: 0 },
      { type: "listen", skill: "L", audio: "Can I borrow your pencil, please?", prompt: "Listen. What does the student want?", options: ["a pencil ✏️", "a bag 🎒", "a book 📘", "an apple 🍎"], answer: 0 },
      { type: "match", skill: "V", code: "ENG.5.2.V1", prompt: "Match the words with the pictures.", pairs: [{ l: "board", r: "🟩" }, { l: "bag", r: "🎒" }, { l: "book", r: "📘" }, { l: "pencil", r: "✏️" }] },
      { type: "tf", skill: "G", code: "ENG.5.2.G1", emoji: "🤫", prompt: "\"Be quiet, please!\" — The teacher wants silence.", answer: true },
      { type: "tf", skill: "G", code: "ENG.5.2.G1", emoji: "🧍", prompt: "\"Stand up!\" means \"Otur!\"", answer: false },
      { type: "fill", skill: "G", code: "ENG.5.2.G1", text: "Can I ___ out, teacher?", options: ["go", "sit", "open", "read"], answer: 0, prompt: "Choose the correct word." },
      { type: "fill", skill: "G", code: "ENG.5.2.G1", text: "— Can I use your rubber? — Yes, you ___.", options: ["can", "can't", "are", "do"], answer: 0, prompt: "Choose the correct word." },
      { type: "mcq", skill: "R", code: "ENG.5.2.R3", prompt: "Read: \"Hi, I'm Defne. My pencil case is blue. There are three pencils and a ruler in it.\" — What colour is Defne's pencil case?", options: ["red", "blue", "green", "yellow"], answer: 1 },
      { type: "mcq", skill: "R", code: "ENG.5.2.R2", prompt: "Classroom rule: 🚫📱 What does it mean?", options: ["Don't use your phone.", "Don't eat in class.", "Don't run.", "Don't shout."], answer: 0 },
      { type: "order", skill: "G", code: "ENG.5.2.G1", prompt: "Put the words in order.", words: ["Can", "I", "open", "the", "window?"] },
      { type: "order", skill: "G", code: "ENG.5.2.G1", prompt: "Put the words in order.", words: ["Please", "close", "your", "books."] },
      { type: "write", skill: "W", code: "ENG.5.2.W4", prompt: "Write 3 classroom rules. (Örnek: Listen to the teacher.)", minWords: 6, points: 3 }
    ]
  }
];
