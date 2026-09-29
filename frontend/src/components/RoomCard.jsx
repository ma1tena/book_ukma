const MAX_BADGES = 5;

export default function RoomCard({ room, selected, onSelect }) {
  const extra = room.inventory.length - MAX_BADGES;
  return (
    <article className={`grid gap-6 rounded-3xl bg-white p-4 shadow-sm transition md:grid-cols-2 md:p-5 ${selected ? "ring-2 ring-blue" : ""}`}>
      <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-blue-deep">
        <img src={room.photo_url} alt={room.name} loading="lazy" className="h-full w-full object-cover"
             onError={(e) => (e.currentTarget.style.display = "none")} />
      </div>
      <div className="flex flex-col py-1 pr-2">
        <h3 className="font-display text-3xl font-semibold text-navy">{room.name}</h3>
        <p className="mt-2 text-sm">
          <span className="font-bold">Вміщує</span> до {room.capacity} осіб
        </p>
        <p className="mt-3 text-slate">{room.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {room.inventory.slice(0, MAX_BADGES).map((item) => (
            <span key={item} className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-navy">{item}</span>
          ))}
          {extra > 0 && <span className="rounded-full bg-mist-200 px-3 py-1 text-xs font-semibold text-slate">+{extra}</span>}
        </div>
        <button onClick={() => onSelect(room)}
                className="mt-auto rounded-lg bg-navy px-6 py-3 pt-3 font-semibold text-white transition hover:bg-blue md:mt-6">
          {selected ? "Календар відкрито ↓" : "Переглянути календар"}
        </button>
      </div>
    </article>
  );
}
