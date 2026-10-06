import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getAdminLoans, getBorrowerLoans } from "@/lib/dashboard-data";
import { PrestamosView } from "@/components/prestamos/PrestamosView";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user] = await db
    .select({ id: users.id, rol: users.rol })
    .from(users)
    .where(and(eq(users.id, session.sub), eq(users.isActive, true), isNull(users.deletedAt)));
  if (!user) redirect("/login");

  if (user.rol === "estudiante" || user.rol === "profesor") {
    const rows = await getBorrowerLoans(user.id);
    const title = user.rol === "profesor" ? "Panel de Profesor" : "Panel de Estudiante";
    return (
      <PrestamosView
        scope="propias"
        estadoInicial="todas"
        qInicial=""
        initialData={rows}
        pagina={1}
        totalPaginas={1}
        total={rows.length}
        destacarId={null}
        titulo={title}
        modoReciente
      />
    );
  }

  if (user.rol === "admin" || user.rol === "superadmin") {
    const result = await getAdminLoans({ adminId: user.id, isSuperadmin: user.rol === "superadmin" });
    if (result.unassigned) {
      return (
        <div className="mx-auto w-full max-w-7xl rounded-[20px] bg-gradient-to-br from-white to-zinc-50 p-6 shadow-[0_25px_45px_rgba(0,0,0,0.08)] sm:p-10 dark:from-zinc-900 dark:to-zinc-950">
          <PageHeader title="Panel de Administración" />
          <EmptyState
            variant="alert"
            message="No administras ninguna dependencia. Pide al superadmin que te asigne una."
          />
        </div>
      );
    }
    return (
      <PrestamosView
        scope="dependencia"
        estadoInicial="todas"
        qInicial=""
        initialData={result.rows}
        pagina={1}
        totalPaginas={1}
        total={result.rows.length}
        destacarId={null}
        titulo="Panel de Administración"
        modoReciente
        soloLectura={user.rol === "superadmin"}
      />
    );
  }

  redirect("/login");
}
