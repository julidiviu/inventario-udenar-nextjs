import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { dependencias, prestamos, recursos, tiposRecurso } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { FILTRO_PRESTAMO_LABEL, filtroADevueltoDB, parseFiltroPrestamo } from "@/lib/prestamos";
import { PrestamosView, type PrestamoRow } from "@/components/prestamos/PrestamosView";

export default async function MisPrestamosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "estudiante" && session.rol !== "profesor") redirect("/dashboard");

  const filtro = parseFiltroPrestamo((await searchParams).estado);
  const devueltoDB = filtroADevueltoDB(filtro);

  const rows = await db
    .select({
      prestamoId: prestamos.id,
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
    .where(
      devueltoDB === null
        ? eq(prestamos.usuarioId, session.sub)
        : and(eq(prestamos.usuarioId, session.sub), eq(prestamos.devuelto, devueltoDB)),
    )
    .orderBy(desc(prestamos.id));

  const initialData: PrestamoRow[] = rows.map((r) => ({
    ...r,
    usuarioNombre: "",
    usuarioId: "",
    fechaPrestamo: r.fechaPrestamo.toISOString(),
    fechaDevolucionReal: r.fechaDevolucionReal?.toISOString() ?? null,
  }));

  return (
    <PrestamosView
      key={filtro}
      scope="propias"
      estadoInicial={filtro}
      initialData={initialData}
      titulo={`Mis Préstamos — ${FILTRO_PRESTAMO_LABEL[filtro]}`}
    />
  );
}
