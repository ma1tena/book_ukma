import { getBuildings } from "../api";
import BuildingGrid from "../components/BuildingGrid";
import ErrorBanner from "../components/ErrorBanner";
import HeroCarousel from "../components/HeroCarousel";
import SectionTitle from "../components/SectionTitle";
import { useFetch } from "../hooks";

export default function HomePage() {
  const { data, error, loading, reload } = useFetch(getBuildings, []);
  return (
    <>
      <HeroCarousel />
      <main id="buildings" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 md:px-6">
        <SectionTitle eyebrow="Campus directory">Оберіть корпус</SectionTitle>
        {error && <ErrorBanner message={error} onRetry={reload} />}
        {loading && <p className="text-center text-slate">Завантаження…</p>}
        {data && <BuildingGrid buildings={data} />}
      </main>
    </>
  );
}
