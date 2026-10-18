import { ArrowLeft } from "lucide-react";
import { getBuildingRooms, getBuildings } from "../api";
import ErrorBanner from "../components/ErrorBanner";
import RoomCard from "../components/RoomCard";
import SectionTitle from "../components/SectionTitle";
import { useFetch } from "../hooks";
import { useMeta } from "../seo";

export default function BuildingPage({ id }) {
  const { data, error, loading, reload } = useFetch(async () => {
    const [buildings, rooms] = await Promise.all([getBuildings(), getBuildingRooms(id)]);
    return { building: buildings.find((b) => b.id === id), rooms };
  }, [id]);
  const name = data?.building?.name;
  useMeta({
    title: name ? `${name}: приміщення` : "Приміщення корпусу",
    description: name && `Приміщення для заходів у корпусі «${name}» НаУКМА: місткість, обладнання та вільні дати. ${data.building.description || ""}`.trim(),
  });

  // Вміст вужчий за шапку (2374 px Figma), тому центруємо max-width, а лінію старту задає той самий px-page
  return (
    <main id="content" tabIndex={-1} className="px-page py-16 outline-none">
      <div className="mx-auto max-w-5xl lg:max-w-[calc(var(--u)*2374)]">
        <a href="/" className="group inline-flex items-center gap-2 py-1 text-slate transition hover:text-navy">
          <ArrowLeft size={18} className="text-gold transition-transform group-hover:-translate-x-1" /> До переліку корпусів
        </a>
        <div className="mt-8">
          <SectionTitle as="h1" eyebrow="Приміщення для бронювання">{name || "Приміщення корпусу"}</SectionTitle>
          {error && <ErrorBanner message={error} onRetry={reload} />}
          {loading && <p className="text-center text-slate">Завантаження приміщень…</p>}
          {data && (
            <div className="grid gap-6">
              {data.rooms.length === 0 && <p className="text-center text-slate">Приміщення скоро з'являться.</p>}
              {data.rooms.map((r) => <RoomCard key={r.id} room={r} />)}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
