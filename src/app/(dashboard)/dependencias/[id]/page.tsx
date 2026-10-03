import { notFound, redirect } from "next/navigation";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { dependencias, recursos, solicitudesPrestamo, tiposRecurso, users } from "@/db/schema";
import { InventarioView } from "@/components/inventario/InventarioView";
import { getSession } from "@/lib/auth";

export default async function RecursosDependenciaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string; destacar?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  // Solo estudiante y profesor consultan recursos (admin gestiona en /inventario,
  // superadmin solo gestiona dependencias).
  if (session.rol !== "estudiante" && session.rol !== "profesor") redirect("/dashboard");

  const { id } = await params;
  const [dep] = await db
    .select({ id: dependencias.id, nombre: dependencias.nombre })
    .from(dependencias)
    .where(and(eq(dependencias.id, Number(id)), isNull(dependencias.deletedAt)));
  if (!dep) notFound();

  const tipos = await db
    .select({
      id: tiposRecurso.id,
      nombre: tiposRecurso.nombre,
      dependenciaId: tiposRecurso.dependenciaId,
    })
    .from(tiposRecurso)
    .where(eq(tiposRecurso.dependenciaId, dep.id))
    .orderBy(asc(tiposRecurso.id));

  const tipoIds = tipos.map((t) => t.id);
  const rows =
    tipoIds.length === 0
      ? []
      : await db
          .select({
            id: recursos.id,
            qr: recursos.qr,
            tipoId: recursos.tipoId,
            nombre: recursos.nombre,
            descripcion: recursos.descripcion,
            fotoUrl: recursos.fotoUrl,
            disponible: recursos.disponible,
          })
          .from(recursos)
          .where(inArray(recursos.tipoId, tipoIds))
          .orderBy(asc(recursos.id));

  const [user] = await db
    .select({ cedula: users.cedula, telefono: users.telefono, firmaUrl: users.firmaUrl })
    .from(users)
    .where(eq(users.id, session.sub));

  const pendientes = await db
    .select({ recursoId: solicitudesPrestamo.recursoId })
    .from(solicitudesPrestamo)
    .where(
      and(eq(solicitudesPrestamo.usuarioId, session.sub), eq(solicitudesPrestamo.estado, "pendiente")),
    );

  return (
    <InventarioView
      mode="view"
      initialTipos={tipos}
      initialRecursos={rows}
      dependenciaNombre={dep.nombre}
      perfilCompleto={Boolean(user?.cedula && user?.telefono && user?.firmaUrl)}
      solicitudesPendientesInicial={pendientes.map((p) => p.recursoId)}
      tipoAbiertoId={toId((await searchParams).tipo)}
      destacarId={toId((await searchParams).destacar)}
    />
  );
}

function toId(raw: string | undefined): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}
