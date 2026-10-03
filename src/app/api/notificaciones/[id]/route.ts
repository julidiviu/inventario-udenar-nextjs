import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notificaciones } from "@/db/schema";
import { getSession } from "@/lib/auth";

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** DELETE /api/notificaciones/[id] — borrado físico de la propia. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });

  const [row] = await db
    .delete(notificaciones)
    .where(and(eq(notificaciones.id, id), eq(notificaciones.usuarioId, session.sub)))
    .returning({ id: notificaciones.id });
  if (!row) return NextResponse.json({ error: "Notificación no encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
