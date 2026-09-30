import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { dependencias } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { deleteFromBlob, isBlobUrl } from "@/lib/blob";
import { dbErrorCause, uniqueField, validateDependenciaInput } from "@/lib/dependencias";
import { findAssignableAdmin, describeDeletedConflict } from "../route";

const projection = {
  id: dependencias.id,
  codigo: dependencias.codigo,
  nombre: dependencias.nombre,
  descripcion: dependencias.descripcion,
  imagenUrl: dependencias.imagenUrl,
  administradorId: dependencias.administradorId,
};

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function requireSuperadmin() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  if (session.rol !== "superadmin") return { error: NextResponse.json({ error: "Prohibido." }, { status: 403 }) };
  return { session };
}

/** PATCH /api/dependencias/[id] — parcial, solo superadmin. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperadmin();
  if ("error" in auth) return auth.error;
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const valid = validateDependenciaInput(body, true);
  if ("error" in valid) {
    return NextResponse.json({ error: valid.error, field: valid.field }, { status: 400 });
  }
  if (Object.keys(valid.data).length === 0) {
    return NextResponse.json({ error: "Sin cambios." }, { status: 400 });
  }

  if (valid.data.administradorId) {
    const admin = await findAssignableAdmin(valid.data.administradorId, id);
    if (!admin) {
      return NextResponse.json(
        { error: "El administrador no es válido o ya tiene dependencia.", field: "administradorId" },
        { status: 400 },
      );
    }
  }

  try {
    const [current] = await db
      .select({ imagenUrl: dependencias.imagenUrl })
      .from(dependencias)
      .where(and(eq(dependencias.id, id), isNull(dependencias.deletedAt)));
    if (!current) return NextResponse.json({ error: "Dependencia no encontrada." }, { status: 404 });

    const [row] = await db
      .update(dependencias)
      .set(valid.data)
      .where(and(eq(dependencias.id, id), isNull(dependencias.deletedAt)))
      .returning(projection);
    if (!row) return NextResponse.json({ error: "Dependencia no encontrada." }, { status: 404 });

    // Imagen reemplazada: borra la anterior del Blob. Si falla, revierte la DB
    // para mantener la imagen actual y responde error (patrón de /api/perfil).
    const previa = current.imagenUrl;
    const nueva = row.imagenUrl;
    if (nueva && previa && nueva !== previa && isBlobUrl(previa)) {
      try {
        await deleteFromBlob(previa);
      } catch {
        try {
          await db.update(dependencias).set({ imagenUrl: previa }).where(eq(dependencias.id, id));
        } catch {
          return NextResponse.json(
            { error: "No se pudo reemplazar la imagen y la dependencia quedó en estado inconsistente. Contacte soporte." },
            { status: 500 },
          );
        }
        try {
          if (isBlobUrl(nueva)) await deleteFromBlob(nueva);
        } catch {
          // Huérfano en Blob: se mantiene la imagen actual, el error ya se reporta abajo.
        }
        return NextResponse.json(
          { error: "No se pudo reemplazar la imagen. Se mantiene la actual." },
          { status: 500 },
        );
      }
    }
    return NextResponse.json({ ok: true, dependencia: row });
  } catch (err) {
    const { code, constraint } = dbErrorCause(err);
    if (code === "23505") {
      const deleted = await describeDeletedConflict(valid.data.codigo, valid.data.nombre);
      if (deleted) return NextResponse.json(deleted, { status: 409 });
      const field = uniqueField(constraint);
      return NextResponse.json({ error: "Ese valor ya está registrado.", field }, { status: 409 });
    }
    if (code === "23514") {
      return NextResponse.json({ error: "El código debe ser un número de máximo 5 dígitos.", field: "codigo" }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo actualizar la dependencia." }, { status: 500 });
  }
}

/** DELETE /api/dependencias/[id] — borrado lógico, solo superadmin. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperadmin();
  if ("error" in auth) return auth.error;
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });

  const [row] = await db
    .update(dependencias)
    .set({ deletedAt: new Date() })
    .where(and(eq(dependencias.id, id), isNull(dependencias.deletedAt)))
    .returning({ id: dependencias.id });
  if (!row) return NextResponse.json({ error: "Dependencia no encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
