"use client";

import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";
import { NotificacionesBell } from "./NotificacionesBell";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar({ onMenu }: { onMenu: () => void }) {
  // Remount de la campanita al navegar: cierra el panel y refresca el conteo.
  const pathname = usePathname();
  return (
    <header className="flex items-center gap-2 border-b border-brand-500 bg-brand-900 px-3 py-2 text-white dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Abrir menú"
        className="rounded-lg px-3 py-2 transition hover:bg-white/10 lg:hidden"
      >
        ☰
      </button>
      <div className="ml-auto flex items-center gap-2">
        <NotificacionesBell key={pathname} />
        <ThemeToggle />
        <LogoutButton />
      </div>
    </header>
  );
}
