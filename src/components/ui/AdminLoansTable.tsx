import { formatFechaCO } from "@/lib/dates";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";

export interface AdminLoanRow {
  recursoId: number;
  recursoNombre: string;
  usuarioNombre: string;
  fechaPrestamo: Date | string;
  fechaDevolucion: string;
  devuelto: boolean;
  contratoUrl: string | null;
}

/**
 * Paridad 1:1 con dashboard admin Django (7 columnas incl. Acciones).
 * Fase read-only: acciones deshabilitadas con title="Próximamente", sin POST.
 */
export function AdminLoansTable({ rows }: { rows: AdminLoanRow[] }) {
  return (
    <section className="overflow-hidden rounded-[18px] bg-white shadow-[0_10px_32px_rgba(0,0,0,0.12)]">
      <h2 className="bg-brand-700 px-4 py-3 text-base font-bold text-white">Préstamos Recientes</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-100 text-center">
              <th className="px-3 py-2 font-semibold">Recurso</th>
              <th className="px-3 py-2 font-semibold">ID Recurso</th>
              <th className="px-3 py-2 font-semibold">Usuario</th>
              <th className="px-3 py-2 font-semibold">Fecha Aprobación</th>
              <th className="px-3 py-2 font-semibold">Fecha Devolución</th>
              <th className="px-3 py-2 font-semibold">Estado</th>
              <th className="px-3 py-2 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.recursoId}-${r.usuarioNombre}-${i}`} className="border-t text-center transition hover:bg-brand-50">
                <td className="px-3 py-2">{r.recursoNombre}</td>
                <td className="px-3 py-2">{r.recursoId}</td>
                <td className="px-3 py-2">{r.usuarioNombre}</td>
                <td className="px-3 py-2">{formatFechaCO(r.fechaPrestamo)}</td>
                <td className="px-3 py-2">{formatFechaCO(r.fechaDevolucion)}</td>
                <td className="px-3 py-2">
                  <StatusBadge devuelto={r.devuelto} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {!r.devuelto && (
                      <>
                        <button
                          type="button"
                          disabled
                          title="Próximamente"
                          className="cursor-not-allowed rounded-lg bg-green-700 px-2.5 py-1 text-xs font-semibold text-white opacity-60"
                        >
                          Devolver
                        </button>
                        <button
                          type="button"
                          disabled
                          title="Próximamente"
                          className="cursor-not-allowed rounded-lg bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white opacity-60"
                        >
                          Extender
                        </button>
                      </>
                    )}
                    {r.contratoUrl ? (
                      <a
                        href={r.contratoUrl}
                        download
                        className="rounded-lg border border-green-700 px-2.5 py-1 text-xs font-semibold text-green-800 transition hover:bg-green-50"
                      >
                        Contrato
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-500">Contrato no disponible</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState message="No hay préstamos recientes" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
