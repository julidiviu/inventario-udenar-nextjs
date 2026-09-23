'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const HELP_VIDEO_ID = 'Bd-yDKXbptM';

type Mode = 'login' | 'register';
type Toast = { kind: 'error' | 'info'; title: string; msg: string } | null;

/* Iconos inline (sin CDN) */
function UserIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.2-3.4 4-5 7-5s5.8 1.6 7 5" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

function MailIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IdIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="11" r="1.8" />
      <path d="M5.5 16c.7-1.6 1.8-2.4 3-2.4s2.3.8 3 2.4M14 9.5h5M14 13h5" strokeLinecap="round" />
    </svg>
  );
}

function BookIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5Z" strokeLinejoin="round" />
      <path d="M5 19.5A1.5 1.5 0 0 1 6.5 18H19" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ off = false, className = '' }: { off?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.6" />
      {off && <path d="M4 4l16 16" strokeLinecap="round" />}
    </svg>
  );
}

function QuestionIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
      <path d="M9.2 9a2.8 2.8 0 1 1 4.3 2.4c-.9.6-1.5 1-1.5 2.1" strokeLinecap="round" />
      <circle cx="12" cy="17.4" r="0.4" fill="currentColor" />
    </svg>
  );
}

function AlertIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.2" strokeLinecap="round" />
      <circle cx="12" cy="16.2" r="0.5" fill="currentColor" />
    </svg>
  );
}

function InfoIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" strokeLinecap="round" />
      <circle cx="12" cy="8" r="0.5" fill="currentColor" />
    </svg>
  );
}

function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

const inputCls =
  'h-12 w-full rounded-xl border border-stone-200 bg-[#f8faf8] pl-4 pr-11 text-[15px] font-medium text-stone-900 placeholder:font-normal placeholder:text-stone-400 transition focus:border-[#0a7735] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0a7735]/15';
