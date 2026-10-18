import { getBuildings } from "../api";
import BuildingGrid from "../components/BuildingGrid";
import ErrorBanner from "../components/ErrorBanner";
import HeroCarousel from "../components/HeroCarousel";
import SectionTitle from "../components/SectionTitle";
import { useFetch } from "../hooks";
import { useMeta } from "../seo";

export default function HomePage() {
  const { data, error, loading, reload } = useFetch(getBuildings, []);
  useMeta();
  return (
    <main id="content" tabIndex={-1} className="outline-none">
      <HeroCarousel />
      <section id="buildings" aria-labelledby="buildings-title" className="scroll-mt-24 px-page py-20">
        <SectionTitle eyebrow="Корпуси кампусу"><span id="buildings-title">Оберіть корпус</span></SectionTitle>
        {error && <ErrorBanner message={error} onRetry={reload} />}
        {loading && <p className="text-center text-slate">Завантаження…</p>}
        {data && <BuildingGrid buildings={data} />}
      </section>
    </main>
  );
}
