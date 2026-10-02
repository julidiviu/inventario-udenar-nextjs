export type EstadoSolicitud = "pendiente" | "aprobado" | "rechazado";

export const FILTRO_ESTADOS = ["pendiente", "aprobada", "rechazada", "todas"] as const;

export type FiltroEstado = (typeof FILTRO_ESTADOS)[number];

export function isFiltroEstado(raw: unknown): raw is FiltroEstado {
  return typeof raw === "string" && (FILTRO_ESTADOS as readonly string[]).includes(raw);
}

/** Normaliza ?estado=. Default "todas" (el padre del navbar apunta ahí). */
export function parseFiltroEstado(raw: unknown): FiltroEstado {
  return isFiltroEstado(raw) ? raw : "todas";
}

/** Mapea el filtro UI (femenino) al enum DB (masculino). "todas" = sin filtro. */
export function filtroAEstadoDB(f: FiltroEstado): EstadoSolicitud | null {
  switch (f) {
    case "pendiente":
      return "pendiente";
    case "aprobada":
      return "aprobado";
    case "rechazada":
      return "rechazado";
    case "todas":
      return null;
  }
}

export const FILTRO_LABEL: Record<FiltroEstado, string> = {
  pendiente: "Pendientes",
  aprobada: "Aprobadas",
  rechazada: "Rechazadas",
  todas: "Todas",
};

export const ACCIONES = ["aprobar", "rechazar"] as const;

export type AccionSolicitud = (typeof ACCIONES)[number];

/** Valida el body de PATCH /api/solicitudes/[id] (espejo cliente+servidor). */
export function validateAccion(body: Record<string, unknown>): { data: { accion: AccionSolicitud } } | { error: string; field: string } {
  const accion = typeof body.accion === "string" ? body.accion : "";
  if (accion !== "aprobar" && accion !== "rechazar") {
    return { error: "Acción inválida.", field: "accion" };
  }
  return { data: { accion } };
}
