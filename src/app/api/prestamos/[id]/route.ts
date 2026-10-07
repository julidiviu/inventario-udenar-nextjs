import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notificaciones, prestamos, recursos, tiposRecurso, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { deleteFromBlob, isBlobUrl } from "@/lib/blob";
import { generarYSubirContrato, obtenerDatosContratoPorPrestamo } from "@/lib/contratos";
import { formatFechaCO } from "@/lib/dates";
import { plantillaPrestamoDevuelto, plantillaPrestamoExtendido, sendEmail } from "@/lib/email";
import { pisoExtension, validateAccionPrestamo, validateExtender } from "@/lib/prestamos";
import { adminDependenciaId } from "@/lib/recursos-db";

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Préstamo verificado dentro de la dependencia del admin. Null si no existe. */
async function prestamoEnDependencia(id: number, dependenciaId: number) {
  const [row] = await db
    .select({
      id: prestamos.id,
      solicitudId: prestamos.solicitudId,
      devuelto: prestamos.devuelto,
      usuarioId: prestamos.usuarioId,
      recursoId: prestamos.recursoId,
      recursoNombre: recursos.nombre,
      fechaDevolucion: prestamos.fechaDevolucion,
      contratoUrl: prestamos.contratoPrestamoUrl,
    })
    .from(prestamos)
    .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
    .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
    .where(and(eq(prestamos.id, id), eq(tiposRecurso.dependenciaId, dependenciaId)));
  return row ?? null;
}

