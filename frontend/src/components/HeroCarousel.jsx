import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

// Фото лежать у frontend/public/images/ — щоб додати ще одне, допишіть його сюди
const SLIDES = ["/images/hero-1.jpg", "/images/hero-2.jpg", "/images/hero-3.jpg"];
const SLIDE_MS = 5000;

export default function HeroCarousel() {
  const [i, setI] = useState(0);
  const n = SLIDES.length;
  const step = (d) => setI((v) => (v + d + n) % n);

  useEffect(() => {
    const t = setInterval(() => step(1), SLIDE_MS);   // авто-перемикання; ручний клік скидає таймер
    return () => clearInterval(t);
  }, [i]);

  // Коло-перемикач: напівпрозоре, діаметр 113 px Figma
  const arrow = "absolute top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/15 text-gold backdrop-blur-sm transition hover:border-gold hover:bg-white lg:h-[calc(var(--u)*113)] lg:w-[calc(var(--u)*113)]";
  const icon = "lg:h-[calc(var(--u)*44)] lg:w-[calc(var(--u)*44)]";
  return (
    // Висота фото: 978 px Figma
    <section className="relative h-[380px] w-full overflow-hidden bg-navy md:h-[520px] lg:h-[calc(var(--u)*978)]">
      {SLIDES.map((src, k) => (
        <img key={src} src={src} alt="" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${k === i ? "opacity-100" : "opacity-0"}`} />
      ))}
      <div className="absolute inset-0 bg-navy-dark/40" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-16 text-center text-white">
        {/* Заголовок збільшено: 140u замість 110u */}
        <h1 className="flex items-center justify-center text-5xl font-bold tracking-tight drop-shadow-lg md:text-7xl lg:tracking-[-0.0164em] lg:h-[calc(var(--u)*140)] lg:w-[calc(var(--u)*1620)] lg:whitespace-nowrap lg:text-[length:calc(var(--u)*140)] lg:leading-none">
          Kyiv — Mohyla Academy
        </h1>
        {/* Лінія й «BOOK EASILY» — напівпрозорі; текст 262 × 25 px Figma */}
        <div className="my-5 h-px w-28 bg-white/40 lg:my-[calc(var(--u)*40)] lg:w-[calc(var(--u)*240)]" />
        <p className="text-center text-sm uppercase tracking-[0.3em] text-white/70 md:text-lg lg:whitespace-nowrap lg:text-[length:calc(var(--u)*34)] lg:leading-none lg:tracking-[0.3em]">
          Book easily
        </p>
      </div>
      <button onClick={() => step(-1)} aria-label="Попереднє фото" className={`${arrow} left-4 lg:left-[calc(var(--u)*66)]`}><ChevronLeft className={icon} /></button>
      <button onClick={() => step(1)} aria-label="Наступне фото" className={`${arrow} right-4 lg:right-[calc(var(--u)*66)]`}><ChevronRight className={icon} /></button>
      <div className="absolute bottom-6 z-10 flex w-full items-center justify-center gap-2">
        {SLIDES.map((_, k) => (
          <button key={k} onClick={() => setI(k)} aria-label={`Фото ${k + 1}`}
                  className={`h-2.5 rounded-full bg-white transition-all ${k === i ? "w-10" : "w-2.5 opacity-50 hover:opacity-80"}`} />
        ))}
      </div>
    </section>
  );
}
