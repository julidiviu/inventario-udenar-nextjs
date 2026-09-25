import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getNavByRole, isKnownRol } from "@/lib/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getFullName, getRolLabel } from "@/components/layout/user";

export default async function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user] = await db
    .select({
      id: users.id,
      codigo: users.codigo,
      rol: users.rol,
      firstName: users.firstName,
      lastName: users.lastName,
      fotoUrl: users.fotoUrl,
    })
    .from(users)
    .where(and(eq(users.id, session.sub), eq(users.isActive, true), isNull(users.deletedAt)));

  if (!user) redirect("/login");
  if (!isKnownRol(user.rol)) redirect("/login");

  return (
    <DashboardLayout
      user={{
        fullName: getFullName(user.firstName, user.lastName, user.codigo),
        rol: user.rol,
        rolLabel: getRolLabel(user.rol),
        fotoUrl: user.fotoUrl,
      }}
      nav={getNavByRole(user.rol)}
    >
      {children}
    </DashboardLayout>
  );
}
