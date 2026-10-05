import { redirect } from "next/navigation";
import { and, count, desc, eq, gt, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { dependencias, prestamos, recursos, tiposRecurso, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { FILTRO_PRESTAMO_LABEL, filtroADevueltoDB, parseFiltroPrestamo } from "@/lib/prestamos";
import { FILAS_POR_PAGINA, escapeIlike, paginaOffset, parseDestacar, parsePagina, parseQuery } from "@/lib/paginacion";
import { PrestamosView, type PrestamoRow } from "@/components/prestamos/PrestamosView";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function PrestamosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; pagina?: string; q?: string; destacar?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "admin") redirect("/dashboard");

  const params = await searchParams;
  const filtro = parseFiltroPrestamo(params.estado);
  const devueltoDB = filtroADevueltoDB(filtro);
  const q = parseQuery(params.q);
  const destacar = parseDestacar(params.destacar);
  let pagina = parsePagina(params.pagina);

  const [dep] = await db
    .select({ id: dependencias.id })
    .from(dependencias)
    .where(and(eq(dependencias.administradorId, session.sub), isNull(dependencias.deletedAt)));

  if (!dep) {
    return (
      <div className="mx-auto w-full max-w-7xl rounded-[20px] bg-gradient-to-br from-white to-zinc-50 p-6 shadow-[0_25px_45px_rgba(0,0,0,0.08)] sm:p-10 dark:from-zinc-900 dark:to-zinc-950">
        <PageHeader title="Préstamos" />
        <EmptyState
          variant="alert"
          message="No administras ninguna dependencia. Pide al superadmin que te asigne una."
        />
      </div>
    );
  }

  const baseConds = [eq(tiposRecurso.dependenciaId, dep.id)];
  if (devueltoDB !== null) baseConds.push(eq(prestamos.devuelto, devueltoDB));

  if (destacar) {
    // Deep-link desde una solicitud: sirve la página que contiene ese préstamo
    // (orden desc(id): su página = cuántas filas mayores hay / 10). Mismo scope,
    // así un id ajeno cae en página 1 y se ignora en silencio.
    const [{ n: mayores }] = await db
      .select({ n: count() })
      .from(prestamos)
      .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
      .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
      .where(and(...baseConds, gt(prestamos.id, destacar)));
    pagina = Math.floor(mayores / FILAS_POR_PAGINA) + 1;
  }

  const conds = [...baseConds];
  if (q) {
    const patron = `%${escapeIlike(q)}%`;
    conds.push(
      or(
        ilike(recursos.qr, patron),
        ilike(recursos.nombre, patron),
        ilike(users.firstName, patron),
        ilike(users.lastName, patron),
        ilike(users.codigo, patron),
        ilike(sql`${users.firstName} || ' ' || ${users.lastName}`, patron),
      )!,
    );
  }
  const where = and(...conds);

  const [{ n: total }] = await db
    .select({ n: count() })
    .from(prestamos)
    .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
    .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
    .innerJoin(users, eq(prestamos.usuarioId, users.id))
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
      usuarioId: prestamos.usuarioId,
      tipoId: tiposRecurso.id,
      firstName: users.firstName,
      lastName: users.lastName,
      codigo: users.codigo,
      fechaPrestamo: prestamos.fechaPrestamo,
      fechaDevolucion: prestamos.fechaDevolucion,
      fechaDevolucionReal: prestamos.fechaDevolucionReal,
      devuelto: prestamos.devuelto,
      contratoUrl: prestamos.contratoPrestamoUrl,
    })
    .from(prestamos)
    .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
    .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
    .innerJoin(users, eq(prestamos.usuarioId, users.id))
    .where(where)
    .orderBy(desc(prestamos.id))
    .limit(FILAS_POR_PAGINA)
    .offset(paginaOffset(pagina));

  const initialData: PrestamoRow[] = rows.map((r) => ({
    prestamoId: r.prestamoId,
    solicitudId: r.solicitudId,
    recursoId: r.recursoId,
    qr: r.qr,
    recursoNombre: r.recursoNombre,
    usuarioNombre: `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || `Cód. ${r.codigo}`,
    usuarioId: r.usuarioId,
    tipoId: r.tipoId,
    dependenciaId: 0,
    dependenciaNombre: "",
    fechaPrestamo: r.fechaPrestamo.toISOString(),
    fechaDevolucion: r.fechaDevolucion,
    fechaDevolucionReal: r.fechaDevolucionReal?.toISOString() ?? null,
    devuelto: r.devuelto,
    contratoUrl: r.contratoUrl,
  }));

  return (
    <PrestamosView
      key={filtro}
      scope="dependencia"
      estadoInicial={filtro}
      qInicial={q}
      initialData={initialData}
      pagina={pagina}
      totalPaginas={totalPaginas}
      total={total}
      destacarId={destacar}
      titulo={`Préstamos — ${FILTRO_PRESTAMO_LABEL[filtro]}`}
    />
  );
}
