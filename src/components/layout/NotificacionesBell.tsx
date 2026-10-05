"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Trash2 } from "lucide-react";
import { formatFechaHoraCO } from "@/lib/dates";
import type { NotificacionItem } from "@/lib/notificaciones";
import { NOTIFICACIONES_PAGE, TIPO_META, urlParaTipo } from "@/lib/notificaciones";

interface ListaResponse {
  ok: boolean;
  notificaciones: NotificacionItem[];
  noLeidas: number;
  hayMas: boolean;
  error?: string;
}

export function NotificacionesBell() {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificacionItem[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  /** Evita ráfagas del auto-relleno entre renders (el indicador visual lo lleva loadingMore). */
  const rellenandoRef = useRef(false);

  // Conteo inicial (el remount por key en Navbar lo repite al navegar, sin polling).
  useEffect(() => {
    let vivo = true;
    fetch(`/api/notificaciones?limit=${NOTIFICACIONES_PAGE}`)
      .then(async (res) => {
        if (!res.ok || !vivo) return;
        const body = (await res.json()) as ListaResponse;
        if (!vivo) return;
        setItems(body.notificaciones);
        setNoLeidas(body.noLeidas);
        setHayMas(body.hayMas);
      })
      .catch(() => {
        // Badge silencioso: no hay UI de error fuera del panel.
      });
    return () => {
      vivo = false;
    };
  }, []);

  // Cerrar con click-fuera y Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  async function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setError("");
    try {
      const [lista, _marcadas] = await Promise.all([
        fetch(`/api/notificaciones?limit=${NOTIFICACIONES_PAGE}`).then(async (r) => {
          if (!r.ok) throw new Error();
          return (await r.json()) as ListaResponse;
        }),
        fetch("/api/notificaciones", { method: "PATCH" }),
      ]);
      void _marcadas;
      setItems(lista.notificaciones.map((n) => ({ ...n, leida: true })));
      setHayMas(lista.hayMas);
      setNoLeidas(0);
    } catch {
      setError("No se pudieron cargar las notificaciones.");
    }
  }

  async function handleScroll() {
    const el = listaRef.current;
    if (!el || loadingMore || !hayMas || items.length === 0) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 120) return;
    setLoadingMore(true);
    try {
      const last = items[items.length - 1].id;
      const res = await fetch(`/api/notificaciones?before=${last}&limit=${NOTIFICACIONES_PAGE}`);
      if (!res.ok) return;
      const body = (await res.json()) as ListaResponse;
      setItems((prev) => [...prev, ...body.notificaciones.map((n) => ({ ...n, leida: true }))]);
      setHayMas(body.hayMas);
    } finally {
      setLoadingMore(false);
    }
  }

  // Si la página cabe sin scroll (pocas filas o viewport alto), trae la siguiente
  // hasta desbordar o agotar: sin esto el onScroll nunca se dispara y hayMas queda invisible.
  useEffect(() => {
    const el = listaRef.current;
    if (!open || !hayMas || items.length === 0 || rellenandoRef.current || !el) return;
    if (el.scrollHeight - el.clientHeight > 120) return;
    rellenandoRef.current = true;
    const last = items[items.length - 1].id;
    fetch(`/api/notificaciones?before=${last}&limit=${NOTIFICACIONES_PAGE}`)
      .then(async (res) => {
        if (!res.ok) return;
        const body = (await res.json()) as ListaResponse;
        setItems((prev) => [...prev, ...body.notificaciones.map((n) => ({ ...n, leida: true }))]);
        setHayMas(body.hayMas);
      })
      .catch(() => {})
      .finally(() => {
        rellenandoRef.current = false;
      });
  });

  async function handleBorrar(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    const res = await fetch(`/api/notificaciones/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setItems((prev) => prev.filter((n) => n.id !== id));
  }

  function handleAbrir(item: NotificacionItem) {
    const url = urlParaTipo(item.tipo);
    if (!url) return;
    setOpen(false);
    router.push(url);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notificaciones"
        aria-expanded={open}
        className="relative rounded-lg px-3 py-2 text-sm transition hover:bg-white/10"
      >
        <Bell className="size-5" />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed top-14 right-3 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[14px] border border-zinc-200 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.25)] sm:absolute sm:top-[calc(100%+8px)] sm:right-0 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="border-b border-zinc-200 bg-brand-700 px-4 py-2.5 text-sm font-bold text-white">
            Notificaciones
          </p>
          <div ref={listaRef} onScroll={handleScroll} className="max-h-[min(70dvh,26rem)] overflow-y-auto">
            {error && <p className="px-4 py-3 text-center text-sm text-red-600">{error}</p>}
            {!error && items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No tienes notificaciones.
              </p>
            )}
            {items.map((n) => {
              const meta = TIPO_META[n.tipo];
              const url = urlParaTipo(n.tipo);
              return (
                <div
                  key={n.id}
                  onClick={() => handleAbrir(n)}
                  className={`flex items-start gap-2 border-b border-zinc-100 px-3 py-2.5 last:border-0 dark:border-zinc-800 ${
                    url ? "cursor-pointer hover:bg-brand-50 dark:hover:bg-zinc-800" : ""
                  } ${n.leida ? "" : "bg-brand-50/60 dark:bg-zinc-800/60"}`}
                >
                  <div className="min-w-0 flex-1">
                    <span className={`inline-block rounded-[8px] px-2 py-0.5 text-[11px] font-bold ${meta.clases}`}>
                      {meta.label}
                    </span>
                    <p title={n.mensaje} className="mt-1 line-clamp-2 text-[13px] leading-snug text-zinc-800 dark:text-zinc-200">{n.mensaje}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">{formatFechaHoraCO(n.fecha)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => void handleBorrar(e, n.id)}
                    aria-label="Eliminar notificación"
                    title="Eliminar"
                    className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}
            {loadingMore && (
              <p className="px-4 py-2 text-center text-xs text-zinc-400">Cargando...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
