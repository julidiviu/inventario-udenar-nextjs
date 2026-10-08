import { NextResponse } from "next/server";
import { db } from "@/db";
import { cierreSemestre } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getCierreFecha, validateCierreFecha } from "@/lib/cierre";

/** GET /api/cierre — tope vigente (cualquier sesión: los modales lo necesitan). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  return NextResponse.json({ ok: true, fecha: await getCierreFecha() });
}

/**
 * PUT /api/cierre — fija/mueve el cierre (solo superadmin).
 * { fecha: "YYYY-MM-DD" | null }: null quita la restricción.
 */
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (session.rol !== "superadmin") return NextResponse.json({ error: "Prohibido." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  // Quitar la restricción: borra la fila única.
  if (body.fecha === null) {
    await db.delete(cierreSemestre);
    return NextResponse.json({ ok: true, fecha: null });
  }

  const valid = validateCierreFecha(body.fecha);
  if ("error" in valid) {
    return NextResponse.json({ error: valid.error, field: valid.field }, { status: 400 });
  }

  const [row] = await db
    .insert(cierreSemestre)
    .values({ id: 1, fecha: valid.data })
    .onConflictDoUpdate({ target: cierreSemestre.id, set: { fecha: valid.data } })
    .returning({ fecha: cierreSemestre.fecha });
  return NextResponse.json({ ok: true, fecha: row.fecha });
}
