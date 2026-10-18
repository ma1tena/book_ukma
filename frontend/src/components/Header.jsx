import { LogOut, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../auth";
import { CONTACT } from "../config";

// Бокові відступи: спільний токен --page-x (82 px Figma), такий самий у вмісту й футера
const PAD = "px-page";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const { user, ready, openAuth, logout } = useAuth();
  const shortName = user ? (user.full_name.split(" ")[1] || user.full_name || user.email.split("@")[0]) : "";
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const item = "flex items-center gap-2 transition hover:text-navy";

  return (
    <>
      {/* Верхня смужка: лінія знизу на відстані 67 px Figma від початку сторінки */}
      <div className="bg-white print:hidden">
        <div className={PAD}>
          <div className="flex items-center justify-between gap-6 border-b border-mist-100 py-1.5 text-sm text-muted lg:h-[max(2.5rem,calc(var(--u)*67))] lg:py-0">
            <span className="hidden md:inline">Києво-Могилянська Академія</span>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <a href="tel:+380444256059" className={`${item} py-1`}><Phone size={15} />{CONTACT.phone}</a>
              <a href={`mailto:${CONTACT.email}`} className={`${item} py-1`}><Mail size={15} />{CONTACT.email}</a>
              <span className={`${item} hidden py-1 md:flex`}><MapPin size={15} />вул. Григорія Сковороди, 2, Київ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Липка головна панель: лого завжди зверху, клік — на головну */}
      <header className={`sticky top-0 z-40 bg-white transition-shadow print:hidden ${scrolled ? "shadow-md" : ""}`}>
        <div className={`flex items-center justify-between gap-6 transition-all ${PAD} ${scrolled ? "py-2" : "py-4 md:py-6"}`}>
          <a href="/" aria-label="На головну">
            <img src="/logo-naukma.svg" alt="Національний університет «Києво-Могилянська академія»" fetchpriority="high" width="293" height="100"
                 className={`w-auto transition-all ${scrolled ? "h-12 md:h-14" : "h-16 md:h-20"}`} />
          </a>
          {/* Усі пункти — прямі діти одного flex з однаковим gap, тож відстані рівні */}
          <nav className="flex items-center gap-4 text-navy sm:gap-6 md:gap-8">
            <a href="#contacts" className="hidden text-lg font-semibold transition hover:text-blue sm:block">
              Контакти
            </a>
            {ready && user && (
              <a href="/cabinet" className="rounded-md border-2 border-gold px-3 py-1 text-sm font-bold uppercase tracking-wider transition hover:bg-gold/10">
                Кабінет
              </a>
            )}
            {ready && user && (
              <span className="hidden items-center gap-2 text-lg font-semibold md:flex" title={user.email}>
                <UserRound size={20} className="text-gold" />{shortName}
              </span>
            )}
            {ready && user && (
              <button onClick={logout} aria-label="Вийти" title="Вийти" className="-m-2 rounded-md p-2 text-slate transition hover:text-navy">
                <LogOut size={20} />
              </button>
            )}
            {ready && !user && (
              <button onClick={() => openAuth({ view: "login" })} className="text-lg font-semibold transition hover:text-blue">Увійти</button>
            )}
            <a href="/#buildings"
               className="rounded-md border-2 border-navy px-4 py-2.5 text-sm font-bold uppercase tracking-widest transition hover:border-gold hover:bg-mist-50 md:px-7 md:py-3">
              Обрати корпус
            </a>
          </nav>
        </div>
      </header>
    </>
  );
}
