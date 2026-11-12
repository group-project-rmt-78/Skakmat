import { Loader2 } from "lucide-react";
import { accuracyTone } from "../../utils/analysis.js";

function Bar({ value, className }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function Message({ children, spinning = false }) {
  return (
    <p className="flex items-center gap-2 text-sm text-neutral-400">
      {spinning && <Loader2 size={14} className="animate-spin" />}
      {children}
    </p>
  );
}

export default function AnalysisPanel({ move, thinking }) {
  const a = move?.analysis;

  let body;
  if (!move) {
    body = <Message>Analisis muncul setelah kamu melangkah.</Message>;
  } else if (!a) {
    body = thinking ? (
      <Message spinning>Menganalisis {move.san}...</Message>
    ) : (
      <Message>Analisis belum tersedia untuk langkah ini.</Message>
    );
  } else if (a.status === "PENDING") {
    body = <Message spinning>Menganalisis {move.san}...</Message>;
  } else if (a.status === "FAILED") {
    body = <Message>Analisis tidak tersedia untuk langkah ini.</Message>;
  } else {
    const tone = accuracyTone(a.accuracy);
    body = (
      <div>
        <p className="text-xs text-neutral-500">
          Langkah <span className="font-mono text-neutral-300">{move.san}</span>
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className={`text-3xl font-semibold ${tone.text}`}>
            ~{Math.round(a.accuracy)}%
          </span>
          <span className={`text-sm ${tone.text}`}>{tone.label}</span>
        </div>
        <div className="mt-2">
          <Bar value={a.accuracy} className={tone.bar} />
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-neutral-400">
          <span>Peluang menang</span>
          <span>~{Math.round(a.winChance)}%</span>
        </div>
        <div className="mt-1">
          <Bar value={a.winChance} className="bg-neutral-300" />
        </div>

        {a.bestMove && (
          <p className="mt-4 text-sm text-neutral-300">
            {a.bestMove === move.san ? (
              "Ini sudah langkah terbaik."
            ) : (
              <>
                Langkah terbaik:{" "}
                <span className="font-mono text-neutral-100">{a.bestMove}</span>
              </>
            )}
          </p>
        )}
        {a.text && (
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">{a.text}</p>
        )}
        {!a.text && a.textPending && (
          <p className="mt-2 flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 size={14} className="animate-spin" />
            Menyusun penjelasan...
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-neutral-500">Analisis langkah</p>
        <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-neutral-400">
          Perkiraan
        </span>
      </div>
      {body}
      <p className="mt-4 text-[11px] text-neutral-500">
        Persentase hanya perkiraan, bukan nilai pasti.
      </p>
    </div>
  );
}