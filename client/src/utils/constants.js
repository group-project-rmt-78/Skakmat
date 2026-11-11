export const DIFFICULTIES = [
  { value: "BEGINNER", label: "Beginner", hint: "Sering salah langkah" },
  { value: "EASY", label: "Easy", hint: "Taktik dasar" },
  { value: "MEDIUM", label: "Medium", hint: "Seimbang" },
  { value: "HARD", label: "Hard", hint: "Taktik dan posisi kuat" },
  { value: "EXPERT", label: "Expert", hint: "Stockfish penuh" },
];

export const TIME_CONTROLS = [
  { value: 60, label: "1 min" },
  { value: 180, label: "3 min" },
  { value: 300, label: "5 min" },
  { value: 600, label: "10 min" },
  { value: null, label: "Unlimited" },
];

export const difficultyLabel = (value) =>
  DIFFICULTIES.find((d) => d.value === value)?.label ?? value;
