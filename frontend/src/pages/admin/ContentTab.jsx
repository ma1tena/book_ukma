import { ArrowUp, ChevronDown, Plus, X } from "lucide-react";
import { useState } from "react";
import * as api from "../../api";
import ErrorBanner from "../../components/ErrorBanner";
import { useFetch } from "../../hooks";

const input = "w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-base text-navy-dark outline-none transition placeholder:text-slate-300 focus:border-blue focus:ring-2 focus:ring-blue/20";
const saveBtn = "rounded-md border-2 border-navy bg-navy px-6 py-2.5 font-semibold text-white transition hover:border-gold hover:bg-white hover:text-navy disabled:opacity-60";

const Row = ({ label, hint, children }) => (
  <label className="block"><span className="mb-1.5 block text-sm font-semibold text-navy">{label}</span>{children}
    {hint && <span className="mt-1 block text-xs text-slate">{hint}</span>}</label>
);

/** Кнопка збереження з повідомленням «Збережено ✓» / помилкою */
function useSave(fn) {
  const [state, setState] = useState({ busy: false, msg: "", err: "" });
  const run = async () => {
    setState({ busy: true, msg: "", err: "" });
    try { await fn(); setState({ busy: false, msg: "Збережено ✓", err: "" }); setTimeout(() => setState((s) => ({ ...s, msg: "" })), 3000); }
    catch (ex) { setState({ busy: false, msg: "", err: ex.message }); }
  };
  return [state, run];
}
const Status = ({ s }) => (<>{s.msg && <span className="font-semibold text-[#1E6B3A]">{s.msg}</span>}{s.err && <span className="text-sm text-[#A3361B]">⚠️ {s.err}</span>}</>);

function TagEditor({ items, onChange }) {
  const [v, setV] = useState("");
  const add = () => { const t = v.trim(); if (t && !items.includes(t)) onChange([...items, t]); setV(""); };
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {items.map((it) => (
          <span key={it} className="inline-flex items-center gap-1.5 rounded-full bg-mist-100 py-1.5 pl-4 pr-2 text-sm font-semibold text-navy">
            {it}<button type="button" onClick={() => onChange(items.filter((x) => x !== it))} aria-label={`Прибрати ${it}`} className="rounded-full p-0.5 text-slate hover:text-[#A3361B]"><X size={15} /></button>
          </span>
        ))}
        {items.length === 0 && <span className="text-sm text-slate">Порожньо</span>}
      </div>
      <div className="flex gap-2">
        <input className={input} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder="Напр. Проєктор — і Enter" />
        <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded-md border-2 border-mist-200 px-4 font-semibold text-navy transition hover:border-gold"><Plus size={16} className="text-gold" />Додати</button>
      </div>
    </div>
  );
}

function PhotosEditor({ photos, onChange }) {
  const [v, setV] = useState("");
  const add = () => { const t = v.trim(); if (t && !photos.includes(t)) onChange([...photos, t]); setV(""); };
  const cover = (i) => onChange([photos[i], ...photos.filter((_, k) => k !== i)]);
  return (
    <div className="space-y-2">
      {photos.map((p, i) => (
        <div key={p} className="flex items-center gap-3 rounded-lg border border-mist-200 p-2">
          <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-mist-100"><img src={p} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} /></div>
          <div className="min-w-0 flex-1"><div className="truncate text-sm text-navy-dark">{p}</div>{i === 0 && <div className="text-xs font-bold text-gold">Обкладинка</div>}</div>
          {i > 0 && <button type="button" onClick={() => cover(i)} title="Зробити обкладинкою" className="rounded-full p-2 text-gold transition hover:bg-gold/10"><ArrowUp size={18} /></button>}
          <button type="button" onClick={() => onChange(photos.filter((_, k) => k !== i))} aria-label="Прибрати фото" className="rounded-full p-2 text-slate hover:text-[#A3361B]"><X size={18} /></button>
        </div>
      ))}
      {photos.length === 0 && <p className="text-sm text-slate">Фото немає — на картці буде синій фон.</p>}
      <div className="flex gap-2">
        <input className={input} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder="/images/rooms/podwall/1.jpg  або  https://…" />
        <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded-md border-2 border-mist-200 px-4 font-semibold text-navy transition hover:border-gold"><Plus size={16} className="text-gold" />Додати</button>
      </div>
      <p className="text-xs text-slate">Файли кладуться в <code>frontend/public/images/…</code> і вказуються як <code>/images/…</code>. Перше фото — обкладинка.</p>
    </div>
  );
}

