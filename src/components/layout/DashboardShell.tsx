"use client";

import { useState } from "react";
import { Navbar } from "./Navbar";

export function DashboardShell({
  sidebar,
  footer,
  children,
}: {
  sidebar: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-panel text-zinc-900">
      {/* Sidebar escritorio */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 lg:block">{sidebar}</aside>

      {/* Sidebar móvil */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <aside className="absolute inset-y-0 left-0 w-72">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar onMenu={() => setOpen(true)} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-4">{children}</main>
        {footer}
      </div>
    </div>
  );
}
