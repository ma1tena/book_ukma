import { useEffect } from "react";
import { AuthProvider, useAuth } from "./auth";
import AuthModal from "./components/AuthModal";
import ErrorBanner from "./components/ErrorBanner";
import Footer from "./components/Footer";
import Header from "./components/Header";
import BuildingPage from "./pages/BuildingPage";
import CabinetPage from "./pages/CabinetPage";
import HomePage from "./pages/HomePage";
import PetitionPage from "./pages/PetitionPage";
import RoomPage from "./pages/RoomPage";
import { navigate, useRoute } from "./router";

function Shell() {
  const route = useRoute();
  const { acceptToken, notice, setNotice } = useAuth();

  // Повернення з Office 365: /auth/callback#token=…  або  #error=…
  // Токен передається після «#», щоб не потрапити в логи сервера й заголовок Referer.
  useEffect(() => {
    if (route.name !== "auth") return;
    const q = new URLSearchParams(window.location.hash.slice(1));
    const back = sessionStorage.getItem("book_ukma_return") || "/";
    sessionStorage.removeItem("book_ukma_return");
    (async () => {
      if (q.get("token")) await acceptToken(q.get("token"));
      else if (q.get("error")) setNotice(q.get("error"));
      navigate(back, { replace: true });
    })();
  }, [route.name]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <a href="#content" className="sr-only z-50 rounded-md bg-navy px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Перейти до вмісту
      </a>
      <Header />
      {notice && <div className="px-4"><ErrorBanner message={notice} onClose={() => setNotice(null)} /></div>}
      {route.name === "home" && <HomePage />}
      {route.name === "building" && <BuildingPage key={route.id} id={route.id} />}
      {route.name === "room" && <RoomPage key={route.id} id={route.id} />}
      {route.name === "cabinet" && <CabinetPage tab={route.tab} />}
      {route.name === "petition" && <PetitionPage key={route.id} id={route.id} />}
      {route.name === "auth" && <main id="content" className="py-32 text-center text-slate">Входимо…</main>}
      <Footer />
      <AuthModal />
    </>
  );
}

export default function App() {
  return <AuthProvider><Shell /></AuthProvider>;
}
