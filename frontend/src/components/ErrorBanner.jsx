export default function ErrorBanner({ message, onRetry, onClose }) {
  return (
    <div className="mx-auto my-4 flex max-w-5xl items-center justify-between gap-4 rounded-xl border border-coral bg-coral/10 px-5 py-3 text-sm">
      <span>⚠️ {message}</span>
      <span className="flex gap-3 font-semibold">
        {onRetry && <button onClick={onRetry} className="text-blue underline">Спробувати ще раз</button>}
        {onClose && <button onClick={onClose} aria-label="Закрити">✕</button>}
      </span>
    </div>
  );
}
