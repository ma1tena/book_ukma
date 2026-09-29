import { useMemo, useState } from "react";
import { SLOT_MIN, addMin, daySlots, fmt, fmtTime, nextDays, overlaps } from "../utils/time";

const STYLES = {
  free: "border-mist-200 bg-white text-navy hover:border-blue hover:bg-mist-100",
  selected: "border-blue bg-blue text-white",
  busy: "cursor-not-allowed border-transparent bg-slate-200 text-slate line-through",
  pending: "cursor-not-allowed border-amber bg-amber/15 text-[#8A5A17]",
  past: "cursor-not-allowed border-transparent bg-mist-100 text-slate-300",
};

/** Сітка 30-хвилинних слотів. Клік — початок, другий клік — кінець діапазону. */
export default function SlotCalendar({ bookedSlots, selection, onChange, onError }) {
  const days = useMemo(() => nextDays(14), []);
  const [dayIdx, setDayIdx] = useState(0);
  const [anchor, setAnchor] = useState(null);
  const day = days[dayIdx];
  const slots = useMemo(() => daySlots(day), [day]);
  const booked = useMemo(
    () => bookedSlots.map((b) => ({ s: new Date(b.start_time), e: new Date(b.end_time), status: b.status })),
    [bookedSlots]
  );

  const stateOf = (s) => {
    const e = addMin(s, SLOT_MIN);
    if (e <= new Date()) return "past";
    const hit = booked.find((b) => overlaps(s, e, b.s, b.e));
    if (hit) return hit.status === "approved" ? "busy" : "pending";
    return "free";
  };

  const pick = (s) => {
    if (!anchor) {
      setAnchor(s);
      onChange({ start: s, end: addMin(s, SLOT_MIN) });
      return;
    }
    const start = anchor < s ? anchor : s;
    const end = addMin(anchor < s ? s : anchor, SLOT_MIN);
    setAnchor(null);
    if (slots.some((x) => x >= start && x < end && stateOf(x) !== "free")) {
      onChange(null);
      onError("У вибраному проміжку є зайняті слоти. Оберіть вільний діапазон.");
      return;
    }
    onChange({ start, end });
  };

  const changeDay = (i) => { setDayIdx(i); setAnchor(null); onChange(null); };

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((d, i) => (
          <button key={i} onClick={() => changeDay(i)}
                  className={`min-w-[64px] rounded-xl border-2 px-3 py-2 text-center transition ${
                    i === dayIdx ? "border-navy bg-navy text-white" : "border-mist-200 bg-white hover:border-blue"}`}>
            <div className="text-xs uppercase opacity-80">{fmt(d, { weekday: "short" })}</div>
            <div className="text-lg font-bold">{d.getDate()}</div>
            <div className="text-xs opacity-80">{fmt(d, { month: "short" })}</div>
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-7">
        {slots.map((s) => {
          const inSel = selection && s >= selection.start && s < selection.end;
          const st = inSel ? "selected" : stateOf(s);
          return (
            <button key={s.getTime()} disabled={st === "busy" || st === "pending" || st === "past"}
                    onClick={() => pick(s)}
                    className={`rounded-lg border-2 py-2 text-sm font-semibold transition ${STYLES[st]}`}>
              {fmtTime(s)}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate">
        <Legend cls="border-mist-200 bg-white" text="Вільно" />
        <Legend cls="border-blue bg-blue" text="Ваш вибір" />
        <Legend cls="border-amber bg-amber/15" text="На розгляді" />
        <Legend cls="border-transparent bg-slate-200" text="Зайнято" />
      </div>
      <p className="mt-2 text-xs text-slate-300">
        Оберіть початок, а потім кінець події — слоти по {SLOT_MIN} хв.
      </p>
    </div>
  );
}

const Legend = ({ cls, text }) => (
  <span className="flex items-center gap-2"><i className={`inline-block h-4 w-4 rounded border-2 ${cls}`} />{text}</span>
);
