import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recursos, solicitudesPrestamo, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { dbErrorCause } from "@/lib/dependencias";
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
    .select({ cedula: users.cedula, telefono: users.telefono, firmaUrl: users.firmaUrl })
    .from(users)
    .where(eq(users.id, session.sub));
  if (!user?.cedula || !user?.telefono || !user?.firmaUrl) {
    return NextResponse.json(
      { error: "Completa tu perfil (registra firma, cédula y teléfono)." },
      { status: 403 },
    );
  }

  const [recurso] = await db
    .select({ id: recursos.id, disponible: recursos.disponible })
    .from(recursos)
    .where(eq(recursos.id, valid.data.recursoId));
  if (!recurso) return NextResponse.json({ error: "Recurso no encontrado." }, { status: 404 });
  if (!recurso.disponible) {
    return NextResponse.json({ error: "El recurso no está disponible." }, { status: 409 });
  }

  try {
    const [row] = await db
      .insert(solicitudesPrestamo)
      .values({
        usuarioId: session.sub,
        recursoId: valid.data.recursoId,
        fechaDevolucion: valid.data.fechaDevolucion,
      })
      .returning({ id: solicitudesPrestamo.id, recursoId: solicitudesPrestamo.recursoId });
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
