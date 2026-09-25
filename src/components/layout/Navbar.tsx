"use client";

import { LogoutButton } from "./LogoutButton";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="flex items-center gap-2 border-b border-brand-500 bg-brand-900 px-3 py-2 text-white">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Abrir menú"
        className="rounded-lg px-3 py-2 transition hover:bg-white/10 lg:hidden"
      >
        ☰
      </button>
      <div className="ml-auto flex items-center gap-2">
        <span
          title="Próximamente"
          aria-label="Notificaciones (próximamente)"
          className="cursor-not-allowed rounded-lg px-3 py-2 text-sm opacity-70"
        >
          🔔
        </span>
        <ThemeToggle />
        <LogoutButton />
      </div>
    </header>
  );
}
