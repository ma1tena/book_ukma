import { ArrowLeft, Printer } from "lucide-react";
import * as api from "../api";
import { useAuth } from "../auth";
import ErrorBanner from "../components/ErrorBanner";
import { PETITION } from "../config";
import { useFetch } from "../hooks";
import { STATUS } from "../utils/status";
import { fmt, fmtTime } from "../utils/time";
import { shortName } from "../utils/names";

export default function PetitionPage({ id }) {
  const { openAuth } = useAuth();
  const { data: b, error, loading, reload } = useFetch(() => api.getBooking(id), [id]);

  const s = b && new Date(b.start_time);
  const e = b && new Date(b.end_time);
  const created = b && new Date(b.created_at.split(".")[0] + "Z");      // бекенд віддає UTC
  const applicant = b && [b.applicant_role, b.organization && `СО «${b.organization}»`].filter(Boolean).join(" ");
  const st = b && STATUS[b.status];

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 md:px-6">
      <a href="#/my" className="group inline-flex items-center gap-2 text-slate transition hover:text-navy print:hidden">
        <ArrowLeft size={18} className="text-gold transition-transform group-hover:-translate-x-1" /> Мої заявки
      </a>
      {error && (
        <div className="print:hidden">
          <ErrorBanner message={error} onRetry={reload} />
          <div className="text-center"><button onClick={() => openAuth({ view: "login" })} className="font-semibold text-blue underline">Увійти</button></div>
        </div>
      )}
      {loading && !b && <p className="mt-10 text-center text-slate">Завантаження…</p>}

      {b && (
        <>
          <div className="mx-auto mt-6 flex max-w-[820px] flex-wrap items-center justify-between gap-3 print:hidden">
            <span className={`rounded-full border px-4 py-1.5 text-sm font-bold ${st.cls}`}>{st.label}</span>
            <button onClick={() => window.print()} className="group inline-flex items-center gap-2 rounded-md border-2 border-navy bg-navy px-5 py-2.5 font-semibold text-white transition hover:border-gold hover:bg-white hover:text-navy">
              <Printer size={18} className="text-gold" /> Друк / зберегти PDF
            </button>
          </div>
          {b.admin_comment && (
            <div className="mx-auto mt-4 max-w-[820px] rounded-xl border border-gold/40 bg-gold/10 px-5 py-4 text-sm text-navy-dark print:hidden">
              <div className="font-bold text-navy">Коментар адміністраторки</div>
              <p className="mt-1">{b.admin_comment}</p>
            </div>
          )}

          <article className="mx-auto mt-6 max-w-[820px] rounded-2xl bg-white p-8 leading-7 text-navy-dark ring-1 ring-mist-200 sm:p-14 print:mt-0 print:max-w-none print:rounded-none print:p-0 print:ring-0">
            <div className="ml-auto w-fit text-right">
              <p>{PETITION.recipientTitle}</p>
              <p>{PETITION.recipientName}</p>
              <div className="mt-4">
                {applicant && <p>{applicant}</p>}
                <p>{shortName(b.responsible_name)}</p>
                <p>{b.faculty_course}</p>
                <p>{b.email}</p>
                <p>{b.phone}</p>
              </div>
            </div>

            <h1 className="mb-6 mt-10 text-center text-2xl font-bold tracking-wide">ПОДАННЯ</h1>
            <p className="indent-10">
              Прохання — дозволити користування приміщенням «{b.room_name}» ({b.building_name}) для проведення заходу «{b.event_name}».
            </p>
            <div className="mt-4 space-y-1">
              <p><b>Організатори:</b> {b.organizers}</p>
              <p><b>Дата й час проведення:</b> {fmt(s, { day: "numeric", month: "long", year: "numeric" })} р., з {fmtTime(s)} до {fmtTime(e)}</p>
              <p><b>Приміщення:</b> {b.room_name}</p>
              <p><b>Очікувана кількість учасників:</b> {b.expected_participants}</p>
              <p><b>Інвентар:</b> {b.equipment.length ? b.equipment.join(", ") : "не потрібен"}</p>
              <p><b>Опис:</b> {b.event_description || "—"}</p>
            </div>
            <div className="mt-6">
              <p><b>Контактні особи:</b></p>
              <p>{b.contact_phone} {b.contact_name}</p>
            </div>

            <p className="mt-10 text-right">{fmt(created, { day: "numeric", month: "long", year: "numeric" })} р.</p>

            <div className="mt-8">
              <p><b>Погоджено:</b></p>
              {b.status === "approved"
                ? <p className="mt-1">{PETITION.approver}</p>
                : <div className="mt-6 w-56 border-b border-navy-dark/40" aria-hidden="true" />}
            </div>
          </article>
        </>
      )}
    </main>
  );
}
