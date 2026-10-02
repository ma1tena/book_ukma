import { Mail, MapPin, Phone, Printer } from "lucide-react";
import { CONTACT } from "../config";
import { goSection } from "../router";

const Label = ({ children }) => <div className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white/50">{children}</div>;

export default function Footer() {
  return (
    <footer id="contacts" className="mt-20 scroll-mt-28 bg-navy text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-4">
        <div>
          <img src="/logo-naukma-white.svg" alt="НаУКМА" className="h-14 w-auto" />
          <p className="mt-5 text-sm leading-6 text-white/60">{CONTACT.org}</p>
        </div>
        <div>
          <Label>Адреса</Label>
          <div className="flex gap-3"><MapPin size={18} className="mt-1 shrink-0 text-white/60" />
            <div>{CONTACT.street}<br />{CONTACT.city}</div></div>
        </div>
        <div className="space-y-2">
          <Label>Зв'язок</Label>
          <div className="flex items-center gap-3"><Phone size={18} className="text-white/60" />тел.: {CONTACT.phone}</div>
          <div className="flex items-center gap-3"><Printer size={18} className="text-white/60" />факс.: {CONTACT.fax}</div>
          <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-3 hover:underline"><Mail size={18} className="text-white/60" />{CONTACT.email}</a>
        </div>
        <div className="space-y-2">
          <Label>Навігація</Label>
          <div><button onClick={() => goSection("buildings")} className="hover:underline">Обрати корпус</button></div>
          <div><button onClick={() => goSection("contacts")} className="hover:underline">Контакти</button></div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl border-t border-white/10 px-6 py-6 text-sm text-white/50">
        © {new Date().getFullYear()} Києво-Могилянська академія. Усі права захищено.
      </div>
    </footer>
  );
}
