import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { dependencias } from "@/db/schema";
import { InventarioView } from "@/components/inventario/InventarioView";
import { MOCK_RECURSOS, MOCK_TIPOS } from "@/components/inventario/types";
import { getSession } from "@/lib/auth";

export default async function InventarioPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // Solo el admin gestiona inventario; el resto no contempla esta vista.
  if (session.rol !== "admin") redirect("/dashboard");

  const [dep] = await db
    .select({ nombre: dependencias.nombre })
    .from(dependencias)
    .where(
      and(eq(dependencias.administradorId, session.sub), isNull(dependencias.deletedAt)),
    );

  return (
    <InventarioView
      mode="admin"
      initialTipos={MOCK_TIPOS}
      initialRecursos={MOCK_RECURSOS}
      dependenciaNombre={dep?.nombre ?? null}
    />
  );
}
