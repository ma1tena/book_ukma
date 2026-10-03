import { ArrowLeft, Eye, EyeOff, GraduationCap, KeyRound, Mail, Phone, ShieldCheck, User, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import * as api from "../api";
import { useAuth } from "../auth";
import { CONTACT } from "../config";

const inputCls = "w-full rounded-lg border border-slate-200 bg-white py-4 pl-14 pr-4 text-lg text-navy-dark outline-none transition placeholder:text-slate focus:border-blue focus:ring-2 focus:ring-blue/20";

function Field({ icon: Icon, right, ...props }) {
  return (
    <div className="relative">
      <Icon size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate" />
      <input {...props} className={`${inputCls} ${right ? "pr-16" : ""}`} />
      {right}
    </div>
  );
}

const Primary = ({ busy, children, ...p }) => (
  <button {...p} disabled={busy || p.disabled}
          className="w-full rounded-lg bg-navy py-4 text-lg font-bold text-white transition hover:bg-blue-deep disabled:cursor-not-allowed disabled:opacity-60">
    {busy ? "Зачекайте…" : children}
  </button>
);

const Link = ({ children, ...p }) => <button type="button" {...p} className="font-semibold text-blue hover:underline">{children}</button>;
const Err = ({ children }) => children ? <p className="rounded-lg bg-coral/10 px-4 py-3 text-sm text-navy-dark">⚠️ {children}</p> : null;
const Dev = ({ on }) => on ? <p className="rounded-lg bg-gold/10 px-4 py-3 text-xs text-slate">Режим розробки: листи не надсилаються, код надруковано в терміналі, де запущено бекенд.</p> : null;

const MsLogo = () => (
  <svg viewBox="0 0 23 23" className="h-6 w-6" aria-hidden="true">
    <path fill="#F25022" d="M1 1h10v10H1z" /><path fill="#7FBA00" d="M12 1h10v10H12z" />
    <path fill="#00A4EF" d="M1 12h10v10H1z" /><path fill="#FFB900" d="M12 12h10v10H12z" />
  </svg>
);

function Office365({ enabled }) {
  const go = () => {
    sessionStorage.setItem("book_ukma_return", window.location.hash || "#/");   // повернемось на цю ж сторінку
    window.location.href = api.microsoftLoginUrl;
  };
  return (
    <div className="space-y-4">
      <div className="mx-auto h-px w-16 bg-mist-200" />
      <p className="text-center text-sm text-navy-dark">Увійдіть, використовуючи свій обліковий запис на:</p>
      <button type="button" disabled={!enabled} onClick={go}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#F4F4F4] py-4 text-lg font-semibold text-navy-dark transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-50">
        <MsLogo /> Вхід через Office 365
      </button>
      {!enabled && <p className="text-center text-xs text-slate">Вхід через Office 365 стане доступним після налаштування сервера.</p>}
    </div>
  );
}

/* ───────────── Вхід ───────────── */
function LoginView({ go, providers }) {
  const { finish } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr("");
    try { finish(await api.login(email.trim(), password)); }
    catch (ex) { setErr(ex.message); setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field icon={User} type="email" required autoComplete="username" placeholder="Пошта (ім'я входу)" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field icon={KeyRound} type={show ? "text" : "password"} required autoComplete="current-password" placeholder="Пароль" value={password}
             onChange={(e) => setPassword(e.target.value)}
             right={<button type="button" onClick={() => setShow(!show)} aria-label="Показати пароль"
                            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-mist-100 text-slate hover:text-navy">
               {show ? <EyeOff size={20} /> : <Eye size={20} />}</button>} />
      <div className="text-center text-sm"><Link onClick={() => go("reset")}>Забули пароль?</Link></div>
      <Err>{err}</Err>
      <Primary busy={busy} type="submit">Увійти</Primary>
      <p className="pb-2 text-center text-sm text-slate">Немає акаунта? <Link onClick={() => go("register")}>Зареєструватися</Link></p>
      <Office365 enabled={providers.microsoft} />
    </form>
  );
}

/* ───────────── Хук для кроків із кулдауном повторного листа ───────────── */
function useCooldown() {
  const [cool, setCool] = useState(0);
  useEffect(() => { if (cool > 0) { const t = setTimeout(() => setCool(cool - 1), 1000); return () => clearTimeout(t); } }, [cool]);
  return [cool, setCool];
}

/* ───────────── Реєстрація: пошта → код → дані ───────────── */
function RegisterView({ go, providers }) {
  const { finish } = useAuth();
  const [step, setStep] = useState("email");
  const [f, setF] = useState({ email: "", code: "", full_name: "", faculty_course: "", phone: "", password: "", password2: "" });
  const [vt, setVt] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [cool, setCool] = useCooldown();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const run = async (fn) => { setBusy(true); setErr(""); try { await fn(); } catch (ex) { setErr(ex.message); } finally { setBusy(false); } };

  const start = (e) => { e?.preventDefault(); run(async () => { await api.registerStart(f.email.trim()); setStep("code"); setCool(60); }); };
  const verify = (e) => { e.preventDefault(); run(async () => { setVt((await api.registerVerify(f.email.trim(), f.code.trim())).verification_token); setStep("profile"); }); };
  const complete = (e) => {
    e.preventDefault();
    if (f.password !== f.password2) return setErr("Паролі не збігаються");
    run(async () => finish(await api.registerComplete({ email: f.email.trim(), verification_token: vt, password: f.password,
      full_name: f.full_name, faculty_course: f.faculty_course, phone: f.phone })));
  };

  if (step === "email") return (
    <form onSubmit={start} className="space-y-3">
      <p className="text-sm text-slate">
        {providers.guests_allowed
          ? "Корпоративна пошта @ukma.edu.ua дає повний доступ. З іншою поштою ви отримаєте статус «Гість»."
          : "Реєстрація доступна з корпоративною поштою @ukma.edu.ua. Ми надішлемо на неї код — лише один раз."}
      </p>
      <Field icon={Mail} type="email" required autoFocus placeholder="Пошта" value={f.email} onChange={set("email")} />
      <Err>{err}</Err>
      <Primary busy={busy} type="submit">Надіслати код</Primary>
      <p className="pb-2 text-center text-sm text-slate">Вже є акаунт? <Link onClick={() => go("login")}>Увійти</Link></p>
      <Office365 enabled={providers.microsoft} />
    </form>
  );

  if (step === "code") return (
    <form onSubmit={verify} className="space-y-3">
      <p className="text-sm text-slate">Ми надіслали 6-значний код на <b className="text-navy">{f.email}</b>. Він дійсний 10 хвилин.</p>
      <Dev on={providers.email_dev_mode} />
      <Field icon={ShieldCheck} inputMode="numeric" maxLength={6} required autoFocus placeholder="Код із листа" value={f.code}
             onChange={(e) => setF({ ...f, code: e.target.value.replace(/\D/g, "") })} />
      <Err>{err}</Err>
      <Primary busy={busy} type="submit" disabled={f.code.length !== 6}>Підтвердити</Primary>
      <div className="flex justify-between text-sm">
        <Link onClick={() => { setStep("email"); setErr(""); }}>← Змінити пошту</Link>
        {cool > 0 ? <span className="text-slate">Надіслати ще раз через {cool} с</span> : <Link onClick={start}>Надіслати код ще раз</Link>}
      </div>
    </form>
  );

  return (
    <form onSubmit={complete} className="space-y-3">
      <p className="text-sm text-slate">Пошту підтверджено ✓ Заповніть дані — вони підставляться у подання автоматично.</p>
      <Field icon={UserRound} required minLength={5} autoComplete="name" placeholder="ПІБ (Прізвище Ім'я По батькові)" value={f.full_name} onChange={set("full_name")} />
      <Field icon={GraduationCap} required placeholder="Факультет-курс (напр. ФСНСТ-3)" value={f.faculty_course} onChange={set("faculty_course")} />
      <Field icon={Phone} type="tel" required autoComplete="tel" placeholder="+380XXXXXXXXX" value={f.phone} onChange={set("phone")} />
      <Field icon={KeyRound} type="password" required minLength={8} autoComplete="new-password" placeholder="Пароль (мінімум 8 символів)" value={f.password} onChange={set("password")} />
      <Field icon={KeyRound} type="password" required autoComplete="new-password" placeholder="Повторіть пароль" value={f.password2} onChange={set("password2")} />
      <Err>{err}</Err>
      <Primary busy={busy} type="submit">Зареєструватися</Primary>
    </form>
  );
}

/* ───────────── Скидання пароля ───────────── */
function ResetView({ go, providers }) {
  const [step, setStep] = useState("email");
  const [f, setF] = useState({ email: "", code: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const run = async (fn) => { setBusy(true); setErr(""); try { await fn(); } catch (ex) { setErr(ex.message); } finally { setBusy(false); } };

  if (done) return (
    <div className="space-y-4 text-center">
      <p className="text-navy-dark">Пароль змінено ✓ Тепер увійдіть із новим паролем.</p>
      <Primary type="button" onClick={() => go("login")}>До входу</Primary>
    </div>
  );
  if (step === "email") return (
    <form onSubmit={(e) => { e.preventDefault(); run(async () => { await api.resetStart(f.email.trim()); setStep("code"); }); }} className="space-y-3">
      <p className="text-sm text-slate">Введіть пошту акаунта — ми надішлемо код для створення нового пароля.</p>
      <Field icon={Mail} type="email" required autoFocus placeholder="Пошта" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <Err>{err}</Err>
      <Primary busy={busy} type="submit">Надіслати код</Primary>
      <div className="text-center text-sm"><Link onClick={() => go("login")}>← Назад до входу</Link></div>
    </form>
  );
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(async () => { await api.resetConfirm(f.email.trim(), f.code.trim(), f.password); setDone(true); }); }} className="space-y-3">
      <p className="text-sm text-slate">Якщо акаунт існує, код уже на <b className="text-navy">{f.email}</b>.</p>
      <Dev on={providers.email_dev_mode} />
      <Field icon={ShieldCheck} inputMode="numeric" maxLength={6} required autoFocus placeholder="Код із листа" value={f.code}
             onChange={(e) => setF({ ...f, code: e.target.value.replace(/\D/g, "") })} />
      <Field icon={KeyRound} type="password" required minLength={8} autoComplete="new-password" placeholder="Новий пароль (мінімум 8 символів)" value={f.password}
             onChange={(e) => setF({ ...f, password: e.target.value })} />
      <Err>{err}</Err>
      <Primary busy={busy} type="submit" disabled={f.code.length !== 6}>Змінити пароль</Primary>
    </form>
  );
}

