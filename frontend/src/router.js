import { useEffect, useState } from "react";

// Простий hash-роутер: #/  ·  #/building/1  ·  #/room/3  (кнопка «Назад» браузера працює)
function parse() {
  const [, a, b] = (window.location.hash.replace(/^#/, "") || "/").split("/");
  if (a === "building" && +b) return { name: "building", id: +b };
  if (a === "room" && +b) return { name: "room", id: +b };
  return { name: "home" };
}

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

/** Плавний скрол до секції; з інших сторінок спершу повертає на головну. */
export function goSection(id) {
  const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const h = window.location.hash;
  if (!h || h === "#" || h === "#/") return scroll();
  window.location.hash = "#/";
  setTimeout(scroll, 350);
}
