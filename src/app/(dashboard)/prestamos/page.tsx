import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { dependencias, prestamos, recursos, tiposRecurso, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { FILTRO_PRESTAMO_LABEL, filtroADevueltoDB, parseFiltroPrestamo } from "@/lib/prestamos";
import { PrestamosView, type PrestamoRow } from "@/components/prestamos/PrestamosView";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function PrestamosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "admin") redirect("/dashboard");

  const filtro = parseFiltroPrestamo((await searchParams).estado);
  const devueltoDB = filtroADevueltoDB(filtro);

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

  const rows = await db
    .select({
      prestamoId: prestamos.id,
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
    })
    .from(prestamos)
    .innerJoin(recursos, eq(prestamos.recursoId, recursos.id))
    .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
    .innerJoin(users, eq(prestamos.usuarioId, users.id))
    .where(
      devueltoDB === null
        ? eq(tiposRecurso.dependenciaId, dep.id)
        : and(eq(tiposRecurso.dependenciaId, dep.id), eq(prestamos.devuelto, devueltoDB)),
    )
    .orderBy(desc(prestamos.id));

  const initialData: PrestamoRow[] = rows.map((r) => ({
    prestamoId: r.prestamoId,
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
  }));

  return (
    <PrestamosView
      key={filtro}
      scope="dependencia"
      estadoInicial={filtro}
      initialData={initialData}
      titulo={`Préstamos — ${FILTRO_PRESTAMO_LABEL[filtro]}`}
    />
  );
}
