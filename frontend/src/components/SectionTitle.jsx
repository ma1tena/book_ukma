export default function SectionTitle({ eyebrow, children }) {
  return (
    <div className="mb-12 text-center">
      {eyebrow && <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue md:text-sm">{eyebrow}</div>}
      <h2 className="mt-3 text-4xl font-bold tracking-tight text-navy md:text-5xl">{children}</h2>
      <div className="mx-auto mt-6 h-px w-28 bg-gold" />
    </div>
  );
}
