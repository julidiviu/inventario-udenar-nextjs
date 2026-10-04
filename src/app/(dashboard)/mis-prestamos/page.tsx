import { redirect } from "next/navigation";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { dependencias, prestamos, recursos, tiposRecurso } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { FILTRO_PRESTAMO_LABEL, filtroADevueltoDB, parseFiltroPrestamo } from "@/lib/prestamos";
import { FILAS_POR_PAGINA, escapeIlike, paginaOffset, parsePagina, parseQuery } from "@/lib/paginacion";
import { PrestamosView, type PrestamoRow } from "@/components/prestamos/PrestamosView";

export default async function MisPrestamosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; pagina?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "estudiante" && session.rol !== "profesor") redirect("/dashboard");

  const params = await searchParams;
  const filtro = parseFiltroPrestamo(params.estado);
  const devueltoDB = filtroADevueltoDB(filtro);
  const q = parseQuery(params.q);
  let pagina = parsePagina(params.pagina);

  const conds = [eq(prestamos.usuarioId, session.sub)];
  if (devueltoDB !== null) conds.push(eq(prestamos.devuelto, devueltoDB));
  if (q) {
    const patron = `%${escapeIlike(q)}%`;
    conds.push(
      or(
        ilike(recursos.qr, patron),
        ilike(recursos.nombre, patron),
        ilike(dependencias.nombre, patron),
      )!,
    );
  }
  const where = and(...conds);

  const [{ n: total }] = await db
    .select({ n: count() })
    .from(prestamos)
    .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
    .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
    .innerJoin(dependencias, eq(tiposRecurso.dependenciaId, dependencias.id))
    .where(where);
  const totalPaginas = Math.max(1, Math.ceil(total / FILAS_POR_PAGINA));
  if (pagina > totalPaginas) pagina = totalPaginas;

  const rows = await db
    .select({
      prestamoId: prestamos.id,
      solicitudId: prestamos.solicitudId,
      recursoId: prestamos.recursoId,
      qr: recursos.qr,
      recursoNombre: recursos.nombre,
      tipoId: tiposRecurso.id,
      dependenciaId: tiposRecurso.dependenciaId,
      dependenciaNombre: dependencias.nombre,
      fechaPrestamo: prestamos.fechaPrestamo,
      fechaDevolucion: prestamos.fechaDevolucion,
      fechaDevolucionReal: prestamos.fechaDevolucionReal,
      devuelto: prestamos.devuelto,
    })
    .from(prestamos)
    .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
    .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
    .innerJoin(dependencias, eq(tiposRecurso.dependenciaId, dependencias.id))
    .where(where)
    .orderBy(desc(prestamos.id))
    .limit(FILAS_POR_PAGINA)
    .offset(paginaOffset(pagina));

  const initialData: PrestamoRow[] = rows.map((r) => ({
    ...r,
    usuarioNombre: "",
    usuarioId: "",
    contratoUrl: null,
    fechaPrestamo: r.fechaPrestamo.toISOString(),
    fechaDevolucionReal: r.fechaDevolucionReal?.toISOString() ?? null,
  }));

  return (
    <PrestamosView
      key={filtro}
      scope="propias"
      estadoInicial={filtro}
      qInicial={q}
      initialData={initialData}
      pagina={pagina}
      totalPaginas={totalPaginas}
      total={total}
      titulo={`Mis Préstamos — ${FILTRO_PRESTAMO_LABEL[filtro]}`}
    />
  );
}
