"use client";

import { useSyncExternalStore } from "react";

export const THEME_STORAGE_KEY = "theme";

function SunIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function getThemeSnapshot(): boolean {
  return (
    document.documentElement.classList.contains("dark") ||
    localStorage.getItem(THEME_STORAGE_KEY) === "dark"
  );
}

function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => {
    window.removeEventListener("storage", onChange);
    observer.disconnect();
  };
}

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  if (dark) localStorage.setItem(THEME_STORAGE_KEY, "dark");
  else localStorage.removeItem(THEME_STORAGE_KEY);
}

/** Botón icono sol/luna. Solo vive en el Navbar interno: el login no lo monta. */
export function ThemeToggle() {
  // SSR devuelve false; el cliente se hidrata con el snapshot real sin mismatch.
  const dark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => false);

  return (
    <button
      type="button"
      onClick={() => applyTheme(!dark)}
      aria-pressed={dark}
      aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title="Cambiar tema"
      className="grid h-9 w-9 place-items-center rounded-lg text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      {dark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  );
}
