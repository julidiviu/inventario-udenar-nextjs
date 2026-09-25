import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { dependencias } from "@/db/schema/auth";
import { recursos, tiposRecurso } from "@/db/schema/inventario";
import { prestamos } from "@/db/schema/prestamos";
import { users } from "@/db/schema/auth";
import type { AdminLoanRow } from "@/components/ui/AdminLoansTable";
import type { BorrowerLoanRow } from "@/components/ui/LoansTable";

function userDisplayName(firstName: string | null, lastName: string | null): string {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Usuario";
}

/** Últimos 10 préstamos propios, más reciente primero. */
export async function getBorrowerLoans(usuarioId: string): Promise<BorrowerLoanRow[]> {
  const rows = await db
    .select({
      recursoId: recursos.id,
      recursoNombre: recursos.nombre,
      dependenciaNombre: dependencias.nombre,
      fechaPrestamo: prestamos.fechaPrestamo,
      fechaDevolucion: prestamos.fechaDevolucion,
      devuelto: prestamos.devuelto,
    })
    .from(prestamos)
    .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
    .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
    .innerJoin(dependencias, eq(tiposRecurso.dependenciaId, dependencias.id))
    .where(eq(prestamos.usuarioId, usuarioId))
    .orderBy(desc(prestamos.fechaPrestamo))
    .limit(10);
  return rows;
}

export type AdminLoansResult = { unassigned: true; rows: [] } | { unassigned: false; rows: AdminLoanRow[] };

/**
 * Préstamos recientes para admin/superadmin.
 * Admin: filtra por su DependenciaAdministrada (dependencias.administradorId).
 * Sin dependencia asignada → vacío seguro. Superadmin (isSuperadmin) → global.
 */
export async function getAdminLoans(opts: {
  adminId: string;
  isSuperadmin: boolean;
}): Promise<AdminLoansResult> {
  let dependenciaId: number | null = null;

  if (!opts.isSuperadmin) {
    const [dep] = await db
      .select({ id: dependencias.id })
      .from(dependencias)
      .where(eq(dependencias.administradorId, opts.adminId));
    if (!dep) return { unassigned: true, rows: [] };
    dependenciaId = dep.id;
  }

  const where = dependenciaId === null ? undefined : eq(tiposRecurso.dependenciaId, dependenciaId);

  const rows = await db
    .select({
      recursoId: recursos.id,
      recursoNombre: recursos.nombre,
      usuarioFirstName: users.firstName,
      usuarioLastName: users.lastName,
      fechaPrestamo: prestamos.fechaPrestamo,
      fechaDevolucion: prestamos.fechaDevolucion,
      devuelto: prestamos.devuelto,
      contratoUrl: prestamos.contratoPrestamoUrl,
    })
    .from(prestamos)
    .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
    .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
    .innerJoin(users, eq(prestamos.usuarioId, users.id))
    .where(where ? and(where) : undefined)
    .orderBy(desc(prestamos.fechaPrestamo))
    .limit(10);

  return {
    unassigned: false,
    rows: rows.map((r) => ({
      recursoId: r.recursoId,
      recursoNombre: r.recursoNombre,
      usuarioNombre: userDisplayName(r.usuarioFirstName, r.usuarioLastName),
      fechaPrestamo: r.fechaPrestamo,
      fechaDevolucion: r.fechaDevolucion,
      devuelto: r.devuelto,
      contratoUrl: r.contratoUrl,
    })),
  };
}
