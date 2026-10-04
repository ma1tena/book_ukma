/** «Коваленко Олена Іванівна» → «Коваленко О. І.» */
export function shortName(full = "") {
  const [last, ...rest] = full.trim().split(/\s+/);
  if (!last) return "";
  return [last, ...rest.map((p) => p[0].toUpperCase() + ".")].join(" ");
}

/** «Коваленко Олена Іванівна» → «Коваленко Олена» (для «Контактні особи») */
export const contactName = (full = "") => full.trim().split(/\s+/).slice(0, 2).join(" ");
