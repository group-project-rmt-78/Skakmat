/** Label dan warna berdasarkan skor langkah (0-100). */
export function accuracyTone(accuracy) {
  if (accuracy >= 90) return { label: "Sangat baik", text: "text-accent", bar: "bg-accent" };
  if (accuracy >= 70) return { label: "Baik", text: "text-lime-400", bar: "bg-lime-400" };
  if (accuracy >= 50) return { label: "Kurang tepat", text: "text-yellow-400", bar: "bg-yellow-400" };
  return { label: "Kesalahan", text: "text-danger", bar: "bg-danger" };
}
