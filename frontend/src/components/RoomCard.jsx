import { ArrowRight, Users } from "lucide-react";

const MAX_BADGES = 5;

/* Картка приміщення: 2374 × 621 px Figma (фото ≈ 42% ширини) */
export default function RoomCard({ room }) {
  const extra = room.inventory.length - MAX_BADGES;
  return (
    <article className="group grid w-full overflow-hidden rounded-2xl bg-white ring-1 ring-mist-200 transition hover:shadow-xl md:grid-cols-[2fr_3fr] lg:h-[calc(var(--u)*621)] lg:grid-cols-[42fr_58fr]">
      <div className="min-h-[220px] overflow-hidden bg-gradient-to-br from-navy to-blue-deep lg:h-full lg:min-h-0">
        <img src={room.photos?.[0] ?? room.photo_url} alt={room.name} loading="lazy"
             className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
             onError={(e) => (e.currentTarget.style.display = "none")} />
      </div>
      <div className="flex flex-col justify-center p-7 md:p-10 lg:p-[calc(var(--u)*72)]">
        <h3 className="text-3xl font-bold text-navy">{room.name}</h3>
        <div className="mt-3 flex items-center gap-2 text-slate"><Users size={18} />Вміщує {room.capacity_text ?? `до ${room.capacity} осіб`}</div>
        <p className="mt-4 text-navy-dark">{room.description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {room.inventory.slice(0, MAX_BADGES).map((it) => (
            <span key={it} className="rounded-full bg-mist-100 px-4 py-1.5 text-sm font-semibold text-navy">{it}</span>
          ))}
          {extra > 0 && <span className="rounded-full bg-mist-200 px-4 py-1.5 text-sm font-semibold text-slate">+{extra}</span>}
        </div>
        <a href={`#/room/${room.id}`}
           className="group/btn mt-7 inline-flex w-fit items-center gap-3 rounded-md border-2 border-navy bg-navy px-6 py-3.5 font-semibold text-white transition hover:border-gold hover:bg-white hover:text-navy">
          Переглянути календар
          <ArrowRight size={18} className="text-gold transition-transform group-hover/btn:translate-x-1" />
        </a>
      </div>
    </article>
  );
}
