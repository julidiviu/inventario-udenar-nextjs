import { and, eq, inArray, isNull, notExists } from "drizzle-orm";
import { db } from "@/db";
import { dependencias, recursos, tiposRecurso } from "@/db/schema";
import { dbErrorCause } from "@/lib/dependencias";

/** Dependencia activa administrada por el admin. Null si no tiene asignada. */
export async function adminDependenciaId(adminId: string): Promise<number | null> {
  const [dep] = await db
    .select({ id: dependencias.id })
    .from(dependencias)
    .where(and(eq(dependencias.administradorId, adminId), isNull(dependencias.deletedAt)));
  return dep?.id ?? null;
}

/** Verifica que el tipo pertenece a la dependencia. Null si no existe. */
export async function tipoEnDependencia(tipoId: number, dependenciaId: number) {
  const [tipo] = await db
    .select({ id: tiposRecurso.id, nombre: tiposRecurso.nombre })
    .from(tiposRecurso)
    .where(and(eq(tiposRecurso.id, tipoId), eq(tiposRecurso.dependenciaId, dependenciaId)));
  return tipo ?? null;
}

/**
 * Resuelve el tipo del recurso: usa tipoId verificado o crea el nuevoTipo.
 * Si el nombre ya existe en la dependencia, reutiliza ese tipo.
 */
export async function resolveTipo(
  dependenciaId: number,
  tipoId: number | undefined,
  nuevoTipo: string | undefined,
): Promise<{ id: number; nombre: string } | null> {
  if (tipoId) return (await tipoEnDependencia(tipoId, dependenciaId)) ?? null;
  if (!nuevoTipo) return null;
  const [existe] = await db
    .select({ id: tiposRecurso.id, nombre: tiposRecurso.nombre })
    .from(tiposRecurso)
    .where(and(eq(tiposRecurso.nombre, nuevoTipo), eq(tiposRecurso.dependenciaId, dependenciaId)));
  if (existe) return existe;
  try {
    const [row] = await db
      .insert(tiposRecurso)
      .values({ nombre: nuevoTipo, dependenciaId })
      .returning({ id: tiposRecurso.id, nombre: tiposRecurso.nombre });
    return row;
  } catch (err) {
    // Carrera: otro request creó el mismo tipo → reutilizarlo.
    if (dbErrorCause(err).code !== "23505") throw err;
    const [row] = await db
      .select({ id: tiposRecurso.id, nombre: tiposRecurso.nombre })
      .from(tiposRecurso)
      .where(
        and(eq(tiposRecurso.nombre, nuevoTipo), eq(tiposRecurso.dependenciaId, dependenciaId)),
      );
    return row ?? null;
  }
}

/**
 * Borrado físico de tipos que quedaron sin recursos (regla aprobada).
 * Solo los tipoIds afectados por la operación, solo de esta dependencia.
 * Retorna los ids eliminados para actualizar la UI.
 */
export async function deleteEmptyTipos(
  dependenciaId: number,
  tipoIds: number[],
): Promise<number[]> {
  if (tipoIds.length === 0) return [];
  const rows = await db
    .delete(tiposRecurso)
    .where(
      and(
        eq(tiposRecurso.dependenciaId, dependenciaId),
        inArray(tiposRecurso.id, tipoIds),
        notExists(db.select({ one: recursos.id }).from(recursos).where(eq(recursos.tipoId, tiposRecurso.id))),
      ),
    )
    .returning({ id: tiposRecurso.id });
  return rows.map((r) => r.id);
}
