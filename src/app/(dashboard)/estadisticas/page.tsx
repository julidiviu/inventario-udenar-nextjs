import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { dependencias } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getEstadisticas } from "@/lib/estadisticas";
import { EstadisticasView } from "@/components/estadisticas/EstadisticasView";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function EstadisticasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "admin") redirect("/dashboard");

  const [dep] = await db
    .select({ id: dependencias.id, nombre: dependencias.nombre })
    .from(dependencias)
    .where(and(eq(dependencias.administradorId, session.sub), isNull(dependencias.deletedAt)));

  if (!dep) {
    return (
      <div className="mx-auto w-full max-w-7xl rounded-[20px] bg-gradient-to-br from-white to-zinc-50 p-6 shadow-[0_25px_45px_rgba(0,0,0,0.08)] sm:p-10 dark:from-zinc-900 dark:to-zinc-950">
        <PageHeader title="Estadísticas" />
        <EmptyState
          variant="alert"
          message="No administras ninguna dependencia. Pide al superadmin que te asigne una."
        />
      </div>
    );
  }

  const stats = await getEstadisticas(dep.id);
  return <EstadisticasView stats={stats} dependenciaNombre={dep.nombre} />;
}
