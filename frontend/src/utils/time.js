export const SLOT_MIN = 30;
export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 22;

const pad = (n) => String(n).padStart(2, "0");
export const addMin = (d, m) => new Date(d.getTime() + m * 60000);
export const overlaps = (s, e, bs, be) => s < be && e > bs;
export const fmtTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const fmt = (d, opts) => new Intl.DateTimeFormat("uk-UA", opts).format(d);

/** Локальний «наївний» ISO — саме такий очікує бекенд (київський час без пояса). */
export const toLocalISO = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

export function daySlots(day) {
  const out = [];
  for (let m = OPEN_HOUR * 60; m < CLOSE_HOUR * 60; m += SLOT_MIN) {
    const d = new Date(day);
    d.setHours(0, m, 0, 0);
    out.push(d);
  }
  return out;
}

export function nextDays(n) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(t);
    d.setDate(t.getDate() + i);
    return d;
  });
}