const inputIconCls =
  'pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#0a7735]';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');

  // Login
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Registro (visual; sin API todavía)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [codigoReg, setCodigoReg] = useState('');
  const [programa, setPrograma] = useState('');
  const [rol, setRol] = useState('');
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const [toast, setToast] = useState<Toast>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Auto-oculta el aviso (como el flash-msg del template)
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Cierra la ayuda con Escape
  useEffect(() => {
    if (!showHelp) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowHelp(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showHelp]);

  const passwordsMatch = pass1.length > 0 && pass2.length > 0 && pass1 === pass2;
  const passwordsMismatch = pass1.length > 0 && pass2.length > 0 && pass1 !== pass2;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    setToast(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: codigo.trim(), password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setToast({
          kind: 'error',
          title: 'No pudimos iniciar tu sesión',
          msg:
            typeof data?.error === 'string' && data.error.length > 0
              ? data.error
              : 'Credenciales inválidas.',
        });
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setToast({
        kind: 'error',
        title: 'No pudimos iniciar tu sesión',
        msg: 'No se pudo conectar con el servidor. Inténtalo de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isRegistering) return;
    const cleanCodigo = codigoReg.trim();
    if (!/^\d+$/.test(cleanCodigo)) {
      setToast({
        kind: 'error',
        title: 'Revisa el formulario',
        msg: 'El código tiene que ser numérico.',
      });
      return;
    }
    if (passwordsMismatch || pass1.length === 0 || pass2.length === 0) {
      setToast({
        kind: 'error',
        title: 'Revisa el formulario',
        msg: 'Las contraseñas no coinciden.',
      });
      return;
    }
    setToast(null);
    setIsRegistering(true);
    try {
      // Foto opcional: primero a /api/upload, luego su URL al registro.
      let fotoUrl = '';
      const fotoFile = e.currentTarget
        .querySelector('input[name="foto"]') as HTMLInputElement | null;
      const picked = fotoFile?.files?.[0];
      if (picked) {
        const fd = new FormData();
        fd.append('file', picked);
        fd.append('folder', 'usuarios');
        fd.append('kind', 'foto');
        const up = await fetch('/api/upload', { method: 'POST', body: fd });
        const upData = await up.json().catch(() => null);
        if (!up.ok || typeof upData?.url !== 'string') {
          setToast({
            kind: 'error',
            title: 'No se pudo subir la foto',
            msg:
              typeof upData?.error === 'string' && upData.error.length > 0
                ? upData.error
                : 'Inténtalo sin foto o reintenta.',
          });
          return;
        }
        fotoUrl = upData.url;
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          codigo: cleanCodigo,
          programa: programa.trim(),
          rol,
          password: pass1,
          fotoUrl,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setToast({
          kind: 'error',
          title: 'No pudimos crear tu cuenta',
          msg:
            typeof data?.error === 'string' && data.error.length > 0
              ? data.error
              : 'Revisa los datos e inténtalo de nuevo.',
        });
        return;
      }
      // Como en Django: éxito → ir al inicio de sesión con el código listo.
      setCodigo(cleanCodigo);
      setPassword('');
      setMode('login');
      setToast({
        kind: 'info',
        title: '¡Registro exitoso!',
        msg: 'Ya puedes iniciar sesión con tu código.',
      });
    } catch {
      setToast({
        kind: 'error',
        title: 'No pudimos crear tu cuenta',
        msg: 'No se pudo conectar con el servidor. Inténtalo de nuevo.',
      });
    } finally {
      setIsRegistering(false);
    }
  }

  function switchMode(next: Mode) {
    setToast(null);
    setMode(next);
  }

  const toastStyles =
    toast?.kind === 'error'
      ? 'border-red-200 text-red-600'
      : 'border-emerald-200 text-emerald-700';

  return (
    <div className="min-h-screen bg-[#eef3ee] text-[#12281c] antialiased">
      {/* Fondo tenue */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(120deg,#e2e7e2 0%,#f4f7f4 55%,#d5e8d5 100%)' }}
        />
      </div>

      {/* Aviso (reemplaza Swal.fire) */}
      <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4" aria-live="polite">
        <div
          className={`flex w-full max-w-md items-start gap-3 rounded-2xl border bg-white/95 px-4 py-3 shadow-xl backdrop-blur transition-all duration-300 motion-reduce:transition-none ${toastStyles} ${
            toast ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-3 opacity-0'
          }`}
          role={toast ? 'alert' : undefined}
        >
          <span
            className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
              toast?.kind === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {toast?.kind === 'error' ? <AlertIcon className="h-5 w-5" /> : <InfoIcon className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${toast?.kind === 'error' ? 'text-red-700' : 'text-emerald-800'}`}>
              {toast?.title ?? ''}
            </p>
            <p className="mt-0.5 text-sm">{toast?.msg ?? ''}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Cerrar aviso"
            className="rounded-full p-1 transition hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#0a7735]"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-4 py-8 sm:px-6">
        <div className="grid w-full overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_-24px_rgba(10,92,46,0.45)] ring-1 ring-black/5 md:grid-cols-[1fr_1.1fr]">
          {/* Panel verde: compacto arriba en móvil, columna en desktop */}
          <section className="relative overflow-hidden bg-[#0a5c2e] text-white">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              aria-hidden="true"
              style={{
                background:
                  'radial-gradient(420px 220px at 20% 0%,rgba(255,255,255,0.22),transparent 60%),radial-gradient(520px 300px at 110% 110%,rgba(20,163,77,0.55),transparent 60%)',
              }}
            />
            {/* Móvil: cabecera compacta con curva inferior */}
            <div className="relative flex flex-col items-center px-6 pb-10 pt-8 text-center md:hidden">
              <Image
                src="/images/escudoblanco.png"
                alt="Escudo de la Universidad de Nariño"
                width={72}
                height={72}
                className="h-[72px] w-[72px] object-contain"
                priority
              />
              <h1 className="mt-3 text-[22px] font-bold tracking-tight">
                {mode === 'login' ? 'Bienvenido' : 'Hola de nuevo'}
              </h1>
              <p className="mt-1 text-sm text-emerald-50/90">
                {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes una cuenta?'}
              </p>
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                className="mt-3 rounded-lg border-2 border-white/90 px-6 py-1.5 text-sm font-semibold transition hover:bg-white hover:text-[#0a5c2e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {mode === 'login' ? 'Regístrate' : 'Ingresar'}
              </button>
            </div>
            {/* Desktop: columna completa */}
            <div className="relative hidden h-full flex-col items-center justify-center px-8 py-12 text-center md:flex">
              <Image
                src="/images/escudoblanco.png"
                alt="Escudo de la Universidad de Nariño"
                width={120}
                height={120}
                className="h-[120px] w-[120px] object-contain"
                priority
              />
              <p className="mt-4 text-[13px] font-medium text-emerald-100/90">Universidad de Nariño</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                {mode === 'login' ? 'Bienvenido' : 'Hola de nuevo'}
              </h1>
              <p className="mt-2 text-[15px] text-emerald-50/90">
                {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes una cuenta?'}
              </p>
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                className="mt-6 w-44 rounded-lg border-2 border-white/90 py-2.5 text-[15px] font-semibold transition hover:bg-white hover:text-[#0a5c2e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {mode === 'login' ? 'Regístrate' : 'Ingresar'}
              </button>
              <dl className="mt-8 grid w-full max-w-sm grid-cols-3 gap-3 text-center">
                {[
                  ['Solicita', 'en minutos'],
                  ['Sigue', 'tu estado'],
                  ['Devuelve', 'sin filas'],
                ].map(([title, sub]) => (
                  <div key={title} className="rounded-2xl bg-white/10 px-2 py-3 ring-1 ring-white/15">
                    <dt className="text-sm font-bold">{title}</dt>
                    <dd className="mt-0.5 text-xs text-emerald-100/85">{sub}</dd>
                  </div>
                ))}
              </dl>
              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="mt-8 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-emerald-100/85 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
              >
                <QuestionIcon className="h-4 w-4" />
                ¿Necesitas ayuda?
              </button>
            </div>
            {/* Curva inferior solo móvil */}
            <div className="absolute inset-x-0 bottom-0 h-6 rounded-t-[50%] bg-white md:hidden" aria-hidden="true" />
          </section>

          {/* Formularios: login y registro conviven, fundido al alternar */}
          <section className="relative bg-white p-6 sm:p-10">
            <div className="relative mx-auto w-full max-w-sm">
              {/* LOGIN */}
              <div
                className={`transition-all duration-300 motion-reduce:transition-none ${
                  mode === 'login'
                    ? 'relative translate-x-0 opacity-100'
                    : 'pointer-events-none absolute inset-0 translate-x-6 opacity-0'
                }`}
                aria-hidden={mode !== 'login'}
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div>
                    <h2 className="mt-2 text-[24px] font-bold leading-tight tracking-tight text-[#0a5c2e] sm:text-[26px]">
                      Sistema de Préstamo de Equipos Académicos de la Universidad de Nariño
                    </h2>
                    <p className="mt-2 text-lg font-bold text-[#0f2a1c]">Inicia sesión con tu código</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHelp(true)}
                    aria-label="¿Cómo iniciar sesión?"
                    title="¿Cómo iniciar sesión?"
                    tabIndex={mode === 'login' ? 0 : -1}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#0a7735]/40 text-[#0a7735] transition hover:bg-[#0a7735] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a7735] md:hidden"
                  >
                    <QuestionIcon className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleLogin} className="mt-7 space-y-4">
                  <div>
                    <label htmlFor="codigo" className="mb-1.5 block text-sm font-semibold text-[#16382a]">
                      Código
                    </label>
                    <div className="relative">
                      <input
                        id="codigo"
                        name="codigo"
                        type="text"
                        inputMode="numeric"
                        autoComplete="username"
                        placeholder="p. ej. 202410123"
                        required
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        className={inputCls}
                      />
                      <UserIcon className={inputIconCls} />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label htmlFor="password" className="block text-sm font-semibold text-[#16382a]">
                        Contraseña
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-pressed={showPassword}
                        tabIndex={mode === 'login' ? 0 : -1}
                        className="rounded text-[13px] font-semibold text-[#0a7735] transition hover:text-[#0a5c2e] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a7735]"
                      >
                        {showPassword ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Tu contraseña"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${inputCls} pr-20`}
                      />
                      <LockIcon className="pointer-events-none absolute right-11 top-1/2 h-5 w-5 -translate-y-1/2 text-[#0a7735]" />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        tabIndex={mode === 'login' ? 0 : -1}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-[#0a7735] focus-visible:outline-2 focus-visible:outline-[#0a7735]"
                      >
                        <EyeIcon off={!showPassword} className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    aria-busy={isLoading}
                    tabIndex={mode === 'login' ? 0 : -1}
                    className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#0a7735] text-[15px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(10,119,53,0.7)] transition hover:bg-[#0d8b40] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a7735] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-[#0a7735]"
                  >
                    {isLoading && (
                      <span
                        className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                        aria-hidden="true"
                      />
                    )}
                    {isLoading ? 'Verificando…' : 'Ingresar'}
                  </button>

                  <p className="pt-1 text-center text-[13px] leading-relaxed text-stone-500">
                    Al continuar aceptas el uso académico de tus datos de préstamo.
                  </p>
                </form>
              </div>

              {/* REGISTRO */}
              <div
                className={`transition-all duration-300 motion-reduce:transition-none ${
                  mode === 'register'
                    ? 'relative -translate-x-0 opacity-100'
                    : 'pointer-events-none absolute inset-0 -translate-x-6 opacity-0'
                }`}
                aria-hidden={mode !== 'register'}
              >
                <p className="text-center text-lg font-bold text-[#0a7735]">Formulario de Registro</p>

                <form onSubmit={handleRegister} className="mt-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <label htmlFor="first_name" className="sr-only">
                        Nombres
                      </label>
                      <input
                        id="first_name"
                        name="first_name"
                        type="text"
                        placeholder="Nombres"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        tabIndex={mode === 'register' ? 0 : -1}
                        className={`${inputCls} h-11 text-sm`}
                      />
                      <UserIcon className={inputIconCls} />
                    </div>
                    <div className="relative">
                      <label htmlFor="last_name" className="sr-only">
                        Apellidos
                      </label>
                      <input
                        id="last_name"
                        name="last_name"
                        type="text"
                        placeholder="Apellidos"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        tabIndex={mode === 'register' ? 0 : -1}
                        className={`${inputCls} h-11 text-sm`}
                      />
                      <UserIcon className={inputIconCls} />
                    </div>
                  </div>

                  <div className="relative">
                    <label htmlFor="email" className="sr-only">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      tabIndex={mode === 'register' ? 0 : -1}
                      className={`${inputCls} h-11 text-sm`}
                    />
                    <MailIcon className={inputIconCls} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <label htmlFor="codigo-reg" className="sr-only">
                        Código
                      </label>
                      <input
                        id="codigo-reg"
                        name="codigo"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        title="El código tiene que ser numérico."
                        placeholder="Código (solo números)"
                        required
                        value={codigoReg}
                        onChange={(e) => setCodigoReg(e.target.value)}
                        tabIndex={mode === 'register' ? 0 : -1}
                        className={`${inputCls} h-11 text-sm`}
                      />
                      <IdIcon className={inputIconCls} />
                    </div>
                    <div className="relative">
                      <label htmlFor="programa" className="sr-only">
                        Programa
                      </label>
                      <input
                        id="programa"
                        name="programa"
                        type="text"
                        placeholder="Programa"
                        required
                        value={programa}
                        onChange={(e) => setPrograma(e.target.value)}
                        tabIndex={mode === 'register' ? 0 : -1}
                        className={`${inputCls} h-11 text-sm`}
                      />
                      <BookIcon className={inputIconCls} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="rol" className="sr-only">
                      Rol
                    </label>
                    <select
                      id="rol"
                      name="rol"
                      required
                      value={rol}
                      onChange={(e) => setRol(e.target.value)}
                      tabIndex={mode === 'register' ? 0 : -1}
                      className={`${inputCls} h-11 appearance-none text-sm ${rol === '' ? 'text-stone-400' : ''}`}
                    >
                      <option value="">Seleccione su rol</option>
                      <option value="estudiante">Estudiante</option>
                      <option value="profesor">Profesor</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="foto" className="mb-1 block text-left text-[13px] font-medium text-stone-500">
                      Foto de perfil
                    </label>
                    <input
                      id="foto"
                      name="foto"
                      type="file"
                      accept="image/*"
                      tabIndex={mode === 'register' ? 0 : -1}
                      className="w-full rounded-xl border border-stone-200 bg-[#f8faf8] px-3 py-2 text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#0a7735] file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-white hover:file:bg-[#0d8b40] focus:outline-none focus:ring-4 focus:ring-[#0a7735]/15"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <label htmlFor="password1" className="sr-only">
                        Contraseña
                      </label>
                      <input
                        id="password1"
                        name="password1"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Contraseña"
                        required
                        value={pass1}
                        onChange={(e) => setPass1(e.target.value)}
                        tabIndex={mode === 'register' ? 0 : -1}
                        className={`${inputCls} h-11 text-sm`}
                      />
                      <LockIcon className={inputIconCls} />
                    </div>
                    <div className="relative">
                      <label htmlFor="password2" className="sr-only">
                        Confirmar contraseña
                      </label>
                      <input
                        id="password2"
                        name="password2"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Confirmar contraseña"
                        required
                        value={pass2}
                        onChange={(e) => setPass2(e.target.value)}
                        tabIndex={mode === 'register' ? 0 : -1}
                        className={`${inputCls} h-11 text-sm`}
                      />
                      <LockIcon className={inputIconCls} />
                    </div>
                  </div>

                  {passwordsMismatch && (
                    <p className="text-left text-[13px] font-medium text-red-600" role="alert">
                      Las contraseñas no coinciden.
                    </p>
                  )}
                  {passwordsMatch && (
                    <p className="text-left text-[13px] font-medium text-emerald-600">
                      Las contraseñas coinciden.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isRegistering}
                    aria-busy={isRegistering}
                    tabIndex={mode === 'register' ? 0 : -1}
                    className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#0a7735] text-[15px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(10,119,53,0.7)] transition hover:bg-[#0d8b40] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a7735] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-[#0a7735]"
                  >
                    {isRegistering && (
                      <span
                        className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                        aria-hidden="true"
                      />
                    )}
                    {isRegistering ? 'Creando cuenta…' : 'Registrarse'}
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-6 flex w-full max-w-5xl flex-col items-center justify-between gap-1 text-[13px] text-stone-500 sm:flex-row">
          <p>
            <span className="font-semibold text-stone-600">© 2025</span> Universidad de Nariño · Todos los derechos reservados.
          </p>
          <p>
            Versión <span className="font-semibold text-stone-600">1.0.0</span>
          </p>
        </footer>
      </main>

      {/* Modal de ayuda (reemplaza modal Bootstrap + jQuery) */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1f14]/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Video de ayuda"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
              <p className="text-[15px] font-bold text-[#0f2a1c]">Video de ayuda</p>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                aria-label="Cerrar ayuda"
                autoFocus
                className="rounded-full p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-2 focus-visible:outline-[#0a7735]"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                key={HELP_VIDEO_ID}
                src={`https://www.youtube.com/embed/${HELP_VIDEO_ID}?rel=0&modestbranding=1&playsinline=1`}
                title="Video de ayuda"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
