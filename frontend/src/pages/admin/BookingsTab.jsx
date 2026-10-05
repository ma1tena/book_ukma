import { Check, ChevronRight, X } from "lucide-react";
import { useMemo, useState } from "react";
import * as api from "../../api";
import ErrorBanner from "../../components/ErrorBanner";
import { useFetch } from "../../hooks";
import { STATUS } from "../../utils/status";
import { fmt, fmtTime } from "../../utils/time";

const FILTERS = [["pending", "На розгляді"], ["approved", "Підтверджено"], ["rejected", "Відхилено"], ["all", "Усі"]];
const utc = (s) => new Date(s.split(".")[0] + "Z");
const Badge = ({ status }) => <span className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${STATUS[status].cls}`}>{STATUS[status].label}</span>;

export function BookingModal({ b, onClose, onUpdated }) {
  const [comment, setComment] = useState(b.admin_comment || "");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const s = new Date(b.start_time), e = new Date(b.end_time);

  const decide = async (status) => {
    if (status === "rejected" && !comment.trim()) return setErr("Вкажіть причину відхилення або що змінити, щоб заявку погодили");
    setBusy(status); setErr("");
    try { onUpdated(await api.adminDecide(b.id, status, comment.trim() || null)); onClose(); }
    catch (ex) { setErr(ex.message); setBusy(""); }
  };
  const rows = [
    ["Захід", b.event_name], ["Приміщення", `${b.room_name} (${b.building_name})`],
    ["Коли", `${fmt(s, { day: "numeric", month: "long", year: "numeric" })}, ${fmtTime(s)}–${fmtTime(e)}`],
    ["Учасників", b.expected_participants], ["Апаратура", b.equipment.join(", ") || "не потрібна"], ["Опис", b.event_description || "—"],
    ["Заявник", `${b.responsible_name}${b.applicant_role ? `, ${b.applicant_role}` : ""}${b.organization ? ` · СО «${b.organization}»` : ""}`],
    ["Факультет-курс", b.faculty_course], ["Пошта", b.email], ["Телефон", b.phone],
    ["Організатори", b.organizers], ["Контактна особа", `${b.contact_phone} ${b.contact_name}`],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-dark/60 p-4 sm:items-center" onClick={onClose}>
      <div className="relative my-6 w-full max-w-[720px] rounded-2xl bg-white p-6 shadow-2xl sm:p-9" onClick={(ev) => ev.stopPropagation()}>
        <button onClick={onClose} aria-label="Закрити" className="absolute right-4 top-4 rounded-full p-2 text-slate transition hover:bg-mist-100 hover:text-navy"><X size={22} /></button>
        <div className="flex flex-wrap items-center gap-3 pr-8"><h2 className="text-2xl font-bold text-navy">Заявка №{b.id}</h2><Badge status={b.status} /></div>
        <dl className="mt-5 divide-y divide-mist-200 rounded-lg border border-mist-200 text-sm">
          {rows.map(([k, v]) => <div key={k} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[150px_1fr]"><dt className="text-slate">{k}</dt><dd className="font-semibold text-navy-dark">{v}</dd></div>)}
        </dl>
        <a href={`#/petition/${b.id}`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-blue hover:underline">Відкрити подання ↗</a>

        <label className="mt-6 block">
          <span className="mb-1.5 block text-sm font-semibold text-navy">Коментар для заявника</span>
          <textarea rows={3} maxLength={1000} value={comment} onChange={(ev) => setComment(ev.target.value)}
                    placeholder="Обов'язково при відхиленні: причина або що змінити, щоб погодити. При підтвердженні — за потреби."
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base outline-none transition placeholder:text-slate-300 focus:border-blue focus:ring-2 focus:ring-blue/20" />
        </label>
        {err && <p className="mt-3 rounded-lg bg-coral/10 px-4 py-3 text-sm text-navy-dark">⚠️ {err}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button onClick={() => decide("approved")} disabled={!!busy || b.status === "approved"}
                  className="inline-flex items-center gap-2 rounded-md border-2 border-navy bg-navy px-6 py-3 font-semibold text-white transition hover:border-gold hover:bg-white hover:text-navy disabled:opacity-50">
            <Check size={18} className="text-gold" /> {busy === "approved" ? "Зачекайте…" : "Підтвердити"}
          </button>
          <button onClick={() => decide("rejected")} disabled={!!busy || b.status === "rejected"}
                  className="inline-flex items-center gap-2 rounded-md border-2 border-coral px-6 py-3 font-semibold text-[#A3361B] transition hover:bg-coral/10 disabled:opacity-50">
            <X size={18} /> {busy === "rejected" ? "Зачекайте…" : "Відхилити"}
          </button>
          {b.status !== "pending" && <button onClick={() => decide("pending")} disabled={!!busy} className="text-sm font-semibold text-slate underline hover:text-navy">Повернути на розгляд</button>}
        </div>
        <p className="mt-3 text-xs text-slate">Заявник отримає лист із рішенням і вашим коментарем.</p>
      </div>
    </div>
  );
}

