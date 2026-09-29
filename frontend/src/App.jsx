import { useCallback, useEffect, useRef, useState } from "react";
import { getBuildingRooms, getBuildings, getRoom } from "./api";
import { CONTACT } from "./config";
import BuildingList from "./components/BuildingList";
import Header from "./components/Header";
import Hero from "./components/Hero";
import RoomCard from "./components/RoomCard";
import SlotCalendar from "./components/SlotCalendar";
import { fmt, fmtTime } from "./utils/time";

const H2 = ({ children }) => (
  <h2 className="mb-8 text-center font-display text-3xl font-semibold text-navy md:text-4xl">{children}</h2>
);

function ErrorBanner({ message, onRetry, onClose }) {
  return (
    <div className="mx-auto my-4 flex max-w-5xl items-center justify-between gap-4 rounded-xl border border-coral bg-coral/10 px-5 py-3 text-sm text-navy-dark">
      <span>⚠️ {message}</span>
      <span className="flex gap-3 font-semibold">
        {onRetry && <button onClick={onRetry} className="text-blue underline">Спробувати ще раз</button>}
        {onClose && <button onClick={onClose} aria-label="Закрити">✕</button>}
      </span>
    </div>
  );
}

export default function App() {
  const [buildings, setBuildings] = useState(null);
  const [building, setBuilding] = useState(null);
  const [rooms, setRooms] = useState(null);
  const [room, setRoom] = useState(null);      // деталі кімнати + зайняті слоти
  const [selection, setSelection] = useState(null);
  const [error, setError] = useState(null);
  const [showStub, setShowStub] = useState(false);
  const calendarRef = useRef(null);

  const guard = useCallback(async (fn) => {
    try { setError(null); return await fn(); }
    catch (e) { setError({ message: e.message, retry: () => guard(fn) }); }
  }, []);

  useEffect(() => { guard(async () => setBuildings(await getBuildings())); }, [guard]);

  const selectBuilding = (b) => guard(async () => {
    setBuilding(b); setRoom(null); setSelection(null); setRooms(null);
    setRooms(await getBuildingRooms(b.id));
  });

  const selectRoom = (r) => guard(async () => {
    setSelection(null);
    setRoom(await getRoom(r.id));
    setTimeout(() => calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  });

  return (
    <>
      <Header />
      <Hero />

      <main id="booking" className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <H2>Оберіть корпус</H2>
        {error && <ErrorBanner message={error.message} onRetry={error.retry} onClose={() => setError(null)} />}
        {!buildings && !error && <p className="text-center text-slate">Завантаження…</p>}
        {buildings && <BuildingList buildings={buildings} selectedId={building?.id} onSelect={selectBuilding} />}

        {building && (
          <section className="mt-16">
            <H2>Наші локації</H2>
            {!rooms && !error && <p className="text-center text-slate">Завантаження приміщень…</p>}
            <div className="grid gap-6">
              {rooms?.map((r) => (
                <RoomCard key={r.id} room={r} selected={room?.id === r.id} onSelect={selectRoom} />
              ))}
            </div>
          </section>
        )}

        {room && (
          <section ref={calendarRef} className="mt-16 scroll-mt-6 rounded-3xl bg-white p-5 shadow-sm md:p-8">
            <h2 className="font-display text-3xl font-semibold text-navy">{room.name}: вільні слоти</h2>
            <p className="mb-6 mt-1 text-sm text-slate">Вміщує до {room.capacity} осіб · {room.building_name}</p>
            <SlotCalendar key={room.id} bookedSlots={room.booked_slots} selection={selection}
                          onChange={setSelection} onError={(m) => setError({ message: m })} />

            {selection && (
              <div className="sticky bottom-4 mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-navy p-5 text-white shadow-xl">
                <div>
                  <div className="text-sm opacity-80">Ваш вибір</div>
                  <div className="text-lg font-bold">
                    {room.name} · {fmt(selection.start, { day: "numeric", month: "long" })}, {fmtTime(selection.start)}–{fmtTime(selection.end)}
                  </div>
                </div>
                <button onClick={() => setShowStub(true)}
                        className="rounded-lg bg-white px-6 py-3 font-bold text-navy transition hover:bg-mist">
                  Згенерувати подання
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      <footer id="contacts" className="bg-navy py-10 text-center text-sm text-white/80">
        <div className="font-display text-lg font-semibold text-white">КМЦ НаУКМА</div>
        <div className="mt-2">{CONTACT.address} · {CONTACT.phone} · {CONTACT.email}</div>
      </footer>

      {showStub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-dark/60 p-4" onClick={() => setShowStub(false)}>
          <div className="max-w-md rounded-2xl bg-white p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl font-semibold text-navy">Квіз-форма — наступний крок</h3>
            <p className="mt-3 text-slate">Слот обрано! Форму подання (ПІБ, контакти, апаратура) додамо в Milestone 4.</p>
            <button onClick={() => setShowStub(false)} className="mt-6 rounded-lg bg-navy px-6 py-2 font-semibold text-white">Зрозуміло</button>
          </div>
        </div>
      )}
    </>
  );
}
