import { ArrowLeft } from "lucide-react";
import { getBuildingRooms, getBuildings } from "../api";
import ErrorBanner from "../components/ErrorBanner";
import RoomCard from "../components/RoomCard";
import SectionTitle from "../components/SectionTitle";
import { useFetch } from "../hooks";

export default function BuildingPage({ id }) {
  const { data, error, loading, reload } = useFetch(async () => {
    const [buildings, rooms] = await Promise.all([getBuildings(), getBuildingRooms(id)]);
    return { building: buildings.find((b) => b.id === id), rooms };
  }, [id]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 md:px-6 lg:max-w-none lg:px-[calc(var(--u)*232)]"><div className="mx-auto">
      <a href="#/" className="group inline-flex items-center gap-2 text-slate transition hover:text-navy">
        <ArrowLeft size={18} className="text-gold transition-transform group-hover:-translate-x-1" /> До переліку корпусів
      </a>
      <div className="mt-10">
        <SectionTitle eyebrow={data?.building?.name}>Наші локації</SectionTitle>
        {error && <ErrorBanner message={error} onRetry={reload} />}
        {loading && <p className="text-center text-slate">Завантаження приміщень…</p>}
        {data && (
          <div className="grid gap-6">
            {data.rooms.length === 0 && <p className="text-center text-slate">Приміщення скоро з'являться.</p>}
            {data.rooms.map((r) => <RoomCard key={r.id} room={r} />)}
          </div>
        )}
      </div>
    </div></main>
  );
}
