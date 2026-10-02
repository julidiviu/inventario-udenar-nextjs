import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { prestamos, recursos, solicitudesPrestamo, tiposRecurso } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { deleteFromBlob, isBlobUrl } from "@/lib/blob";
import { dbErrorCause } from "@/lib/dependencias";
import { validateRecursoInput } from "@/lib/recursos";
import { adminDependenciaId, deleteEmptyTipos, resolveTipo } from "@/lib/recursos-db";

const projection = {
  id: recursos.id,
  qr: recursos.qr,
  tipoId: recursos.tipoId,
  nombre: recursos.nombre,
  descripcion: recursos.descripcion,
  fotoUrl: recursos.fotoUrl,
  disponible: recursos.disponible,
};

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  if (session.rol !== "admin")
    return { error: NextResponse.json({ error: "Prohibido." }, { status: 403 }) };
  const dependenciaId = await adminDependenciaId(session.sub);
  if (dependenciaId === null) {
    return {
      error: NextResponse.json(
        { error: "No administras ninguna dependencia. Pide al superadmin que te asigne una." },
        { status: 403 },
      ),
    };
  }
  return { dependenciaId };
}

/** Recurso verificado dentro de la dependencia del admin. Null si no existe. */
async function recursoEnDependencia(id: number, dependenciaId: number) {
  const [row] = await db
    .select({
      id: recursos.id,
      tipoId: recursos.tipoId,
      fotoUrl: recursos.fotoUrl,
    })
    .from(recursos)
    .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
    .where(and(eq(recursos.id, id), eq(tiposRecurso.dependenciaId, dependenciaId)));
  return row ?? null;
}

/** PATCH /api/recursos/[id] — parcial, solo admin de la dependencia. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const valid = validateRecursoInput(body, true);
  if ("error" in valid) {
    return NextResponse.json({ error: valid.error, field: valid.field }, { status: 400 });
  }
  if (Object.keys(valid.data).length === 0) {
    return NextResponse.json({ error: "Sin cambios." }, { status: 400 });
  }

  const current = await recursoEnDependencia(id, auth.dependenciaId);
  if (!current) return NextResponse.json({ error: "Recurso no encontrado." }, { status: 404 });

  let tipoId = valid.data.tipoId ?? undefined;
  let tipoNombre: string | undefined;
  if (valid.data.nuevoTipo || valid.data.tipoId) {
    const tipo = await resolveTipo(auth.dependenciaId, valid.data.tipoId ?? undefined, valid.data.nuevoTipo ?? undefined);
    if (!tipo) {
      return NextResponse.json({ error: "El tipo de recurso no es válido.", field: "tipoId" }, { status: 400 });
    }
    tipoId = tipo.id;
    tipoNombre = tipo.nombre;
  }

  const { nuevoTipo: _omit, tipoId: _omitTipo, ...campos } = valid.data;
  void _omit;
  void _omitTipo;
  try {
    const [row] = await db
      .update(recursos)
      .set({ ...campos, ...(tipoId ? { tipoId } : {}) })
      .where(eq(recursos.id, id))
      .returning(projection);
    if (!row) return NextResponse.json({ error: "Recurso no encontrado." }, { status: 404 });

    // Foto reemplazada: borra la anterior del Blob. Si falla, revierte la DB
    // (patrón de PATCH /api/dependencias/[id]).
    const previa = current.fotoUrl;
    const nueva = row.fotoUrl;
    if (nueva && previa && nueva !== previa && isBlobUrl(previa)) {
      try {
        await deleteFromBlob(previa);
      } catch {
        try {
          await db.update(recursos).set({ fotoUrl: previa }).where(eq(recursos.id, id));
        } catch {
          return NextResponse.json(
            { error: "No se pudo reemplazar la foto y el recurso quedó en estado inconsistente. Contacte soporte." },
            { status: 500 },
          );
        }
        try {
          if (isBlobUrl(nueva)) await deleteFromBlob(nueva);
        } catch {
          // Huérfano en Blob: se mantiene la foto actual, el error ya se reporta abajo.
        }
        return NextResponse.json(
          { error: "No se pudo reemplazar la foto. Se mantiene la actual." },
          { status: 500 },
        );
      }
    }

    const tiposEliminados =
      tipoId && tipoId !== current.tipoId
        ? await deleteEmptyTipos(auth.dependenciaId, [current.tipoId])
        : [];
    return NextResponse.json({
      ok: true,
      recurso: row,
      ...(tipoId && tipoNombre
        ? { tipo: { id: tipoId, nombre: tipoNombre, dependenciaId: auth.dependenciaId } }
        : {}),
      tiposEliminados,
    });
  } catch (err) {
    const { code } = dbErrorCause(err);
    if (code === "23505") {
      return NextResponse.json({ error: "Ese código QR ya está registrado.", field: "qr" }, { status: 409 });
    }
    if (code === "23514") {
      return NextResponse.json(
        { error: "El código QR debe ser numérico de máximo 8 dígitos.", field: "qr" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "No se pudo actualizar el recurso." }, { status: 500 });
  }
}

/**
 * DELETE /api/recursos/[id] — borrado FÍSICO, solo admin de la dependencia.
 * Sin ?cascade=true y con asociados: 409 con conteos (la UI muestra los modales).
 * Con ?cascade=true: borra préstamos + solicitudes + recurso en transacción,
 * más foto y contratos en Blob (best-effort). Tipos vacíos se eliminan.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  const cascade = new URL(req.url).searchParams.get("cascade") === "true";

  const current = await recursoEnDependencia(id, auth.dependenciaId);
  if (!current) return NextResponse.json({ error: "Recurso no encontrado." }, { status: 404 });

  const [solicitudes, prestamosRows] = await Promise.all([
    db
      .select({ id: solicitudesPrestamo.id })
      .from(solicitudesPrestamo)
      .where(eq(solicitudesPrestamo.recursoId, id)),
    db
      .select({ id: prestamos.id, contratoUrl: prestamos.contratoPrestamoUrl })
      .from(prestamos)
      .where(eq(prestamos.recursoId, id)),
  ]);
  const counts = { solicitudes: solicitudes.length, prestamos: prestamosRows.length };

  if ((counts.solicitudes > 0 || counts.prestamos > 0) && !cascade) {
    return NextResponse.json(
      {
        error: `Este recurso tiene ${counts.solicitudes} ${counts.solicitudes === 1 ? "solicitud asociada" : "solicitudes asociadas"} y ${counts.prestamos} ${counts.prestamos === 1 ? "préstamo asociado" : "préstamos asociados"}.`,
        counts,
      },
      { status: 409 },
    );
  }

  const blobUrls = [
    current.fotoUrl,
    ...prestamosRows.map((p) => p.contratoUrl),
  ].filter((u): u is string => typeof u === "string" && isBlobUrl(u));

  try {
    await db.transaction(async (tx) => {
      await tx.delete(prestamos).where(eq(prestamos.recursoId, id));
      await tx.delete(solicitudesPrestamo).where(eq(solicitudesPrestamo.recursoId, id));
      await tx.delete(recursos).where(eq(recursos.id, id));
    });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar el recurso." }, { status: 500 });
  }

  for (const url of blobUrls) {
    try {
      await deleteFromBlob(url);
    } catch {
      // Best-effort: la DB ya quedó consistente.
    }
  }

  const tiposEliminados = await deleteEmptyTipos(auth.dependenciaId, [current.tipoId]);
  return NextResponse.json({ ok: true, tiposEliminados });
}
