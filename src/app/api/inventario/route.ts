import { NextResponse } from "next/server";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { dependencias, recursos, tiposRecurso } from "@/db/schema";
import { getSession } from "@/lib/auth";

const tipoProjection = {
  id: tiposRecurso.id,
  nombre: tiposRecurso.nombre,
  dependenciaId: tiposRecurso.dependenciaId,
};

const recursoProjection = {
  id: recursos.id,
  qr: recursos.qr,
  tipoId: recursos.tipoId,
  nombre: recursos.nombre,
  descripcion: recursos.descripcion,
  fotoUrl: recursos.fotoUrl,
  disponible: recursos.disponible,
};

/**
 * GET /api/inventario?dependenciaId=
 * - admin: retorna su dependencia asignada (ignora el query). 403 si no tiene.
 * - resto: exige ?dependenciaId= de una dependencia activa.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let dependenciaId: number | null = null;
  if (session.rol === "admin") {
    const [dep] = await db
      .select({ id: dependencias.id })
      .from(dependencias)
      .where(
        and(eq(dependencias.administradorId, session.sub), isNull(dependencias.deletedAt)),
      );
    if (!dep) {
      return NextResponse.json(
        { error: "No administras ninguna dependencia. Pide al superadmin que te asigne una." },
        { status: 403 },
      );
    }
    dependenciaId = dep.id;
  } else {
    const raw = new URL(req.url).searchParams.get("dependenciaId");
    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0) {
      return NextResponse.json({ error: "Dependencia inválida." }, { status: 400 });
    }
    const [dep] = await db
      .select({ id: dependencias.id })
      .from(dependencias)
      .where(and(eq(dependencias.id, n), isNull(dependencias.deletedAt)));
    if (!dep) return NextResponse.json({ error: "Dependencia no encontrada." }, { status: 404 });
    dependenciaId = dep.id;
  }

  const tipos = await db
    .select(tipoProjection)
    .from(tiposRecurso)
    .where(eq(tiposRecurso.dependenciaId, dependenciaId))
    .orderBy(asc(tiposRecurso.id));
  const tipoIds = tipos.map((t) => t.id);
  const todos =
    tipoIds.length === 0
      ? []
      : await db
          .select(recursoProjection)
          .from(recursos)
          .where(inArray(recursos.tipoId, tipoIds))
          .orderBy(asc(recursos.id));

  return NextResponse.json({ ok: true, dependenciaId, tipos, recursos: todos });
}
