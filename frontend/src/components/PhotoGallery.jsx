import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

/** Галерея: велике фото, золоті стрілки, мініатюри. Фото, яких немає на диску, ховаються самі. */
export default function PhotoGallery({ photos, alt }) {
  const [bad, setBad] = useState(() => new Set());
  const [i, setI] = useState(0);
  const markBad = (src) => setBad((s) => new Set(s).add(src));
  const list = photos.filter((p) => !bad.has(p));
  const n = list.length;
  const cur = n ? Math.min(i, n - 1) : 0;
  const step = (d) => setI((v) => (Math.min(v, n - 1) + d + n) % n);
  const arrow = "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-white/25 text-gold backdrop-blur-sm transition hover:border-gold hover:bg-white";

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-blue-deep">
        {photos.filter((p) => !bad.has(p)).map((src) => (
          <img key={src} src={src} alt={alt} onError={() => markBad(src)}
               className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${src === list[cur] ? "opacity-100" : "opacity-0"}`} />
        ))}
        {n > 1 && (
          <>
            <button onClick={() => step(-1)} aria-label="Попереднє фото" className={`${arrow} left-3`}><ChevronLeft size={22} /></button>
            <button onClick={() => step(1)} aria-label="Наступне фото" className={`${arrow} right-3`}><ChevronRight size={22} /></button>
            <div className="absolute bottom-3 right-3 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white">{cur + 1} / {n}</div>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {list.map((src, k) => (
            <button key={src} onClick={() => setI(k)} aria-label={`Фото ${k + 1}`}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${k === cur ? "border-gold" : "border-transparent opacity-70 hover:opacity-100"}`}>
              <img src={src} alt="" onError={() => markBad(src)} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
