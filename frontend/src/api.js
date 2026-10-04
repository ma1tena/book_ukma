const BASE = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "book_ukma_token";

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* приватний режим */ } };

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status; // 0 = немає звʼязку з сервером
  }
}

async function request(path, options) {
  let res;
  try {
    const token = getToken();
    res = await fetch(BASE + path, {
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...options,
    });
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

// ───── Автентифікація ─────
const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) });
export const getProviders = () => request("/api/auth/providers");
export const registerStart = (email) => post("/api/auth/register/start", { email });
export const registerVerify = (email, code) => post("/api/auth/register/verify", { email, code });
export const registerComplete = (data) => post("/api/auth/register/complete", data);
export const login = (email, password) => post("/api/auth/login", { email, password });
export const logout = () => post("/api/auth/logout", {});
export const me = () => request("/api/auth/me");
export const updateMe = (data) => request("/api/auth/me", { method: "PATCH", body: JSON.stringify(data) });
export const resetStart = (email) => post("/api/auth/password-reset/start", { email });
export const resetConfirm = (email, code, new_password) => post("/api/auth/password-reset/confirm", { email, code, new_password });
export const microsoftLoginUrl = `${BASE}/api/auth/microsoft/login`;

// ───── Заявки ─────
export const createBooking = (data) => post("/api/bookings", data);
export const myBookings = () => request("/api/bookings/mine");
export const getBooking = (id) => request(`/api/bookings/${id}`);
