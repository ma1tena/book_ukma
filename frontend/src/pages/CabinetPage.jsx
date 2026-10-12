import { useAuth } from "../auth";
import SectionTitle from "../components/SectionTitle";
import BookingsTab from "./admin/BookingsTab";
import ContentTab from "./admin/ContentTab";
import ManagersTab from "./admin/ManagersTab";
import MyBookings from "./MyBookings";

/** Єдиний кабінет: звичайний користувач бачить свої заявки; адміністратор — ще й заявки та зміст своїх приміщень. */
export default function CabinetPage({ tab }) {
  const { user, ready, openAuth } = useAuth();
  if (!ready) return <p className="py-32 text-center text-slate">Завантаження…</p>;

  if (!user) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <SectionTitle eyebrow="Кабінет">Особистий кабінет</SectionTitle>
        <p className="text-slate">Увійдіть, щоб побачити свої заявки та їхні статуси.</p>
        <button onClick={() => openAuth({ view: "login" })} className="mt-5 rounded-md border-2 border-navy bg-navy px-6 py-3 font-semibold text-white transition hover:border-gold hover:bg-white hover:text-navy">Увійти</button>
      </main>
    );
  }

  const isAdmin = user.role === "admin";
  const isStaff = isAdmin || user.role === "manager";

  if (!isStaff) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <SectionTitle eyebrow="Кабінет">Мої заявки</SectionTitle>
        <MyBookings />
      </main>
    );
  }

  const tabs = [
    ["bookings", "Заявки", "#/cabinet"],
    ["content", "Приміщення", "#/cabinet/content"],
    ...(isAdmin ? [["managers", "Адміністратори", "#/cabinet/managers"]] : []),
    ["mine", "Мої заявки", "#/cabinet/mine"],
  ];
  const active = tabs.some(([id]) => id === tab) ? tab : "bookings";
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <SectionTitle eyebrow="Кабінет">{isAdmin ? "Адміністратор" : "Адміністратор приміщень"}</SectionTitle>
      <div className="mb-8 flex flex-wrap gap-2 border-b border-mist-200">
        {tabs.map(([id, label, href]) => (
          <a key={id} href={href} className={`-mb-px border-b-2 px-5 py-3 text-lg font-semibold transition ${active === id ? "border-gold text-navy" : "border-transparent text-slate hover:text-navy"}`}>{label}</a>
        ))}
      </div>
      {active === "content" && <ContentTab isAdmin={isAdmin} />}
      {active === "managers" && <ManagersTab />}
      {active === "mine" && <MyBookings />}
      {active === "bookings" && <BookingsTab />}
    </main>
  );
}
