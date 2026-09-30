import { NextResponse } from "next/server";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { dependencias, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getFullName } from "@/components/layout/user";

/**
 * GET /api/admins/disponibles[?dependenciaId=N] — usuarios rol admin, activos,
 * no eliminados y sin dependencia asignada. Solo superadmin (selector del modal).
 * Con dependenciaId incluye además al admin asignado a esa dependencia para que
 * el modal de edición muestre su nombre ("Administrador actual - …").
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (session.rol !== "superadmin") return NextResponse.json({ error: "Prohibido." }, { status: 403 });

  const raw = new URL(req.url).searchParams.get("dependenciaId");
  const n = raw === null ? null : Number(raw);
  const dependenciaId = n !== null && Number.isInteger(n) && n > 0 ? n : null;

  const rows = await db
    .select({
      id: users.id,
      codigo: users.codigo,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    // Solo las dependencias activas cuentan como asignación: el admin de una
    // eliminada queda libre (UNIQUE parcial en DB).
    .leftJoin(
      dependencias,
      and(eq(dependencias.administradorId, users.id), isNull(dependencias.deletedAt)),
    )
    .where(
      and(
        eq(users.rol, "admin"),
        eq(users.isActive, true),
        isNull(users.deletedAt),
        dependenciaId === null
          ? isNull(dependencias.id)
          : or(isNull(dependencias.id), eq(dependencias.id, dependenciaId)),
      ),
    )
    .orderBy(asc(users.codigo));

  return NextResponse.json({
    ok: true,
    admins: rows.map((r) => ({
      id: r.id,
      codigo: r.codigo,
      nombreCompleto: getFullName(r.firstName, r.lastName, r.codigo),
    })),
  });
}
