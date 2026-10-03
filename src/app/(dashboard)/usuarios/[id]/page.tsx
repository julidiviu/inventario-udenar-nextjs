import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getFullName, getRolLabel } from "@/components/layout/user";
import { PageHeader } from "@/components/ui/PageHeader";
import { emptyToNull } from "@/lib/perfil";

/** Perfil completo de un usuario, solo lectura para el admin (incluye cédula y firma). */
export default async function UsuarioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "admin") redirect("/dashboard");

  const { id } = await params;
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
    .where(and(eq(users.id, id), eq(users.isActive, true), isNull(users.deletedAt)));
  if (!user) notFound();

  const nombre = getFullName(user.firstName, user.lastName, user.codigo);
  const fotoUrl = emptyToNull(user.fotoUrl);
  const firmaUrl = emptyToNull(user.firmaUrl);

  return (
    <div className="mx-auto w-full max-w-7xl rounded-[20px] bg-gradient-to-br from-white to-zinc-50 p-6 shadow-[0_25px_45px_rgba(0,0,0,0.08)] sm:p-10 dark:from-zinc-900 dark:to-zinc-950">
      <PageHeader title="Perfil de Usuario" />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-40 w-40 overflow-hidden rounded-full border-[3px] border-brand-700">
            {fotoUrl ? (
              <Image src={fotoUrl} alt={nombre} fill sizes="160px" className="object-cover" />
            ) : (
              <span aria-hidden="true" className="grid h-full w-full place-items-center bg-zinc-100 text-5xl text-zinc-400 dark:bg-zinc-800">
                {nombre.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="w-full rounded-[10px] border border-zinc-200 bg-zinc-50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-2 text-sm font-semibold text-brand-700 dark:text-brand-100">Firma</p>
            {firmaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={firmaUrl} alt={`Firma de ${nombre}`} className="mx-auto max-h-24 rounded-[8px] bg-white p-1 dark:bg-zinc-200" />
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Sin firma registrada.</p>
            )}
          </div>
        </div>

        <dl className="rounded-[10px] border-l-2 border-brand-700 bg-zinc-50 p-4 dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
          <div className="flex flex-col gap-2 text-sm sm:text-base">
            {(
              [
                ["Nombre", nombre],
                ["Código", user.codigo],
                ["Rol", getRolLabel(user.rol)],
                ["Programa", user.programa ?? "—"],
                ["Correo", user.email ?? "—"],
                ["Cédula", user.cedula ?? "No registrada."],
                ["Teléfono", user.telefono ?? "No registrado."],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <dt className="font-semibold text-brand-700 dark:text-brand-100">{label}:</dt>
                <dd className="text-zinc-600 dark:text-zinc-300">{value}</dd>
              </div>
            ))}
          </div>
        </dl>
      </div>
    </div>
  );
}
