import { NextResponse } from "next/server";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { dependencias, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { deleteFromBlob, isBlobUrl } from "@/lib/blob";
import { dbErrorCause, uniqueField, validateDependenciaInput } from "@/lib/dependencias";

const projection = {
  id: dependencias.id,
  codigo: dependencias.codigo,
  nombre: dependencias.nombre,
  descripcion: dependencias.descripcion,
  imagenUrl: dependencias.imagenUrl,
  administradorId: dependencias.administradorId,
};

/** GET /api/dependencias — lista activas (WHERE deletedAt IS NULL). Requiere sesión. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const rows = await db
    .select(projection)
    .from(dependencias)
    .where(isNull(dependencias.deletedAt))
    .orderBy(asc(dependencias.id));
  return NextResponse.json({ ok: true, dependencias: rows });
}

/** POST /api/dependencias — solo superadmin. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (session.rol !== "superadmin") return NextResponse.json({ error: "Prohibido." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const valid = validateDependenciaInput(body, false);
  if ("error" in valid) {
    return NextResponse.json({ error: valid.error, field: valid.field }, { status: 400 });
  }

  if (valid.data.administradorId) {
    const admin = await findAssignableAdmin(valid.data.administradorId);
    if (!admin) {
      return NextResponse.json(
        { error: "El administrador no es válido o ya tiene dependencia.", field: "administradorId" },
        { status: 400 },
      );
    }
  }

  try {
    const [row] = await db.insert(dependencias).values(valid.data).returning(projection);
    return NextResponse.json({ ok: true, dependencia: row }, { status: 201 });
  } catch (err) {
    const { code, constraint } = dbErrorCause(err);
    // La imagen se subió antes del insert: si falla, no dejar huérfano en Blob
    // (la DB nunca la referenció, no hay nada que revertir).
    const subida = valid.data.imagenUrl;
    if (subida && isBlobUrl(subida)) {
      try {
        await deleteFromBlob(subida);
      } catch {
        // Best-effort: el error que se reporta es el del insert.
      }
    }
    if (code === "23505") {
      const deleted = await describeDeletedConflict(valid.data.codigo, valid.data.nombre);
      if (deleted) return NextResponse.json(deleted, { status: 409 });
      const field = uniqueField(constraint);
      return NextResponse.json({ error: "Ese valor ya está registrado.", field }, { status: 409 });
    }
    if (code === "23514") {
      return NextResponse.json({ error: "El código debe ser un número de máximo 5 dígitos.", field: "codigo" }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo crear la dependencia." }, { status: 500 });
  }
}

/** Admin asignable: rol admin, activo, no eliminado y sin dependencia. */
async function findAssignableAdmin(adminId: string, exceptDependenciaId?: number) {
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, adminId), eq(users.rol, "admin"), eq(users.isActive, true), isNull(users.deletedAt)));
  if (!admin) return null;
  const taken = await db
    .select({ id: dependencias.id })
    .from(dependencias)
    .where(and(eq(dependencias.administradorId, adminId), isNull(dependencias.deletedAt)));
  if (taken.some((d) => d.id !== exceptDependenciaId)) return null;
  return admin;
}

export { findAssignableAdmin };

/**
 * B-simple: crear siempre inserta fila nueva. Si el 23505 coincide con valores
 * de una fila eliminada, mensaje distintivo para advertir al superadmin
 * (posible borrado por error, recuperable con deleted_at = NULL).
 */
export async function describeDeletedConflict(codigo?: string, nombre?: string) {
  const conds = [];
  if (codigo) conds.push(eq(dependencias.codigo, codigo));
  if (nombre) conds.push(eq(dependencias.nombre, nombre));
  if (conds.length === 0) return null;
  const rows = await db
    .select({
      codigo: dependencias.codigo,
      nombre: dependencias.nombre,
      deletedAt: dependencias.deletedAt,
    })
    .from(dependencias)
    .where(or(...conds));
  // Si una activa tiene el valor, el 409 es genérico (duplicado real).
  const clash = (value: string | undefined, field: "codigo" | "nombre") => {
    if (!value) return null;
    if (rows.some((r) => r[field] === value && r.deletedAt === null)) return null;
    if (rows.some((r) => r[field] === value)) {
      return {
        error:
          field === "codigo"
            ? "Ese código pertenece a una dependencia eliminada."
            : "Ese nombre pertenece a una dependencia eliminada.",
        field,
      };
    }
    return null;
  };
  return clash(codigo, "codigo") ?? clash(nombre, "nombre");
}