/**
 * PATCH /api/prestamos/[id] — solo admin de la dependencia.
 * { accion: "devolver" }: préstamo→devuelto + fecha real + recurso disponible + notificación DEVUELTA.
 * { accion: "extender", nuevaFechaDevolucion }: nueva fecha + contrato regenerado + notificación EXTENDIDA.
 * Tras devolver o extender, las solicitudes pendientes del recurso siguen su curso
 * (devolver libera el índice único de préstamo activo y el flag disponible).
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
  const accion = typeof body.accion === "string" ? body.accion : "";
  if (accion !== "devolver" && accion !== "extender") {
    return NextResponse.json({ error: "Acción inválida.", field: "accion" }, { status: 400 });
  }

  const dependenciaId = await adminDependenciaId(session.sub);
  if (dependenciaId === null) {
    return NextResponse.json(
      { error: "No administras ninguna dependencia. Pide al superadmin que te asigne una." },
      { status: 403 },
    );
  }

  const current = await prestamoEnDependencia(id, dependenciaId);
  if (!current) return NextResponse.json({ error: "Préstamo no encontrado." }, { status: 404 });
  if (current.devuelto) {
    return NextResponse.json({ error: "El préstamo ya fue devuelto." }, { status: 409 });
  }

  if (accion === "devolver") {
    const valid = validateAccionPrestamo(body);
    if ("error" in valid) {
      return NextResponse.json({ error: valid.error, field: valid.field }, { status: 400 });
    }
    try {
      await db.transaction(async (tx) => {
        // Re-chequeo dentro del tx: si otra transacción lo devolvió primero, 409.
        const [row] = await tx
          .update(prestamos)
          .set({ devuelto: true, fechaDevolucionReal: new Date() })
          .where(and(eq(prestamos.id, id), eq(prestamos.devuelto, false)))
          .returning({ id: prestamos.id, recursoId: prestamos.recursoId, usuarioId: prestamos.usuarioId });
        if (!row) throw new Error("conflicto");

        await tx.update(recursos).set({ disponible: true }).where(eq(recursos.id, row.recursoId));
        await tx.insert(notificaciones).values({
          usuarioId: row.usuarioId,
          tipo: "DEVUELTA",
          // Punto único de disparo: a futuro el envío por email se engancha aquí mismo.
          mensaje: `Su préstamo del recurso '${current.recursoNombre}' ha sido devuelto satisfactoriamente.`,
        });
      });
    } catch (err) {
      if (err instanceof Error && err.message === "conflicto") {
        return NextResponse.json({ error: "El préstamo ya fue devuelto." }, { status: 409 });
      }
      return NextResponse.json({ error: "No se pudo registrar la devolución." }, { status: 500 });
    }
    // Email best-effort tras el commit: si Brevo falla, la devolución ya quedó registrada.
    try {
      const [dest] = await db
        .select({ email: users.email, firstName: users.firstName, lastName: users.lastName, codigo: users.codigo, rol: users.rol })
        .from(users)
        .where(eq(users.id, current.usuarioId));
      if (dest?.email) {
        const nombre = `${dest.firstName ?? ""} ${dest.lastName ?? ""}`.trim() || `Cód. ${dest.codigo}`;
        const t = plantillaPrestamoDevuelto({ nombre, rol: dest.rol, recurso: current.recursoNombre });
        await sendEmail({ toEmail: dest.email, toName: nombre, ...t });
      }
    } catch {
      // best-effort: no se revierte la devolución por un fallo de correo
    }
    return NextResponse.json({ ok: true, devuelto: true });
  }

  // Extender: valida fecha, regenera contrato y notifica, todo atómico salvo Blob.
  const valid = validateExtender(body, pisoExtension(current.fechaDevolucion));
  if ("error" in valid) {
    return NextResponse.json({ error: valid.error, field: valid.field }, { status: 400 });
  }
  const nuevaFecha = valid.data.nuevaFechaDevolucion;

  const full = await obtenerDatosContratoPorPrestamo(id, nuevaFecha);
  if (!full || full.dependenciaId !== dependenciaId) {
    return NextResponse.json({ error: "Préstamo no encontrado." }, { status: 404 });
  }
  // Contrato nuevo antes de la tx: si Blob falla no se toca la DB; si la tx falla se borra el huérfano.
  let nuevaUrl: string | null = null;
  try {
    nuevaUrl = await generarYSubirContrato(full.datos, current.solicitudId ?? id);
  } catch {
    return NextResponse.json({ error: "No se pudo regenerar el contrato." }, { status: 500 });
  }

  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .update(prestamos)
        .set({ fechaDevolucion: nuevaFecha, contratoPrestamoUrl: nuevaUrl })
        .where(and(eq(prestamos.id, id), eq(prestamos.devuelto, false)))
        .returning({ id: prestamos.id });
      if (!row) throw new Error("conflicto");
      await tx.insert(notificaciones).values({
        usuarioId: current.usuarioId,
        tipo: "EXTENDIDA",
        mensaje: `Tu préstamo del recurso '${current.recursoNombre}' ha sido extendido hasta la fecha ${formatFechaCO(nuevaFecha)}.`,
      });
    });
  } catch (err) {
    if (nuevaUrl && isBlobUrl(nuevaUrl)) {
      try {
        await deleteFromBlob(nuevaUrl);
      } catch {
        // Huérfano en Blob: la DB quedó intacta, el error real se reporta abajo.
      }
    }
    if (err instanceof Error && err.message === "conflicto") {
      return NextResponse.json({ error: "El préstamo ya fue devuelto." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo extender el préstamo." }, { status: 500 });
  }

  // El viejo se borra solo con la tx ya exitosa; si falla, queda huérfano pero nada se rompe.
  if (current.contratoUrl && isBlobUrl(current.contratoUrl)) {
    try {
      await deleteFromBlob(current.contratoUrl);
    } catch {
      // best-effort
    }
  }
  // Email best-effort tras el commit: si Brevo falla, la extensión ya quedó registrada.
  try {
    const [dest] = await db
      .select({ email: users.email, firstName: users.firstName, lastName: users.lastName, codigo: users.codigo, rol: users.rol })
      .from(users)
      .where(eq(users.id, current.usuarioId));
    if (dest?.email) {
      const nombre = `${dest.firstName ?? ""} ${dest.lastName ?? ""}`.trim() || `Cód. ${dest.codigo}`;
      const t = plantillaPrestamoExtendido({ nombre, rol: dest.rol, recurso: current.recursoNombre, nuevaFecha });
      await sendEmail({ toEmail: dest.email, toName: nombre, ...t });
    }
  } catch {
    // best-effort: no se revierte la extensión por un fallo de correo
  }
  return NextResponse.json({ ok: true, fechaDevolucion: nuevaFecha });
}
