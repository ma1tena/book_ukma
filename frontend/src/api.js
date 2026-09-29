const BASE = import.meta.env.VITE_API_URL || "";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status; // 0 = немає звʼязку з сервером
  }
}

async function request(path, options) {
  let res;
  try {
    res = await fetch(BASE + path, { headers: { "Content-Type": "application/json" }, ...options });
  } catch {
    throw new ApiError("Немає звʼязку з сервером. Перевірте інтернет і спробуйте ще раз.", 0);
  }
  if (!res.ok) {
    let msg = "Щось пішло не так на сервері.";
    try {
      const body = await res.json();
      if (typeof body.detail === "string") msg = body.detail;
      else if (Array.isArray(body.detail)) msg = body.detail.map((d) => d.msg).join("; ");
    } catch { /* тіло не JSON */ }
    throw new ApiError(msg, res.status);
  }
  return res.json();
}

export const getBuildings = () => request("/api/buildings");
export const getBuildingRooms = (id) => request(`/api/buildings/${id}/rooms`);
export const getRoom = (id) => request(`/api/rooms/${id}`);
