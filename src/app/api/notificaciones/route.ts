import { NextResponse } from "next/server";
import { and, count, desc, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { notificaciones } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { NOTIFICACIONES_PAGE } from "@/lib/notificaciones";

function parseCursor(url: string): { before: number | null; limit: number } {
  const q = new URL(url).searchParams;
  const beforeRaw = Number(q.get("before"));
  const limitRaw = Number(q.get("limit"));
  return {
    before: Number.isInteger(beforeRaw) && beforeRaw > 0 ? beforeRaw : null,
    limit:
      Number.isInteger(limitRaw) && limitRaw > 0
        ? Math.min(limitRaw, 20)
        : NOTIFICACIONES_PAGE,
  };
}

/**
 * GET /api/notificaciones?before=<id>&limit=4 — propias, más recientes primero.
 * { ok, notificaciones, noLeidas, hayMas }.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { before, limit } = parseCursor(req.url);
  const cond = before
    ? and(eq(notificaciones.usuarioId, session.sub), lt(notificaciones.id, before))
    : eq(notificaciones.usuarioId, session.sub);

  const [rows, unread] = await Promise.all([
    db
      .select({
        id: notificaciones.id,
        tipo: notificaciones.tipo,
        mensaje: notificaciones.mensaje,
        fecha: notificaciones.fecha,
        leida: notificaciones.leida,
      })
      .from(notificaciones)
      .where(cond)
      .orderBy(desc(notificaciones.id))
      .limit(limit + 1),
    db
      .select({ n: count() })
      .from(notificaciones)
      .where(and(eq(notificaciones.usuarioId, session.sub), eq(notificaciones.leida, false))),
  ]);

  return NextResponse.json({
    ok: true,
    notificaciones: rows.slice(0, limit).map((r) => ({ ...r, fecha: r.fecha.toISOString() })),
    noLeidas: unread[0]?.n ?? 0,
    hayMas: rows.length > limit,
  });
}

/** PATCH /api/notificaciones — marca todas las propias como leídas. */
export async function PATCH() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const rows = await db
    .update(notificaciones)
    .set({ leida: true })
    .where(and(eq(notificaciones.usuarioId, session.sub), eq(notificaciones.leida, false)))
    .returning({ id: notificaciones.id });
  return NextResponse.json({ ok: true, actualizadas: rows.length });
}
