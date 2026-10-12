import { ArrowRight } from "lucide-react";
import * as api from "../api";
import { useAuth } from "../auth";
import ErrorBanner from "../components/ErrorBanner";
import { useFetch } from "../hooks";
import { STATUS } from "../utils/status";
import { fmt, fmtTime } from "../utils/time";

export default function MyBookings() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useFetch(() => (user ? api.myBookings() : Promise.resolve([])), [user?.id]);

  return (
    <div className="mx-auto max-w-4xl">
      {user && error && <ErrorBanner message={error} onRetry={reload} />}
      {user && loading && !data && <p className="text-center text-slate">Завантаження…</p>}
      {user && data?.length === 0 && (
        <p className="text-center text-slate">Заявок ще немає. Оберіть <a href="#/" className="font-semibold text-blue underline">корпус і приміщення</a>, щоб створити першу.</p>
      )}

      <div className="space-y-4">
        {data?.map((b) => {
          const s = new Date(b.start_time), e = new Date(b.end_time), st = STATUS[b.status];
          return (
            <article key={b.id} className="rounded-2xl bg-white p-6 ring-1 ring-mist-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-navy">{b.event_name}</h3>
                  <p className="mt-1 text-slate">{b.room_name} · {fmt(s, { day: "numeric", month: "long", year: "numeric" })}, {fmtTime(s)}–{fmtTime(e)}</p>
                </div>
                <span className={`rounded-full border px-4 py-1.5 text-sm font-bold ${st.cls}`}>{st.label}</span>
              </div>
              {b.admin_comment && (
                <div className="mt-4 rounded-lg bg-gold/10 px-4 py-3 text-sm text-navy-dark">
                  <b className="text-navy">Коментар адміністраторки:</b> {b.admin_comment}
                </div>
              )}
              <a href={`#/petition/${b.id}`} className="group mt-4 inline-flex items-center gap-2 font-semibold text-blue hover:underline">
                Переглянути подання <ArrowRight size={18} className="text-gold transition-transform group-hover:translate-x-1" />
              </a>
            </article>
          );
        })}
      </div>
    </div>
  );
}
