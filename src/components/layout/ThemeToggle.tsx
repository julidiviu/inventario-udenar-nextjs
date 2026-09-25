"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "theme";

/** Toggle claro/oscuro. Paridad con base.html: persiste en localStorage, clase "dark" en <html>. */
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return (
      document.documentElement.classList.contains("dark") ||
      localStorage.getItem(STORAGE_KEY) === "dark"
    );
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    if (dark) localStorage.setItem(STORAGE_KEY, "dark");
    else localStorage.removeItem(STORAGE_KEY);
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark((v) => !v)}
      aria-pressed={dark}
      title="Cambiar tema"
      className="flex h-7 w-14 items-center justify-between rounded-full bg-zinc-800 px-1.5 text-xs transition"
    >
      <span aria-hidden="true">☀</span>
      <span
        aria-hidden="true"
        className={`h-5 w-5 rounded-full bg-white transition-transform ${dark ? "translate-x-7" : "translate-x-0"}`}
      />
      <span aria-hidden="true">☾</span>
    </button>
  );
}
