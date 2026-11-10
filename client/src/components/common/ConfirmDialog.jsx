export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-medium text-neutral-100">{title}</p>
        <p className="mt-1 text-sm text-neutral-400">{message}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-line bg-elevated py-2.5 text-sm text-neutral-200 transition-colors hover:bg-line"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90 ${
              danger ? "bg-danger" : "bg-accent"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
