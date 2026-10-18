import { Mail, MapPin, Phone, Printer } from "lucide-react";
import { CONTACT } from "../config";

const Label = ({ children }) => <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white/60">{children}</h2>;

export default function Footer() {
  return (
    <footer id="contacts" className="mt-20 scroll-mt-28 bg-navy text-white print:hidden">
      <div className="grid gap-10 px-page py-14 md:grid-cols-4">
        <div>
          <img src="/logo-naukma-white.svg" alt="Національний університет «Києво-Могилянська академія»" width="293" height="100" loading="lazy" className="h-14 w-auto" />
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
          <nav aria-label="Навігація у футері" className="space-y-2">
            <div><a href="/#buildings" className="inline-block py-1 hover:underline">Обрати корпус</a></div>
            <div><a href="#contacts" className="inline-block py-1 hover:underline">Контакти</a></div>
          </nav>
        </div>
      </div>
      <div className="border-t border-white/10 px-page py-6 text-sm text-white/60">
        © {new Date().getFullYear()} Києво-Могилянська академія. Усі права захищено.
      </div>
    </footer>
  );
}
