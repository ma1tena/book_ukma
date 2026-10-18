/** Заголовок секції. as="h1" — коли це головний заголовок сторінки. */
export default function SectionTitle({ eyebrow, as: Tag = "h2", children }) {
  return (
    <div className="mb-12 text-center">
      {eyebrow && <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue md:text-sm">{eyebrow}</div>}
      <Tag className="mt-3 text-4xl font-bold tracking-tight text-navy md:text-5xl">{children}</Tag>
      <div className="mx-auto mt-6 h-px w-28 bg-gold" aria-hidden="true" />
    </div>
  );
}
