import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "./api";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState(null);      // { view: "login" | "register" | "reset", onDone?: (user) => void }
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!api.getToken()) { setReady(true); return; }
    api.me().then(setUser).catch(() => api.setToken(null)).finally(() => setReady(true));
  }, []);

  const openAuth = useCallback((opts = {}) => setModal({ view: opts.view ?? "login", onDone: opts.onDone }), []);
  const closeAuth = useCallback(() => setModal(null), []);

  const finish = useCallback((res) => {            // успішний вхід/реєстрація
    api.setToken(res.token);
    setUser(res.user);
    const cb = modal?.onDone;
    setModal(null);
    cb?.(res.user);
  }, [modal]);

  const acceptToken = useCallback(async (token) => {   // токен із Office 365
    api.setToken(token);
    try { setUser(await api.me()); } catch (e) { api.setToken(null); setNotice(e.message); }
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* сесія могла вже закінчитись */ }
    api.setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, modal, notice, setNotice, openAuth, closeAuth, finish, acceptToken, logout, setUser }),
    [user, ready, modal, notice, openAuth, closeAuth, finish, acceptToken, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
