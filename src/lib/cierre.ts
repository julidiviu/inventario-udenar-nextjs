import { db } from "@/db";
import { cierreSemestre } from "@/db/schema";
import { FECHA_RE, hoyBogota, toISODate } from "@/lib/recursos";

/** Tope máximo elegible al solicitar/extender ('YYYY-MM-DD'). Null = sin tope. */
export async function getCierreFecha(): Promise<string | null> {
  const [row] = await db
    .select({ fecha: cierreSemestre.fecha })
    .from(cierreSemestre)
    .limit(1);
  return row?.fecha ?? null;
}

export interface CierreFailure {
  error: string;
  field: string;
}

/**
 * Valida la fecha que fija el superadmin: formato + hoy o futura
 * (un cierre pasado bloquearía toda solicitud/extensión).
 */
export function validateCierreFecha(value: unknown): { data: string } | CierreFailure {
  const fecha = typeof value === "string" ? value.trim() : "";
  if (!FECHA_RE.test(fecha)) {
    return { error: "Fecha de cierre inválida.", field: "fecha" };
  }
  if (fecha < toISODate(hoyBogota())) {
    return { error: "El cierre debe ser hoy o una fecha futura.", field: "fecha" };
  }
  return { data: fecha };
}

/** Error si la fecha elegida supera el cierre vigente. Null si no hay tope. */
export function excedeCierre(fechaISO: string, cierre: string | null): string | null {
  if (cierre && fechaISO > cierre) {
    return "La fecha supera el cierre de semestre.";
  }
  return null;
}
