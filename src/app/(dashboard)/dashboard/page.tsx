import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getAdminLoans, getBorrowerLoans } from "@/lib/dashboard-data";
import { AdminOverview } from "@/components/dashboard/AdminOverview";
import { BorrowerOverview } from "@/components/dashboard/BorrowerOverview";

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
    return <BorrowerOverview title={title} rows={rows} />;
  }

  if (user.rol === "admin" || user.rol === "superadmin") {
    const result = await getAdminLoans({ adminId: user.id, isSuperadmin: user.rol === "superadmin" });
    if (result.unassigned) return <AdminOverview rows={[]} unassigned />;
    return <AdminOverview rows={result.rows} />;
  }

  redirect("/login");
}
