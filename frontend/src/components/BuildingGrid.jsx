import { ArrowRight } from "lucide-react";

/* Комірка: 656 px Figma завширшки; усе всередині задано в тих самих одиницях,
   тому масштабується разом із коміркою. Сітка: 3 × 656 + 2 × 42 = 2052 px. */
export default function BuildingGrid({ buildings }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2 lg:w-[calc(var(--u)*2052)] lg:max-w-none lg:grid-cols-[repeat(3,calc(var(--u)*656))] lg:gap-[calc(var(--u)*42)]">
      {buildings.map((b) => {
        const body = (
          <>
            <div className="min-w-0">
              <div className={`text-2xl font-bold lg:text-[length:calc(var(--u)*46)] lg:leading-tight ${b.is_active ? "text-navy" : "text-slate-300"}`}>{b.name}</div>
              {b.description && (
                <p className={`mt-3 lg:mt-[calc(var(--u)*18)] lg:text-[length:calc(var(--u)*30)] lg:leading-snug ${b.is_active ? "text-slate" : "text-slate-300"}`}>{b.description}</p>
              )}
            </div>
            {b.is_active ? (
              <ArrowRight className="shrink-0 text-gold transition-transform group-hover:translate-x-1 lg:h-[calc(var(--u)*44)] lg:w-[calc(var(--u)*44)]" />
            ) : (
              <span className="shrink-0 rounded-full bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold lg:px-[calc(var(--u)*26)] lg:py-[calc(var(--u)*13)] lg:text-[length:calc(var(--u)*26)]">Незабаром</span>
            )}
          </>
        );
        const base = "flex min-h-[170px] items-center justify-between gap-4 rounded-xl border p-8 transition lg:min-h-[calc(var(--u)*393)] lg:gap-[calc(var(--u)*24)] lg:p-[calc(var(--u)*52)]";
        return b.is_active ? (
          <a key={b.id} href={`#/building/${b.id}`} className={`group ${base} border-transparent bg-mist hover:border-gold hover:bg-white`}>{body}</a>
        ) : (
          <div key={b.id} className={`${base} cursor-not-allowed border-mist-200 bg-white/70`} aria-disabled="true">{body}</div>
        );
      })}
    </div>
  );
}
