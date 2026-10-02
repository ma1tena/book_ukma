import { SLOT_MIN, addMin, daySlots, overlaps } from "./time";

export const parseBooked = (list) =>
  list.map((b) => ({ s: new Date(b.start_time), e: new Date(b.end_time), status: b.status }));

/** free | busy (approved) | pending | past */
export function slotState(s, booked) {
  const e = addMin(s, SLOT_MIN);
  if (e <= new Date()) return "past";
  const hit = booked.find((b) => overlaps(s, e, b.s, b.e));
  if (hit) return hit.status === "approved" ? "busy" : "pending";
  return "free";
}

export function dayInfo(day, booked) {
  const info = { free: 0, busy: 0, pending: 0 };
  for (const s of daySlots(day)) {
    const st = slotState(s, booked);
    if (st in info) info[st]++;
  }
  return info;
}
