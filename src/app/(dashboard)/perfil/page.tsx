import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getFullName, getRolLabel } from "@/components/layout/user";
import { emptyToNull } from "@/lib/perfil";
import { PerfilView } from "@/components/perfil/PerfilView";

export default async function PerfilPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user] = await db
    .select({
      codigo: users.codigo,
      rol: users.rol,
      firstName: users.firstName,
      lastName: users.lastName,
      programa: users.programa,
      email: users.email,
      fotoUrl: users.fotoUrl,
      cedula: users.cedula,
      telefono: users.telefono,
      firmaUrl: users.firmaUrl,
    })
    .from(users)
    .where(and(eq(users.id, session.sub), eq(users.isActive, true), isNull(users.deletedAt)));
  if (!user) redirect("/login");

  return (
    <PerfilView
      initial={{
        nombre: getFullName(user.firstName, user.lastName, user.codigo),
        codigo: user.codigo,
        rol: user.rol,
        rolLabel: getRolLabel(user.rol),
        programa: user.programa ?? "",
        email: emptyToNull(user.email),
        fotoUrl: emptyToNull(user.fotoUrl),
        cedula: emptyToNull(user.cedula),
        telefono: emptyToNull(user.telefono),
        firmaUrl: emptyToNull(user.firmaUrl),
      }}
    />
  );
}
