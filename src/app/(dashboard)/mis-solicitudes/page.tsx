import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { prestamos, recursos, solicitudesPrestamo } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { FILTRO_LABEL, filtroAEstadoDB, parseFiltroEstado } from "@/lib/solicitudes";
import { SolicitudesView, type SolicitudRow } from "@/components/solicitudes/SolicitudesView";

export default async function MisSolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "estudiante" && session.rol !== "profesor") redirect("/dashboard");

  const filtro = parseFiltroEstado((await searchParams).estado);
  const estadoDB = filtroAEstadoDB(filtro);

  const rows = await db
    .select({
      solicitudId: solicitudesPrestamo.id,
      recursoId: solicitudesPrestamo.recursoId,
      qr: recursos.qr,
      recursoNombre: recursos.nombre,
      fechaSolicitud: solicitudesPrestamo.fechaSolicitud,
      fechaDevolucion: solicitudesPrestamo.fechaDevolucion,
      estado: solicitudesPrestamo.estado,
      contratoUrl: prestamos.contratoPrestamoUrl,
    })
    .from(solicitudesPrestamo)
    .innerJoin(recursos, eq(solicitudesPrestamo.recursoId, recursos.id))
    .leftJoin(prestamos, eq(prestamos.solicitudId, solicitudesPrestamo.id))
    .where(
      estadoDB
        ? and(eq(solicitudesPrestamo.usuarioId, session.sub), eq(solicitudesPrestamo.estado, estadoDB))
        : eq(solicitudesPrestamo.usuarioId, session.sub),
    )
    .orderBy(desc(solicitudesPrestamo.id));

  const initialData: SolicitudRow[] = rows.map((r) => ({
    ...r,
    usuarioNombre: "",
    fechaSolicitud: r.fechaSolicitud.toISOString(),
  }));

  return (
    <SolicitudesView
      key={filtro}
      scope="propias"
      estadoInicial={filtro}
      initialData={initialData}
      titulo={`Mis Solicitudes — ${FILTRO_LABEL[filtro]}`}
    />
  );
}
