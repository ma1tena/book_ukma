import { LogOut, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../auth";
import { CONTACT } from "../config";
import { goSection } from "../router";

// Бокові відступи шапки: 82 px Figma (≈3,3% ширини)
const PAD = "px-4 lg:px-[calc(var(--u)*82)]";

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
      <div className="bg-white">
        <div className={PAD}>
          <div className="flex items-center justify-between gap-6 border-b border-[#EBF2FF] py-2.5 text-sm text-[#71738B] lg:h-[calc(var(--u)*67)] lg:py-0">
            <span className="hidden md:inline">Києво-Могилянська Академія</span>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <a href="tel:+380444256059" className={item}><Phone size={15} />{CONTACT.phone}</a>
              <a href={`mailto:${CONTACT.email}`} className={item}><Mail size={15} />{CONTACT.email}</a>
              <span className={item}><MapPin size={15} />вул. Григорія Сковороди, 2, Київ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Липка головна панель: лого завжди зверху, клік — на головну */}
      <header className={`sticky top-0 z-40 bg-white transition-shadow ${scrolled ? "shadow-md" : ""}`}>
        <div className={`flex items-center justify-between gap-6 transition-all ${PAD} ${scrolled ? "py-2" : "py-4 md:py-6"}`}>
          <a href="#/" aria-label="На головну">
            <img src="/logo-naukma.svg" alt="НаУКМА" fetchpriority="high"
                 className={`w-auto transition-all ${scrolled ? "h-12 md:h-14" : "h-16 md:h-20"}`} />
          </a>
          <nav className="flex items-center gap-6 md:gap-10">
            <button onClick={() => goSection("contacts")} className="hidden text-lg font-semibold text-navy transition hover:text-blue sm:block">
              Контакти
            </button>
            {ready && (user ? (
              <div className="flex items-center gap-3 text-navy">
                <span className="hidden items-center gap-2 font-semibold md:flex" title={user.email}><UserRound size={20} className="text-gold" />{shortName}</span>
                <button onClick={logout} aria-label="Вийти" title="Вийти" className="rounded-full p-2 text-slate transition hover:bg-mist-100 hover:text-navy"><LogOut size={20} /></button>
              </div>
            ) : (
              <button onClick={() => openAuth({ view: "login" })} className="text-lg font-semibold text-navy transition hover:text-blue">Увійти</button>
            ))}
            <button onClick={() => goSection("buildings")}
                    className="rounded-md border-2 border-navy px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-navy transition hover:border-gold hover:bg-mist-50 md:px-7 md:py-3">
              Обрати корпус
            </button>
          </nav>
        </div>
      </header>
    </>
  );
}
