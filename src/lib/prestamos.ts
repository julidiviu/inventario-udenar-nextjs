import { hoyBogota } from "@/lib/recursos";

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

/**
 * Días entre hoy (calendario Colombia) y la fecha pactada 'YYYY-MM-DD'.
 * >0 faltan, 0 vence hoy, <0 retraso.
 */
export function diasHasta(fechaDevolucion: string): number {
  const [y, m, d] = fechaDevolucion.split("-").map(Number);
  const meta = new Date(y, m - 1, d);
  return Math.round((meta.getTime() - hoyBogota().getTime()) / 86400000);
}
