import { redirect } from "next/navigation";
import { and, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { dependencias, prestamos, recursos, solicitudesPrestamo, tiposRecurso, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { FILTRO_LABEL, filtroAEstadoDB, parseFiltroEstado } from "@/lib/solicitudes";
import { FILAS_POR_PAGINA, escapeIlike, paginaOffset, parsePagina, parseQuery } from "@/lib/paginacion";
import { SolicitudesView, type SolicitudRow } from "@/components/solicitudes/SolicitudesView";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function SolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; pagina?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "admin") redirect("/dashboard");

  const params = await searchParams;
  const filtro = parseFiltroEstado(params.estado);
  const estadoDB = filtroAEstadoDB(filtro);
  const q = parseQuery(params.q);
  let pagina = parsePagina(params.pagina);

  const [dep] = await db
    .select({ id: dependencias.id })
    .from(dependencias)
    .where(and(eq(dependencias.administradorId, session.sub), isNull(dependencias.deletedAt)));

  if (!dep) {
    return (
      <div className="mx-auto w-full max-w-7xl rounded-[20px] bg-gradient-to-br from-white to-zinc-50 p-6 shadow-[0_25px_45px_rgba(0,0,0,0.08)] sm:p-10 dark:from-zinc-900 dark:to-zinc-950">
        <PageHeader title="Solicitudes de Préstamo" />
        <EmptyState
          variant="alert"
          message="No administras ninguna dependencia. Pide al superadmin que te asigne una."
        />
      </div>
    );
  }

  const conds = [eq(tiposRecurso.dependenciaId, dep.id)];
  if (estadoDB) conds.push(eq(solicitudesPrestamo.estado, estadoDB));
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
    .from(solicitudesPrestamo)
    .innerJoin(recursos, eq(solicitudesPrestamo.recursoId, recursos.id))
    .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
    .innerJoin(users, eq(solicitudesPrestamo.usuarioId, users.id))
    .where(where);
  const totalPaginas = Math.max(1, Math.ceil(total / FILAS_POR_PAGINA));
  if (pagina > totalPaginas) pagina = totalPaginas;

  const rows = await db
    .select({
      solicitudId: solicitudesPrestamo.id,
      recursoId: solicitudesPrestamo.recursoId,
      qr: recursos.qr,
      recursoNombre: recursos.nombre,
      usuarioId: solicitudesPrestamo.usuarioId,
      tipoId: tiposRecurso.id,
      firstName: users.firstName,
      lastName: users.lastName,
      codigo: users.codigo,
      fechaSolicitud: solicitudesPrestamo.fechaSolicitud,
      fechaDevolucion: solicitudesPrestamo.fechaDevolucion,
      estado: solicitudesPrestamo.estado,
      contratoUrl: prestamos.contratoPrestamoUrl,
    })
    .from(solicitudesPrestamo)
    .innerJoin(recursos, eq(solicitudesPrestamo.recursoId, recursos.id))
    .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
    .innerJoin(users, eq(solicitudesPrestamo.usuarioId, users.id))
    .leftJoin(prestamos, eq(prestamos.solicitudId, solicitudesPrestamo.id))
    .where(where)
    .orderBy(desc(solicitudesPrestamo.id))
    .limit(FILAS_POR_PAGINA)
    .offset(paginaOffset(pagina));

  const initialData: SolicitudRow[] = rows.map((r) => ({
    solicitudId: r.solicitudId,
    recursoId: r.recursoId,
    qr: r.qr,
    recursoNombre: r.recursoNombre,
    usuarioNombre: `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || `Cód. ${r.codigo}`,
    usuarioId: r.usuarioId,
    tipoId: r.tipoId,
    dependenciaId: 0,
    dependenciaNombre: "",
    fechaSolicitud: r.fechaSolicitud.toISOString(),
    fechaDevolucion: r.fechaDevolucion,
    estado: r.estado,
    contratoUrl: r.contratoUrl,
  }));

  return (
    <SolicitudesView
      key={filtro}
      scope="dependencia"
      estadoInicial={filtro}
      qInicial={q}
      initialData={initialData}
      pagina={pagina}
      totalPaginas={totalPaginas}
      total={total}
      titulo={`Solicitudes de Préstamo — ${FILTRO_LABEL[filtro]}`}
    />
  );
}
