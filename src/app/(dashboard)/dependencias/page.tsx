import { redirect } from "next/navigation";
import { asc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { dependencias } from "@/db/schema";
import { DependenciasView } from "@/components/dependencias/DependenciasView";
import { getSession } from "@/lib/auth";

export default async function DependenciasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // El rol admin no contempla esta vista.
  if (session.rol === "admin") redirect("/dashboard");

  const rows = await db
    .select({
      id: dependencias.id,
      codigo: dependencias.codigo,
      nombre: dependencias.nombre,
      descripcion: dependencias.descripcion,
      imagenUrl: dependencias.imagenUrl,
      administradorId: dependencias.administradorId,
    })
    .from(dependencias)
    .where(isNull(dependencias.deletedAt))
    .orderBy(asc(dependencias.id));

  const mode = session.rol === "superadmin" ? "admin" : "view";

  return <DependenciasView mode={mode} initialDependencias={rows} />;
}
