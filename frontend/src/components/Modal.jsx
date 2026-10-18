import { X } from "lucide-react";
import { useEffect, useRef } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Модальне вікно: фокус переходить усередину й не виходить за межі (Tab / Shift+Tab),
 * Esc закриває, фон не прокручується, після закриття фокус повертається туди, звідки відкрили.
 * label — назва діалогу для скрінрідерів (зазвичай той самий текст, що й заголовок h2).
 */
export default function Modal({ label, onClose, maxWidth = "max-w-[520px]", overlayClass = "", panelClass = "p-6 sm:p-10", children }) {
  const panel = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panel.current.querySelector(`input, textarea, select`) || panel.current;
    first.focus();

    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); close.current(); return; }
      if (e.key !== "Tab") return;
      const items = [...panel.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const [a, z] = [items[0], items[items.length - 1]];
      if (e.shiftKey && (document.activeElement === a || document.activeElement === panel.current)) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  return (
    <div className={`fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-dark/60 p-4 sm:items-center ${overlayClass}`} onClick={onClose}>
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label}
           className={`relative my-6 w-full rounded-2xl bg-white shadow-2xl outline-none ${maxWidth} ${panelClass}`}
           onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Закрити" className="absolute right-4 top-4 rounded-full p-2 text-slate transition hover:bg-mist-100 hover:text-navy"><X size={22} /></button>
        {children}
      </div>
    </div>
  );
}
