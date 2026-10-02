import { emptyToNull } from "@/lib/perfil";

/** QR de negocio: string numérico de máximo 8 dígitos (espejo del CHECK en DB). */
export const QR_RE = /^[0-9]{1,8}$/;
export const RECURSO_NOMBRE_MAX = 100;
export const RECURSO_DESCRIPCION_MAX = 800;
export const TIPO_NOMBRE_MAX = 100;

/** Fecha de devolución: formato YYYY-MM-DD. */
export const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface RecursoInput {
  nombre: string;
  qr: string;
  tipoId: number | null;
  nuevoTipo: string | null;
  descripcion: string;
  fotoUrl: string | null;
}

export interface SolicitudInput {
  recursoId: number;
  fechaDevolucion: string;
}

export interface ValidationFailure {
  error: string;
  field: string;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** "Hoy" en calendario de Colombia, independiente de la TZ del servidor. */
export function hoyBogota(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = parts.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Suma días hábiles saltando sábados y domingos (regla: 5 hábiles, sin tope máximo). */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Valida el body de POST (partial=false) / PATCH (partial=true) de recursos.
 * Normaliza "" → null en opcionales (regla del proyecto).
 * POST exige (tipoId XOR nuevoTipo); PATCH acepta parcial.
 */
export function validateRecursoInput(
  body: Record<string, unknown>,
  partial: false,
): { data: RecursoInput } | ValidationFailure;
export function validateRecursoInput(
  body: Record<string, unknown>,
  partial: true,
): { data: Partial<RecursoInput> } | ValidationFailure;
export function validateRecursoInput(
  body: Record<string, unknown>,
  partial: boolean,
): { data: Partial<RecursoInput> } | ValidationFailure {
  const data: Partial<RecursoInput> = {};

  if ("nombre" in body || !partial) {
    const nombre = str(body.nombre);
    if (!nombre || nombre.length > RECURSO_NOMBRE_MAX) {
      return { error: "El nombre es requerido (máximo 100 caracteres).", field: "nombre" };
    }
    data.nombre = nombre;
  }
  if ("qr" in body || !partial) {
    const qr = str(body.qr);
    if (!QR_RE.test(qr)) {
      return { error: "El código QR debe ser numérico de máximo 8 dígitos.", field: "qr" };
    }
    data.qr = qr;
  }
  if ("tipoId" in body || "nuevoTipo" in body || !partial) {
    const rawTipo = body.tipoId;
    const tipoId =
      typeof rawTipo === "number" && Number.isInteger(rawTipo) && rawTipo > 0 ? rawTipo : null;
    const nuevoTipo = emptyToNull(str(body.nuevoTipo));
    if (!partial && !tipoId && !nuevoTipo) {
      return { error: "Selecciona el tipo de recurso.", field: "tipoId" };
    }
    if (partial && !tipoId && !nuevoTipo && ("tipoId" in body || "nuevoTipo" in body)) {
      return { error: "Selecciona el tipo de recurso.", field: "tipoId" };
    }
    if (nuevoTipo && nuevoTipo.length > TIPO_NOMBRE_MAX) {
      return { error: "El nuevo tipo supera los 100 caracteres.", field: "nuevoTipo" };
    }
    if (tipoId) data.tipoId = tipoId;
    else if (nuevoTipo) data.nuevoTipo = nuevoTipo;
  }
  if ("descripcion" in body || !partial) {
    const descripcion = str(body.descripcion);
    if (!descripcion || descripcion.length > RECURSO_DESCRIPCION_MAX) {
      return { error: "La descripción es requerida (máximo 800 caracteres).", field: "descripcion" };
    }
    data.descripcion = descripcion;
  }
  if ("fotoUrl" in body || !partial) {
    data.fotoUrl = emptyToNull(str(body.fotoUrl));
  }
  return { data };
}

/** Valida el body de POST /api/solicitudes (fecha espejo del modal). */
export function validateSolicitudInput(body: Record<string, unknown>): { data: SolicitudInput } | ValidationFailure {
  const rawId = body.recursoId;
  const recursoId =
    typeof rawId === "number" && Number.isInteger(rawId) && rawId > 0 ? rawId : null;
  if (!recursoId) return { error: "Recurso inválido.", field: "recursoId" };
  const fechaDevolucion = str(body.fechaDevolucion);
  if (!FECHA_RE.test(fechaDevolucion)) {
    return { error: "Fecha de devolución inválida.", field: "fechaDevolucion" };
  }
  const fecha = new Date(`${fechaDevolucion}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) {
    return { error: "Fecha de devolución inválida.", field: "fechaDevolucion" };
  }
  if (fecha.getDay() === 0 || fecha.getDay() === 6) {
    return { error: "La devolución debe ser en un día hábil.", field: "fechaDevolucion" };
  }
  if (toISODate(fecha) < toISODate(addBusinessDays(hoyBogota(), 5))) {
    return { error: "La fecha mínima es 5 días hábiles desde hoy.", field: "fechaDevolucion" };
  }
  return { data: { recursoId, fechaDevolucion } };
}

/** 23505 → campo del formulario según la constraint violada. */
export function uniqueFieldRecurso(constraint: string | undefined): string {
  if (constraint?.includes("tipos_recurso")) return "nuevoTipo";
  return "qr";
}