export default function BookingsTab() {
  const { data, error, loading, reload } = useFetch(api.adminBookings, []);
  const [patched, setPatched] = useState({});             // рішення застосовуємо локально, без повторного завантаження
  const [filter, setFilter] = useState("pending");
  const [open, setOpen] = useState(null);
  const items = data ? data.map((b) => patched[b.id] ?? b) : null;

  const counts = useMemo(() => {
    const c = { all: items?.length || 0, pending: 0, approved: 0, rejected: 0 };
    items?.forEach((b) => c[b.status]++);
    return c;
  }, [data, patched]);
  const list = (items || []).filter((b) => filter === "all" || b.status === filter);
  const update = (nb) => setPatched((p) => ({ ...p, [nb.id]: nb }));

  return (
    <div>
      {error && <ErrorBanner message={error} onRetry={reload} />}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
                  className={`rounded-full border-2 px-5 py-2 text-sm font-semibold transition ${filter === id ? "border-gold bg-gold/10 text-navy" : "border-mist-200 bg-white text-slate hover:border-gold"}`}>
            {label} <span className="ml-1 text-xs opacity-70">{counts[id]}</span>
          </button>
        ))}
      </div>
      {loading && !items && <p className="text-center text-slate">Завантаження…</p>}
      {items && list.length === 0 && <p className="rounded-2xl bg-white py-12 text-center text-slate ring-1 ring-mist-200">У цьому розділі заявок немає.</p>}
      {list.length > 0 && (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-mist-200">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-mist-100 text-xs uppercase tracking-wider text-slate">
              <tr>{["Створено", "Захід", "Приміщення", "Коли", "Заявник", "Осіб", "Статус", ""].map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {list.map((b) => {
                const s = new Date(b.start_time), e = new Date(b.end_time);
                return (
                  <tr key={b.id} className="border-t border-mist-200 align-top transition hover:bg-mist-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate">{fmt(utc(b.created_at), { day: "numeric", month: "short" })}</td>
                    <td className="px-4 py-3"><div className="font-semibold text-navy">{b.event_name}</div>{b.organization && <div className="text-xs text-slate">СО «{b.organization}»</div>}</td>
                    <td className="px-4 py-3">{b.room_name}</td>
                    <td className="whitespace-nowrap px-4 py-3">{fmt(s, { day: "numeric", month: "short" })}<div className="text-xs text-slate">{fmtTime(s)}–{fmtTime(e)}</div></td>
                    <td className="px-4 py-3">{b.responsible_name}<div className="text-xs text-slate">{b.phone}</div></td>
                    <td className="px-4 py-3">{b.expected_participants}</td>
                    <td className="px-4 py-3"><Badge status={b.status} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => setOpen(b)} className="group inline-flex items-center gap-1 whitespace-nowrap font-semibold text-blue hover:underline">
                        {b.status === "pending" ? "Розглянути" : "Деталі"} <ChevronRight size={16} className="text-gold transition-transform group-hover:translate-x-1" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {open && <BookingModal b={open} onClose={() => setOpen(null)} onUpdated={update} />}
    </div>
  );
}
