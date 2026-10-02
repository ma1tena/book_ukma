import Footer from "./components/Footer";
import Header from "./components/Header";
import BuildingPage from "./pages/BuildingPage";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import { useRoute } from "./router";

export default function App() {
  const route = useRoute();
  return (
    <>
      <Header />
      {route.name === "home" && <HomePage />}
      {route.name === "building" && <BuildingPage key={route.id} id={route.id} />}
      {route.name === "room" && <RoomPage key={route.id} id={route.id} />}
      <Footer />
    </>
  );
}
