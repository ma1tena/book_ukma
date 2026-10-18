import { useEffect, useState } from "react";

// Роутер на History API: /  ·  /building/1  ·  /room/3  (кнопка «Назад» браузера працює)
// Звичайні адреси без «#» потрібні, щоб пошуковики індексували кожну сторінку окремо.
const EVENT = "book_ukma:navigate";

// Старі посилання (#/room/3 з листів і закладок) переписуємо на нові до першого рендеру
if (window.location.hash.startsWith("#/")) {
  history.replaceState(null, "", window.location.hash.slice(1) || "/");
}

function parse() {
  const [, a, b] = window.location.pathname.split("/");
  if (a === "building" && +b) return { name: "building", id: +b };
  if (a === "room" && +b) return { name: "room", id: +b };
  if (a === "cabinet") return { name: "cabinet", tab: ["content", "managers", "mine"].includes(b) ? b : "bookings" };
  if (a === "my") return { name: "cabinet", tab: "mine" };          // старі посилання
  if (a === "admin") return { name: "cabinet", tab: b === "content" ? "content" : "bookings" };
  if (a === "petition" && +b) return { name: "petition", id: +b };
  if (a === "auth") return { name: "auth" };          // повернення з Office 365
  return { name: "home" };
}

/** Перехід без перезавантаження сторінки. */
export function navigate(to, { replace = false } = {}) {
  const url = new URL(to, window.location.href);
  const same = url.pathname === window.location.pathname && url.search === window.location.search;
  if (!same) history[replace ? "replaceState" : "pushState"](null, "", url.pathname + url.search + url.hash);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { hash: url.hash, samePage: same } }));
}

// Кліки по внутрішніх <a href="/…"> обробляємо самі, тож у розмітці лишаються звичайні посилання
document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest?.("a[href]");
  if (!a || a.target || a.hasAttribute("download")) return;
  const url = new URL(a.href, window.location.href);
  if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return;
  // Якір на цій же сторінці (#contacts, /#buildings на головній) браузер прокрутить сам
  if (url.hash && url.pathname === window.location.pathname && url.search === window.location.search) return;
  e.preventDefault();
  navigate(url.pathname + url.search + url.hash);
});

function scrollToHash(hash, delay = 0) {
  setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), delay);
}

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    let path = window.location.pathname;
    const on = (e) => {
      // popstate приходить і від переходу за якорем на тій же сторінці — тоді нічого не робимо
      const samePage = e.detail ? e.detail.samePage : window.location.pathname === path;
      path = window.location.pathname;
      if (samePage) return e.detail?.hash && scrollToHash(e.detail.hash);
      setRoute(parse());
      if (e.detail?.hash) scrollToHash(e.detail.hash, 350);
      else if (e.detail) window.scrollTo(0, 0);
    };
    window.addEventListener(EVENT, on);
    window.addEventListener("popstate", on);
    return () => { window.removeEventListener(EVENT, on); window.removeEventListener("popstate", on); };
  }, []);
  return route;
}
