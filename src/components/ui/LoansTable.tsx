import { formatFechaCO } from "@/lib/dates";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";

export interface BorrowerLoanRow {
  recursoId: number;
  recursoNombre: string;
  dependenciaNombre: string;
  fechaPrestamo: Date | string;
  fechaDevolucion: string;
  devuelto: boolean;
}

/** Paridad con dashboard estudiante/profesor Django: 6 columnas, últimos 10. */
export function LoansTable({ rows }: { rows: BorrowerLoanRow[] }) {
  return (
    <section className="overflow-hidden rounded-[18px] bg-white shadow-[0_8px_26px_rgba(0,0,0,0.1)]">
      <h2 className="bg-brand-700 px-4 py-3 text-base font-bold text-white">Mis Préstamos Recientes</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-100 text-center">
              <th className="px-3 py-2 font-semibold">ID Recurso</th>
              <th className="px-3 py-2 font-semibold">Recurso</th>
              <th className="px-3 py-2 font-semibold">Dependencia</th>
              <th className="px-3 py-2 font-semibold">Fecha Préstamo</th>
              <th className="px-3 py-2 font-semibold">Fecha Devolución</th>
              <th className="px-3 py-2 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.recursoId}-${i}`} className="border-t text-center transition hover:bg-brand-50">
                <td className="px-3 py-2">{r.recursoId}</td>
                <td className="px-3 py-2">{r.recursoNombre}</td>
                <td className="px-3 py-2">{r.dependenciaNombre}</td>
                <td className="px-3 py-2">{formatFechaCO(r.fechaPrestamo)}</td>
                <td className="px-3 py-2">{formatFechaCO(r.fechaDevolucion)}</td>
                <td className="px-3 py-2">
                  <StatusBadge devuelto={r.devuelto} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState message="No tienes préstamos aprobados" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
