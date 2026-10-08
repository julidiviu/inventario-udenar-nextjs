import { redirect } from "next/navigation";
import { CalendarioView } from "@/components/calendario/CalendarioView";
import { getSession } from "@/lib/auth";
import { getCierreFecha } from "@/lib/cierre";

export default async function CalendarioPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "superadmin") redirect("/dashboard");

  return <CalendarioView fechaInicial={await getCierreFecha()} />;
}
