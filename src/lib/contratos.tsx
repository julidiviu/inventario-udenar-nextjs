import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { dependencias, recursos, solicitudesPrestamo, tiposRecurso, users } from "@/db/schema";
import { uploadToBlob } from "@/lib/blob";
import { formatFechaCO } from "@/lib/dates";
import { getFullName } from "@/components/layout/user";
import { ContratoPDF, type DatosContrato } from "@/components/pdf/ContratoPDF";

export interface DatosContratoCompletos {
  dependenciaId: number;
  datos: DatosContrato;
}

/** Descarga una imagen remota a dataURI. Null si falla (el PDF usa el branch sin firma). */
async function urlADataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type")?.split(";")[0] || "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Reúne todo lo que pide la plantilla desde la solicitud.
 * Null si la solicitud, el usuario o el recurso no existen.
 */
export async function obtenerDatosContrato(solicitudId: number): Promise<DatosContratoCompletos | null> {
  const [sol] = await db
    .select({
      usuarioId: solicitudesPrestamo.usuarioId,
      recursoId: solicitudesPrestamo.recursoId,
      fechaDevolucion: solicitudesPrestamo.fechaDevolucion,
    })
    .from(solicitudesPrestamo)
    .where(eq(solicitudesPrestamo.id, solicitudId));
  if (!sol) return null;

  const [[user], [rec]] = await Promise.all([
    db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        codigo: users.codigo,
        cedula: users.cedula,
        telefono: users.telefono,
        firmaUrl: users.firmaUrl,
      })
      .from(users)
      .where(and(eq(users.id, sol.usuarioId), eq(users.isActive, true), isNull(users.deletedAt))),
    db
      .select({
        nombre: recursos.nombre,
        qr: recursos.qr,
        descripcion: recursos.descripcion,
        tipoId: recursos.tipoId,
        tipoNombre: tiposRecurso.nombre,
        dependenciaId: tiposRecurso.dependenciaId,
      })
      .from(recursos)
      .innerJoin(tiposRecurso, eq(recursos.tipoId, tiposRecurso.id))
      .where(eq(recursos.id, sol.recursoId)),
  ]);
  if (!user || !rec) return null;

  const [[dep], escudoBuf, usuarioFirma] = await Promise.all([
    db
      .select({ nombre: dependencias.nombre, administradorId: dependencias.administradorId })
      .from(dependencias)
      .where(and(eq(dependencias.id, rec.dependenciaId), isNull(dependencias.deletedAt))),
    readFile(join(process.cwd(), "public", "images", "escudo_encabezado.png")),
    urlADataUri(user.firmaUrl),
  ]);
  if (!dep) return null;

  const [admin] = dep.administradorId
    ? await db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          codigo: users.codigo,
          cedula: users.cedula,
          telefono: users.telefono,
          firmaUrl: users.firmaUrl,
        })
        .from(users)
        .where(eq(users.id, dep.administradorId))
    : [];

  const datos: DatosContrato = {
    dependenciaNombre: dep.nombre,
    adminNombre: admin ? getFullName(admin.firstName, admin.lastName, admin.codigo) : "[Sin asignar]",
    adminCedula: admin?.cedula ?? "[Sin registro]",
    adminTelefono: admin?.telefono ?? null,
    adminFirma: await urlADataUri(admin?.firmaUrl ?? null),
    usuarioNombre: getFullName(user.firstName, user.lastName, user.codigo),
    usuarioCedula: user.cedula ?? "[Sin registro]",
    usuarioTelefono: user.telefono ?? "[Teléfono no disponible]",
    usuarioCodigo: user.codigo,
    usuarioFirma,
    recursoNombre: rec.nombre,
    recursoQr: rec.qr,
    recursoTipo: rec.tipoNombre,
    recursoDescripcion: rec.descripcion,
    fechaDevolucion: formatFechaCO(sol.fechaDevolucion),
    fechaSuscripcion: formatFechaCO(new Date()),
    escudo: `data:image/png;base64,${escudoBuf.toString("base64")}`,
  };
  return { dependenciaId: rec.dependenciaId, datos };
}

/** Renderiza el PDF y lo sube a Blob. Retorna la URL pública para `contrato_prestamo_url`. */
export async function generarYSubirContrato(datos: DatosContrato, solicitudId: number): Promise<string> {
  const buffer = await renderToBuffer(<ContratoPDF datos={datos} />);
  const file = new File([new Uint8Array(buffer)], `solicitud-${solicitudId}.pdf`, {
    type: "application/pdf",
  });
  const { url } = await uploadToBlob(file, "contratos_prestamo", "pdf");
  return url;
}
