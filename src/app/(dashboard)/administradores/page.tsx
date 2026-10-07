import { redirect } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { dependencias, users } from "@/db/schema";
import { AdminsView } from "@/components/administradores/AdminsView";
import { getSession } from "@/lib/auth";

export default async function AdministradoresPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "superadmin") redirect("/dashboard");

  const rows = await db
    .select({
      id: users.id,
      codigo: users.codigo,
      email: users.email,
      cedula: users.cedula,
      firstName: users.firstName,
      lastName: users.lastName,
      telefono: users.telefono,
      programa: users.programa,
      firmaUrl: users.firmaUrl,
      isActive: users.isActive,
      dependenciaNombre: dependencias.nombre,
    })
    .from(users)
    // Solo la dependencia activa cuenta: el admin de una eliminada figura libre.
    .leftJoin(
      dependencias,
      and(eq(dependencias.administradorId, users.id), isNull(dependencias.deletedAt)),
    )
    .where(and(eq(users.rol, "admin"), isNull(users.deletedAt)))
    .orderBy(asc(users.codigo));

  return (
    <AdminsView
      initialAdmins={rows.map((r) => ({
        ...r,
        email: r.email ?? "",
        firstName: r.firstName ?? "",
        lastName: r.lastName ?? "",
      }))}
    />
  );
}
