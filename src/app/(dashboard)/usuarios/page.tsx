import { redirect } from "next/navigation";
import { and, asc, count, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { UsuariosView } from "@/components/usuarios/UsuariosView";
import { getSession } from "@/lib/auth";
import {
  FILAS_POR_PAGINA,
  escapeIlike,
  paginaOffset,
  parsePagina,
  parseQuery,
} from "@/lib/paginacion";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "superadmin") redirect("/dashboard");

  const params = await searchParams;
  const q = parseQuery(params.q);
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
  const pagina = Math.min(parsePagina(params.pagina), totalPaginas);

  const rows = await db
    .select({
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
    })
    .from(users)
    .where(where)
    .orderBy(asc(users.codigo))
    .limit(FILAS_POR_PAGINA)
    .offset(paginaOffset(pagina));

  return (
    <UsuariosView
      initialUsuarios={rows.map((r) => ({
        ...r,
        email: r.email ?? "",
        firstName: r.firstName ?? "",
        lastName: r.lastName ?? "",
      }))}
      pagina={pagina}
      totalPaginas={totalPaginas}
      total={total}
      qInicial={q}
    />
  );
}
