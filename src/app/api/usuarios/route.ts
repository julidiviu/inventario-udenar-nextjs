import { NextResponse } from "next/server";
import { and, asc, count, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import {
  FILAS_POR_PAGINA,
  escapeIlike,
  paginaOffset,
  parsePagina,
  parseQuery,
} from "@/lib/paginacion";

const projection = {
  id: users.id,
  codigo: users.codigo,
  email: users.email,
  cedula: users.cedula,
  firstName: users.firstName,
  lastName: users.lastName,
  telefono: users.telefono,
  programa: users.programa,
  firmaUrl: users.firmaUrl,
  isActive: users.isActive,
  rol: users.rol,
};

/**
 * GET /api/usuarios?q=&pagina= — estudiantes y profesores con búsqueda
 * (código, cédula o nombre) y paginación de servidor. Solo superadmin.
 * Sin POST: la creación es por /api/auth/register.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (session.rol !== "superadmin") return NextResponse.json({ error: "Prohibido." }, { status: 403 });

  const params = new URL(req.url).searchParams;
  const q = parseQuery(params.get("q"));
  const pat = `%${escapeIlike(q)}%`;

  const where = and(
    inArray(users.rol, ["estudiante", "profesor"]),
    isNull(users.deletedAt),
    q
      ? or(
          ilike(users.codigo, pat),
          ilike(users.cedula, pat),
          ilike(users.firstName, pat),
          ilike(users.lastName, pat),
          sql`(${users.firstName} || ' ' || ${users.lastName}) ILIKE ${pat}`,
        )
      : undefined,
  );

  const [{ total }] = await db.select({ total: count() }).from(users).where(where);
  const totalPaginas = Math.max(1, Math.ceil(total / FILAS_POR_PAGINA));
  const pagina = Math.min(parsePagina(params.get("pagina")), totalPaginas);

  const rows = await db
    .select(projection)
    .from(users)
    .where(where)
    .orderBy(asc(users.codigo))
    .limit(FILAS_POR_PAGINA)
    .offset(paginaOffset(pagina));

  return NextResponse.json({ ok: true, usuarios: rows, pagina, totalPaginas, total });
}
