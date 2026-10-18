import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

// Фото лежать у frontend/public/images/: hero-N.jpg (запасний) і hero-N-{768,1280,1920}.webp.
// Щоб додати слайд, покладіть ці файли й допишіть номер сюди.
const SLIDES = [1, 2, 3].map((n) => ({
  src: `/images/hero-${n}.jpg`,
  srcSet: [768, 1280, 1920].map((w) => `/images/hero-${n}-${w}.webp ${w}w`).join(", "),
}));
const SLIDE_MS = 6000;
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function HeroCarousel() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(reducedMotion);   // зупинено кнопкою або системним «менше руху»
  const [hold, setHold] = useState(false);               // тимчасова пауза: наведення чи фокус усередині
  const n = SLIDES.length;
  const step = (d) => setI((v) => (v + d + n) % n);

  useEffect(() => {
    if (paused || hold) return;
    const t = setInterval(() => step(1), SLIDE_MS);   // авто-перемикання; ручний клік скидає таймер
    return () => clearInterval(t);
  }, [i, paused, hold]); // eslint-disable-line react-hooks/exhaustive-deps

  // Коло-перемикач: напівпрозоре, діаметр 113 px Figma
  const arrow = "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/15 text-gold backdrop-blur-sm transition hover:border-gold hover:bg-white sm:h-12 sm:w-12 lg:h-[max(3rem,calc(var(--u)*113))] lg:w-[max(3rem,calc(var(--u)*113))]";
  const icon = "lg:h-[max(1.5rem,calc(var(--u)*44))] lg:w-[max(1.5rem,calc(var(--u)*44))]";
  return (
    // Висота фото: 978 px Figma, але не нижча за планшетні 520 px
    <section aria-roledescription="карусель" aria-label="Фото кампусу"
             onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}
             onFocus={() => setHold(true)} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHold(false)}
             className="relative h-[380px] w-full overflow-hidden bg-navy md:h-[520px] lg:h-[max(520px,calc(var(--u)*978))]">
      {SLIDES.map((s, k) => (
        <img key={s.src} src={s.src} srcSet={s.srcSet} sizes="100vw" alt="" width="1920" height="1280"
             fetchpriority={k === 0 ? "high" : "low"} loading={k === 0 ? "eager" : "lazy"} decoding="async"
             className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${k === i ? "opacity-100" : "opacity-0"}`} />
      ))}
      <div className="absolute inset-0 bg-navy-dark/40" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-16 text-center text-white sm:px-20">
        {/* Англійський напис — декоративний (як у макеті); для пошуковиків і скрінрідерів — український H1 нижче */}
        <p aria-hidden="true" className="flex items-center justify-center text-4xl font-bold tracking-tight drop-shadow-lg sm:text-5xl md:text-7xl lg:tracking-[-0.0164em] lg:h-[calc(var(--u)*140)] lg:w-[calc(var(--u)*1620)] lg:whitespace-nowrap lg:text-[length:calc(var(--u)*140)] lg:leading-none">
          Kyiv — Mohyla Academy
        </p>
        <div className="my-5 h-px w-28 bg-white/40 lg:my-[calc(var(--u)*40)] lg:w-[calc(var(--u)*240)]" />
        <h1 className="text-center text-sm font-normal uppercase tracking-[0.2em] text-white/80 md:text-lg lg:text-[length:max(1rem,calc(var(--u)*34))] lg:leading-tight lg:tracking-[0.3em]">
          Бронювання приміщень НаУКМА
        </h1>
      </div>
      <button onClick={() => step(-1)} aria-label="Попереднє фото" className={`${arrow} left-3 sm:left-4 lg:left-[calc(var(--u)*66)]`}><ChevronLeft className={icon} /></button>
      <button onClick={() => step(1)} aria-label="Наступне фото" className={`${arrow} right-3 sm:right-4 lg:right-[calc(var(--u)*66)]`}><ChevronRight className={icon} /></button>
      <div className="absolute bottom-3 z-10 flex w-full items-center justify-center">
        {SLIDES.map((_, k) => (
          // Видима крапка маленька, а зона натискання — 34×34 px
          <button key={k} onClick={() => setI(k)} aria-label={`Фото ${k + 1}`} aria-current={k === i}
                  className="group flex h-[34px] min-w-[34px] items-center justify-center px-1">
            <span className={`block h-2.5 rounded-full bg-white transition-all ${k === i ? "w-10" : "w-2.5 opacity-50 group-hover:opacity-80"}`} />
          </button>
        ))}
        <button onClick={() => setPaused((p) => !p)} aria-label={paused ? "Увімкнути автоперемикання" : "Зупинити автоперемикання"}
                className="ml-2 flex h-[34px] w-[34px] items-center justify-center rounded-full text-white/80 transition hover:text-white">
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
      </div>
    </section>
  );
}
