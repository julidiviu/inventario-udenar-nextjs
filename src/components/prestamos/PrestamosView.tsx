"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatFechaCO } from "@/lib/dates";
import type { FiltroPrestamo } from "@/lib/prestamos";
import { diasHasta, FILTRO_PRESTAMO_LABEL } from "@/lib/prestamos";

export interface PrestamoRow {
  /** Key interno, no visible. */
  prestamoId: number;
  /** Interno para el link, no visible. */
  recursoId: number;
  /** Columna "QR": referencia visible del recurso. */
  qr: string;
  recursoNombre: string;
  /** Solo scope="dependencia". Fallback `Cód. ${codigo}` si el nombre es null. */
  usuarioNombre: string;
  /** Interno para el link a /usuarios (solo dependencia), no visible. */
  usuarioId: string;
  tipoId: number;
  /** Interno para el link a /dependencias (solo propias), no visible. */
  dependenciaId: number;
  /** Solo scope="propias" (en admin sería constante). */
  dependenciaNombre: string;
  /** ISO del timestamptz. */
  fechaPrestamo: string;
  /** Fecha pactada 'YYYY-MM-DD'. */
  fechaDevolucion: string;
  /** ISO del timestamptz real, null si sigue pendiente. */
  fechaDevolucionReal: string | null;
  devuelto: boolean;
}

export type PrestamosScope = "propias" | "dependencia";

interface PrestamosViewProps {
  scope: PrestamosScope;
  estadoInicial: FiltroPrestamo;
  initialData: PrestamoRow[];
  titulo: string;
}

function EstadoBadge({ devuelto }: { devuelto: boolean }) {
  return devuelto ? (
    <span className="inline-block rounded-[10px] bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">
      Devuelto
    </span>
  ) : (
    <span className="inline-block rounded-[10px] bg-amber-400 px-3 py-1.5 text-xs font-semibold text-zinc-900">
      Pendiente
    </span>
  );
}

function ContadorBadge({ row }: { row: PrestamoRow }) {
  if (row.devuelto) return <span className="text-xs text-zinc-400">—</span>;
  const dias = diasHasta(row.fechaDevolucion);
  if (dias > 0) {
    return (
      <span className="inline-block rounded-[10px] bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">
        Faltan {dias} día{dias === 1 ? "" : "s"}
      </span>
    );
  }
  if (dias === 0) {
    return (
      <span className="inline-block rounded-[10px] bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">
        Vence hoy
      </span>
    );
  }
  return (
    <span className="inline-block rounded-[10px] bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
      {Math.abs(dias)} día{Math.abs(dias) === 1 ? "" : "s"} de retraso
    </span>
  );
}

/** Fase 1: placeholders deshabilitados, sin mutaciones. */
function Acciones({ row }: { row: PrestamoRow }) {
  const btn =
    "cursor-not-allowed rounded-lg px-2.5 py-1 text-xs font-semibold text-white opacity-60";
  if (!row.devuelto) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button type="button" disabled title="Próximamente" className={`${btn} bg-green-700`}>
          Devolver
        </button>
        <button type="button" disabled title="Próximamente" className={`${btn} bg-brand-700`}>
          Extender
        </button>
        <button type="button" disabled title="Próximamente" className={`${btn} bg-zinc-600`}>
          Contrato
        </button>
      </div>
    );
  }
  return (
    <button type="button" disabled title="Próximamente" className={`${btn} bg-zinc-600`}>
      Contrato
    </button>
  );
}

export function PrestamosView({ scope, estadoInicial, initialData, titulo }: PrestamosViewProps) {
  const [filas] = useState<PrestamoRow[]>(initialData);
  const [query, setQuery] = useState("");

  // ponytail: filtro O(n) en cliente, suficiente hasta ~500 filas; luego búsqueda en servidor.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filas;
    return filas.filter((r) =>
      scope === "dependencia"
        ? r.qr.toLowerCase().includes(q) ||
          r.recursoNombre.toLowerCase().includes(q) ||
          r.usuarioNombre.toLowerCase().includes(q)
        : r.qr.toLowerCase().includes(q) ||
          r.recursoNombre.toLowerCase().includes(q) ||
          r.dependenciaNombre.toLowerCase().includes(q),
    );
  }, [filas, query, scope]);

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
          {FILTRO_PRESTAMO_LABEL[estadoInicial]} · Mostrando {rows.length} de {filas.length} préstamos
        </p>
      </div>

      <section className="overflow-hidden rounded-[18px] bg-white shadow-[0_10px_32px_rgba(0,0,0,0.12)] dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="bg-brand-700 text-center text-white">
                <th className="px-3 py-2 font-semibold">QR</th>
                <th className="px-3 py-2 font-semibold">Recurso</th>
                {scope === "dependencia" && <th className="px-3 py-2 font-semibold">Usuario</th>}
                {scope === "propias" && <th className="px-3 py-2 font-semibold">Dependencia</th>}
                <th className="px-3 py-2 font-semibold">Fecha de Préstamo</th>
                <th className="px-3 py-2 font-semibold">Fecha de Devolución</th>
                <th className="px-3 py-2 font-semibold">Contador de Días</th>
                <th className="px-3 py-2 font-semibold">Estado</th>
                {scope === "dependencia" && <th className="px-3 py-2 font-semibold">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.prestamoId}
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
                  <td className="px-3 py-2">{formatFechaCO(r.fechaPrestamo)}</td>
                  <td className="px-3 py-2">
                    {formatFechaCO(r.devuelto && r.fechaDevolucionReal ? r.fechaDevolucionReal : r.fechaDevolucion)}
                  </td>
                  <td className="px-3 py-2">
                    <ContadorBadge row={r} />
                  </td>
                  <td className="px-3 py-2">
                    <EstadoBadge devuelto={r.devuelto} />
                  </td>
                  {scope === "dependencia" && (
                    <td className="px-3 py-2">
                      <Acciones row={r} />
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={scope === "dependencia" ? 8 : 7}>
                    <EmptyState
                      message={
                        filas.length === 0
                          ? "No hay préstamos registrados."
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
    </div>
  );
}
