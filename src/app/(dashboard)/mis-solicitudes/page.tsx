import { redirect } from "next/navigation";
import { and, count, desc, eq, gt, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { dependencias, prestamos, recursos, solicitudesPrestamo, tiposRecurso } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { FILTRO_LABEL, filtroAEstadoDB, parseFiltroEstado } from "@/lib/solicitudes";
import { FILAS_POR_PAGINA, escapeIlike, paginaOffset, parseDestacar, parsePagina, parseQuery } from "@/lib/paginacion";
import { SolicitudesView, type SolicitudRow } from "@/components/solicitudes/SolicitudesView";

export default async function MisSolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; pagina?: string; q?: string; destacar?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "estudiante" && session.rol !== "profesor") redirect("/dashboard");

  const params = await searchParams;
  const filtro = parseFiltroEstado(params.estado);
  const estadoDB = filtroAEstadoDB(filtro);
  const q = parseQuery(params.q);
  const destacar = parseDestacar(params.destacar);
  let pagina = parsePagina(params.pagina);

  const baseConds = [eq(solicitudesPrestamo.usuarioId, session.sub)];
  if (estadoDB) baseConds.push(eq(solicitudesPrestamo.estado, estadoDB));

  if (destacar) {
    // Deep-link desde un préstamo: sirve la página que contiene esa solicitud.
    const [{ n: mayores }] = await db
      .select({ n: count() })
      .from(solicitudesPrestamo)
      .innerJoin(recursos, eq(solicitudesPrestamo.recursoId, recursos.id))
      .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
      .innerJoin(dependencias, eq(tiposRecurso.dependenciaId, dependencias.id))
      .where(and(...baseConds, gt(solicitudesPrestamo.id, destacar)));
    pagina = Math.floor(mayores / FILAS_POR_PAGINA) + 1;
  }

  const conds = [...baseConds];
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
    .from(solicitudesPrestamo)
    .innerJoin(recursos, eq(solicitudesPrestamo.recursoId, recursos.id))
    .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
    .innerJoin(dependencias, eq(tiposRecurso.dependenciaId, dependencias.id))
    .where(where);
  const totalPaginas = Math.max(1, Math.ceil(total / FILAS_POR_PAGINA));
  if (pagina > totalPaginas) pagina = totalPaginas;

  const rows = await db
    .select({
      solicitudId: solicitudesPrestamo.id,
      recursoId: solicitudesPrestamo.recursoId,
      qr: recursos.qr,
      recursoNombre: recursos.nombre,
      tipoId: tiposRecurso.id,
      dependenciaId: tiposRecurso.dependenciaId,
      dependenciaNombre: dependencias.nombre,
      fechaSolicitud: solicitudesPrestamo.fechaSolicitud,
      fechaDevolucion: solicitudesPrestamo.fechaDevolucion,
      estado: solicitudesPrestamo.estado,
      contratoUrl: prestamos.contratoPrestamoUrl,
    })
    .from(solicitudesPrestamo)
    .innerJoin(recursos, eq(solicitudesPrestamo.recursoId, recursos.id))
    .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
    .innerJoin(dependencias, eq(tiposRecurso.dependenciaId, dependencias.id))
    .leftJoin(prestamos, eq(prestamos.solicitudId, solicitudesPrestamo.id))
    .where(where)
    .orderBy(desc(solicitudesPrestamo.id))
    .limit(FILAS_POR_PAGINA)
    .offset(paginaOffset(pagina));

  const initialData: SolicitudRow[] = rows.map((r) => ({
    ...r,
    usuarioNombre: "",
    usuarioId: "",
    fechaSolicitud: r.fechaSolicitud.toISOString(),
  }));

  return (
    <SolicitudesView
      key={filtro}
      scope="propias"
      estadoInicial={filtro}
      qInicial={q}
      initialData={initialData}
      pagina={pagina}
      totalPaginas={totalPaginas}
      total={total}
      destacarId={destacar}
      titulo={`Mis Solicitudes — ${FILTRO_LABEL[filtro]}`}
    />
  );
}
