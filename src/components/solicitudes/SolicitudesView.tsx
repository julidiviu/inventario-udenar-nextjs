"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { formatFechaCO } from "@/lib/dates";
import type { AccionSolicitud, EstadoSolicitud, FiltroEstado } from "@/lib/solicitudes";
import { FILTRO_LABEL } from "@/lib/solicitudes";

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
  fechaSolicitud: string;
  fechaDevolucion: string;
  estado: EstadoSolicitud;
  contratoUrl: string | null;
}

export type SolicitudesScope = "propias" | "dependencia";

interface SolicitudesViewProps {
  scope: SolicitudesScope;
  estadoInicial: FiltroEstado;
  initialData: SolicitudRow[];
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
    if (row.estado === "aprobado") {
      return (
        <button
          type="button"
          disabled
          title="Próximamente"
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

export function SolicitudesView({ scope, estadoInicial, initialData, titulo }: SolicitudesViewProps) {
  const [filas, setFilas] = useState<SolicitudRow[]>(initialData);
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState<Confirmacion>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  // ponytail: filtro O(n) en cliente, suficiente hasta ~500 filas; luego búsqueda en servidor.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filas;
    return filas.filter((r) =>
      scope === "dependencia"
        ? r.qr.toLowerCase().includes(q) ||
          r.recursoNombre.toLowerCase().includes(q) ||
          r.usuarioNombre.toLowerCase().includes(q)
        : r.qr.toLowerCase().includes(q) || r.recursoNombre.toLowerCase().includes(q),
    );
  }, [filas, query, scope]);

  async function readError(res: Response): Promise<string> {
    try {
      const body = await res.json();
      return typeof body.error === "string" ? body.error : "Operación fallida.";
    } catch {
      return "Operación fallida.";
    }
  }

  /** Tras mutar: en filtro por estado la fila sale de la lista; en "todas" actualiza el badge. */
  function aplicarCambio(id: number, estado: EstadoSolicitud | null) {
    setFilas((prev) =>
      estado === null || estadoInicial !== "todas"
        ? prev.filter((r) => r.solicitudId !== id)
        : prev.map((r) => (r.solicitudId === id ? { ...r, estado } : r)),
    );
  }

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
      const body = await res.json();
      aplicarCambio(row.solicitudId, accion === "cancelar" ? null : (body.estado as EstadoSolicitud));
      setConfirm(null);
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
              : "🔍 Buscar por QR o recurso..."
          }
          className="sm:max-w-sm"
        />
        <p className="rounded-[20px] border border-brand-700 bg-brand-700/5 px-4 py-1.5 text-sm font-bold whitespace-nowrap text-brand-700 dark:text-brand-100">
          {FILTRO_LABEL[estadoInicial]} · Mostrando {rows.length} de {filas.length} solicitudes
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
                <th className="px-3 py-2 font-semibold">Fecha Solicitud</th>
                <th className="px-3 py-2 font-semibold">Fecha Tentativa de Devolución</th>
                <th className="px-3 py-2 font-semibold">Estado</th>
                <th className="px-3 py-2 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.solicitudId}
                  className="border-t border-zinc-200 text-center transition hover:bg-brand-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                >
                  <td className="px-3 py-2 font-medium">{r.qr}</td>
                  <td className="px-3 py-2">
                    {scope === "dependencia" ? (
                      <Link
                        href={`/inventario?tipo=${r.tipoId}&destacar=${r.recursoId}`}
                        className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-100"
                      >
                        {r.recursoNombre}
                      </Link>
                    ) : (
                      r.recursoNombre
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
              {rows.length === 0 && (
                <tr>
                  <td colSpan={scope === "dependencia" ? 7 : 6}>
                    <EmptyState
                      message={
                        filas.length === 0
                          ? "No hay solicitudes de préstamo registradas."
                          : "Sin resultados para la búsqueda aplicada."
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

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