function RoomForm({ room, buildingId, onSaved, onCancel }) {
  const [f, setF] = useState({
    name: room?.name || "", capacity: room?.capacity ?? "", capacity_text: room?.capacity_text || "", description: room?.description || "",
    inventory: room?.inventory || [], photos: room?.photos?.length ? room.photos : room?.photo_url ? [room.photo_url] : [],
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const [st, save] = useSave(async () => {
    const body = { ...f, capacity: Number(f.capacity) };
    const saved = room ? await api.adminUpdateRoom(room.id, body) : await api.adminCreateRoom(buildingId, body);
    onSaved(saved);
  });
  return (
    <div className="space-y-4 rounded-xl border border-mist-200 bg-mist-50 p-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_160px_1fr]">
        <Row label="Назва"><input className={input} value={f.name} onChange={set("name")} /></Row>
        <Row label="Вміщує (макс.)" hint="Для перевірки заявок"><input className={input} type="number" min="1" value={f.capacity} onChange={set("capacity")} /></Row>
        <Row label="Напис про вміщуваність" hint="Необов'язково, напр. «до 150 - 200 осіб»"><input className={input} value={f.capacity_text} onChange={set("capacity_text")} /></Row>
      </div>
      <Row label="Опис"><textarea className={input} rows={3} value={f.description} onChange={set("description")} /></Row>
      <div><div className="mb-1.5 text-sm font-semibold text-navy">Обладнання (з нього формується чекліст у заявці)</div><TagEditor items={f.inventory} onChange={(inventory) => setF({ ...f, inventory })} /></div>
      <div><div className="mb-1.5 text-sm font-semibold text-navy">Фото</div><PhotosEditor photos={f.photos} onChange={(photos) => setF({ ...f, photos })} /></div>
      <div className="flex flex-wrap items-center gap-4">
        <button onClick={save} disabled={st.busy} className={saveBtn}>{st.busy ? "Зберігаємо…" : room ? "Зберегти приміщення" : "Створити приміщення"}</button>
        {onCancel && <button onClick={onCancel} className="font-semibold text-slate hover:text-navy">Скасувати</button>}
        <Status s={st} />
      </div>
    </div>
  );
}

function BuildingCard({ b: initial, defaultOpen }) {
  const [b, setB] = useState(initial);
  const [rooms, setRooms] = useState(initial.rooms);
  const [open, setOpen] = useState(defaultOpen);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({
    name: b.name, description: b.description || "", is_active: b.is_active, petition_recipient_title: b.petition_recipient_title || "",
    petition_recipient_name: b.petition_recipient_name || "", petition_approver: b.petition_approver || "",
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const [st, save] = useSave(async () => setB(await api.adminUpdateBuilding(b.id, f)));
  const upsert = (r) => setRooms((cur) => (cur.some((x) => x.id === r.id) ? cur.map((x) => (x.id === r.id ? r : x)) : [...cur, r]));

  return (
    <section className="rounded-2xl bg-white ring-1 ring-mist-200">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 p-6 text-left">
        <div>
          <div className="text-xl font-bold text-navy">{b.name}</div>
          <div className="mt-1 text-sm text-slate">{rooms.length} прим. · {b.is_active ? "доступний для бронювання" : "«Незабаром»"}</div>
        </div>
        <ChevronDown className={`text-gold transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-8 border-t border-mist-200 p-6">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="Назва корпусу"><input className={input} value={f.name} onChange={set("name")} /></Row>
              <label className="flex items-center gap-3 self-end rounded-lg bg-mist-100 px-4 py-3 font-semibold text-navy">
                <input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} className="h-5 w-5 accent-[#AD8B3A]" />
                Доступний для бронювання
              </label>
            </div>
            <Row label="Опис"><textarea className={input} rows={2} value={f.description} onChange={set("description")} /></Row>
            <div className="rounded-lg border border-mist-200 p-4">
              <div className="mb-3 text-sm font-bold uppercase tracking-wider text-slate">Подання: кому адресоване</div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Row label="Посада адресата"><input className={input} value={f.petition_recipient_title} onChange={set("petition_recipient_title")} placeholder="Керівниці КМЦ НаУКМА" /></Row>
                <Row label="Прізвище адресата"><input className={input} value={f.petition_recipient_name} onChange={set("petition_recipient_name")} placeholder="Осьмак В. А." /></Row>
                <Row label="Підпис «Погоджено»"><input className={input} value={f.petition_approver} onChange={set("petition_approver")} placeholder="Владислава ОСЬМАК" /></Row>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4"><button onClick={save} disabled={st.busy} className={saveBtn}>{st.busy ? "Зберігаємо…" : "Зберегти корпус"}</button><Status s={st} /></div>
          </div>

          <div className="space-y-5">
            <div className="text-sm font-bold uppercase tracking-wider text-slate">Приміщення</div>
            {rooms.map((r) => (
              <details key={r.id} className="group rounded-xl border border-mist-200" open={false}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-bold text-navy">
                  <span>{r.name} <span className="ml-2 text-sm font-normal text-slate">до {r.capacity} осіб · {r.inventory.length} позицій обладнання</span></span>
                  <ChevronDown size={18} className="text-gold transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-3 pb-3"><RoomForm room={r} buildingId={b.id} onSaved={upsert} /></div>
              </details>
            ))}
            {adding
              ? <RoomForm buildingId={b.id} onSaved={(r) => { upsert(r); setAdding(false); }} onCancel={() => setAdding(false)} />
              : <button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 rounded-md border-2 border-dashed border-mist-200 px-5 py-3 font-semibold text-navy transition hover:border-gold"><Plus size={18} className="text-gold" />Додати приміщення</button>}
          </div>
        </div>
      )}
    </section>
  );
}

export default function ContentTab() {
  const { data, error, loading, reload } = useFetch(api.adminBuildings, []);
  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {loading && !data && <p className="text-center text-slate">Завантаження…</p>}
      {data?.map((b) => <BuildingCard key={b.id} b={b} defaultOpen={b.is_active} />)}
    </div>
  );
}
