"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // El modo oscuro es solo post-login: limpia la clase para no arrastrarla al /login.
      document.documentElement.classList.remove("dark");
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      className="rounded-lg px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10 hover:text-brand-100 disabled:opacity-60"
    >
      {busy ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}
