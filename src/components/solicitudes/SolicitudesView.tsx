"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Paginador } from "@/components/ui/Paginador";
import { formatFechaCO } from "@/lib/dates";
import type { AccionSolicitud, EstadoSolicitud, FiltroEstado } from "@/lib/solicitudes";
import { FILTRO_LABEL } from "@/lib/solicitudes";
import { FILAS_POR_PAGINA, hrefConParams } from "@/lib/paginacion";

export interface SolicitudRow {
  /** Key interno, no visible. */
  solicitudId: number;
  /** Interno para Fase 2, no visible. */
  recursoId: number;
  /** Columna "QR": referencia visible del recurso. */
  qr: string;
  recursoNombre: string;
  /** Solo scope="dependencia". Fallback `Cód. ${codigo}` si el nombre es null. */
  usuarioNombre: string;
  /** Internos para los links (solo dependencia), no visibles. */
  usuarioId: string;
  tipoId: number;
  /** Interno para el link a /dependencias (solo propias), no visible. */
  dependenciaId: number;
  /** Solo scope="propias" (en admin sería constante). */
  dependenciaNombre: string;
  fechaSolicitud: string;
  fechaDevolucion: string;
  estado: EstadoSolicitud;
  contratoUrl: string | null;
  /** Id del préstamo creado al aprobar (solo admin/aprobada). */
  prestamoId: number | null;
}

export type SolicitudesScope = "propias" | "dependencia";

interface SolicitudesViewProps {
  scope: SolicitudesScope;
  estadoInicial: FiltroEstado;
  /** ?q= actual (la búsqueda vive en el servidor, el input solo la edita). */
  qInicial: string;
  /** Solo la página actual (máx FILAS_POR_PAGINA filas). */
  initialData: SolicitudRow[];
  pagina: number;
  totalPaginas: number;
  total: number;
  /** ?destacar=: id de solicitud a resaltar (llega desde un préstamo). */
  destacarId: number | null;
  titulo: string;
}

function SolicitudBadge({ estado }: { estado: EstadoSolicitud }) {
  if (estado === "aprobado") {
    return (
      <span className="inline-block rounded-[10px] bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">
        Aprobado
      </span>
    );
  }
  if (estado === "rechazado") {
    return (
      <span className="inline-block rounded-[10px] bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
        Rechazado
      </span>
    );
  }
  return (
    <span className="inline-block rounded-[10px] bg-amber-400 px-3 py-1.5 text-xs font-semibold text-zinc-900">
      Pendiente
    </span>
  );
}

/** Acciones conectadas: aprobar/rechazar (admin) y cancelar (propias). Contrato sigue pendiente. */
function Acciones({
  scope,
  row,
  busy,
  onPedir,
}: {
  scope: SolicitudesScope;
  row: SolicitudRow;
  busy: boolean;
  onPedir: (accion: AccionSolicitud | "cancelar", row: SolicitudRow) => void;
}) {
  const btn =
    "rounded-lg px-2.5 py-1 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60";
  const contratoCls =
    "rounded-lg border border-green-700 px-2.5 py-1 text-xs font-semibold text-green-800 transition hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-950";
  if (scope === "dependencia") {
    if (row.estado === "pendiente") {
      return (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => onPedir("aprobar", row)}
            className={`${btn} bg-green-700`}
          >
            Aprobar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onPedir("rechazar", row)}
            className={`${btn} bg-red-600`}
          >
            Rechazar
          </button>
        </div>
      );
    }
    if (row.estado === "aprobado" && row.prestamoId !== null && row.contratoUrl) {
      return (
        <a
          href={`/api/prestamos/${row.prestamoId}/contrato`}
          target="_blank"
          rel="noreferrer"
          className={contratoCls}
        >
          Contrato
        </a>
      );
    }
    if (row.estado === "aprobado") {
      return (
        <button
          type="button"
          disabled
          title="Contrato no disponible"
          className="cursor-not-allowed rounded-lg bg-green-700 px-2.5 py-1 text-xs font-semibold text-white opacity-60"
        >
          Contrato
        </button>
      );
    }
    return <span className="text-xs text-zinc-400">—</span>;
  }
  if (row.estado === "pendiente") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => onPedir("cancelar", row)}
        className={`${btn} bg-red-600`}
      >
        Cancelar
      </button>
    );
  }
  return <span className="text-xs text-zinc-400">—</span>;
}

