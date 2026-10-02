import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { dayInfo } from "../utils/slots";
import { fmt, sameDay, startOfDay } from "../utils/time";

const WEEK = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "НД"];

/** Квадратний місячний календар: вільні дні клікабельні, обраний — золотий. */
export default function MonthCalendar({ booked, selectedDay, onSelect }) {
  const today = startOfDay(new Date());
  const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [view, setView] = useState(firstOfThisMonth);

  const cells = useMemo(() => {
    const start = new Date(view);
    start.setDate(1 - ((view.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [view]);

  const shift = (m) => setView(new Date(view.getFullYear(), view.getMonth() + m, 1));
  const canPrev = view > firstOfThisMonth;
  const canNext = view < new Date(today.getFullYear(), today.getMonth() + 5, 1);
  const nav = "cal-nav";

  return (
    <div className="flex aspect-square w-full flex-col">
      <div className="flex items-center justify-between">
        <button onClick={() => shift(-1)} disabled={!canPrev} aria-label="Попередній місяць" className={nav}><ChevronLeft size={20} /></button>
        <div className="t-44 font-bold capitalize text-navy">{fmt(view, { month: "long", year: "numeric" })}</div>
        <button onClick={() => shift(1)} disabled={!canNext} aria-label="Наступний місяць" className={nav}><ChevronRight size={20} /></button>
      </div>
      <div className="mt-4 grid grid-cols-7 text-center t-24 font-bold tracking-wider text-slate">
        {WEEK.map((w) => <div key={w}>{w}</div>)}
      </div>
      <div className="mt-2 grid flex-1 grid-cols-7 grid-rows-6 gap-px border border-mist-200 bg-mist-200">
        {cells.map((d) => {
          if (d.getMonth() !== view.getMonth()) return <div key={d.getTime()} className="bg-mist-100" />;
          const info = dayInfo(d, booked);
          const past = d < today;
          const full = !past && info.free === 0;
          const selected = selectedDay && sameDay(d, selectedDay);
          const cls = selected ? "bg-gold font-bold text-white"
            : past ? "cursor-not-allowed bg-mist-50 text-slate-300/70"
            : full ? "cursor-not-allowed bg-slate-200 text-slate line-through"
            : "bg-white font-semibold text-navy hover:bg-mist-100";
          return (
            <button key={d.getTime()} disabled={past || full} onClick={() => onSelect(d)}
                    className={`relative flex items-center justify-center t-28 transition ${cls}`}>
              {d.getDate()}
              {!past && !full && !selected && (info.busy > 0 || info.pending > 0) && (
                <span className="absolute bottom-1.5 flex gap-0.5">
                  {info.busy > 0 && <i className="h-1.5 w-1.5 rounded-full bg-slate" />}
                  {info.pending > 0 && <i className="h-1.5 w-1.5 rounded-full bg-amber" />}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
