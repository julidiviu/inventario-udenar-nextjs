import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { dependencias, prestamos, recursos, solicitudesPrestamo, tiposRecurso, users } from "@/db/schema";
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
  return datosPara(sol.usuarioId, sol.recursoId, sol.fechaDevolucion);
}

/**
 * Datos para regenerar el contrato de un préstamo (extensión).
 * Funciona con o sin solicitud vinculada; la fecha es siempre la nueva pactada.
 * Null si el préstamo, el usuario o el recurso no existen.
 */
export async function obtenerDatosContratoPorPrestamo(
  prestamoId: number,
  nuevaFechaDevolucion: string,
): Promise<DatosContratoCompletos | null> {
  const [p] = await db
    .select({ usuarioId: prestamos.usuarioId, recursoId: prestamos.recursoId })
    .from(prestamos)
    .where(eq(prestamos.id, prestamoId));
  if (!p) return null;
  return datosPara(p.usuarioId, p.recursoId, nuevaFechaDevolucion);
}

async function datosPara(
  usuarioId: string,
  recursoId: number,
  fechaDevolucionISO: string,
): Promise<DatosContratoCompletos | null> {

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
      .where(and(eq(users.id, usuarioId), eq(users.isActive, true), isNull(users.deletedAt))),
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
      .where(eq(recursos.id, recursoId)),
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
    fechaDevolucion: formatFechaCO(fechaDevolucionISO),
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
