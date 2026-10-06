import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { dependencias } from "@/db/schema/auth";
import { recursos, tiposRecurso } from "@/db/schema/inventario";
import { prestamos } from "@/db/schema/prestamos";
import { users } from "@/db/schema/auth";
import type { PrestamoRow } from "@/components/prestamos/PrestamosView";

function userDisplayName(firstName: string | null, lastName: string | null, codigo: string): string {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || `Cód. ${codigo}`;
}

/** Últimos 10 préstamos propios, más reciente primero (desc(id), como /mis-prestamos). */
export async function getBorrowerLoans(usuarioId: string): Promise<PrestamoRow[]> {
  const rows = await db
    .select({
      prestamoId: prestamos.id,
      solicitudId: prestamos.solicitudId,
      recursoId: prestamos.recursoId,
      qr: recursos.qr,
      recursoNombre: recursos.nombre,
      tipoId: tiposRecurso.id,
      dependenciaId: tiposRecurso.dependenciaId,
      dependenciaNombre: dependencias.nombre,
      fechaPrestamo: prestamos.fechaPrestamo,
      fechaDevolucion: prestamos.fechaDevolucion,
      fechaDevolucionReal: prestamos.fechaDevolucionReal,
      devuelto: prestamos.devuelto,
    })
    .from(prestamos)
    .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
    .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
    .innerJoin(dependencias, eq(tiposRecurso.dependenciaId, dependencias.id))
    .where(eq(prestamos.usuarioId, usuarioId))
    .orderBy(desc(prestamos.id))
    .limit(10);
  return rows.map((r) => ({
    ...r,
    usuarioNombre: "",
    usuarioId: "",
    contratoUrl: null,
    fechaPrestamo: r.fechaPrestamo.toISOString(),
    fechaDevolucionReal: r.fechaDevolucionReal?.toISOString() ?? null,
  }));
}

export type AdminLoansResult = { unassigned: true; rows: [] } | { unassigned: false; rows: PrestamoRow[] };

/**
 * Últimos 10 préstamos para admin/superadmin (desc(id), como /prestamos).
 * Admin: filtra por su dependencia (dependencias.administradorId).
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
      prestamoId: prestamos.id,
      solicitudId: prestamos.solicitudId,
      recursoId: prestamos.recursoId,
      qr: recursos.qr,
      recursoNombre: recursos.nombre,
      usuarioId: prestamos.usuarioId,
      tipoId: tiposRecurso.id,
      firstName: users.firstName,
      lastName: users.lastName,
      codigo: users.codigo,
      fechaPrestamo: prestamos.fechaPrestamo,
      fechaDevolucion: prestamos.fechaDevolucion,
      fechaDevolucionReal: prestamos.fechaDevolucionReal,
      devuelto: prestamos.devuelto,
      contratoUrl: prestamos.contratoPrestamoUrl,
    })
    .from(prestamos)
    .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
    .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
    .innerJoin(users, eq(prestamos.usuarioId, users.id))
    .where(where ? and(where) : undefined)
    .orderBy(desc(prestamos.id))
    .limit(10);

  return {
    unassigned: false,
    rows: rows.map((r) => ({
      prestamoId: r.prestamoId,
      solicitudId: r.solicitudId,
      recursoId: r.recursoId,
      qr: r.qr,
      recursoNombre: r.recursoNombre,
      usuarioNombre: userDisplayName(r.firstName, r.lastName, r.codigo),
      usuarioId: r.usuarioId,
      tipoId: r.tipoId,
      dependenciaId: 0,
      dependenciaNombre: "",
      fechaPrestamo: r.fechaPrestamo.toISOString(),
      fechaDevolucion: r.fechaDevolucion,
      fechaDevolucionReal: r.fechaDevolucionReal?.toISOString() ?? null,
      devuelto: r.devuelto,
      contratoUrl: r.contratoUrl,
    })),
  };
}
