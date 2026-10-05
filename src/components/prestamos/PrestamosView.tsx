"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Paginador } from "@/components/ui/Paginador";
import { formatFechaCO } from "@/lib/dates";
import type { FiltroPrestamo } from "@/lib/prestamos";
import { diasHasta, FILTRO_PRESTAMO_LABEL } from "@/lib/prestamos";
import { FILAS_POR_PAGINA, hrefConParams } from "@/lib/paginacion";

export interface PrestamoRow {
  /** Key interno, no visible. */
  prestamoId: number;
  /** Trazabilidad: solicitud de origen (null en historial sin vínculo → QR sin link). */
  solicitudId: number | null;
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
  /** URL del PDF en Blob; null en préstamos anteriores al módulo de contratos. */
  contratoUrl: string | null;
}

export type PrestamosScope = "propias" | "dependencia";

interface PrestamosViewProps {
  scope: PrestamosScope;
  estadoInicial: FiltroPrestamo;
  /** ?q= actual (la búsqueda vive en el servidor, el input solo la edita). */
  qInicial: string;
  /** Solo la página actual (máx FILAS_POR_PAGINA filas). */
  initialData: PrestamoRow[];
  pagina: number;
  totalPaginas: number;
  total: number;
  /** ?destacar=: id de préstamo a resaltar (llega desde una solicitud). */
  destacarId: number | null;
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

/** Solo admin: Devolver/Extender pendientes; Contrato abre el PDF (deshabilitado sin URL). */
function Acciones({ row }: { row: PrestamoRow }) {
  const btn =
    "cursor-not-allowed rounded-lg px-2.5 py-1 text-xs font-semibold text-white opacity-60";
  const contrato = row.contratoUrl ? (
    <a
      href={`/api/prestamos/${row.prestamoId}/contrato`}
      target="_blank"
      rel="noreferrer"
      className="rounded-lg border border-green-700 px-2.5 py-1 text-xs font-semibold text-green-800 transition hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-950"
    >
      Contrato
    </a>
  ) : (
    <button type="button" disabled title="Contrato no disponible" className={`${btn} bg-zinc-600`}>
      Contrato
    </button>
  );
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <button type="button" disabled title="Próximamente" className={`${btn} bg-green-700`}>
        Devolver
      </button>
      <button type="button" disabled title="Próximamente" className={`${btn} bg-brand-700`}>
        Extender
      </button>
      {contrato}
    </div>
  );
}

export function PrestamosView({
  scope,
  estadoInicial,
  qInicial,
  initialData,
  pagina,
  totalPaginas,
  total,
  destacarId,
  titulo,
}: PrestamosViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(qInicial);
  const [prevQ, setPrevQ] = useState(qInicial);
  // Sincroniza si ?q= cambia por navegación (atrás/adelante) sin remontar la vista.
  if (qInicial !== prevQ) {
    setPrevQ(qInicial);
    setQuery(qInicial);
  }

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

  // Deep-link desde una solicitud: centra la fila destacada al montar o cambiar.
  useEffect(() => {
    if (!destacarId) return;
    document
      .getElementById(`prestamo-${destacarId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [destacarId]);

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
          {FILTRO_PRESTAMO_LABEL[estadoInicial]} · Mostrando {inicio}–{fin} de {total} préstamos
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
              {initialData.map((r) => (
                <tr
                  key={r.prestamoId}
                  id={`prestamo-${r.prestamoId}`}
                  className={`border-t border-zinc-200 text-center transition hover:bg-brand-50 dark:border-zinc-800 dark:hover:bg-zinc-800 ${
                    destacarId === r.prestamoId
                      ? "bg-brand-50 ring-2 ring-inset ring-brand-500 dark:bg-brand-900/40"
                      : ""
                  }`}
                >
                  <td className="px-3 py-2 font-medium">
                    {r.solicitudId ? (
                      <Link
                        href={`${scope === "dependencia" ? "/solicitudes" : "/mis-solicitudes"}?estado=todas&destacar=${r.solicitudId}`}
                        title="Ver solicitud de origen"
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
              {initialData.length === 0 && (
                <tr>
                  <td colSpan={scope === "dependencia" ? 8 : 7}>
                    <EmptyState
                      message={
                        qInicial
                          ? "Sin resultados para la búsqueda aplicada."
                          : "No hay préstamos registrados."
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
    </div>
  );
}