const TITLES = { login: "Вхід", register: "Реєстрація", reset: "Відновлення пароля" };

export default function AuthModal() {
  const { modal, closeAuth } = useAuth();
  const [view, setView] = useState("login");
  const [providers, setProviders] = useState({ microsoft: false, guests_allowed: false, email_dev_mode: false });
  useEffect(() => { if (modal) { setView(modal.view); api.getProviders().then(setProviders).catch(() => {}); } }, [modal]);
  useEffect(() => {
    if (!modal) return;
    const on = (e) => e.key === "Escape" && closeAuth();
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [modal, closeAuth]);
  if (!modal) return null;

  const props = { go: setView, providers };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-dark/60 p-4 sm:items-center" onClick={closeAuth}>
      <div className="relative my-6 w-full max-w-[520px] rounded-2xl bg-white p-6 shadow-2xl sm:p-10" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={TITLES[view]}>
        <button onClick={closeAuth} aria-label="Закрити" className="absolute right-4 top-4 rounded-full p-2 text-slate transition hover:bg-mist-100 hover:text-navy"><X size={22} /></button>
        <h2 className="mb-6 pr-8 text-3xl font-bold text-navy">{TITLES[view]}</h2>
        {view === "login" && <LoginView {...props} />}
        {view === "register" && <RegisterView {...props} />}
        {view === "reset" && <ResetView {...props} />}
        <div className="mt-6 text-center">
          <a href={`mailto:${CONTACT.email}`} className="text-lg font-semibold text-blue hover:underline">Служба підтримки</a>
        </div>
      </div>
    </div>
  );
}
