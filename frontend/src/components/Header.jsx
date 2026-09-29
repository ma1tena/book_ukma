import { CONTACT } from "../config";

export default function Header() {
  return (
    <header className="bg-white" id="top">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-4 px-6 py-5">
        <a href="#top"><img src="/logo-naukma.svg" alt="НаУКМА" className="h-14 w-auto" /></a>
        <nav className="flex gap-8 text-lg font-bold text-navy">
          <a href="#booking" className="transition hover:text-blue">Бронювання</a>
          <a href="#contacts" className="transition hover:text-blue">Контакти</a>
        </nav>
        <div className="text-center text-sm leading-6">
          <div className="font-bold text-navy">{CONTACT.phone}</div>
          <div className="font-bold text-navy">{CONTACT.email}</div>
          <div className="text-slate-300">{CONTACT.address}</div>
        </div>
      </div>
    </header>
  );
}
