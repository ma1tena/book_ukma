export default function BuildingList({ buildings, selectedId, onSelect }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-3">
      {buildings.map((b) => {
        const selected = b.id === selectedId;
        return (
          <button
            key={b.id}
            disabled={!b.is_active}
            onClick={() => onSelect(b)}
            className={[
              "flex items-center justify-between rounded-2xl border-2 px-6 py-5 text-left transition",
              b.is_active
                ? selected
                  ? "border-blue bg-mist-100 shadow-md"
                  : "border-mist-200 bg-white hover:border-blue hover:shadow-md"
                : "cursor-not-allowed border-mist-200 bg-mist-100/60 opacity-70",
            ].join(" ")}
          >
            <div>
              <div className={`text-lg font-bold ${b.is_active ? "text-navy" : "text-slate"}`}>{b.name}</div>
              {b.description && <div className="mt-1 text-sm text-slate">{b.description}</div>}
            </div>
            {b.is_active ? (
              <span className="rounded-full bg-blue px-4 py-1.5 text-sm font-semibold text-white">
                {selected ? "Обрано" : "Обрати"}
              </span>
            ) : (
              <span className="rounded-full bg-slate-200 px-4 py-1.5 text-sm font-semibold text-slate">Незабаром</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
