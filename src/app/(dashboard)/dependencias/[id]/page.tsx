import { notFound, redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { dependencias, solicitudesPrestamo, users } from "@/db/schema";
import { InventarioView } from "@/components/inventario/InventarioView";
import { MOCK_RECURSOS, MOCK_TIPOS } from "@/components/inventario/types";
import { getSession } from "@/lib/auth";

export default async function RecursosDependenciaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  // El rol admin no contempla esta vista (gestiona desde /inventario).
  if (session.rol === "admin") redirect("/dashboard");

  const { id } = await params;
  const [dep] = await db
    .select({ id: dependencias.id, nombre: dependencias.nombre })
    .from(dependencias)
    .where(and(eq(dependencias.id, Number(id)), isNull(dependencias.deletedAt)));
  if (!dep) notFound();

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
      mode={session.rol === "superadmin" ? "admin" : "view"}
      initialTipos={MOCK_TIPOS}
      initialRecursos={MOCK_RECURSOS}
      dependenciaNombre={dep.nombre}
      perfilCompleto={Boolean(user?.cedula && user?.telefono && user?.firmaUrl)}
      solicitudesPendientesInicial={pendientes.map((p) => p.recursoId)}
    />
  );
}
