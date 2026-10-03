import { redirect } from "next/navigation";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { dependencias, recursos, tiposRecurso } from "@/db/schema";
import { InventarioView } from "@/components/inventario/InventarioView";
import { getSession } from "@/lib/auth";

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; destacar?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  // Solo el admin gestiona inventario; el resto no contempla esta vista.
  if (session.rol !== "admin") redirect("/dashboard");

  const [dep] = await db
    .select({ id: dependencias.id, nombre: dependencias.nombre })
    .from(dependencias)
    .where(
      and(eq(dependencias.administradorId, session.sub), isNull(dependencias.deletedAt)),
    );

  const tipos = dep
    ? await db
        .select({
          id: tiposRecurso.id,
          nombre: tiposRecurso.nombre,
          dependenciaId: tiposRecurso.dependenciaId,
        })
        .from(tiposRecurso)
        .where(eq(tiposRecurso.dependenciaId, dep.id))
        .orderBy(asc(tiposRecurso.id))
    : [];

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

  return (
    <InventarioView
      mode="admin"
      initialTipos={tipos}
      initialRecursos={rows}
      dependenciaNombre={dep?.nombre ?? null}
      tipoAbiertoId={toId((await searchParams).tipo)}
      destacarId={toId((await searchParams).destacar)}
    />
  );
}

function toId(raw: string | undefined): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}
