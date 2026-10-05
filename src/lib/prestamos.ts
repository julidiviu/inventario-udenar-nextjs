import { FECHA_RE, hoyBogota, toISODate } from "@/lib/recursos";

export const FILTRO_PRESTAMOS = ["pendiente", "devuelto", "todas"] as const;

export type FiltroPrestamo = (typeof FILTRO_PRESTAMOS)[number];

export function isFiltroPrestamo(raw: unknown): raw is FiltroPrestamo {
  return typeof raw === "string" && (FILTRO_PRESTAMOS as readonly string[]).includes(raw);
}

/** Normaliza ?estado=. Default "todas" (el padre del navbar apunta ahí). */
export function parseFiltroPrestamo(raw: unknown): FiltroPrestamo {
  return isFiltroPrestamo(raw) ? raw : "todas";
}

/** Mapea el filtro UI al booleano `devuelto` de DB. "todas" = sin filtro. */
export function filtroADevueltoDB(f: FiltroPrestamo): boolean | null {
  switch (f) {
    case "pendiente":
      return false;
    case "devuelto":
      return true;
    case "todas":
      return null;
  }
}

export const FILTRO_PRESTAMO_LABEL: Record<FiltroPrestamo, string> = {
  pendiente: "Pendientes",
  devuelto: "Devueltos",
  todas: "Todas",
};

export const ACCIONES_PRESTAMO = ["devolver"] as const;

export type AccionPrestamo = (typeof ACCIONES_PRESTAMO)[number];

/** Valida el body de PATCH /api/prestamos/[id] (espejo cliente+servidor). */
export function validateAccionPrestamo(
  body: Record<string, unknown>,
): { data: { accion: AccionPrestamo } } | { error: string; field: string } {
  const accion = typeof body.accion === "string" ? body.accion : "";
  if (accion !== "devolver") {
    return { error: "Acción inválida.", field: "accion" };
  }
  return { data: { accion } };
}

export interface ExtenderInput {
  nuevaFechaDevolucion: string;
}

/**
 * Valida { accion:"extender", nuevaFechaDevolucion } con piso mínimo.
 * La nueva fecha debe ser estrictamente posterior a `minISO` (= max(pactada, hoy)).
 * Espejo cliente+servidor (el cliente calcula el mismo piso con `hoyBogota()`).
 */
export function validateExtender(
  body: Record<string, unknown>,
  minISO: string,
): { data: ExtenderInput } | { error: string; field: string } {
  const accion = typeof body.accion === "string" ? body.accion : "";
  if (accion !== "extender") {
    return { error: "Acción inválida.", field: "accion" };
  }
  const nueva = typeof body.nuevaFechaDevolucion === "string" ? body.nuevaFechaDevolucion.trim() : "";
  if (!FECHA_RE.test(nueva)) {
    return { error: "Fecha de extensión inválida.", field: "nuevaFechaDevolucion" };
  }
  if (nueva < minISO) {
    return { error: "La nueva fecha debe ser posterior a la devolución pactada.", field: "nuevaFechaDevolucion" };
  }
  return { data: { nuevaFechaDevolucion: nueva } };
}

/**
 * Días entre hoy (calendario Colombia) y la fecha pactada 'YYYY-MM-DD'.
 * >0 faltan, 0 vence hoy, <0 retraso.
 */
export function diasHasta(fechaDevolucion: string): number {
  const [y, m, d] = fechaDevolucion.split("-").map(Number);
  const meta = new Date(y, m - 1, d);
  return Math.round((meta.getTime() - hoyBogota().getTime()) / 86400000);
}

/** Piso para extender: día siguiente a max(pactada, hoy Bogotá), en ISO. */
export function pisoExtension(pactadaISO: string): string {
  const [y, m, d] = pactadaISO.split("-").map(Number);
  const base = Math.max(new Date(y, m - 1, d).getTime(), hoyBogota().getTime());
  const dia = new Date(base);
  dia.setDate(dia.getDate() + 1);
  return toISODate(dia);
}
