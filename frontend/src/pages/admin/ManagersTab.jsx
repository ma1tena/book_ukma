import { Trash2 } from "lucide-react";
import { useState } from "react";
import * as api from "../../api";
import ErrorBanner from "../../components/ErrorBanner";
import { useFetch } from "../../hooks";

const input = "w-full rounded-lg border border-line bg-white px-4 py-2.5 text-base text-navy-dark outline-none transition placeholder:text-slate-400 focus:border-blue focus:ring-2 focus:ring-blue/40";
const saveBtn = "rounded-md border-2 border-navy bg-navy px-6 py-2.5 font-semibold text-white transition hover:border-gold hover:bg-white hover:text-navy disabled:opacity-60";

/** Перелік приміщень з чекбоксами, згруповано за корпусами */
function RoomPicker({ buildings, value, onChange }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="space-y-3">
      {buildings.filter((b) => b.rooms.length).map((b) => (
        <div key={b.id}>
          <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate">{b.short_name || b.name}</div>
          <div className="flex flex-wrap gap-2">
            {b.rooms.map((r) => (
              <label key={r.id} className={`flex cursor-pointer items-center gap-2 rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition ${value.includes(r.id) ? "border-gold bg-gold/10 text-navy" : "border-mist-200 text-slate hover:border-gold"}`}>
                <input type="checkbox" checked={value.includes(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4 accent-[#AD8B3A]" />{r.name}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ManagerRow({ m, buildings, onChanged }) {
  const [ids, setIds] = useState(m.room_ids);
  const [state, setState] = useState({ busy: false, msg: "", err: "" });
  const save = async (next) => {
    setState({ busy: true, msg: "", err: "" });
    try { await api.adminSetManager(m.email, next); setState({ busy: false, msg: next.length ? "Збережено ✓" : "", err: "" }); onChanged(); }
    catch (ex) { setState({ busy: false, msg: "", err: ex.message }); }
  };
  return (
    <section className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-mist-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="text-lg font-bold text-navy">{m.full_name || "Ще не входив(ла) на сайт"}</div><div className="text-sm text-slate">{m.email}</div></div>
        <button onClick={() => window.confirm(`Забрати всі права в ${m.email}?`) && save([])} aria-label="Забрати права" title="Забрати всі права"
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-slate transition hover:text-[#A3361B]"><Trash2 size={16} />Забрати права</button>
      </div>
      <RoomPicker buildings={buildings} value={ids} onChange={setIds} />
      <div className="flex flex-wrap items-center gap-4">
        <button onClick={() => save(ids)} disabled={state.busy || ids.length === 0} className={saveBtn}>{state.busy ? "Зберігаємо…" : "Зберегти приміщення"}</button>
        {ids.length === 0 && <span className="text-sm text-slate">Оберіть хоча б одне приміщення (або «Забрати права»).</span>}
        {state.msg && <span className="font-semibold text-[#1E6B3A]">{state.msg}</span>}
        {state.err && <span className="text-sm text-[#A3361B]">⚠️ {state.err}</span>}
      </div>
    </section>
  );
}

export default function ManagersTab() {
  const mgrs = useFetch(api.adminManagers, []);
  const bld = useFetch(api.adminBuildings, []);
  const [email, setEmail] = useState("");
  const [ids, setIds] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setBusy(true); setErr("");
    try { await api.adminSetManager(email.trim(), ids); setEmail(""); setIds([]); mgrs.reload(); }
    catch (ex) { setErr(ex.message); }
    setBusy(false);
  };
  const buildings = bld.data || [];

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-slate">
        Адміністратор приміщень бачить заявки лише на закріплені за ним приміщення, може їх схвалювати чи відхиляти та редагувати опис, обладнання й фото цих приміщень.
        Головні адміністратори задаються в налаштуваннях сервера (<code>ADMIN_EMAILS</code>) і мають доступ до всього.
      </p>
      {(mgrs.error || bld.error) && <ErrorBanner message={mgrs.error || bld.error} onRetry={() => { mgrs.reload(); bld.reload(); }} />}

      <section className="space-y-4 rounded-2xl bg-mist-50 p-6 ring-1 ring-mist-200">
        <div className="text-sm font-bold uppercase tracking-wider text-slate">Призначити адміністратора</div>
        <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="пошта@ukma.edu.ua" />
        <RoomPicker buildings={buildings} value={ids} onChange={setIds} />
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={add} disabled={busy || !email.includes("@") || ids.length === 0} className={saveBtn}>{busy ? "Зберігаємо…" : "Призначити"}</button>
          {err && <span className="text-sm text-[#A3361B]">⚠️ {err}</span>}
        </div>
      </section>

      {mgrs.loading && !mgrs.data && <p className="text-center text-slate">Завантаження…</p>}
      {mgrs.data?.length === 0 && <p className="text-center text-slate">Адміністраторів приміщень ще немає.</p>}
      {mgrs.data?.map((m) => <ManagerRow key={m.email + m.room_ids.join()} m={m} buildings={buildings} onChanged={mgrs.reload} />)}
    </div>
  );
}
