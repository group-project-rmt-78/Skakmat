import { Link } from "react-router-dom";
import { Cpu, SlidersHorizontal, Timer } from "lucide-react";

const features = [
  {
    icon: Cpu,
    title: "Real Stockfish Engine",
    text: "Lawan engine catur sungguhan, bukan langkah acak.",
  },
  {
    icon: SlidersHorizontal,
    title: "5 Difficulty Levels",
    text: "Dari Beginner sampai Expert dengan perilaku engine yang berbeda.",
  },
  {
    icon: Timer,
    title: "Chess Clock",
    text: "Pilih kontrol waktu dari 1 sampai 10 menit, atau tanpa batas.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="py-20 text-center sm:py-28">
        <p className="mb-4 text-xs uppercase tracking-[0.25em] text-accent">
          Think Better. Play Smarter.
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-neutral-50 sm:text-6xl">
          SKAKMAT
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-neutral-400">
          Platform catur single-player. Mainkan partai penuh melawan AI Stockfish
          dan pilih tingkat kesulitan yang sesuai dengan kemampuanmu.
        </p>
        <Link
          to="/play"
          className="mt-10 inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-black transition-opacity hover:opacity-90"
        >
          Play Now
        </Link>
      </section>

      <section className="grid gap-4 pb-20 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border border-line bg-surface p-5">
            <Icon size={20} className="mb-3 text-accent" />
            <h3 className="font-medium text-neutral-100">{title}</h3>
            <p className="mt-1 text-sm text-neutral-400">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
