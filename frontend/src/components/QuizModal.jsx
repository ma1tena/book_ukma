import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useState } from "react";
import * as api from "../api";
import { useAuth } from "../auth";
import { contactName, shortName } from "../utils/names";
import { fmt, fmtTime, toLocalISO } from "../utils/time";

const STEPS = ["Ви", "Захід", "Апаратура", "Перевірка"];
const PHONE = /^\+380\d{9}$/;
const normPhone = (v) => v.replace(/[\s\-()]/g, "");
const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-navy-dark outline-none transition placeholder:text-slate-300 focus:border-blue focus:ring-2 focus:ring-blue/20";
const arrowBtn = "group inline-flex items-center gap-2 rounded-md border-2 border-navy bg-navy px-6 py-3 font-semibold text-white transition hover:border-gold hover:bg-white hover:text-navy disabled:opacity-60";

const Row = ({ label, hint, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-semibold text-navy">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-slate">{hint}</span>}
  </label>
);

export default function QuizModal({ room, selection, onClose, onCreated, onConflict }) {
  const { user, setUser, openAuth } = useAuth();
  const [slot] = useState(selection);               // знімок вибору: після створення заявки батьківський вибір скидається
  const [step, setStep] = useState(0);
  const [f, setF] = useState(() => ({
    full_name: user.full_name || "", faculty_course: user.faculty_course || "", phone: user.phone || "", applicant_role: "",
    organization: "", event_name: "", organizers: "", expected_participants: "", event_description: "",
    equipment: [], contact_name: "", contact_phone: "",
  }));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (item) => setF({ ...f, equipment: f.equipment.includes(item) ? f.equipment.filter((x) => x !== item) : [...f.equipment, item] });

  const validate = (s) => {
    if (s === 0) {
      if (f.full_name.trim().length < 5) return "Вкажіть ПІБ повністю";
      if (f.faculty_course.trim().length < 2) return "Вкажіть факультет і курс, напр. ФСНСТ-3";
      if (!PHONE.test(normPhone(f.phone))) return "Телефон має бути у форматі +380XXXXXXXXX";
    }
    if (s === 1) {
      if (f.event_name.trim().length < 3) return "Вкажіть назву заходу";
      const n = Number(f.expected_participants);
      if (!Number.isInteger(n) || n < 1) return "Вкажіть очікувану кількість учасників";
      if (n > room.capacity) return `Вміщуваність «${room.name}» — до ${room.capacity} осіб`;
    }
    if (s === 2 && f.contact_phone && !PHONE.test(normPhone(f.contact_phone))) return "Контактний номер має бути у форматі +380XXXXXXXXX";
    return "";
  };
  const next = () => { const m = validate(step); setErr(m); if (!m) setStep(step + 1); };
  const back = () => { setErr(""); setConflict(false); setStep(step - 1); };

  const payload = () => ({
    room_id: room.id, start_time: toLocalISO(slot.start), end_time: toLocalISO(slot.end),
    responsible_name: f.full_name.trim(), faculty_course: f.faculty_course.trim(), phone: normPhone(f.phone),
    applicant_role: f.applicant_role.trim(), organization: f.organization.trim(),
    organizers: f.organizers.trim() || shortName(f.full_name),
    contact_name: f.contact_name.trim() || contactName(f.full_name),
    contact_phone: normPhone(f.contact_phone) || normPhone(f.phone),
    event_name: f.event_name.trim(), event_description: f.event_description.trim(),
    expected_participants: Number(f.expected_participants), equipment: f.equipment,
  });
  const p = payload();

  const submit = async () => {
    setBusy(true); setErr(""); setConflict(false);
    try {
      if (p.responsible_name !== user.full_name || p.faculty_course !== user.faculty_course || p.phone !== user.phone) {
        setUser(await api.updateMe({ full_name: p.responsible_name, faculty_course: p.faculty_course, phone: p.phone }));
      }
      const b = await api.createBooking(p);
      setDone(b);
      onCreated?.(b);
    } catch (ex) {
      if (ex.status === 409) { setConflict(true); onConflict?.(); }
      if (ex.status === 401) { onClose(); openAuth({ view: "login" }); return; }
      setErr(ex.message);
    } finally { setBusy(false); }
  };

  const when = `${fmt(slot.start, { day: "numeric", month: "long" })}, ${fmtTime(slot.start)}–${fmtTime(slot.end)}`;
  const summary = [
    ["Приміщення", `${room.name} (${room.building_name})`], ["Дата й час", when], ["ПІБ", p.responsible_name],
    ["Факультет-курс", p.faculty_course], ["Телефон", p.phone], ["Пошта", user.email],
    ["СО / посада", [p.applicant_role, p.organization && `СО «${p.organization}»`].filter(Boolean).join(" ") || "—"],
    ["Захід", p.event_name], ["Організатори", p.organizers], ["Учасників", p.expected_participants],
    ["Інвентар", p.equipment.join(", ") || "не потрібен"], ["Опис", p.event_description || "—"],
    ["Контактна особа", `${p.contact_phone} ${p.contact_name}`],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-dark/60 p-4 print:hidden sm:items-center" onClick={onClose}>
      <div className="relative my-6 w-full max-w-[680px] rounded-2xl bg-white p-6 shadow-2xl sm:p-10" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Подання на бронювання">
        <button onClick={onClose} aria-label="Закрити" className="absolute right-4 top-4 rounded-full p-2 text-slate transition hover:bg-mist-100 hover:text-navy"><X size={22} /></button>

        {done ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E6F4EA] text-[#1E6B3A]"><Check size={34} /></div>
            <h2 className="mt-5 text-3xl font-bold text-navy">Заявку надіслано</h2>
            <p className="mx-auto mt-3 max-w-md text-slate">Статус: <b className="text-navy">«На розгляді»</b>. Адміністраторка розгляне її, а її коментар ви побачите в розділі «Мої заявки».</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href={`#/petition/${done.id}`} onClick={onClose} className={arrowBtn}>Переглянути подання <ArrowRight size={18} className="text-gold transition-transform group-hover:translate-x-1" /></a>
              <a href="#/my" onClick={onClose} className="rounded-md border-2 border-mist-200 px-6 py-3 font-semibold text-navy transition hover:border-gold">Мої заявки</a>
            </div>
          </div>
        ) : (
          <>
            <h2 className="pr-8 text-3xl font-bold text-navy">Подання на бронювання</h2>
            <p className="mt-2 rounded-lg bg-mist-100 px-4 py-2.5 text-sm text-navy"><b>{room.name}</b> · {when}</p>

            <div className="mt-6 grid grid-cols-4 gap-2">
              {STEPS.map((t, i) => (
                <div key={t}>
                  <div className={`h-1.5 rounded-full ${i <= step ? "bg-gold" : "bg-mist-200"}`} />
                  <div className={`mt-1.5 text-xs font-semibold ${i === step ? "text-navy" : "text-slate-300"}`}>{i + 1}. {t}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-4">
              {step === 0 && (<>
                <Row label="ПІБ відповідальної особи"><input className={inputCls} value={f.full_name} onChange={set("full_name")} placeholder="Коваленко Олена Іванівна" autoComplete="name" /></Row>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Row label="Факультет-курс"><input className={inputCls} value={f.faculty_course} onChange={set("faculty_course")} placeholder="ФСНСТ-3" /></Row>
                  <Row label="Телефон"><input className={inputCls} type="tel" value={f.phone} onChange={set("phone")} placeholder="+380XXXXXXXXX" autoComplete="tel" /></Row>
                </div>
                <Row label="Посада в СО" hint="Напр. «Секретарка». Можна залишити порожнім."><input className={inputCls} value={f.applicant_role} onChange={set("applicant_role")} /></Row>
                <p className="rounded-lg bg-mist-100 px-4 py-3 text-sm text-slate">Пошта для зв'язку: <b className="text-navy">{user.email}</b></p>
              </>)}

              {step === 1 && (<>
                <Row label="Назва СО" hint="Напр. «Радіо КВІТ». Якщо подаєте від себе — залиште порожнім."><input className={inputCls} value={f.organization} onChange={set("organization")} /></Row>
                <Row label="Назва заходу"><input className={inputCls} value={f.event_name} onChange={set("event_name")} /></Row>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Row label="Організатори" hint="За замовчуванням — ви"><input className={inputCls} value={f.organizers} onChange={set("organizers")} placeholder={shortName(f.full_name)} /></Row>
                  <Row label="Очікувана кількість учасників" hint={`До ${room.capacity} осіб`}><input className={inputCls} type="number" min="1" max={room.capacity} value={f.expected_participants} onChange={set("expected_participants")} /></Row>
                </div>
                <Row label="Опис заходу"><textarea className={inputCls} rows={4} maxLength={2000} value={f.event_description} onChange={set("event_description")} /></Row>
              </>)}

              {step === 2 && (<>
                <div>
                  <div className="mb-2 text-sm font-semibold text-navy">Яка апаратура потрібна?</div>
                  <div className="flex flex-wrap gap-2">
                    {room.inventory.map((it) => {
                      const on = f.equipment.includes(it);
                      return (
                        <button key={it} type="button" onClick={() => toggle(it)} aria-pressed={on}
                                className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-semibold transition ${on ? "border-gold bg-gold/10 text-navy" : "border-mist-200 bg-white text-slate hover:border-gold"}`}>
                          {on && <Check size={15} className="text-gold" />}{it}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate">Список взято з наявного інвентарю «{room.name}». Якщо нічого не потрібно — пропустіть.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Row label="Контактна особа" hint="За замовчуванням — ви"><input className={inputCls} value={f.contact_name} onChange={set("contact_name")} placeholder={contactName(f.full_name)} /></Row>
                  <Row label="Контактний телефон"><input className={inputCls} type="tel" value={f.contact_phone} onChange={set("contact_phone")} placeholder={normPhone(f.phone) || "+380XXXXXXXXX"} /></Row>
                </div>
              </>)}

              {step === 3 && (<>
                <dl className="divide-y divide-mist-200 rounded-lg border border-mist-200 text-sm">
                  {summary.map(([k, v]) => (
                    <div key={k} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[170px_1fr]"><dt className="text-slate">{k}</dt><dd className="font-semibold text-navy-dark">{v}</dd></div>
                  ))}
                </dl>
                <p className="text-xs text-slate">Після надсилання заявка отримає статус «На розгляді». Слот буде остаточно закріплено лише після підтвердження адміністраторкою.</p>
              </>)}
            </div>

            {err && (
              <div className="mt-4 rounded-lg bg-coral/10 px-4 py-3 text-sm text-navy-dark">
                ⚠️ {err}
                {conflict && <button onClick={onClose} className="ml-3 font-semibold text-blue underline">Обрати інший час</button>}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              {step > 0 ? (
                <button type="button" onClick={back} className="group inline-flex items-center gap-2 font-semibold text-slate transition hover:text-navy">
                  <ArrowLeft size={18} className="text-gold transition-transform group-hover:-translate-x-1" /> Назад
                </button>
              ) : <button type="button" onClick={onClose} className="font-semibold text-slate transition hover:text-navy">Скасувати</button>}
              {step < 3 ? (
                <button type="button" onClick={next} className={arrowBtn}>Далі <ArrowRight size={18} className="text-gold transition-transform group-hover:translate-x-1" /></button>
              ) : (
                <button type="button" onClick={submit} disabled={busy || conflict} className={arrowBtn}>{busy ? "Надсилаємо…" : err && !conflict ? "Спробувати ще раз" : "Надіслати заявку"}</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
