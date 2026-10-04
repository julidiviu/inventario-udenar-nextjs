import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { dependencias, prestamos, recursos, tiposRecurso } from "@/db/schema";
import { getSession } from "@/lib/auth";

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * GET /api/prestamos/[id]/contrato — redirige al PDF en Blob (el navegador abre su visor).
 * Dueño del préstamo o admin de la dependencia. 404 fuera de alcance o sin contrato.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });

  const [row] = await db
    .select({
      usuarioId: prestamos.usuarioId,
      contratoUrl: prestamos.contratoPrestamoUrl,
      dependenciaId: tiposRecurso.dependenciaId,
    })
    .from(prestamos)
    .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
    .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
    .where(eq(prestamos.id, id));
  if (!row) return NextResponse.json({ error: "Préstamo no encontrado." }, { status: 404 });

  if (session.sub !== row.usuarioId) {
    if (session.rol !== "admin") return NextResponse.json({ error: "Prohibido." }, { status: 403 });
    const [dep] = await db
      .select({ id: dependencias.id })
      .from(dependencias)
      .where(
        and(
          eq(dependencias.id, row.dependenciaId),
          eq(dependencias.administradorId, session.sub),
          isNull(dependencias.deletedAt),
        ),
      );
    if (!dep) return NextResponse.json({ error: "Préstamo no encontrado." }, { status: 404 });
  }
  if (!row.contratoUrl) {
    return NextResponse.json({ error: "Contrato no disponible." }, { status: 404 });
  }
  return NextResponse.redirect(row.contratoUrl);
}
