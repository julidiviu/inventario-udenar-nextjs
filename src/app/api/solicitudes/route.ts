import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { dependencias, notificaciones, recursos, solicitudesPrestamo, tiposRecurso, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { dbErrorCause } from "@/lib/dependencias";
import { plantillaSolicitudCreada, sendEmail } from "@/lib/email";
import { validateSolicitudInput } from "@/lib/recursos";

/** POST /api/solicitudes — solo estudiante y profesor. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (session.rol !== "estudiante" && session.rol !== "profesor") {
    return NextResponse.json({ error: "Prohibido." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const valid = validateSolicitudInput(body);
  if ("error" in valid) {
    return NextResponse.json({ error: valid.error, field: valid.field }, { status: 400 });
  }

  const [user] = await db
    .select({
      cedula: users.cedula,
      telefono: users.telefono,
      firmaUrl: users.firmaUrl,
      firstName: users.firstName,
      lastName: users.lastName,
      codigo: users.codigo,
    })
    .from(users)
    .where(eq(users.id, session.sub));
  if (!user?.cedula || !user?.telefono || !user?.firmaUrl) {
    return NextResponse.json(
      { error: "Completa tu perfil (registra firma, cédula y teléfono)." },
      { status: 403 },
    );
  }

  const [recurso] = await db
    .select({ id: recursos.id, nombre: recursos.nombre, tipoId: recursos.tipoId, disponible: recursos.disponible })
    .from(recursos)
    .where(eq(recursos.id, valid.data.recursoId));
  if (!recurso) return NextResponse.json({ error: "Recurso no encontrado." }, { status: 404 });
  if (!recurso.disponible) {
    return NextResponse.json({ error: "El recurso no está disponible." }, { status: 409 });
  }

  // Admin de la dependencia (vía tipo): si no hay asignado, la solicitud se crea sin notificación.
  const [tipo] = await db
    .select({ dependenciaId: tiposRecurso.dependenciaId })
    .from(tiposRecurso)
    .where(eq(tiposRecurso.id, recurso.tipoId));
  const [dep] = tipo
    ? await db
        .select({ administradorId: dependencias.administradorId })
        .from(dependencias)
        .where(and(eq(dependencias.id, tipo.dependenciaId), isNull(dependencias.deletedAt)))
    : [];
  const adminId = dep?.administradorId ?? null;

  const solicitante = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || `Cód. ${user.codigo}`;

  try {
    const [row] = await db.transaction(async (tx) => {
      const [s] = await tx
        .insert(solicitudesPrestamo)
        .values({
          usuarioId: session.sub,
          recursoId: valid.data.recursoId,
          fechaDevolucion: valid.data.fechaDevolucion,
        })
        .returning({ id: solicitudesPrestamo.id, recursoId: solicitudesPrestamo.recursoId });
      if (adminId) {
        await tx.insert(notificaciones).values({
          usuarioId: adminId,
          tipo: "SOLICITUD",
          mensaje: `El usuario ${solicitante} ha solicitado el préstamo del recurso '${recurso.nombre}'.`,
        });
      }
      return [s];
    });
    // Email best-effort tras el commit: si Brevo falla, la solicitud ya quedó creada.
    if (adminId) {
      try {
        const [admin] = await db
          .select({ email: users.email, firstName: users.firstName, lastName: users.lastName, codigo: users.codigo })
          .from(users)
          .where(eq(users.id, adminId));
        if (admin?.email) {
          const adminNombre = `${admin.firstName ?? ""} ${admin.lastName ?? ""}`.trim() || `Cód. ${admin.codigo}`;
          const t = plantillaSolicitudCreada({ adminNombre, solicitante, recurso: recurso.nombre, fechaDevolucion: valid.data.fechaDevolucion });
          await sendEmail({ toEmail: admin.email, toName: adminNombre, ...t });
        }
      } catch {
        // best-effort: no se revierte la solicitud por un fallo de correo
      }
    }
    return NextResponse.json({ ok: true, solicitud: row }, { status: 201 });
  } catch (err) {
    if (dbErrorCause(err).code === "23505") {
      return NextResponse.json(
        { error: "Ya tienes una solicitud pendiente de este recurso." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "No se pudo crear la solicitud." }, { status: 500 });
  }
}
