import { redirect } from "next/navigation";
import { DependenciasView } from "@/components/dependencias/DependenciasView";
import { getSession } from "@/lib/auth";
import { mockAdminsDisponibles, mockDependencias } from "@/mocks/dependencias";

export default async function DependenciasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // El rol admin no contempla esta vista.
  if (session.rol === "admin") redirect("/dashboard");

  const mode = session.rol === "superadmin" ? "admin" : "view";

  return <DependenciasView mode={mode} initialDependencias={mockDependencias} admins={mockAdminsDisponibles} />;
}
