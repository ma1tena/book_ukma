import { useEffect } from "react";
import { AuthProvider, useAuth } from "./auth";
import AuthModal from "./components/AuthModal";
import ErrorBanner from "./components/ErrorBanner";
import Footer from "./components/Footer";
import Header from "./components/Header";
import BuildingPage from "./pages/BuildingPage";
import AdminPage from "./pages/AdminPage";
import HomePage from "./pages/HomePage";
import MyBookingsPage from "./pages/MyBookingsPage";
import PetitionPage from "./pages/PetitionPage";
import RoomPage from "./pages/RoomPage";
import { useRoute } from "./router";

function Shell() {
  const route = useRoute();
  const { acceptToken, notice, setNotice } = useAuth();

  // Повернення з Office 365: #/auth/callback?token=…  або  ?error=…
  useEffect(() => {
    if (route.name !== "auth") return;
    const q = new URLSearchParams(window.location.hash.split("?")[1] || "");
    const back = sessionStorage.getItem("book_ukma_return") || "#/";
    sessionStorage.removeItem("book_ukma_return");
    (async () => {
      if (q.get("token")) await acceptToken(q.get("token"));
      else if (q.get("error")) setNotice(q.get("error"));
      window.location.hash = back;
    })();
  }, [route.name]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Header />
      {notice && <div className="px-4"><ErrorBanner message={notice} onClose={() => setNotice(null)} /></div>}
      {route.name === "home" && <HomePage />}
      {route.name === "building" && <BuildingPage key={route.id} id={route.id} />}
      {route.name === "room" && <RoomPage key={route.id} id={route.id} />}
      {route.name === "admin" && <AdminPage tab={route.tab} />}
      {route.name === "my" && <MyBookingsPage />}
      {route.name === "petition" && <PetitionPage key={route.id} id={route.id} />}
      {route.name === "auth" && <p className="py-32 text-center text-slate">Входимо…</p>}
      <Footer />
      <AuthModal />
    </>
  );
}

export default function App() {
  return <AuthProvider><Shell /></AuthProvider>;
}
