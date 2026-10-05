import { useAuth } from "../auth";
import SectionTitle from "../components/SectionTitle";
import BookingsTab from "./admin/BookingsTab";
import ContentTab from "./admin/ContentTab";

const TABS = [["bookings", "Заявки", "#/admin"], ["content", "Корпуси і приміщення", "#/admin/content"]];

export default function AdminPage({ tab }) {
  const { user, ready, openAuth } = useAuth();
  if (!ready) return <p className="py-32 text-center text-slate">Завантаження…</p>;

  if (!user || user.role !== "admin") {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <SectionTitle eyebrow="Кабінет">Адміністратор</SectionTitle>
        {!user ? (
          <>
            <p className="text-slate">Увійдіть акаунтом адміністратора.</p>
            <button onClick={() => openAuth({ view: "login" })} className="mt-5 rounded-md border-2 border-navy bg-navy px-6 py-3 font-semibold text-white transition hover:border-gold hover:bg-white hover:text-navy">Увійти</button>
          </>
        ) : <p className="text-slate">У цього акаунта ({user.email}) немає прав адміністратора.</p>}
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <SectionTitle eyebrow="Кабінет">Адміністратор</SectionTitle>
      <div className="mb-8 flex flex-wrap gap-2 border-b border-mist-200">
        {TABS.map(([id, label, href]) => (
          <a key={id} href={href} className={`-mb-px border-b-2 px-5 py-3 text-lg font-semibold transition ${tab === id ? "border-gold text-navy" : "border-transparent text-slate hover:text-navy"}`}>{label}</a>
        ))}
      </div>
      {tab === "content" ? <ContentTab /> : <BookingsTab />}
    </main>
  );
}
