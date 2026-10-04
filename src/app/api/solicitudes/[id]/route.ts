import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notificaciones, prestamos, recursos, solicitudesPrestamo, tiposRecurso, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { deleteFromBlob, isBlobUrl } from "@/lib/blob";
import { generarYSubirContrato, obtenerDatosContrato } from "@/lib/contratos";
import { dbErrorCause } from "@/lib/dependencias";
import { adminDependenciaId } from "@/lib/recursos-db";
import { validateAccion } from "@/lib/solicitudes";

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function nombreCompleto(firstName: string | null, lastName: string | null, codigo: string): string {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || `Cód. ${codigo}`;
}

/** Solicitud verificada dentro de la dependencia del admin. Null si no existe. */
async function solicitudEnDependencia(id: number, dependenciaId: number) {
  const [row] = await db
    .select({
      id: solicitudesPrestamo.id,
      estado: solicitudesPrestamo.estado,
      usuarioId: solicitudesPrestamo.usuarioId,
      recursoId: solicitudesPrestamo.recursoId,
      fechaDevolucion: solicitudesPrestamo.fechaDevolucion,
      recursoNombre: recursos.nombre,
    })
    .from(solicitudesPrestamo)
    .innerJoin(recursos, eq(solicitudesPrestamo.recursoId, recursos.id))
    .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
    .where(and(eq(solicitudesPrestamo.id, id), eq(tiposRecurso.dependenciaId, dependenciaId)));
  return row ?? null;
}

/**
 * PATCH /api/solicitudes/[id] — solo admin de la dependencia.
 * { accion: "aprobar" }: solicitud→aprobado + préstamo + recurso no disponible + notificación APROBADA.
 * { accion: "rechazar" }: solicitud→rechazado + notificación RECHAZADA.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (session.rol !== "admin") return NextResponse.json({ error: "Prohibido." }, { status: 403 });

  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const valid = validateAccion(body);
  if ("error" in valid) {
    return NextResponse.json({ error: valid.error, field: valid.field }, { status: 400 });
  }

  const dependenciaId = await adminDependenciaId(session.sub);
  if (dependenciaId === null) {
    return NextResponse.json(
      { error: "No administras ninguna dependencia. Pide al superadmin que te asigne una." },
      { status: 403 },
    );
  }

  const current = await solicitudEnDependencia(id, dependenciaId);
  if (!current) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  if (current.estado !== "pendiente") {
    return NextResponse.json({ error: "La solicitud ya fue procesada." }, { status: 409 });
  }

  const [admin] = await db
    .select({ firstName: users.firstName, lastName: users.lastName, codigo: users.codigo })
    .from(users)
    .where(eq(users.id, session.sub));
  const adminNombre = nombreCompleto(admin?.firstName ?? null, admin?.lastName ?? null, admin?.codigo ?? "");

  const estadoDB = valid.data.accion === "aprobar" ? "aprobado" : "rechazado";
  const verbo = valid.data.accion === "aprobar" ? "aprobada" : "rechazada";

  // Contrato antes de la tx: si Blob falla no se toca la DB; si la tx falla se borra el huérfano.
  let contratoUrl: string | null = null;
  if (valid.data.accion === "aprobar") {
    const full = await obtenerDatosContrato(id);
    if (!full || full.dependenciaId !== dependenciaId) {
      return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
    }
    try {
      contratoUrl = await generarYSubirContrato(full.datos, id);
    } catch {
      return NextResponse.json({ error: "No se pudo generar el contrato." }, { status: 500 });
    }
  }

  try {
    await db.transaction(async (tx) => {
      // Re-chequeo dentro del tx: si otra transacción la procesó primero, 409.
      const [row] = await tx
        .update(solicitudesPrestamo)
        .set({ estado: estadoDB })
        .where(and(eq(solicitudesPrestamo.id, id), eq(solicitudesPrestamo.estado, "pendiente")))
        .returning({ id: solicitudesPrestamo.id });
      if (!row) throw new Error("conflicto");

      if (valid.data.accion === "aprobar") {
        await tx.insert(prestamos).values({
          solicitudId: id,
          usuarioId: current.usuarioId,
          recursoId: current.recursoId,
          fechaDevolucion: current.fechaDevolucion,
          contratoPrestamoUrl: contratoUrl,
        });
        await tx.update(recursos).set({ disponible: false }).where(eq(recursos.id, current.recursoId));
      }
      await tx.insert(notificaciones).values({
        usuarioId: current.usuarioId,
        tipo: valid.data.accion === "aprobar" ? "APROBADA" : "RECHAZADA",
        mensaje: `Su solicitud de préstamo del recurso '${current.recursoNombre}' ha sido ${verbo} por ${adminNombre}.`,
      });
    });
  } catch (err) {
    if (contratoUrl && isBlobUrl(contratoUrl)) {
      try {
        await deleteFromBlob(contratoUrl);
      } catch {
        // Huérfano en Blob: la DB quedó intacta, el error real se reporta abajo.
      }
    }
    if (err instanceof Error && err.message === "conflicto") {
      return NextResponse.json({ error: "La solicitud ya fue procesada." }, { status: 409 });
    }
    const { code } = dbErrorCause(err);
    if (code === "23505") {
      return NextResponse.json({ error: "El recurso ya tiene un préstamo activo." }, { status: 409 });
    }
    if (code === "23514") {
      return NextResponse.json(
        { error: "La fecha de devolución ya pasó; no se puede aprobar." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "No se pudo procesar la solicitud." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, estado: estadoDB });
}

/** DELETE /api/solicitudes/[id] — el estudiante/profesor cancela su solicitud pendiente (físico). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (session.rol !== "estudiante" && session.rol !== "profesor") {
    return NextResponse.json({ error: "Prohibido." }, { status: 403 });
  }

  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });

  const [row] = await db
    .delete(solicitudesPrestamo)
    .where(
      and(
        eq(solicitudesPrestamo.id, id),
        eq(solicitudesPrestamo.usuarioId, session.sub),
        eq(solicitudesPrestamo.estado, "pendiente"),
      ),
    )
    .returning({ id: solicitudesPrestamo.id });
  if (!row) {
    return NextResponse.json({ error: "Solicitud no encontrada o ya procesada." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
