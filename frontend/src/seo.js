import { useEffect } from "react";

export const SITE_NAME = "Бронювання приміщень НаУКМА";
export const DEFAULT_DESCRIPTION =
  "Онлайн-бронювання приміщень Києво-Могилянської академії: перевірте вільні дати й подайте заявку на захід за кілька хвилин.";

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

function setLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) { el = document.createElement("link"); el.rel = rel; document.head.appendChild(el); }
  el.href = href;
}

/** Заголовок вкладки, опис і canonical для поточної сторінки. noindex — для кабінету й подань. */
export function useMeta({ title, description = DEFAULT_DESCRIPTION, noindex = false } = {}) {
  useEffect(() => {
    const full = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME}: актова зала, аудиторії, простори`;
    const url = window.location.origin + window.location.pathname;
    document.title = full;
    setMeta("name", "description", description);
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
    setMeta("property", "og:title", full);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setLink("canonical", url);
  }, [title, description, noindex]);
}
