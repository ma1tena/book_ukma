import { useEffect, useMemo, useState } from "react";
import { slotState } from "../utils/slots";
import { SLOT_MIN, addMin, daySlots, fmt, fmtTime } from "../utils/time";

const STYLES = {
  free: "border-mist-200 bg-white text-navy hover:border-blue hover:bg-mist-100",
  selected: "border-gold bg-gold text-white",
  busy: "cursor-not-allowed border-transparent bg-slate-200 text-slate line-through",
  pending: "cursor-not-allowed border-amber bg-amber/15 text-[#8A5A17]",
  past: "cursor-not-allowed border-transparent bg-mist-100 text-slate-300",
};
const Legend = ({ cls, text }) => (
  <span className="flex items-center gap-2"><i className={`inline-block h-4 w-4 rounded border-2 ${cls}`} />{text}</span>
);

/** Сітка 30-хв слотів обраного дня. Перший клік — початок, другий — кінець. */
export default function TimeSlots({ day, booked, selection, onChange, onError }) {
  const [anchor, setAnchor] = useState(null);
  const slots = useMemo(() => (day ? daySlots(day) : []), [day]);
  useEffect(() => setAnchor(null), [day]);

  if (!day) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border-2 border-dashed border-mist-200 p-8 text-center text-slate">
        Оберіть дату в календарі, щоб побачити вільні години
      </div>
    );
  }

  const pick = (s) => {
    if (!anchor) { setAnchor(s); onChange({ start: s, end: addMin(s, SLOT_MIN) }); return; }
    const start = anchor < s ? anchor : s;
    const end = addMin(anchor < s ? s : anchor, SLOT_MIN);
    setAnchor(null);
    if (slots.some((x) => x >= start && x < end && slotState(x, booked) !== "free")) {
      onChange(null);
      onError("У вибраному проміжку є зайняті слоти. Оберіть вільний діапазон.");
      return;
    }
    onChange({ start, end });
  };

  return (
    <div className="rounded-2xl bg-white p-6 ring-1 ring-mist-200 sm:p-8">
      <h3 className="text-xl font-bold capitalize text-navy">
        {fmt(day, { weekday: "long", day: "numeric", month: "long" })}
      </h3>
      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
        {slots.map((s) => {
          const inSel = selection && s >= selection.start && s < selection.end;
          const st = inSel ? "selected" : slotState(s, booked);
          return (
            <button key={s.getTime()} onClick={() => pick(s)} disabled={["busy", "pending", "past"].includes(st)}
                    className={`rounded-lg border-2 py-2 text-sm font-semibold transition ${STYLES[st]}`}>
              {fmtTime(s)}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate">
        <Legend cls="border-mist-200 bg-white" text="Вільно" />
        <Legend cls="border-gold bg-gold" text="Ваш вибір" />
        <Legend cls="border-amber bg-amber/15" text="На розгляді" />
        <Legend cls="border-transparent bg-slate-200" text="Зайнято" />
      </div>
      <p className="mt-2 text-xs text-slate-300">Оберіть початок, а потім кінець події (слоти по {SLOT_MIN} хв).</p>
    </div>
  );
}
