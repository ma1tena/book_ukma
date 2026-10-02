import { ArrowLeft, Check, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { getRoom } from "../api";
import ErrorBanner from "../components/ErrorBanner";
import MonthCalendar from "../components/MonthCalendar";
import PhotoGallery from "../components/PhotoGallery";
import TimeSlots from "../components/TimeSlots";
import { useFetch } from "../hooks";
import { parseBooked } from "../utils/slots";
import { fmt, fmtTime } from "../utils/time";

const Legend = ({ cls, text }) => (
  <span className="flex items-center gap-2"><i className={`inline-block h-4 w-4 border ${cls}`} />{text}</span>
);

export default function RoomPage({ id }) {
  const { data: room, error, loading, reload } = useFetch(() => getRoom(id), [id]);
  const [day, setDay] = useState(null);
  const [selection, setSelection] = useState(null);
  const [notice, setNotice] = useState(null);
  const [stub, setStub] = useState(false);
  const booked = useMemo(() => (room ? parseBooked(room.booked_slots) : []), [room]);
  const pickDay = (d) => { setDay(d); setSelection(null); setNotice(null); };

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 md:px-6 lg:max-w-none lg:px-[calc(var(--u)*232)]"><div className="mx-auto">
      <a href={room ? `#/building/${room.building_id}` : "#/"} className="group inline-flex items-center gap-2 text-slate transition hover:text-navy">
        <ArrowLeft size={18} className="text-gold transition-transform group-hover:-translate-x-1" /> До приміщень корпусу
      </a>
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {loading && <p className="mt-10 text-center text-slate">Завантаження…</p>}

      {room && (
        <div className="mt-8 grid items-start gap-10 lg:grid-cols-2 lg:gap-x-[calc(var(--u)*100)]">
          <div>
            <PhotoGallery photos={room.photos?.length ? room.photos : room.photo_url ? [room.photo_url] : []} alt={room.name} />
            <div className="mt-8 text-xs font-bold uppercase tracking-[0.25em] text-blue">{room.building_name}</div>
            <h1 className="mt-2 text-5xl font-bold tracking-tight text-navy">{room.name}</h1>
            <div className="mt-5 flex items-center gap-2 text-slate"><Users size={18} />Вміщує {room.capacity_text ?? `до ${room.capacity} осіб`}</div>
            <p className="mt-5 text-lg leading-8 text-navy-dark">{room.description}</p>
            <div className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-slate">Обладнання</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {room.inventory.map((it) => (
                <span key={it} className="inline-flex items-center gap-2 rounded-full bg-mist-100 px-4 py-2 text-sm font-semibold text-navy">
                  <Check size={15} className="text-blue" />{it}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl bg-white p-6 ring-1 ring-mist-200 sm:p-8">
              <h2 className="text-2xl font-bold text-navy">Календар доступності</h2>
              <p className="mb-6 mt-1 text-slate">Оберіть вільний день для бронювання</p>
              <MonthCalendar booked={booked} selectedDay={day} onSelect={pickDay} />
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate">
                <Legend cls="border-mist-200 bg-white" text="Вільно" />
                <Legend cls="border-gold bg-gold" text="Обраний день" />
                <Legend cls="border-slate-200 bg-slate-200" text="Зайнято" />
              </div>
            </section>

            {notice && <ErrorBanner message={notice} onClose={() => setNotice(null)} />}
            <TimeSlots day={day} booked={booked} selection={selection} onChange={setSelection} onError={setNotice} />

            {selection && (
              <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-navy p-5 text-white shadow-xl">
                <div>
                  <div className="text-sm opacity-70">Ваш вибір</div>
                  <div className="text-lg font-bold">
                    {fmt(selection.start, { day: "numeric", month: "long" })}, {fmtTime(selection.start)}–{fmtTime(selection.end)}
                  </div>
                </div>
                <button onClick={() => setStub(true)}
                        className="rounded-md border-2 border-white bg-white px-6 py-3 font-bold text-navy transition hover:border-gold">
                  Згенерувати подання
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {stub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-dark/60 p-4" onClick={() => setStub(false)}>
          <div className="max-w-md rounded-2xl bg-white p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-navy">Квіз-форма — наступний крок</h3>
            <p className="mt-3 text-slate">Слот обрано! Форму подання (ПІБ, контакти, апаратура) додамо в Milestone 4.</p>
            <button onClick={() => setStub(false)} className="mt-6 rounded-md bg-navy px-6 py-2 font-semibold text-white">Зрозуміло</button>
          </div>
        </div>
      )}
    </div></main>
  );
}