type Confirmacion = { accion: AccionSolicitud | "cancelar"; row: SolicitudRow } | null;

const CONFIRM_TEXTO: Record<AccionSolicitud | "cancelar", { titulo: string; descripcion: (r: SolicitudRow) => string; confirmar: string; clase: string }> = {
  aprobar: {
    titulo: "Aprobar solicitud",
    descripcion: (r) => `¿Aprobar el préstamo de «${r.recursoNombre}» (${r.qr})? Se creará el préstamo y el recurso quedará no disponible.`,
    confirmar: "Aprobar",
    clase: "bg-green-700 text-white hover:bg-green-800",
  },
  rechazar: {
    titulo: "Rechazar solicitud",
    descripcion: (r) => `¿Rechazar la solicitud de «${r.recursoNombre}» (${r.qr})?`,
    confirmar: "Rechazar",
    clase: "bg-red-600 text-white hover:bg-red-700",
  },
  cancelar: {
    titulo: "Cancelar solicitud",
    descripcion: (r) => `¿Cancelar tu solicitud de «${r.recursoNombre}» (${r.qr})? Se eliminará por completo.`,
    confirmar: "Cancelar solicitud",
    clase: "bg-red-600 text-white hover:bg-red-700",
  },
};

export function SolicitudesView({
  scope,
  estadoInicial,
  qInicial,
  initialData,
  pagina,
  totalPaginas,
  total,
  destacarId,
  titulo,
}: SolicitudesViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(qInicial);
  const [prevQ, setPrevQ] = useState(qInicial);
  // Sincroniza si ?q= cambia por navegación (atrás/adelante) sin remontar la vista.
  if (qInicial !== prevQ) {
    setPrevQ(qInicial);
    setQuery(qInicial);
  }
  const [confirm, setConfirm] = useState<Confirmacion>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  // Búsqueda en servidor con debounce: actualiza ?q= y vuelve a página 1.
  useEffect(() => {
    const q = query.trim();
    if (q === qInicial) return;
    const t = setTimeout(() => {
      router.replace(hrefConParams(pathname, { estado: estadoInicial, pagina: 1, q }));
    }, 400);
    return () => clearTimeout(t);
  }, [query, qInicial, estadoInicial, pathname, router]);

  const inicio = total === 0 ? 0 : (pagina - 1) * FILAS_POR_PAGINA + 1;
  const fin = Math.min(pagina * FILAS_POR_PAGINA, total);

  // Deep-link desde un préstamo: centra la fila destacada al montar o cambiar.
  useEffect(() => {
    if (!destacarId) return;
    document
      .getElementById(`solicitud-${destacarId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [destacarId]);

  async function readError(res: Response): Promise<string> {
    try {
      const body = await res.json();
      return typeof body.error === "string" ? body.error : "Operación fallida.";
    } catch {
      return "Operación fallida.";
    }
  }

  /** Tras mutar se revalida desde el servidor: conteos y páginas siempre consistentes. */

  async function handleConfirm() {
    if (!confirm) return;
    setSaving(true);
    setActionError("");
    try {
      const { accion, row } = confirm;
      const res =
        accion === "cancelar"
          ? await fetch(`/api/solicitudes/${row.solicitudId}`, { method: "DELETE" })
          : await fetch(`/api/solicitudes/${row.solicitudId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ accion }),
            });
      if (!res.ok) {
        setActionError(await readError(res));
        return;
      }
      await res.json();
      setConfirm(null);
      router.refresh();
    } catch {
      setActionError("No se pudo completar la operación.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl rounded-[20px] bg-gradient-to-br from-white to-zinc-50 p-6 shadow-[0_25px_45px_rgba(0,0,0,0.08)] sm:p-10 dark:from-zinc-900 dark:to-zinc-950">
      <PageHeader title={titulo} />

      <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            scope === "dependencia"
              ? "🔍 Buscar por QR, recurso o usuario..."
              : "🔍 Buscar por QR, recurso o dependencia..."
          }
          className="sm:max-w-sm"
        />
        <p className="rounded-[20px] border border-brand-700 bg-brand-700/5 px-4 py-1.5 text-sm font-bold whitespace-nowrap text-brand-700 dark:text-brand-100">
          {FILTRO_LABEL[estadoInicial]} · Mostrando {inicio}–{fin} de {total} solicitudes
        </p>
      </div>

      {actionError && (
        <p className="mb-4 rounded-[10px] border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {actionError}
        </p>
      )}

      <section className="overflow-hidden rounded-[18px] bg-white shadow-[0_10px_32px_rgba(0,0,0,0.12)] dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="bg-brand-700 text-center text-white">
                <th className="px-3 py-2 font-semibold">QR</th>
                <th className="px-3 py-2 font-semibold">Recurso</th>
                {scope === "dependencia" && <th className="px-3 py-2 font-semibold">Usuario</th>}
                {scope === "propias" && <th className="px-3 py-2 font-semibold">Dependencia</th>}
                <th className="px-3 py-2 font-semibold">Fecha Solicitud</th>
                <th className="px-3 py-2 font-semibold">Fecha Tentativa de Devolución</th>
                <th className="px-3 py-2 font-semibold">Estado</th>
                <th className="px-3 py-2 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {initialData.map((r) => (
                <tr
                  key={r.solicitudId}
                  id={`solicitud-${r.solicitudId}`}
                  className={cn(
                    "border-t border-zinc-200 text-center transition hover:bg-brand-50 dark:border-zinc-800 dark:hover:bg-zinc-800",
                    destacarId === r.solicitudId &&
                      "bg-brand-50 ring-2 ring-inset ring-brand-500 dark:bg-brand-900/40",
                  )}
                >
                  <td className="px-3 py-2 font-medium">
                    {r.prestamoId ? (
                      <Link
                        href={`${scope === "dependencia" ? "/prestamos" : "/mis-prestamos"}?estado=todas&destacar=${r.prestamoId}`}
                        title="Ver préstamo"
                        className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-100"
                      >
                        {r.qr}
                      </Link>
                    ) : (
                      r.qr
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {scope === "dependencia" ? (
                      <Link
                        href={`/inventario?tipo=${r.tipoId}&destacar=${r.recursoId}`}
                        className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-100"
                      >
                        {r.recursoNombre}
                      </Link>
                    ) : (
                      <Link
                        href={`/dependencias/${r.dependenciaId}?tipo=${r.tipoId}&destacar=${r.recursoId}`}
                        className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-100"
                      >
                        {r.recursoNombre}
                      </Link>
                    )}
                  </td>
                  {scope === "dependencia" && (
                    <td className="px-3 py-2">
                      <Link
                        href={`/usuarios/${r.usuarioId}`}
                        className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-100"
                      >
                        {r.usuarioNombre}
                      </Link>
                    </td>
                  )}
                  {scope === "propias" && <td className="px-3 py-2">{r.dependenciaNombre}</td>}
                  <td className="px-3 py-2">{formatFechaCO(r.fechaSolicitud)}</td>
                  <td className="px-3 py-2">{formatFechaCO(r.fechaDevolucion)}</td>
                  <td className="px-3 py-2">
                    <SolicitudBadge estado={r.estado} />
                  </td>
                  <td className="px-3 py-2">
                    <Acciones scope={scope} row={r} busy={saving} onPedir={(accion, row) => { setConfirm({ accion, row }); setActionError(""); }} />
                  </td>
                </tr>
              ))}
              {initialData.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      message={
                        qInicial
                          ? "Sin resultados para la búsqueda aplicada."
                          : "No hay solicitudes de préstamo registradas."
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Paginador estado={estadoInicial} q={qInicial} pagina={pagina} totalPaginas={totalPaginas} />

      <Dialog open={confirm !== null} onOpenChange={(v) => !v && !saving && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm ? CONFIRM_TEXTO[confirm.accion].titulo : ""}</DialogTitle>
            <DialogDescription>
              {confirm ? CONFIRM_TEXTO[confirm.accion].descripcion(confirm.row) : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setConfirm(null)}>
              Volver
            </Button>
            <Button
              disabled={saving}
              onClick={handleConfirm}
              className={confirm ? CONFIRM_TEXTO[confirm.accion].clase : ""}
            >
              {saving ? "Procesando..." : confirm ? CONFIRM_TEXTO[confirm.accion].confirmar : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
